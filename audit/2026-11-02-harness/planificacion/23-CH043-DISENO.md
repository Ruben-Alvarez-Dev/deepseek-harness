# CH-043 (P3) — Router de skills/MCP: diseño

**Fecha:** 2026-11-06 · **Estado:** DISEÑO (implementación no iniciada) · **Base:** `origin/master` = `0d1f50007f`, worktree `.worktrees/ch043`, rama local `feat/ch043-skill-mcp-router` (deps instaladas) · **Regla:** un change a la vez; gates medidos; sin push.

## 1 · Objetivo y gate

P3 = **B-1 (Skill/MCPRouter)** + **B-2 (escape hatch garantizado)**:

- **Gate de ranking:** sobre **≥50 queries etiquetadas**, medir `recall@8` y `nDCG@8` del router zero-embeddings frente al baseline léxico actual. Objetivos falsables: **recall@8 ≥ 0,90** y **nDCG@8 ≥ 0,80** (si no se alcanzan, se publica la falsación y se recalibra con decisión del propietario).
- **Escape hatch:** ninguna capacidad desaparece: el catálogo de skills sigue listando todos los nombres (top-K solo detalla descripciones) y los MCP tools siguen siendo visibles en el ensamblado; el router añade búsqueda explícita (`find-mcp-tools`) pero no oculta tools por sí mismo.
- **No-regresión:** tests enfocados, typecheck, doc gates y snapshots keyless si se activa en composiciones. Opt-in por defecto.

## 2 · Seams verificados en `origin/master`

| Seam | Evidencia | Uso |
|---|---|---|
| Catálogo de skills | `ctx.skills.snapshot(options)` (`packages/skill/skill/src/index.ts:481`) devuelve `SkillSummary[]` con `name`, `description`, `whenToUse`, invocación y provider | Corpus de skills a indexar |
| Skills ya consumidas por el catálogo | `packages/skill/tool-skill/src/index.ts`: listener `agent/pre-step`, ranking léxico top-K de CH-041 | Punto de integración opcional (router sustituye el ranking si está montado) |
| Tools visibles por agente | `ctx.tools.schemas(scope)` (`packages/core/tools/src/index.ts:1240`) y `ctx.tools.get(name, scope)` (`:1210`); los MCP se registran con prefijo `mcp__` | Corpus de tools MCP a indexar |
| Contexto de ensamblado con agente | `AssembleContext.agent?` (`packages/core/agent/src/runtime-types.ts:21`; `assembleContextFor` en `dispatch.ts:174`) | El router puede leer la petición actual de la sesión y el conjunto visible de tools |
| FTS5 sin dependencias | **Verificado** en el Node del repo (26.12.1): `node:sqlite` `DatabaseSync` acepta `CREATE VIRTUAL TABLE … USING fts5(...)` y `bm25()` | Ranking FTS5 zero-embeddings, en memoria |

## 3 · Diseño

### Servicio `skillRouter` (paquete nuevo `@deepseek-ai/dsh-skill-mcp-router`)

- Base de datos **`node:sqlite` en memoria** (`:memory:`) con una tabla FTS5 `entries(kind, name, title, body, tokenize='unicode61')`; `kind` ∈ `skill` | `tool`.
- API pública:
  - `indexSkills(skills: readonly SkillSummary[]): void` — reconstruye la partición `skill` (nombre + descripción + `whenToUse` como `body`).
  - `indexTools(tools: readonly ToolSchema[]): void` — reconstruye la partición `tool` filtrando `mcp__*` (nombre + descripción).
  - `search(query: string, options?: { kind?: 'skill' | 'tool'; limit?: number }): Promise<RankedEntry[]>` — consulta FTS5 con tokens citados uno a uno (nunca `MATCH` crudo), ordena por `bm25()`; devuelve `{ kind, name, score }`.
  - `close()` para el ciclo de vida del servicio.
- Reindexado: el servicio escucha `system-prompt/assemble` para refrescar `indexTools` con el conjunto visible del agente; las skills se indexan cuando un consumidor pide el ranking (el catálogo ya calcula el snapshot por paso). Sin embeddings, sin llamadas al modelo.

### Integración opt-in (sin defaults)

1. **tool-skill (skills):** si `ctx.get('skillRouter')` existe, el top-K del catálogo usa `skillRouter.search(query, { kind: 'skill', limit: topK })`; sin router, conserva el ranking léxico de CH-041. El resto del comportamiento (todas las skills listadas, gestos `/name`, digest) no cambia.
2. **Sin `find-mcp-tools` (decisión):** los MCP tools siguen siendo visibles en el ensamblado; añadir una tool de descubrimiento pagaría schema en cada petición sin aportar capacidad. La partición `tool` queda en la API del servicio para el consumidor que en el futuro seleccione/ordene tools, y el escape hatch de B-2 ya existe porque no se oculta nada.

