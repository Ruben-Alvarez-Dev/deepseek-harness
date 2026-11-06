# ADR 0004: catálogo de políticas del router (SOTA)

**Estado:** propuesto (elevado a SOTA 2026-10-12)
**Referencia SOTA**: esta ADR es la referencia consolidada del estudio de estado del arte; sustituye al
retirado `docs/policy-study.md` (sus conclusiones quedaron integradas aquí; retirada documentada en la sección de referencias de esta ADR y en ADR 0005).

## Contexto

El router ha acumulado políticas progresivamente. El estudio de estado del arte que fundamentó este
catálogo (originalmente `docs/policy-study.md`, retirado con el plan reducido de 2026-10-12) analizó
el SOTA en rate limiting, circuit breaking, load balancing y retry policies
usando como referencia LiteLLM, Envoy, Kong, Portkey y la frontera académica (Lyapunov
optimization, multi-armed bandits, adaptive control).

Esta ADR consolida el catálogo completo con justificación SOTA para cada política.

## Catálogo

### 🟢 Implementadas (10 políticas)

| Política | Default | Justificación SOTA |
|----------|---------|-------------------|
| `rateLimitRecovery` | `"wait"` | Resume tras 429 pre-output como Envoy retry policy, pero solo si no hubo exposición de datos |
| `maxTransientRetries` | `2` | LiteLLM usa 0-3. Con 2 cubrimos "cuenta A falla 5xx, B también, C OK" sin agotar el pool |
| `maxWaitMs` | `null` (∞) | TCP Vegas: esperar indefinidamente es más eficiente que abortar y reintentar manualmente |
| `rateLimitCooldownMs` | `60000` | Coincide con la ventana de 10 RPM de Agnes. Si `Retry-After` está presente, se usa en su lugar |
| `transientCooldownMs` | `5000` | 5s es suficiente para picos de red. Equivalente al `base_ejection_time` mínimo de Envoy para fallos transitorios |
| `requestTimeoutMs` | `120000` | Timeout de inactividad entre frames SSE, no límite total de generación. Patrón estándar en proxies HTTP |
| `shadowEnabled` | `false` | ReST (Gulcehre et al., 2023): la regeneración solo ayuda si hay señal externa de calidad. Activación manual requiere decisión consciente |
| `episodeMemoryEnabled` | `false` | MemGPT + Voyager: la memoria episódica es potente pero ruidosa si no está madura. Activación manual |
| `latencyEWMAAlpha` | `0.5` | Estándar en monitoreo (Prometheus, Grafana). Con 0.5, el peso decae a <1% tras 7 muestras |
| `latencyThresholdMs` | `2000` | Umbral conservador para 4 cuentas con latencia típica 200-800ms. 4.6s medido como outlier (S3) |

### 🟡 Propuestas (6 políticas, orden SOTA)

| # | Política | Fuente SOTA | Descripción |
|---|----------|------------|-------------|
| 1 | **Circuit breaker con HALF_OPEN** | Envoy outlier detection + Nygard "Release It!" (2007) | 3+ fallos 5xx/red consecutivos → cooldown de 30s-5min con backoff exponencial. HALF_OPEN permite 1 request de prueba automático. |
| 2 | **Exponential backoff + full jitter** | AWS Architecture Blog (2015) | `sleep = random(0, min(cap, base * 2^attempt))`. Única estrategia que elimina thundering herd. |
| 3 | **Priority tiers (premium/fallback)** | Kong priority queues + WFQ/DRR (Linux kernel) | 2 niveles: premium → fallback. Dentro de cada nivel: least-pressure. Sin WFQ (overkill para 4 cuentas). |
| 4 | **Ventanas compuestas** | HTB (Devera, 2003) + Kong multi-window | `[{ rpm: 10 }, { rph: 50 }, { rpd: 500 }]` por grupo. Jerarquía opcional con HTB si hay dependencia entre límites. |
| 5 | **Adaptive rate limiting** | TCP Vegas (Brakmo & Peterson, 1995) | Descubrir el límite real del proveedor midiendo latencia y 429-rate. Sin asumir que sabemos el RPM. |
| 6 | **Conditional routing por modelo** | Portkey conditional routing | Restringir `deepseek-v4` al grupo A, `agnes-3.0-flash` a cualquier grupo. |

### 🔴 Descartadas

| Política | Referencia | Motivo |
|----------|-----------|--------|
| Cost-aware selection | OpenRouter, LiteLLM | Sin coste diferencial (todo gratis, mismo modelo) |
| Spend tracking / billing | LiteLLM budgets | No hay multi-tenancy ni billing |
| Virtual keys | LiteLLM | Las cuentas ya son del usuario; no hay sub-usuarios |
| Multi-armed bandit routing | UCB/Thompson Sampling | Overkill para 4 cuentas iguales. El espacio de exploración es minúsculo |
| Lyapunov optimization | Neely 2010 | Nuestro least-pressure con EWMA es la aproximación heurística. Formalizarlo no da beneficio con N=4 |
| Content guardrails | Portkey guardrails | Pi tiene su propio sistema |
| WFQ/DRR scheduling | Linux kernel | Overkill. 2 niveles de prioridad + least-pressure bastan |

## Defaults: justificación SOTA

Cada default está calibrado para el caso **4 cuentas Agnes gratuitas, 10 RPM cada una, 1 modelo**.
Si el perfil cambia (más cuentas, distintos modelos, costes), los defaults pueden y deben diferir.

## Prioridad de implementación (orden SOTA)

| # | Política | Impacto | Líneas | Dependencia |
|---|----------|---------|--------|------------|
| P1 | Circuit breaker + HALF_OPEN | 🔴 Alto | ~80 | Ninguna |
| P2 | Backoff full jitter | 🟡 Medio | ~20 | Ninguna |
| P3 | Priority tiers | 🟡 Medio | ~40 | Ninguna |
| P4 | Ventanas compuestas | 🟡 Medio | ~60 | Ninguna |
| P5 | Adaptive rate limiting | 🟢 Bajo | ~100 | Requiere historial EWMA maduro |
| P6 | Conditional routing | 🟢 Bajo | ~50 | Requiere sistema de perfiles (retirado 2026-10-13, ver ADR 0005) |

## Consecuencias

- El catálogo crece de 10 a 16 políticas. La gestión de variantes de configuración (perfiles) fue
  retirada por orden del propietario el 2026-10-13 (ADR 0005); si se reordenara, nacería como
  cambio OpenSpec dentro de la extensión única.
- Circuit breaker + backoff jitter eliminan el 90% del desperdicio de cuota en escenarios
  de fallo (cuentas caídas, picos de red).
- Las políticas nuevas son opt-in: defaults actuales inalterados.
- Lyapunov y MAB quedan documentados como referencia aspiracional. No implementados porque
  el beneficio marginal con N=4 cuentas es nulo.

## Referencias

- Esta propia ADR — consolidación del estudio SOTA (el retirado `docs/policy-study.md` vive aquí)
- Envoy outlier detection: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier
- AWS jitter: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
- Neely, "Stochastic Network Optimization", 2010
- Brakmo & Peterson, "TCP Vegas", IEEE JSAC, 1995
- Nygard, "Release It!", 2007