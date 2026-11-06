# Auditoría P6 — changes F4 (CH-043…CH-046)

**Fecha:** 2026-11-06 · **Modo:** escrito en el expediente (autorización permanente del propietario: «adelante con todo» + gate P6) · **Alcance:** ramas locales `feat/ch043-skill-mcp-router` (apilada), `feat/ch044-passive-memory`, `feat/ch045-session-handoff`, `feat/ch046-telemetry-redaction`; diseños 23–26 y sus gates publicados.

**Veredicto:** **APTO para integración opt-in, con 0 BLOCKER y 0 CRITICAL abiertos.** Un CRITICAL se detectó en CH-045 y se remedió en la misma rama (`944c37b`), re-verificado por ejecución. Quedan 2 MAJOR y 4 MINOR documentados con plan; ninguno bloquea el cierre de P6.

-----

## 1 · Método y evidencia ejecutada

| Comprobación | Comando | Resultado |
|---|---|---|
| Tests CH-043 (router + catálogo) | `pnpm exec vitest run packages/skill/skill-mcp-router packages/skill/tool-skill` | 3 ficheros, **46 tests** verdes |
| Tests CH-044 (memoria pasiva) | `pnpm exec vitest run packages/context/memory-passive` | **13 tests** verdes |
| Tests CH-045 (handoff, tras remediación) | `pnpm exec vitest run packages/session/handoff` + `tsc -b` | **6 tests** verdes, tsc 0 |
| Tests CH-046 (redacción/telemetría) | `pnpm exec vitest run packages/util/redaction packages/session/telemetry-redaction` | **6 tests** verdes |
| Typecheck completo | `pnpm run typecheck` en cada worktree | **exit 0** en las cuatro ramas |
| Doc gates | `pnpm run test:docs` | **20/20** en las cuatro ramas |
| Invariants (G-3) | `pnpm run verify-package-invariants` (CH-046) | **39 companions conformes, 0 violaciones** |
| Upstream | `git rev-parse @{u}` en cada rama | **sin upstream** en las cuatro (no hay push) |
| Escaneo de credenciales en diffs | `git diff origin/master..HEAD \| grep -E 'sk-[A-Za-z0-9]{16,}\|AKIA…\|BEGIN … PRIVATE KEY'` | 7 coincidencias en CH-044 y 10 en CH-046: **todas cadenas de fixture/reglas en tests**, ninguna credencial real |
| Gate de handoff (re-medido tras el fix) | suite de `tests/handoff.spec.ts` | proxy 15/15 hechos, 0 vs 15 pasos de recuperación (sin cambios) |

Límite del método: la auditoría la ejecuta el mismo agente que implementó; no es una revisión independiente (INFO-3).

## 2 · Hallazgos por severidad

### CRITICAL-1 (REMEDIADO) — El handoff escribía en la superficie antes que el bucle

- **Dimensión:** arquitectura / LLM / integridad de sesión.
- **Descripción:** la primera versión de `/handoff` creaba la hija y le añadía `turn/start` + `user/message` con el checkpoint. El bucle del agente añade el system prompt como nodo 0 sólo si la superficie está vacía; con el mensaje del usuario ya presente, el system prompt quedaba **después** del checkpoint, y el `turn/start` se duplicaba al arrancar el turno.
- **Evidencia (ejecución, pre-fix):** sonda con `SessionStore`+comando: `child surface roles BEFORE loop: user` → tras simular el arranque del bucle (`system/message` + `request/header`): `child surface roles AFTER loop start: user,system`. El contrato del seam exige proteger el nodo 0 (`packages/core/session/src/surface.ts:439-456`).
- **Por qué importa:** el texto del checkpoint (contenido de la sesión anterior) precedía a las instrucciones del sistema; un proveedor puede rechazar o reinterpretar el orden, y la semántica de procedencia/seguridad queda invertida.
- **Remediación aplicada:** el comando ya no escribe en la superficie; registra un evento **log-only** `handoff/checkpoint` (`packages/session/handoff/src/command.ts:40`) y un `agent/pre-step` listener inyecta el texto como mensaje de petición la primera vez (`packages/session/handoff/src/index.ts:47-58`). Commit `944c37b`, tests actualizados, README EN/ZH corregidos.
- **Re-verificación (post-fix):** `child surface BEFORE loop: 0` · `child surface AFTER loop start: system` · `injected source: handoff-checkpoint`. Superficie limpia, system prompt en el nodo 0, checkpoint como mensaje de petición.

### MAJOR-1 — Reglas de redacción duplicadas entre CH-044 y CH-046

- **Dimensión:** seguridad / una sola casa por hecho.
- **Descripción:** `memory-passive/src/redact.ts` (CH-044) y `dsh-redaction` (CH-046) implementan hoy el mismo juego de siete reglas; CH-046 las extrae a un paquete compartido, pero CH-044 (rama anterior) conserva su copia.
- **Evidencia:** `packages/context/memory-passive/src/redact.ts:13` frente a `packages/util/redaction/src/index.ts:31` (misma regla `private-key` y el resto del juego).
- **Por qué importa:** una regla de seguridad en dos casas puede divergir; el arreglo de una no cubre la otra.
- **Recomendación:** en la integración de F4 (CH-050), `memory-passive` migra a `@deepseek-ai/dsh-redaction` y elimina su copia; el gate de CH-050 comprueba que sólo existe una definición de reglas (`grep -c "name: 'private-key'"` = 1 en el árbol integrado).

### MAJOR-2 — El tracking de captura de memoria no acota el texto retenido

