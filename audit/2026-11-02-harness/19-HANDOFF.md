# HANDOFF — sesión de auditoría/planificación SOTA (2026-11-02)

**Para la siguiente sesión:** este documento resume el estado exacto. Todo el material está en `audit/2026-11-02-harness/` (270 ficheros). **CH-012 cerrado 2026-11-06:** versionado en la rama local `audit/2026-11-02-harness` (commit `45c3443`, sin push).
**Actualización 2026-11-05:** cortex sale del alcance de DSH. Su material (C5–C8, F0 cortex, F2) se migró a `~/Code/Jart-CORTEX/audit/2026-11-02-cortex/`; este expediente mantiene PI-agent, DSH, dossier QWEN y router.
**Actualización 2026-11-06 (esta sesión):** F0 cerrado con gates medidos; las 4 decisiones del propietario resueltas; plan adaptado a las desviaciones verificadas. Detalle en §0.

---

## 0 · Actualización 2026-11-06 — decisiones, F0 cerrado y desviaciones

### 0.1 Decisiones del propietario (resueltas)

1. **CH-010:** cortex canónico → **archivar `@pi-agent/memory@1.0.0`**; F3 (CH-030…034) **cancelado**.
2. **CH-003:** autorizada la rotación de la clave `omniroute` y la purga de copias. **Ejecutado** (ver §0.2).
3. **Claves agnes sueltas:** mover al keychain y limpiar duplicados. **Ejecutado** (ver §4).
4. **Cuotas iniciales:** **K=8 skills · 3k schemas MCP · 1k inyección**, firmes (CH-040).
5. **Repo PI-agent ausente:** **pérdida declarada** y plan adaptado (CH-011/034 cancelados como pérdida; CH-005 reducido a lo rescatado).
6. **CH-012:** autorizado el commit en rama nueva → cerrado (commit `45c3443`, sin push).
7. **CH-041:** recalibrar tras medir → **cerrado** con 0,45 % en superficie gobernada y **−20 % total trasladado a P2** (decisión 2026-11-06); opt-ins no activados; sin PR.
8. **CH-042:** implementado y **cerrado opt-in** — dispatch gate (12 vectores) + pruner por presión; medido 20,54 % con política agresiva (12,94 % conservadora) por simulación; sin activar en presets, sin PR ni push.
9. **CH-043:** implementado y **cerrado opt-in** — router FTS5 zero-embeddings de skills/MCP con integración opcional en el catálogo; gate medido (recall@8 0,915 / nDCG@8 0,932 vs 0,890/0,883); commits `acd3e30`+`2b04540` en rama apilada sobre CH-041, sin activar y sin push.
10. **CH-044:** implementado y **cerrado opt-in** — memoria pasiva local (índice acotado, inyección con cuota y valla, captura redactada sin red) con commit `c3e2e86` en `.worktrees/ch044`, sin activar ni push; gate recall@5 1,000 (39 queries) y redacción verificada; C-4 diferido.
11. **CH-045:** implementado y **cerrado opt-in** — handoff `/handoff <goal>` con checkpoint estructurado e hija enlazada por `parentSession`; commits `fcf0dc2` + `944c37b` (CRITICAL de orden de superficie remediado) en `.worktrees/ch045`, sin activar ni push; gate proxy 15/15 hechos y 0 vs 15 pasos.
12. **CH-046:** implementado y **cerrado opt-in** — `dsh-redaction` + `dsh-telemetry-redaction` (20/20 registros sin fugas, invariants 39/39) y auditoría F4 con **0 BLOCKER/CRITICAL abiertos** (informe `auditorias/09-AUDITORIA-P6-F4.md`); commit `3a641b2` en `.worktrees/ch046`, sin activar ni push. E-3 diferido a decisión.
13. **CH-047:** implementado y **cerrado opt-in** — `dsh-longitudinal-eval` (métricas, resumen de uso, kill-criteria) con baseline real y decisiones aplicadas (memoria disable, skills keep); commit `2b76786` en `.worktrees/ch047`, sin push. La ventana de 30 días sigue pendiente como re-ejecución del propietario.

### 0.2 F0 — cerrado (gates medidos)

- **CH-003 (clave `omniroute`):** rotada en OmniRoute. `registered_keys`: `9d5b904e…` → `is_active=0, revoked_at=2026-11-06 05:32:21`; nueva `4ad1222e…` → `is_active=1`; `~/.pi/agent/models.json` actualizado a la nueva clave. Purga: **6 `.bak` borrados** y **23 ficheros redactados** (15 transcripciones + 7 documentos de `JARTOS/ZERO-COST-ROUTER` + 1 log de Antigravity IDE). Gate: escaneo amplio de **1.222.019 ficheros** → 1 sola copia residual (un backup de `jart-os-development`, protegido por la regla de no tocar originales). Eliminada el mismo día con tu autorización expresa: **0 copias** de la clave antigua en disco.
  - Nota de mecanismo: el CLI `omniroute keys rotate` devuelve **404** (el servidor empaquetado 0.1.5-rc.2 no tiene `/rotate`); la rotación se hizo con las funciones canónicas de la BD (`issueRegisteredKey`/`revokeRegisteredKey`, formato `ork_` + base64url(24 B), SHA-256). El servidor local no exige clave para peticiones desde localhost, así que la exposición remota era baja, pero la clave queda revocada igualmente.
