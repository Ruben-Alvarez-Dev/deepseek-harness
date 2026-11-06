# Informe de auditoría — pack PI-agent (protocolo `/auditoria-dev`)

**Fecha:** 2026-11-02 · **Objeto:** `/Users/ruben/Code/PI-agent` + dossier de anillos (`~/Code/QWEN-code/auditoria-pi-agent/`) + material borrado/sepultado.
**Método:** pases multidisciplinares (arquitectura, seguridad, datos, runtime, IA/ML, proceso) + arqueología git + pase adversarial + Dementor + fusión. Cada hallazgo lleva evidencia; lo que no se ejecutó va marcado `sin-verificar`.

---

## Veredicto central

**El pack no falla por mal código, falla por estado: conviven cuatro planificaciones sin jerarquía, dos de ellas purgadas, con 97 ficheros borrados sin registrar, 27 entradas de expediente que nunca se escribieron y un fix de seguridad que se perdió por no commitearse.**

---

## 1 · Hallazgos por severidad


### BLOCKER

| ID | Dimensión | Hallazgo | Evidencia | Por qué importa | Recomendación |
|---|---|---|---|---|---|
| **B-1** | Seguridad / datos | **Fuga entre proyectos de `pi-memory:recall`**: el fix (change 062, `memory-tenant.ts`) **nunca se commiteó ni existe en disco** | `docs/audit-2026-10-28/00-INFORME.md:5-6` documenta la reproducción; `05-FORENSE.md` §7: `git rev-list --objects --all \| grep memory-tenant` vacío, `find` sin resultado, `tasks.md` lo da por `[x]` · **verificado en esta sesión**: ni el HEAD del repo (`@pi-agent/memory@1.0.0`) ni el paquete en ejecución (`pi-memory@0.4.2`, en `~/.pi/agent/npm/node_modules`) contienen `memory-tenant`/`PI_CORE_TENANT` | Es el único defecto de confidencialidad reproducido en vivo, y el remedio se perdió | Reescribir el change 062 desde cero; mientras tanto, desactivar la inyección automática de recall |
| **B-2** | Seguridad / cripto | **Clave privada Ed25519 real dentro del dossier**, en `demo/tmp/d1.db` (modo 0644), tabla `meta`: `memory.signer.privatePem` 119 B (verificado: contiene cabecera `PRIVATE KEY`) | `08-DOSSIER.md` §1 · verificado con `sqlite3` (longitud y cabecera, sin volcar valor) | El dossier materializa el defecto que denuncia (clave en la misma DB que firma) y la deja legible por terceros | Regenerar o eliminar `d1.db` antes de compartir |
| **B-3** | Seguridad / secretos | **Valor literal de una clave volcado a la transcripción de la auditoría** (declarado por el propio dossier) | `A1-config-viva.md:9` y `:517` `sin-verificar` (no reproducido aquí) | El secreto sobrevive fuera del informe; la rotación recomendada no consta ejecutada | Rotar la clave y purgar la transcripción |

### CRITICAL

| ID | Dimensión | Hallazgo | Evidencia | Recomendación |
|---|---|---|---|---|
| **C-1** | Ops / gobernanza | **3 LaunchAgents cargados** (`dev.pijartura.proxy`, `.logrotate`, `.watchdog`) apuntan dentro de `PI-agent/`, contra la norma de la casa | `CONVENTIONS.md:104-105`; `launchctl` verificado por el analista: agentes cargados y ejecutando `start.sh`/`rotate-logs.sh`/`watch-proxy.sh` desde el repo | `launchctl bootout` o mover el servicio fuera del repo; decidir antes de cualquier refactor |
| **C-2** | Seguridad / credenciales | **Credenciales duplicadas**: `pi-jart-ura/.env` con 7 claves `sk-` que también viven en el keychain y `auth.json` | Auditoría jart-ura §4; `CONVENTIONS.md:100-103` dice que las claves viven solo en el credential store del SO | Rotar y dejar una sola fuente |
| **C-3** | Datos | **97 ficheros de `src/pi-memory` borrados sin commitear** (12.655 líneas): un `git checkout`/`clean` accidental los revive o los pierde | `git status`: 97 ` D`; `git ls-tree HEAD src/pi-memory` = 97 | Decidir: `git restore` (conservar) o commitear el borrado con entrada E-NNN |
| **C-4** | Proceso | **El expediente no registra sus propios borrados**: 27 entradas ausentes (E-031…E-057 salvo E-047); 5 de 9 commits con borrados sin entrada | `git log -S"### E-031"` vacío; cabeceras presentes: E-018…E-030, E-047, E-058…E-066 | Reconstruir el tramo desde commits o declarar la pérdida formalmente |
| **C-5** | Documentación viva | **README y docs de piezas vivas afirman comportamientos que el código no tiene**: captura de episodios «cableada» (0 llamadas reales), tests citados inexistentes, «nada abierto» con 4 pendientes | Auditoría router §5, auditoría meta §1; `makeEpisodeCapture` sin llamadas en `src/` | Corregir docs a los hechos; el gate de doc debe ser mecánico |

