# Auditoría CH-050 — árbol integrado F5

**Fecha:** 2026-11-06 · **Modo:** escrito en el expediente (autorización permanente del propietario: «adelante con todo» + gate P6) · **Alcance:** worktree `/Users/ruben/Code/PROJECTS/DEEPSEEK-harness/.worktrees/ch050`, rama `feat/ch050-integration`, **HEAD auditado `f3bc397bac`**, base `origin/master` = `0d1f50007f`, **31 commits**, **190 ficheros, +9.132/−202** (134 añadidos, 56 modificados, 0 borrados, 0 renombrados); los 7 changes F4 integrados en orden CH-041 → CH-043 → CH-042 → CH-044 → CH-045 → CH-046 → CH-047, más las remediaciones del Lead. **HEAD final tras la remediación de este informe: `c50f6fea76`** (33 commits, 190 ficheros, **+9.138/−202**), re-medido en §5.

**Veredicto:** **APTO para sellar el árbol integrado con 0 BLOCKER y 0 CRITICAL abiertos, con 3 MAJOR y MINOR-6, todos remediados en `c50f6fea76` (§5).** Las remediaciones MAJOR-1/MAJOR-2 del P6 están implementadas y re-verificadas; los gates medidos están verdes (static 55/55, invariants 39/39, docs 20/20, typecheck 0, lint 0/0, duplicación 0 clones, tests de los paquetes tocados). El sello puede referenciar **`c50f6fea76`** como HEAD final; antes de cerrar, el expediente 15/19/00-INDICE debe recoger este informe y el veredicto. Ningún opt-in está montado en presets; sin push ni PR.

-----

## 1 · Método y evidencia ejecutada

Todo se midió sobre el árbol congelado `f3bc397bac` (worktree limpio, `git status --porcelain` vacío). Las mediciones iniciales sobre el estado intermedio del Lead se descartaron y se repitieron aquí.

