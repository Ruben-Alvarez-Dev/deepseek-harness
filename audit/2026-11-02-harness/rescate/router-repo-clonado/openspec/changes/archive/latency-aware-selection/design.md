# Design — EWMA latency-aware selection (L1)

## Hechos observados
- `selectAccount` en `policy.ts` ya usa `(pressure, cursor)` como criterio de selección
- `RouterState` tiene `version: 3` con campo `latEWMA: Record<string, number>`
- `AccountRouter.recordLatency(accountId, latencyMs)` actualiza EWMA en el store

## Diseño
1. **Estado v3**: `latEWMA[accountId]` se inicializa a 0 (sin historial). Primera medición toma el valor crudo.
2. **Selector**: `selectAccount` ahora retorna también `latEWMA` del mejor candidato. El comparator es `(pressure ASC, latEWMA ASC)`.
3. **Umbral**: cuentas con `latEWMA > latencyThresholdMs` se consideran "lentas" pero no se excluyen — solo pierden desempates.
4. **Migración**: v1→v2 (waiters), v2→v3 (latEWMA: {}) en `decodeState`.

## Decisión explícita
- No hedge pre-output (eso es parte 2, fuera de scope por duplicar RPM)
- EWMA solo como desempate, nunca como criterio primario (la presión de cuota sigue siendo la dura)
- α=0.5 por defecto (decaimiento rápido, se adapta a cambios de latencia en ~2-3 muestras)