- **CH-004 (`demo/tmp/d1.db`):** eliminada la copia del expediente (184.320 B, SHA-256 `780f0c46…09283`, modo 0644). Gate `grep -r "PRIVATE KEY" demo/` → **0**. La **copia original** de `PROJECTS/QWEN-code/auditoria-pi-agent/demo/tmp/d1.db` (mismo SHA-256) se **eliminó** después con tu autorización expresa: `find /Users/ruben -name d1.db` → 0. Gate final: 0 claves privadas en ambas ubicaciones.
- **CH-005 (rescate):** `router.bundle` verificado (`git bundle verify` → *complete history*; 32 commits; `main = 12d0940…`) y manifiesto SHA-256 de **183 ficheros** en `rescate/MANIFIESTO-SHA256.txt`. **Pérdida declarada:** 38 commits colgantes, 81 ficheros de test de `e54c5d9^` (526 casos) y E-031…E-057 (CH-034) no son recuperables porque el repo PI-agent ya no existe en disco.
- **CH-012 (versionado):** expediente commiteado en rama local `audit/2026-11-02-harness` (commit `45c3443`, 269 ficheros, solo `audit/2026-11-02-harness/`); `master` intacto; sin push.
- **CH-040 (baseline P0):** medido con usage exacto del log v4 en 3 sesiones (cordis/standard/sota): **582 peticiones**, **308.353 tok/petición** ponderado (input no cacheado 6.175 · cache read 301.159 · output 1.019; 97,7 % cache read). Publicado en `planificacion/20-BASELINE-CH040.md`; P1 propone −20 % (decisión pendiente).
- **CH-041 (P1, governor outbound) — CERRADO (opt-in, gate recalibrado):** S1 (`catalogTopK`+resúmenes) y S2 (`system-prompt-governor`, presupuesto MCP 3k) en la rama local `feat/ch041-outbound-governor` (commits `6212348`, `dbb8778`, `a019ea4`, sin push). Medición sobre las 3 sesiones baseline: **1.393 tok/petición = 0,45 %** (catálogo 810.798 tok en 582 peticiones; MCP 0 por estar ya bajo 3k). Decisión del propietario 2026-11-06: el **−20 % total pasa a P2/CH-042**; opt-ins no activados; `request/header` aceptado como registro. Ver `planificacion/21-CH041-DISENO.md` §1, §7 y §8.

### 0.3 Desviaciones verificadas frente al handoff del 11-05

| Declarado | Real verificado 2026-11-06 |
|---|---|
| `~/Code/PI-agent` con 97 borrados y 6 untracked | **No es un repo git**: solo `pi-jart-ura/state/proxy.log` (32 KB). `Code/AGENTS/PI-agent` es una copia de 293 MB **sin `.git`** y **sin `src/pi-memory`**. Sin Time Machine ni snapshots locales. |
| `@pi-agent/memory@1.0.0` en HEAD de PI-agent (no desplegado) | Vive en **`~/.pi/agent/memory-contract`** (git limpio, `main`; `vendor/palimpsest` = `@pi-agent/memory` 1.0.0, 46 fuentes + probes). C1/C2/B1 verificados allí en las líneas citadas. |
| 4 claves agnes en keychain | **5** entradas `pi.provider.agnes-ai*` (incl. `-3`) + servicio `agnes-ai`; además 2 nuevas (`agnes-e`, `agnes-f`) tras la decisión 3. |
| omniroute: keychain vs `models.json` divergentes | **No había entrada keychain de omniroute**. La clave literal estaba en **22 ficheros** (7 `models.json*`, 6 sesiones Pi, 2 Qwen, 7 Claude) y el escaneo amplio encontró **9 más** (7 docs de ZERO-COST-ROUTER, 1 log de Antigravity, 1 backup de jart-os-development). |
| Dossier QWEN original intacto | Movido por la reorganización a `PROJECTS/QWEN-code/auditoria-pi-agent/` (tenía `d1.db`, eliminado después con autorización; ver CH-004). `~/Code/QWEN-code` ya no existe. |
| DSH master al día | `master` @ `c291e7961a`, **666 commits por detrás** de `origin/master` (`0d1f50007f`). |
| Rutas | 28 referencias a rutas antiguas en el expediente; `~/Code/deepseek-harness` quedó como carpeta residual con un `.dsh-project-memory` de 24 KB (la memoria real, 64 MB, está en el repo). |

---

## 1 · Qué se hizo (todo verificado)

1. **Auditoría del pack PI-agent** (00-INFORME, 14 hallazgos, 2 BLOCKER).
2. **Arqueología forense** (05): se recuperaron el bundle del router (32 commits), los 526 tests (`e54c5d9^`) y la D-revision; se identificaron 27 entradas de expediente perdidas (E-031…E-057).
3. **Auditoría del dossier QWEN** (08): clave privada en `d1.db`, caducidad, contradicciones v5↔S1-S4.
4. **Auditoría línea por línea** (14): pases de pi-memory (46 ficheros en HEAD) y seams de DSH (14,7k); el pase de cortex (25k líneas) está migrado a su repo. 8 CRITICAL documentados; 3 claims del dossier ya corregidos en HEAD por la ola W.
5. **Investigaciones SOTA** (09, 10, 11, 16): handoff, frontera, cortex/pi-memory, NCM + Jev.
6. **Plan maestro** (13): 20 mejoras, 7 frentes, 8 fases con gates numéricos.
7. **Planificación OpenSpec** (15): 27 changes serializados con dependencias y gates.
8. **Reorganización del expediente**: subcarpetas + copias completas + 17 fuentes descargadas a disco.
9. **Prueba atómica de claves agnes** y limpieza: 6 claves válidas, 1 inválida eliminada de 8 ficheros.
10. **F0 ejecutado (2026-11-06):** CH-003, CH-004 y CH-005 (reducido) cerrados con gates medidos (§0.2).

