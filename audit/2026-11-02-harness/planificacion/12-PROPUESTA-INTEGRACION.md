# Propuesta de integración SOTA para DeepSeek Harness — memoria híbrida escalonada + anillo de negociación

**Fecha:** 2026-11-02 · **Protocolo:** `/auditoria-dev` (multidisciplinar + adversarial + Dementor).
**Base:** los informes 00–11 de este expediente (auditoría PI-agent, dossier QWEN, forense, handoff SOTA, frontera académica, cortex/pi-memory).
**Alcance:** memoria pasiva híbrida escalonada · anillo de negociación (evolución funcional de pi-intermediate) · router de MCPs/skills. **Excluido:** router de cuentas (agnes).

---

## 0 · Veredicto central

**No se construye un gateway monolítico: se construyen tres políticas de presupuesto sobre los seams de enforcement que DSH ya tiene.** DSH ya garantiza estructuralmente que el modelo no hace nada fuera del harness (todo pasa por `ctx.llm`, `ctx.tools`, agent-loop); lo que falta es que esos seams **negocien** (presupuesto, selección, recorte) en vez de dejar pasar. La memoria ya está a medias: cortex montado y funcionando; falta el **puente pasivo** que lo alimente y lo inyecte sin llamadas explícitas del agente.

---

## 1 · Principios de diseño (destilados de todo el estudio)

1. **Enforce en el seam, no en un monolito.** El "gateway enterizo" es un conjunto coordinado de plugins en los 4 puntos por los que ya pasa todo: ensamblado de petición, despacho de tools, resultados de tools, ciclo de vida de sesión. Un monolitico rompería el modelo de capability seams y la componibilidad de DSH.
2. **Medir, no estimar.** Todo presupuesto usa `token-meter` (replay-aware, determinista). Prohibido reintroducir `ceil(len/4)` (la lección de pi-memory).
3. **Zero-embeddings.** Búsqueda y ranking por KG + FTS5 + Fuzzy (la decisión de cortex/engram); no añadir vectores salvo que un experimento medido los justifique.
4. **Pasivo por defecto, activo bajo demanda.** El agente no llama a la memoria: el harness captura, consolida e inyecta; el modelo solo **busca** cuando lo necesita (híbrido).
5. **Sleep-time compute.** Toda consolidación ocurre fuera del turno (dream/daemon/jobs) — Letta, cortex, opencode.
6. **Model-visible ⟺ logged.** Nada entra en contexto que no sea reconstruible desde el session log; la inyección de memoria se registra como evento con origen.
7. **Untrusted por defecto.** Todo lo inyectado desde fuera (memoria, referencias, MCP) lleva la valla de no-instrucciones que DSH ya aplica en `session-reference`.
8. **Presupuesto declarado y atribuido por capa.** Cada capa (system, skills, tools MCP, memoria, resultados) tiene cuota y aparece en el desglose; el governor **impone**, no solo contabiliza (la lección del TokenGovernor inerte de pi).

## 2 · Arquitectura propuesta

```
                      ┌── ANILLO DE NEGOCIACIÓN ──────────────────────────┐
 modelo ◄────────────►│  N1 · ContextBudgetGovernor (outbound)            │
        ◄────────────►│       skills top-K · schemas MCP acotados         │
        ◄────────────►│       inyección de memoria ≤ cuota · solo cola    │
        ─────────────►│  N2 · ToolDispatchGate (inbound)                  │
        ─────────────►│       vocabulario normalizado · denegación        │
        ◄────────────►│  N3 · ResultBudgeter (inbound)                    │
        ◄────────────►│       head/middle/tail por presión (hoy: compact) │
                      └────────────────────────┬─────────────────────────┘
                       ┌── SELECCIÓN ───────────┴─────────────────────────┐
                       │  S1 · SkillRouter · MCPRouter (FTS5, zero-embed) │
                       │       + escape hatch: find-skill / query-session │
                       └──────────────────────────────────────────────────┘
                       ┌── MEMORIA PASIVA HÍBRIDA ────────────────────────┐
                       │  M1 · CaptureBridge: session/event → backend      │
                       │  M2 · Inyectador: request_context ≤ cuota (cola)  │
                       │  M3 · DreamScheduler: consolidación fuera de turno│
                       │  M4 · HandoffBridge: /handoff → sesión nueva      │
                       └───── backend de memoria POR DECIDIR (cortex fuera de alcance) ┘
```

**Pieza por pieza:**

