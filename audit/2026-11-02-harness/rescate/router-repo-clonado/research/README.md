# Investigación: optimización del router al SOTA (bloque separado, no implementado)

Inicio: 2026-10-10. Estado: **solo investigación + documentación; ninguna línea está implementada** salvo las que se marquen aquí.

## Líneas de investigación (carpeta `lines/`)

| ID | Línea | Pregunta | Veredicto SOTA provisional |
|---|---|---|---|
| L1 | Selección aware de latencia por cuenta (EWMA TTFT) | ¿Acelera el router? | **Evolución, barata y de bajo riesgo.** Palanca real (outlier medido 4.63 s vs 0.55 s) |
| L2 | Reducción de consumo de tokens / coste | ¿Qué le queda al router? | **Casi nada monetario** (tier gratis + entrada cacheada a 0 USD); el recurso escaso es RPM, ya maximizado |
| L3 | Sombra adversarial selectiva (regeneración con feedback + verificador determinista) | ¿Mejora calidad? | **Evolución, solo si es selectiva** (patrón ReST/TRAM; no siempre-activa) |
| L4 | Arquitectura dual-hilo "2 pares modelo+sombra en conjunto" | ¿Evolución o retraso? | **Retraso si es siempre; evolución si es selectiva y el ejecutor es único** |
| L5 | Capturar, aprender y guardar lo aprendido para reusarlo | ¿Se entrena al modelo corriendo? | **NO (closed-weight). SÍ: episodios+inyección estándar (B) y juez local (A) cuando haya dataset** |

Mapa completo con fechas: `landscape.md`.

## Estructura

- `lines/` — un documento de decisión por línea: problema, estado del SOTA con citas, diseño concreto para este repo, riesgos, veredicto, siguiente paso.
- `papers/` — índice numerado de papers con arXiv-ID y **estado de verificación** (verificado hoy en arXiv API / no re-verificado). No se descargan PDFs: se citan para lectura posterior.
- `sources/` — fuentes no-estándar: documentación de vendor (URLs y código HTTP del día), material de Agnes local ya medido (`/tmp/pi-account-router-research/`), literatura de sistemas (tail latency), **karpathy GitHub (S9)** y **memoria de labs (S10)**; todo verificado el 2026-10-10 salvo marcas `N`.
- `analysis/` — **meta-auditoría** (`meta-audit-sota.md`): por elemento y global, campamento por campamento, correcciones aplicadas.

## Reglas epistémicas de este bloque

Cada afirmación lleva uno de: **documentado** (fuente oficial citada), **medido** (nuestra propia prueba con fecha), **hipótesis** (no demostrado). Nada se marca SOTA "absoluto": SOTA *para este sistema* (4 claves Agnes gratis, 10 RPM/clave medido, OpenAI-compatible sin rate-limit headers, dos procesos Pi compartiendo estado).

## Conexión con el resto del repo

- Los veredictos, si el usuario aprueba, se convertirán en cambios OpenSpec individuales y serializados (no se abren aquí).
- `docs/performance.md` es la base de medición actual; `docs/agnes-research.md` es la fuente de Agnes.
- `docs/project-status.md` enlaza este bloque como "Investigación: optimización al SOTA (no implementado)".
