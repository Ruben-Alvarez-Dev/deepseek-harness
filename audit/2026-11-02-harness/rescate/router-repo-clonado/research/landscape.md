# Panorama SOTA — routing, velocidad, calidad y tokens en inferencias LLM (2026-10-10)

Solo entradas con fuente verificada hoy (ver `papers/00-index.md` para IDs y estado). Lo que **ya existe** en el router está marcado ✔.

## 1. Capa de decisión: ¿dónde y con qué señal se decide?

| Técnica | Fuente | Qué aporta aquí |
|---|---|---|
| Router aprendido por preferencias (RouteLLM) | P1 | Requiere dataset de preferencias: **no aplicable** (4 cuentas del mismo modelo y coste idéntico). Justifica el diseño heurístico actual ✔ |
| Router por confianza/calibración (CARGO) | P2 | Gate de confianza → dispara verificación solo cuando el modelo duda: **es el patrón del gate de la sombra** (L3/L4) |
| Optimización conjunta de roles+pesos de un ensamble multi-LLM (Heterogeneous Swarms) | P4 | Es formalmente "2 pares" (roles: generador/verificador). Muestra que los pesos de combinación se optimizan, no se fijan en 50/50 siempre |
| Provider routing de vendor (OpenRouter) | S2 | Práctica industrial: reordenar/fallback por orden, región y **política de datos**; el fallback se reserva a fallos, no al reparto proactivo — coherente con lo nuestro ✔ |
| Estado compartido entre procesos + watchdog | `docs`/medido 2026-10-10 | Nuestro diferencial: el SOTA de "routing de cuentas" existe por proceso; lo nuestro lo sincroniza con lock+rename+fs.watch ✔ |

**Conclusión:** la SOTA de reparto entre cuentas *del mismo proveedor y modelo* no es "elegir mejor modelo" (no hay diferencia), sino **presión de cuota + latencia**. L1 cierra la segunda mitad.

## 2. Capa de velocidad

### 2.1 Densidad de generación (lado servidor, no controlable por el router)
- PagedAttention (vLLM) — P5: memoria paged → batching más denso → más tokens/s.
- SpecInfer / Speculative decoding — P6 (SpecInfer) y "Draft & Verify" (P8, no re-verificado): el draft model verifica bloques en paralelo: **redunda en un modelo que ya es "flash"**; sin control nuestro.
- RadixAttention (SGLang) — P7: caché de prefijos en el nodo de inferencia: TTFT menor cuando el prompt es repetido (nuestro contexto de agente lo es → **beneficio gratuito si Agnes lo sirve con RadixAttention** — hipótesis, no demostrado que el backend de Agnes lo use).

