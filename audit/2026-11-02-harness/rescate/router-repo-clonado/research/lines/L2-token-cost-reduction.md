# L2 — Reducción de consumo de tokens / coste

## Pregunta
¿Qué margen real queda para que el router **ahorre tokens o dinero**?

## Hechos (documentado S1)
- `agnes-2.5-flash` y `agnes-3.0-flash`: **USD 0** en entrada, **entrada cacheada** y salida (pricing, medido 2026-10-09 en `/tmp/pi-account-router-research/pricing.md`).
- El tier de "entrada cacheada" existe en el pricing → el backend distingue prefix cacheado; **no está demostrado** que la API de Agnes lo exponga ni que el prefix de Pi (system+tools+historial) sea estable lo bastante.
- El recurso escaso **medido** (2026-10-10) es el RPM por clave (~10), no el dinero: 4×10 = 40 peticiones/min es el techo del pool.

## Qué puede y qué NO puede el router
| Recorte | ¿Lo puede hacer el router? | SOTA |
|---|---|---|
| Tokens por inferencia (contexto) | No (es gestión de contexto de Pi: compaction, system, schemas de tools) | P17, práctica agéntica |
| Peticiones desperdiciadas | **Sí, y ya lo hace**: reparto proactivo sin 429, sin retry tras streaming parcial, cola justa entre procesos ✔ | `docs/verification.md` |
| Reenvío del mismo contexto a dos claves | No: cada inferencia va a **una** cuenta; la duplicación solo aparece en hedge (L1) o sombra (L3) y solo pre-output | P8/S3 |
| Routing por clase a modelo más barato | Solo si hay diferencia de coste: en Agnes **no la hay entre flash** → el único ahorro es **RPM** (el modelo más rápido gasta el mismo slot) | P1 (inaplicable en dinero) |
| Prompt caching | No lo controla el router; lo controla el backend (P7 RadixAttention) y la estabilidad del prefix (Pi) | P7/S6/S7 |

## Conclusión
**No hay palanca SOTA de "recortar tokens" para el router en este proveedor**: el coste monetario es 0 y el cuello de botella es el RPM, que el router ya maximiza. Lo que sí es SOTA y ya está hecho: eliminar peticiones desperdiciadas (reintentos, esperas ciegas, colas) ✔.

## Veredicto
**Sin novedad implementable.** Se documenta aquí para cerrar la pregunta; el único beneficio posible (routing 2.5 vs 3.0 por velocidad, no por precio) es **hipótesis** y depende de medir 2.5-flash (requiere decisión del usuario, porque gasta su cuota).
