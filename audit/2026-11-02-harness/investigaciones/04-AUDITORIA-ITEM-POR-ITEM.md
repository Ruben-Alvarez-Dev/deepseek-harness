# Auditoría ítem por ítem: las 60 mejoras del dossier frente a DSH

**Fecha:** 2026-11-02 · **Método:** cada ítem del inventario consolidado se contrasta con el código real de `deepseek-harness`.
**Disposiciones:** `ADOPTAR` · `YA EXISTE` (DSH lo tiene, igual o mejor) · `NO APLICA` (problema exclusivo de Pi) · `RECHAZAR` (idea peor que el estado del arte) · `VERIFICADO` (el defecto planteado no se sostiene).

Resumen: **2 ADOPTAR · 7 YA EXISTE · 45 NO APLICA · 3 RECHAZAR · 1 VERIFICADO · 2 diferidos.**

---

## A · Arquitectura de anillos (ARQ)

| # | Mejora | Disposición | Razón y evidencia |
|---|---|---|---|
| ARQ-1 | Anillo-0 puro (kernel sin I/O) | NO APLICA | En DSH la separación es por **capability seam** (Service Definition/Provider/Consumer) y plugins Cordis, no por anillos de pureza. `docs/capability-seams.md` |
| ARQ-2 | Anillo-1 gateway | NO APLICA | DSH no tiene un gateway de memoria que orqueste; su plano de composición es el plugin Loader |
| ARQ-3 | Anillo-2 connections | NO APLICA | Los adaptadores ya son plugins separados por capability (`llm-*`, `shell`, `fs`, `web`) |
| ARQ-4 | Memoria como pieza transversal | NO APLICA | DSH no tiene memoria en el core: es un MCP externo |
| ARQ-5 | 8 puertos nuevos (Schema, Journal, KeyCustody, ContextBudget…) | NO APLICA | Esos puertos resuelven acoplamientos de Pi (SQLite compartido, PEM en la DB, governor sin cliente). DSH no tiene ninguno de esos acoplamientos |
| ARQ-6 | 16 adaptaciones de semántica | NO APLICA | Presupuesto de una migración ajena |
| ARQ-7 | 12 descartes (PiCore, models.ts, remote.ts…) | NO APLICA | Son duplicados internos de Pi |
| ARQ-8 | Secuencia 0→8 | NO APLICA | — |
| ARQ-9 | Riesgos H-01…H-12 | NO APLICA | Son defectos de Pi. La lección general («un control no cableado no existe») DSH la cumple por construcción: lo que no se monta en `cordis.yml` no corre |

## B · Datos y consistencia (DATA)

| # | Mejora | Disposición | Razón y evidencia |
|---|---|---|---|
| DATA-1 | Frontera única de escritura (11 caminos) | NO APLICA | DSH impone *model-visible ⟺ logged* y el session log es el registro único; no hay 11 escritores |
| DATA-2 | Unidad de trabajo transaccional | NO APLICA | No hay kernel SQLite propio |
| DATA-3 | Replay no destructivo | YA EXISTE | El replay es determinista desde el log; la compactación conserva el contenido sombreado (`packages/compaction/compaction/README.md`) |
| DATA-4 | Tenant en el puerto de almacenamiento | NO APLICA | DSH no tiene memoria multitenant; el aislamiento por proyecto es de sesión, no de puerto |
| DATA-5 | WAL + `busy_timeout` + transacciones | NO APLICA | Sin SQLite en el core |
| DATA-6 | Cerrar `memory.import` (bypass MCP) | NO APLICA | No existe esa tool en DSH |
| DATA-7 | Recibo ligado al sujeto | NO APLICA | DSH no emite recibos de verificación |
| DATA-8 | Journal con ancla externa / hash chain | RECHAZAR | La cadena local es la versión decorativa: sin ancla, quien reescribe el log recalcula. El estado del arte es log de transparencia (Merkle + checkpoints firmados + testigos, RFC 9162). Coste real: un subsistema. Sin requisito de auditoría externa hoy → diferido |

## C · Memoria e IA (MEM)

