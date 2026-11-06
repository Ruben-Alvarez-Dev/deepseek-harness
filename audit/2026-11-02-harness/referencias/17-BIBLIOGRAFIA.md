# Bibliografía del expediente — autores y URLs

**Fecha:** 2026-11-02 · **Norma:** toda fuente citada en los informes 01–16 figura aquí con autor, título y URL; las fuentes locales del usuario se listan sin URL (rutas de máquina).

---

## 1 · Papers y preprints

### Memoria y contexto de agentes

| Autor(es) | Título | URL |
|---|---|---|
| Yuyang Hu, Shichun Liu, Yanwei Yue, et al. (~50 autores) | Memory in the Age of AI Agents (v2, 2026-01-13) | https://arxiv.org/abs/2512.13564 |
| Charles Packer, Sarah Wooders, Kevin Lin, et al. (UC Berkeley) | MemGPT: Towards LLMs as Operating Systems | https://ar5iv.labs.arxiv.org/html/2310.08560v4 |
| Joon Sung Park, Joseph C. O'Brien, Carrie J. Cai, Meredith Ringel Morris, Percy Liang, Michael S. Bernstein (Stanford) | Generative Agents: Interactive Simulacra of Human Behavior (UIST 2023) | https://dl.acm.org/doi/10.1145/3586183.3606763 |
| Huiqiang Jiang et al. (Microsoft) | LLMLingua / LLMLingua-2 — prompt compression | https://aaltodoc.aalto.fi/server/api/core/bitstreams/1fb669b7-6587-4162-8a4d-e71389f47fd9/content |
| (survey, autores no extraídos en la sesión) | The What, Why, and How of Context Length Extension Techniques in Large Language Models | https://ar5iv.labs.arxiv.org/html/2401.07872 |
| (autores no extraídos en la sesión) | Keeping the Cache Warm Pays: Keepalive Economics for Agentic Workloads | https://ar5iv.labs.arxiv.org/html/2607.19214 |
| (autores no extraídos en la sesión) | Independent Convergence: Context Entropy Solutions in Solo Research and Production AI Architecture | https://zenodo.org/records/19377909/files/independent_convergence.pdf |
| (autores no extraídos en la sesión) | Compression can raise answer quality | https://zenodo.org/records/22969435/files/compressed-once-read-many.pdf |

### Seguridad e inyección

| Autor(es) | Título | URL |
|---|---|---|
| Keegan Hines, Gary Lopez, Matthew Hall, Federico Zarfati, Yonatan Zunger, Emre Kiciman (Microsoft) | Defending Against Indirect Prompt Injection Attacks With Spotlighting | https://ar5iv.labs.arxiv.org/html/2403.14720 |
| Brian Lester, Javad Noorbakhsh, Rhys Biddle, et al. (Google DeepMind) | CaMeL: Defeating Prompt Injections by Design | https://ar5iv.labs.arxiv.org/html/2503.18813 |
| OWASP | Top 10 for LLM Applications (2025) | https://owasp.org/www-project-top-10-for-large-language-model-applications/ |

### Generación y decisión

| Autor(es) | Título | URL |
|---|---|---|
| Hermann Kumbong, Ishan S. Khare, Iddah Mlauzi, et al. (HazyResearch, Stanford) | Next-Concept Modeling: Fast, Parallel Coarse-to-Fine Text Generation | https://arxiv.org/abs/2610.14162 |
| (Fudan, NUS, UCAS) | Chinese-Jev (decision model) | https://arxiv.org/html/2609.36965 |

### Estándares y registros

| Autor(es) | Título | URL |
|---|---|---|
| RFC 9162 (B. Laurie, A. Langley, E. Kasper, et al.) | Certificate Transparency Version 2.0 | https://www.rfc-editor.org/rfc/rfc9162 |
| IETF (draft) | The Agent Record: Transparent, Witness-Countersigned Event Logs for AI Agent Identity, History, and Memory | https://www.ietf.org/archive/id/draft-maintainer-1f916-agent-record-00.xml |
| AWS | Well-Architected Agentic AI Lens | https://docs.aws.amazon.com/pdfs/wellarchitected/latest/agentic-ai-lens/agentic-ai-lens.pdf |

---

## 2 · Documentación oficial de productos

