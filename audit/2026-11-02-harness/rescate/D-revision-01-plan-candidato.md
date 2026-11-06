# PROPUESTA — cambios (SIN EJECUTAR hasta aprobación explícita)

> Fecha: 2026-10-10 · Basado en `ANALISIS/01-analisis-profundo.md` + canon
> (HANDOFF, P0–P7, S0–S6 de reviews/12, N/V de reviews/14).
> **Estado: PROPUESTA PENDIENTE.** Nada se ejecuta hasta que Rubén apruebe fase a fase.

## 0. Decisión de marco (la más importante)

**Nuestro harness se construye COMO CÓDIGO PROPIO QUE COMPONE LA BASE DEL AUTOR,
no como extensión sobre Pi stock y no como fork del bucle.**

- Núcleo del bucle: `Agent`/`agentLoop` de **`pi-agent-core`** (2.5k LOC del autor,
  superficie de hooks exactamente la que necesitamos). **No forkeamos el bucle.**
- Nuestro paquete **`pi-harness`** (el directorio ya reservado en `PI-agent/pi-harness/`)
  contiene todo lo nuestro: runtime, control, routing, memoria, supervisor, perfiles, eval.
- Lo que hoy son extensiones (`pi-memory/extension.ts`, `pi-agnes-router/extension.ts`)
  pasa a ser **adaptadores finos del runtime**: la lógica vivirá en el runtime; la
  extensión se convierte en envoltorio (o se descarta) según decidan las fases.
- Versiones upstream **pinned** (1.1.0 hoy) + tests de conformance contra la superficie
  de extensiones/proveedores que usamos; releer upstream al abrir cada fase.

## 1. Estructura del paquete nuevo

```
PI-agent/pi-harness/                     ← el directorio ya reservado (CodeGraph listo)
├── package.json                         @pi-agent/harness (nombre definitivo: P1)
│   deps: pi-agent-core, pi-ai (pinned) + @pi-agent/intermediate + @pi-agent/memory
├── src/
│   ├── main.ts                          composición DI (profile → runtime)
│   ├── runtime.ts                       HarnessRuntime: Agent + hooks + control + supervisor
│   ├── agent/
│   │   ├── loop-wiring.ts               map SelectionCore+MemoryFabric → AgentLoopConfig
│   │   │                                 (transformContext, prepareNextTurn, finishTurn,
│   │   │                                  before/afterToolCall, steering/followUp, streamFn)
│   │   └── tools.ts                     AgentTool×4 (read/bash/edit/write): reutiliza los
│   │                                     factories de coding-agent donde sean exportables,
│   │                                     wrappers propios donde no
│   ├── control/                         ← S3 (bloqueante para el resto, veredicto Ronda 5)
│   │   ├── pdp.ts                       Policy Decision Point HOT-SWAP (arm/disArm < 1 tick)
│   │   ├── pep.ts                       enforcement (beforeToolCall/afterToolCall/user_bash)
│   │   ├── workflow.ts                  motor mínimo: 3–5 pasos, guardas, compensación (saga),
│   │   │                                 replay determinista
│   │   └── journal.ts                   journal de decisiones (hash-chained, append-only;
│   │                                     NO lo excluye nada: durable lo excluye, nosotros no)
│   ├── routing/
│   │   └── provider.ts                  extrae domain/application/ports de pi-agnes-router
│   │                                     → createProvider("account-router") de pi-ai
│   ├── memory/
│   │   └── dmaa.ts                      token-budgeted reconstructSession (N3: pointer al
│   │                                     ledger, no texto copiado) + handoff visible (N4) +
│   │                                     conciliador JSONL↔L0 (N5) + presupuesto <100k (V1)
│   ├── supervisor/
│   │   └── cross-plane.ts               verificación horizontal CORTEX↔fabric↔CANON (S4)
│   ├── profiles/                        perfiles agénticos YAML+schema (workflows de memoria
│   │                                     + política + presets de esfuerzo, V3)
│   └── eval/                            harness B1/B2/B3 + recall@k/nDCG con bge-m3 (S1)
└── tests/
```