### MAJOR

| ID | Dimensión | Hallazgo | Evidencia | Recomendación |
|---|---|---|---|---|
| **M-1** | Arquitectura | **72 % del código sin consumidor**: 10.103/13.982 líneas y 24 de 27 capacidades no las ejecuta ningún proceso | `INFORME-AUDITORIA-PI-AGENT.md:32,64`; verificado en el árbol: nadie importa `pi-intermediate` | Cablear o retirar; no extraer anillos sobre código sin consumidor |
| **M-2** | Seguridad | **Controles aspiracionales en `pi-intermediate`**: trust inerte con β=0, cuarentena que no filtra el routing, redacción que no se aplica al persistir, journal sin verificador | Probes ejecutados en esta auditoría (`05-FORENSE`/estudio §3); `token-ring`/`router.ts:54-56`/`ingest.ts:196-201` | Corregir o marcar como no implementado |
| **M-3** | Arquitectura | **Duplicación de router**: `pi-jart-ura` es un port de `pi-account-router`, y su copia **instalada va por delante del repo** | Auditoría jart-ura §5: extensión instalada con guard que no está en `client/index.ts` | Decidir cuál manda y archivar el otro |
| **M-4** | Proceso | **`tools/` no ejecutable**: el gate que HANDOFF cita como verde no se reproduce (falta `tsx`; type-stripping falla en `node_modules`) | Ejecutado: `node tools/check-you-key-leaks.ts` → `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` | Declarar el gate roto o arreglarlo |
| **M-5** | Proceso | **Tres totales distintos del mismo gate de probes**: 10/29/33 citados; 32 reales en HEAD | `HANDOFF.md:21,50`; `E-066:696`; `HANDOFF-2026-10-28.md:16` | Un solo número medido |
| **M-6** | Datos / riesgo | **30 commits colgantes fuera de `prune-expire`**: un `git gc` los elimina | `git fsck --unreachable`; verificado que no están en reflog (inferido que `gc` los poda) | Extraer el bundle y los objetos antes de cualquier limpieza |
| **M-7** | Datos / riesgo | **El plan de arquitectura del ecosistema está untracked** (`?? docs/audit-2026-10-18/arquitectura-ecosistema/`) | `git status` | Versionarlo; es la única copia |

### MINOR

| ID | Hallazgo | Evidencia |
|---|---|---|
| **m-1** | Tres versiones incoherentes en `pi-intermediate`: `package.json` 1.0.0 · `SCHEMA_VERSION` 1.7.0 · `CONTRACT_VERSION` 1.0.0 | `package.json`, `db.ts:97`, `contract.ts:12` |
| **m-2** | Probes de auditoría gitignored (14 en árbol, 1 trackeado): evidencia no reproducible | `.gitignore:14`; `S4` §T4 |
| **m-3** | Los gates de documentación de DSH fallan en el árbol actual (preexistente a este trabajo): `docs/plugins.md` wrap, `README`/`architecture` desincronizados de su pareja i18n | `pnpm run test:docs` ejecutado |
| **m-4** | `README.md` raíz se autodeclara «estado 2026-10-17» con HEAD del 26 | `README.md:37` |

### INFO

| ID | Hallazgo |
|---|---|
| **i-1** | Convivieron **cuatro planificaciones** sin jerarquía: `pi-harness` (10-oct, purgada), Atlas SOTA (purga E-020), arquitectura de ecosistema (18-oct, untracked), extracción por anillos (25-oct, fuera de git) |
| **i-2** | El material borrado **es recuperable** en su mayoría: 526 tests, 32 commits del router, D-revision, change 024 |

---

## 2 · Lo que SÍ funciona (medido, no decorativo)

- **`pi-account-router`**: gate completo verde **ejecutado** — `typecheck`, `lint`, 13/13 specs, **14/14 probes en 89 s** —, montado en `~/.pi/agent/settings.json` y con uso real hoy (log con `turn.completed`).
- **`pi-jart-ura`**: servicio operativo 24/7, **59 tests en verde**, `security-check.sh` 18/18, proxy vivo 3 días, credenciales fuera del código.
- **La disciplina de evidencia del dossier de anillos**: separación DOC/COD/EXE/INT, falsación por ejecución, colofones adversariales. Es el mejor artefacto del pack.
- **La recuperabilidad**: el bundle del router (**32 commits validados por clonación**), los 526 tests y D-revision están a un comando de distancia.
- **Los gates de DSH** (cobertura por fichero, snapshots de sesión, catálogos generados) frente a la ausencia total de suite en Pi.