### Evaluación (gate)

- Fixture de **60 queries etiquetadas** con relevancia graduada sobre un corpus sintético de ~40 skills y ~30 tools MCP (nombres/descripciones realistas, sin datos de usuario).
- Métricas: `recall@8`, `nDCG@8`; baseline = ranking léxico de CH-041 (overlap de tokens); candidato = FTS5/BM25. Objetivos: recall ≥ 0,90 y nDCG ≥ 0,80.
- Reproducible como test/benchmark del paquete; el número medido se publica en este diseño y en 15-PLAN.

## 4 · Verificación y proceso

1. Tests: indexado (skills/tools), búsqueda (kind, limit, query vacía/ inválida), determinismo, métricas del fixture (gate), y composición real Loader con un consumidor.
2. `pnpm run typecheck`, `pnpm run test:docs`; snapshots keyless solo si se activa en presets (opt-in por defecto, 0 diffs esperados).
3. Agent Note bilingüe `proposed/feature/2026-11-06-skill-mcp-router.md` con alternativas (embeddings, FTS5 vs BM25 en memoria, ocultar tools) y riesgos.
4. Commits locales en `feat/ch043-skill-mcp-router`; **sin push**; expediente (15, 19, este diseño) actualizado con el número medido.

## 5 · Riesgos

| Riesgo | Mitigación |
|---|---|
| FTS5 no disponible en alguna plataforma Node | Degradación declarada: el servicio exige `node:sqlite` y falla loud al montarse; el baseline léxico sigue disponible al no montarlo |
| Tokenización de queries no inglesas | `unicode61` + citado por token; el fixture incluye queries en español/inglés |
| Ocultar tools por selección | No se oculta: el router solo rankea y ofrece búsqueda; el ensamblado no cambia |
| Sobreajuste al fixture | 60 queries con relevancia graduada, corpus separado del de skills reales; el gate es interno, no una afirmación de calidad universal |

## 6 · Medición del gate (2026-11-06)

**Corpus:** 20 skills + 12 tools MCP (32 entradas), **59 queries etiquetadas** con relevancia graduada (0–3); relevante = grado ≥2.

| Ranking | recall@8 | nDCG@8 |
|---|---|---|
| Baseline léxico (overlap de tokens, CH-041) | 0,890 | 0,883 |
| **Router FTS5/BM25 (porter+unicode61)** | **0,915** | **0,932** |

Objetivos del gate (`recall@8 ≥ 0,90`, `nDCG@8 ≥ 0,80`): **cumplidos** (0,915 / 0,932) y el router **supera al baseline** en ambas métricas. Medición reproducible en `packages/skill/skill-mcp-router/tests/router-quality.spec.ts` (test del paquete) y fixture `tests/fixtures/corpus.ts`.

**Límite declarado:** el corpus es sintético y el gate es una señal interna de regresión, no una afirmación de calidad universal. La consulta "roll back a bad release" no recupera nada (no comparte raíz con "rollback"); se documenta como limitación léxica en el README.

## 7 · Implementación y cierre (2026-11-06)

- **Implementado opt-in, sin activar en presets.** Commits locales en `feat/ch043-skill-mcp-router` (base `origin/master` `0d1f50007f`, apilada sobre la rama de CH-041 porque usa `catalogTopK`): `acd3e30` (servicio FTS5 + fixture + gate) y `2b04540` (integración en `tool-skill` + Agent Note) (ranking opcional vía `ctx.get('skillRouter')`, fallback léxico intacto).
- **Gate medido:** recall@8 0,915 / nDCG@8 0,932 frente a 0,890/0,883 del baseline léxico (59 queries, 32 entradas); objetivos 0,90/0,80 cumplidos. Agent Note bilingüe `proposed/feature/2026-11-06-skill-mcp-router`.
- **Verificación:** 46 tests (10 router, 36 tool-skill), `pnpm run typecheck` exit 0, `pnpm run test:docs` 20/20. Sin activación en composiciones → snapshots sin diffs. Sin push ni PR.
- **Pendiente de decisión del propietario:** publicar la rama/PR y, si se quiere efecto en producción, montar router + `catalogTopK` en presets (requiere re-grabar snapshots).