## 2 · Hallazgos vivos (ordenados por urgencia)

| # | Hallazgo | Evidencia | Estado |
|---|---|---|---|
| C1/C2 | pi-memory: bypass `memory.import`; fuga cross-tenant por canal ANN | `memory-mcp-server.ts:252-255`; `fabric.ts:107-113` (en `~/.pi/agent/memory-contract/vendor/palimpsest/`) | latentes (1.0.0 no desplegado; linaje archivado) |
| B1 | `merged = r.archived` (métrica falsa) | `memory-control.ts:242` (misma ruta) | latente |
| — | cortex (C5/C8/C6/C7) | material migrado a `~/Code/JARTOS/Jart-CORTEX/audit/2026-11-02-cortex/01-HALLAZGOS.md` | fuera de alcance |

## 3 · Decisiones pendientes del usuario

Todas resueltas el 2026-11-06 (ver §0.1), incluido **CH-012** (commit `45c3443` en rama local, sin push).

## 4 · Estado de las claves (2026-11-06)

- **agnes (pool de 6, todas en keychain):** 2 valores sueltos en `pi.provider.agnes-e` / `-f` y las 4 claves nombradas en `pi.provider.agnes-ai-key`, `-msb-key`, `-planetary-key`, `-dianez-key`. En `~/.pi/agent/auth.json` **ninguna clave agnes queda literal**: las 6 referencias usan la indirección soportada por Pi 1.5.0 (`!security find-generic-password -w -s … -a pi`, verificado en `dist/core/resolve-config-value.js` y con `pi auth print-api-key --provider agnes-ai`, que resuelve la clave correcta). `new2` es alias de `remote2`: mismo secreto, una sola entrada en keychain. `auth.json` sigue 0600 y es JSON válido.
- **omniroute:** clave antigua revocada en OmniRoute y nueva activa en `models.json`; copias purgadas: **0** en disco.
- **Otras 7 claves** (`kilo-gateway`, `pollinations`, `lmstudio`, `orchestra-*`, `litellm`, `account-router`) siguen como placeholders en `models.json` (no son secretos reales).
- **Rotador agnes:** el LaunchAgent `com.ruben.pi.agnes-key-rotator` apuntaba a `~/.pi/proxy/agnes-key-rotator.js` (inexistente). Desinstalado y limpiado el 2026-11-06 (`launchctl bootout` + `disable`, plist, logs y estado `agnes-rotation.json`); sin proceso ni entrada en launchd.

## 5 · Estructura del entregable

```
audit/2026-11-02-harness/
├── 00-INDICE.md · 19-HANDOFF.md
├── auditorias/ (7) · investigaciones/ (7 + dossier-anillos + fuentes/)
├── planificacion/ (3 + original/ con las 4 planificaciones rescatadas)
├── referencias/ (bibliografía) · rescate/ (bundle + repo + D-revision + MANIFIESTO-SHA256.txt)
└── 18-NOTAS-TRABAJO.md
```
`demo/tmp/d1.db` del expediente **eliminado** (CH-004).

## 6 · Próximo paso concreto

1. **CH-012 — hecho:** commit `45c3443` en la rama local `audit/2026-11-02-harness`, solo con `audit/2026-11-02-harness/`; sin push. Los 6 tracked modificados y 19 untracked ajenos siguen sin tocar.
2. **F5 / CH-050 — siguiente:** auditoría final y sello: integrar F4 en una rama de integración, resolver MAJOR-1/2 de la auditoría P6, ejecutar `/auditoria-dev` final sobre el conjunto y actualizar el HANDOFF con el estado de cierre. CH-047 quedó cerrado opt-in en `.worktrees/ch047` (`2b76786`; ventana de 30 días pendiente); CH-046, CH-045, CH-044, CH-043, CH-042 y CH-041 también cerrados opt-in y sin push.
3. **Cerrado:** residuo de la clave en `jart-os-development`, `d1.db` original de QWEN-code y rotador agnes (eliminados/desinstalados con tu autorización del 2026-11-06).

## 7 · Avisos

- Ninguna de las dos copias del dossier contiene ya `d1.db`: eliminadas el 2026-11-06 (CH-004; la original con autorización expresa).
- El expediente está versionado en la **rama local** `audit/2026-11-02-harness` (commit `45c3443`), sin push.
- No tocar los originales: dossier QWEN, `~/Code/PI-agent`, `~/Code/JARTOS/jart-os-development` y `~/Code/JEV-AI` solo se han leído o copiado.

-----

## 9 · HANDOFF OPERATIVO — pausa del 2026-11-06

**Motivo:** el propietario pide congelar el trabajo para retomarlo bien. El goal autónomo queda **pausado** (id `goal-a3078fb6-2d26-411b-8763-50ee627cd9d2`, revisión 4, 8/40 rondas consumidas). No hay push ni PR en ninguna rama.

### 9.1 · Estado del plan al congelar