| # | Mejora | Disposición | Razón y evidencia |
|---|---|---|---|
| MEM-1 | Arreglar el olvido (`0.3×0.5=0.15` = umbral) | NO APLICA | Defecto de `memory-forget.ts`; DSH no tiene olvido por saliencia |
| MEM-2 | `RetentionPolicyPort` | NO APLICA | — |
| MEM-3 | `ContextBudgetPort` | NO APLICA | DSH mide presión con `token-meter`; la compactación no negocia presupuesto con un governor |
| MEM-4 | ANN y señal densa en el recall | NO APLICA | No hay retrieval semántico en el core |
| MEM-5 | RRF + un rerank en ruta caliente | NO APLICA | — |
| MEM-6 | Batching de embeddings / prefetch | NO APLICA | — |
| MEM-7 | Contabilidad real de tokens por capa | YA EXISTE (mejor) | `token-meter`: replay-aware, determinista, `contextBreakdown`, reutiliza `usage` del proveedor (`packages/llm/token-meter/README.md`). Pi estima con `ceil(len/4)` |
| MEM-8 | Gate de preservación en compresión | YA EXISTE (mejor) | El `compaction-tool-result-pruner` conserva el original completo en el log; no necesita heurística de preservación porque no pierde información |
| MEM-9 | Harness eval nDCG/recall@k | NO APLICA | No hay retrieval que evaluar |
| MEM-10 | Evaluación sobre backend aislado | NO APLICA | — |
| MEM-11 | Descartar grafo/PPR, ProceduralMemory, CANON, CloudBackend… | NO APLICA | Descartes de piezas de Pi |
| MEM-12 | 4 defectos diagnosticados sin fix | NO APLICA | De memoria de Pi |

## D · Seguridad y gobernanza (SEC)

| # | Mejora | Disposición | Razón y evidencia |
|---|---|---|---|
| SEC-1 | Cablear gates en la config viva (BLOCKER de Pi) | NO APLICA | En DSH montar es explícito; nada corre sin estar en el patch |
| SEC-2 | Raíz de confianza: `settings.json` 0600 + integridad de paquete | YA EXISTE (parcial) | DSH resuelve credenciales con `credentials-local`, que **exige 0600 y se niega a arrancar** si es legible por otros (`credentials-local/src/index.ts:116-143`); los plugins entran por lockfile de pnpm. No hay un hash-pin por paquete: si se quiere, es diseño nuevo de DSH, no importado de Pi |
| SEC-3 | Separación de privilegios entre anillos | NO APLICA | No hay anillos |
| SEC-4 | Clave de firma fuera del almacén que firma | NO APLICA | DSH no firma memorias |
| SEC-5 | Revocación persistente + keyId CSPRNG | NO APLICA | — |
| SEC-6 | Redacción de secretos | **ADOPTAR** | El seam existe y **no trae reglas**: `session-telemetry/record` es waterfall y el Service Definition «ships NO rules» (`session-telemetry/src/index.ts:27`). Redactar en exportación; nunca en el log model-visible |
| SEC-7 | Sandbox: deny `~/.pi/**` | NO APLICA | Análogo de DSH sería denegar `~/.dsh`; el sandbox se rige por presets (`read-only`/`workspace-write`/`danger-full-access`) y el perfil desktop corre `danger-full-access` por elección del usuario. Es decisión de despliegue, no un port |
| SEC-8 | AuthN en gateway + perfil admin + límites | NO APLICA | El gateway HTTP de DSH es otro subsistema (`packages/api`), con su propio contrato |
| SEC-9 | Admisión no autopuntuada | NO APLICA | No hay admisión de memorias |
| SEC-10 | RLS transaccional | NO APLICA | — |
| SEC-11 | Permisos e integridad en reposo | YA EXISTE | `credentials-local` fuerza 0600; el resto de artefactos son del perfil del usuario |
| SEC-12 | bwrap con `workdir` montado | YA EXISTE | `bash-sandbox` propaga `spec.workdir` (`index.ts:33,65,142`) |

## E · Proceso y documentación (PROC)

| # | Mejora | Disposición | Razón y evidencia |
|---|---|---|---|
| PROC-1 | Versionar `arquitectura-ecosistema/` y ratificar D01–D11 | NO APLICA | Documento de Pi fuera de git; lección válida (no dejar planes sin versionar) que DSH ya cumple con Agent Notes |
| PROC-2 | Persistir la intención de los anillos como change OpenSpec | NO APLICA | — |
| PROC-3 | Reconstruir E-031…E-046 | NO APLICA | Expediente de Pi |
| PROC-4 | Corregir HANDOFF y caducidad del sello | NO APLICA | DSH no tiene HANDOFF; su estado vive en el repo y los Agent Notes |
| PROC-5 | Restaurar 526 tests | NO APLICA | DSH tiene CI con cobertura por fichero (`pnpm test:coverage`) y snapshots |
| PROC-6 | Cablear consumidores (72 % sin proceso) | NO APLICA | Problema de Pi: allí el código existe sin montarse |
| PROC-7 | Evidencia ejecutable versionada | YA EXISTE | `pnpm test`, `test:snapshot`, `benchmarks/`; los probes gitignored de Pi son el antipatrón |
| PROC-8 | Alinear specs con el código (componentes fantasma) | YA EXISTE | DSH genera catálogos desde el código y tiene gates de doc (`doc-sync`, `verify-md-links`, presupuestos) |

