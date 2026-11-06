# Auditoría línea por línea — fusión de los seis pases (5 cerrados + 1 pendiente)

**Fecha:** 2026-11-02 · **Protocolo:** `/auditoria-dev` · **Alcance:** cortex (src completo), pi-memory HEAD (46 ficheros), seams de DSH (27 ficheros).
**Actualización 2026-11-05:** cortex sale del alcance de DSH; su material (C5–C8, MAJOR, pase A–M) se ha migrado a `~/Code/Jart-CORTEX/audit/2026-11-02-cortex/01-HALLAZGOS.md`.
**Estado: 6 de 6 pases cerrados y fusionados.**

---

## 0 · Veredicto central

**Cortex y pi-memory son dos arquitecturas reales y bien anilladas (capas, puertos, firma, ledger, tests) con los mismos tres pecados: superficie muerta alta (~40 %), caminos de escritura que esquivan la evidencia, y un defecto de seguridad vivo cada uno — en cortex el sidecar sin auth con CORS `*` (corre hoy), en pi-memory el bypass `memory.import` y la fuga cross-tenant por el canal ANN. Los seams de DSH existen y son los correctos, con tres correcciones a la propuesta ya aplicadas.**

## 1 · Hallazgos consolidados por severidad

### BLOCKER

| ID | Dónde | Hallazgo | Evidencia |
|---|---|---|---|
| B1 | pi-memory | La métrica `merged` de consolidate es falsa (`merged = r.archived`) y el comentario dice lo contrario | `memory-control.ts:242` |

### CRITICAL

| ID | Dónde | Hallazgo | Evidencia |
|---|---|---|---|
| C1 | pi-memory | **`memory.import` = bypass total**: `backend.importAll` sin admisión, cuarentena, redacción, firma ni ledger, expuesto por MCP | `memory-mcp-server.ts:252-255` |
| C2 | pi-memory | **Fuga cross-tenant por el canal ANN** (nueva): `fabric` filtra vecinos con `store.peek` sin guard de tenant; el índice se construye con vectores de todos los tenants. El `nearest` del control sí filtra, pero no es el canal cableado | `fabric.ts:107-113`; `memory-spi.ts:187-192` |
| C3 | pi-memory | Acciones `sessions/project/cross-*` muertas por drift de esquema de tool (6 acciones en runtime vs 10 soportadas) | `extension.ts:101-104` vs `memory-tool.ts:59,193` |
| C4 | pi-memory | Doc canónica del orden de `save` invertida (dice append→update; el código hace update→append) | `fabric.ts:4,126` vs `:144-146` |
| — | cortex | **Migrado**: C5 (sidecar sin auth), C6/C7 (superficie muerta), C8 (`kg_relations.updated_at`) | `~/Code/Jart-CORTEX/audit/2026-11-02-cortex/01-HALLAZGOS.md` |

### MAJOR (consolidados)

**pi-memory**: M1 governor a medio cablear (`quality` = `poolFraction`, `hooks.ts:85`); M2 dream-cycle sin caller; M3 `memory_fabric_propose` es stub que miente (`fabric.ts:490-497`); M4 `replaceAll` destructivo muerto; M5 signer legacy en meta exportado; M6 custodia no vincula fichero↔pública; M7 flush/forget/consolidate vista→append sin savepoint; M8 índice de sesiones con hits fantasma; M9 `uuidv7` con `Math.random` y `verify()` que salta firmas; M10 `execCommand` finge ejecutar (`core.ts:142`); M11 recuperación híbrida decorativa (3 de 4 señales RRF del mismo FTS5, `NoopReranker` por defecto); M12 `session_before_compact` sin degradación; M13 `compressPrompt` O(n²).

**cortex**: migrado a `~/Code/Jart-CORTEX/audit/2026-11-02-cortex/01-HALLAZGOS.md` (M1–M12 completos).

**DSH (inputs de diseño, no defectos propios)**: M1 MCP expone todos los schemas sin límite; M2 `ctx.jobs` sin schedule/persistencia (existe `packages/schedule`); M3 `session_shutdown` no existe (`session/disposed`).

### Lo que SÍ funciona (medido, no decorativo)

- **pi-memory**: savepoints atómicos reales; tenant fail-closed (con la excepción C2); cuarentena + redacción antes de hash; replay diferencial con guard de integridad (la corrección del claim "replay destructivo" es real); custodia externa de clave con migración; firma v2 completa; FTS5 escapado; bitemporal; idempotencia real.
- **DSH**: waterfall `system-prompt/assemble` verificado con invariante; modelo-visible ⟺ log con invariante de reconstrucción; pipeline de tools con pre/guard/around/post; skills con catálogo resumido + carga bajo demanda (el patrón exacto para el router propuesto).

