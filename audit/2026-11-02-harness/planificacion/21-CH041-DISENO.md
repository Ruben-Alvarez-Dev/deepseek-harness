# CH-041 (P1) — Governor outbound: diseño y gate

**Fecha:** 2026-11-06 · **Estado:** DISEÑO (implementación no iniciada) · **Base:** `origin/master` = `0d1f50007f` (2026-09-15), worktree `.worktrees/ch041`, rama `feat/ch041-outbound-governor` · **Regla:** 100 % medido; model-visible ⟺ logged.

## 1 · Objetivo y gate (decidido)

Reducir la superficie de contexto por petición sin degradar capacidades ni tool-calls.

- **Gate primario:** **−20 % de tokens por petición** sobre el baseline de CH-040 → **≤246.682 tok/petición** ponderado (baseline 308.353; 582 peticiones, 3 sesiones, `planificacion/20-BASELINE-CH040.md`).
- **Gates de no-regresión:** 0 diffs no intencionados en snapshots grabados; ninguna reducción de tool-calls correctos; publicar por separado total / input no cacheado / output (baseline: 6.175 / 1.019 por petición).
- **Medición:** replay keyless de las sesiones grabadas (sin llamadas al modelo): precio con `token-meter` del envelope `request/header` antes y después, misma metodología que el baseline (usage exacto cuando exista; estimador replay-aware para la superficie). No se usa `ceil(len/4)` para el gate.

## 2 · Seams verificados en `origin/master`

| Seam | Evidencia | Uso |
|---|---|---|
| Waterfall de ensamblado | `packages/core/system-prompt/src/index.ts:626` (`ctx.waterfall(..., 'system-prompt/assemble', assembly, context, …)`); `PromptAssembly { sections, contexts, tools, variables }` en `:118`; el valor devuelto es autoritativo salvo la sección `complete` (`:628-640`) | Punto único para gobernar `tools` (schemas MCP) e inyecciones |
| Instrucciones MCP | `packages/mcp/mcp-client/src/server-context.ts:30-40` (sección `mcp:<server>`, orden `MCP_SERVERS`) | Sección candidata a resumen |
| Nombres de tools MCP | `packages/mcp/mcp-client/src/tools.ts:8` (`mcp__<serverName>__<rawName>`) | Discriminador fiable para aplicar el presupuesto MCP |
| Catálogo de skills | `packages/skill/tool-skill/src/index.ts:212-256`: listener `agent/pre-step` que emite el catálogo como mensaje `catalog`; tiene `messages` del paso (incluye la petición) y respeta skills invocadas por el usuario | Selección top-K con relevancia léxica, sin embeddings |
| Medición | `packages/llm/token-meter/src/index.ts:101` (servicio `ctx.tokenMeter`); `estimate.ts:102` (`estimateToolsTokens(header)`) | Precio determinista; hay que exponer el precio de una lista de tools (helper o cabecera sintética) |
| Regla de log | `AGENTS.md` raíz: *Model-visible ⟺ logged* | Cada decisión del governor (qué se recortó/seleccionó) debe quedar en un evento de sesión reconstruible |

## 3 · Alcance de P1

### S1 · Top-K de skills (K=8) — `packages/skill/tool-skill`

- Nuevo campo de `Config`: `catalogTopK` (entero ≥1, por defecto 8; `0` = sin límite).
- Ranking léxico determinista sobre `name + description` vs. el último mensaje de usuario del paso (normalización de término, sin embeddings; desempate estable por nombre).
- Nunca se filtran: skills invocadas por el usuario (`/<name>`), ni la vía de escape (`skill` loader siempre visible; el catálogo completo sigue accesible con la tool).
- Se preserva el comportamiento existente de digest/updates del catálogo; sólo cambia el conjunto de entradas publicado.

### S2 · Presupuesto de schemas MCP (3k tokens) — nuevo plugin en el waterfall

- Nuevo paquete de governor (nombre a fijar según convención `packages/core/*`), montado en el preset; registra `system-prompt/assemble`.
- Regla: para tools `mcp__*`, si el coste estimado del envelope MCP supera `mcpSchemaTokenBudget` (por defecto 3000), se sustituye el `parameters` de las tools menos prioritarias por una forma compacta (nombre + descripción de una línea + parámetros requeridos), manteniendo **todos** los nombres y la descripción. Prioridad determinista: tools ya ejecutadas en la sesión > orden canónico.
- Config validada en cordis.yml (nada hardcodeado); el valor por defecto 3000 coincide con la cuota decidida (3k).
- Cada compactación se registra en un evento de sesión propio para que el input model-visible sea reconstruible (regla de log).

### Fuera de alcance de P1

- Cuota de 1k de inyecciones: pertenece a P4/C-3 (memoria pasiva), no a los contextos de runtime (sandbox/aprobación).
- Router FTS5 de skills/MCP: P3/B-1.

## 4 · Verificación

1. Tests enfocados: `tool-skill` (selección, digest, escape hatch) y el nuevo plugin (presupuesto, determinismo, log); `pnpm run test` filtrado por paquete.
2. `pnpm run typecheck` y `pnpm run test:snapshot` (keyless) → 0 diffs no intencionados.
3. Script de medición: precio `request/header` por petición en el corpus de snapshots antes/después; publicar números (media/mediana/p90) y comparar con el gate −20 %.
4. Agent Note `proposed/feature/2026-11-06-outbound-prompt-governor.md` (o `implemented/` si se completa) en el mismo cambio, con alternativas y lo renunciado; proceso DSH: PR cuando haya autorización de push.

## 5 · Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Ocultar la skill correcta | Escape hatch permanente (loader) + test de recall sobre tareas etiquetadas; top-K sólo recorta el catálogo, no la tool |
| Pérdida de validez por schemas compactos | Mantener nombres/requeridos; test de tool-calls; snapshot replay |
| Ruido en snapshots | Sólo diffs esperados; gate de 0 diffs no intencionados |
| Violar model-visible ⟺ logged | Evento de sesión por decisión del governor |
| Base desactualizada | Trabajo en worktree desde `origin/master`; el checkout principal no se toca |

## 6 · Nota operativa del entorno

`pnpm install` en el worktree termina con warning del postinstall de lefthook: el `core.hooksPath` heredado apunta a `/Users/ruben/Code/deepseek-harness/.git/dsh-hooks` (ruta previa a la reorganización) y el instalador se niega a reemplazar una ruta worktree-scoped. No bloquea tests; arreglar `core.hooksPath` antes de publicar PR.
