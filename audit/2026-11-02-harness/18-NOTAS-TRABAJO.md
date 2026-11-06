# Estudio de adopción: planificación por anillos (Pi → DSH)

**Fecha:** 2026-11-02 · **Estado:** EN CURSO (notas de trabajo, no informe final)
**Objetivo:** decidir qué mejoras de la planificación por anillos de Pi se adoptan en `deepseek-harness`, con análisis individual, conjunto y contraste SOTA externo.

---

## 0 · Fuentes

| Fuente | Ruta | Estado |
|---|---|---|
| Dossier de anillos | `/Users/ruben/Code/QWEN-code/auditoria-pi-agent/` (17 ficheros, 4.541 líneas, 2026-10-25) | **NO versionado en git** |
| Diseño v5 | `DISENO-EXTRACCION-ANILLOS-PI.md` (53 líneas, denso) | leído íntegro |
| S1 arquitectura | `S1-arquitectura-anillos.md` (554 líneas) | leído íntegro |
| S2 runtime · S3 AI/ML · S4 seguridad | 476 / 567 / 414 líneas | en extracción |
| A3 planificado-no-implementado | 424 líneas | en extracción |
| MATRIZ-GAPS | 312 líneas | en extracción |
| Colofones adversariales AD1/AD2 | 263 / 85 líneas | en extracción |
| Demos D1/D2 | `demo/` con artefactos y veredictos | pendiente |
| Materialización | `/Users/ruben/Code/PHI-agent/` — `phi-kernel/` **vacío**, `phi-tui/` construido | verificado |

---

## 1 · El modelo de tres anillos (S1)

**Criterio de pertenencia**, por orden de precedencia:
1. Dependencia unidireccional **2 → 1 → 0**, cero ciclos (ni por barrel ni por tipos).
2. INV-10: el anillo-0 **no es un producto nuevo**, es lo que ya existe destilado.
3. **Pureza** como test: anillo-0 = sin red, sin filesystem, sin procesos hijo, sin reloj no inyectable, sin DB.

**Emplazamiento:** autoridad (reglas, álgebra, contrato, política) → anillo-0 biblioteca pura sin proceso ni estado; custodia (almacén, ledger, claves, consolidación, olvido, eval, servidor MCP) → anillo-1 servicio; proveedores (backends, embeddings, rerank, Postgres-RLS, transportes) → anillo-2; evidencia y contabilidad transversales.

**Contenido por anillo** (S1 §2.2):
- **Anillo-0**: `contract.ts`, `types.ts`, `events.ts`, `provenance.ts`, `hard-gates.ts`, `trust.ts`, `grade.ts`, álgebra de `token-ring.ts` (knapsack, MMR, maskProtected, governor contable), SPI de `sandbox.ts` + perfiles + ExecutionGate, `reliability.ts`, `allowed()/sanitize()/redact()`, puertos (`StateStore`, `Clock`, `CredentialResolver`, `MemoryBackend`, `JournalPort`, `ContextBudgetPort`, `SchemaPort`, `KeyCustodyPort`, `VocabularyPort`, `MemoryCommandPort`), álgebra de memoria (admission/forget/consolidate/vector/graph PPR/layers/dma/retrieval RRF).
- **Anillo-1**: `router.ts`, orquestación de `governance.ts` + journal tras puerto, composition root único, fachada `TokenRing`, `ingest.ts` (pipeline), `gateway.ts`, `memory-stack`, `fabric`, `memory-gateway`, `openai-compat`, `memory-tool`, eval.
- **Anillo-2**: `db.ts` (ejecutor+migrador atómico), repositorios SQLite, proveedores de sandbox (bwrap/seatbelt/srt/gondolin), `bash-ops.ts`, fetchers, transportes MCP, backends, adaptadores de host, reloj real.

**Memoria:** veredicto = **pieza transversal de rango propio** (Opción C), no se aloja en ningún anillo: consume puertos del 0, expone superficie por el 1, persiste/transporta por el 2. Razones: (1) el grafo real ya es `M → I`; (2) su ciclo de vida (consolidación, olvido, checkpoints) no es por turno; (3) es el mayor consumidor y productor de presupuesto de tokens; (4) el esquema físico ya vive en `I/db.ts` y el contrato en `I/contract.ts`.