| Producto | Página | URL |
|---|---|---|
| DeepSeek Harness (local) | architecture.md · capability-seams.md · agent-lifecycle.md · session-format-status.md | `/Users/ruben/Code/deepseek-harness/docs/` |
| DeepSeek Harness (local) | packages: compaction, compaction-basic (summarizer.ts), tool-result-pruner, token-meter, session-query, session-reference, subagent-fork-in-process, jobs, schedule, skills, mcp-client | `/Users/ruben/Code/deepseek-harness/packages/` |
| Claude Code (Anthropic) | Explore the context window (what survives compaction) | https://code.claude.com/docs/en/context-window |
| Claude Code (Anthropic) | Memory: CLAUDE.md hierarchy + auto memory | https://code.claude.com/docs/en/memory |
| opencode | Compaction (V2) | https://opencode.ai/v2/docs/compaction/ |
| Cursor | Rules | https://cursor.com/docs/rules |
| ChatGPT (OpenAI) | Memories | https://learn.chatgpt.com/docs/customization/memories |
| pi (earendil-works, instalación local) | examples/extensions: handoff.ts, custom-compaction.ts; pi-memory@0.4.2 | `/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/` |
| Jev / TypeSafe AI | Models, aliases, pricing, rate limits, context | https://jevwiki.ai/wiki/reference/models-and-pricing.md |
| TypeSafe AI | Open replicas: the Laya family | https://jevwiki.ai/raw/wiki/ideas/open-replicas-laya.md |
| LangChain | LangGraph persistence (checkpointers) | https://docs.langchain.com/oss/python/langgraph/persistence |

---

## 3 · Repositorios y proyectos

### Memoria de agentes (carrera 2026)

| Repo (autor) | Nota | URL |
|---|---|---|
| MemPalace/mempalace | verbatim storage, 43k★ | https://github.com/MemPalace/mempalace |
| volcengine/OpenViking (ByteDance) | contexto como filesystem L0/L1/L2 | https://github.com/volcengine/OpenViking |
| tirth8205/code-review-graph | grafo de conocimiento del codebase | https://github.com/tirth8205/code-review-graph |
| aiming-lab/SimpleMem | memoria lifelong multimodal | https://github.com/aiming-lab/SimpleMem |
| Gentleman-Programming/engram | un binario Go + SQLite + FTS5 vía MCP | https://github.com/Gentleman-Programming/engram |
| letta-ai/letta | memory blocks + sleep-time compute | https://github.com/letta-ai/letta |

### Handoff

| Repo (autor) | Nota | URL |
|---|---|---|
| joshuadavidthomas/opencode-handoff | /handoff + working-set + read_session | https://github.com/joshuadavidthomas/opencode-handoff |
| pasky/pi-amplike | port de Amp para pi | https://www.npmjs.com/package/pi-amplike |
| Hamel Husain | Amp — el origen del patrón | https://hamel.dev/notes/coding-agents/amp.html |
| Amp | Handoff | https://ampcode.com/news/handoff |
| njs14/pkstack | skill handoff de comunidad | https://raw.githubusercontent.com/njs14/pkstack/7e44dd88a3538500b47d50bfd183548a6e74af99/powers/pkstack/skills/handoff/SKILL.md |
| agent-orchestrator-kit | template session-handoff | https://cdn.jsdelivr.net/npm/agent-orchestrator-kit@0.16.0/templates/.agents/subagents/session-handoff.md |

### Réplicas de Jev (decision models locales)

| Repo (autor) | Nota | URL |
|---|---|---|
| NandhaKishorM/laya | réplica abierta, 18,6k★ | https://github.com/NandhaKishorM/laya |
| NandhaKishorM/vegaml | Vega: probabilidad calibrada + abstain | https://github.com/NandhaKishorM/vegaml |
| bladedevoff/stuntd | proxy local /v1/systemone + cabecera entrenada | https://github.com/bladedevoff/stuntd |
| jlt-commons/lev | encoder local → escala a Qwen3.5-4B | https://github.com/jlt-commons/lev |
| 0xBakeer/arbiter | serving layer + MCP + hook | https://github.com/0xBakeer/arbiter |
| ottosulin/safe-laya | detector de inyección 0,4B | https://huggingface.co/ottosulin/safe-laya |
| tomerglick57/jevstiller | recorte de coste de la API de Jev | https://github.com/tomerglick57/jevstiller |
| HazyResearch/ncm | Next-Concept Modeling | https://github.com/HazyResearch/ncm |

### Plugins y skills de DSH (mercado, verificados en este expediente)

| Paquete (autor) | Nota | URL |
|---|---|---|
| Zhenyu98/dsh-context-doctor | auditoría de tokens de AGENTS.md/skills/schemas | https://github.com/Zhenyu98/dsh-context-doctor |
| @bushizhanghan/dsh-compaction-audit | qué perdió la compactación | https://github.com/bushizhanghan/dsh-compaction-audit |
| dsh-insight (863683348) | índice de plugins del mercado | https://awesome-dsh-plugin.com/p/863683348/dsh-insight/ |
| Catálogo oficial del mercado | dsh-plugin-catalog | https://cdn.jsdelivr.net/npm/dsh-plugin-catalog/index.json |
| @creait/dsh-research-mode | deep research como modo | https://github.com/CREAIT-nl/dsh-plugins |
| PerryLink/dsh-research-report | informes verificables con ledger de evidencia | https://github.com/PerryLink/dsh-research-report |
| kiterunner1/dsh-plugin-audit | auditoría estática previa a instalación | https://github.com/kiterunner1/dsh-plugin-audit |
| PerryLink/dsh-skill-pack-security | 8 skills bilingües + plugin_vet | https://github.com/PerryLink/dsh-skill-pack-security |