- **F0/F1:** cerrados con gates medidos (CH-003/004/005/010/011/012).
- **F2:** fuera de alcance (cortex en Jart-CORTEX). **F3:** cancelado por CH-010.
- **F4:** **completo, cerrado opt-in**: CH-040 baseline, CH-041 governor, CH-042 dispatch gate + pruner, CH-043 router, CH-044 memoria pasiva, CH-045 handoff, CH-046 telemetría redactada, CH-047 evaluación longitudinal. Ningún opt-in está montado en presets.
- **F5/CH-050:** **pendiente** (integración + auditoría final + sello).

### 9.2 · Ramas, worktrees y commits exactos

| Change | Worktree | Rama local | Tip / commits | Estado |
|---|---|---|---|---|
| Baseline | — | `audit/2026-11-02-harness` (checkout principal) | `e9c484e` baseline CH-040; expediente hasta `a21fed0` | Cerrado y publicado |
| CH-041 | `.worktrees/ch041` | `feat/ch041-outbound-governor` | `6212348`, `dbb8778`, `a019ea4` | Cerrado opt-in; gate 0,45 % |
| CH-042 | `.worktrees/ch042` | `feat/ch042-dispatch-gate-pruner` | `d6816f7`, `e08ac49`, `626833c` | Cerrado opt-in; gate 12,94 %/20,54 % |
| CH-043 | `.worktrees/ch043` | `feat/ch043-skill-mcp-router` | `acd3e30`, `2b04540` (apilada sobre CH-041) | Cerrado opt-in; gate 0,915/0,932 |
| CH-044 | `.worktrees/ch044` | `feat/ch044-passive-memory` | `c3e2e86` | Cerrado opt-in; recall@5 1,000 |
| CH-045 | `.worktrees/ch045` | `feat/ch045-session-handoff` | `fcf0dc2`, `944c37b` (fix CRITICAL) | Cerrado opt-in; gate proxy 15/15 vs 15 |
| CH-046 | `.worktrees/ch046` | `feat/ch046-telemetry-redaction` | `3a641b2` | Cerrado opt-in; 20/20 sin fugas, invariants 39/39 |
| CH-047 | `.worktrees/ch047` | `feat/ch047-longitudinal-eval` | `2b76786` | Cerrado opt-in; instrumento + baseline |

Todas las ramas están **sin upstream** (sin push). El checkout principal está en `audit/2026-11-02-harness`; los worktrees viven en `.worktrees/` (gitignored).

### 9.3 · Verificación al congelar

- Por rama: tests focados verdes (CH-043 46; CH-044 13; CH-045 6; CH-046 6; CH-047 9), `pnpm run typecheck` **exit 0** y `pnpm run test:docs` **20/20** en las cinco ramas; `verify-package-invariants` 39/39 en CH-046.
- Auditoría P6: `auditorias/09-AUDITORIA-P6-F4.md` con **0 BLOCKER/CRITICAL abiertos** (1 CRITICAL de handoff remediado en `944c37b`), 2 MAJOR y 4 MINOR con plan.
- Sin snapshot keyless ejecutado como gate: ningún opt-in está montado, por lo que no hay diffs de composición; activarlos exigirá re-grabar snapshots.

### 9.4 · Decisiones pendientes del propietario

1. **Activar opt-ins en presets** (ninguno lo está): governor, dispatch gate en `enforce` tras auditoría, pruner por presión (política conservadora o agresiva), router, memoria pasiva, redacción de telemetría, handoff. Cada activación cambia resultados model-visible y exige re-grabar snapshots.
2. **Publicar ramas/PRs**: no hay push; se publicaría con fork/credenciales del propietario. CH-043 está apilada sobre CH-041.
3. **E-3** (pin de integridad de plugins): diferido a aceptar riesgo de terceros.
4. **Ventana de 30 días** de CH-047: re-ejecutar la métrica longitudinal tras activar memoria/router; la regla aplicada hoy dice **no activar C-2 sin señal**.
5. **MAJOR de la auditoría**: (a) migrar `memory-passive` a `@deepseek-ai/dsh-redaction` y borrar su copia de reglas; (b) acotar el tracking de captura (retener como máximo la cuota por lado).
6. **Snapshots keyless**: ejecutar `pnpm run test:snapshot` tras montar cualquier opt-in.
7. **Claves literales preexistentes en `auth.json`** (deepseek, anthropic, qwen-token-plan-individual): no son de este trabajo; migrarlas al keychain queda como higiene opcional.

### 9.5 · Siguiente paso concreto: F5 / CH-050

1. Crear worktree de integración desde `origin/master` (`git worktree add .worktrees/ch050 -b feat/ch050-integration origin/master`; desvincular upstream y `git config --worktree --unset core.hooksPath`; `pnpm install`).
2. Integrar en este orden: CH-041 → CH-043 (apilada) → CH-042 → CH-044 → CH-045 → CH-046 → CH-047. Los conflictos esperables están en `docs/config-catalog.*`, `docs/config-catalog.i18n.yaml`, `tsconfig.base.json`/`tsconfig.host.json` y `pnpm-lock.yaml`: resolverlos regenerando (`pnpm run gen-tsconfig-paths`, `pnpm run gen-config-catalog`, sincronizar zh y `verify-translation-pairing --write`) y re-instalando.
3. Resolver **MAJOR-1** (memoria → `dsh-redaction`, borrar `memory-passive/src/redact.ts`) y **MAJOR-2** (acotar el estado de captura al ingerir), con tests.
4. Verificar el árbol integrado: tests de los paquetes afectados, `pnpm run typecheck`, `pnpm run test:docs`, `pnpm run verify-package-invariants`; snapshots keyless si se activa algo.
5. Ejecutar `/auditoria-dev` final sobre el árbol integrado; corregir lo que sea BLOCKER/CRITICAL.
6. Actualizar 15/19/00-INDICE, sellar el expediente y **volver a preguntar al propietario** por activación, publicación y ventana de 30 días.

