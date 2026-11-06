# S9 — karpathy: repos de GitHub (verificados vía API GitHub el 2026-10-10)

`GET /repos?sort=pushed` sobre `users/karpathy/repos`. Solo los que importan para L5:

| Repo | push | stars | Descripción (API) | Relevancia para L5 |
|---|---|---|---|---|
| `nanochat` | 2026-09-07 | 58.5k | "The best ChatGPT that $100 can buy." | **El pipeline de entrenamiento mínimo completo (data→pretrain→SFT→RL) en 1 GPU: la herramienta del nivel A.** |
| `autoresearch` | 2026-03-26 | 97.6k | "AI agents running research on single-GPU nanochat training automatically" | Precedente: **agentes que auto-optimizan el loop de entrenamiento** sobre nanochat. |
| `llm-council` | 2025-11-22 | 25.3k | "LLM Council works together to answer your hardest questions" | Patrón **consejo/deliberación multi-modelo + chairman**: variante de tu dual-modelo (sombra como miembro, no rival). |
| `micrograd` | 2026-08-03 | 17.8k | motor autograd escalar minímino | Herramienta didáctica del nivel A (gradiente a mano). |
| `nanoGPT` / `minGPT` | 2025-11-12 / 2024-08-15 | 63.7k / 24.9k | GPT simple/rápido / re-impl. minimal de OpenAI GPT | Alternativa de stack de entrenamiento local. |
| `llm.c` | 2025-06-26 | 31.1k | "LLM training in simple, raw C/CUDA" | Stack de pesos mínimo si el nivel A va a C. |
| `nn-zero-to-hero` | 2024-08-18 | 24.7k | curso Zero-to-Hero | Contexto/estudio. |
| `rustbpe` | 2026-01-03 | 0.5k | "The missing tiktoken training code" | Tokenizer si hay que entrenar BPE propio (nada que ver con tu caso). |
| `reader3` | 2025-11-18 | 3.9k | leer libros con LLM | No relevante. |

## Hook de inyección estándar de Pi (verificado local el 2026-10-10)
De `docs/extensions.md` del Pi instalado (`/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md`, Pi 1.1.0):

> "`before_agent_start` expone el prompt actual y sus `systemPromptOptions` estructurados. Se prefiere cambiar secciones del prompt, herramientas o guías; devolver `systemPrompt` (o `forceSystemPrompt`) **sustituye el prompt completo para ese run** mientras el transcriptor sigue registrando las secciones estructuradas. El proveedor recibe el texto forzado como su system prompt inicial."

→ **Es el mecanismo estándar para reusar lo aprendido (nivel B): inyectar top-K de episodios al prompt sin parchear Pi.** Documentado, no hipótesis.

## Lo que SOTA y karpathy mismo enfatizan (fuente: títulos/descripciones de la tabla + S3/S4)
- **RLVR**: la señal de verificación (no el juicio de otro LLM) es el camino correcto → tu `npm run verify` **ya es el verificador**. Los datos etiquetados son el activo.
- El entrenamiento del **nivel A** va a un **modelo local pequeño** (nuevas: llm.c / nanochat / nanoGPT), nunca a Agnes (closed-weight, S1).
