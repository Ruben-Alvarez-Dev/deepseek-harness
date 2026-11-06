# Handoff de sesión entre ecosistemas: investigación y veredicto SOTA

**Fecha:** 2026-11-02 · **Método:** documentación oficial de cada ecosistema + repos de la comunidad + papers; todo lo local verificado contra el código instalado.
**Nota de fiabilidad:** los 4 subagentes de investigación fallaron (backend); la investigación se rehízo directamente con búsqueda y fetch. Todas las citas son verificadas por fetch en esta sesión.

---

## 1 · Qué hace cada ecosistema

### DeepSeek Harness (local, verificado en código)

| Mecanismo | Qué es | Evidencia |
|---|---|---|
| Compactación por checkpoint estructurado | `compaction-basic` sustituye un tramo por un resumen de **8 secciones** (Primary Request, Key Technical Concepts, Files and Code, Errors and Fixes, Pending Jobs, Current Work, Next Step, Critical Context); el contenido sombreado **permanece en el session log** y el replay es determinista | `packages/compaction/compaction-basic/src/summarizer.ts:31-66` |
| Reutilización de caché del prefijo | la llamada auxiliar reproduce el prefijo de la última petición ruteada para reutilizar el KV cache del proveedor | `summarizer.ts:27-29` |
| Pruner de tool results | head + «middle pruned» + tail, original retenido, activado por presión | `packages/compaction/compaction-tool-result-pruner/README.md` |
| Handoff de delegación (fork) | `subagent-fork-in-process`: el hijo se siembra con los turnos completados del padre; snapshot único al fork | `packages/subagent/subagent-fork-in-process/README.md` |
| Referencia entre sesiones | `session-reference`: snapshots acotados de otras sesiones como contexto **no confiable con advertencia fija** que prohíbe instrucciones | `packages/context/session-reference/README.md` |
| Consulta de sesiones pasadas | `tool-session-query`: 5 tools read-only para buscar/inspectar sesiones anteriores, **autorizado solo por coincidencia de `cwd`** | `packages/session-query/tool-session-query/README.md` |
| Medición | `token-meter`: presión de contexto replay-aware y determinista | `packages/llm/token-meter/README.md` |

**No tiene:** comando `/handoff` explícito (resumen orientado a objetivo + sesión nueva), selección de working-set con estimación de tokens, revisión interactiva, ni compactación en segundo plano.

### pi (local, verificado en código)

| Mecanismo | Qué es | Evidencia |
|---|---|---|
| Compactación nativa | evento `session_before_compact` con `preparation` que incluye `messagesToSummarize`, `turnPrefixMessages`, `tokensBefore`, `firstKeptEntryId` y **`previousSummary`** (resúmenes incrementales); por defecto conserva las últimas ~20k tokens | `examples/extensions/custom-compaction.ts` (extensión de ejemplo que la reemplaza) |
| Handoff (ejemplo oficial) | `examples/extensions/handoff.ts`: `/handoff <goal>` genera un prompt de continuación (resumen + ficheros + tarea), lo abre en el **editor para revisión** y crea sesión nueva con `parentSession` | `handoff.ts:80-189`; análisis línea a línea en esta auditoría |
| Handoff completo (comunidad) | **`pi-amplike`** (npm 1.4.0): port de Amp — `/handoff [-mode][-model] <goal>` + tool `handoff` invocable por el agente, **`session_query`** para interrogar la sesión padre (analiza con el modelo de la sesión consultada), `/resume` para navegar sesiones, modos de prompt, subagentes `/btw` | `https://www.npmjs.com/package/pi-amplike` (fetch verificado) |
| Handoff automático de memoria | `pi-memory@0.4.2`: en `session_before_compact` escribe una entrada `<!-- HANDOFF … -->` en el daily log; tools `memory_read/search/write`, `scratchpad` | `~/.pi/agent/npm/node_modules/pi-memory/index.ts:1586-1636`, `README.md:158-164` |

### opencode (docs oficiales, fetch verificado)

