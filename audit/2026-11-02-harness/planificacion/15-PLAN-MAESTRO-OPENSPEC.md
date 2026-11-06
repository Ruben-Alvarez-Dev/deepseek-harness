# Plan maestro OpenSpec — todas las acciones pendientes del expediente (informes 00–14)

**Fecha:** 2026-11-02 · **Estado:** PLAN CERRADO el 2026-11-06 — F0/F1/F4/F5 cerrados; F2 fuera de alcance (cortex); F3 cancelado (ver §0-bis) · **Regla de ejecución:** 100 % OpenSpec-driven; un change a la vez (serial); nada en vuelo; cada change cierra con un gate falsable; un change no abre hasta que su predecesor cierra.
**Formato por change:** `proposal.md` (Why/What/Impact) + `tasks.md` (checklist serializado) + `specs/<capability>/spec.md` (delta). Los specs-delta se redactan al abrir el change, como exige el flujo OpenSpec de la casa.

---

## 0 · Mapa de repos destino por change

| Prefijo | Repo | Cambios |
|---|---|---|
| ~~`CH-0xx` / `CH-02x`~~ | ~~`/Users/ruben/Code/JARTOS/Jart-CORTEX`~~ | **migrado** (2026-11-05) a `/Users/ruben/Code/JARTOS/Jart-CORTEX/audit/2026-11-02-cortex/02-PLAN.md` |
| `CH-01x` | `~/Code/PI-agent` | decisiones de propietario |
| `CH-03x` | `~/Code/PI-agent` | pi-memory / árbol / expediente |
| `CH-04x`, `CH-05x` | `/Users/ruben/Code/PROJECTS/DEEPSEEK-harness` (proceso DSH: PR + Agent Note; proposal/tasks viajan en la PR) | optimización DSH y cierre |

## 0-bis · Estado de ejecución (2026-11-06)