| Comprobación | Comando | Resultado |
|---|---|---|
| HEAD/base/integridad | `git rev-parse HEAD`, `git status --porcelain`, `git merge-base origin/master HEAD` | `f3bc397bacb5261a577cf4be517d65f92fc4aea3`; limpio; base `0d1f50007f` |
| Orden y topología de la integración | `git log --oneline`, `git show --remerge-diff <merge>` | merges `a19ef60` (CH-041) → `d3a00c3` (CH-043) → `dd2a3d4` (CH-042) → `1662ac0` (CH-044) → `5e23ecd` (CH-045) → `d2a1b8d` (CH-046) → `8453665` (CH-047); solo **2 conflictos** (`tsconfig.base.json` en CH-046, `verify-package-readme-model-experience.ts` en CH-047), ambos resueltos sumando ambos lados |
| Gates estáticos | `pnpm run check:ci:static` | **55 passed, 0 failed, 0 skipped** (64,26 s) |
| Invariantes de paquete | `pnpm run verify-package-invariants` | **39 hand-owned package companion(s) conform** |
| Docs | `pnpm run test:docs` | **20 passed, 0 failed, 0 skipped** (38,20 s) |
| Typecheck | `pnpm run typecheck` | **exit 0** (`tsc -b tsconfig.client.json`) |
| Lint | `pnpm run lint:contracts-ready` | **0 warnings, 0 errors** (3.898 ficheros, 90 reglas) |
| Duplicación (jscpd) | `pnpm run duplication` | **0 clones** (1.874 ficheros, 385.185 líneas) |
| Tests focados F4 + paquetes tocados | `pnpm exec vitest run <17 rutas>` | **199/199** en 17 ficheros (incluye `commands`, `command-compact`, `tool-skill`, `llm` no; ver siguiente fila) |
| Suite `llm` (helper compartido del commit final) | `pnpm exec vitest run packages/llm/llm` | **1.234/1.234** (49 ficheros) |
| Suite `session` + `agent-loop` (tipos de evento añadidos) | `pnpm exec vitest run packages/core/session packages/core/agent-loop` | **923/923** (40 ficheros) |
| Gate router (re-medido, no confiado) | sonda `tsx` con `CORPUS`/`QUERIES` reales | **recall@8 0,915 · nDCG@8 0,932**; baseline léxico **0,890 / 0,883** (59 queries, 32 entradas) |
| Gate memoria (re-medido) | sonda `tsx` con `MEMORY_QUERIES` reales | **39 queries, recall@5 1,000**, bloque máximo **1.033 chars** con cuota 4.000 |
| MAJOR-1 P6 (una sola casa de reglas) | `git grep -c "name: 'private-key'" HEAD -- packages`; `grep -rn … packages` | **1 en el árbol commiteado**; 3 en el worktree por artefactos `lib/` obsoletos (MINOR-1) |
| MAJOR-2 P6 (cota al ingerir) | lectura + tests | `boundCaptureText` en `packages/context/memory-passive/src/index.ts:44,48`; tests `tests/memory-passive.spec.ts:156,163` |
| Comportamiento real de la inyección (falsificación) | sonda con el **agent loop real** + `MockAdapter` (2 turnos) | **4 mensajes user en superficie** (2 directos + 2 `plugin:memory-passive`), **2 eventos** `memory/injected`, y **la petición 2 contiene el bloque del turno 1** (`deploy-rollback`) |
| Handoff tras reanudar (falsificación) | sonda: sesión hija con `handoff/checkpoint` durable + plugin montado en proceso nuevo, `agent/pre-step` | **0 mensajes entregados** con **1 evento durable** presente |
| Compatibilidad de eventos persistidos | sonda `validateStoredEvents` con tipo desconocido | **no-ignorable → RECHAZA el log**; con `ignorable: true` → acepta |
| Seguridad del diff completo | `git diff origin/master..HEAD \| grep -E 'sk-…\|AKIA…\|BEGIN … PRIVATE KEY\|ghp_…\|github_pat_'` | 11/3/3/5 coincidencias: **todas fixture/regla en tests**, ninguna credencial real (p. ej. `sk-abcdefghijklmnop1234`, `AKIAABCDEFGHIJKLMNOP`, `MIIEsecret`, JWT de juguete) |
| Presets/composiciones | `git diff --name-only origin/master..HEAD \| grep -E 'preset\|cordis\.yml\|agent\.yml'`; `grep -rln <paquetes F4> packages/preset apps packages/boot` | **sin cambios y sin montajes**: ningún opt-in activo |
| Publicación | `git for-each-ref … refs/heads`; `git branch -r --contains HEAD` | **9 ramas sin upstream**; HEAD no está en ninguna rama remota (sin push/PR) |
| Checkout principal | `git -C /Users/ruben/Code/PROJECTS/DEEPSEEK-harness status --porcelain` | **24 entradas, idénticas al inicio**; rama `audit/2026-11-02-harness` @ `0cc18bccb6`; worktrees ch041…ch047 en sus tips |

Límite del método: la auditoría es read-only sobre el worktree (no `gen-*`, no `--write`, no `pnpm install`); el informe es la única escritura. Las cifras de CH-041 (0,45 %) y CH-042 (12,94 %/20,54 %) proceden de simulaciones sobre logs de `~/.dsh` fuera del repo: **`sin-verificar` por ejecución independiente** (INFO-2).

-----

## 2 · Hallazgos por severidad

### MAJOR-1 — El checkpoint de handoff se pierde si la sesión hija se reanuda (entrega solo en el mismo proceso)

- **Dimensión:** integridad de sesión / durabilidad.
- **Descripción:** el comando escribe el checkpoint únicamente como evento durable, y la entrega la hace un listener `agent/pre-step` que lee un `WeakMap` poblado **solo por `session/event` en vivo** (`packages/session/handoff/src/index.ts:39-46`). Los eventos que entran por construcción (replay/fork/resume) **nunca se publican** por ese firehose (`packages/core/session/src/index.ts:476-479`). Si el proceso muere entre `/handoff` y el primer paso del hijo (o se reabre la sesión después), el checkpoint queda en el log pero **no se entrega nunca**.
- **Evidencia (ejecución):** sonda sobre HEAD `f3bc397bac`: sesión hija con `handoff/checkpoint` durable, plugin montado en un `Context` nuevo, `agentEvents.waterfall('agent/pre-step', …)` → `delivered messages: 0`, `durable checkpoint events: 1`. El test actual no lo cubre: dispara el waterfall en el mismo proceso donde el evento se emitió (`packages/session/handoff/tests/handoff.spec.ts:133-150`).
- **Por qué importa:** `/handoff` promete una continuación fiable; cerrar la app o reiniciar antes de abrir el hijo es un flujo normal, y el fallo es silencioso (la sesión hija arranca sin el contexto del padre). Además, el `WeakMap` también se borra en `session/disposed`, por lo que un hijo nunca abierto en ese proceso pierde la entrega.
- **Remediación:** reconstruir la entrega desde el log durable al primer `agent/pre-step` (p. ej. último `handoff/checkpoint` sin un `handoff/checkpoint-delivered` posterior) o documentar la restricción «mismo proceso» y no vender durabilidad de la entrega; añadir test de reanudación. Mientras no se active handoff en presets, el defecto es latente.

