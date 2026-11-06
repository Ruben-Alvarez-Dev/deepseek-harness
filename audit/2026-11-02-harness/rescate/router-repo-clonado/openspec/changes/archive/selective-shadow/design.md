# Design — sombra adversarial selectiva (L3)

## Hechos observados
- `routed-streams.ts` ya gestiona `maxTransientRetries` con reintentos en la MISMA cuenta (pool semántics).
- El verificador determinista (L3) no existe aún; la sombra se dispara por señales de red/transitorio, no por verificación post-hoc.
- El hook `before_agent_start` de Pi S9 ya está usado para memory-reuse.

## Diseño
```
paso normal  → 1 inferencia en cuenta A (pool X)
si falla transitivamente (no 429, no overflow, pre-output) y shadowEnabled=true:
  → registrar sombra activa (S++)
  → adquirir lease en cuenta B ≠ A (pool mismo o distinto)
  → refetch contexto + feedback del error como system message
  → 1 regeneración en B
  → si B pasa → emitir resultado; si B falla → emitir error de B (sin más reintentos)
  → S--
```

## Decisión explícita
- **Gate de riesgo**: solo errores transitivos (network drop, idle timeout, early stream error). 429 y context overflow ya tienen su propia semántica.
- **Máximo 1 sombra por paso**: no loops, no ReST infinito.
- **Cuenta distinta**: la sombra se ejecuta en otra cuenta para no repetir el mismo grupo en cooldown.
- **Feedback**: el mensaje de error se añade como system message al contexto para la regeneración.
