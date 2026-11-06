# CH-042 (P2) — Dispatch gate y pruner por presión: diseño

**Fecha:** 2026-11-06 · **Estado:** DISEÑO (implementación no iniciada) · **Base:** `origin/master` = `0d1f50007f`, worktree `.worktrees/ch042`, rama local `feat/ch042-dispatch-gate-pruner` (deps instaladas) · **Regla:** un change a la vez; gates falsables; sin push.

## 1 · Objetivo y gate

P2 del plan SOTA es **A-2 (dispatch gate)** + **A-3 (result pruner por presión)**:

- **Gate A-2:** en modo *enforce*, **12 vectores de bypass bloqueados** (tabla §4) sin romper tools legítimas; modo *audit* por defecto para observar una semana antes de imponer.
- **Gate A-3:** los resultados largos se recortan **por presión en cada turno** y el **original completo permanece en el log** (eventos `compaction/prune` ya existentes).
- **Gate heredado de CH-041 (ahora aquí):** objetivo **−20 % de tokens por petición** sobre el corpus de 3 sesiones de CH-040. Como en CH-041, si la medición no lo alcanza, se documenta la falsación y se recalibra con decisión del propietario; no se declara un número sin medirlo.
- **No-regresión:** snapshots keyless sin diffs no intencionados (solo si se activa en composiciones), tests enfocados y typecheck en verde.

## 2 · Seams verificados en `origin/master`

| Seam | Evidencia | Uso |
|---|---|---|
| Gate de despacho | `packages/core/tools/src/index.ts:146` (`tools/pre-execute` waterfall: `exec`, `next()`, `PreToolDecision`); decisión `allow/deny/cancel/ask` en `:589-593` | Punto único donde se puede denegar una llamada antes de materializar/ejecutar |
| Identidad de la llamada | `ToolExecution` en `:309-381`: `name`, `arguments`, `agent?`, `parent?` (sub-dispatch PTC), `rootCallId`, `signal`, esquema | El gate ve el nombre exacto de toda llamada que llega al registro, incluidas desconocidas (`UNKNOWN_TOOL`), salvo la colapsada por modo PTC (denegada antes del pipeline, `:1382+`) |
| Patrón de listener | `packages/experimental/auto-review/src/index.ts:655` (listener `tools/pre-execute` que decide y llama `next()`) | Modelo para el gate: en allow/audit se delega con `next()`; en deny no se llama a `next()` |
| Pruner existente | `packages/compaction/compaction-tool-result-pruner`: config `thresholdChars`/`headChars`/`tailChars` (defaults 8192/4096/1024), `pruneSession(session)` recorta el nodo de superficie y anexa `compaction/prune` (shadow-price) conservando el original en el log | A-3 se construye **extendiendo** este paquete, no duplicándolo |
| Disparo actual | `packages/compaction/compaction-basic/src/index.ts:278` (`ctx.get('toolResultPruner')`, invocado al condensar por presión/overflow) | El pruner hoy solo actúa en el flujo de compactación; A-3 añade el disparo por turno |
| Precio de contexto | `@deepseek-ai/dsh-token-meter` (`ctx.tokenMeter.measure(session)`) | El disparo por presión se decide con la misma medida replay-aware que el resto del harness |

## 3 · Diseño A-2 — `@deepseek-ai/dsh-tool-dispatch-gate`

- **Paquete nuevo** (función plugin, sin default export): `packages/guard/tool-dispatch-gate`, montado en una composición que ya tenga `dsh-tools`.
- **Config validada** (nada hardcodeado):
  - `mode: 'audit' | 'enforce'` — default **`audit`** (observa y registra sin denegar); `enforce` es opt-in explícito.
  - `allow: string[]` — allowlist normalizada; cada entrada es un nombre exacto o un prefijo terminado en `*` (p. ej. `mcp__git__*`). `['*']` permite todo (configuración explícita).
  - `deny: string[]` — denegaciones explícitas que ganan a `allow` (escape hatch operativo; default `[]`).
- **Vocabulario normalizado:** para *comparar*, el nombre se canoniza con NFKC, se recortan espacios y caracteres de formato (categoría Unicode `Cf`, p. ej. zero-width), y se pasa a minúsculas. **La llamada se ejecuta con el nombre original**: el gate compara una forma canónica, nunca reescribe `exec.name`.
- **Decisión:** coincidencia con `allow` y sin `deny` → `next()`. No coincidencia en `audit` → se registra y se delega (`next()`). No coincidencia en `enforce` → `{ kind: 'deny', reason }` **sin** `next()`. Un nombre vacío o no canónico nunca coincide.
- **Registro durable:** evento de sesión log-only `tool/dispatch-gate` (declarado por el paquete; JSDoc y payload documentados), con `name`, `normalized`, `decision` y `mode`. Se anexa **solo** cuando la decisión es no-permitida (audit) o denegada (enforce), para acotar volumen. Esto es lo que permite la semana de auditoría.
- **Product-visible:** al ser un plugin de comportamiento, se le exige un **test de composición real** por Loader (cordis.yml test-only montando `dsh-tools` + gate + un tool fixture) además de los unitarios.

## 4 · Los 12 vectores de bypass (gate A-2)

| # | Vector | Resultado esperado en enforce |
|---|---|---|
| 1 | nombre exacto permitido | allow |
| 2 | tool desconocida no listada | deny |
| 3 | variante en mayúsculas (`READ`) | deny (normalización canónica) |
| 4 | espacios alrededor (` read `) | deny |
| 5 | carácter zero-width dentro del nombre | deny |
| 6 | variante fullwidth NFKC (`ｒｅａｄ`) | deny |
| 7 | colisión de prefijo (`read_evil` con `read` permitido) | deny (solo prefijo explícito `*`) |
| 8 | tool MCP no permitida (`mcp__git__push`) | deny |
| 9 | tool MCP cubierta por wildcard (`mcp__git__*`) | allow |
| 10 | nombre vacío | deny |
| 11 | `deny` explícito que gana a `allow` | deny |
| 12 | sub-dispatch con `parent` (PTC) | el gate observa al hijo y aplica la misma decisión |

