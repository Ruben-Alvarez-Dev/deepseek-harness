# MATRIZ-GAPS · Brechas planificado ↔ implementado — Agente Pi

**Anexo:** A3 · **Fecha:** 2026-10-25 · **Compaña a:** `A3-planificado-no-implementado.md`
**Fuentes:** O3 `/Users/ruben/Code/pi-arnes-documental-privado/` (sin git) · O2/O4 `/Users/ruben/Code/PI-agent/` (git `7b0e0b3`, solo lectura)
**Convención:** `[V]` verificado en esta sesión por lectura/grep/git read-only · `[A]` auto-declarado por la documentación auditada, no re-ejecutado.

---

## 0 · Cómputo de ítems planificados

| Bloque | Universo | Ítems |
|---|---|---|
| **O3** | 60 movimientos M00–M59 | 60 |
| | 8 changes OpenSpec candidatos | 8 |
| | Piezas del diseño v0.1 (7 módulos núcleo + 9 agentes + 10 skills + 8 tools MCP) | 34 |
| | Pruebas pendientes de investigación (6 experimentos §5 + 12 casos G01–G12 + 7 puertas P0–P6) | 25 |
| | Decisiones abiertas (9 en `HANDOFF.md:31` + 2 en `EXECUTION-STATE.yaml:22-24`) | 11 |
| | 5 fases de construcción (diseño §9) | 5 |
| | **Subtotal O3** | **143** |
| **O2/O4** | 2 changes activos del router | 2 |
| | 27 capacidades canónicas de la raíz | 27 |
| | 11 intervenciones arquitectónicas D01–D11 | 11 |
| | 4 decisiones del propietario (a)–(d) | 4 |
| | 6 work packages WP-1…WP-6 | 6 |
| | 16 entradas de expediente E-031…E-046 | 16 |
| | 3 fuentes `D-revision` purgadas | 3 |
| | **Subtotal O2/O4** | **69** |
| | **TOTAL** | **212** |

### Distribución por estado

| Estado | O3 | O2/O4 | Total | % |
|---|---|---|---|---|
| **Implementado / cerrado** | 1 | 8 | **9** | 4,2 % |
| **En curso / parcial** | 5 | 2 | **7** | 3,3 % |
| **Planificado sin empezar** | 126 | 27 | **153** | 72,2 % |
| **Bloqueado** (decisión humana o pieza ausente) | 11 | 15 | **26** | 12,3 % |
| **Abandonado / purgado** | 0 | 3 | **3** | 1,4 % |
| **Contradicho por el repo** (estado declarado ≠ real) | — | 14 | **14** | 6,6 % |
| **Total** | **143** | **69** | **212** | 100 % |

> **Lectura:** solo **9 de 212** ítems planificados (4,2 %) están cerrados con evidencia. El 72 % no se ha empezado. Y 14 ítems están en un estado peor que "sin hacer": la documentación afirma que están hechos o que no quedan pendientes.

---

## 1 · BLOQUE CRÍTICO — falsea el estado o bloquea la auditoría

| # | Ítem | Estado | Evidencia del plan | Evidencia de implementación | Qué falta exactamente |
|---|---|---|---|---|---|
| C-1 | `DOCS-HARNESS/D-revision/` (3 ficheros: análisis de cobertura, plan candidato, revisión final) | **Abandonado / purgado** | Citado como fuente vigente en `00-ALCANCE-Y-METODO.md` §1 O2 y O4 | `[V]` `find /Users/ruben/Code -maxdepth 5 -iname "*D-revision*"` → **vacío**. Borrados en `e8fb692` (E-022, 2026-10-17). Solo en historia git | Decidir: restaurar desde git (`git show e8fb692^:docs/docs-harness/D-revision-01-plan-candidato.md`) si la revisión sigue vigente, **o** corregir O2/O4/O5 del alcance y declararla purgada. Hoy el anexo A3 no puede auditarla |
| C-2 | `EXECUTION-STATE.yaml` `current_phase` | **Contradicho por el repo** | `[V]` `EXECUTION-STATE.yaml:4` `current_phase: construccion`; `:7` `current_gate: continuous_build`; `:21` "construcción continua sin validaciones intermedias" | `[V]` `:5` `last_verified_movement: M00`; `:10` `openspec_status: not_initialized`; `:11` `implementation_status: not_started`. En disco: `ls -d .git` → inexistente; `ls -d openspec` → inexistente; `find . -name "*.ts" -o -name "*.py" -o -name "*.js"` → **0 ficheros** | Corregir `:4` a `diseno`/`planificacion`, **o** ejecutar M21 (crear repo git) que es la entrada real de la fase de construcción. `PLAN-SERIAL:52` hace de M21 el primer paso tras G3 |
| C-3 | `PI-agent/HANDOFF.md` §Pendiente | **Contradicho por el repo** | `[V]` `HANDOFF.md:38-42` "**Pendiente — Ninguno**… no queda finding abierto"; sello "7/7 medido el 17-oct… sellado en `8c42530`" | `[V]` HEAD es `7b0e0b3` (2026-10-24, E-047): 7 días y 17 entradas más tarde. Hay 2 changes sin archivar (H-6), 4 decisiones abiertas (H-9), 11 intervenciones sin ratificar (H-8), 16 entradas de expediente ausentes (H-7) | Reescribir §Pendiente con las decisiones (a)–(d), los 2 changes pendientes de archive y el tramo E-031…E-046. Añadir caducidad del sello cuando HEAD avanza |
| C-4 | Movimiento **M21** — crear repo Git, estructura mínima, `.gitignore` de datos/secretos/sesiones/modelos/cachés, fixture sintético | **Planificado sin empezar** · *entrada de toda la fase de construcción* | `[V]` `PLAN-SERIAL-OPENSPEC.md:52` | `[V]` `pi-arnes-documental-privado/.git` no existe; 15 ficheros en total, todos `.md`/`.yaml`; ningún fixture | Es el **bloqueante raíz** de M22–M59 (53 movimientos). Sin repo no hay `git status` que auditar, ni hashes de fixture, ni prueba de exclusión de datos privados |

---

## 2 · BLOQUE ALTO — brecha sustantiva de producto o de trazabilidad

### 2.1 Cambios OpenSpec y specs canónicas