## 3 · Correcciones de los propios auditores

1. «`pi-intermediate` tiene 0 consumidores» → **matizar**: cero *en el árbol actual*; en HEAD lo consumía `pi-memory`, borrado sin commitear.
1-bis. «El dossier está limpio de credenciales» → **falso por método**: mi escaneo excluyó `*.db`; la clave privada está dentro de `demo/tmp/d1.db` (B-2). Escanear binarios también.
1-ter. «`pi-memory` no existe» → **matizar**: el árbol de trabajo tiene borrada la versión del repo (`@pi-agent/memory@1.0.0`, que sí depende de `@pi-agent/intermediate`), pero el runtime de Pi carga **`npm:pi-memory@0.4.2`**, un linaje anterior y sin esa dependencia. Por eso «0 consumidores de `pi-intermediate`» se sostiene **en el sistema vivo** y no en HEAD.
2. «La compactación de DSH puede blanquear contenido inyectado» → **falso**: existe test (`manual-compaction.spec.ts:288-317`).
3. «D-revision estaba citado en la auditoría del 18-oct» → **falso**: las citas vivían en `CONVENTIONS.md`, `HANDOFF.md` y el expediente.
4. Ubicación del expediente: se escribió dos veces en el sitio equivocado antes de fijarlo.
5. **No se ejecutó el protocolo `/auditoria-dev`** en el primer pase; esta entrega lo cumple.

## 4 · Estimación de esfuerzo

| Frente | Rango |
|---|---|
| Decidir árbol (97 borrados + untracked) | 1 h de decisión |
| Versionar expediente + este informe | 1–2 h |
| Extraer material recuperable | 2–4 h |
| Reversionar 526 tests + gate | 2–5 días |
| Remediar la fuga (change 062 perdido) | 1–2 semanas |
| Decidir `pi-jart-ura` | 2–5 días |
| Reconstruir E-031…E-057 | 1–2 días |
| **Total** | **3–6 semanas** |

## 5 · Calidad del dossier de anillos (auditado A1, A2, colofón adversarial, demos)

- **Ejemplar en su método**: su propio colofón adversarial refuta **7 de 8 claims** del diseño principal — «cuatro escritores» cuando son once, la lista «copiar tal cual» no es pura, el criterio del paso 3 es insatisfacible con esa lista, inversiones de dependencia, y «viable sin reescribir nada» falso por el propio texto del diseño. La v5 integra las correcciones (`DISENO-EXTRACCION-ANILLOS-PI.md:5,9,25`). Es el estándar que merece exportarse.
- **A1 (config viva, 686 líneas)**: estructura los ficheros sensibles **sin volcar valores**; 14 rutas personales, **0 credenciales** detectadas por escaneo de patrones (`sk-`, `ghp_`, `Bearer`, `BEGIN PRIVATE KEY`, `AIza`). Redacción correcta.
- **A2 (repo implementado, 393 líneas)**: estado git, norma, OpenSpec, expediente y coherencia spec↔código.
- **Referencias muertas**: cita `REFERENCIA-QWEN-CODE.md` y `PROPUESTA-CONFIG-SOTA.md`, ausentes del directorio.
- **No versionado**: el dossier entero vive fuera de git y sin copia.

## 6 · Índice del expediente

| Fichero | Contenido |
|---|---|
| `00-INFORME.md` | Este informe consolidado |
| `01-INVENTARIO-CONSOLIDADO.md` | Las ~60 mejoras del dossier, normalizadas |
| `02-MAPA-DSH.md` | Correspondencia Pi → DSH verificada contra el código |
| `03-SOTA-Y-RECOMENDACION.md` | Contraste externo de los candidatos |
| `04-AUDITORIA-ITEM-POR-ITEM.md` | Las 60 filas con disposición |
| `05-FORENSE.md` | Material borrado/sepultado y cómo recuperarlo |
| `06-ADVERSARIAL-Y-DEMENTOR.md` | Ataques, escepticismo y correcciones |
| `07-ESTUDIO-ADOPCION.md` | Estudio de qué adoptar en DSH (2 adopciones) |
| `08-DOSSIER.md` | Auditoría del dossier: clave privada en `d1.db`, caducidad de la evidencia, contradicciones v5↔S1-S4, demos sobreafirmadas |

## 7 · Límites

- No se re-ejecutaron las 60 cifras del dossier; algunas se verificaron (526 tests, 97 ficheros, 32 commits del bundle), otras se heredan marcadas `[V]` del propio dossier.
- La fuga entre proyectos (**B-1**) se apoya en el informe del 28-oct, no en una reproducción propia: `sin-verificar`.
- No se ejecutó `git gc` ni ninguna operación destructiva; la arqueología fue de solo lectura.