### MAJOR-2 — La documentación afirma que memoria y checkpoint son «request-scoped» y que el log solo guarda ids/digest: el bucle los persiste en la superficie

- **Dimensión:** documentación/seguridad de datos / rendimiento.
- **Descripción:** `agent/pre-step` recibe `decision.messages` y el bucle **los añade a la superficie** como `user/message` con `surfaceOp: 'append'` (`packages/core/agent-loop/src/agent.ts:374-377`). Por tanto, el bloque de memoria pasiva y el checkpoint **quedan escritos en el log durable, se ven en `deriveMessages()` y se reenvían al modelo en las peticiones siguientes**. Las afirmaciones contrarias están en: `packages/context/memory-passive/README.md:55,83,98`, `packages/session/handoff/README.md:81`, `packages/context/memory-passive/src/types.ts:38-41`, `.agents/notes/proposed/feature/2026-11-06-passive-memory.md:16`, `.agents/notes/proposed/feature/2026-11-06-session-handoff.md:13` y el mensaje del commit `bdb41d7` («Neither message is ever appended to the surface»).
- **Evidencia (ejecución):** sonda con el agent loop real y 2 turnos: `surface user messages: 4`, fuentes `[{kind:'user'},{kind:'plugin',plugin:'memory-passive'},{kind:'user'},{kind:'plugin',plugin:'memory-passive'}]`, `memory/injected events: 2`, `request2 includes turn-1 block: true`. El test de handoff solo comprueba `child.deriveMessages()` **antes** del primer paso (`handoff.spec.ts:132`) y dispara el waterfall a mano, por lo que no observa el append del bucle.
- **Por qué importa:** (a) la privacidad/retensión declarada es falsa: el log de sesión contiene el texto inyectado, no solo ids/digest (y la limitación «Replay needs the store» de `memory-passive/README.md:98` es incoherente con ello); (b) el coste no es «volátil»: cada turno añade hasta ~1 k tokens de historia durable que se reenvían en todas las peticiones posteriores (crece con la sesión), justo la variable que CH-041/042 intentan reducir; (c) invalida la evidencia del P6 («child surface AFTER loop start: system» y «superficie limpia»), que era incorrecta.
- **Remediación:** antes de sellar, corregir READMEs/notas/comentarios y la justificación del commit para decir lo que ocurre (mensaje durable con source `plugin`; el evento log-only conserva ids/digest; el texto también está en el log). Decidir del propietario: aceptar el comportamiento durable (y documentar el coste) o implementar entrega realmente efímera (cambio de seam del bucle, más caro). **La decisión de usar el variant `plugin` de `MessageSourceMap` es correcta** (evita cambiar la unión de fuentes persistidas; el gate de persistencia pasa), pero su premisa escrita no lo es.

### MAJOR-3 — El registro de persistencia afirma compatibilidad que el código no implementa: los tres eventos no son ignorables para lectores antiguos

- **Dimensión:** datos / gobernanza de persistencia.
- **Descripción:** `docs/persistence-changes/2026-11-06-opt-in-session-events.md:46` afirma que «a reader that does not know them can skip them without changing the reconstructed conversation or the current Session validation». Pero `Session.append` no permite marcar `ignorable` (`packages/core/session/src/index.ts:719-780`: la envoltura solo lleva `type/seq/time/data/surfaceOp/sourceEventSeqs`), y `validateStoredEvents` **rechaza el log completo** ante un tipo desconocido no marcado (`packages/session/session-persistence/src/storage-contract.ts:69-80`). Un harness anterior que abra una sesión escrita con cualquiera de los tres opt-in activos falla con «unknown to this harness and not marked ignorable».
- **Evidencia (ejecución):** sonda `validateStoredEvents` con un tipo desconocido → `unknown non-ignorable: REFUSED -> session "probe-session" contains event type … not marked ignorable`; con `ignorable: true` → aceptado (1). El registro está clasificado `same-version` (decisión mínima de la tabla para «add an ordinary event type»), cuya explicación exige precisamente justificar que un lector anterior puede ignorarlo.
- **Por qué importa:** el sello declararía una compatibilidad que no existe; el mecanismo de persistencia delega esa explicación en el revisor y aquí es falsa. Con los opt-in sin montar no hay sesiones afectadas todavía, pero se crean en cuanto el propietario active memoria/handoff/gate.
- **Remediación:** corregir la sección «Compatibility» para describir el comportamiento real (lector antiguo rechaza; opt-in no montados) y obtener aceptación explícita del propietario, o bien dar soporte de `ignorable` en la escritura (la tabla de reglas clasifica cambiar la envoltura como `version-bump`, así que sería un change aparte). No bloquea el sellado del árbol si el texto se corrige; sí bloquea declarar «same-version» sin matices.