## 5 · Diseño A-3 — pruner por presión por turno

- Extender `compaction-tool-result-pruner` con un bloque de config opcional **desactivado por defecto**:
  - `pressure: { maxContextTokens: number; pruneThresholdChars: number }` — cuando `ctx.tokenMeter.measure(session).totalTokens` supera `maxContextTokens`, cada turno recorta los resultados de tool que superen `pruneThresholdChars` (con `headChars`/`tailChars` existentes), aplicando el mismo `pruneSession` y por tanto el mismo evento `compaction/prune` y la misma conservación del original.
  - El disparo se registra en `agent/pre-step` (antes de ensamblar la petición) y **solo** si el bloque está configurado; sin `pressure` el paquete se comporta exactamente como hoy.
- **Coordinación con compaction-basic:** el disparo por turno es un pre-paso; `compaction-basic` sigue siendo el dueño de la condensación por presión/overflow. Se documenta que ambos pueden coexistir (el pruner es idempotente sobre lo ya recortado) y que la config por defecto no cambia nada.
- **Medición del −20 %:** replay de las 3 sesiones de CH-040; se calcula la cota de tokens recortables por turno con el umbral configurado y se compara con el total (misma metodología replay-aware). Si la cota no llega a −20 %, se publica la falsación y se recalibra con decisión del propietario.

## 6 · Verificación y proceso

1. Tests enfocados: gate (unitarios + los 12 vectores + composición Loader real), pruner (presión por turno, original en log, no-op sin config).
2. `pnpm run typecheck`, `pnpm run test:docs` (docs/catálogos bilingües) y snapshots keyless cuando la activación en composiciones esté decidida.
3. Agent Note bilingüe `proposed/feature/2026-11-06-tool-dispatch-gate-and-pressure-pruner`.
4. Commits locales en `feat/ch042-dispatch-gate-pruner`; **sin push**. Actualizar expediente (15, 19 y este diseño) con los números medidos.

## 7 · Entorno

Worktree `.worktrees/ch042` creado desde `origin/master`; `pnpm install` completado; upstream desvinculado para evitar push accidental. El checkout principal y el WIP del usuario no se tocan.

## 8 · Medición del gate (2026-11-06)

**Método:** replay de los logs de las 3 sesiones de CH-040, sin llamadas al modelo. Baseline = usage del proveedor registrado (179.461.588 tokens, 582 peticiones). Para cada política se simula el disparo por presión (`totalTokens` de la petición > `maxContextTokens`), se podan los tool-results de la superficie por encima del umbral y se cuenta el ahorro (`chars retirados / 4`, misma heurística fija del meter) en **cada petición posterior que carga la superficie podada**. Límite declarado: no mide calidad del modelo ni regresión de tool-calls; un tool-call no se elimina, solo se acorta su resultado.

| Política | `maxContextTokens` | `pruneThresholdChars` | head/tail | Tokens ahorrados | % del baseline |
|---|---|---|---|---|---|
| Conservadora (defaults de trim) | 100.000 | 8.192 | 4.096/1.024 | 23.226.625 | **12,94 %** |
| Agresiva | 40.000 | 3.000 | 2.048/512 | 36.870.187 | **20,54 %** |

Por sesión (agresiva): 19,75 % / 24,32 % / 14,71 %; reducción final de contexto 158.220 / 79.557 / 33.947 tokens. **A-2 no aporta ahorro de tokens** (control de seguridad: 12/12 vectores bloqueados en enforce).

**Conclusión:** el gate −20 % **se alcanza en la simulación solo con la política agresiva**, que deja ~640 tokens por resultado de tool. La conservadora se queda en 12,94 %. La condición "sin regresión" no está evaluada porque la activación cambia resultados model-visible y snapshots; queda como decisión del propietario con kill-criteria (si aumentan reintentos de tool-calls o baja el éxito de tarea, desactivar).

## 9 · Estado de implementación

- Commits locales en `feat/ch042-dispatch-gate-pruner` (sin push): `d6816f7` (A-2 + 19 tests), `e08ac49` (A-3 + 18 tests), `626833c` (Agent Note bilingüe).
- Verificación: 37 tests verdes entre gate y pruner, `pnpm run typecheck` exit 0, `pnpm run test:docs` 20/20. Opt-ins **no** montados en presets → snapshots sin diffs; no se ejecutó `test:snapshot` como gate.
- Agent Note: `.agents/notes/proposed/feature/2026-11-06-tool-dispatch-gate-and-pressure-pruner.md`.
- **Pendiente de decisión del propietario:** política de presión (agresiva 20,54 % vs conservadora 12,94 % vs solo documentar), activación en presets (requiere re-grabar snapshots) y publicación de PR.

## 10 · Cierre (decisión del propietario, 2026-11-06)

CH-042 se cierra **opt-in, sin activar**. El gate de tokens queda **demostrado por simulación** con la política agresiva (**20,54 %**; conservadora **12,94 %**), no activado en presets, y la activación futura queda condicionada a una evaluación en vivo (calidad de tarea y tool-calls) y a re-grabar snapshots, con kill-criteria. Sin PR ni push; rama local `feat/ch042-dispatch-gate-pruner` con `d6816f7` (A-2), `e08ac49` (A-3) y `626833c` (Agent Note). Siguiente change del plan: CH-043 (P3, router de skills/MCP).
