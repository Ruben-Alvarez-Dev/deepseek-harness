# Inventario consolidado de mejoras del dossier de anillos

**Fuente:** `/Users/ruben/Code/QWEN-code/auditoria-pi-agent/` (2026-10-25, 17 ficheros / 4.541 líneas).
**Extracción:** cuatro pases independientes sobre A3, MATRIZ-GAPS, S1, S2, S3, S4 y colofones AD1/AD2.
**Nota:** el dossier declara **0 ítems ejecutados**; todo es análisis. Los estados son los que declara el propio dossier.

Convención: `[V]` verificado en el dossier por comando/lectura · `[A]` auto-declarado sin re-ejecución.

---

## A · Arquitectura de anillos (S1 + DISENO v5)

| ID | Mejora | Estado | Evidencia |
|---|---|---|---|
| ARQ-1 | Anillo-0 puro (sin red/FS/procesos/reloj/DB) con contrato, gates, confianza, álgebra de tokens, SPI de sandbox+perfiles, álgebra de memoria | planificado | S1 §2.2 |
| ARQ-2 | Anillo-1 gateway: router, orquestación, composition root único, fachada TokenRing, ingest, gateway, memoria como servicio | planificado | S1 §2.2 |
| ARQ-3 | Anillo-2 connections: SQLite, repositorios, proveedores de sandbox, fetchers, MCP, backends, adaptadores de host, reloj real | planificado | S1 §2.2 |
| ARQ-4 | Memoria como **pieza transversal de rango propio** (no cabe en ningún anillo) | recomendado | S1 §3 |
| ARQ-5 | 8 puertos nuevos: Schema, CapabilityRepository/SourceRepository/Config, Journal, ContextBudget, KeyCustody, TurnContext, MemoryCommand, Vocabulary (+DenseVector, RetentionPolicy) | planificado | S1 §5.2 |
| ARQ-6 | 16 adaptaciones de semántica (no «mover ficheros») | planificado | S1 §4.2 |
| ARQ-7 | 12 descartes: PiCore duplicado, models.ts, remote.ts, un servidor MCP, fabric_propose, KeyStore como autoridad, stub «[direct execution]», IdempotencyStore, CCR volátil, spec verification-evaluation, PromptFoundry fuera del turno, Caveman no opt-in | planificado | S1 §4.3 |
| ARQ-8 | Secuencia 0→8 (barrel → MemoryCommandPort → tenant → anillo-0 → Schema/Journal/KeyCustody → anillo-1 → anillo-2 → memoria propia → primer consumidor vivo) | planificado | S1 §7 |
| ARQ-9 | Riesgos H-01…H-12; críticos: gates no cableados, gateToolCall allow-by-default, db.ts dueño del esquema de todo | diagnosticado | S1 §6 |

## B · Escritura, datos y consistencia (S2 + S4)

| ID | Mejora | Estado | Evidencia |
|---|---|---|---|
| DATA-1 | Frontera única de escritura (`MemoryCommandPort`), inventario de **11 caminos** de mutación (no 4) | planificado · defecto vivo | DISENO §2, S2:307 |
| DATA-2 | Unidad de trabajo transaccional (fila+FTS+vector+evento+idempotencia) | planificado | MG:86 |
| DATA-3 | Replay no destructivo (validar completitud antes de `replaceAll`) | planificado | MG:87 |
| DATA-4 | Tenant/scope en el puerto de almacenamiento (`get`/`forget`/`export`/snapshot/import/replay), no solo en `search` | planificado · **fuga viva** | MG:82, CA1:151 |
| DATA-5 | WAL + `busy_timeout` + transacciones en `openDb`/`migrate` (hoy cero PRAGMA, cero BEGIN) | planificado · defecto verificado | CA1:154,209 |
| DATA-6 | Cerrar `memory.import` (bypass total por MCP: sin admisión, saneo, redacción, tenant, firma ni ledger) | planificado | CA1:48,207 |
| DATA-7 | Recibo de verificación ligado al sujeto (digest + tipo explícito) | planificado | MG:88 |
| DATA-8 | Journal con ancla externa de cabeza (hoy la cadena se puede truncar y recalcular) | planificado | S4-K5 |

## C · Memoria e IA (S3)