| Mecanismo | Qué es | Evidencia |
|---|---|---|
| Compactación automática | al acercarse al límite resume **toda** la conversación y conserva al lado los últimos ~15k tokens; el resumen posterior **actualiza** el anterior | `opencode.ai/v2/docs/compaction/` |
| Reutilización de caché | la petición de resumen reutiliza la caché de la petición normal | ídem |
| Control fino | `buffer` como % de la ventana del modelo, `keep.tokens`, modelo dedicado (`agents.compaction.model`), API manual con idempotencia (`id`) | ídem |
| **Compactación en segundo plano (experimental)** | el resumen se escribe por adelantado al 85 % del umbral y se aplica al llegar | ídem |
| **Compactación nativa del proveedor** | con OpenAI Responses, el proveedor compacta del lado servidor y devuelve un **checkpoint cifrado opaco**; portabilidad limitada al mismo provider+modelo | ídem |
| Resumen orientado a handoff | «The summary is structured so another agent could pick the work up from it»: Objective / Next Move, decisiones, trabajo, bloqueos, ficheros | ídem |
| Handoff de la comunidad | **`opencode-handoff`** (inspirado en Amp): `/handoff <goal>` + working-set de 3-5 ficheros con **estimación de tokens por fichero y diálogo de revisión** (incluir/omitir/quitar contenidos), y tool **`read_session`** para leer el transcript completo de la sesión fuente | `github.com/joshuadavidthomas/opencode-handoff` (fetch verificado) |

### Claude Code (docs oficiales, fetch verificado)

| Mecanismo | Qué es | Evidencia |
|---|---|---|
| `/compact` estructurado | resumen de la historia + **matriz «what survives compaction»**: system prompt persiste; CLAUDE.md y reglas sin `paths:` se **reinyectan desde disco**; auto memory se reinyecta; skill descriptions se reconstruyen; hasta 5 ficheros leídos/editados se releen (los >5k tokens vuelven como referencia de ruta); subagentes/background siguen vivos con recordatorio; hooks SessionStart con fuente `compact` se re-ejecutan | `code.claude.com/docs/en/context-window` (fetch verificado) |
| Compactación guiada | `/compact focus on the auth bug fix`, `/rewind` + summarize from/to, `/autocompact N`, `/clear` | ídem |
| Memoria entre sesiones | **CLAUDE.md** (jerarquía gestionada/usuario/proyecto/local + imports `@path` + reglas con scope por path) y **auto memory** (MEMORY.md índice + ficheros por tema; tipos user/feedback/project/reference; primeros 200 líneas/25KB; subagentes con memoria propia) | `code.claude.com/docs/en/memory` (fetch verificado) |
| Herencia | subagent fork hereda conversación y system prompt | ídem |
| Comunidad | skills de handoff (p. ej. `pkstack` handoff SKILL.md), y el origen del patrón: **Amp** (hamel.dev) | búsqueda verificada |

### Codex / Cursor (tangencial, búsqueda verificada)

- **Codex**: AGENTS.md como instrucciones persistentes; discusión oficial sobre qué se carga al iniciar sesión (`openai/codex#12668`); memoria explicada por terceros (`mem0.ai/library/coding-agents/how-memory-works-in-codex-cli`). Sin comando `/handoff` equivalente documentado.
- **Cursor**: rules (`.cursor/rules`) como instrucciones (`cursor.com/docs/rules`); sin handoff de sesión documentado.

### El linaje del patrón

**Amp** (Hamel Husain) inventó el handoff como primera clase: branching de conversaciones + referencia al contexto del padre + navegación de historial (`ampcode.com/news/handoff`, `hamel.dev/notes/coding-agents/amp.html`). De ahí salieron por copia: `opencode-handoff`, `pi-amplike`, y el ejemplo oficial de pi. El resumen estructurado como "checkpoint retomable" viene de la compactación de Claude Code, que DSH implementó con 8 secciones y replay.

---

## 2 · Matriz comparativa