| # | Ítem | Estado | Evidencia del plan | Evidencia de implementación | Qué falta exactamente |
|---|---|---|---|---|---|
| A-1 | Change `bootstrap-private-harness` | Planificado | `[V]` `PLAN-SERIAL:12` (candidato), `:39` M15 redactar `proposal.md` | `[V]` `pi-arnes/openspec/` **no existe**. Ningún directorio con ese nombre en ninguno de los dos repos | M13 (ADR de schema) → M14 (`openspec init`) → M15-M18. Bloqueado por G2 y por `HANDOFF.md:4` ("No ejecutar `openspec init` antes de aprobación del diseño") |
| A-2 | Change `ingest-and-provenance` | Planificado | `[V]` `PLAN-SERIAL:12` | `[V]` inexistente | Idem A-1 |
| A-3 | Change `ocr-and-transcription` | Planificado | `[V]` `PLAN-SERIAL:12` | `[V]` inexistente | Idem A-1 |
| A-4 | Change `redaction-policy-and-review` | Planificado | `[V]` `PLAN-SERIAL:12` | `[V]` inexistente | Idem A-1 |
| A-5 | Change `safe-pdf-and-md-export` | Planificado | `[V]` `PLAN-SERIAL:12` | `[V]` inexistente | Idem A-1 |
| A-6 | Change `local-model-adapters` | Planificado | `[V]` `PLAN-SERIAL:12` | `[V]` inexistente | Idem A-1 |
| A-7 | Change `legal-medical-profiles` | Planificado | `[V]` `PLAN-SERIAL:12` | `[V]` inexistente | Idem A-1 |
| A-8 | Change `security-and-release-gates` | Planificado | `[V]` `PLAN-SERIAL:12` | `[V]` inexistente | Idem A-1 |
| A-9 | Change router `2026-10-19-discarded-tool-call-observability` | **Implementado, sin archivar** | `[V]` `tasks.md` 4/4 secciones `[x]`; `openspec/AGENTS.md:15-16` exige archive para mover deltas a la spec canónica | `[V]` Código real: `src/pi-account-router/src/adapters/message-safety.ts:25` (`DiscardedToolCallShape`), `:34` (`shapeOf`), `:56` (`describeInvalidToolCalls`); `routed-streams.ts:22` (import), `:476` (emit), `:483` (`shapes`) | Ejecutar archive. **La spec canónica no refleja el código**: `grep -c discarded_tool_calls openspec/specs/provider-transport/spec.md` → **0**, mientras el delta del change tiene 7 menciones |
| A-10 | Change router `2026-10-24-s2-repair-gate` | **Implementado, sin archivar** | `[V]` `tasks.md` 4/4 secciones `[x]` | `[V]` Código real: `message-safety.ts:94` (`repairToolCalls`); `routed-streams.ts:23` (import), `:471` (gate repair→recount→terminal), `:483` (`shapes`) | Idem A-9. Además `src/pi-account-router/HANDOFF.md:56` afirma "**Cero changes activos**" → falso, hay 2 |
| A-11 | 27 capacidades canónicas de la raíz (`openspec/specs/`, 147 requisitos) | **Sin historial de cambios** | `[V]` `README.md:20` "Especificación canónica: 27 capacidades… Cambios activos: ninguno"; `openspec/project.md:4-9` describe PI-CORE / B-stacks | `[V]` `openspec/changes/` (raíz) → `ls -la` devuelve solo `.` y `..`. Las 27 specs se escribieron de una vez y nunca se revisaron por el cauce `proposal→specs→design→tasks→archive` | Decidir si la raíz es un proyecto OpenSpec vivo (abrir changes para lo que se modifique) o un diseño congelado (y entonces no llamarlo "canónico" ni usar `openspec validate` como gate) |
| A-12 | Expediente E-031…E-046 (16 entradas) | **Nunca escritas** | `[V]` Norma de la casa `docs/docs-expe/00-EXPEDIENTE-DE-OBRA.md:13` "**Todo cambio se apunta aquí antes de considerarse hecho**" | `[V]` `grep -oE "E-0[0-9][0-9][a-z]?"` sobre el fichero → E-001, E-015, E-017…E-030, E-047. **Ningún E-031…E-046.** Recorridas las 17 revisiones git del fichero: 0 apariciones en todas. Pero `git log --all` sí contiene E-031…E-043, E-043b, E-044, E-045, E-046 (17 identificadores de commit) | Reconstruir desde `git log` + artefactos citados por cada commit (acta, project-status, changes archivados), **o** declarar formalmente en el expediente que el tramo se perdió. Afecta a las decisiones más delicadas: retiro del soak, NO-GO de Rust, degradación G5, retiro del log de auditoría |

### 2.2 Intervenciones arquitectónicas D01–D11 (todas con defecto verificado vivo en el código)

Plan: `[V]` `src/pi-account-router/docs/audit-2026-10-18/arquitectura-ecosistema/08-delta-recomendado.md:3` "**cambios de producto no aplicados ni ratificados**" · Autorización vigente `src/pi-account-router/HANDOFF.md:9-10` "Autorización: investigar, documentar y proponer; **no implementar ni reorganizar componentes**" · El directorio completo está **fuera de git** (`?? …/arquitectura-ecosistema/` en `00-ALCANCE-Y-METODO.md` §3.1).

| # | Ítem | Estado | Evidencia del plan | Evidencia de implementación | Qué falta exactamente |
|---|---|---|---|---|---|
| A-13 | **D02** Ámbito de datos en el puerto de almacenamiento, no solo en search | **Planificado · defecto confirmado vivo** | `[V]` `08-delta:…§3 D02` cita `M/memory-control.ts:136–163`: "get/forget por ID delegan sin comprobarlo. V02 devuelve/invalida B desde A" | `[V]` Código actual sin corregir: `src/pi-memory/src/memory-control.ts:136-138` `get(id) { return this.backend.get(id); }` — sin tenant ni scope. `:162-164` `forget(id) { return this.backend.invalidate(id); }` — igual. Contraste: `search`/`nearest` sí aplican `prefix = this.tenant ? …` (`:143-144`) | Backend acotado al tenant de contexto confiable; aplicar ámbito a `get`, `invalidate`, snapshots, checkpoints, mantenimiento, import y replay. **Fuga entre tenants confirmada en el árbol actual** |
| A-14 | **D01** Una frontera de escritura efectiva para memoria | Planificado · defecto confirmado vivo | `[V]` `08-delta §3 D01`: "`M/memory-gateway.ts:42` llama a Control; `M/hooks.ts:100` reconstruye vía Control; `M/plane.ts:74` escribe directamente en Store" | `[V]` Siguen caminos separados: `memory-gateway.ts:42` → `control.save(…)`; `plane.ts:65-77` (`flushBeforeCompact`) → `core.memory.flush(…)`. Ni uno ni otro pasa por Fabric | Enrutar todas las mutaciones (save, revisión/merge, invalidación, reconstrucción de sesión, flush, consolidación, olvido) por el servicio de comandos de Fabric |
| A-15 | **D07** Presupuestar el texto real, conservando el algoritmo | Planificado · defecto confirmado vivo | `[V]` `08-delta §3 D07`: "se empaqueta con coste de summary+ID pero se emiten también título, kind y cabecera. V05: presupuesto 32→1016 unidades del propio estimador" | `[V]` `src/pi-intermediate/src/token-ring.ts:22-24` sigue siendo `estimateTokens = Math.max(1, Math.ceil(text.length / 4))`. No existe una función única de render compartida entre estimación y emisión | Una única función de render de item compartida; reservar cabecera/separadores y espacio de salida; presupuesto cero → no inyectar. **Conservar** `packKnapsack` (`:156-203`, knapsack 0/1 exacto) y `mmrSelect` (`:212`), que el delta declara correctos |
| A-16 | **D05** Proteger exactamente los datos que se pretende autenticar | Planificado | `[V]` `08-delta §3 D05`: "V01 demuestra campos fuera del hash, firma eliminable y sufijo borrable; V04 permite cambiar locator/confidence. La clave de memoria reside por defecto en la misma DB (`M/memory-stack.ts:19–25`)" | `[V]` `src/pi-memory/src/memory-signer.ts` y `memory-stack.ts:19-25` existen; no se verificó la corrección del payload firmable | Versionar el objeto firmable del ledger; modo `signature-required` sin ambigüedad; payload de CanonClient con locator y confidence; signer/trust port fuera de la DB editable; ancla de cabeza/checkpoint custodiada fuera del almacén |
| A-17 | **D03** Unidad de trabajo real, incluidos efectos del Store | Planificado | `[V]` `08-delta §3 D03`: "Fabric guarda vista y luego append; Store invalida topic antes de insertar. V03 deja fila/FTS/vector huérfanos o una revisión invalidada tras un fallo" | `[V]` `src/pi-memory/src/fabric.ts` y `db.ts` (288 líneas, SQLite FTS5 + journal en cadena de hashes) existen; la atomicidad no se verificó por ejecución (mandato read-only) | Transacción/savepoint sobre la misma conexión para revisión previa, memoria nueva, FTS, vector, evento e idempotencia. En backend remoto, capacidad equivalente o protocolo de conciliación explícito |
| A-18 | **D04** Replay semántico, validado y limitado antes de reemplazar datos | Planificado | `[V]` `08-delta §3 D04`: "`M/fabric.ts:208–227` interpreta saves/forgets parciales y hace `replaceAll`. V12 borra un record de gateway y reactiva una revisión sustituida" | `[V]` No corregido (el delta no se aplicó) | No habilitar reemplazo destructivo hasta cobertura completa; partir de checkpoint validado; detener antes de borrar ante historial parcial/corrupto/esquema desconocido |
| A-19 | **D06** Recibo de verificación ligado siempre al sujeto evaluado | Planificado | `[V]` `08-delta §3 D06`: "V10: sin `files`, dos artefactos diferentes comparten hash y payload de firma de VerificationFacade. `artifactHash` queda en metadata fuera de los hechos firmables" | `[V]` `grep -rln "VerificationFacade\|Dementor" src/*/src` → **0 ficheros**. El componente no existe en `PI-agent` | Todo recibo declara sujeto y alcance (digest de paquete o de artefacto con tipo explícito); campo obligatorio o rechazo; versionar schema de recibo |
| A-20 | **D08** Candidatos independientes y un solo rerank final | Planificado | `[V]` `08-delta §3 D08`: "la supuesta señal densa de RetrievalFabric reordena el shortlist léxico… Fabric usa Control.search, que puede rerankear, y luego rerankea otra vez con el mismo proveedor" | `[V]` `src/pi-memory/src/retrieval-fabric.ts` (232 líneas) existe; no corregido | Puertos acotados de candidatos léxicos/vectoriales/entidad; unión por ID, RRF y **un** rerank final; no recorrer `store.all()` sin límites |
| A-21 | **D09** Adaptadores y obligatoriedad de controles según garantía, no reputación | Planificado | `[V]` `08-delta §3 D09`: "score inicial fijo ELITE deja fuera SCOPE; facts SDD/AV/premises no se alimentan y no hay user_bash en ese entrypoint" | `[V]` `src/pi-intermediate/src/hard-gates.ts` (82 líneas, fail-closed, lista `DESTRUCTIVE` `:13-14`) existe; la obligatoriedad por garantía no se verificó | Normalizar herramientas/argumentos en el adapter; scope obligatorio independientemente del score donde se prometan límites de workspace; exigir facts/readiness antes de anunciar gates activos |
| A-22 | **D10** Corregir y certificar los adapters de sandbox existentes | Planificado | `[V]` `08-delta §3 D10`: "GondolinProvider, SrtProvider, SeatbeltProvider y BwrapProvider ya están implementados. V09 verifica construcción de Gondolin y observa que **Bwrap no monta el workdir solicitado**" | `[V]` Los 5 providers existen en `src/pi-intermediate/src/sandbox.ts` (372 líneas): `NoneProvider:53`, `BwrapProvider:63`, `SeatbeltProvider:100`, `SrtProvider:175`, `GondolinProvider:258`. **Implementados, no certificados** | Que cada proveedor represente de verdad cwd/mounts/readonly/red y devuelva "no soportado" si no puede; plan de mounts en bwrap derivado del perfil; probar la versión real del CLI antes de habilitarlo |
| A-23 | **D11** Frontera pública de paquete y composición ligera, sin nuevos paquetes | Planificado | `[V]` `08-delta §3 D11`: "una ACL centraliza los deep imports, pero sigue resolviendo por layout físico. V11 confirma que el nombre de dependencia público ya resuelve localmente" | `[V]` `src/pi-memory/package.json:23` declara `@earendil-works/pi-coding-agent: 1.3.0`; la dep `file:../pi-intermediate` está documentada como no portable por diseño (`01-PLAN-REMEDIACION.md` WP-4.5) | Usar el entrypoint público de `@pi-agent/intermediate` desde la ACL; evaluar host como peer opcional; decidir y probar salida JavaScript o loader soportado para consumidores |