### MINOR-1 — Artefactos `lib/` obsoletos conservan una copia de las reglas de redacción: el gate MAJOR-1 del P6 tal cual da 3, no 1

- **Descripción:** `packages/context/memory-passive/src/redact.ts` se borró en `415041d` y el árbol commiteado tiene **una sola** definición (`git grep -c "name: 'private-key'" HEAD -- packages` = 1). Pero el build incremental no poda salidas: quedan `packages/context/memory-passive/lib/types/redact.js|.d.ts|.map` (no trackeados, gitignored) con la copia antigua, y `grep -rn "name: 'private-key'" packages` en el worktree devuelve **3**.
- **Por qué importa:** el gate que el P6 dejó escrito («grep = 1») falla en el árbol auditado; además `files` del paquete incluye `lib/types/**/*.d.ts`, así que una publicación podría llevar una declaración muerta de un módulo inexistente.
- **Remediación:** reconstrucción limpia antes de sellar (`pnpm run clean` + build) o acotar el gate a `packages/**/src/`; re-medir el gate.

### MINOR-2 — `tool-dispatch-gate` no valida `mode` en `apply()`: un valor inválido degrada silenciosamente a auditoría

- **Descripción:** `const mode = config.mode ?? 'audit'` y solo se compara `mode === 'enforce'` (`packages/guard/tool-dispatch-gate/src/index.ts:148,158`). Vía Loader, Schemastery valida el enum; vía montaje programático, `{ mode: 'Enforce' }` (u otro valor) se comporta como auditoría sin error, justo el modo que no bloquea.
- **Evidencia:** lectura del código y tests (solo se ejercitan `audit`/`enforce` válidos, `tests/tool-dispatch-gate.spec.ts:139-189`).
- **Remediación:** aserción de unión en `apply()` (fallo ruidoso), como hacen `handoff`, `pruner` y `memory-passive` con su config. 0,5 h.

### MINOR-3 — CH-041 introduce dos lecturas históricas deprecadas en `tool-skill`

- **Descripción:** `latestUserMessage` recorre el log con `session.eventAt` (deprecado) y ambas llamadas llevan supresión `typescript/no-deprecated` (`packages/skill/tool-skill/src/index.ts:172-186,193-201,534`). El diseño de CH-044 evita explícitamente «lecturas síncronas deprecadas de historial», y el paquete ya tiene `session.deriveMessages()` disponible.
- **Por qué importa:** es deuda nueva en un paquete que publica catálogo en cada paso; si la API deprecada se retira, el catálogo cae.
- **Remediación:** migrar a proyección en vivo o registrar la excepción en la Agent Note (el helper ya se autodocumenta como última excepción). 1–3 h.

### MINOR-4 — El gate de continuación de CH-045 es en parte definicional, no medido

- **Descripción:** el test fija `recoveredWithHandoff = 0` y `recoveredWithoutHandoff = 5 * tasks.length` como literales (`packages/session/handoff/tests/handoff.spec.ts:189-194`); lo único medido es que los 15 hechos aparecen en el checkpoint. El README lo llama «deterministic proxy», pero el P6 lo reportó como «0 vs 15 pasos de recuperación (sin cambios)».
- **Remediación:** mantener el proxy pero etiquetarlo como definición (no medición) en el expediente; una evaluación con modelo sigue pendiente para la activación. 0,25 h documental.

### MINOR-5 — `skill-mcp-router` declara una inyección que no usa

