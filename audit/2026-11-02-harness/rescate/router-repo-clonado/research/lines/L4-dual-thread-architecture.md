# L4 — ¿2 hilos "modelo + sombra" siempre en conjunto? Evolución o retraso

## Pregunta exacta del usuario
Lanzar todo a 1 hilo con una **sombra adversarial en otro hilo**, tener un router de 2 "pares" (modelo+sombra) **siempre actuando en conjunto**: ¿evolución o retraso?

## Respuesta SOTA (fuentes S4, S5, P4, P14, P15, P16)

### Lo que dice el estado del arte
- **S4 (Anthropic multi-agent research system)**: el caso donde 2+ hilos en paralelo dan +90.2% **de win-rate vs un agente único (Claude Opus 4, eval interna de Anthropic)** es **tarea de investigación/lectura paralelizable** con un orquestador que fusiona; y su own-data: coste ~15× tokens vs chat y la **verificación** es lo que multiplica el ROI cuando el trabajo tiene efectos. No es "modelo + sombra en cada paso".
- **S5 (building effective agents)**: "la complejidad mínima que funciona"; cada pieza que no añade valor medido es deuda. Una sombra siempre-activa es complejidad permanente.
- **P4 (Heterogeneous Swarms)**: un ensamble con **roles** (generador/verificador) y **pesos optimizados**, no 2 hilos idénticos que se observan mutuamente. El SOTA de "2 pares" es el de roles *diferentes*, no espejo.
- **P14 (TRAM)**: el nº de llamados **se adapta al riesgo**; "siempre en conjunto" es justo el extremo que TRAM descarta (riesgo 0 → 1 llama; riesgo alto → k).
- **P15/P16 (MoA/Debate)**: mejoran **respuesta de consulta**; en bucle agéntico con efectos laterales **no están validados** y el coste es k×.

### El defecto fatal de "2 pares siempre en conjunto"
Con **acciones de efecto** (tool exec, writes), dos hilos corriendo a la vez = **efectos dobles y no deterministas**. SOTA: los pares **compiten en respuesta**, la **acción se ejecuta una sola vez** (ver L3). Y "sombra que observa y no actúa" no mejora nada si su salida no tiene un **verificador** que decida (P12: LLM-judge inestable como puerta única).

## Veredicto
**Es un retraso si es SIEMPRE.** Es **evolución solo en la versión L3**: sombra **selectiva** (gate de riesgo P14/P2), otra cuenta, 1 regeneración, verificador determinista, hilo de ejecución único, coste acotado y visible.

## Matiz honesto
- "2 pares en conjunto" **en consulta paralelizable** (investigación, búsqueda) **sí es SOTA y sí gana** (S4: +90.2% en investigación paralela; P15: +9% en benchmark). Si el usuario quiere **ese** escenario (tareas de investigación en Pi), es una línea distinta: **orquestador + N lectores + fusión**, no un router de cuentas. Se documentaría como **L5** (ahora no existe).
- Para el flujo actual de Pi (turno agéntico con tools), L3/L4-selectivo es el SOTA correcto.

## Siguiente paso
Decisión del usuario: (a) L3 selectivo como mejora del router (recomendado, acotado), (b) L5 orquestador multi-lector para tareas de investigación (mucho mayor alcance, fuera de este repo), (c) nada (mantener el router tal cual; la sombra siempre-activa se descarta por SOTA).