### 2.3 Decisiones del propietario que bloquean trabajo (ninguna con fecha)

| # | Ítem | Estado | Evidencia del plan | Evidencia de implementación | Qué falta exactamente |
|---|---|---|---|---|---|
| A-24 | **Decisión (a)** — Soak multidía G7 | **Bloqueado** | `[V]` `acta-cierre-2026-10-18.md:23` "**PENDIENTE de decisión (a)**… Protocolo congelado en el design de `g7-soak-plan-final-acta`" | `[V]` Runner y evidencia **retirados por orden del propietario** (E-044, `38dc122`): `ls scripts/soak.ts` → inexistente; `ls -d docs/soak-2026-10-18` → inexistente. El acta lo declara: "**no hay soak ejecutado ni evidencia de soak**" | Decisión binaria del propietario. Consecuencia abierta: `src/pi-account-router/HANDOFF.md:34-36` "**Causa exacta del corte histórico de Agnes: NO identificada.** Solo el soak bajo carga real (decisión (a)) podría confirmarla o descartarla" |
| A-25 | **Decisión (b)** — Suite de regresión persistente | Bloqueado | `[V]` `acta:58` "E-020 mantiene sin tests; decisión (b) pendiente" | `[V]` `src/pi-memory/src/regression.ts` y `benchmark.ts` **existen y se exportan** (`index.ts:35,37`) pero **ningún `package.json` tiene script que los invoque**: `grep -rn "regression\|benchmark" --include=package.json .` → 0 resultados. Ambos paquetes solo declaran `"typecheck": "tsc --noEmit"` | Decisión del propietario (E-020 fue "no quiero tests"). Mientras, `regression.ts`/`benchmark.ts`/`eval.ts` son **código huérfano**: compilable, nunca ejecutado, sin runner y sin CI (casa local-only, E-028) |
| A-26 | **Decisión (c)** — Binario de verificación Rust/QuickJS | Bloqueado | `[V]` `acta:56-57` "Rust/QuickJS: no ejecutado (NO-GO, G6); cualquier binario de verificación requiere decisión (c)" | `[A]` G6 cerrado como NO-GO: "matriz 16 celdas… **0 celdas verificadas** (solo CLAIMED/UNKNOWN)" (commit `1024955`, E-042) | Decisión del propietario. Node queda como runtime único soportado; modo mixto rechazado explícitamente |
| A-27 | **Decisión (d)** — Enfoque del log de auditoría inmutable | Bloqueado | `[V]` `acta:52` "El log de auditoría que acompañó a ese change se **retiró por orden del propietario** (no pedido, y no se quiere JSON)… la elección pasa a ser la decisión (d)" | `[V]` Implementado en E-045 y retirado en E-046 (`855afc9`). La investigación alternativa **sí existe**: `src/pi-account-router/research/logs-estandar-inmutable-investigacion.md`, 11 044 bytes (macOS WORM `chflags uappend`, `node:sqlite`, RFC 5424/6962/SLSA/Rekor) | Decisión del propietario entre los enfoques investigados. Nota: el fichero de investigación está **modificado sin commitear** (`M` en el manifiesto §3.1) |

### 2.4 Duplicidad y desconexión entre los dos repos

| # | Ítem | Estado | Evidencia del plan | Evidencia de implementación | Qué falta exactamente |
|---|---|---|---|---|---|
| A-28 | **M23** Elegir frontera OS (usuario dedicado o VM/sandbox) y red; ensayar denegación de egress | **Planificado · ya resuelto en el otro repo** | `[V]` `PLAN-SERIAL:54` | `[V]` `PI-agent` ya lo tiene: `openspec/specs/os-sandbox/spec.md` (12 requisitos) + `src/pi-intermediate/src/sandbox.ts` (372 líneas, 5 providers: None/Bwrap/Seatbelt/Srt/Gondolin) + prueba física G3 "48 aserciones de probe" (`src/pi-account-router/HANDOFF.md:14-16`) `[A]` | Decisión de reutilización. `pi-arnes` planifica desde cero una viabilidad que `PI-agent` ya ejecutó — y **ninguno de los dos repos referencia al otro**: `grep -rn "PI-agent\|pi-account-router\|pi-intermediate\|pi-memory"` en O3 → **0 coincidencias**; `grep -rn "pi-arnes\|ALBERTO\|documental-privado"` en O2 → **0 coincidencias** |
| A-29 | **M22** Perfil Pi aislado y launcher fijado; prohibir carga global de extensiones/skills/credenciales | Planificado · solapado | `[V]` `PLAN-SERIAL:53` | `[V]` `src/pi-intermediate/src/hard-gates.ts:1-4` "Bloquean ANTES de ejecutar (hook tool_call / user_bash) y nunca permiten en caso de error"; `openspec/specs/hard-gates/spec.md` (2 requisitos, fail-closed) | Idem A-28: documento de decisión sobre reutilización |
| A-30 | **M44** Interfaz Pi con tools estrechas (`inspect_case`, `propose_redactions`, `review_queue`, `request_export`), "nunca shell libre en producción" | Planificado · solapado | `[V]` `PLAN-SERIAL:85` | `[V]` `hard-gates.ts` lista `DESTRUCTIVE` (`:13-14`, `rm -rf`/`sudo rm`) + `bash-ops.ts` (150 líneas) | Idem A-28 |
| A-31 | **M37** Detección candidata PII (reglas/NER/barcodes) | Planificado · solapado | `[V]` `PLAN-SERIAL:73` | `[V]` `src/pi-intermediate/src/governance.ts:32` (`detectInjection`), `:36` (`redact`) | Idem A-28 |