## 2. Plan por fases (cada fase = gate falsable; las fases no se cruzan)

| # | Fase (días) | Contenido | Gate (falsable) |
|---|---|---|---|
| **P0** (0.5) | Higiene S0: `git init` en `PI-agent/` + `.gitignore` (node_modules, .DS_Store, mp4 fuera), badges reales, skeleton `pi-harness/` (package.json, tsconfig, AGENTS.md actualizado) | `git status` limpio · CI 418/418 pasa en git |
| **P1** (3–4) | S1: `src/eval/` + corpus etiquetado ≥200 queries + B1/B2 + recall@k/nDCG (bge-m3 :9003) | **baseline registrado con números** |
| **P2** (2–3) | `runtime.ts` + `agent/` + `routing/`: runtime compuesto (Agent + SelectionCore + MemoryFabric + router provider + 2 perfiles) | suite determinista verde · run e2e de tarea simple · conformance contra Pi 1.1.0 |
| **P3** (5–7) | S3: `control/` (PDP hot-swap + workflow mínimo + journal + MonitorPort) | **B3 = 3/3** · N ataques bloqueados · arm/disArm < 1 tick sin reinicio |
| **P4** (3–4) | `memory/`: N3 (reconstrucción por presupuesto/punteros) · N4 (handoff visible) · N5 (conciliador) · V1 (presupuesto contexto <100k) · N1 (diagnóstico + captura L0 en vivo) · N2 (carga en Pi vía runtime) | recall@k tras reanudar ≥ baseline S1 · 0 duplicados en re-ingesta L0 · % turnos >100k medido y con tendencia |
| **P5** (3–5) | S4/S5: `supervisor/` cross-plane + `TruthPort` CANON key-pinned + **P4-puerta: cortex-memory-adapter (CORTEX como MemorySPI vía MCP)** | verificador detecta inyección simulada · canary CANON real ✅ · clave distinta ⇒ rechazo · A/B CORTEX↔fabric: misma query ⇒ misma respuesta |
| **P6** (10) | S6: 2 semanas de uso real con kill-criteria (B1 ≥80 % · B2 precision@3 ≥ baseline · B3 3/3 · tokens/tarea medidos) | informe con números · solo entonces: V2 (regla de cambio modelo/esfuerzo) y E2/E3 (research) |

≈ **24–30 días** hasta P5 (coincide con S0–S5 de reviews/12, ≈20–25 días; P6 es el uso real).

## 3. Qué NO se hace (no-goals, para no repetir la Ronda 5)

1. **No portar RRF/fuzzy de CORTEX (P2-doc) sin baseline**: solo si P1 justifica delta medido.
2. **No fusionar CORTEX↔π-memory** (D1); CORTEX sigue vivo hasta P4-puerta; reescritura TS (P7-doc) **diferida** y solo tras 2 semanas de producción del adapter.
3. **No publicar SPIs antes que CORTEX los implante** (D10).
4. **No forkear el bucle del agente** ni el TUI: el bucle es `pi-agent-core`; la UI se decide aparte (ver P1b).
5. **No tocar `Jart-OS-de-SERVER`** (track de inferencia; bloquea solo las derivadas de CANON, que es Fase 4 de CANON, fuera del camino crítico).
6. **No mover el control a eventos** (Ronda 5 A3): el hot path (redact→admit→save) es **síncrono y unidireccional por capas**; los eventos son solo para observadores (journal, supervisor).
7. **No multiplicar paquetes** (Ronda 5 A1): 13 piezas para 10k LOC era sobre-arquitectura; aquí **1 paquete nuevo** (`pi-harness`) sobre 2 existentes.

## 4. Decisiones pendientes del usuario (bloquean P0/P2)