- **Descripción:** `static inject = ['tools']` (`packages/skill/skill-mcp-router/src/index.ts:78`) pero el servicio nunca lee `ctx.tools` (grep sin resultados). Añade una dependencia dura que retrasa el montaje y puede bloquear composiciones sin registro de tools.
- **Remediación:** retirar la inyección o usarla. 0,1 h.

### INFO

- **INFO-1 — Corrección al informe P6:** su re-verificación del CRITICAL («child surface AFTER loop start: system», «superficie limpia») no es reproducible; el orden correcto es system prompt como nodo 0 **y después** el checkpoint como `user/message` (mismo bucle, `agent.ts:374-377`). El arreglo de orden sigue siendo válido.
- **INFO-2 — Gates de CH-041/CH-042 `sin-verificar`:** 1.393 tok/petición (0,45 %) y 12,94 %/20,54 % son simulaciones sobre logs de `~/.dsh` fuera del repo; no se re-ejecutaron. Los tests de mecanismo sí están verdes.
- **INFO-3 — CH-047:** el diseño (`27-CH047-DISENO.md:24`) decía paquete «privado» y el entregado es `@deepseek-ai/dsh-experimental-longitudinal-eval`, publicable; es la convención del repo (todos los `experimental/*` son públicos con `publishConfig.access: public`) y el gate de constraints pasa. La ventana de 30 días y la extracción de muestras desde logs quedan declaradas como trabajo del llamador; no hay runner incluido.
- **INFO-4 — Commit final `f3bc397`:** deduplica (`contentText` y `boundDescription` a `dsh-llm`; `registerDrainingCommand` a `dsh-commands`; helper en `tool-skill`). Revisado como equivalente: `llm` 1.234/1.234, `session`+`agent-loop` 923/923, static 55/55, lint 0/0 y duplicación 0. Amplía la API pública de dos paquetes core con helpers internos; aceptable, pero conviene que el revisor del sello lo sepa.
- **INFO-5 — Sin snapshots:** no se ejecutó `test:snapshot` porque ningún opt-in está montado (declarado en 19-HANDOFF §9.3). Las activaciones futuras lo exigirán.

-----

## 3 · Adaptaciones del Lead: ¿correctas o encubren un incumplimiento?

| Adaptación | Veredicto | Evidencia |
|---|---|---|
| Fuentes volátiles de memoria/handoff al variant `plugin` de `MessageSourceMap` | **Decisión correcta; justificación escrita falsa** | No cambia la unión de fuentes persistidas (gates de Session format y persistencia verdes); el variant `plugin` ya se persiste (compaction). Pero el commit afirma que «nunca se apendizan a la superficie» y sí se hace (`agent.ts:374-377`, sonda). Hallazgo MAJOR-2 |
| Registro `docs/persistence-changes/2026-11-06-opt-in-session-events.*` | **Formalmente correcto; explicación de compatibilidad falsa** | 4 ficheros bilingües, declaración máquina, catálogo/schema regenerados, verificación PASS; pero «older readers can skip» no se cumple sin `ignorable` (MAJOR-3) |
| Exención de `tool-dispatch-gate` en el catálogo de tools | **Correcta y acotada** | `scripts/gen-tool-catalog.ts:658-682` documenta el motivo y sigue fallando para cualquier otro `tool-*` no listado; gate «tool catalog» PASS |
| `skillRouter` en catálogos/roles | **Correcta** | Entrada generada en `docs/subsystems/skills.md:266-301`, rol en `scripts/gen-doc-graphs.ts:179-188`, tipos/firmas en `tool-cordis/src/api-catalog.ts`; consume opt-in vía `ctx.get('skillRouter')` (`tool-skill/src/index.ts:130-145`), nada montado |
| Anotación de tipo en `pruneResult`/`pruneContent` | **Correcta** | `pruneContent(blocks, thresholdChars: number = this.config.thresholdChars)` (`compaction-tool-result-pruner/src/index.ts:101`); typecheck y API catalog PASS |
| Constraints de paquetes (`redaction` cordis peer/dev; renombre `dsh-experimental-longitudinal-eval`) | **Correctas** | `packages/util/redaction/package.json:29-35`; nombre/prefijo y `publishConfig.access: public` del experimental; gate `constraints` PASS |
| Omisión del companion de invariantes en paquetes F4 | **Conforme a la política del repo** | El gate exige una frase de motivo en README (regex en `scripts/package-invariants.ts:13`, comprobación en `:197`); los READMEs la incluyen y el gate da 39/39. Es una omisión declarada, no un fallo oculto; las relaciones nuevas (orden de superficie, entrega del checkpoint) quedan sin invariante |