---

## 3 · BLOQUE MEDIO — los 60 movimientos de `pi-arnes` ítem por ítem

Plan: `[V]` `PLAN-SERIAL-OPENSPEC.md`. Evidencia de estado: `[V]` `EXECUTION-STATE.yaml:5,16-20` + `work/2026-09-28-respuestas-usuario.md:4` + `HANDOFF.md:3`.
**Regla del plan** (`PLAN-SERIAL:8`): "`PENDIENTE` → `EN CURSO` → `VERIFICADO` o `BLOQUEADO`. Un paso `VERIFICADO` exige artefacto, prueba/inspección y revisión registrada; no vale «el modelo dijo que sí»".
**Evidencia de implementación para M07–M59 (53 movimientos):** `[V]` idéntica en todos — sin `.git`, sin `openspec/`, **0 ficheros de código** en los 15 ficheros de O3. No se repite fila a fila.

### Etapa A — intención, alcance y puertas (M00–M07)

| # | Mov. | Plan (`ruta:línea`) | Estado | Evidencia de implementación | Qué falta |
|---|---|---|---|---|---|
| M-00 | **M00** Leer HANDOFF, investigación y plan; comprobar rutas | `PLAN-SERIAL:19` | **VERIFICADO** | `[V]` `EXECUTION-STATE.yaml:16` "M00 verificado en lectura (team-dev, 2026-09-28): 60/60 movimientos M00–M59 contiguos; gates G0–G6; sin .git ni openspec/; rename JESUS→ALBERTO completo" | — (único movimiento cerrado de los 60) |
| M-01 | **M01** Confirmar usuarios, destinatarios y finalidad por tipo de copia | `:20` | **EN CURSO** | `[V]` `respuestas-usuario:4` "M01 recibido (matriz v0.1 abajo)"; matriz de 5 audiencias en `:16-22`, marcada "borrador; sensibilidad y revisión por confirmar" | Validar la matriz (sensibilidad y revisión por confirmar). Es decisión abierta nº 2 de `respuestas-usuario:64-67` |
| M-02 | **M02** Confirmar política geográfica/temporal y qué conservar para comprender el caso | `:21` | **BLOQUEADO por el usuario** | `[V]` `respuestas-usuario:4` "**M02 diferido por el usuario**"; `EXECUTION-STATE.yaml:23` `geographic_and_temporal_preservation_policy` en `pending_user_decisions` | Decisión del usuario, sin fecha. **Bloquea en cascada** M36-M38 (políticas de censura por lugar/fecha) y M52 (búsqueda de centinelas). El plan es serial y no admite saltarlo (`:5`) |
| M-03 | **M03** Confirmar modos: solo lectura/análisis, testado, exportación, divulgación | `:22` | **EN CURSO** | `[V]` `respuestas-usuario:4` "M03 recibido"; detalle en `:29-33`: censura "uno a uno", exportación autoridad única del usuario, fase inicial solo lectura | Cerrar el modo "divulgación": `respuestas-usuario:12` "Sin plan de difusión definido ('ya veré qué hago')" |
| M-04 | **M04** Inventariar hardware, macOS, almacenamiento, red, volumen/tipos **sin leer expedientes** | `:23` | **EN CURSO (parcial)** | `[V]` `respuestas-usuario:4` "M04 cumplido en la parte local"; inventario en `:45-48`: MacBook Pro 18,2 M1 Max 10 núcleos / 32 GB / macOS 27.2; Mac mini = `local-server`; volumen ">400 documentos, creciendo" (`:39`) | Falta el inventario del Mac mini (16 GB) y el desglose de **tipos** de documento. La parte remota quedó fuera de alcance por corrección del usuario (`:61`) |
| M-05 | **M05** Delimitar exclusiones: diagnóstico, tratamiento, representación legal, validez de firma, anonimato absoluto | `:24` | **EN CURSO** | `[V]` `respuestas-usuario:4` "M05 reformulación positiva **pendiente de redacción final**"; objetivo reformulado por el usuario en `:26`; barandillas en `:28` | Redacción final y validación por el usuario (paquete G0). El diseño v0.1 ya las recoge en §1 (`design:11-16`) y §8 (`:127`), pero sin acta de aprobación |
| M-06 | **M06** Presentar 2–3 arquitecturas, riesgos y recomendación | `:25` | **EN CURSO** | `[V]` `respuestas-usuario:4` "M06 en preparación". Existe una comparativa de 3 opciones en `SYNTHESIS-PROVISIONAL.md:16-22` (Solo Pi / Pi+núcleo externo / Varios arneses) con veredicto provisional | No pude determinar si esa tabla satisface M06 (ver Laguna 3 de A3). Falta presentarla al usuario como comparación de enfoques con costes |
| M-07 | **M07 / G0** Aprobación explícita de intención y dirección arquitectónica | `:26` | **Planificado · puerta sin acta** | `[V]` Sin registro de aprobación. `HANDOFF.md:3` dice "diseño/implementación **NO aprobados**"; `EXECUTION-STATE.yaml:8` dice `gate_status: user_delegated_2026-09-28` | Respuesta inequívoca del usuario **o** acta de que G0 queda delegada al equipo. La contradicción entre ambos ficheros no está resuelta (H-3) |

### Etapa B — formalización OpenSpec, sin código (M08–M20)

| # | Mov. | Plan | Estado | Evidencia de implementación | Qué falta |
|---|---|---|---|---|---|
| M-08 | **M08** Diseño por secciones: límites de confianza, datos, estados, perfiles, UX, fallos, privacidad | `:32` | **Planificado** (hecho de facto, sin acta) | `[V]` `docs/superpowers/specs/2026-09-28-alberto-documental-design.md` existe (140 líneas) y cubre las 7 secciones | El artefacto existe pero **no consta la revisión sección por sección** que M08 exige como cierre |
| M-09 | **M09 / G1** Aprobación del diseño completo | `:33` | Planificado · puerta sin acta | `[V]` Sin registro. `EXECUTION-STATE.yaml:26` advierte "Do not infer a gate approval from the user's approval of research or folder creation" | Aprobación explícita del usuario |
| M-10 | **M10** Escribir spec arquitectónica formal en `docs/superpowers/specs/YYYY-MM-DD-…` | `:34` | **Planificado** (hecho de facto) | `[V]` El fichero existe en la ruta exacta que M10 prescribe | Falta verificar los requisitos de cierre de M10: diagramas de flujo/estados, amenazas y criterios. El diseño tiene un diagrama ASCII (`design:33-46`) y §5 de privacidad, pero **no tiene diagrama de estados formal ni sección de amenazas** |
| M-11 | **M11** Auto-revisar spec con matriz intención→requisito y revisor adversarial | `:35` | Planificado | `[V]` No existe ninguna matriz intención→requisito en O3 | La matriz y la revisión adversarial; ambigüedades resueltas o marcadas `OPEN` |
| M-12 | **M12 / G2** Aprobación del archivo de spec | `:36` | Planificado · puerta sin acta | `[V]` Sin registro | Aprobación explícita del archivo y versión |
| M-13 | **M13** Revisar `openspec 1.9.0` y su schema; ADR de decisión | `:37` | Planificado | `[V]` No existe ningún ADR en O3. (`PI-agent` sí tiene 4 ADRs en `src/pi-account-router/docs/adr/`, no referenciados) | ADR con comandos/versiones y razón |
| M-14 | **M14** Inicializar OpenSpec y crear el primer change | `:38` | Planificado | `[V]` `openspec_status: not_initialized` (`EXECUTION-STATE.yaml:10`); `ls -d openspec` → inexistente | `openspec init` en la raíz correcta. **Bloqueado** por `HANDOFF.md:4` ("No ejecutar `openspec init` antes de aprobación del diseño") → depende de G1/G2 |
| M-15 | **M15** `proposal.md` de `bootstrap-private-harness` | `:39` | Planificado | `[V]` Inexistente | Ver A-1 |
| M-16 | **M16** `specs/` con capacidades y escenarios `WHEN/THEN`; cada `REQ` con ≥1 `SCN`, oráculo y caso negativo | `:40` | Planificado | `[V]` Inexistente. No hay ningún `REQ-xxx` ni `SCN-xxx` redactado en O3 | Toda la especificación ejecutable. Es lo que `EXECUTION-STATE.yaml:6` declara como `next_movement` |
| M-17 | **M17** `design.md`: contratos API, almacenes, máquina de estados, frontera Pi↔núcleo, transacciones, revocación | `:41` | Planificado | `[V]` Inexistente como artefacto OpenSpec (el diseño v0.1 es previo y no tiene contratos API ni revocación) | Contratos API y política de revocación; decisiones alternativas con costes explícitos |
| M-18 | **M18** `tasks.md` ejecutable y granular, cada tarea enlazada a `REQ/SCN` | `:42` | Planificado | `[V]` Inexistente | Sin M16 no hay `REQ/SCN` que enlazar → dependencia dura |
| M-19 | **M19** Ejecutar `openspec status`, `show`, `validate`; revisar trazabilidad | `:43` | Planificado | `[V]` Imposible sin M14 | Validación sin errores y evidencia sin PII |
| M-20 | **M20 / G3** Revisión del usuario de proposal/specs/design/tasks y método de ejecución | `:44` | Planificado · puerta sin acta | `[V]` Sin registro | Aprobación explícita. **Sin G3 no se crea código, ni se instalan paquetes ni modelos** |