- **Dimensión:** rendimiento / memoria.
- **Descripción:** el estado incremental por sesión guarda el último texto de usuario y asistente completos; la cuota se aplica al escribir el registro, no al retenerlo.
- **Evidencia:** `packages/context/memory-passive/src/index.ts:35-47` (`state.user = text`, `state.assistant = text`).
- **Por qué importa:** una sesión larga con respuestas grandes mantiene en RAM texto que nunca se usará completo; el coste crece con la vida de la sesión.
- **Recomendación:** acotar al ingerir con `captureMaxChars` (o un múltiplo documentado) antes de asignar al estado; test de que el estado retenido no excede el límite. No bloquea P6; debe corregirse antes de activar la captura.

### MINOR-1 — El router reindexa las skills en cada paso

- **Descripción:** `tool-skill` llama `router.indexSkills(skills)` en cada `agent/pre-step` cuando el servicio está montado; el digest evita reescribir el índice, pero hashear el catálogo se paga por paso.
- **Evidencia:** `packages/skill/tool-skill/src/index.ts:132-141` (helper), `:379` (llamada).
- **Recomendación:** cachear el digest por generación del registro de skills o indexar sólo cuando cambie el snapshot; coste bajo para catálogos de decenas de skills.

### MINOR-2 — El checkpoint de handoff no incluye resultados de tools

- **Descripción:** el working set lista llamadas y argumentos, no los resultados; hechos que sólo existen en un `tool/result` no viajan.
- **Evidencia:** `packages/session/handoff/src/checkpoint.ts` (working set sólo desde bloques `tool-call`).
- **Recomendación:** documentado como limitación (el hijo puede releer el padre con `session_event_search`); si la evaluación en vivo muestra pérdida, añadir un resumen acotado de resultados.

### MINOR-3 — E-1 «por defecto» depende del montaje

- **Descripción:** la redacción es el comportamiento por defecto **cuando el plugin se monta**; un perfil que no lo monte conserva la telemetría sin redactar (el seam no cambia sus defaults).
- **Evidencia:** `README` de `session-telemetry` («ships no rules»), `packages/session/telemetry-redaction/src/index.ts:26-35`.
- **Recomendación:** decisión del propietario al activar perfiles; el informe de CH-046 deja la evidencia y la recomendación de montarlo junto al backend elegido.

### MINOR-4 — E-3 (pin de integridad) y G-1/G-2 no implementados aquí

- **Descripción:** E-3 requiere aceptar riesgo de terceros y fricción de instalación (decisión del propietario); G-1/G-2 son plugins instalables del mercado y no exigen código nuevo.
- **Evidencia:** `planificacion/26-CH046-DISENO.md` §1 y §3.
- **Recomendación:** mantener el diferimiento documentado; el gate de P6 no los exige.

## 3 · Correcciones de los propios auditores

- **Falso positivo descartado:** se sospechó que `injectOncePerTurn` de CH-044 comparaba `step !== 1` con un contador global. Verificado en `packages/core/agent-loop/src/agent.ts:221,289,349`: `step` se reinicia por turno, por lo que la condición es correcta (INFO).
- **Sospecha de orden de listeners en telemetría descartada:** el coordinador entrega el resultado del waterfall a `emit()` (`packages/session/session-telemetry/src/coordinator.ts:203`), por lo que transformar el retorno de `next()` sí redacta antes de la exportación; el plugin es correcto.
- **Hallazgo propio corregido durante el pase:** dos READMEs nacieron con `kind: package-library` y sin la frase de omisión de invariants; el gate de docs y el de invariants los detectaron antes del informe y se corrigieron en el commit de CH-046.

## 4 · Lo que sí funciona (medido, no decorativo)

- **CH-043:** router FTS5 zero-embeddings con recall@8 **0,915** / nDCG@8 **0,932** frente a 0,890/0,883 del baseline léxico (59 queries, 32 entradas); integración opt-in con fallback léxico intacto; 46 tests.
- **CH-044:** memoria pasiva con recall@5 **1,000** (39 queries), bloque máximo **1.033 chars** con cuota 4.000, **0 tools**, seis familias de redacción verificadas y captura real en `session/disposed`; 13 tests.
- **CH-045:** checkpoint acotado, hija enlazada por `parentSession`, padre intacto, proxy **15/15 hechos y 0 vs 15 pasos**; 6 tests tras la remediación.
- **CH-046:** **20/20 registros sin fugas** con seis familias en body/anidados/attributes, entrada intacta y ciclo fail-closed; invariants **39/39**; 6 tests.
- Cuatro ramas **sin upstream** (sin push), worktrees limpios, gates de documentación **20/20** y typecheck **exit 0** en todas.

## 5 · Estimación de remediación

| Hallazgo | Esfuerzo |
|---|---|
| MAJOR-1 migrar memoria a `dsh-redaction` | 1–2 h (dependencia + borrado + test de casa única) |
| MAJOR-2 acotar tracking de captura | 0,5–1 h (recorte al ingerir + test de retención) |
| MINOR-1 cachear digest del router | 0,5 h |
| MINOR-2 resumen de resultados de tools | 2–4 h (diseño + gate) |
| MINOR-3/4 decisiones de perfiles/E-3 | decisión del propietario, sin código |

**Conclusión:** los changes F4 quedan **aptos para integración opt-in**; ningún BLOCKER/CRITICAL abierto tras `944c37b`. La integración (rama de integración o merge ordenado) debe ejecutar MAJOR-1 y MAJOR-2 antes de activar memoria captura/telemetría en perfiles, y la decisión de montar los opt-ins sigue siendo del propietario.