-----

## 4 · Correcciones de los propios auditores

- **Del P6 (09-AUDITORIA-P6-F4.md):** la «re-verificación» del CRITICAL describe una superficie limpia que no existe; el bucle apendiza el mensaje de petición. El gate de continuación «0 vs 15 pasos» es definicional, no medido. La auditoría P6 fue del mismo agente que implementó (ya declarado como INFO-3 en su informe).
- **De esta auditoría:** las primeras pasadas de `check:ci:static`, `typecheck` y tests se ejecutaron mientras el Lead aún editaba el worktree (20:01–20:12); se descartaron y se repitieron sobre `f3bc397bac`. La sospecha inicial de que el variant `plugin` ocultaba un cambio de formato de sesión se descartó: la unión persistida no cambia; el problema es la afirmación sobre la superficie, no la persistencia.
- **Matiz del gate MAJOR-1 del P6:** «grep = 1» se cumple en el árbol commiteado, pero no en el worktree por artefactos `lib/` obsoletos; ninguna de las dos lecturas oculta una segunda casa de reglas en fuente.

-----

## 5 · Remediación post-informe — re-medición sobre `5b56c06500` y `c50f6fea76`

**Fecha:** 2026-11-06 20:30 · **Alcance de la remediación:** dos commits de texto, sin cambios de tipos ni de comportamiento. `5b56c06500` («fix(docs): describe durable injections and real persistence compatibility»), 21 ficheros, +57/−52: READMEs EN/ZH, notas, `types.ts` y registro de persistencia. `c50f6fea76` («docs(handoff,memory): drop the remaining request-scoped wording»), 9 ficheros, +15/−14: comentarios de `memory-passive/src/index.ts`, `handoff/src/index.ts`, `handoff/src/command.ts`, línea de precedentes del README de memoria (EN/ZH) y alternativas de la nota de memoria pasiva (EN/ZH). **HEAD final: `c50f6fea76`, 33 commits, 190 ficheros, +9.138/−202, worktree limpio.**

| Hallazgo | Estado verificado en `c50f6fea76` | Evidencia |
|---|---|---|
| MAJOR-2 (afirmaciones request-scoped/volatile) | **Corregido en documentación de usuario y notas:** READMEs EN/ZH de memory-passive y handoff, sus `types.ts` y las Agent Notes describen el append a la superficie, la durabilidad y el coste; la limitación «Injection is durable, not volatile» quedó explícita. No quedan afirmaciones de usuario falsas. | `git diff f3bc397bac..HEAD -- packages/context/memory-passive/README.md packages/session/handoff/README.md` (p. ej. memory README:83 y handoff README:81 corregidos) |
| MAJOR-3 (compatibilidad del registro de persistencia) | **Corregido:** el registro dice que los 3 eventos no son ignorables, que `validateStoredEvents` rechaza el log y que `same-version` solo cubre la ausencia de cambio estructural en raíces antiguas; incluye la sonda. | `docs/persistence-changes/2026-11-06-opt-in-session-events.md:46`; `pnpm run verify-persistence-changes` → «63 roots match 4 history records» |
| MAJOR-1 (entrega del checkpoint al reanudar) | **Registrado como limitación de activación** (no se vende durabilidad): README, nota y `types.ts` dicen que la entrega es process-local y que el checkpoint no se entrega tras un reinicio; handoff no debe activarse hasta arreglarlo o aceptar la restricción. | `packages/session/handoff/README.md:53,81,96`; `src/types.ts:8-11`; comportamiento re-probado: 0 mensajes entregados con 1 evento durable |
| MINOR-1 (artefactos `lib/` obsoletos) | **Resuelto para memory-passive** (sin `redact.*` en `lib/`). Matiz del gate: `grep -rn "name: 'private-key'" packages` da **2** en un worktree construido (la fuente y el `lib/` generado de `dsh-redaction`), no 1; **a nivel de fuente = 1**. El gate literal del P6 depende de artefactos, no de una segunda casa de reglas. | `grep -rln … packages` → `util/redaction/src/index.ts` + `util/redaction/lib/types/index.js`; `find packages/context/memory-passive/lib -name '*redact*'` → vacío |