### Etapa C — viabilidad y perímetro, solo fixtures sintéticos (M21–M29)

| # | Mov. | Plan | Estado | Evidencia de implementación | Qué falta |
|---|---|---|---|---|---|
| M-21 | **M21** Repo Git + estructura mínima + `.gitignore` + fixture sintético | `:52` | Planificado | `[V]` Sin `.git`, sin `.gitignore`, sin fixtures | **Bloqueante raíz** de 53 movimientos (ver C-4) |
| M-22 | **M22** Perfil Pi aislado y launcher fijado | `:53` | Planificado · solapado con `PI-agent` | `[V]` Ver A-29 | Inventario efectivo de recursos cargados; prueba explícita de flags `-e`/`--skill` |
| M-23 | **M23** Frontera OS y red; ensayar denegación de egress | `:54` | Planificado · **ya resuelto en `PI-agent`** | `[V]` Ver A-28 | Canary de red local/remota y acceso fuera de ámbito; "registrar efectos, no exit codes" |
| M-24 | **M24** Fixture Pi **G01–G12**: RPC `bash`, TUI `!`, `user_bash`, extensiones explícitas, tool set dinámico, sesiones, concurrencia | `:55` | Planificado | `[V]` `wave-2-pi-gates.md:9-11` "un fixture sintético **debe** comprobar RPC `bash`, TUI `!`, extensiones explícitas… Casos G01–G12 en el informe del investigador, con la interacción exacta entre `--no-tools` y `setActiveTools()` **sin confirmar**" | Los 12 casos ejecutados con tabla PASS/FAIL. Criterio de aceptación: "estado de archivos y hashes, estado del núcleo y egress, **no** la respuesta textual ni el exit code". **Un bypass bloquea el avance** |
| M-25 | **M25** Pi↔servidor MLX Qwen3.5: tool-call/no-stream/SSE/cancelación/continuación; GGUF si falla | `:56` | Planificado | `[V]` `wave-2-local-models.md:3` "Esto **no demuestra** compatibilidad end-to-end de Qwen3.5+Pi; exige prueba de llamada a herramienta sintética, continuación, cancelación y herramientas paralelas" | Trazas sintéticas de ida/vuelta sin llamadas duplicadas ni herramientas con efectos |
| M-26 | **M26** Arranque/carga secuencial/descarga de modelos en ambas máquinas | `:57` | Planificado | `[V]` `coverage-matrix.md:9` "evidencia empírica en los Macs objetivo… siguen abiertos" | RSS, `memory_pressure`, swap, latencia, tokens/s, memoria tras `/unload`. **Fallo si swap sostenido o truncamiento** |
| M-27 | **M27** Pipeline PaddleOCRVL+MLX y testigo Tesseract con 5 páginas sintéticas | `:58` | Planificado | `[V]` `wave-2-document-pipeline.md:3` "M4 fue verificado; **M1/M2 no**" | Transcripción, orden, bbox, transformaciones, omisiones, tiempo/página **en M1 y MacBook** |
| M-28 | **M28** Licencia de PyMuPDF y pesos/datasets; escoger motor PDF aprobado | `:59` | Planificado | `[V]` `wave-1-document-pipeline.md:13` "PyMuPDF tiene licencia AGPL o comercial: **decisión pendiente** por uso previsto"; `respuestas-usuario:37` "impacto AGPL/comercial de PyMuPDF pendiente de M28" | Registro de licencia, versión, restricciones y alternativa; revisión jurídica si corresponde |
| M-29 | **M29 / G4** Revisar viabilidad técnica y privacidad antes de construir el núcleo | `:60` | Planificado · puerta sin acta | `[V]` Depende de M21–M28, todos pendientes | Aprobación humana de resultados o cambio de diseño. **Ningún expediente real** |

### Etapa D — núcleo documental deterministic-first (M30–M43) · 14 movimientos, todos pendientes

| # | Mov. | Plan | Estado | Qué falta |
|---|---|---|---|---|
| M-30 | **M30** Modelo de caso y máquina de estados (`imported→parsed→policy_ready→reviewed→approved→exported→verified`) | `:66` | Planificado | Todo. Requiere G4 + specs. Nota: el diseño v0.1 usa una cadena **distinta** (`design:99` "importado → digitalizado → política lista → revisado → aprobado → exportado → verificado") — divergencia de nomenclatura sin resolver entre plan y diseño |
| M-31 | **M31** Almacén de originales inmutables lógicos, hash, permisos, copias de trabajo | `:67` | Planificado | Todo. Invariante: "Original no cambia tras parse/export/fallo" |
| M-32 | **M32** Inventario de PDF: páginas, texto, imágenes, capas OCR, metadatos, formularios, adjuntos, firmas, QR/barras | `:68` | Planificado | Todo. "Ningún canal ignorado silenciosamente" |
| M-33 | **M33** Registro canónico de bloques con coordenadas, transformaciones, motor y confianza | `:69` | Planificado | Todo. Esquema mínimo ya diseñado en `wave-2-document-pipeline.md:9` |
| M-34 | **M34** OCR/layout como adaptador sustituible; el modelo no decide exportación | `:70` | Planificado | Todo. Solapado con `tools/ocr/ocr.sh` de `PI-agent` `[A]` |
| M-35 | **M35** Corrección humana del OCR con historial de revisiones | `:71` | Planificado | Todo |
| M-36 | **M36** Políticas tipadas por persona/rol/dato/contexto/audiencia/lugar/fecha | `:72` | Planificado · **bloqueado por M02** | Todo, y depende de la política geográfica/temporal que el usuario difirió (M-02) |
| M-37 | **M37** Detección candidata PII (reglas/NER/barcodes) y resolución contextual | `:73` | Planificado | Todo. Ver A-31 (solapado con `governance.ts`) |
| M-38 | **M38** Preview lado a lado y aprobación explícita según granularidad acordada | `:74` | Planificado · **bloqueado por decisión abierta** | Todo. La granularidad (por censura / página / documento) es decisión abierta nº 3: `SYNTHESIS-PROVISIONAL.md:61` |
| M-39 | **M39** Vista Markdown privado solo desde bloques canónicos | `:75` | Planificado | Todo |
| M-40 | **M40** Representación censurada independiente y Markdown público desde ella | `:76` | Planificado | Todo. Invariante P4: "jamás desde el privado" |
| M-41 | **M41** PDF público como derivado testado; OCR final desde la imagen ya testada | `:77` | Planificado · **bloqueado por M28** | Todo, y el motor PDF depende de resolver la licencia de PyMuPDF (M-28) |
| M-42 | **M42** Verificador independiente: texto, render, objetos, metadatos, adjuntos, QR, nombres, logs, índices | `:78` | Planificado | Todo. Los 11 canales ya enumerados en `SYNTHESIS-PROVISIONAL.md:44` |
| M-43 | **M43** Exportación atómica, manifest de procedencia, retención/borrado controlados | `:79` | Planificado | Todo |