| Dimensión | DSH | pi | opencode | Claude Code | Amp (origen) |
|---|---|---|---|---|---|
| Compactación automática | ✓ | ✓ (hook `session_before_compact`) | ✓ | ✓ | ✓ |
| Resumen estructurado | ✓ 8 secciones | ✓ (incremental `previousSummary`) | ✓ Objective/Next Move | ✓ | ✓ |
| Conserva recientes junto al resumen | ✓ (pruner + span) | ✓ ~20k tokens | ✓ `keep.tokens` 15k | ✓ | ✓ |
| Reutiliza caché del prefijo | ✓ | — (no declarado) | ✓ | ✓ (prompt caching) | — |
| Replay determinista | ✓ (log durable) | — | — | — | — |
| Compactación en segundo plano | ✗ | ✗ | ✓ (experimental) | ✗ | ✗ |
| Compactación nativa del proveedor | ✗ | ✗ | ✓ (OpenAI, checkpoint cifrado) | ✗ | ✗ |
| **`/handoff <goal>` explícito** | ✗ | ✓ (ejemplo) / ✓✓ (pi-amplike) | ✓ (plugin comunidad) | ✗ (solo /compact) | ✓✓ |
| Working-set con selección y tokens | ✗ | parcial (lista de ficheros) | ✓✓ (revisión por fichero, incluir/omitir) | parcial (5 ficheros re-leídos) | ✓ |
| Sesión nueva con enlace al padre | ✗ (fork es subagente) | ✓ | ✓ | ✓ (plan mode re-inyectado) | ✓ |
| Tool para consultar la sesión padre | ✓✓ (`tool-session-query`, 5 tools, cwd-scoped) | ✓✓ (`session_query` con modelo propio) | ✓ (`read_session`) | ✗ (subagent fork) | ✓ |
| Revisión humana antes de cambiar de sesión | — | ✓ editor | ✓ diálogo | — | ✓ |
| Memoria persistente entre sesiones | parcial (AGENTS.md + plugin project-memory + skills) | parcial (daily log + memory tools) | parcial | ✓✓ (CLAUDE.md + auto memory) | ✓ |

---

## 3 · Veredicto SOTA

**El SOTA de handoff es la convergencia de tres líneas, y nadie las tiene todas:**

1. **Compactación con resumen estructurado + reutilización de caché + replay** — el estándar de coste/fiabilidad. **DSH y Claude Code lo hacen mejor** (DSH es el único con replay determinista desde el log; opencode añade el incremental).
2. **Handoff como operación distinta de la compactación** — inventada por **Amp** y copiada por `opencode-handoff` y `pi-amplike`: prompt orientado a objetivo, working-set revisable con tokens, sesión nueva enlazada, y **tool para interrogar la sesión padre**. Es la pieza que convierte "resumir" en "transferir".
3. **Frontera nueva**: compactación **en segundo plano** y **nativa del proveedor** (checkpoint cifrado en el servidor del proveedor) — opencode, experimental. El paper «Keeping the Cache Warm Pays» (arXiv 2607.19214) da el argumento económico del keepalive de caché.

**DSH ya tiene 3 de las 5 piezas del SOTA** (compactación replayable, fork, query de sesiones). **Le faltan exactamente dos**: el comando `/handoff` con working-set revisable (patrón Amp), y —si se quiere apretar coste— la compactación anticipada. La base de memoria entre sesiones existe (AGENTS.md + skills + `tool-session-query`), aunque sin el modelo de "auto memory" de Claude Code.

---

## 4 · Recomendación para DSH

**Adoptar (adaptado):**