**Re-medición completa en `5b56c06500` (base) y `c50f6fea76` (final):** `check:ci:static` **55/55** (48,06 s en solitario; una pasada previa falló solo por solapar dos builds de docs en paralelo — reproducido y re-ejecutado limpio; incluye docs, persistencia, Session format, catálogos y translation pairing) · `typecheck` **exit 0** en `5b56c06500` (los cambios posteriores son solo texto/comentarios) · `lint:contracts-ready` **0/0** (3.898 ficheros) · `verify-package-invariants` **39/39** · `verify-persistence-changes` **PASS** (63 roots / 4 records) · `verify-session-format-catalog` **up to date** · `verify-translation-pairing` **934 pares consistentes** · `verify-config-catalog`/`verify-persistence-catalog`/`verify-export-jsdoc` PASS (dentro del static) · `duplication` **0 clones** · `test:docs` **20/20** · tests focados de los paquetes remediados y `core/session` **551/551** · sondas de comportamiento: la memoria sigue apendizando (4 user messages; la petición 2 reenvía el bloque del turno 1) y el checkpoint sigue sin entregarse al reanudar (0 entregados / 1 durable). Es decir: **el comportamiento no cambió; lo que cambió es que la documentación ahora dice la verdad**. Sin presets/composiciones tocados; 8 ramas `feat/*` sin upstream; HEAD no está en ningún remoto; el checkout principal solo recibió este informe por mi parte.

**MINOR-6 — resuelto en `c50f6fea76`:** el commit final (9 ficheros, +15/−14) sustituye las últimas menciones internas `request-scoped`/`volatile` por «user message / append a la superficie» en los comentarios de `handoff/src/index.ts`, `handoff/src/command.ts`, `memory-passive/src/index.ts`, el precedente del README de memoria (EN/ZH) y las alternativas de la nota (EN/ZH). Verificado: `grep -rn "request-scoped\|volatile\|volátil"` en esos ficheros solo devuelve la frase correcta «Injection is durable, not volatile» (`memory-passive/README.md:98`); el resto vacío. Sin cambios de tipos ni de comportamiento (solo comentarios y prosa) y `translation pairing` re-grabado y consistente.

**Veredicto de remediación:** **no queda ningún BLOCKER ni CRITICAL.** MAJOR-1/2/3 y MINOR-6 quedan remediados en sustancia y verificados en `c50f6fea76`; **el sello puede referenciar `c50f6fea76` como HEAD final**, con dos condiciones de expediente: (a) que 15/19/00-INDICE incorporen este informe, el veredicto y el HEAD final, y (b) que el resto de MINOR/INFO queden registrados como deuda declarada. La condición de activación de handoff (MAJOR-1) y la decisión de activar cualquier opt-in siguen siendo del propietario. (El HEAD auditado original `f3bc397bac` y el intermedio `5b56c06500` quedan documentados para trazabilidad; el que debe sellarse es `c50f6fea76`.)

-----

## 6 · Lo que sí funciona (medido, no decorativo)

- **Integración:** 7 changes en el orden previsto; solo 2 conflictos, resueltos sin perder ninguna adición; árbol limpio y reproducible; rama sin upstream y HEAD fuera de todo remoto (sin push/PR).
- **CH-043:** router FTS5 reproducible: **recall@8 0,915 / nDCG@8 0,932** frente a **0,890/0,883** del baseline léxico, re-medido por sonda independiente; integración opt-in con fallback léxico intacto (`catalogTopK` por defecto 0 = comportamiento previo).
- **CH-042:** dispatch gate con 19 tests (12 vectores de bypass, enforce/audit, deny gana a wildcard, composición Loader real) y pruner por presión aditivo, con validación ruidosa de la config y snapshots/`compaction/prune` intactos.
- **CH-044:** memoria pasiva con **recall@5 1,000** (39 queries), bloque máximo **1.033 chars** con cuota 4.000, **0 tools**, captura redactada en `session/disposed`; MAJOR-1/2 del P6 **remediados**: una sola casa de reglas (`@deepseek-ai/dsh-redaction`; `src/redact.ts` borrado en `415041d`) y cota al ingerir con tests de retención (`tests/memory-passive.spec.ts:156,163`).
- **CH-045:** checkpoint acotado, hija enlazada por `parentSession`, padre intacto, system prompt como nodo 0; el CRITICAL `944c37b` sigue arreglado (el comando ya no escribe la superficie). El defecto de reanudación es nuevo (MAJOR-1 de este informe).
- **CH-046:** **20/20 registros sin fugas** (6 familias en body/anidados/attributes), entrada intacta y ciclo fail-closed; `telemetry-redaction` es el slot opt-in documentado.
- **CH-047:** métricas validadas contra valores a mano, resumen de uso y kill-criteria deterministas; baseline real (3 sesiones, 582 peticiones, 4 skill calls en 2/3, 0 inyecciones, 2 días activos) con la ventana de 30 días declarada, no simulada.
- **CH-041:** governor determinista y composición Loader real; el commit final de deduplicación no altera comportamiento (1.234 tests `llm` + 923 `session`/`agent-loop` + 199 focados).
- **Gates del árbol:** static **55/55**, invariants **39/39**, docs **20/20**, typecheck **0**, lint **0/0**, duplicación **0 clones**; cero credenciales reales en el diff; checkout principal y worktrees ajenos intactos.