### Etapa E — perfiles y modelos (M44–M49)

| # | Mov. | Plan | Estado | Qué falta |
|---|---|---|---|---|
| M-44 | **M44** Interfaz Pi con tools estrechas; nunca shell libre en producción | `:85` | Planificado | Ver A-30 |
| M-45 | **M45** Perfil documentalista | `:86` | Planificado | Todo |
| M-46 | **M46** Perfil jurídico España | `:87` | Planificado | Todo. El diseño v0.1 lo **descompone en 3** (`design:66-68`: Procesal ES, Procesal SK, Estrasburgo) — divergencia plan↔diseño sin resolver |
| M-47 | **M47** Perfil médico documental | `:88` | Planificado | Todo |
| M-48 | **M48** Subperfiles SDRC/Sudeck y psiquiatría | `:89` | Planificado | Todo |
| M-49 | **M49** Evaluar modelos candidatos y elegir por tarea y máquina | `:90` | Planificado | Benchmarks locales, licencia, RAM, calidad española. Los 8 candidatos ya tabulados en `wave-1-hf-models.md:7-16`, **ninguno seleccionado** |

### Etapa F — adversarial, piloto, publicación controlada (M50–M59)

| # | Mov. | Plan | Estado | Qué falta |
|---|---|---|---|---|
| M-50 | **M50** Corpus sintético adversarial (imagen compartida, OCR invisible, QR/PDF417, firma real, foto oblicua, cuasiidentificación, prompt injection) | `:96` | Planificado | Los 7 canales ya especificados en `SYNTHESIS-PROVISIONAL.md:54` |
| M-51 | **M51** unit/integration/E2E, fuzzing de PDF/política, concurrencia y estados | `:97` | Planificado | Todo. Criterio: "cero fallos P0/P1" |
| M-52 | **M52** Revisor independiente intenta extraer centinelas | `:98` | Planificado · **bloqueado por M02** | Todo. Depende de la política geográfica/temporal diferida |
| M-53 | **M53** Ensayo de red OS, credenciales, perfil Pi, egress, temporales, logs, índices, backups | `:99` | Planificado | Todo |
| M-54 | **M54** Auditoría de usabilidad | `:100` | Planificado | Todo. Criterio: "sin botones que aparenten «anonimato garantizado»" |
| M-55 | **M55 / G5** Puerta para piloto con **documentos reales** | `:101` | Planificado · **reservada al usuario** | `[V]` `EXECUTION-STATE.yaml:12` `real_documents_status: prohibited_until_user_authorizes`. Esta puerta **no** fue delegada (`:29`) |
| M-56 | **M56** Piloto de alcance mínimo, local y supervisado | `:102` | Planificado | Todo |
| M-57 | **M57** Corregir divergencias por nuevo change OpenSpec y revalidar | `:103` | Planificado | Todo |
| M-58 | **M58 / G6** Decidir despliegue personal, límites y revisión periódica | `:104` | Planificado · **reservada al usuario** | Aprobación humana de versión, hardware, destinatarios y riesgo residual |
| M-59 | **M59** Archivar changes, actualizar specs vigentes, entregar manual/handoff operativos | `:105` | Planificado | `openspec validate`, estado limpio, trazabilidad `REQ→SCN→test→evidencia`. **Nótese:** es exactamente el paso que `PI-agent` tiene pendiente en A-9/A-10 |

---

## 4 · BLOQUE MEDIO — piezas del diseño v0.1 (34 ítems, todos planificados)

Plan: `[V]` `docs/superpowers/specs/2026-09-28-alberto-documental-design.md`. Implementación: `[V]` **0 ficheros de código en O3** para los 34.

| # | Grupo | Ítems | Plan | Estado | Qué falta |
|---|---|---|---|---|---|
| D-1…7 | **7 módulos del núcleo** | Ingesta · Inventario · OCR y estructura · Registro de bloques · Comprensión · Política y censura · Export y verificación | `design:54-62` | Planificado ×7 | Todo. Son la tabla §4.1 del diseño; ninguno tiene `REQ`/`SCN` ni código |
| D-8…16 | **9 agentes** | Coordinador · Documentalista · Procesal ES · Procesal SK · Estrasburgo · Médico · Asistencial · Investigador · Verificador | `design:62-74` | Planificado ×9 | Todo. Cada uno tiene su límite declarado ("No ejecuta exportaciones", "No decide censura", "No representa", "No diagnostica ni trata", "No sustituye a profesionales", "Solo con citas verificables", "Puede vetar una exportación") — ninguno existe |
| D-17…26 | **10 skills** | `cronología-del-caso` · `taxonomía-documental` · `procedimiento-españa` · `procedimiento-eslovaquia` · `estrasburgo` · `cronología-clínica` · `sdrc-psiquiatría` · `política-de-censura` · `cola-de-revisión` · `export-verificado` | `design:76-87` | Planificado ×10 | Todo. El diseño dice "catálogo que se irá forjando" y "Cada skill vive en el catálogo canónico del usuario: única, verificada, sin duplicados" (`~/.agents/skills`). **No verifiqué el catálogo canónico** — fuera del alcance de este anejo (corresponde a A1) |
| D-27…34 | **8 tools MCP** | `inspect_case` · `search_blocks` · `timeline_view` · `entity_view` · `propose_redactions` · `review_queue` · `request_export` · `verify_export` | `design:89-95` | Planificado ×8 | Todo. Reglas del diseño: "toda acción pedida por un agente se revalida en el núcleo; nada de shell libre en producción; la memoria del sistema se mantiene separada del contenido del expediente" |
| D-35…39 | **5 fases de construcción** | 1 Comprensión · 2 Documental pleno · 3 Censura y copias · 4 Perfiles completos · 5 Endurecimiento | `design:127-135` | Planificado ×5 | Todo. §10 (`design:137-140`) declara el punto de parada: "**Siguiente: especificaciones ejecutables y primeras piezas del núcleo, con material sintético**" |

> **Nota de prioridad.** `respuestas-usuario:12-14` registra la **primera necesidad declarada por el usuario**: "comprensión del caso — explicar, timeline de procesos, encajar piezas y coordinar la historia — **antes que censura/exportación**". Eso corresponde a la **fase 1** (D-35) y a los módulos "Comprensión" (D-5) y tools `timeline_view`/`entity_view`/`search_blocks` (D-29/30/28). Es el ítem de mayor valor para el usuario y está a **53 movimientos de distancia** en el plan serial, detrás de M02 (bloqueado por el propio usuario) y de toda la etapa B/C.

---

## 5 · BLOQUE MEDIO — pruebas pendientes de la investigación (25 ítems)