### 2.2 Latencia percibida (lado cliente: nuestro)
- **Hedged requests** (NSDI'15) — S3: si la petición más lenta del lote va por detrás, disparar copia en el siguiente recurso y descartar el perdedor al llegar el primero. Talla: +1 request por hedge; requiere descartar el perdedor (en streaming: solo pre-output).
- **Latency-aware load balancing** (SRE Book, tail latency) — S3b: elegir por latencia observada (EWMA), no solo por carga: **es L1**. A gran escala el SOTA es **LAD** (S3c, Facebook NSDI'20): nuestro EWMA es la aproximación estándar para pocos recursos (4 cuentas).
- EWMA de TTFT por cuenta ya **medido**: outlier `agnes-planetary` 4.629 s vs mediana 0.554 s (`docs/performance.md`, 4 muestras).

**SOTA para este sistema:** EWMA por cuenta + opción opt-in de hedge pre-output (el hedge **duplica** peticiones: decisión del usuario por ToS §5.4, ver S1).

## 3. Capa de calidad (la "sombra")

Jerarquía SOTA de mejorar la calidad **sin doblar siempre el coste**:

1. **Mejorar el paso, no el modelo**: Self-Refine (P9) y Reflexion (P10): el mismo modelo se auto-critica y reescribe; gratis en infraestructura, caro en tokens, ganancia moderada y documentada.
2. **Muestrear y verificar (estocástico)**: Self-Consistency (P11): k muestras + votación → calidad ↑ con k, coste ∝ k.
3. **Generador + verificador (el patrón sombra)**:
   - LLM-as-judge (P12): acuerdo alto con humanos pero **sesgos conocidos** (posición, verbosidad, self-bias) → no usar solo como puerta.
   - **Verificador determinista** (tests, typecheck, exit-code, schema): SOTA donde existe — es lo que el usuario ya tiene (`npm run verify`).
   - **ReST** (P13): rejection sampling con gate de reward: solo se regenera si el verificador falla → **SOTA actual de regeneración selectiva**.
   - **TRAM** (P14): *test-time risk adaptation*: el número de agentes/llamadas se adapta al riesgo estimado de la instancia; **es el SOTA para "cuánta sombra" (0, 1, 2…) según el paso** — el gate de CARGO (P2) es la señal de riesgo práctica (calibración/confianza).
4. **Ensemble deliberativo**: Mixture-of-Agents (P15) y Debate multiagente (P16): ganancia de win-rate documentada **en generación de consulta** (MoA: +9% en AlpacaEval 2.0; debate: factuality), coste k× y latencia k× (si en serie) o ≈1× (si en paralelo, pero siempre k× en tokens). No están diseñados para bucles agénticos con efectos laterales.

### El límite SOTA de la autocorrección (cierra el diseño de L3)
- **P25 (OpenAI, "LLMs Cannot Self-Correct Reasoning Yet") + P27 (survey)**: sin señal externa la autocorrección **no mejora (peor incluso)**; con verificador externo **sí**. **P28 (CRITIC)**: corrección guiada por herramienta. → La puerta de la sombra **tiene que ser el verificador determinista**, nunca un "juez LLM libre".

### La advertencia que SOTA pone a la dualidad de hilos
- Anthropic, sistema multi-agente (S4): "para tareas de trabajo con efectos, la verificación es el multiplicador del ROI; los subagentes funcionan en exploración *lectora*"; coste ~15× tokens vs chat para orquestar; +90.2% = **win-rate vs un agente único Claude Opus 4 en su eval interna de investigación** (verificado en el texto de S4 hoy), no una mejora universal; en ejecución/ejecución-paralela no aplica.
- Anthropic, "building effective agents" (S5): **workflow > agente; complejidad mínima que funcione**; la dualidad permanente es complejidad pura.
- Effects laterales: dos hilos ejecutando acciones distintas a la vez = efectos dobles/impredecibles → SOTA: **ejecución serial única + verificación en paralelo** (los "pares" compiten en *respuesta*, no en *acción*).

## 4. Capa de tokens/coste

- **Prompt caching** (docs S6, S7; backend: P7): prefix estable → tokens de entrada cacheados a coste ~0. En Agnes: el pricing distingue tier de "entrada cacheada" a 0 USD en flash (S1) → **mecanismo probable, no demostrado** en su API.
- **Lo que el router NO puede recortar**: tokens por inferencia (es contexto de Pi: system+tools+historial+compaction).
- **Lo que el router PUEDE recortar**: peticiones desperdiciadas — reintentos 429 (ya: espera+reanudación ✔), reenvíos dobles, compactaciones de más. SOTA: **routing por clase de tarea** a modelo barato: aquí 2.5-flash y 3.0-flash son ambos 0 USD (S1), por lo que el ahorro es **solo en RPM y velocidad**, no en dinero.
- Routing de coste (RouteLLM, P1): inaplicable (no hay diferencia de coste entre cuentas).

## 5. Síntesis: dónde está el SOTA real para ESTE router (2026-10-10)

| Dimensión | SOTA aplicable | Estado |
|---|---|---|
| Reparto | Presión por cuota (mínima) + latencia EWMA + cursor de empate | ✔ presión; **EWMA pendiente (L1)** |
| Cola multi-proceso | Tíquets + waiters + lock+rename+fs.watch | ✔ |
| Velocidad | Hedge pre-output opt-in (decisión ToS §5.4, S1) | **pendiente, decisión del usuario (L1)** |
| Calidad | Shadow selectiva: gate por riesgo (P2/P14) → verificador determinista → 1 regeneración (P13) | **pendiente (L3)** |
| Coste | Minimizar peticiones (ya) + caching de prefijos (no controlable, P7) + clase→modelo (opcional, RPM-only) | ✔ / parcial |
| Arquitectura 2 hilos | Orquestador-workers solo para ramas lectoras; ejecución única serial + verificación en paralelo | **veredicto L4** |

## 6. Capa de aprendizaje y memoria (línea L5)
- **RLVR**: el SOTA de "aprender" es **recolección de datos etiquetados por verificador** (ReST P13; la S4 de Anthropic lo llama "el multiplicador de ROI"). Tu router+sombra es una **máquina de etiquetado**: cada ciclo produce `(input, respuesta, veredicto determinista)`.
- **Niveles de "guardar aprendizaje"** (ver `lines/L5-learn-and-reuse.md`):
  - **A (pesos)**: NO para el modelo corriendo (Agnes closed-weight, S1). SÍ para un **juez local pequeño** (nanochat/llm.c, S9; familia RLVR: P26 → P13) cuando el dataset B exista.
  - **B (contexto)**: episodios JSONL + top-K + **inyección vía el hook estándar `before_agent_start` de Pi (S9: documentado en Pi 1.1.0, sin parches)**. El campamento SOTA de "guardar y reutilizar experiencia" es: **Voyager P18** (skill library), **ExpeL P19** (experiencias→insights sin fine-tuning), **MemGPT P24** (jerarquía de memoria), **Generative Agents P21** (memory stream), **Self-RAG P20 / RAG P23** (retrieval), **STaR P22** (bootstrap con datos propios), más **Claude memory tool S10** (productización del patrón). Es el Reflexion (P10) / MemGPT lineage. **SOTA barato, el de más retorno.**
  - **C (estadística)**: lo de L1 (EWMA) + failureRate[tarea][cuenta] en v3.
- **Karpathy (S9)**: `nanochat` (data→pretrain→SFT→RL en 1 GPU) y `autoresearch` (agentes que auto-optimizan ese loop) son las herramientas del nivel A; `llm-council` es la variante "la sombra es miembro, no rival".

## 7. Meta-auditoría
- ¿Cubre el "verdadero SOTA" por campamento y globalmente? Ver `analysis/meta-audit-sota.md` (veredicto: **sí**, con la matización de SOTA-en-contexto para 4 claves de mismo proveedor/modelo/coste).

