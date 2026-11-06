# S2 — OpenRouter: provider routing (práctica industrial de referencia)

- URL: https://openrouter.ai/docs/features/provider-routing (200, verificado 2026-10-10)
- Qué documenta: orden y fallback de proveedores, filtrado por región y **política de datos** (data policy), y —relevante para S1— que el **fallback se reserva a fallos**, no al reparto proactivo.
- SOTA-relevante: confirma el patrón que usamos aquí (elegir entre recursos iguales por **estado**, no por prueba y error) y añade una dimensión que Agnes no tiene: **política de datos** por proveedor.
- Aprovecha estas líneas: L1 (justificación del diseño heurístico frente a router aprendido).