| Pieza | Función | Origen | ¿Existe en DSH? | Se instala | Se construye |
|---|---|---|---|---|---|
| **N1 ContextBudgetGovernor** | Presupuesto outbound: trunca skill metadata a top-K relevantes, acota schemas de tools MCP, limita inyecciones y las fuerza a la cola | pi-intermediate (selection plane) + token-meter + gradual disclosure | Parcial: skills cargan solo descripción; token-meter mide; **no hay presupuesto que imponga** | — | Plugin nuevo sobre `agent/request` + `tokenMeter` |
| **N2 ToolDispatchGate** | Toda llamada de tool pasa por un punto que normaliza vocabulario y aplica política (deny por defecto para lo no conocido) | pi hard-gates (con su lección: fail-closed de verdad, no allow-by-default) | Parcial: approval + guard + sandbox; **el gate de contenido no normaliza vocabulario** | — | Plugin sobre el seam de dispatch de tools |
| **N3 ResultBudgeter** | Recorte de resultados de tool por presión **por turno** (no solo en compactación) | compaction-tool-result-pruner (ya existe) | Sí, pero solo en compactación | — | Extender el pruner a modo por-presión |
| **S1 Skill/MCPRouter** | Ranking de skills y tools MCP por relevancia a la tarea (FTS5 sobre descripciones) + escape hatch de búsqueda | pi selection plane + cortex zero-embedding + OpenViking tiered loading | Parcial: `tool-skill` catálogo + `find-skills` + `tool-session-query`; **no hay ranking previo** | — | Plugin sobre la sección de skills/tools del system prompt |
| **M1 CaptureBridge** | Escucha `session/event` (turnos, decisiones, correcciones) y reenvía al backend de memoria **sin que el agente llame nada** | cortex L0 (referencia, fuera de alcance) + pi-memory hooks | — | backend por decidir | Plugin puente con redacción previa |
| **M2 Inyectador** | En `session/start` pide `request_context` con cuota; inyecta en la **cola volátil** | cortex L5 (referencia) + DMAA de pi-memory | — | backend por decidir | Parte del plugin M1 |
| **M3 DreamScheduler** | Programa consolidación (L1→L3) fuera del turno con `ctx.jobs`/daemon | cortex dream (referencia) + Letta sleep-time | — | backend por decidir | Scheduler + política de cuándo |
| **M4 HandoffBridge** | `/handoff <goal>`: checkpoint estructurado orientado al objetivo + working-set + sesión nueva enlazada | Amp → opencode-handoff → pi-amplike (informe 09) | `session-query`, fork y checkpoint existen | — | Plugin de comando + revisión |
| **Diagnóstico** | `context-doctor` (audita coste de AGENTS.md/skills/schemas) y `compaction-audit` (qué perdió la compactación) | Zhenyu98/dsh-context-doctor · @bushizhanghan/dsh-compaction-audit | — | **Instalables del mercado DSH** (verificados en este expediente) | — |

**Lo que NO se adopta** (con razón, del adversarial): compactación nativa del proveedor (rompe replay), auto-memory duplicado (cortex ya lo es), embeddings (hasta medición), gateway monolítico (rompe seams), router de cuentas (excluido).

## 3 · Plan de implementación (fases con gate falsable)

| Fase | Contenido | Gate (falsable) | Coste |
|---|---|---|---|
| **P0** | Decisiones + medición: fijar cuotas (skills K, schemas MCP, inyección), registrar baseline de tokens/petición con `token-meter` en 3 sesiones reales | Baseline numérico publicado en el expediente | 0,5–1 d |
| **P1** | N1 (gobernador outbound): top-K de skills, schemas MCP acotados (sumario de MCPs no relevantes), inyecciones a cola y con cuota | Tokens/petición −X % medido, **sin** pérdida en snapshots de sesión ni en la tasa de tool-calls correctos | 3–5 d |
| **P2** | N2 + N3: gate de dispatch con vocabulario normalizado (deny por defecto + allowlist explícita por tool) y pruner por presión | Ataques de bypass (12 casos estilo hard-gates) bloqueados; resultados largos recortados con original en log | 3–5 d |
| **P3** | S1: ranking FTS5 de skills/MCP + escape hatch | Probe de selección estilo A1 del dossier: nDCG/recall@k sobre ≥50 (query → tool correcta), publicado | 3–5 d |
| **P4** | M1+M2+M3: puente pasivo de memoria (captura con redacción, inyección con cuota, dream programado) — **backend por decidir** (cortex fuera de alcance) | recall@k de memorias propias tras N sesiones; cero llamadas explícitas del agente; inyección ≤ cuota | 4–6 d |
| **P5** | M4: `/handoff` con working-set y enlace a `tool-session-query` | Sesión larga → handoff → tarea completada en la sesión nueva con menos pasos que sin handoff (medido) | 3–5 d |
| **P6** | Endurecimiento: montar context-doctor + compaction-audit; invariants por componente; pase `/auditoria-dev` final | 12/12 invariants + auditoría con 0 BLOCKER/CRITICAL abiertos | 2–4 d |

**Total: 3,5–5 semanas** (con las mediciones como parte del trabajo, no como colofón).

## 4 · Pase adversarial