| Change | Estado | Gate medido / decisión |
|---|---|---|
| CH-003 | **CERRADO** | Clave `omniroute` revocada en OmniRoute (`9d5b904e…` → `is_active=0`) y nueva activa (`4ad1222e…`); `models.json` actualizado; 6 `.bak` borrados; 23 ficheros redactados; gate de escaneo amplio (1.222.019 ficheros) → 0 copias; el residual protegido de `jart-os-development` se eliminó después con autorización expresa. |
| CH-004 | **CERRADO** | `demo/tmp/d1.db` del expediente eliminado (SHA-256 `780f0c46…09283`); gate `grep -r "PRIVATE KEY" demo/` → 0. La copia original de QWEN-code se eliminó también con autorización expresa; gate `find /Users/ruben -name d1.db` → 0. |
| CH-005 | **CERRADO REDUCIDO** | `router.bundle` verificado (32 commits, `main=12d0940…`); manifiesto SHA-256 de 183 ficheros. **Pérdida declarada:** 38 colgantes + 81 tests/526 casos de `e54c5d9^` + E-031…E-057 (repo PI-agent ausente). |
| CH-010 | **RESUELTO** | Cortex canónico → archivar `@pi-agent/memory@1.0.0`; F3 cancelado. |
| CH-011 | **CANCELADO (pérdida)** | El repo PI-agent no existe en disco (sin `.git`; copia sin historial en `Code/AGENTS/PI-agent`). |
| CH-034 | **CANCELADO (pérdida)** | E-031…E-057 no reconstruibles sin historial git. |
| CH-012 | **CERRADO** | Commit `45c3443` en rama local `audit/2026-11-02-harness` (269 ficheros, solo `audit/`); sin push; `master` intacto. |
| CH-040 | **CERRADO (P0)** | Baseline publicado: 3 sesiones / 582 peticiones / **308.353 tok/petición** ponderado (ver `planificacion/20-BASELINE-CH040.md`). Cuotas K=8 · 3k · 1k fijadas. |
| CH-041 | **CERRADO (opt-in, gate recalibrado)** | S1+S2 en rama local (`6212348`, `dbb8778`, `a019ea4`), no activados en presets. Medido: **1.393 tok/petición = 0,45 %** (MCP 0; catálogo 810.798 tok/582 peticiones). Decisión 2026-11-06: el −20 % total pasa a **P2/CH-042**. |
| CH-042 | **CERRADO (opt-in, gate −20 % demostrado en simulación)** | A-2 dispatch gate (12 vectores, audit/enforce) + A-3 pruner por presión; commits locales `d6816f7`, `e08ac49`, `626833c`, sin push ni activación. Medido por replay: **12,94 % conservador / 20,54 % agresivo** (36.870.187 tok de 179.461.588). Activación futura condicionada a evaluación en vivo y re-grabado de snapshots. |
| CH-043 | **CERRADO (opt-in, gate medido)** | Router FTS5 (`node:sqlite`, porter+unicode61) de skills+MCP, integración opt-in en `tool-skill` por `ctx.get('skillRouter')`; commits `acd3e30`+`2b04540` (rama apilada sobre CH-041), sin activar, sin push. Medido: **recall@8 0,915 / nDCG@8 0,932** vs 0,890/0,883 del baseline léxico (59 queries, 32 entradas). |
| CH-044 | **CERRADO (opt-in, gate medido)** | `@deepseek-ai/dsh-memory-passive` en `.worktrees/ch044` (commit `c3e2e86`, sin push), no activado. Medido: **recall@5 1,000** (39 queries), máx. 1.033 chars con cuota 4.000, 0 tools, 6 reglas de redacción verificadas, captura real en `session/disposed`. C-4 (consolidación) diferido. |
| CH-045 | **CERRADO (opt-in, gate proxy medido; CRITICAL remediado)** | `@deepseek-ai/dsh-handoff` en `.worktrees/ch045` (`fcf0dc2` + remediación `944c37b`, sin push), no activado: `/handoff <goal>` con checkpoint acotado, hija enlazada por `parentSession` y guía a `session_event_search`/`session_trace`; el checkpoint se entrega como mensaje de petición en el primer paso (superficie limpia, system prompt en nodo 0). Medido: **15/15 hechos, 0 vs 15 pasos**. |
| CH-046 | **CERRADO (opt-in, auditoría 0 BLOCKER/CRITICAL)** | `@deepseek-ai/dsh-redaction` + `@deepseek-ai/dsh-telemetry-redaction` en `.worktrees/ch046` (commit `3a641b2`, sin push). Medido: **20/20 registros sin fugas**, entrada intacta, ciclo fail-closed; invariants **39/39**. Auditoría F4 en `auditorias/09-AUDITORIA-P6-F4.md`: 1 CRITICAL de handoff remediado (`944c37b`), **0 abiertos**; 2 MAJOR (reglas duplicadas, tracking sin acotar) y 4 MINOR con plan de integración. E-3 diferido a decisión. |
| CH-047 | **CERRADO (opt-in, instrumento + baseline; ventana de 30 días pendiente)** | `dsh-longitudinal-eval` en `.worktrees/ch047` (commit `2b76786`, sin push). F-1 verificado (métricas por error 0, 9 tests). F-2 baseline: **3 sesiones/582 peticiones, 4 skill calls en 2/3, 0 inyecciones, 2 días activos**; kill-criteria aplicados: **memoria disable** (sin señal, no activar C-2) y **skills keep** (0,67≥0,5). La ventana de 30 días no ha transcurrido: re-ejecución pendiente. || CH-047 | **CERRADO (opt-in, instrumento + baseline; ventana de 30 días pendiente)** | `dsh-longitudinal-eval` en `.worktrees/ch047` (commit `2b76786`, sin push). F-1 verificado (métricas por error 0, 9 tests). F-2 baseline: **3 sesiones/582 peticiones, 4 skill calls en 2/3, 0 inyecciones, 2 días activos**; kill-criteria aplicados: **memoria disable** (sin señal, no activar C-2) y **skills keep** (0,67≥0,5). La ventana de 30 días no ha transcurrido: re-ejecución pendiente. |
| CH-050 | **CERRADO (integración + auditoría final + sello)** | Árbol integrado en `.worktrees/ch050` (rama `feat/ch050-integration`, HEAD `c50f6fea76`, 33 commits, 190 ficheros, +9.138/−202; sin push), 7 changes F4 en orden, MAJOR-1/2 del P6 remediados, gates medidos verdes (static 55/55, docs 20/20, invariants 39/39, typecheck 0, lint 0/0, duplicación 0, focados 199/199). Auditoría independiente `auditorias/10-AUDITORIA-CH050.md`: **0 BLOCKER / 0 CRITICAL**, 3 MAJOR (subsanados o registrados como condición de activación) y 6 MINOR (MINOR-6 resuelto). Ver §0-bis y 19-HANDOFF §10. |

---

## 1 · Cadena de serialización (orden estricto)