| # | Qué | De quién | Coste | Valor |
|---|---|---|---|---|
| 1 | **`/handoff <goal>` como plugin** (no en el core): resume con el checkpoint estructurado existente orientándolo al objetivo, propone working-set (5 ficheros con tokens estimados via `token-meter`), diálogo de revisión, y crea sesión nueva con referencia al padre | Amp → opencode-handoff → pi-amplike | medio (un plugin + una UI de revisión) | **alto**: cierra la brecha SOTA con la menor superficie |
| 2 | **Ligar el handoff a `tool-session-query`**: la sesión nueva recibe el ID de la padre y la guía fija de usarlo cuando falte detalle | pi-amplike (`session_query`), opencode-handoff (`read_session`) | bajo (ya existen las 5 tools) | alto: el enlace padre→hijo deja de ser texto para ser consulta verificada |
| 3 | **Compactación anticipada** cuando haya presión sostenida | opencode (background, experimental) | medio-alto | medio: solo si el coste de caché fría lo justifica — medir antes con `token-meter` |

**No adoptar:**

- Compactación nativa del proveedor (checkpoint cifrado): rompe el invariante *model-visible ⟺ logged* y el replay de DSH. Contradice el diseño propio.
- Auto memory tipo Claude Code: DSH ya tiene AGENTS.md + project-memory como sustrato; un segundo sistema de memoria sería una tercera fuente de verdad.
- El ejemplo `handoff.ts` de pi tal cual (sin presupuesto, fallo disfrazado de cancelación, sin trazabilidad de la llamada auxiliar) — los defectos están documentados en esta auditoría.

---

## 4-bis · Actualización (2026-11-02, mismo día)

Ampliada con la frontera académica/industrial en [10-FRONTERA-INVESTIGACION.md](10-FRONTERA-INVESTIGACION.md). El veredicto §3 se mantiene y se precisa en tres puntos: (1) el SOTA añade la **consolidación fuera del turno** (Letta sleep-time, opencode background, arXiv 2607.19214); (2) la pregunta abierta del campo —¿la memoria mejora al agente durante meses?— es exactamente el hueco de evaluación que ya identificó el dossier QWEN; (3) DSH conserva dos diferenciadores que nadie de la lista tiene: replay determinista y fencing de contexto no confiable.

## 5 · Fuentes

- DSH: [summarizer.ts](/Users/ruben/Code/deepseek-harness/packages/compaction/compaction-basic/src/summarizer.ts), [subagent-fork-in-process](/Users/ruben/Code/deepseek-harness/packages/subagent/subagent-fork-in-process/README.md), [session-reference](/Users/ruben/Code/deepseek-harness/packages/context/session-reference/README.md), [tool-session-query](/Users/ruben/Code/deepseek-harness/packages/session-query/tool-session-query/README.md), [token-meter](/Users/ruben/Code/deepseek-harness/packages/llm/token-meter/README.md)
- pi: [handoff.ts](/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/examples/extensions/handoff.ts), [custom-compaction.ts](/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/examples/extensions/custom-compaction.ts), [pi-amplike](https://www.npmjs.com/package/pi-amplike)
- opencode: [Compaction](https://opencode.ai/v2/docs/compaction/), [opencode-handoff](https://github.com/joshuadavidthomas/opencode-handoff)
- Claude Code: [Explore the context window](https://code.claude.com/docs/en/context-window), [Memory](https://code.claude.com/docs/en/memory)
- Amp: [Amp – Hamel's Blog](https://hamel.dev/notes/coding-agents/amp.html), [ampcode.com/news/handoff](https://ampcode.com/news/handoff)
- Codex/Cursor: [openai/codex #12668](https://github.com/openai/codex/discussions/12668), [cursor.com/docs/rules](https://cursor.com/docs/rules)
- Transversal: [Keeping the Cache Warm Pays](https://ar5iv.labs.arxiv.org/html/2607.19214), AWS Well-Architected [Agentic AI Lens](https://docs.aws.amazon.com/pdfs/wellarchitected/latest/agentic-ai-lens/agentic-ai-lens.pdf), [ai-session-compression-techniques-2025](https://github.com/bobmatnyc/claude-mpm-skills/blob/718070a7d622921b01687799a1f9613f36c6f615/docs/research/ai-session-compression-techniques-2025-11-30.md), [pkstack handoff SKILL.md](https://raw.githubusercontent.com/njs14/pkstack/7e44dd88a3538500b47d50bfd183548a6e74af99/powers/pkstack/skills/handoff/SKILL.md)