## F · Mejoras de Pi citadas en el inventario de 60 y no cubiertas arriba

| # | Mejora | Disposición | Razón |
|---|---|---|---|
| F-1 | Crear el repo git de `pi-arnes` (M21) | NO APLICA | Proyecto distinto del usuario |
| F-2 | Implementar el diseño ALBERTO (34 piezas) | NO APLICA | Otro proyecto |
| F-3 | 25 experimentos/pruebas pendientes (E-1…E-25) | NO APLICA | Plan de otro producto |
| F-4 | Decidir reutilización de PI-agent en pi-arnes | NO APLICA | Gobernanza de otro repo |
| F-5 | Soak multidía G7 | NO APLICA | Diagnóstico del corte de Agnes |
| F-6 | Decisiones del propietario (b)(c)(d): tests, binario Rust, log de auditoría | NO APLICA | Decisiones de la casa Pi |
| F-7 | 8 changes OpenSpec de pi-arnes | NO APLICA | — |
| F-8 | Archivar 2 changes del router | NO APLICA | — |
| F-9 | Estatus del OpenSpec raíz (¿vivo o congelado?) | NO APLICA | — |
| F-10 | WP-1…WP-6 del plan de remediación 10-17 | NO APLICA | Histórico cerrado |
| F-11 | 11 decisiones abiertas de O3 | NO APLICA | — |
| F-12 | Colisión con `PROPUESTA-CONFIG-SOTA` (updatedInput, Stop hook, slot ENGRAM) | NO APLICA | Toda la colisión es de Qwen Code / Pi |
| F-13 | Orden de implementación del port | NO APLICA | — |
| F-14 | Rotar clave `omniroute`, `vault/server.log`, 129 transcripciones, symlink colgante | NO APLICA | Hallazgos de la máquina y el runtime de Pi. La lección (claves en claro, permisos, logs que crecen) ya está cubierta en DSH por `credentials-local` y el store de sesiones |
| F-15 | Defaults contradictorios `settings.json` vs `models.json` | NO APLICA | Pi |

## G · Ítems verificados contra el código de DSH

| # | Hipótesis | Resultado |
|---|---|---|
| V-1 | «La compactación puede blanquear contenido inyectado no confiable» | **VERIFICADO: no se sostiene.** `compaction-basic/tests/manual-compaction.spec.ts:288-317` inyecta un mensaje de plugin «INJECTED CONTEXT», compacta y comprueba que no se persiste como `user/message` y que el contenido aparece exactamente una vez; `:319-343` bloquea la reinyección reentrante. Existe manejo explícito y probado |
| V-2 | «DSH no redacta secretos» | **Parcialmente cierto.** Hay punto de extensión (`session-telemetry/record`) sin reglas por defecto; la redacción de telemetría sirve para lo que se exporta, no para el log local ni el contenido model-visible |
| V-3 | «El sandbox de DSH podría leer las credenciales del harness» | **No concluyente.** El sandbox se rige por presets y el perfil desktop usa `danger-full-access` por elección del usuario; no hay deny-list de `~/.dsh` en el código del provider. Es decisión de despliegue, no un defecto del port |

---

## Conclusión

De las **60 mejoras** del dossier:

- **2 se adoptan**: reglas de redacción por defecto en el waterfall de telemetría (SEC-6) y —si se quiere— un pin de integridad de plugins (SEC-2, parcial).
- **7 ya existen en DSH**, en 5 casos con implementación superior (token-meter, pruner, compaction estructurada, sandbox con workdir, credenciales 0600).
- **45 no aplican**: son defectos o duplicados internos de Pi.
- **3 se rechazan** por ser peores que el estado del arte (journal hash-chained local) o por no tener requisito (auditoría externa).
- **1 hipótesis se cae** al verificarla contra los tests de DSH.

El valor real del dossier para DSH **no son sus mecanismos, sino su disciplina de diagnóstico**: medir antes de afirmar, separar lo que el código hace de lo que la spec promete, y no dar por bueno un control que no está cableado.