### Correcciones de los propios auditores (y reversiones de claims del dossier)

1. **«Olvido inmortal»**: cierto en el snapshot del 25-oct; **corregido en HEAD** (umbral 0.2, `memory-forget.ts:38`, con comentario explícito). Residuo muerto: `forgetGc` 0.15.
2. **«Clave privada en la DB»**: **corregida en HEAD** (custodia externa por defecto). Residuo muerto: loader legacy.
3. **«Replay destructivo»**: **corregido en HEAD** (replay diferencial). Residuo muerto: `replaceAll`.
4. **«ANN sin llamadas»**: cierto solo pre-047; el canal ANN vive hoy (y trae C2).
5. **«74 tools de cortex»**: **75** (ejecutado); el propio código se contradice.
6. **«Zero-embeddings de cortex»**: la búsqueda no depende de vectores, pero el sistema sí embebe (dim 384) — matizado.
7. **SPI «11+12»**: 11 obligatorios ✓, opcionales **15**.
8. **Corrección propia**: el claim «0 consumidores de pi-intermediate» solo vale en runtime; en HEAD lo consumía `@pi-agent/memory@1.0.0`.

## 2 · Esfuerzo de remediación consolidado

| Frente | Rango |
|---|---|
| pi-memory (C1–C4 + M1–M13) | **7–10 días-dev** |
| DSH | sin remediación propia: los M1–M3 son inputs de diseño de la propuesta |
| **Total** | **2–3 semanas-dev** para dejar ambos sistemas sin CRITICAL |

## 3 · Impacto en el plan 13

1. **La lección C2 (fuga por canal ANN) entra como invariante del diseño**: el router/memoria de DSH no puede dejar que un canal de recuperación salte el guard de scope — el patrón correcto es el de `memory-control` (filtrar en el control, no en el store).
2. Confirmado el seam del governor: `system-prompt/assemble` es el único punto mutable de tools; `agent/request` no sirve.
3. **cortex**: fuera del alcance de DSH desde 2026-11-05; C5/C8 y su plan están en `~/Code/Jart-CORTEX/audit/2026-11-02-cortex/`.

## 4 · Pase cortex shared A–M — **migrado**

El pase completo (claims, M-1…M-8, ~1.900 líneas muertas, esfuerzo 1,5–2,5 semanas-dev) vive en `~/Code/Jart-CORTEX/audit/2026-11-02-cortex/01-HALLAZGOS.md §4`.

## 4-bis · Pase adversarial + Dementor (sobre la propia auditoría)

**Adversarial:**
- **A1 (diseño)**: «Partir por directorios pierde hallazgos transversales» → mitigación: los claims críticos se verificaron por ejecución y con doble confirmación entre pases (C5 confirmado por ambos pases de shared; el backfill 5.349 contra la BD viva; C8 falsificado con la BD temporal).
- **A2 (seguridad)**: el sidecar de cortex (C5) se verificó en runtime (`lsof`, 18890); material migrado a `~/Code/Jart-CORTEX/audit/2026-11-02-cortex/`.
- **A3 (proceso)**: «El informe no puede ser definitivo si cambia de número de fichero» → el objetivo citaba `13-AUDITORIA…`; el 13 lo ocupa el plan maestro y la fusión vive en `14-AUDITORIA-LINEA-POR-LINEA.md`. Solo numeración, contenido completo.

**Dementor:**
| Sospecha | Resultado |
|---|---|
| «C5/C8 son falsos positivos» | **Falso**: re-verificados el 2026-11-05 (sidecar en 18890; `kg_relations` sin `updated_at`). Detalle en el repo de cortex |
| «Los CRITICAL de pi-memory están vivos» | **Matiz necesario**: `@pi-agent/memory@1.0.0` **no está desplegado** (el runtime usa el npm ajeno 0.4.2). Sus C1/C2/B1 son **latentes**: importan porque el plan 12/13 propone adoptar esos patrones en DSH, no porque hoy estén corriendo |
| «Los hallazgos de DSH son defectos» | **No**: son **inputs de diseño** (falta de límite en schemas MCP, jobs sin schedule) |

## 5 · Consolidado final de esfuerzo

| Frente | Rango |
|---|---|
| pi-memory (C1–C4 + M1–M13) | **7–10 días-dev** |
| **Total para dejar ambos sin CRITICAL** | **3–5 semanas-dev** |