| # | Pregunta | Mi sugerencia |
|---|---|---|
| Q1 | El paquete nuevo vive en `PI-agent/pi-harness/` (ya reservado, CodeGraph + AGENTS.md) o se crea `PI-agent/pi-runtime/` nuevo? | `PI-agent/pi-harness/` (ya está reservado para esto) |
| Q2 | `git init` en la raíz de `PI-agent/` (S0 de reviews/12) o solo en `pi-harness/`? | Raíz de `PI-agent/` (S0 lo pide y la suite entera entra a versionado; los sub-proyectos conservan su autonomía vía paths) |
| Q3 | Interfaz del runtime: (a) headless/CLI + RPC, (b) reutilizar el TUI de coding-agent, (c) TUI propio | **(a) primero** (el TUI del autor se reutiliza montando nuestro runtime en `coding-agent` con `--extension`/SDK si el autor lo permite; TUI propio solo si P6 lo justifica) |
| Q4 | ¿Se mantiene la extensión actual de `pi-memory` (modo Pi stock) en paralelo al runtime, o el runtime es el único dueño de la memoria y la extensión se congela? | **El runtime es el dueño; la extensión se convierte en envoltorio fino del runtime** (una sola lógica, dos fachadas) — evita dobles fuentes de comportamiento |
| Q5 | bge-m3 en :9003 disponible en el entorno de ahora? (necesario para S1) | comprobar en P0 |

## 5. Riesgos y mitigación

| Riesgo | Nivel | Mitigación |
|---|---|---|
| Upstream Pi cambia la superficie que usamos (6 releases/semana) | Alto | pinned 1.1.0 + tests de conformance en CI; releer upstream al abrir cada fase; el bucle no se toca |
| Dobles fachadas (extensión + runtime) derivan | Medio | Q4: una sola lógica; la extensión solo traduce |
| P3 (control) tarda y bloquea todo el resto | Medio | Es el veredicto Ronda 5 (correcto): antes que ningún porting; P3 se hace con workflow mínimo de 3–5 pasos, no el motor completo |
| S1 sin bge-m3 disponible | Medio | fallback: B1/B2 con embeddings hash deterministas (peor pero numérico); bge-m3 se activa cuando exista |
| 1 persona manteniendo 2 suites + 3 repos Python + harness | Medio | los no-goals del §3; P6 decide qué se descarta (kill-criteria) |

## 6. Primer paso concreto (espera aprobación de P0)

```
cd ~/Code/PI-agent && git init && git add -A && git commit -m "S0 baseline: suite 418/418"
```
+ `.gitignore` raíz (`node_modules/`, `.DS_Store`, mp4) + badges reales + skeleton `pi-harness/`
(package.json con deps pinned: `@earendil-works/pi-agent-core@1.1.0`,
`@earendil-works/pi-ai@1.1.0` + `file:` a los dos paquetes nuestros + `proper-lockfile`
extraído de pi-agnes-router si procede) + actualización de `pi-harness/AGENTS.md`
con los comandos reales.

**NADA de lo anterior se ejecuta hasta que lo apruebes. Párame lo que quieras cambiar primero.**

## 7. Trazabilidad (cadena documental — nada flota suelto)

| Documento | Qué respalda a qué |
|---|---|
| `ANALISIS/01-analisis-profundo.md` | Evidencia de la decisión de marco del §0 (surface de hooks de `pi-agent-core`, gap runtime, modo extensión actual) y de los no-goals del §3 |
| `INVESTIGACION/01-arsenal-recursos-didacticos.md` | Arsenal y método del pack didáctico: **Conclusiones C1–C8 trazables** (§0), bitácora cruda (Apéndice A), 15 limbo (§9) |
| `PAQUETE-educativo/` (md+html+pdf) | El artefacto didáctico; su cadena de generación (0 deps) está documentada en `INVESTIGACION/01 §7` y su método pedagógico en `§5.1` |
| `CANON-pi-agent/` (congelado) | El orden S0–S6 de `reviews/12` + los N/V de `reviews/14` + HANDOFF: de donde salen las fases P0–P6 y las reparaciones del P4 |
| Limbo (76 entradas) | El inventario de capacidades (15 de hoy): aparcadas, 0 instaladas, política §8 |

**Estado:** P0–P6 y las 5 decisiones (Q1–Q5) **pendientes de aprobación**. La
investigación y el pack están **listos y documentados**; lo único que no se ha
hecho es **mover nada** (0 cambios en las fuentes).
