# Veredicto de demo determinista D1 — `pi-intermediate` y `pi-memory`, 2026-10-25

**Método:** driver `d1-driver.ts` (node v26 con TS nativo, **sin descargas**), cwd dentro de este subfolder, escritura únicamente en `demo/tmp/d1.db`. 9 tests T1–T9 con asserts; captura final en `d1-results.txt` (exit 0, 9/9). Importa los paquetes por ruta relativa desde `PI-agent/src/` (sus `node_modules` resuelven sus propias deps).

**Honestidad sobre las iteraciones:** el driver tuvo 3 versiones y 3 FAILs acumulados, **todos error del driver, ninguno defecto de producto**: v1 usó `remaining()` sobre `TokenRing` (ese método es de `TokenGovernor`, `token-ring.ts:235`) y buscó sin scope; v2 usó `TokenRing.put` (es de `CCR`, `:106`); v3 usa el contrato real de la fachada (`compress`/`caveman`/`retrieve`/`governor`). Se documenta para que ningún FAIL intermedio se lea como bug de Pi.

## Resultados (corrida final)

| Test | Qué ejercita | Resultado | Evidencia |
|---|---|---|---|
| T1 | Cuota anti-gaming por familia/fuente (`quota.maxPerFamilyPerSource`) | PASS | 10 admitidas, 11ª rechazada con `reason=quota.maxPerFamilyPerSource` |
| T2 | Router en dos etapas | PASS | `findCapability` 1 hit; `route()` → `{query, selected, escapeHatch, appliedBeta}` con la capacidad seleccionada |
| T3 | TokenRing por capas + CCR + TokenGovernor | PASS | `compress` → 400 tokens atribuidos a `source`; `caveman(ultra)` → `applied=false, saved=0` en texto sintético; `governor.report()` = `{"source":400,"output":400}`, `used=800` |
| T4 | Gate fail-closed sobre fuente desconocida | PASS | `allowed=false, reason="sandbox required but unavailable"` |
| T5 | **Persistencia real entre instancias** (`dbPath` fichero) | PASS | `save` → `decision={admit:true, action:"persist", score:0.753, factors:{futureUtility:0.56,…}}`; reapertura con mismo `dbPath` recupera el canario |
| T6 | Search lexical tras reapertura | PASS | `hits(scope=s1)=1`; `hits(scope default "project")=0` |
| T7 | Consolidación + checkpoint + rollback | PASS | `consolidate` → `ckpt_1_…`, `listCheckpoints=1`, `rollback=true` |
| T8 | Olvido por saliencia + forget | PASS | `forgetSalience(0.999)=4`; `forget(m3)=false` porque ya estaba `archived` (semántica coherente) |
| T9 | Aislamiento por prefijo de scope (tenants) | PASS | `s1=4, t2=1`, sin fuga cruzada |

## Gotchas y matices hallados [V]

1. **Scope implícito en `search()`:** `opts.scope ?? "project"` (`memory.ts:473`) y filtro `m.scope = ?` (`:484`). Buscar sin scope sobre recuerdos de otro scope devuelve **vacío sin error**. Gotcha silencioso para cualquier consumidor (incluida la extensión).
2. **Atribución ≠ compresión:** con texto sintético repetitivo, `compress`/`caveman` no redujeron (`reversible=false`, `applied=false, saved=0`) pero el governor atribuyó `compressedTokens` igualmente. La **atribución por capa está verificada; el efecto de compresión no queda demostrado** con este input → hueco de cobertura declarado, no fallo.
3. **Fail-closed real:** fuente desconocida → bloqueo por sandbox ausente, no por deny explícito: la cuarentena por defecto exige proveedor de sandbox.
4. **Durabilidad confirmada con backend explícito:** cierra el hueco de D2 (cuyo backend por defecto en Pi era efímero). Con `dbPath` de fichero, save→close→reopen→get/search recuperan el canario.

## Veredicto por paquete

- **`pi-intermediate`: funciona en toda la superficie ejercitada** [V]: cuotas, router 2 etapas, governor por capa, gate fail-closed, fachada TokenRing/CCR. **Sin ejercitar:** `PromptFoundry`, tiers/políticas de `Governance`, proveedores de sandbox reales, `materialize`/`explain`, `dominanceAlert`.
- **`pi-memory`: funciona en toda la superficie ejercitada** [V]: admisión PMO con score y factores, persistencia SQLite entre instancias, search con scope, consolidación/checkpoint/rollback, olvido por saliencia, aislamiento de tenants. **Sin ejercitar:** grafo bi-temporal/PPR, embeddings/rerank, backend cloud, gateway HTTP/MCP/OpenAI-compat, `recall` DMAA completo.

## Respuesta a «¿funcionan al 100 %?»

En la superficie ejercitada (9/9 D1 + 3 acciones de memoria en Pi real vía D2): **sí, funcionan**. Como afirmación global: **no declarable** — quedan sin ejercitar las superficies listadas, el repo no tiene tests (0 desde E-020) y ninguna de las dos bibliotecas está cableada en la config viva de Pi. La garantía alcanzable hoy es esta cobertura acotada + la restauración de la suite de tests como red de regresión.
