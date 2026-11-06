# Estrategia NCM + Jev: qué aportan y con qué sustituirlos gratis en local

**Fecha:** 2026-11-02 · **Método:** fetch verificado de fuentes primarias (Lupa.cz, jevwiki.ai con capturas fechadas, repos del ecosistema Laya, repo local `~/Code/JEV-AI`).
**Objeto:** NCM (OpenTechLab) y Jev (TypeSafe AI) frente a sus equivalentes libres y locales, y su encaje en el plan maestro (informe 15).

---

## 1 · Qué es cada cosa (verificado)

### NCM — Next-Concept Modeling (HazyResearch / Stanford)

**Corregido tras búsqueda en GitHub**: NCM no es el plugin de memoria. Es **Next-Concept Modeling** ([HazyResearch/ncm](https://github.com/HazyResearch/ncm), 1.404★, MIT, arXiv [2610.14162](https://arxiv.org/abs/2610.14162), blog [hazyresearch.stanford.edu](https://hazyresearch.stanford.edu/blog/2026-10-12-ncm)): un framework de **generación de texto en paralelo** en dos etapas — un tokenizer VQ residual multiescala representa la secuencia como jerarquía de códigos discretos y un transformer la predice **de grueso a fino**, con todas las posiciones de un nivel en paralelo → **una pasada forward por nivel**. Bate o iguala a las líneas base de difusión generando **9–31× más rápido**.

**Qué NO es**: no es memoria, ni contexto, ni un modelo conversacional. Es una apuesta de **arquitectura de inferencia** (la línea diffusion/parallel-decoding). Los checkpoints publicados son de investigación (TinyStories, LM1B, XSum, WMT14, Sudoku): **no hay modelos de chat con calidad de agente**, y pide CUDA.

**Uso estratégico real para tu stack**: es el tercer eje de la economía de tokens — después de (1) meter menos tokens en el prompt (el plan maestro) y (2) cachear el prefijo (CacheAligner), viene (3) **generar más barato por token** (decodificación paralela). Hoy: **solo vigilancia** (radar, no adopción). Ningún harness de producción puede correr sobre NCM todavía; su valor es la señal de hacia dónde va el coste de inferencia y qué significaría para DSH cuando madure (menos pasadas forward = menos latencia/coste por turno, sin tocar la arquitectura del harness). Si lo que buscabas era *memoria*, el nombre correcto de ese producto es el plugin NCM Memory de OpenTechLab (descartado en la versión anterior de este informe por tener sustituto local en cortex). Confírmame cuál de los dos querías y ajusto.

## 2 · El ecosistema de réplicas libres locales (verificado con números)

| Opción | Qué es | Datos medidos (del ecosistema) |
|---|---|---|
| **Laya** (`pip install laya`, 18,6k★, Apache-2.0) | Réplica abierta: 3 encoders + router, `laya-serve`; 32,8 ms/pregunta en T4 | Fuerte en pocas opciones (AG News 91,0); **colapsa con listas largas**: Banking77 0,425 vs Jev 0,870; muy sensible al orden; calibración colapsa bajo presión |
| **Vega** (`pip install vegaml`, Apache-2.0) | Motor tipado de 14,3M parámetros (~55 MB) sobre Qwen3.5-0.8B congelado: probabilidad calibrada + **abstain** + conformal | Gana a Jev en phishing (75,4 vs 61,9), fechas/cantidades (46,7 vs 20,0), spam (1,000); 267 ms en T4 |
| **stuntd** | Proxy local que habla `/v1/systemone`: cabecera entrenada sobre el encoder Laya; bajo umbral → escala al proveedor | Banking77 38,2 zero-shot → sube entrenando con tráfico propio (30→72,5 en su demo); p50 22 ms CUDA / 60 ms CPU |
| **lev** | Encoder Laya primero; bajo un gate escala a Qwen3.5-4B | 92,4 % a 270 ms/caso con gate 0,5 (vs 61–67 % del encoder solo) |
| **safe-laya** | 0,4B fine-tune que etiqueta `BENIGN/PROMPT_INJECTION/JAILBREAK/HARMFUL` | recall de ataques 0,749 vs Jev 0,893; FP en benigno alto (0,66 vs 0,98) |
| **`system-one-adapter`** | Drop-in de TypeSafeClient respaldado por un LLM normal (para tu Ollama/Qwen) | utilidad: misma API, sin calibración |
| **Chinese-Jev** (arXiv 2609.36965) | 322M desde Laya multilingual, ~10M decisiones chinas; +1,24 % sobre Jev, 20,3× más rápido | releases no publicadas aún |

**Lectura honesta de los números:** en tareas estrechas y de pocas opciones, lo local **gana o empata** (y es gratis y 10–20× más rápido). En listas largas, re-ranking, multi-paso y multilingüe, **Jev sigue por delante con diferencia** (0,870 vs 0,425). La calibración es el foso: las réplicas la imitan, no la tienen.

## 3 · Uso estratégico en tu stack (encaje en el plan maestro)

**Para memoria (papel de NCM):**
- **No adoptar NCM.** Su motor es inferior a cortex (ya montado) y su única ventaja es la captura web.
- **Adoptar**: puente de captura navegador → backend de memoria (50 líneas). Dependía de CH-001 (auth del sidecar de cortex), **migrado fuera de este plan el 2026-11-05**: ver `~/Code/Jart-CORTEX/audit/2026-11-02-cortex/`. El backend de DSH está por decidir.

**Para decisión/verificación (papel de Jev) — el "DecisionPort" del anillo de negociación:**
- El anillo de negociación (N2 dispatch gate, gate de admisión de memoria, adversarial/Dementor) es exactamente el nicho de un modelo de decisión.
- **Cascada local-first** (el patrón `lev`/`stuntd`, validado por la comunidad):
  1. **Reglas deterministas** (tu `JudgmentRouter` de JEV-AI, corregido) → gratis, instantáneo, auditable.
  2. **Laya/Vega local** → gratis, ~30 ms, para la mayoría de puertas (pocas opciones, texto corto).
  3. **Escalar a Jev de pago SOLO bajo umbral de confianza** → pagas solo las decisiones difíciles. A $0,042/Mtok input y output gratis, un gate con 100k decisiones/mes de ~1k tokens = **~$4/mes**; solo si el volumen de escalado lo justifica.
- **Donde NO usar Jev ni réplicas**: nada que pueda resolver una regla (las lecciones de "when not to use Jev" del wiki: reglas, embeddings, clasificadores entrenados, LLMs pequeños). Tu N2 con allowlist determinista sigue siendo más barato y más auditable que cualquier modelo.

**Tu JEV-AI local (`~/Code/JEV-AI`):** es el intento correcto en la dirección correcta (motor de research + JudgmentRouter + Engram + Ollama). El plan lo absorbe: su JudgmentRouter (con los bugs de scoring arreglados) = la capa 1 de la cascada; su ResearchEngine = el embrión de la capa de selección FTS+KG. No es un proyecto rival: es una iteración temprana de lo que el plan maestro formaliza.

## 4 · Recomendación final (3 líneas)

1. **NCM → no comprar.** Puente navegador→cortex (`/api/save-conversation`) como CH-015.
2. **Jev → no comprar por defecto.** Cascada local: reglas → Laya/Vega → Jev solo bajo umbral, con presupuesto mensual explícito. Añadirlo al plan como **CH-048** (componente del N2/CH-042).
3. **JEV-AI → absorber**, no mantener: JudgmentRouter a la capa 1, ResearchEngine a la capa de selección, Engram/Ollama como motores locales ya disponibles.

## 5 · Fuentes

- [NCM Memory Plugin — Lupa.cz](https://www.lupa.cz/aktuality/cesi-odstranuji-limity-soucasne-ai-vytvorili-dlouhodobou-pamet-pro-chatgpt-claude-a-dalsi/) · [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/ncm-memory-plugin/)
- [Jev: models, pricing, limits (jevwiki, capturas fechadas)](https://jevwiki.ai/wiki/reference/models-and-pricing.md)
- [Open replicas: la familia Laya (jevwiki)](https://jevwiki.ai/raw/wiki/ideas/open-replicas-laya.md) — [laya](https://github.com/NandhaKishorM/laya) · [vegaml](https://github.com/NandhaKishorM/vegaml) · [stuntd](https://github.com/bladedevoff/stuntd) · [lev](https://github.com/jlt-commons/lev) · [arbiter](https://github.com/0xBakeer/arbiter)
- Local: `~/Code/JEV-AI/ANALISIS-PROBLEMA-SOLUCION.md`, `~/Code/JEV-AI/jev-research/`, `~/Code/JEV-AI/judgment-router/`