| ID | Mejora | Estado | Evidencia |
|---|---|---|---|
| MEM-1 | **Arreglar el olvido**: `0.3 × importance(0.5) = 0.15` = umbral → nada se archiva jamás; fix: umbral, `<`→`<=` o reponderar + unificar el 0.15 duplicado | planificado · defecto verificado | S3:184-191, DE:20 |
| MEM-2 | `RetentionPolicyPort`: una sola política de retención | planificado | DE:25 |
| MEM-3 | `ContextBudgetPort`: la memoria pide presupuesto y cada inyección se atribuye al governor | planificado | S1:273,377 |
| MEM-4 | ANN y señal densa **en el recall**, no solo en el orden (hoy RRF fusiona 3 permutaciones del mismo FTS5) | planificado | S3-H3, S3:446 |
| MEM-5 | RRF + **un** rerank en la ruta caliente (hoy el reranker por defecto es `NoopReranker`) | planificado | S3:163,454 |
| MEM-6 | Embeddings: batching, `prefetch`/`warm` fuera del turno, cota de fan-out (hoy hasta 200 POST por búsqueda) | planificado | S3:456-457 |
| MEM-7 | Contabilidad real de tokens: capa `tool` incluida, valor efectivo siempre, contador real en vez de `ceil(len/4)` | planificado | S3:459-460,500 |
| MEM-8 | Gate de preservación en la compresión por defecto y en Caveman (hoy solo el camino con modelo lo exige) | planificado | S3:524 |
| MEM-9 | Harness de evaluación offline nDCG/recall@k con fixtures | planificado · **primera prioridad** | S3:386, DA:10 |
| MEM-10 | Evaluación sobre backend aislado, nunca el productivo | planificado | DE:13 |
| MEM-11 | Fuera del plan de port: grafo/PPR, ProceduralMemory, CANON, firma Ed25519 tal cual, CloudBackend, `remote.ts`/`models.ts`, `reliability.ts` tal cual, WorkingSet/L0-L3, Caveman, `estimateTokens` | descartado | S3:413-422 |
| MEM-12 | Defectos diagnosticados sin fix declarado (merge antes del umbral, sessionId hardcodeado, uni-temporal de lectura, merge duplica) | abierto | S3:462-475 |

## D · Seguridad y gobernanza (S4)

| ID | Mejora | Estado | Evidencia |
|---|---|---|---|
| SEC-1 | **Cablear los gates en la config viva** (BLOCKER): el paquete que Pi ejecuta no registra `tool_call`/`user_bash` | planificado · BLOCKER | S4-T1, CA1:143 |
| SEC-2 | Raíz de confianza: `settings.json` 0600 + hash/integridad por paquete; resolver por identidad, no por ruta relativa | planificado | S4-T2 |
| SEC-3 | Separación de privilegios entre anillos (hoy todo comparte UID) | planificado | S4-T3 |
| SEC-4 | Clave de firma fuera del almacén que firma; firma completa y verificada en lectura | planificado | S4-K1/K2 |
| SEC-5 | Revocación persistente + `keyId = sha256(publicPem)` (hoy `Math.random`) | planificado | S4-K4 |
| SEC-6 | Redacción por **allow-list** y detector con nivel de confianza (hoy deny-list evadible) | planificado | S4-K6, RL-5 |
| SEC-7 | Sandbox: deny `~/.pi/**`, allow-list, obligatorio por defecto (hoy opt-in y sin cubrir credenciales) | planificado | S4-K7/K8/K9 |
| SEC-8 | AuthN en el gateway + perfil administrativo separado + límites y anti-replay | planificado | S4-G1/G3/G5 |
| SEC-9 | Admisión no autopuntuada (hoy el caller declara `kind`/`importance`) | planificado | S4-G4 |
| SEC-10 | RLS transaccional y `dropTenant` autorizado | planificado | S4-G8 |
| SEC-11 | Permisos e integridad en reposo (settings 0644, 8 `.bak`, 2 `auth.json`, logs 0644) | planificado | S4-T4/T5/T6 |
| SEC-12 | bwrap con `workdir` montado o «no soportado» | planificado | S4-RL-9, D10 |

## E · Proceso y documentación

| ID | Mejora | Estado | Evidencia |
|---|---|---|---|
| PROC-1 | Versionar `arquitectura-ecosistema/` y ratificar D01–D11 (hoy fuera de git) | bloqueado por ratificación | A3:268-292 |
| PROC-2 | Persistir la intención de los anillos como change OpenSpec **antes** de implementar | planificado · no existe | INF:71,79 |
| PROC-3 | Reconstruir E-031…E-046 (16 entradas nunca escritas) | planificado | MG:74 |
| PROC-4 | Corregir HANDOFF raíz y caducidad del sello | planificado | MG:52 |
| PROC-5 | Restaurar la suite de tests (526 borrados en E-020) | bloqueado (decisión del dueño) | MG:99 |
| PROC-6 | Cablear consumidores de intermediate y memory (72 % del código sin proceso) | planificado | INF:32,64 |
| PROC-7 | Evidencia ejecutable versionada (hoy 14 probes gitignored, 1 trackeado) | planificado | S4-T4 |
| PROC-8 | Specs alineadas con el código (retirar componentes fantasma: CacheAligner, AST CodeCompressor, Kompress-v2, RTK, ACE/GEPA, Dementor) | planificado | A3:343-367 |

---

## Cifras clave (medidas o calculadas en el dossier)

- 72 % del código sin consumidor: 10.103 / 13.982 líneas; 24 de 27 capacidades sin proceso.
- 0 tests en `pi-intermediate` y `pi-memory`; 14 probes gitignored, 1 trackeado.
- 11 caminos de mutación durable (la v3 solo inventarió 4).
- 8 puertos nuevos + 16 adaptaciones de semántica.
- 212 ítems planificados, 9 cerrados (4,2 %).
- `estimateTokens = ceil(len/4)`: subestima español 15-25 % y CJK ~2,7×.
- `packKnapsack`: ~40 MB por llamada con n=200.
