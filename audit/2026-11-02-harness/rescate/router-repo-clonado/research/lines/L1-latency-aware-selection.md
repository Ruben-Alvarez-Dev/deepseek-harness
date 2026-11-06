# L1 — Selección aware de latencia por cuenta (EWMA TTFT)

## Pregunta
¿Puede el router ser más **rápido** sin cambiar modelo ni arquitectura?

## Estado SOTA (ver `landscape.md` §2.2, fuentes S3/S3b/S3c/P2)
- Latency-aware LB es el estándar de sistemas de alto throughput (SRE tail-latency, S3b; a gran escala **LAD**, S3c). Con **4 recursos**, EWMA + cola es la aproximación estándar que SOTA prescribe (no hace falta el modelo de latencia de LAD hasta cientos de recursos).
- El router SOTA (CARGO, P2) añade señal de **confianza** al gate; aquí la señal análoga barata es la **latencia observada por cuenta**.
- Medido en este repo (`docs/performance.md`, 4 muestras): TTFT mediano 0.554 s; `agnes-planetary` **4.629 s** (8× la mediana) → hay hueco real que un LB aware de latencia aprovecharía.

## Diseño concreto para este repo
1. En el mismo estado compartido (v2→v3): `latEWMA[accountId]` (ms, decaimiento λ≈0.5, medido TTFT+inferencia de cada reserva exitosa).
2. Selector actual (menor presión de cuota, cursor de empate) → **menor (presión, latEWMA)**: presión de cuota es la dura (429); latencia solo desempata entre cuentas con hueco. No se penaliza cuenta lenta hasta que supere un umbral de desviación (evitar flip-flop con 4 muestras).
3. Opción **opt-in: hedge pre-output** (S3): si la reserva más lenta del lote pasa X ms sin primer token, duplicar la petición en la cuenta con más hueco y descartar el perdedor **antes de exponer** el primer delta. Requiere: descartar sin exponer stream ya emitido (hoy el diseño prohíbe reintentos tras streaming parcial: el hedge es una excepción *diseñada*, no un retry) y **duplica el gasto de RPM** en la ventana → decisión del usuario por ToS §5.4 (S1).

## Riesgos / límites de la evidencia
- 4 muestras → sin p95; el EWMA se converge solo; hasta N primeras reservas por cuenta, no penalizar (fría).
- El outlier medido es de 2026-10-09; puede ser transitorio. El diseño debe **medir y dejar de castigar** (decaimiento), no penalizar fijo.
- Hedge: ToS "no circumventar rate limits" (S1). El hedge respeta las ventanas de cada cuenta (gasta 1 slot de dos) pero **duplica** peticiones: el usuario decide.

## Veredicto
**Evolución, barata y de bajo riesgo** (parte 1: EWMA en el selector). El hedge (parte 2) **no es SOTA "gratis"**: es un trade-off de cola-latencia a cambio de +RPM, y S3 lo documenta así; se deja opt-in y por defecto OFF.

## Siguiente paso
Cambio OpenSpec `latency-aware-selection`: v3 del estado + selector extendido + tests deterministas (FakeClock, latencias fijadas). Cero cuota del usuario para implementarlo.