-----

## 7 · Estimación de remediación

| Hallazgo | Esfuerzo |
|---|---|
| MAJOR-1 entrega del checkpoint al reanudar | 2–4 h (reconstruir desde el log durable + marcador de entrega + test de resume) |
| MAJOR-2 corregir afirmaciones (o cambiar semántica) | 1–2 h si es documental; 1–2 d si se exige entrega realmente efímera |
| MAJOR-3 compatibilidad del registro de persistencia | 0,5–1 h (texto + aceptación del propietario); 1–2 d si se implementa `ignorable` con decisión de formato |
| MINOR-1 build limpio / gate acotado | 0,25 h |
| MINOR-2 validar `mode` del gate | 0,5 h |
| MINOR-3 migrar lecturas deprecadas | 1–3 h |
| MINOR-4 etiquetar el proxy en el expediente | 0,25 h |
| MINOR-5 retirar inyección no usada | 0,1 h |
| **Remediación post-informe (real, §5)** | ~1,5 h del Lead: MAJOR-1/2/3 documentales y MINOR-1, más MINOR-6 en un segundo commit de texto (`c50f6fea76`) |
| **Sello** (actualizar 15/19/00-INDICE, añadir este informe, registrar decisiones) | 1–2 h |

-----

## 8 · Cierre — Dementor y veredicto falsable

**Pase Dementor (escepticismo absoluto):** se asumió que todo era falso y se buscaron falsos positivos y negativos. Falsos positivos descartados: no hay segunda casa de reglas de redacción en fuente; no hay opt-in montado; no hay push/PR; no hay credenciales reales; el wrapper `plugin` no cambia la unión persistida; el commit final de deduplicación es equivalente (tests). Falsos negativos encontrados: la entrega del checkpoint no sobrevive a un resume (probado), las afirmaciones de volatilidad/request-scoped son falsas (probado con el bucle real), y la compatibilidad «older readers can skip» no está implementada (probado con `validateStoredEvents`).

**Veredicto falsable:** el árbol `f3bc397bac` es **apto para el sello con 0 BLOCKER/CRITICAL y 3 MAJOR**, condicionado a que, antes de sellar, (a) se corrijan las afirmaciones de MAJOR-2 y MAJOR-3 (o el propietario acepte por escrito la semántica durable y el rechazo de lectores antiguos), (b) MAJOR-1 quede corregido o registrado como limitación de activación de handoff, y (c) 15/19/00-INDICE y el expediente incorporen este informe y el estado real. **Este veredicto cae** si alguien demuestra que las inyecciones de memoria/checkpoint no se persisten en la superficie (sonda del bucle real), que el checkpoint se entrega tras reanudar (sonda de resume), o que un lector anterior acepta los tres eventos sin `ignorable` (`validateStoredEvents`).

**Actualización post-informe (§5):** las tres condiciones se cumplen en `c50f6fea76`: MAJOR-2 y MAJOR-3 corregidos, MAJOR-1 registrado como limitación de activación y MINOR-6 resuelto; no queda BLOCKER ni CRITICAL y **el sello puede referenciar `c50f6fea76` como HEAD final**, dejando el resto de MINOR/INFO como deuda declarada.

**No bloquean el sello** (pero deben quedar en 19-HANDOFF antes de activar nada): MINOR-2…5, y las decisiones de activación/publicación/ventana de 30 días, que siguen siendo del propietario.