### 9.6 · Cómo reanudar

Cuando el propietario pida continuar: rearmar el goal (`update_goal … action: resume` sobre la revisión vigente) y empezar por el paso 9.5.1. El checkout principal no debe tocarse para código; todo se hace en worktrees. Recordatorio de restricciones: sin push, sin PR, sin tocar dossier QWEN/PI-agent/jart-os-development, sin copiar/escribir/publicar credenciales, un change a la vez y ningún gate se declara sin medición.

-----

## 10 · CIERRE F5/CH-050 — integración, auditoría y sello (2026-11-06)

**Estado:** **CERRADO.** El árbol integrado F4 existe, está auditado de forma independiente y los gates medidos están verdes. No hay push ni PR: publicación, activación de opt-ins y ventana de 30 días siguen siendo decisiones del propietario.

### 10.1 · Árbol integrado

- Worktree `.worktrees/ch050`, rama local `feat/ch050-integration`, base `origin/master` = `0d1f50007f`, **HEAD final `0175f5610b`**, **37 commits**, **191 ficheros, +9.251/−202** (135 añadidos, 56 modificados, 0 borrados). Sin upstream.
- Integración con `--no-ff` en el orden del §9.5: CH-041 → CH-043 (apilada) → CH-042 → CH-044 → CH-045 → CH-046 → CH-047. Solo 2 conflictos (`tsconfig.base.json` en CH-046, `verify-package-readme-model-experience.ts` en CH-047), resueltos sumando ambos lados y regenerando artefactos.
- **Ningún opt-in montado:** `git diff --stat origin/master..HEAD -- packages/preset apps` vacío; los paquetes F4 solo se montan por decisión del propietario.
- Las 8 ramas F4/CH-050 siguen **sin upstream**. Checkout principal intacto (rama `audit/2026-11-02-harness`, cambios ajenos preexistentes sin tocar).

### 10.2 · Remediaciones del P6 y hallazgos que la integración descubrió

- **MAJOR-1 P6 (una sola casa de reglas):** `memory-passive` importa `@deepseek-ai/dsh-redaction`; `src/redact.ts` eliminado. Gate: `grep -rn "name: 'private-key'" packages --include=*.ts` = **1**.
- **MAJOR-2 P6 (cota al ingerir):** el exchange se acota con `captureMaxChars` antes de entrar en el estado; tests de retención (15 tests del paquete).
- Gates que fallaron en el árbol integrado y se corrigieron (ninguno se había medido por rama): invariants (frase de omisión en 5 READMEs), typert (anotación de tipo en `pruneContent`), catálogo de tools (exención documentada de `tool-dispatch-gate`), catálogo/roles Cordis (`ctx.skillRouter`), constraints (cordis peer/dev en `redaction`; renombre `@deepseek-ai/dsh-experimental-longitudinal-eval`), registro de persistencia de los tres eventos nuevos, jscpd (4 clones → helpers compartidos `contentText`/`boundDescription` en `dsh-llm` y `registerDrainingCommand` en `dsh-commands`; 0 clones) y lint (2 comparaciones nulas redundantes y supresión restaurada).
- **Corrección de premisa (auditoría):** el variant `plugin` de `MessageSourceMap` para las inyecciones volátiles es correcto (evita cambiar la unión persistida), pero la afirmación «el bucle no las apendiza a la superficie» era falsa (`packages/core/agent-loop/src/agent.ts:374-377`): el bloque de memoria y el checkpoint son historia durable. READMEs, tipos y notas corregidos; el coste (crecimiento del historial) queda declarado.

### 10.3 · Auditoría independiente y remediación post-informe

- Informe: `auditorias/10-AUDITORIA-CH050.md` (auditor independiente; primera pasada sobre `f3bc397bac`, re-mediciones §5 sobre `5b56c065`, `c50f6fea`, `0fd362a6dd` y `0175f5610b`): **0 BLOCKER, 0 CRITICAL, 3 MAJOR, 6 MINOR, 5 INFO**; veredicto **APTO para sellar** con HEAD final `0175f5610b`.
- **MAJOR-1 (handoff al reanudar): corregido en `0fd362a6dd`.** La entrega ya no vive en un `WeakMap` de proceso: una proyección host-only (`packages/session/handoff/src/projection.ts`) pliega el `handoff/checkpoint` durable (pendiente) y el `user/message` con `source.kind='plugin', plugin='handoff'` que el bucle compromete (entregado). `agent/pre-step` lee `ctx.sessionProjections.stateOf(session, 'handoff')`, así que un proceso nuevo reconstruye el estado desde el log. Test de reanudación añadido (evento durable antes de montar el plugin → entrega exactamente una vez; tras comprometer el mensaje → no reentrega). El paquete requiere ahora la seam `session-projections` (ya host en `packages/bundle/base/cordis.patch.yml`) y `zod` como dependencia.
- **MAJOR-2/3:** documentación durable y compatibilidad real del registro de persistencia corregidas en `5b56c065`; las últimas menciones «request-scoped/volatile» se eliminaron en `c50f6fea`.
- **MINOR-1…6 resueltos:** artefactos `lib/` obsoletos borrados (regla única en fuente = 1); `tool-dispatch-gate` valida `mode` además del schema Cordis, con test; la lectura histórica deprecada de `tool-skill` queda registrada como excepción de migración diferida en las notas CH-041/CH-043; el gate de continuación se etiqueta como definición; retirado el `inject` sin uso del router.
- Re-verificación del auditor: confirmada sobre `5b56c065`, `c50f6fea76`, `0fd362a6dd` y `0175f5610b`: «0 BLOCKER, 0 CRITICAL y 0 MAJOR abiertos; el sello puede referenciar `0175f5610b`». MAJOR-1 verificado por reproducción independiente con el agent loop y sesión reanudada: C1 (solo checkpoint durable) → 1 entrega; C2 (tras comprometer el mensaje) → 0 reentregas; C3 (log que ya contiene la entrega) → estado `delivered: true` y 0 reentregas.

