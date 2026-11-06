# Baseline de tokens — CH-040 (P0)

**Fecha:** 2026-11-06 · **Estado:** BASELINE PUBLICADO · **Regla:** medir, no estimar (sin `ceil(len/4)` ni heurísticas de caracteres).
**Fuente:** logs durables de sesión v4 de la app instalada (`~/.dsh/sessions/*/*/session.v4.jsonl.zstd`), descomprimidos con `zstd` y leídos sin llamadas al modelo.
**Medida:** `assistant/message.data.usage` — usage **reportado por el proveedor**, exacto y replayable desde el log. No se usó el estimador heurístico de `token-meter`; `surfaceTokens`/`contextPressure` de token-meter quedan para P1 (requieren el contexto del harness).

---

## 1 · Método

- `total = inputTokens + cacheReadTokens + cacheWriteTokens + outputTokens` (el `usage.totalTokens` del log coincide con la suma).
- Por sesión: peticiones = mensajes de asistente con `usage`; tokens/petición = `total / peticiones`; mediana y p90 sobre las peticiones de la sesión.
- Agregado: media **ponderada por peticiones** (582 peticiones) y media de las medias de sesión.
- Cobertura: 46 de las 53 sesiones tienen `usage` (las demás son vacías/abortadas antes del primer turno). Se eligen 3 sesiones del workspace del repo DSH, con presets distintos y volumen alto; todas cerradas antes del 2026-11-06.

## 2 · Sesiones medidas

| Sesión | Preset | Modelo | Fecha | Peticiones | Turnos | Tool calls | Duración | Input no cacheado | Cache read | Output | Total | tok/petición (medio / mediana / p90) |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `session-4465f246…` | cordis | deepseek-v4-pro | 2026-11-02 | 315 | 59 | 404 | 331 min | 2.822.343 | 124.421.632 | 362.060 | 127.606.035 | 405.099 / 430.269 / 695.974 |
| `session-3f2e6793…` | standard | deepseek-flash | 2026-10-31 | 195 | 6 | 234 | 2.004 min | 479.291 | 41.390.080 | 125.134 | 41.994.505 | 215.356 / 231.238 / 351.858 |
| `session-97dd7c29…` | sota | deepseek-flash | 2026-11-02 | 72 | 15 | 58 | 5.343 min | 292.392 | 9.462.784 | 105.872 | 9.861.048 | 136.959 / 132.086 / 238.034 |
| **Agregado (ponderado)** | — | — | — | **582** | 80 | 696 | — | **3.594.026** | **175.274.496** | **593.066** | **179.461.588** | **308.353** |

Valores por petición, agregados: **input no cacheado 6.175** · **cache read 301.159** · **output 1.019** · **total 308.353**.
Media de las medias de sesión: **252.471** tok/petición (rango 136.959–405.099).

## 3 · Lectura

- El **97,7 %** de los tokens medidos son **cache read** (175,3 M de 179,5 M): ahorrar en el prefijo cacheado tiene poco efecto de coste por token, pero sí lo tiene sobre la **presión de contexto** y sobre la latencia de reconstrucción. La señal que P1 debe mover es la **superficie por petición** (tools + skills + inyecciones), no solo el total bruto.
- El **input no cacheado** (6.175 tok/petición) y el **output** (1.019) son las magnitudes facturables directas; cualquier gate de P1 debe publicar ambas por separado, además del total.
- Las 3 sesiones cubren presets distintos (cordis, standard, sota) y dos modelos; son una base razonable, no una muestra estadística.

## 4 · Gate de P0 y objetivo de P1

- **P0 (este change):** baseline publicado con número medido → **308.353 tok/petición ponderado**, 582 peticiones, 3 sesiones. `versionar el plan` ya está hecho en el commit `45c3443` del expediente.
- **P1 (CH-041) — propuesta, pendiente de decisión:** reducir **≥20 %** la superficie por petición sin regresión en snapshots ni en tool-calls correctos, midiendo el mismo esquema de 3 sesiones (y añadiendo `surfaceTokens` de token-meter). Umbral propuesto: total ≤246.682 tok/petición **o** input no cacheado ≤4.940; a decidir antes de implementar el governor.

## 5 · Reproducción

```sh
zstd -d -c ~/.dsh/sessions/--Users-ruben-Code-deepseek-harness--/<id>/session.v4.jsonl.zstd \
  | python3 - <<'PY'   # sumar assistant/message.data.usage por sesión
# ver §1 para la fórmula
PY
```

Caveats: medición hecha con la app 0.1.5-rc.2 (perfil desktop); no incluye sesiones de otros workspaces; `token-meter` (estimador replay-aware) se usará en P1 para la presión de superficie, no para contradecir el usage exacto.
