# S3 / S8 — Sistemas: latencia de cola y hedging

- **S3** Hedged Requests for Tail Latency Reduction in Datacenter Services — Kulkarni et al., **NSDI 2015**. (URL usenix.org **no re-verificada hoy**: 404 al probar; ver por título+conferencia.)
  - Idea: para la petición más lenta de un lote, **duplicar** en el siguiente recurso y descartar el perdedor **antes de exponer** el resultado. Reducción documentada de cola-latencia a cambio de +1 request por hedge.
  - Aplicación aquí: el **hedge pre-output de L1** (opt-in, gasto de 2 slots de RPM; ToS §5.4 S1).
- **S3b** Google SRE Book, cap. latencia/tail-latency (sre.google; **reestructurado, URLs 404 al probar hoy** → verificar por título).
  - Aplicación: latency-aware LB (EWMA) = la parte 1 de **L1**.
- **S8** The Tail at Scale — Dean & Ghemawat, Google Research 2011 (no re-verificado hoy).
  - Diferencia de órdenes de magnitud entre media y cola: justifica mirar la **cola** (outlier 4.6 s de L1), no la mediana.

