# Handoff — pi-account-router

Fecha: 2026-10-17 · Sesión Pi (agnes-3.0-flash)

## Estado: sin trabajo en curso pendiente del propietario

### Hecho en esta sesión (plan de auditoría O1–O3 ejecutado)
1. **O1 — Rescate flaky** (`e3258ab`): `tests/footer.test.ts` fallaba bajo
   carga (3 suites en paralelo; el debounce de 30ms no coalescía el burst y
   la aserción "llamadas ≤ 2" se rompía). Corregido asertando solo
   reactividad + cese tras `unwatch`. Verificado: 9 ejecuciones en paralelo
   + 10 suites consecutivas sin repro.
2. **O2 — Cableado runtime del catálogo** (`7447464`): `loadConfig` valida
   `providerContract` contra `catalog/` (referencia, modelos del mismo
   proveedor, ventanas de cuota vs `limits.rpm`) — fails-closed, y sin
   `providerContract` no hay I/O. 5 tests nuevos (`tests/catalog-runtime.test.ts`).
   Change OpenSpec `catalog-runtime-validation` archivado; spec
   `provider-catalog` +1 requirement.
3. **O3 — Revisión docs**: `docs/project-status.md` con bloque 2026-10-17
   (estado actual + incidente flaky).

### Ejecutado en esta sesión (con OK del propietario)
- **O5 — Re-verificación en vivo:** `PI_ROUTER_LIVE=1 npm run test:live`
  completó 2 inferencias reales vía el router (`stopReason: stop`, ~120 tokens
  c/u), sin errores. Opcional restante: `test:live:accounts` (pool multi-cuenta,
  ~30 peticiones) solo si se quiere medir cuentas reales.
- **O4:** `prepack` ahora solo typecheck + lint (~3 s); la suite completa
  sigue en `check`/`verify`.

### Gates finales
- `npm run verify` verde: 232 tests / 20 archivos · typecheck · lint
  --error-on-warnings · 9 specs OpenSpec strict · check:providers ·
  check:models.

## Contexto relevante
- Repo canon en `~/Code/PI-agent/scr/pi-account-router`; TS + Biome + Vitest
  + OpenSpec. Una extensión, una carpeta, una versión (ADR 0005).
- Restricciones del propietario (2026-10-17): no leer/escribir fuera de esta
  carpeta; no crear arquitecturas ni sobreingeniería fuera del propósito.
  Catalog: fuera de alcance auto-populate LiteLLM/HF y flags de motores locales.
- Policy You.com: pool de 2 keys del OS credential store bound a
  `https://api.you.com/mcp`; no imprimir/rotar/sustituir.
- Modelo en uso: `agnes-3.0-flash` (solo texto; `read` de imagen →
  "image omitted").