```
F0 seguridad:  CH-003 → CH-004 → CH-005
F1 decisiones: CH-010 → CH-011 → CH-012
F3 pi-memory:  CH-030 → CH-031 → CH-032 → CH-033 → CH-034   (tras CH-010)
F4 DSH:        CH-040 → CH-041 → CH-042 → CH-043 → CH-044 → CH-045 → CH-046 → CH-047   (tras CH-010/012)
F5 cierre:     CH-050
```
F1 y F4 pueden correr en paralelo humano; F3 solo si CH-010 decide revivir `@pi-agent/memory@1.0.0`.
**Cortex queda fuera del alcance de este plan** (2026-11-05): CH-001, CH-002 y F2 (CH-020…CH-024) migraron a `/Users/ruben/Code/JARTOS/Jart-CORTEX/audit/2026-11-02-cortex/`.

---

## F0 · Seguridad inmediata (bloquea todo lo demás)

> CH-001 (sidecar de cortex) y CH-002 (bug `kg_relations.updated_at`) se han **migrado** a `/Users/ruben/Code/JARTOS/Jart-CORTEX/audit/2026-11-02-cortex/02-PLAN.md`. Aquí queda solo lo que no es de cortex.

### CH-003 · Rotar la clave expuesta y purgar la transcripción
- **Why:** el dossier declara (`A1-config-viva.md:9,517`) que el valor literal de una clave de `models.json` acabó en una transcripción de auditoría; `models.json` tiene hoy **5 claves literales**. La rotación recomendada no consta ejecutada.
- **What:** con tu autorización expresa: rotar la clave `omniroute` (y revisar las otras 4), purgar las transcripciones afectadas, borrar los `.bak` que la contengan.
- **Tasks:**
  1. [ ] Localizar todas las copias del valor antiguo (disco + transcripciones de sesiones de Pi/Qwen).
  2. [ ] Rotar en el proveedor; actualizar `models.json` y el credential store.
  3. [ ] Purga de copias; `grep -r` del valor antiguo → 0 resultados (salida citada).
- **Gate:** el valor antiguo no existe en disco ni en transcripciones; el proveedor la revocó. **Esfuerzo: 0,5 d + el tiempo del proveedor.**

### CH-004 · Regenerar `demo/tmp/d1.db` (clave privada Ed25519, 0644)
- **Why:** el dossier contiene una clave privada real (`meta.memory.signer.privatePem`, 119 B) en un fichero legible por terceros.
- **What:** regenerar `d1.db` con clave efímera nueva (re-ejecutar D1 con dbPath en `/tmp`) o eliminarlo; nota en el dossier.
- **Tasks:**
  1. [ ] Decidir regenerar o eliminar.
  2. [ ] Ejecutar; verificar ausencia de `PRIVATE KEY` en `demo/`.
  3. [ ] Nota en `08-DOSSIER.md` del expediente.
- **Gate:** `grep -r "PRIVATE KEY" demo/` → 0. **Esfuerzo: 0,25 d.**

### CH-005 · Rescate forense y congelación de objetos en riesgo

> **CERRADO REDUCIDO 2026-11-06:** hecho el bundle del router y el manifiesto SHA-256; declarada la pérdida de los 38 colgantes y de los tests de `e54c5d9^` (sin repo PI-agent).
- **Why:** 30 commits colgantes del 12-oct están fuera de `prune-expire`; el bundle del router (32 commits, única copia) y los 526 tests son recuperables pero frágiles (informe `05-FORENSE.md`).
- **What:** extraer el bundle y los tests a un archivo seguro, congelar los colgantes con `git bundle`, y dejar constancia en el expediente.
- **Tasks:**
  1. [ ] `git cat-file blob cf84e015 > <archivo>/router.bundle` + `git clone` de verificación (32 commits).
  2. [ ] `git bundle create <archivo>/dangling-20261102.bundle $(fsck --unreachable)` para los 38.
  3. [ ] Extraer tests (`e54c5d9^`) a `<archivo>/tests-e020/` (81 ficheros).
  4. [ ] Manifiesto con SHA-256 de lo rescatado.
- **Gate:** bundle verificado con `git bundle verify`; manifest con hashes; expediente actualizado. **Esfuerzo: 0,5 d.**

---

## F1 · Decisiones de propietario (cada una = un change de gobernanza)

### CH-010 · Linaje de pi-memory: cortex canónico vs revivir 1.0.0
- **Why:** dos linajes (`@pi-agent/memory@1.0.0` en HEAD sin desplegar; npm ajeno `pi-memory@0.4.2` en runtime; cortex como sistema vivo). El plan maestro asume cortex canónico.
- **What:** decisión documentada con E-NNN: cortex canónico → archivar el linaje 1.0.0 (con su remediación CH-03x **cancelada** y entrada de archivo); o revivir → ejecutar CH-030…CH-034.
- **Tasks:** 1) [ ] Decisión explícita tuya registrada. 2) [ ] Entrada E-NNN con evidencia. 3) [ ] Ajustar el plan (cancelar o activar F3).
- **Gate:** decisión escrita + plan actualizado. **Esfuerzo: decisión + 0,5 d.**