| # | Grupo | Ítems | Plan | Estado | Qué falta |
|---|---|---|---|---|---|
| E-1…6 | **6 experimentos que impiden cerrar la investigación** | Fixtures G01–G12 de bypass Pi · Pi→mlx-vlm→Qwen3.5→herramienta ficticia→continuación · PaddleOCR+MLX cuantizado en cada Mac · PDF con imagen compartida/OCR invisible/QR/firma real · Evaluación española ciega de OCR/PII/jurídicos/médicos · Licencia PyMuPDF y de cada peso | `[V]` `SYNTHESIS-PROVISIONAL.md:52-60` §5 "Experimentos que aún impiden cerrar la investigación" | Planificado ×6 | Los 6. El experimento 5 es el más restrictivo: "**sin ella no hay selección SOTA ni despliegue sobre casos reales**" |
| E-7…18 | **12 casos de bypass Pi G01–G12** | RPC `bash` · TUI `!` · `user_bash` · extensiones explícitas · skills explícitas · activación dinámica de herramientas (`setActiveTools`) · sesiones · exportaciones · concurrencia · errores · interacción `--no-tools`×`setActiveTools()` · egress | `[V]` `wave-2-pi-gates.md:9-11`; `PLAN-SERIAL:55` (M24) | Planificado ×12 | Los 12, con aceptación medida en "**estado de archivos y hashes, estado del núcleo y egress**, no en la respuesta textual ni en el exit code". `wave-2-pi-gates.md:11`: "la interacción exacta entre `--no-tools` y `setActiveTools()` **sin confirmar**" |
| E-19…25 | **7 puertas duras P0–P6** | P0 Privacidad · P1 Originalidad · P2 Procedencia · P3 Semántica y privacidad · P4 Exportación · P5 Fuga residual · P6 Médico/jurídico | `[V]` `SYNTHESIS-PROVISIONAL.md:36-42` §4 "Puertas duras que deberán demostrarse" | Planificado ×7 | Demostración de las 7. Son invariantes, no tareas: P4 "PDF público y MD público **solo** desde representación censurada, jamás desde el privado"; P5 "salida falla cerrada si queda PII o hay regiones no inspeccionadas" |

---

## 6 · BLOQUE MEDIO — decisiones abiertas sin dueño ni fecha (11 ítems en O3)

| # | Ítem | Estado | Evidencia del plan | Qué falta |
|---|---|---|---|---|
| F-1 | Destinatarios y finalidad de cada copia | Abierto | `[V]` `HANDOFF.md:31`; `respuestas-usuario:12` "Sin plan de difusión definido ('ya veré qué hago')" | Decisión del usuario. Es la **pregunta prioritaria** de `HANDOFF.md:135-137` |
| F-2 | Granularidad de revisión humana (por censura / página / documento) | Abierto | `[V]` `HANDOFF.md:31`; `SYNTHESIS-PROVISIONAL.md:61` | Decisión del usuario. Bloquea M38 |
| F-3 | Política de preservación de geografía/fechas (= M02) | Abierto | `[V]` `HANDOFF.md:31`; `EXECUTION-STATE.yaml:23` | Decisión del usuario, diferida. Bloquea M36-M38 y M52 |
| F-4 | Chip exacto del MacBook | **Cerrado** | `[V]` `HANDOFF.md:31` lo lista como abierto, pero `respuestas-usuario:46` lo resuelve: "MacBook Pro 18,2 — Apple M1 Max (10 núcleos), 32 GB RAM" | Nada — **`HANDOFF.md:31` está desactualizado**: el dato ya se aportó el mismo día |
| F-5 | Volumen/tipos de documentos | Parcial | `[V]` `respuestas-usuario:39` "más de 400 documentos ya; creciendo" | Falta el desglose de **tipos** |
| F-6 | Firma digital | Abierto | `[V]` `HANDOFF.md:31` | Decisión del usuario. `HANDOFF.md:24` ya advierte "Firma original no se preserva por rehacer la copia" |
| F-7 | Licencias y uso profesional/comercial | Abierto | `[V]` `HANDOFF.md:31`; `respuestas-usuario:37` | Depende de M28 (PyMuPDF AGPL/comercial) |
| F-8 | Umbrales de error y accesibilidad | Abierto | `[V]` `HANDOFF.md:31` | Decisión del usuario |
| F-9 | Sistema de aislamiento elegido | Abierto | `[V]` `HANDOFF.md:31` | Decisión de M23. **`PI-agent` ya tiene 5 providers implementados** (ver A-28) |
| F-10 | `geographic_and_temporal_preservation_policy` | Abierto | `[V]` `EXECUTION-STATE.yaml:23` | Duplicado de F-3 en otra fuente — **misma decisión, registrada dos veces con nombres distintos** |
| F-11 | `case_content_and_strategy_decisions_as_they_arise` | Abierto | `[V]` `EXECUTION-STATE.yaml:24` | Decisión continua del usuario; por diseño no tiene cierre |
| F-12 | **Plazo** *(fuera de cómputo: observación transversal, no ítem planificado)* | **Sin dato** | `[V]` `respuestas-usuario:42` "**Plazo:** sin dato" | Ningún ítem de los 212 tiene fecha objetivo. Es la causa de que no se pueda distinguir "aparcado" de "abandonado" |

> **Nota de duplicación (no descontada del cómputo).** F-3 ≡ M02 ≡ F-10 son **la misma decisión real** —la política geográfica y temporal— registrada tres veces en tres fuentes distintas con tres nombres: `PLAN-SERIAL:21` (M02), `HANDOFF.md:31` ("política de preservación de geografía/fechas") y `EXECUTION-STATE.yaml:23` (`geographic_and_temporal_preservation_policy`). El cómputo de 212 las cuenta como ítems registrados distintos, que es lo que son formalmente; pero al cerrarlas hay **una sola decisión del usuario**, no tres. Es un síntoma menor del mismo patrón que A-28: planificación que se duplica sin referencia cruzada.

---

## 7 · BLOQUE BAJO — lo cerrado, y los residuos

### 7.1 WP-1…WP-6 (6 ítems) — **único plan auditado que está cerrado y verificado**

Plan: `[V]` `docs/audit-2026-10-17/01-PLAN-REMEDIACION.md`. Todos verificados independientemente `[V]`:

| # | Ítem | Estado | Evidencia del plan | Evidencia de implementación |
|---|---|---|---|---|
| G-1 | **WP-1** Revivir las 2 herramientas de seguridad (M-1, m-7) | **Cerrado ✓** | `01-PLAN-REMEDIACION.md` WP-1.1: crear `package.json` raíz `{"name":"pi-agent-house","private":true,"type":"module"}` | `[V]` `PI-agent/package.json` existe con **exactamente** ese contenido. WP-1.2 (guard `existsSync`): `00-INFORME.md` m-7 señalaba `.pi/mcp.json` inexistente; el informe de E-029 lo da por corregido `[A]` |
| G-2 | **WP-2** Gate canónico OpenSpec: particionar el requirement >500 chars de `os-sandbox` (M-4) | **Cerrado ✓** | WP-2 | `[V]` Medido requisito a requisito: el más largo es ahora **371 chars** ("Selección de proveedor por plataforma"); siguen 325, 279, 253, 216. Todos < 500 |
| G-3 | **WP-3** Higiene documental docs↔estado (M-2, M-3, M-5, m-1…m-6) | **Cerrado ✓** | WP-3, tabla de 13 ediciones exactas | `[V]` `README.md:20` y `HANDOFF.md:25` dicen **27** capacidades; `LICENSE` raíz existe (1 875 bytes, decisión D-1(a)); `grep "exam-hall\|per-suite"` → **0 coincidencias** fuera de docs de auditoría; `pi-memory/package.json:25` declara `"typebox": "1.3.27"` |
| G-4 | **WP-4** Reproducibilidad de las 2 libs (M-6) | **Cerrado ✓** | WP-4.1-4.3: declarar `typebox`, añadir devDeps, generar lockfiles | `[V]` `pi-memory/package.json:19-20,25` y `pi-intermediate/package.json:19-20` con `typescript 7.0.2` + `@types/node 26.6.2`; **ambos** `package-lock.json` presentes |
| G-5 | **WP-5** Gate final en un pase | Cerrado `[A]` | WP-5, 8 comandos | `[A]` Declarado "7/7 medido el 17-oct" (`HANDOFF.md:44-46`). **No re-ejecutado**: el mandato prohíbe mutar estado y varios comandos escriben (`dist/`, `.omo/`, cachés) |
| G-6 | **WP-6** Cierre canónico: entry E-029 + commits por WP | **Cerrado ✓** | WP-6, plantilla de entry | `[V]` `00-EXPEDIENTE-DE-OBRA.md:237` "### E-029 · 2026-10-17 · Auditoría 2026-10-17 y remediación (WP-1…WP-4)"; commit `8c42530` |

