# Papers — índice (verificados en arXiv API el 2026-10-10 salvo marca)

Formato: `P#` = cita usada en `landscape.md` y `lines/`. "V" = verificado hoy vía arXiv API (ID+title); "—" = no re-verificado hoy.

## Routing de LLMs
- **P1** RouteLLM: Learning to Route LLMs with Preference Data — `P1` V, arXiv:2406.18665
- **P2** CARGO: Confidence-Aware Routing of LLMs — `P2` V, arXiv:2509.14899
- **P3** RouterBench: A Benchmark for Multi-LLM Routing System — `P3` V, arXiv:2403.12031
- **P4** Heterogeneous Swarms: Jointly Optimizing Model Roles and Weights for Multi-LLM Systems — `P4` V, arXiv:2502.04510

## Servir inferencias (lado servidor)
- **P5** Efficient Memory Management for LLM Serving with PagedAttention (vLLM) — `P5` V, arXiv:2309.06180
- **P6** SpecInfer: Tree-based Speculative Inference and Verification — `P6` V, arXiv:2305.09781
- **P7** SGLang: Efficient Execution of Structured Language Model Programs (RadixAttention) — `P7` V, arXiv:2312.07104
- **P8** Speculative Decoding (Leviathan et al., "Draft & Verify") — arXiv, **no re-verificado hoy (ID sin confirmar)**

## Generación y mejora de respuesta (sombra)
- **P9** Self-Refine: Iterative Refinement with Self-Feedback — `P9` V, arXiv:2303.17651
- **P10** Reflexion: Language Agents with Verbal Reinforcement Learning — `P10` V, arXiv:2303.11366
- **P11** Self-Consistency Improves Chain of Thought Reasoning — `P11` V, arXiv:2203.11171
- **P12** Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena — `P12` V, arXiv:2306.05685
- **P13** Reinforced Self-Training (ReST) for Language Modeling — `P13` V, arXiv:2308.08998
- **P14** TRAM: Test-Time Risk Adaptation with Mixture of Agents — `P14` V, arXiv:2408.08812
- **P15** Mixture-of-Agents Enhances LLM Capabilities — `P15` V, arXiv:2406.04692
- **P16** Improving Factuality and Reasoning through Multiagent Debate — `P16` V, arXiv:2305.14325
- **P17** Chain-of-Thought Prompting Elicits Reasoning in LMs — `P17` V, arXiv:2201.11903 (contexto: de dónde nace la variación de muestreo de P11)

## Memoria / experiencia reutilizable (añadidos por la meta-auditoría, V hoy)
- **P18** Voyager: An Open-Ended Embodied Agent with LLMs (skill library) — V, arXiv:2305.16291
- **P19** ExpeL: LLM Agents Are Experiential Learners — V, arXiv:2308.10144
- **P20** Self-RAG: Learning to Retrieve, Generate, and Critique — V, arXiv:2310.11511
- **P21** Generative Agents: Interactive Simulacra of Human Behavior (memory stream) — V, arXiv:2304.03442
- **P22** STaR: Bootstrapping Reasoning With Reasoning — V, arXiv:2203.14465
- **P23** Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks — V, arXiv:2005.11401
- **P24** MemGPT: Towards LLMs as Operating Systems (jerarquía de memoria) — V, arXiv:2310.08560
- **P25** Large Language Models Cannot Self-Correct Reasoning Yet (OpenAI) — V, arXiv:2310.01798
- **P26** DeepSeek-R1: Incentivizing Reasoning via RL (RLVR) — V, arXiv:2501.12948
- **P27** When Can LLMs Actually Correct Their Own Mistakes? (survey) — V, arXiv:2406.01297
- **P28** CRITIC: LLMs Can Self-Correct with Tool-Interactive Critique (NAACL 2024) — **N** (no re-verificado hoy; no localizado en arXiv; se cita por venue)

## Productos de memoria de labs (fuente S10, abajo)

## Sistemas / tail latency
- **S3** Hedged Requests for Tail Latency Reduction in Datacenter Services (Kulkarni et al., NSDI 2015) — no re-verificado hoy (url usenix 404 al probar)
- **S3b** Google SRE Book — latency/tail latency — no re-verificado hoy (reestructura; URLs 404 al probar)
- **S8** The Tail at Scale (Dean & Ghemawat, Google Research 2011) — no re-verificado hoy
- **S3c** LAD: Latency-Aware Distribution of Requests (Facebook, NSDI 2020) — **N** (URL usenix no re-verificada hoy; por título+venue)

## S10 — Productos de memoria de labs (nuevo, hoy)
- Claude **memory tool** — V hoy (200), https://docs.claude.com/en/docs/agents-and-tools/tool-use/memory-tool
- OpenAI memory (ChatGPT) — **N**: help.openai.com devuelve **403 a bots hoy** (la página existe; no re-verificada)
