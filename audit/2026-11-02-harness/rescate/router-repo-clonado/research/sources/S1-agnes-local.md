# S1 — Agnes AI: fuentes oficiales locales y medidas propias

Material descargado 2026-10-09 en `/tmp/pi-account-router-research/` (fuente: `https://wiki.agnes-ai.com` vía `llms.txt`, 68 líneas en `/tmp/pi-account-router-llms.txt`). Resumen en `docs/agnes-research.md`.

## Hechos documentados (2026-10-09)
- API `https://apihub.agnes-ai.com/v1` (OpenAI-compatible; backend LiteLLM; **sin cabeceras de rate-limit**, solo `x-litellm-response-cost-tool-usage`).
- Catálogo `/v1/models` (GET 200): incluye `agnes-3.0-flash`, `agnes-2.5-flash`, modelos de pago y multimedia.
- **Precio** (pricing.md): USD 0 entrada / entrada-cacheada / salida para `agnes-2.5-flash` y `agnes-3.0-flash`; Pro y Flash Max a precio > 0.
- **ToS §5.4**: prohíbe "circumventing rate limits"; §8.2 uso de datos para entrenamiento salvo opt-out.
- 3.0-flash: contexto anunciado 512K / salida 65.536 (documentado, **no** medido).

## Medido propio
- **2026-10-10**: límite **por clave** ~10 RPM (clave A 429 en petición 9; clave B aceptada al instante; A sigue rechazada). 4 claves → ~40 RPM de pool. `docs/accounts-verification.md`, `docs/verification.md`.
- **2026-10-09**: TTFT mediano 0.554 s, outlier `agnes-planetary` 4.629 s (4 muestras, cap 256). `docs/performance.md`.

## Aprovecha estas líneas
- L1 (outlier de latencia), L2 (tier cacheado a 0 USD → caching probable, no demostrado), L3/L4 (el RPM es el recurso escaso, no el dinero; la sombra **gasta** RPM, no lo elude).