### 10.4 · Gates medidos en el HEAD final (`0175f5610b`)

| Gate | Resultado |
|---|---|
| `pnpm run check:ci:static` | **55/55** (0 failed, 0 skipped; re-medido por el auditor en `0175f5610b`) |
| `pnpm run test:docs` | **20/20** (re-medido por el auditor en `0175f5610b`) |
| `pnpm run verify-package-invariants` | **39/39** companions |
| `pnpm run typecheck` | **exit 0** (medido en `0fd362a6dd`; el delta posterior es solo documentación) |
| `pnpm run lint:contracts-ready` | **0 warnings, 0 errors** (3.899 ficheros, 90 reglas; sin cambios de código después) |
| `pnpm run duplication` | **0 clones** (1.874 ficheros) |
| Tests focados F4 + paquetes tocados | **140/140** (15 ficheros) en el HEAD final; `llm` 1.234/1.234 y `session`/`agent-loop` 923/923 medidos por el auditor antes de los últimos cambios (paquetes no tocados después) |
| Gates re-medidos por el auditor | router recall@8 **0,915** / nDCG@8 **0,932** vs 0,890/0,883; memoria recall@5 **1,000**, bloque máx **1.033** chars |
| Secretos en el diff | solo fixtures de test; ninguna credencial real |
| Snapshots keyless | **no ejecutados** (ningún opt-in montado; se exigen al activar) |

### 10.5 · Decisiones pendientes del propietario

1. **Activar opt-ins en presets** (ninguno lo está): governor, dispatch gate en `enforce`, pruner por presión, router, memoria pasiva, redacción de telemetría, handoff. Ya no hay defecto funcional conocido que lo impida (la entrega del checkpoint al reanudar está corregida y probada); sigue el plan por opt-in del §11, con `pnpm run test:snapshot` en cada activación.
2. **Publicar ramas/PRs**: no hay push; se haría con fork/credenciales del propietario. CH-043 sigue apilada sobre CH-041; el árbol integrado es CH-050.
3. **E-3** (pin de integridad de plugins): sigue diferido.
4. **Ventana de 30 días de CH-047**: re-ejecutar la métrica longitudinal tras activar memoria/router; la regla actual dice **no activar C-2 sin señal**.
5. **MINOR-2…5** de la auditoría CH-050: validar `mode` en el dispatch gate, migrar/registrar las lecturas deprecadas de `tool-skill`, etiquetar el proxy de handoff como definición (no medición) y retirar el `inject` sin uso del router.
6. **Claves literales preexistentes en `auth.json`** (deepseek, anthropic, qwen-token-plan-individual): ajenas a este trabajo; migrarlas al keychain queda como higiene opcional.

### 10.6 · Cómo reanudar

El plan F0/F1/F4/F5 está cerrado. Para una nueva iteración: partir del árbol integrado (worktree `.worktrees/ch050`, HEAD `0175f5610b`, sin push), aplicar la decisión del propietario sobre activación/publicación y abrir un change nuevo por cada activación (con snapshots y evaluación en vivo). El expediente y sus gates están sellados en la rama local `audit/2026-11-02-harness`; no reescribir registros de persistencia aceptados.

-----

## 11 · Plan de activación de opt-ins — implementado como preset `sota` (ver §12)

**Estado:** propuesta. **Ningún preset ni bundle está modificado** por F5; el árbol integrado mantiene todos los opt-ins desmontados. Activar sigue siendo una decisión del propietario y, por la regla de ejecución del plan, cada activación es un change propio (con sus gates, snapshots y evaluación en vivo), no una edición suelta.

### 11.1 · Orden recomendado y montaje exacto

