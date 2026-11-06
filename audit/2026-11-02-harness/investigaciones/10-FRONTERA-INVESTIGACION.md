# La frontera: cómo resuelven el handoff/memoria los laboratorios, la academia y la comunidad

**Fecha:** 2026-11-02 · **Método:** búsqueda + fetch verificado de fuentes primarias (arXiv, docs oficiales, blogs con datos). Los 4 subagentes fallaron; todo se rehízo directamente.
**Complementa:** [09-HANDOFF-SOTA.md](09-HANDOFF-SOTA.md) (los mecanismos por ecosistema). Aquí: **quién piensa qué** y qué es adoptable.

---

## 1 · Laboratorios y grandes empresas

| Actor | Qué aporta | Fuente |
|---|---|---|
| **OpenAI** | ChatGPT **Memories** como producto (memorias persistentes referenciadas en chat); **Codex** con memoria de sesión; y en la API, compactación **nativa del proveedor** (checkpoint opaco cifrado — ver opencode en 09) | [learn.chatgpt.com/docs/customization/memories](https://learn.chatgpt.com/docs/customization/memories) |
| **Anthropic** | El sistema más maduro de **memoria entre sesiones**: CLAUDE.md jerárquico + **auto memory** (índice MEMORY.md + ficheros por tema, tipos user/feedback/project/reference, subagentes con memoria propia); y la matriz «what survives compaction» (reinyección desde disco, no desde el resumen) | [code.claude.com/docs/en/memory](https://code.claude.com/docs/en/memory), [context-window](https://code.claude.com/docs/en/context-window) |
| **Google (Cloud/Vertex)** | **Memory Bank**: contexto persistente como servicio gestionado — el "shift" industrial hacia memoria como pieza de infra, no como feature del cliente | [virtualizationreview.com](https://virtualizationreview.com/articles/2025/07/09/googles-vertex-ai-memory-bank-and-the-industry-shift-to-persistent-context) |
| **Microsoft** | Azure AI Foundry como marco de **agentes empresariales** (build/deploy/operate), con memoria como componente gestionado | [vmts.com.hk Foundry 2026](https://vmts.com.hk/en/insights/microsoft-foundry-agent-platform-2026-zh-cn/) |
| **ByteDance (volcengine)** | **OpenViking**: memoria como **sistema de ficheros de contexto** con carga escalonada **L0/L1/L2** (21,8k★) — la apuesta "el contexto es un problema de organización, no de resumen" | [github.com/volcengine/OpenViking](https://github.com/volcengine/OpenViking) |
| **AWS** | Well-Architected **Agentic AI Lens**: handoff multi-agente con escalado humano como buena práctica oficial | [Agentic AI Lens](https://docs.aws.amazon.com/pdfs/wellarchitected/latest/agentic-ai-lens/agentic-ai-lens.pdf) |

*(Meta y NVIDIA no aparecieron con fuentes primarias en este pase; no se les atribuye nada.)*

## 2 · Universidades y academia

| Trabajo | Qué aporta | Fuente |
|---|---|---|
| **Memory in the Age of AI Agents** (v2, ene-2026) | **La taxonomía de referencia**: formas (token-level / paramétrica / latente), funciones (**factual / experiencial / working**), dinámicas (formación, evolución, recuperación), benchmarks y frameworks; frentes abiertos: **automatización de memoria, integración con RL, multimodal, multi-agente, confiabilidad**. Conclusión clave: «long/short-term» ya no captura el campo | [arXiv 2512.13564](https://arxiv.org/abs/2512.13564) |
| **MemGPT** (Berkeley) | El LLM como SO con memoria paginada: jerarquía main/external context, interrupciones auto-generadas para mover datos — el ancestro conceptual de los "memory blocks" | [arXiv 2310.08560](https://ar5iv.labs.arxiv.org/html/2310.08560v4) |
| **Generative Agents** (Stanford) | Memory stream + **reflexión** (destilar a insights de alto nivel) + recuperación por recencia/importancia/relevancia — el molde de la memoria experiencial | [ACM UIST 2023](https://dl.acm.org/doi/10.1145/3586183.3606763) |
| **LLMLingua / LLMLingua-2** (Microsoft) | Compresión de prompts a nivel de token, con budget control — la referencia de compresión *no generativa* | [LLMLingua](https://aaltodoc.aalto.fi/server/api/core/bitstreams/1fb669b7-6587-4162-8a4d-e71389f47fd9/content) |
| **Context Length Extension survey** | Marco de técnicas de compresión de contexto (incl. prompt compression como eje) | [arXiv 2401.07872](https://ar5iv.labs.arxiv.org/html/2401.07872) |
| **Keeping the Cache Warm Pays** | Economía del keepalive de caché para agentes: el argumento cuantitativo de la compactación anticipada | [arXiv 2607.19214](https://ar5iv.labs.arxiv.org/html/2607.19214) |
| **Independent Convergence** | Investigación solo y arquitectura de producción convergiendo en las mismas soluciones de "entropía de contexto" | [zenodo](https://zenodo.org/records/19377909/files/independent_convergence.pdf) |

## 3 · Startups y frameworks

| Actor | Apuesta | Fuente |
|---|---|---|
| **Letta (MemGPT)** | **Memory blocks** (tipados, dirigibles) + **sleep-time compute**: consolidar memoria fuera del turno, sin latencia para el usuario | [memory blocks](https://github.com/rohitg00/ai-engineering-from-scratch/blob/41ca13515fa8cdfb225150961330fd43e8fea0bc/phases/14-agent-engineering/08-memory-blocks-sleep-time-compute/docs/en.md) |
| **LangChain/LangGraph** | **Checkpointers**: persistencia del estado del grafo (threads) como primitiva; la memoria es "retomar el grafo", no "recordar hechos" | [docs.langchain.com persistence](https://docs.langchain.com/oss/python/langgraph/persistence) |
| **mem0 / Zep / Graphiti / Cognee** | Capa de memoria como API: extracción estructurada, grafo temporal, retrieval | búsqueda verificada (comparativas en [OpenLtm](https://github.com/RohiRIK/OpenLtm/blob/main/docs/12-comparison.md)) |

## 4 · GitHub: la carrera de memoria de 2026

[OSSInsight, "The Agent Memory Race of 2026: 5 Repos, 4 Architectures, 1 Unsolved Problem"](https://github.com/pingcap/ossinsight/blob/d98a10e7244cfc9e2d1da02bace1c2a9fe9d7738/apps/docs/content/blog/agent-memory-race-2026/index.mdx) (datos verificados vía GitHub API, 2026-04-13):

| Repo | ★ | Arquitectura | Apuesta |
|---|---|---|---|
| **MemPalace** | 43,5k | Verbatim en ChromaDB (palace/wings/halls/rooms) | «No resumas: guárdalo todo y que la búsqueda semántica lo encuentre.» 96,6 % LongMemEval en modo raw; su compresión AAAK fue corregida públicamente a las 48 h (lossy, −12,4 pts) |
| **OpenViking** (ByteDance) | 21,9k | Contexto como **filesystem** con carga L0/L1/L2 | «¿Cuánto contexto cargar en cada momento?» — el anti-resumen |
| **code-review-graph** | 7,3k | **Grafo de conocimiento del codebase** (tree-sitter + GraphRAG) | Memoria vertical para código: 6,8× menos tokens en reviews |
| **SimpleMem** | 3,2k | Memoria lifelong multimodal | — |
| **engram** | 2,4k | **Un binario Go + SQLite + FTS5** vía MCP | «Lo que la gente instala de verdad» (`brew install`, un fichero). *Nota: es el `gentle-engram` que ya tienes montado en pi.* |

**El desacuerdo de fondo** (lo importante): difieren en **qué guardar** (verbatim vs extracción vs grafo), **dónde** (vectorial vs filesystem vs SQLite), **quién decide qué importa** (la query, el agente, nadie), y **coste de instalación**. **Ninguna apuesta subsume a las demás.** Y el problema sin resolver que el artículo nombra: *«¿esto hace que mi agente trabaje mejor durante meses?»* — valor longitudinal, no un benchmark de 500 preguntas.

## 5 · Conceptos de frontera adoptables en DSH (y los que no)

| Concepto | Origen | ¿Adoptable en DSH? |
|---|---|---|
| **Working vs experiencial vs factual** (taxonomía de funciones) | arXiv 2512.13564 | **Sí, como vocabulario de diseño**: en DSH, working = ventana + checkpoint de compactación; experiencial = project-memory/notas; factual = AGENTS.md + skills. Ya está, falta nombrarlo |
| **Sleep-time compute / consolidación fuera del turno** | Letta; opencode (background compaction) | **Sí (candidato #3 ya señalado)**: consolidar el checkpoint antes del umbral; medir con `token-meter` antes (arXiv 2607.19214 da el argumento) |
| **Carga escalonada L0/L1/L2** | OpenViking | **Ya existe en DSH**: los skills cargan metadata (descripción) siempre y cuerpo solo al invocar — gradual disclosure. No adoptar nada |
| **Verbatim + retrieval, sin resumen** | MemPalace | **Ya existe la mitad**: el session log es verbatim y replays; `tool-session-query` busca con FTS. La otra mitad (vectorial) no es necesaria para handoff |
| **Grafo de código como memoria** | code-review-graph | **No en el core**: es un MCP externo si se quiere |
| **Memoria como binario único + MCP** | engram | DSH no necesita otro motor: `session-query-sqlite` ya es eso |
| **Auto memory (índice + ficheros por tema)** | Claude Code | **No duplicar**: DSH tiene AGENTS.md + project-memory; el patrón de "índice con límite de carga" sí es buena idea para el plugin project-memory |
| **Confiabilidad de la memoria (inyección, procedencia)** | arXiv 2512.13564 (frontera) | **DSH va por delante**: `session-reference` con untrusted fencing + query autorizado por `cwd`. Mantenerlo y exportarlo |
| **Compactación nativa del proveedor** | OpenAI | **No**: rompe *model-visible ⟺ logged* y el replay |

## 6 · Veredicto actualizado (reemplaza al §3 de 09-HANDOFF-SOTA.md)

1. **La frontera confirma el veredicto anterior y lo precisa**: el SOTA real de handoff es la intersección de (a) resumen estructurado con caché y replay (DSH/Claude/openocde), (b) handoff explícito estilo Amp con consulta a la sesión padre, y (c) **consolidación fuera del turno** (Letta sleep-time / opencode background / keepalive de caché). DSH tiene (a) completo, (b) a medias (falta el comando), y (c) no lo tiene.
2. **La gran pregunta abierta del campo —«¿la memoria mejora al agente durante meses?»— es exactamente el hueco que el dossier QWEN ya identificó** (harness A1 de nDCG/recall@k: «sin mapa, cualquier propuesta es opinión»). Los 80k★ de la carrera no resuelven evaluación longitudinal; quien la haga, manda.
3. **Dos diferenciadores de DSH que nadie de la lista tiene**: replay determinista desde el log (MemPalace guarda verbatim pero no puede *reproducir* una sesión) y el fencing de contexto no confiable en referencias cruzadas. Son la respuesta de DSH a la frontera "trustworthiness" del survey.

## 7 · Fuentes

Todas en las tablas anteriores; principales: [arXiv 2512.13564](https://arxiv.org/abs/2512.13564) · [MemGPT 2310.08560](https://ar5iv.labs.arxiv.org/html/2310.08560v4) · [Generative Agents](https://dl.acm.org/doi/10.1145/3586183.3606763) · [Agent Memory Race 2026](https://github.com/pingcap/ossinsight/blob/d98a10e7244cfc9e2d1da02bace1c2a9fe9d7738/apps/docs/content/blog/agent-memory-race-2026/index.mdx) · [Claude Code memory](https://code.claude.com/docs/en/memory) · [opencode compaction](https://opencode.ai/v2/docs/compaction/) · [pi-amplike](https://www.npmjs.com/package/pi-amplike) · [2607.19214](https://ar5iv.labs.arxiv.org/html/2607.19214)