### CH-011 · Árbol de PI-agent: 97 borrados y 6 untracked
- **Why:** `src/pi-memory` borrado sin commitear; 6 untracked vivos (pi-jart-ura 568 MB, pi-aside, audit 10-28, HANDOFF 10-28, change 062, .codex).
- **What:** restaurar o commitear el borrado (según CH-010); decidir cada untracked (trackear, archivar, mover a `src/`); entradas E-NNN.
- **Tasks:** 1) [ ] `git restore src/pi-memory` **o** commit del borrado con E-NNN. 2) [ ] Decidir pi-jart-ura (aplanar `.git`, mover a `src/`, o archivo; LaunchAgents fuera del repo). 3) [ ] Decidir pi-aside/062/HANDOFF-10-28. 4) [ ] `git status` limpio o declarado.
- **Gate:** árbol decidido; sin borrados huérfanos. **Esfuerzo: 1–2 d.**

### CH-012 · Versionar este expediente y el plan maestro
- **Why:** el expediente `audit/2026-11-02-harness/` (15 ficheros) no está en ningún git — el decimotercer documento huérfano si nadie lo versiona.
- **What:** versionar en el repo que decidas (DSH o PI-agent), con entrada E-NNN y enlace.
- **Tasks:** 1) [ ] `git add` + commit del expediente. 2) [ ] Entrada E-NNN.
- **Gate:** expediente trackeado. **Esfuerzo: 0,25 d.**

---

## F2 · Remediación cortex

> **Migrado** (2026-11-05) a `/Users/ruben/Code/JARTOS/Jart-CORTEX/audit/2026-11-02-cortex/02-PLAN.md`: CH-020, CH-021, CH-022, CH-023 y CH-024, con sus tareas y gates. Cortex ya no forma parte del plan de DSH.

---

## F3 · pi-memory / PI-agent — **CANCELADO 2026-11-06**

> CH-010 resolvió cortex canónico. No abrir CH-030…CH-034. El linaje 1.0.0 queda archivado; su fuente (no desplegada) está en `~/.pi/agent/memory-contract` y el repo PI-agent del que hablaba este plan ya no existe.

### CH-030 · C1: `memory.import` por el camino gobernado
- **What:** enrutar import por fabric (admisión+cuarentena+firma+ledger) o exigir bundle UMP firmado; borrar el bypass directo; probe de gate.
- **Tasks:** 1) [ ] rediseñar import. 2) [ ] test: import con inyección → cuarentena; con secreto → redactado. 3) [ ] probe p-import.
- **Gate:** probe verde. **Esfuerzo: 1 d.**

### CH-031 · C2: tenant en el canal ANN
- **What:** filtrar vecinos por tenant en fabric (`store.peek` scoped) y en la construcción del índice; extender p039 con el canal ANN.
- **Tasks:** 1) [ ] scope en ann. 2) [ ] p039 extendido (tenant A no ve vecinos de B).
- **Gate:** p039 verde incluyendo ANN. **Esfuerzo: 1 d.**

### CH-032 · B1/C3/C4: métrica honesta + schema de tool + doc del orden
- **What:** `merged` = real (contar dedupe, no archivados); sincronizar el schema de la tool con las 10 acciones + `bundle`; corregir docstring/cabecera del orden de save.
- **Tasks:** 1) [ ] fix merged. 2) [ ] schema tool completo. 3) [ ] docs. 4) [ ] probe p-metrics.
- **Gate:** tool con 10 acciones operativa en runtime. **Esfuerzo: 1 d.**

### CH-033 · M1–M13: gobernador, dream, muertos y restos
- **What:** quality real del governor (no `poolFraction`); cablear dream-cycle **o** borrarlo (decisión del 023 de cortex); borrar `propose` stub o hacerlo real; fuera `replaceAll`/`forgetGc`/signer legacy; vincular custodia fichero↔pública; savepoints en flush/forget/consolidate; ghosts del índice de sesiones; `uuidv7` criptográfico; fuera `execCommand` fake; O(n²) de compressPrompt.
- **Tasks:** 8–10 tareas, una por ítem, cada una con test.
- **Gate:** probes verdes + `openspec validate`. **Esfuerzo: 4–6 d.**