> **Residuo aceptable.** `grep "23 capacidades"` aún devuelve 3 impactos en `00-EXPEDIENTE-DE-OBRA.md:85,118,254` — menciones históricas dentro de E-020/E-022/E-029. El propio plan las excluye: "solo deben quedar menciones históricas explícitas datadas". Correcto.

### 7.2 Requisitos de spec cuyo componente nombrado no existe en el código

| # | Ítem | Estado | Evidencia del plan | Evidencia de implementación | Qué falta |
|---|---|---|---|---|---|
| H-1 | `CacheAligner` | Planificado · **0 ficheros** | `[V]` `openspec/specs/token-economy-ring/spec.md:8` "### Requirement: CacheAligner (no romper el prefijo KV)" | `[V]` `grep -rl CacheAligner src/*/src` → **0** | O implementar el componente con ese nombre, o reescribir el requisito describiendo la conducta sin nombrar un artefacto inexistente |
| H-2 | `AST CodeCompressor` | Planificado · **contradicho por el código** | `[V]` `token-economy-ring/spec.md:16-19` "enrutar el contenido a un compresor específico: … código (**AST CodeCompressor**)" | `[V]` `token-ring.ts:87-90` hace **lo contrario**: `if (kind === "code") { // Regla de oro: el código nunca se comprime. return { …, saved: 0 }; }` | **Contradicción frontal.** Decidir cuál es la verdad: si la "regla de oro" es la decisión real (y parece deliberada y razonable), el requisito de la spec debe retirarse |
| H-3 | `Kompress-v2` (prosa) | Planificado · 0 ficheros | `[V]` `token-economy-ring/spec.md:16-19` | `[V]` `grep -rl Kompress src/*/src` → **0**. Existe `compressText` (`token-ring.ts:78`), que es un truncado head/tail, no Kompress-v2 | Alinear nombre y conducta |
| H-4 | `RTK` (CLI/logs) | Planificado · 0 ficheros | `[V]` `token-economy-ring/spec.md:16-19` | `[V]` `grep -rl RTK src/*/src` → **0**. Existe `compressLog` (`token-ring.ts:68`) | Alinear nombre y conducta |
| H-5 | `Dementor` / `VerificationFacade` | Planificado · 0 ficheros | `[V]` `openspec/specs/verification-evaluation/spec.md:33` "### Requirement: Required adversarial review" | `[V]` `grep -rln "Dementor\|VerificationFacade" src/*/src` → **0**. El delta D06 los trata como existentes (`08-delta:§3 D06`), lo que sugiere que viven **fuera** de `PI-agent` | Determinar dónde residen y si la spec de la raíz puede exigir algo que no está en el repo |
| H-6 | `ACE` / `LLMLingua-2` / `GEPA` | **Parcial** — solo en comentarios | `[V]` `token-economy-ring/spec.md:37` "Compresión de prompt (ACE + LLMLingua-2)"; `:61` "Optimización de prompts offline (GEPA)" | `[V]` Aparecen únicamente como comentario: `token-ring.ts:470` "Capa 3 — Prompt: compresión task-agnostic (**LLMLingua-2 style**, determinista)"; `:543` "Prompts GOD-level (offline): versionado con eval, promoción y rollback (**GEPA/ACE**)" | Hay implementación inspirada en esas técnicas, pero no las técnicas. La spec las nombra como si fueran el mecanismo; debe decir "estilo LLMLingua-2, determinista" |

> **Contrapunto de equidad (importante).** Sería falso concluir que las 27 capacidades son papel mojado. Verifiqué implementación real y sustancial `[V]`: `sandbox.ts` 372 líneas con 5 providers; `token-ring.ts` 683 líneas con **knapsack 0/1 exacto por programación dinámica** (`:156-203`, incluida la nota de que la reconstrucción con parent-pointer 1D es incorrecta), MMR (`:212`), CCR reversible (`:105-123`), governor (`:234`), `maskProtected`/`unmaskProtected` (`:275,284`), caveman (`:345`); `capability-index.ts` 134 líneas BM25/FTS5; `ingest.ts` 216 líneas con 4 fetchers; `hard-gates.ts` 82 líneas fail-closed; `db.ts` 288 líneas. Totales: **99 ficheros `.ts`, 3 614 LOC en `pi-intermediate`, 6 489 en `pi-memory`**.
>
> El problema no es ausencia de código: es que **la spec y el código divergen sin que ningún gate lo detecte**. `openspec validate --all --strict` valida forma (longitud, estructura de escenarios), no correspondencia con la implementación — por eso la casa puede mostrar "27/27" verde `[A]` y tener a la vez un requisito que el código contradice abiertamente (H-2).

---

## 8 · Resumen ejecutivo de la matriz

**Los 5 ítems planificados más importantes sin implementar**, por impacto:

1. **C-4 / M21 — crear el repo Git de `pi-arnes`.** Es un paso de minutos y bloquea **53 de los 60 movimientos** del plan. Todo lo demás en O3 depende de él.
2. **A-13 / D02 — ámbito de datos en `get`/`forget`.** Defecto de **fuga entre tenants** con evidencia ejecutada (V02), diagnosticado hace 7 días, y verificado como **vivo en el árbol actual** (`memory-control.ts:136-138`, `:162-164`). Es el único ítem de la matriz con implicación de seguridad confirmada en código en producción.
3. **A-24 / decisión (a) — el soak G7.** Es la única vía declarada para identificar la **causa del corte histórico de Agnes**, que sigue "NO identificada". Bloquea además ROI de memoria y L5-C. Runner y evidencia fueron retirados por orden del propietario.
4. **A-12 — las 16 entradas E-031…E-046 nunca escritas.** Rompen la trazabilidad del registro que la propia casa declara canónico, y cubren justo las decisiones más delicadas (retiros por orden del propietario, NO-GO, degradaciones).
5. **A-1…A-8 / M14-M18 — los 8 changes OpenSpec y las specs ejecutables de `pi-arnes`.** Sin ellos no hay `REQ`/`SCN` trazables a prueba, y por tanto ninguna de las 34 piezas del diseño v0.1 (7 módulos, 9 agentes, 10 skills, 8 tools) puede verificarse. Es lo que `EXECUTION-STATE.yaml:6` declara como `next_movement` desde hace 27 días.

**Las 4 contradicciones plan↔repo más graves:**

| # | La documentación afirma | El repo demuestra |
|---|---|---|
| 1 | `EXECUTION-STATE.yaml:4` `current_phase: construccion` | Sin `.git`, sin `openspec/`, **0 ficheros de código**; `last_verified_movement: M00` |
| 2 | `PI-agent/HANDOFF.md:39` "Pendiente: **Ninguno**… no queda finding abierto" | HEAD es 7 días posterior (`7b0e0b3`, E-047) con 2 changes sin archivar, 4 decisiones abiertas, 11 intervenciones sin ratificar y 16 entradas de expediente ausentes |
| 3 | `src/pi-account-router/HANDOFF.md:56` "**Cero changes activos** en `openspec/changes/`" | `ls` devuelve **2** changes activos (2026-10-19 y 2026-10-24), ambos con código en `src/` |
| 4 | `openspec/specs/token-economy-ring/spec.md:16-19` exige "AST CodeCompressor" para el código | `token-ring.ts:87-90` "Regla de oro: **el código nunca se comprime**" y devuelve `saved: 0` |

**Patrón común a las cuatro:** el dato fiable nunca está en el fichero de reanudación, sino en otro sitio (`last_verified_movement`, `acta-cierre-2026-10-18.md`, `ls` del directorio, el código fuente). Los tres ficheros que un agente lee primero para retomar —`EXECUTION-STATE.yaml`, `HANDOFF.md` de la raíz y `HANDOFF.md` del router— son los tres que más desinforman. La auditoría interna de `PI-agent` ya lo había diagnosticado el 2026-10-17 ("SUS DOCUMENTOS VIVOS MINTEN"), se remedio en E-029, y el drift se regeneró en siete días: no es un incidente, es una propiedad del proceso — **los handoff se sellan y no se mantienen**.