**A1 (diseño)** — «El gobernador puede matar la utilidad: si esconde la tool correcta del top-K, el modelo falla.» → Mitigación: escape hatch siempre presente (búsqueda de skills/sesión) y gate de P1/P3 que mide **precisión**, no solo ahorro. Aceptado como riesgo controlado.

**A2 (diseño)** — «Ranking por FTS de descripciones es débil para tareas nuevas sin léxico.» → Mitigación: el escape hatch es la red de seguridad; el ranking es solo poda, nunca cierre (igual que "trust es preferencia, no exclusión" de pi, pero con cuota).

**A3 (seguridad)** — «M1 reenvía el session log a un proceso externo (el backend de memoria): nueva superficie de fuga.» → Mitigación: redacción en el puente (campos publicables), sin prompts ni secrets, mismo usuario y máquina, y registro del reenvío en el session log. Si se exige, sandbox del transporte.

**A4 (seguridad)** — «N2 deny-by-default puede romper herramientas legítimas el primer día.» → Mitigación: P2 arranca en modo *audit* (registra qué denegaría) 1 semana antes de modo *enforce*; allowlist por tool explícita, no inferida.

**A5 (proceso)** — «Este expediente es el decimotercer documento; puede morir huérfano como los anteriores.» → Mitigación: el gate de P0 incluye **versionar esta propuesta** y abrir el change de diseño en el propio repo de DSH antes de tocar código.

**A6 (calidad)** — «Falta evaluación longitudinal: nada mide si la memoria mejora al agente durante meses (el problema abierto del campo).» → Mitigación: P4 incluye el harness de recall y P6 una métrica de reutilización de memorias por sesión; si en 30 días no hay señal, se apaga M1.

## 5 · Dementor (el escéptico absoluto)

| Sospecha | Resultado |
|---|---|
| «DSH ya tiene casi todo esto y la propuesta duplica» | **Parcialmente cierto**: pruner, approval, token-meter y gradual disclosure existen. La propuesta solo añade **imposición** (governor), **selección** (router) y **pasividad** (puente). Si no se nota la diferencia en P1, se para |
| «El governor de pi era inerte; el de DSH también lo será» | **Riesgo real**: por eso N1 nace en el seam de ensamblado (donde ya se construye la petición) y su gate es un número medido de tokens, no una métrica de "salud" |
| «Con 12 tools de memoria ya basta; el puente es inventar» | **Falso a medias**: un backend hace el 80 % (store, búsqueda, consolidación), pero **nada lo alimenta pasivamente desde DSH** — las memorias solo entran si el agente las llama. El puente es la pieza que convierte la memoria en *pasiva* |
| «El router de skills es optimización prematura; el modelo ya elige» | **Contra-evidencia**: el coste de schemas MCP y descripciones crece linealmente con cada MCP montado; es exactamente la clase de problema que pi-intermediate diagnosticó. Gate P3 lo decide con números, no con opinión |
| «La propuesta no dice qué pasa si el modelo llama a una tool fuera del top-K» | **Falso**: las tools no se ocultan, se **resumen** en el prompt; el catálogo completo sigue disponible vía herramientas de búsqueda. Nada queda inaccesible |

## 6 · Correcciones de los propios auditores

1. En el informe 07 dije que «el plan de anillos no transfiere a DSH». **Matiz necesario**: no transfiere como *código* ni como *estructura*, pero sí como **función de negociación** — que es exactamente esta propuesta. La conclusión de 07 era correcta sobre la migración; era incompleta sobre la función.
2. La memoria se apoya en un backend externo (cortex, verificado: 74 tools, capas L0/L3/L5, dream) que **sale del alcance el 2026-11-05**; el diseño M1–M4 se mantiene, el backend queda por decidir.

## 7 · Estimación de esfuerzo

| Frente | Rango |
|---|---|
| P0–P2 (anillo de negociación) | 1,5–2 semanas |
| P3 (router de skills/MCP) | 3–5 días |
| P4 (memoria pasiva) | 4–6 días |
| P5 (handoff) | 3–5 días |
| P6 (endurecimiento + auditoría) | 2–4 días |
| **Total** | **3,5–5 semanas**, con gates medidos en cada fase |

## 8 · Decisiones que necesita el usuario

1. **Cuotas iniciales**: K de skills en contexto, presupuesto de schemas MCP, cuota de inyección de memoria por sesión (propongo K=8, 3k tokens schemas, 1k tokens memoria; ajustable por config).
2. **Modo de N2**: arrancar en *audit* 1 semana antes de *enforce* (recomendado).
3. ~~Cortex como backend canónico de memoria para DSH~~ — **retirada (2026-11-05)**: cortex sale del proyecto; queda por decidir si habrá backend de memoria.
4. **Dónde vive el código**: paquetes nuevos en DSH (`packages/memory/*`, `packages/negotiation/*`) o plugin de perfil. Recomendado: paquetes, con opt-in por perfil.
5. **¿Iniciamos P0** (medición + versionado de esta propuesta) como siguiente acción concreta?