**Condición no negociable:** una única frontera de escritura (`MemoryCommandPort`). Hoy hay **4 escritores** (fabric, memory-gateway, hooks, plane) y `replay` es destructivo.

**Coste declarado:** 8 puertos nuevos + 16 adaptaciones de semántica. «Quien presupueste esto como mover ficheros se equivoca.»

**Secuencia:** 0 romper barrel → 1 MemoryCommandPort → 2 tenant en el puerto → 3 extraer anillo-0 → 4 Schema/Journal/KeyCustodyPort → 5 anillo-1 → 6 anillo-2 → 7 memoria como rango propio → 8 primer consumidor vivo (gates en la extensión que Pi ejecuta).

**Riesgos H-01…H-12** (S1 §6), los críticos:
- H-01: los gates solo se cablean en `pi-memory`; el paquete que Pi ejecuta **no registra ningún gate**.
- H-02: `gateToolCall` permite por omisión; solo conoce `bash`/`edit`/`write`, y lee `input.path` (un `write` con `file_path` pasa en blanco).
- H-03: `I/db.ts` es dueño del esquema de los tres anillos y de la memoria, en el paquete que dice «sin capa de memoria».

---

## 2 · Auditoría de PI-agent (rondas previas, ejecutada)

| Pieza | Veredicto | Evidencia clave |
|---|---|---|
| `pi-intermediate` | Real pero sin cuerpo: FTS5/knapsack/Ed25519/sandbox por `spawn` funcionan; 6 claims del README falsas; β=0 deja la confianza inerte; la cuarentena no filtra; 0 consumidores | probes propios ejecutados; `tsc --noEmit` rc=0 |
| `pi-account-router` | **Vivo en producción**, gate completo verde (14/14 probes, 13 specs, lint); memoria episódica muerta; docs con claims falsos | ejecutado |
| `pi-jart-ura` | Servicio real 24/7 (59 tests, security-check 18/18); 6 bloqueantes para entrar al monorepo | ejecutado |
| `pi-aside` | 930 líneas de plan, 0 código | verificado |
| `tools/` | **No ejecutables** (falta `tsx`, type-stripping en node_modules) | ejecutado |
| `openspec` | 43/43 validate verde; 15 changes sin archivar; 062 marca `[x]` sin código | ejecutado |
| git | HEAD `850ac20`; **97 ficheros de `pi-memory` borrados sin commitear**; 6 untracked | `git status` |

---

## 3 · Marco de comparación con DSH (pendiente)

Preguntas guía a responder con evidencia del repo `deepseek-harness`:
1. ¿DSH ya tiene kernel puro? (`packages/core/*`, `packages/util/*`) ¿Qué capa cumple el papel de anillo-0?
2. ¿El modelo Cordis (plugin + `ctx.effect()` + capability seams) hace innecesaria la extracción por anillos?
3. ¿Qué problemas de Pi resuelve DSH estructuralmente? (evidencia: sin ciclos, seams explícitos, session log como registro, compaction como capability)
4. ¿Qué NO tiene DSH y sí propone el dossier? (p.ej. knapsack de contexto, MMR, ledger hash-chained, cuarentena por inyección, trust tiers, sandbox por SO)
5. ¿Dónde el dossier propone algo **peor** que lo que DSH ya hace?

---

## 4 · Plan de trabajo

1. ✅ Instalar skill `auditoria-dev` (validada).
2. ✅ Leer S1 + DISENO.
3. ⏳ Extraer inventario completo (A3, MATRIZ-GAPS, S2, S3, S4, colofones) — 3 analistas.
4. ⏳ Mapa de la arquitectura real de DSH.
5. ⏳ Análisis individual por mejora (viabilidad, impacto, coste, riesgo).
6. ⏳ Contraste SOTA externo por elemento.
7. ⏳ Análisis conjunto (sinergias, conflictos, orden).
8. ⏳ Recomendación priorizada + informe final (preguntar modo de entrega).

## 5 · Decisiones abiertas para el usuario

- ¿El informe final va en `deepseek-harness/docs/`, en `PI-agent/docs/audit-2026-11-02-harness/`, o solo pantalla?
- Este directorio es **untracked**; ¿se versiona en algún repo?
