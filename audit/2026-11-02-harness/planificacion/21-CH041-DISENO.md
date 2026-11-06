# CH-041 (P1) — Governor outbound: diseño y gate

**Fecha:** 2026-11-06 · **Estado:** IMPLEMENTADO (opt-in); gate −20 % total falsado por medición · **Base:** `origin/master` = `0d1f50007f` (2026-09-15), worktree `.worktrees/ch041`, rama `feat/ch041-outbound-governor` · **Regla:** 100 % medido; model-visible ⟺ logged.

## 1 · Objetivo, implementación y gate medido

**Implementado (opt-in, sin push)** en `.worktrees/ch041`, rama `feat/ch041-outbound-governor`: S1 (`tool-skill`: `catalogTopK` + `catalogSummaryDescriptionMaxLength`) y S2 (`system-prompt-governor`: presupuesto MCP 3k). No se activa en presets publicados (política de la casa: los opt-ins no entran en los defaults) y no hay PR.

### El gate −20 % total queda FALSADO (medido, no estimado)

- Baseline CH-040: **308.353 tok/petición** ponderado (582 peticiones, 179.461.588 tokens).
- Medición de las dos superficies gobernadas sobre el mismo corpus (replay de logs; misma heurística fija de token-meter; sin llamadas al modelo):

| Superficie | Antes → después | Ahorro en 582 peticiones | Ahorro/petición |
|---|---|---|---|
| Catálogo de skills (top-K=8 + resúmenes) | catálogo completo → 8 completas + resto resumido | **810.798 tok** | ≈1.393 |
| Schemas MCP (presupuesto 3k) | 13 tools MCP, ya bajo 3k | **0 tok** | 0 |
| **Total gobernado** | — | **810.798 tok** | **1.393** |

- **Resultado: 0,45 % del total** (≈178.650.790 tokens). El total por petición está dominado por cache read de la conversación (301.159 tok/petición); ninguna selección de superficie alcanza −20 %. El gate correcto de P1 es sobre la superficie gobernada; el objetivo de −20 % total pertenece a P2 (result pruner), no a este change.
- No-regresión: 42 tests focales verdes (tool-skill 35 + governor 7, incluido Loader real), typecheck completo exit 0, `test:docs` 20/20; snapshots no re-grabados porque el comportamiento no se activa en presets (0 diffs).

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

## 4 · Verificación ejecutada

1. Tests enfocados: `tool-skill` 35 (selección, digest, escape hatch, gestos, sin señal léxica) y `system-prompt-governor` 7 (presupuesto, determinismo, validación, Loader real). Verdes.
2. `pnpm run typecheck` completo → exit 0; `test:docs` → **20/20 gates**; `test:snapshot` no se re-grabó (no hay activación en presets; 0 diffs esperados).
3. Medición del gate con el corpus real (tabla §1) y publicación en el expediente; sin llamadas al modelo ni estimaciones libres.
4. Agent Note bilingüe `proposed/feature/2026-11-06-outbound-prompt-governor` con alternativas, riesgos y el cambio de dueño del objetivo (−20 % → P2). PR pendiente de autorización de push.

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

## 7 · Estado de implementación (2026-11-06)

- Commits locales en `feat/ch041-outbound-governor` (sin push): `6212348` (S1 + docs + catálogo), `dbb8778` (S2 + helper en token-meter + docs + registro del paquete), `a019ea4` (composición Loader real + Agent Note bilingüe).
- El `request/header` durable es el registro de la decisión: contiene los schemas gobernados, así que model-visible ⟺ logged se cumple sin evento adicional (un evento por ensamblado solo añadiría volumen para un diagnóstico opt-in).
- Pendiente de decisión del propietario: recalibrar el gate/plan (mover −20 % total a P2), activar o no los opt-ins en presets, y publicar la PR.