| # | Opt-in | Dónde se monta | Config de partida | Efecto model-visible |
|---|---|---|---|---|
| 1 | Redacción de telemetría (CH-046) | Host-plane, junto a `session-telemetry` en `packages/bundle/base/cordis.patch.yml` (y `sdk-minimal` si aplica) | sin config | Ninguno: solo redacta registros de salida |
| 2 | Governor (CH-041) | Presets agent-plane (`standard`, luego `ptc`/`cordis`) | `mcpSchemaTokenBudget: 3000`, `mcpToolDescriptionMaxLength: 120` | Recorta descripciones de schemas MCP |
| 3 | Dispatch gate (CH-042 A-2) | Presets agent-plane | `mode: audit`, `allow: []`, `deny: []` una semana; luego `mode: enforce` con la allowlist normalizada | Deniega llamadas no listadas en enforce |
| 4 | Pruner por presión (CH-042 A-3) | Row **existente** `tool-result-pruner` del preset de compactación | añadir `pressure: { maxContextTokens: <N>, pruneThresholdChars: <M> }` (M > `headChars` + marcador + `tailChars`) | Sustituye el middle de resultados grandes antes de la petición |
| 5 | Router skills/MCP (CH-043) | Grupo nuevo con `isolate: { skillRouter: true }` que contenga `@deepseek-ai/dsh-skill-mcp-router` y `@deepseek-ai/dsh-tool-skill` | `path` del índice FTS5 | Reordena y resume el catálogo de skills |
| 6 | Memoria pasiva (CH-044) | Presets agent-plane | `memoryDir: <directorio existente>`, `injectLimit: 5`, `injectQuotaChars: 4000`, `capture: false` al principio | Añade un mensaje user durable por turno con memoria inyectada |
| 7 | Handoff (CH-045) | Presets agent-plane; requiere la seam host `session-projections` (ya montada en `packages/bundle/base/cordis.patch.yml:138`) | `checkpointAssistantChars: 2000`, `maxToolCalls: 8`, `argumentChars: 200` | Añade el checkpoint como primer mensaje user del hijo |

Notas por opt-in:
- **2/3/4/5** cambian el texto o los schemas enviados al modelo: re-grabar snapshots del owner afectado (`pnpm run test:snapshot:refresh <owner> -t <caso>` + `pnpm run test:snapshot`) y re-ejecutar la agregación `check:ci:static`. Los números ya medidos por replay (0,45 % governor; 12,94 %/20,54 % pruner; recall@8 0,915/nDCG 0,932 router) son simulación, no evaluación en vivo.
- **3** debe pasar una semana en `audit` con el evento `tool/dispatch-gate` revisado antes de `enforce`; el gate cubre 12 vectores de bypass y `apply()` ahora falla ruidosamente ante un `mode` inválido.
- **4** el pruner ya está montado en el preset `standard`; activar presión es solo añadir el bloque `pressure`, no una row nueva. Empezar por la política conservadora.
- **5** si `tool-skill` o el router quedan fuera del mismo realm, `ctx.get('skillRouter')` devuelve undefined y el catálogo usa el fallback léxico intacto; añadir un test de composición Loader que pruebe ambos lados del realm antes de activar.
- **6** `memoryDir` debe existir (el plugin falla cerrado si no es un directorio). La inyección es historia durable y se reenvía en peticiones posteriores; la regla de CH-047 dice **no activar C-2 sin señal** (0 inyecciones en el baseline), así que exige ventana de 30 días con la métrica longitudinal antes de decidir.
- **7** entrega durable ya corregida con proyección host-only (reconstruye pendiente/entregado tras reanudar, probado); requiere la seam host `session-projections`. El gate de continuación es una **definición** (15/15 hechos), no una medición con modelo; evaluación en vivo pendiente para la activación.

### 11.2 · Prerrequisitos y rollback

- Provisionalmente **sin push ni PR**: publicar requiere las credenciales del propietario; CH-043 sigue apilada sobre CH-041 y el árbol integrado es `feat/ch050-integration`.
- Cada activación: (a) edita un solo preset/bundle, (b) re-graba los snapshots afectados, (c) pasa `check:ci:static`, `test:snapshot`, `lint`, `duplication`, y (d) registra el resultado en el expediente. Rollback = quitar la row/grupo o `disabled: true` y regenerar snapshots.
- Los eventos log-only escritos mientras un opt-in estuvo montado son válidos para este harness; un lector **anterior** rechaza el log (registro `docs/persistence-changes/2026-11-06-opt-in-session-events.md`): decidir la versión mínima de lectura antes de publicar sesiones con estos eventos.
- Medición longitudinal: `@deepseek-ai/dsh-experimental-longitudinal-eval` (`summarizeUsage`, `evaluateKillCriteria`) sobre logs reales; baseline CH-040/CH-047: 3 sesiones, 582 peticiones, 0 inyecciones de memoria, 2 días activos → memoria `disable` sin señal, skills `keep`.

### 11.3 · Fuera de esta propuesta

Push/PR, E-3 (pin de integridad de plugins; sigue diferido a aceptar riesgo de terceros), ventana de 30 días (no medible antes de activar), migración de las claves literales preexistentes de `auth.json` (higiene ajena a F5) y `auth.json`/dossier QWEN/PI-agent: no tocados.

-----

## 12 · PRODUCTO SOTA — preset `sota`, redacción host y paquete de publicación (2026-11-08)

**Estado:** **implementado y validado en el árbol integrado**, listo para publicar. HEAD final `4ff329d144` (41 commits, 215 ficheros, +10.001/−219) en la rama local `feat/ch050-integration`; **sin push** (requiere credenciales del propietario). No es una release: es el paquete de publicación más una activación opt-in real.

### 12.1 · Qué se añade sobre el árbol auditado del §10

