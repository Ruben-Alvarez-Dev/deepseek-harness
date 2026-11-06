# Selective adversarial shadow (L3)

## Why
L3 research line: when a step fails with a deterministic signal (non-429, non-context-overflow, pre-output), dispatch exactly one regeneration on a different account with the failure feedback. Proven SOTA (ReST P13 + P25/P27: LLMs cannot self-correct without external signal).

## Scope
- Hook en `routed-streams` que captura errores transitivos y despacha 1 sombra en otra cuenta.
- Configuración opt-in: `shadowEnabled: true/false` (default `false`).
- Límites: máx. 1 regeneración/paso, nunca loops.
- Métrica `S n` en footer (sombras activas en curso).
- Cero cambio en el comportamiento cuando está desactivado.

## Measurable acceptance criteria
1. `npm run check` pasa (typecheck, lint, tests).
2. `openspec validate selective-shadow --strict` pasa.
3. Con `shadowEnabled: false` (default): comportamiento idéntico a antes.
4. Con `shadowEnabled: true`: una fuga de red pre-output dispara 1 regeneración en otra cuenta; si la sombra también falla, se propaga el error sin reintentos extra.
5. Footer muestra `S n` cuando hay sombras en curso.