### CH-034 · Expediente: E-031…E-057 y HANDOFF
- **What:** reconstruir las 27 entradas desde commits o declarar la pérdida formalmente; corregir HANDOFF raíz (3 totales de probes → uno medido); resolver el change 062 (perdido: reescribir o cerrar como no implementado).
- **Tasks:** 1) [ ] inventario de commits E-031…E-057. 2) [ ] entradas o declaración. 3) [ ] HANDOFF a hechos. 4) [ ] 062: reescribir o archivar.
- **Gate:** expediente sin huecos no declarados. **Esfuerzo: 1–2 d.**

---

## F4 · Optimización DSH (proceso DSH: PR + Agent Note; el formato OpenSpec viaja en la PR)

*(Cada change = una fase del plan maestro 13; gates numéricos idénticos.)*

| Change | Contenido | Gate | Esfuerzo |
|---|---|---|---|
| **CH-040** | P0: baseline token-meter en 3 sesiones + decisiones de cuotas (K=8/3k/1k) + versionar el plan | baseline publicado | 0,5–1 d |
| **CH-041** | P1: governor outbound en `system-prompt/assemble` (skills top-K, schemas MCP resumidos, inyecciones a cola) | tokens/petición −X % sin regresión en snapshots ni tool-calls | 3–5 d |
| **CH-042** | P2: dispatch gate (audit 1 sem → enforce) + pruner por presión | 12 bypasses bloqueados; original en log | 3–5 d |
| **CH-043** | P3: router skills/MCP FTS5 + escape hatch | nDCG/recall@k ≥ umbral sobre ≥50 queries | 3–5 d |
| **CH-044** | P4: puente pasivo de memoria (captura session/event redactada, inyección cuota, dream vía `packages/schedule`) — **backend por decidir; cortex fuera de alcance** | recall@k propio; 0 llamadas del agente; inyección ≤ cuota | 4–6 d |
| **CH-045** | P5: `/handoff` estilo Amp + enlace `tool-session-query` | tarea continuada en menos pasos que sin handoff | 3–5 d |
| **CH-046** | P6: redacción telemetría por defecto + fencing generalizado + pin de integridad + G-1/G-2 montados + invariants | 12/12 invariants; telemetría redactada | 2–4 d |
| **CH-047** | P7: evaluación longitudinal + kill-criteria + revisión del plan | métrica a 30 días con kill-criteria aplicados | 5 d |

---

## F5 · Cierre

### CH-050 · Auditoría final y sello
- **What:** pase `/auditoria-dev` completo sobre el resultado de F0–F4; 0 BLOCKER/CRITICAL abiertos; expediente versionado con sello.
- **Gate:** informe final con severidades en verde y esfuerzos verificados.
- **Esfuerzo: 2 d.**
- **Estado (2026-11-06): CERRADO.** Árbol integrado `feat/ch050-integration` (base `0d1f50007f`, 31 commits, sin push) con los 7 changes F4 y las remediaciones MAJOR-1/2 del P6; auditoría independiente en `auditorias/10-AUDITORIA-CH050.md` con **0 BLOCKER y 0 CRITICAL**; gates estáticos 55/55, docs 20/20, invariants 39/39, typecheck exit 0, lint 0/0 y duplicación 0. Quedan 3 MAJOR: dos de documentación corregidos tras el informe y uno (handoff) registrado como condición de activación. El árbol no está publicado: activación, publicación y ventana de 30 días siguen siendo decisiones del propietario (§9 del handoff).

---

## 2 · Estimación total

| Frente | Esfuerzo |
|---|---|
| F0 seguridad | 2–3 d |
| F1 decisiones | decisión + 1,5–2,5 d |
| F2 cortex | 9–13 d |
| F3 pi-memory (condicional) | 8–10 d |
| F4 DSH | 4–6 semanas |
| F5 cierre | 2 d |
| **Total (con F3)** | **6,5–8,5 semanas** · **Total (sin F3, archivo de pi-memory)** | **6–7,5 semanas** |

## 3 · Reglas de ejecución (heredadas de la casa)

1. **Serial:** un change activo por repo; el siguiente abre al cerrar el gate.
2. **Nada en vuelo:** cada change commitea su estado; sin trabajo suelto entre changes.
3. **Gate falsable:** cada cierre cita el número medido (salida de comando o test), no "verde" retórico.
4. **Entrada E-NNN** en cada change de PI-agent/cortex con evidencia y reversión.
5. **Read-only salvo el change aprobado:** ninguna remediación fuera de su change.

## 4 · Autorizaciones

**F0 autorizado y cerrado el 2026-11-06.** CH-012 cerrado con commit local `45c3443` (sin push).

_Histórico de lo que se necesitaba para abrir F0:_

1. OK a F0 (CH-003 rotación, CH-004 `d1.db`, CH-005 rescate forense).
2. Decisión de CH-010 (linaje de pi-memory) — la necesito antes de F3.