### Análisis y benchmarks

| Repo (autor) | Nota | URL |
|---|---|---|
| pingcap/ossinsight | The Agent Memory Race of 2026: 5 Repos, 4 Architectures | https://github.com/pingcap/ossinsight/blob/d98a10e7244cfc9e2d1da02bace1c2a9fe9d7738/apps/docs/content/blog/agent-memory-race-2026/index.mdx |
| bobmatnyc/claude-mpm-skills | AI Session Compression Techniques 2025-11-30 | https://github.com/bobmatnyc/claude-mpm-skills/blob/718070a7d622921b01687799a1f9613f36c6f615/docs/research/ai-session-compression-techniques-2025-11-30.md |
| anomalyco/opencode | opencode | https://github.com/anomalyco/opencode |
| openai/codex | discusión: qué se carga al iniciar sesión | https://github.com/openai/codex/discussions/12668 |
| RohiRIK/OpenLtm | comparativa de sistemas de memoria | https://github.com/RohiRIK/OpenLtm/blob/main/docs/12-comparison.md |

---

## 4 · Artículos y posts

| Autor/Medio | Título | URL |
|---|---|---|
| Lupa.cz | Češi odstraňují limity současné AI (NCM Memory Plugin) | https://www.lupa.cz/aktuality/cesi-odstranuji-limity-soucasne-ai-vytvorili-dlouhodobou-pamet-pro-chatgpt-claude-a-dalsi/ |
| Virtualization Review | Google's Vertex AI 'Memory Bank' and the Industry Shift to Persistent Context | https://virtualizationreview.com/articles/2025/07/09/googles-vertex-ai-memory-bank-and-the-industry-shift-to-persistent-context |
| VM Tech Solutions | Microsoft Foundry agent platform 2026 | https://vmts.com.hk/en/insights/microsoft-foundry-agent-platform-2026-zh-cn/ |
| futureagi | Prompt Caching in 2026: How It Works, Pricing, Wins | https://futureagi.com/blog/understanding-prompt-caching-for-faster-ai-responses/ |
| mem0.ai | Codex CLI Memory: How It Works | https://mem0.ai/library/coding-agents/how-memory-works-in-codex-cli |
| techarm.dev | Laya vs Jev on games and Japanese support messages | https://techarm.dev/posts/laya-vs-jev-prompt-design |
| johnmark.dev | Fine-tuned Laya vs Jev on toxic comments | https://johnmark.dev/blog/laya-vs-jev-toxicity-fine-tune |
| jevwiki (theconsigliere.ai) | wiki mantenido por agentes sobre TypeSafe/Jev | https://jevwiki.ai/ |
| Simon Willison | prompt-engineering (tag) | https://simonwillison.net/tags/prompt-engineering/ |

---

## 5 · Fuentes locales (propiedad del usuario, sin URL)

| Artefacto | Ruta |
|---|---|
| Dossier de anillos (QWEN-code-32, 2026-10-25) | `~/Code/QWEN-code/auditoria-pi-agent/` (17 ficheros, no versionado) |
| Repo PI-agent (HEAD `850ac20`) | `~/Code/PI-agent/` |
| Arquitectura del ecosistema (2026-10-18) | `~/Code/PI-agent/src/pi-account-router/docs/audit-2026-10-18/arquitectura-ecosistema/` |
| Expediente de obra | `~/Code/PI-agent/docs/docs-expe/00-EXPEDIENTE-DE-OBRA.md` |
| Jart-CORTEX v5.1.0 | `~/Code/Jart-CORTEX/` |
| Lanzador y config de cortex | `~/jart-os-development/bin/jart-cortex`, `config/cortex.env` |
| Proyecto JEV-AI | `~/Code/JEV-AI/` (jev-research, judgment-router, análisis) |
| Plan pi-arnes (O3) | `~/Code/pi-arnes-documental-privado/` |
| Sesiones de Pi | `~/.pi/agent/sessions/` |
| Transcripciones de Claude Code | `~/.claude/projects/` |
| Prompt `/auditoria-dev` (origen de la skill) | `~/.pi/agent/prompts/auditoria-dev.md` |

---

## 6 · Norma de cita

Cada informe del expediente cita con `fichero:línea` (fuentes locales) o URL (fuentes externas). Lo no verificado por ejecución está marcado `sin-verificar`. Las cifras de terceros (estrellas, benchmarks) se citan tal como las publica su fuente, con su fecha de captura cuando la fuente la documenta.