- **Preset shipped `sota`** (`packages/preset/agent-presets/presets/sota/`): parte de `standard` y monta un opt-in por fila — governor MCP (3.000 tokens, descripciones 120), dispatch gate en `audit`, pruner por presión conservador (`maxContextTokens: 100000`, `pruneThresholdChars: 8192`), router FTS5 + `tool-skill` en realm aislado, memoria pasiva local (`capture: false`) y handoff. **`standard` sigue siendo el preset por defecto y no cambia**; una sesión que no nombra `sota` se compone igual que antes.
- **Redacción de telemetría por defecto en el host** (`dsh-base`): la garantía cubre todos los perfiles y presets; no es model-visible y no toca el log canónico.
- **Memoria pasiva operativa**: `memoryDir` se crea en el primer montaje si falta (antes un preset shipped fallaba al activar la fila).
- **Cierre del runtime**: los paquetes opt-in entran en la closure de `apps/cli` y `python/sdk-runtime`; `verify-runtime-closure` queda cerrado (5 presets, 145 paquetes).
- **Agent Notes bilingües** de la publicación: `.agents/notes/proposed/feature/2026-11-06-f4-integration.*` (árbol/auditoría/cierre) y `.agents/notes/proposed/feature/2026-11-08-sota-preset.*` (producto/activación). Mecanismos delegados a las siete notas de cada change.
- **e2e real** ampliado: `apps/cli/tests/web-agent-presets.e2e.ts` arranca la composición Web shipped, lista cinco presets, monta `sota` y comprueba catálogo idéntico a `standard`, router/pruner confinados al realm del preset y handoff registrado.

### 12.2 · Evidencia de validación (HEAD `4ff329d144`)

| Gate / prueba | Resultado |
|---|---|
| `pnpm run check:ci:static` | **55/55** |
| `pnpm run test:docs` | **20/20** |
| `pnpm run typecheck` | **exit 0** |
| `pnpm run lint:contracts-ready` | **0 warnings / 0 errors** |
| `pnpm run duplication` | **0 clones** |
| `pnpm run verify-package-invariants` | **39/39** |
| `pnpm run verify-runtime-closure` | **5 presets / 145 paquetes, cerrado** |
| `pnpm run verify-package-dependencies` | **63 conformes** |
| Tests de `agent-presets` (incluye roster shipped) | **190/190** |
| `memory-passive` | **16/16** |
| `ui-agent-preset` locales | **6/6** |
| **e2e REAL de composición Web con `sota`** | **33/33** |
| `pnpm run test:snapshot` | **152 passed / 2 skipped** (requiere `python3 >= 3.10` en `PATH`; el Python del sistema 3.9.6 solo falla en el escenario PTC-python, límite de entorno, no del diff) |
| Preset por defecto / snapshots existentes | **sin cambios** (`standard` intacto; ninguna grabación selecciona `sota`) |

### 12.3 · Cómo se usa y cómo se activa

- **Uso desde el repo:** construir/arrancar la Web (`pnpm run build:lib`, `pnpm run dsh web`) y elegir **SOTA mode** al crear una tarea. La selección es el único interruptor: no se reescribe ningún ajuste ni se migra ninguna sesión.
- **Distribución:** al publicar el árbol, el preset viaja en el paquete `dsh-agent-presets`; `apps/cli` y `python/sdk-runtime` garantizan que sus plugins estén instalados.
- **Secuencia de activación recomendada:** (1) `sota` en un perfil no-default; (2) dispatch gate una semana en `audit` y derivar la allowlist de los eventos `tool/dispatch-gate`; (3) pasar a `enforce`; (4) mantener `capture: false` de memoria hasta la ventana de 30 días; (5) medir con `dsh-experimental-longitudinal-eval` y aplicar kill-criteria.
- **Rollback:** no seleccionar `sota` (o eliminarlo) deja el producto exactamente como `standard`. Para la redacción host-wide, un despliegue que necesite telemetría sin redactar debe parchear la fila explícitamente.

### 12.4 · Riesgos y deudas declaradas

- **Drift de `standard`:** `sota` copia sus filas (mismo patrón que `ptc`); una fila nueva en `standard` debe replicarse a mano. El e2e detecta tools model-facing ausentes, no servicios ni secciones de prompt.
- **Audit no es enforcement:** hasta derivar la allowlist, `sota` observa las llamadas no listadas, no las bloquea.
- **Simulaciones, no medición en vivo:** governor 0,45 % y pruner 12,94 % son replay; router y memoria son fixtures sintéticas. La ventana de 30 días sigue pendiente.
- **Compatibilidad de lectura:** los tres eventos opt-in no son ignorables; un lector anterior rechaza una sesión escrita con ellos. No hay sesiones afectadas mientras no se usen los opt-ins.
- **Redacción host-wide:** cambia la telemetría de salida de todos los perfiles; es deliberado y reversible por patch.
- **Entorno de snapshots:** el escenario PTC-python exige Python ≥ 3.10 en `PATH`; con 3.9.6 falla por validación del intérprete. No es un fallo del árbol.

### 12.5 · Paquete de publicación (pendiente del propietario)

- **Rama:** `feat/ch050-integration`, HEAD `4ff329d144`, **sin push ni PR**; las credenciales y la decisión de publicación son del propietario.
- **Título de PR propuesto:** `feat(f4): integrate the seven opt-ins and ship the sota preset`.
- **Cuerpo:** el borrador completo está en el mensaje de publicación de esta sesión; resume integración + remediaciones + preset `sota` + redacción host + gates y enlaza las dos Agent Notes y las siete notas por change.
- **Después de publicar:** activar por perfil según §11/§12.3, re-grabar snapshots solo si se cambia el comportamiento por defecto (no es el caso), y arrancar la ventana de 30 días para memoria/skills.
