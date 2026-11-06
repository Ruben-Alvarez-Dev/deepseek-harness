# L3 — Sombra adversarial **selectiva** (regeneración con feedback + verificador determinista)

## Pregunta
¿Puede el router mejorar la **calidad** de las respuestas con una "sombra" en otra cuenta?

## Jerarquía SOTA (landscape §3; P9–P16)
1. **Auto-mejora del propio paso** — Self-Refine (P9), Reflexion (P10): ganancia moderada documentada; coste = +1 inferencia del MISMO modelo; **no usa otra cuenta**.
2. **Muestreo + votación** — Self-Consistency (P11): calidad ↑ con k; coste ∝ k; **solo válido para respuesta con ground-truth comparable** (no para "ejecuta este comando").
3. **Generador + verificador (SOTA real de la sombra)**:
   - Verificador **determinista** (tests, typecheck, exit-code, schema): el SOTA donde existe — **el usuario ya lo tiene** (`npm run verify*`, OpenSpec specs).
   - **ReST** (P13): rejection sampling con gate de reward: **solo se regenera si el verificador falla**. Esa es la "sombra".
   - **TRAM** (P14): el nº de llamados se adapta al **riesgo estimado** de la instancia → gate práctico: **CARGO/confianza** (P2).
   - LLM-as-judge (P12): acuerdo alto con humanos, pero sesgos documentados (posición, verbosidad, self-bias) → **no usar solo como puerta**.
4. **Ensemble deliberativo** (MoA P15, Debate P16): mejoras documentadas **en respuesta de consulta** (factuality/reasoning), coste k×; **no están diseñados para bucle agéntico con efectos laterales**.

## Aviso SOTA a la dualidad permanente (S4, S5)
Anthropic (S4): para trabajo con **efectos**, el multiplicador de ROI es la **verificación**, y los subagentes rinden en exploración *lectora*; coste ~15× tokens en orquestación multi-agente. (S5): complejidad mínima que funcione; workflow > agente. **Doble ejecución en paralelo de acciones con efectos = efectos dobles/impredecibles** → SOTA: los "pares" compiten en *respuesta*, **la acción se ejecuta una sola vez, serial**.

## Evidencia SOTA que refuerza el diseño (meta-auditoría 2026-10-10)
- **P25 (OpenAI, verificado hoy)**: "LLMs cannot self-correct reasoning yet" → **autocorrección sin señal externa NO mejora (peor incluso)**; con verificador externo SÍ. **P27** (survey) y **P28** (CRITIC, corrección por herramienta) lo confirman. → La puerta de la sombra **debe ser el verificador determinista**, nunca un "juez LLM libre".
- **Familia RLVR (SOTA de entrenamiento de 2025)**: P26 (DeepSeek-R1, verificado hoy) usa **rewards verificables**; P13 (ReST) es su ancestro en inferencia. El SOTA absoluto de "aprender" vive en los pesos; en este equipo el análogo es **L5-A (juez local)**.

## Diseño concreto (si el usuario lo aprueba)
```
paso normal            → 1 inferencia en la cuenta elegida (L1)
verificador falla      → 1 regeneración SÓLO de ese paso en OTRA cuenta (la de menos presión, ≠ ejecutante),
                         con el feedback del fallo en el prompt (patrón ReST, P13)
verificador pasa       → se acepta; si falla de nuevo → se detiene y se reporta (no en loop)
Gate de riesgo (TRAM P14 / CARGO P2): la sombra se dispara solo en pasos de alto riesgo (tool de
                         efecto, inferencia que el propio router marcó "fácil→difícil" por 429 o
                         error previo), no en cada turno.
```
Presupuesto: +1 inferencia **solo en los pasos que ya fallaron**. Con 40 RPM de pool, el coste máximo es acotado y visible en el footer (nueva métrica: `S n` sombras activas). **Hilo único de ejecución**: la sombra **propone**, el hilo del paso **dispara el verificador y decide**; nunca hay dos acciones corriendo.

## Riesgos
    - El verificador determinista solo cubre pasos verificables; los pasos no verificables (prosa, decisiones de diseño) quedan fuera: la sombra en esos pasos sería un LLM-judge (P12) y **no se hace** por su inestabilidad documentada.
- Riesgo de "sycophancy" del verificador LLM si se añadiese (P12).
- ToS S1: la sombra **gasta** el RPM de otra cuenta; no la elude.

## Veredicto
**Evolución SIEMPRE selectiva; RETRASO si es siempre-activa o en paralelo ejecutando.** SOTA exacto: ReST (P13) con gate de TRAM (P14)/CARGO (P2) y verificador determinista (el pipeline `verify` ya existente).

## Siguiente paso
Cambio OpenSpec `selective-shadow`: (a) hook de verificador en `routed-streams` que captura el error del paso y, **si el usuario habilita el modo**, despacha 1 regeneración en la cuenta menos presionada **distinta de la ejecutante**, (b) métrica `S` en footer, (c) límites: máx. 1 regeneración/paso, no loops. **Decisión previa del usuario**: qué pasos son "alto riesgo" y si acepta el gasto extra.
