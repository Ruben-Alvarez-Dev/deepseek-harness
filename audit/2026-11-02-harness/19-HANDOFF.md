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
2. **F4 / CH-045 (P5) — siguiente:** handoff de sesión (`/handoff <goal>` y enlace padre→hijo por tool) según `planificacion/13-PLAN-SOTA-DSH.md`. CH-044 quedó cerrado opt-in en `.worktrees/ch044` (recall@5 1,000, redacción verificada, `c3e2e86`); CH-043 (`acd3e30`/`2b04540`), CH-042 y CH-041 también cerrados opt-in y sin push.
3. **Cerrado:** residuo de la clave en `jart-os-development`, `d1.db` original de QWEN-code y rotador agnes (eliminados/desinstalados con tu autorización del 2026-11-06).

## 7 · Avisos

- Ninguna de las dos copias del dossier contiene ya `d1.db`: eliminadas el 2026-11-06 (CH-004; la original con autorización expresa).
- El expediente está versionado en la **rama local** `audit/2026-11-02-harness` (commit `45c3443`), sin push.
- No tocar los originales: dossier QWEN, `~/Code/PI-agent`, `~/Code/JARTOS/jart-os-development` y `~/Code/JEV-AI` solo se han leído o copiado.
