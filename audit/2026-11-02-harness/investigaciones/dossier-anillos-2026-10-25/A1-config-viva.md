# A1 — Configuración viva de Pi (`~/.pi/`)

**Anexo:** A1 · Auditoría del agente Pi
**Fecha del levantamiento:** 2026-10-25 (08:11–08:30 hora local)
**Ámbito:** `~/.pi/agent/`, `~/.pi/proxy/`, `~/.pi/secrets/`
**Modo:** estrictamente solo lectura sobre el sistema auditado. Única escritura: este fichero.
**Regla de secretos aplicada:** de `auth.json`, `account-router*.json`, `~/.pi/secrets/**` y cualquier campo `apiKey`/`credential`/`bearer` se registra **solo** nombre, tamaño, permisos, mtime y estructura (nombres de campo, nº de entradas, tipos). Ningún valor de credencial se reproduce: donde apareció uno, se marca `[REDACTADO]`.

> **Aviso de integridad del propio auditor.** Durante la verificación de números de línea, un `grep -n '"apiKey"' ~/.pi/agent/models.json` volcó a la transcripción el valor literal de una clave (línea 147). El valor **no** se reproduce en este informe ni en ningún otro artefacto; se cita como `[REDACTADO]` y el hallazgo correspondiente es **H-1**. Se declara aquí porque la transcripción de la auditoría lo contiene y debe quedar trazado.

---

## 0. Veredicto central

**La configuración viva de Pi es coherente en su capa declarativa y deliberada en su diseño (limbo de capacidades fuera de contexto, Keychain para el proveedor principal, pool de dos claves con allowlist de herramientas), pero su higiene de secretos y de ciclo de vida está rota en cuatro puntos concretos y verificables: una clave API en claro dentro de `models.json:147`, 214 MB de transcripciones de sesión en modo 0644 que contienen material con forma de credencial, un log de 5,2 MB creciendo dentro del directorio llamado `secrets/` también en 0644, y una extensión cargada mediante un symlink colgante.** No hay VCS en `~/.pi`: los 17 artefactos `.bak` manuales son el único mecanismo de reversión.

Cifras de escala: **307 MB** en `~/.pi`, **207 ficheros** y **77 directorios** excluyendo `node_modules` (**2.532** ficheros incluyéndolo), **38 entradas** en el nivel superior de `agent/`.

---

## 1. Inventario forense

### 1.1 Raíz `~/.pi/`

| Ruta | Bytes | Permisos | mtime |
|---|---:|---|---|
| `~/.pi/` (dir) | — | `drwxr-xr-x` (0755) | 2026-10-02 00:03 |
| `~/.pi/.DS_Store` | 6.148 | `-rw-r--r--` | 2026-10-22 00:07 |
| `~/.pi/agent/` (dir) | — | `drwxr-xr-x` (0755) | 2026-10-25 07:41 |
| `~/.pi/proxy/` (dir) | — | `drwxr-xr-x` (0755) | 2026-10-01 23:55 |
| `~/.pi/proxy/agnes-rotation.json` | 122 | `-rw-r--r--` (0644) | 2026-10-01 23:55 |
| `~/.pi/secrets/` (dir) | — | `drwxr-xr-x` (0755) | 2026-10-19 04:44 |
| `~/.pi/secrets/.DS_Store` | 6.148 | `-rw-r--r--` | 2026-10-21 04:25 |
| `~/.pi/secrets/vault/` (dir) | — | `drwxr--r--` (0744) | 2026-10-02 00:03 |
| `~/.pi/secrets/vault/server.log` | **5.186.594** | `-rw-r--r--` (0644) | **2026-10-25 08:11** |

`~/.pi/secrets/` contiene **exactamente un fichero**, y es un log. Ver **H-2**.

### 1.2 `~/.pi/agent/` — nivel superior (28 ficheros + 10 directorios = 38 entradas)

Ordenado por mtime ascendente. Columna «sens.» = contiene o referencia credenciales.

| # | Nombre | Bytes | Permisos | mtime | Sens. |
|--:|---|---:|---|---|:--:|
| 1 | `bin/` (dir) | — | `drwxr-xr-x` | 2026-09-28 05:19:58 | |
| 2 | `scripts/` (dir) | — | `drwxr-xr-x` | 2026-09-28 12:08:31 | |
| 3 | `npm/` (dir) | — | `drwxr-xr-x` | 2026-09-28 23:53:13 | |
| 4 | `logs/` (dir) | — | `drwxr--r--` (0744) | 2026-10-02 00:03:11 | |
| 5 | `models.json.bak-20261003-140755` | 1.186 | `-rw-------` | 2026-10-03 14:07:55 | ✔ |
| 6 | `models.json.bak-agnes-fix-20261003-141404` | 5.912 | `-rw-------` | 2026-10-03 14:07:55 | ✔ |
| 7 | `extensions/` (dir) | — | `drwxr-xr-x` | 2026-10-06 01:29:09 | |
| 8 | `models.json.bak-20261010001116` | 6.038 | `-rw-------` | 2026-10-09 19:41:49 | ✔ |
| 9 | `account-router-accounts.json` | 732 | `-rw-------` | 2026-10-09 22:16:19 | ✔ |
| 10 | `account-router.json.bak-20261010001706` | 834 | `-rw-------` | 2026-10-09 22:16:19 | ✔ |
| 11 | `account-router-accounts-verification.json` | 2.280 | `-rw-------` | 2026-10-09 22:23:13 | ✔ |
| 12 | `account-router-performance-pilot.json` | 490 | `-rw-------` | 2026-10-09 22:38:50 | ✔ |
| 13 | `account-router-performance.json` | 3.149 | `-rw-------` | 2026-10-09 22:39:19 | ✔ |
| 14 | `models.json` | 6.108 | `-rw-------` | 2026-10-10 00:11:16 | ✔ |
| 15 | `settings.json.bak-20261010002015` | 564 | `-rw-r--r--` | 2026-10-10 00:20:12 | |
| 16 | `mcp-project-approvals.json` | 699 | `-rw-------` | 2026-10-11 03:11:43 | |
| 17 | `profiles/` (dir) | — | `drwxr-xr-x` | 2026-10-13 01:00:54 | |
| 18 | `settings.json.bak-20261017-scr-to-src` | 576 | `-rw-r--r--` | 2026-10-17 09:40:01 | |
| 19 | `prompts/` (dir) | — | `drwxr-xr-x` | 2026-10-17 12:35:38 | |
| 20 | `crashes.json` | 7.564 | `-rw-r--r--` | 2026-10-19 02:13:31 | |
| 21 | `AGENTS.md` | 1.300 | `-rw-r--r--` | 2026-10-19 03:42:04 | |
| 22 | `capabilities.json.bak-tuios` | 169.930 | `-rw-r--r--` | 2026-10-19 04:43:01 | |
| 23 | `backups/` (dir) | — | `drwxr-xr-x` | 2026-10-19 04:43:54 | |
| 24 | `account-router.json.bak-20261019-vision` | 1.382 | `-rw-------` | 2026-10-19 05:48:07 | ✔ |
| 25 | `account-router.json` | 1.854 | `-rw-------` | 2026-10-19 05:50:12 | ✔ |
| 26 | `mcp-onboarding.json` | 121 | `-rw-r--r--` | 2026-10-23 04:50:56 | |
| 27 | `settings.json` | 606 | `-rw-r--r--` | 2026-10-23 04:51:13 | |
| 28 | `mcp.log` | 4.786 | `-rw-r--r--` | 2026-10-23 08:02:16 | |
| 29 | `sessions/` (dir) | — | `drwxr-xr-x` | 2026-10-24 09:40:50 | |
| 30 | `mcp-adapter.json.bak-20261024-you` | 212 | `-rw-r--r--` | 2026-10-25 05:18:49 | |
| 31 | `mcp-adapter.json` | 716 | `-rw-r--r--` | 2026-10-25 05:19:02 | ✔ (ref.) |
| 32 | `capabilities.json` | 200.429 | `-rw-r--r--` | 2026-10-25 05:28:43 | |
| 33 | `models-store.json` | 78.150 | `-rw-------` | 2026-10-25 06:05:59 | |
| 34 | `trust.json` | 247 | `-rw-r--r--` | 2026-10-25 06:05:59 | |
| 35 | `mcp-cache.json` | 597.749 | `-rw-r--r--` | 2026-10-25 06:50:31 | |
| 36 | `auth.json` | 3.997 | `-rw-------` | 2026-10-25 07:41:17 | ✔ |
| 37 | `account-router-state/` (dir) | — | `drwx------` (0700) | 2026-10-25 08:15:28 | ✔ |
| 38 | `.DS_Store` | 8.196 | `-rw-r--r--` | 2026-10-22 00:07 | |

Los 28 ficheros suman **1.105.807 bytes (~1,05 MB)**. `mcp-cache.json` aporta él solo **597.749 B = 54 %** del total. Los 10 directorios suman los 306 MB restantes (ver §1.5).

**Disciplina de permisos observada:** los 12 ficheros que contienen credenciales o referencias a ellas están **todos** en `0600`, y `account-router-state/` en `0700`. Ninguna excepción. Ver §6.

### 1.3 Los `.bak-*` y la política de backups que implican

**17 artefactos de backup**: 9 en el nivel superior de `agent/`, 8 en `backups/`.

| Convención | Ejemplos | Nº |
|---|---|--:|
| `.bak-<YYYYMMDDHHMMSS>` | `account-router.json.bak-20261010001706`, `models.json.bak-20261010001116`, `settings.json.bak-20261010002015` | 3 |
| `.bak-<YYYYMMDD>-<HHMMSS>` | `models.json.bak-20261003-140755` | 1 |
| `.bak-<YYYYMMDD>-<slug>` | `account-router.json.bak-20261019-vision`, `settings.json.bak-20261017-scr-to-src`, `mcp-adapter.json.bak-20261024-you` | 3 |
| `.bak-<slug>-<YYYYMMDD>-<HHMMSS>` | `models.json.bak-agnes-fix-20261003-141404` | 1 |
| `.bak-<slug>` (sin fecha) | `capabilities.json.bak-tuios` | 1 |
| `.bak-<YYYYMMDD>[-pre-<slug>]` | `capabilities-footer.ts.bak-20261006` + `-pre-3d`, `-pre-grid`, `-pre-repo`, `-pre-sota`, `-pre-table` | 6 |
| `.bak.<YYYYMMDD>-<HHMMSS>` (punto) | `settings.json.bak.20260928-120759`, `zshrc.bak.20260928-120759` | 2 |

**Política inferida (evidencia de mtimes, no declarada en ningún sitio):** snapshot manual *copy-on-write* tomado **inmediatamente antes de una edición**, donde el **nombre codifica el instante de la edición** y el **mtime se preserva del original** (semántica `cp -p`). Se falsifica así:

- `account-router.json.bak-20261010001706` → nombre `2026-10-10 00:17:06`, mtime `2026-10-09 22:16:19`. Ese mtime es **idéntico** al de `account-router-accounts.json` (2026-10-09 22:16:19), es decir, el mtime del original pre-edición.
- `models.json.bak-20261010001116` → nombre `2026-10-10 00:11:16`, mtime `2026-10-09 19:41:49`; y `models.json` vivo tiene mtime `2026-10-10 00:11:16`, **exactamente el timestamp del nombre del backup**.
- `account-router.json.bak-20261019-vision` (mtime 05:48:07) → `account-router.json` (mtime 05:50:12): **2 minutos** de separación.

Los slugs semánticos (`-vision`, `-scr-to-src`, `-you`, `-tuios`, `agnes-fix`, `-pre-sota`) etiquetan la **intención** de la edición, y se corresponden con cambios verificables: `-scr-to-src` con el rename del directorio del paquete (`settings.json:21`), `-you` con la migración al pool de dos claves You.com (§2.3), `-vision` con la política de visión de `AGENTS.md:9-12`.

**Lo que esa política NO tiene:** retención, poda, índice, manifiesto, cifrado, automatización ni VCS. Los dos backups más antiguos (`zshrc.bak.20260928-120759`, `settings.json.bak.20260928-120759`) tienen **28 días**; los 6 `capabilities-footer.ts.bak-*`, **19 días**; y respaldan un fichero que **ya no existe** (§H-4). Ver **M-8** y **B-2**.

**Trazabilidad de la evolución de la config** (gracias a `backups/settings.json.bak.20260928-120759`, 173 B):

| Campo | 2026-09-28 | 2026-10-23 (actual) |
|---|---|---|
| `lastChangelogVersion` | `0.87.1` | `1.4.0` |
| `defaultProvider` | `deepseek` | `account-router` |
| `defaultModel` | `deepseek-v4-pro` | `agnes-3.0-flash` |
| `packages` | 1 entrada | 2 entradas |
| `extensions` | ausente | `["-builtin:mcp"]` |

### 1.4 Subdirectorios de `agent/`

| Dir | Permisos | Contenido | Bytes |
|---|---|---|---:|
| `bin/` | 0755 | 1 fichero: `fd`, Mach-O 64-bit arm64, mtime **2026-08-26** (el objeto más viejo de `~/.pi`) | 2.970.480 |
| `scripts/` | 0755 | 1 fichero: `pi-optimization-routine.sh`, `-rwxr-xr-x`, 2026-09-28 | 6.141 |
| `npm/` | 0755 | `package.json` (105 B), `package-lock.json` (27.966 B), `.gitignore` (14 B), `node_modules/` con **40 paquetes** top-level | ~83 MB |
| `logs/` | **0744** | `local-qwen9b.err.log` (3.244 B, 2026-10-17), `local-qwen9b.out.log` (**0 B**, 2026-10-02) | 3.244 |
| `extensions/` | 0755 | `registry-search.ts` (16.630 B), `skill-router.ts` (4.833 B), `capabilities-footer` → **symlink colgante** | 21.463 |
| `profiles/` | 0755 | `default.json` (1.504 B, `-rw-------`, 2026-10-13) | 1.504 |
| `prompts/` | 0755 | **13** `.md`: 12 `opsx-*` + `auditoria-dev.md` | ~178 KB |
| `backups/` | 0755 | 8 `.bak`, 2 dirs-snapshot, 1 `.DS_Store` | ~200 KB |
| `sessions/` | 0755 | **54 dirs** de proyecto, **129** `.jsonl`, 1 `.DS_Store` (22.532 B) | **214 MB** |
| `account-router-state/` | **0700** | estado vivo + `.tmp` huérfano + `audit/` (2 JSONL) + `profiles/` (1 JSON) + `.DS_Store` | ~200 KB |

Detalle de los subdirectorios relevantes:

**`extensions/`** — sin manifiesto: no hay `package.json` ni descriptor; el «manifiesto» es el bloque JSDoc de cabecera de cada `.ts`.
- `registry-search.ts:1-24` — «capa de capacidades (SOTA): just-in-time retrieval + progressive disclosure». Registra `search_registry`, `read_skill`, `fetch_skill`, `capabilities`. Registros remotos: Smithery (~17,6k MCP) y skills.sh (~20k skills) vía CLI `skills` con `execFile`. Ranking: `registry-search.ts:17` «BM25 (k1=1.2,b=0.75) + modo regex + rerank (popularidad/exact/trust)». Seguridad: `registry-search.ts:18` «trust por origen + aviso para fuentes no confiables (no ejecutar)».
- `skill-router.ts:1-8` — expone `search_skills` + comando `skills-refresh` para las skills con `disable-model-invocation: true`, que Pi no anuncia en el system prompt.
- `capabilities-footer` → symlink a `/Users/ruben/Code/FLYBOX/src`, **destino inexistente**. Ver **H-4**.

**`sessions/`** — 54 directorios, uno por `cwd`, con la ruta codificada (`/`→`-`, envuelta en `--…--`). 129 ficheros `.jsonl`, formato de nombre `<ISO8601-con-guiones>_<uuid-v7>.jsonl` (p. ej. `2026-10-12T11-26-33-565Z_01a12fdd-485d-77b2-acd2-6a45e4df3304.jsonl`). Rango **2026-09-28 → 2026-10-25** (28 días). Todos `-rw-r--r--` (0644). **7 directorios vacíos**: `--Users-ruben--`, `--Users-ruben-Movies--`, `--Users-ruben-Code-OBSIDIAN--`, `--Users-ruben-Code-PI-alternatives--`, `--Users-ruben-Code-PI-agent-pi-planner--`, `--Users-ruben-Code-deepseek-harness--`, `--Users-ruben-Code-ALBERTO - TEXTO--`. Ficheros de hasta ~1,55 MB. Ver **H-3**.

**`account-router-state/`** (0700) —
- `e592ff32df1fbb1186fde4f8.json` (1.552 B, `-rw-------`, mtime **2026-10-25 08:15:28**) — estado vivo. Campos: `version:number`, `lastAccountId:string`, `groups:array[5]`, `disabledAccountIds:array[0]`, `leases:array[2]`, `waiters:array[0]`, `latEWMA:object{4}`.
- `e592ff32df1fbb1186fde4f8.json.d656e6f5-c318-49a9-83a0-e9f65aeaf744.tmp` (1.260 B, `-rw-------`, mtime **2026-10-19 10:41**) — temporal de un *write-tmp-then-rename* interrumpido hace **6 días**. Ver **M-6**.
- `audit/2026-10-18.jsonl` (122.317 B) y `audit/2026-10-19.jsonl` (70.536 B), ambos `-rw-------`, dir `drwx------`. **Solo 2 días**, mientras el router siguió activo hasta el 25.
- `profiles/default-e592ff32df1f.json` (1.114 B, `-rw-------`, 2026-10-13) — mismo esquema que el estado vivo **menos `latEWMA`**.
- `.DS_Store` (6.148 B, 0644) **dentro** del directorio 0700.

**`backups/`** —
- `anthropic-auth-2026-10-09T17-42-01-556Z/` (`drwx------`) → `auth.json` (3.675 B, `-rw-------`). Snapshot de credenciales de **16 días**, fuera de todo ciclo de rotación. Permisos correctos.
- `skills-20260928-121149/` → 3 skills archivadas: `inference-playbook/SKILL.md` (2.725 B), `knowledge-hub/SKILL.md` (2.449 B), `openspec-workflow/SKILL.md` (1.423 B). Ver **M-5**.
- 6 × `capabilities-footer.ts.bak-20261006*` (12.561 / 29.673 / 17.045 / 38.336 / 26.546 / 20.767 B), todos `-rw-r--r--` — son las **únicas copias supervivientes** del código de la extensión del symlink roto.
- `settings.json.bak.20260928-120759` (173 B), `zshrc.bak.20260928-120759` (2.215 B). El segundo es un backup del `~/.zshrc` del usuario: **no pertenece** al árbol de configuración de Pi.

**`npm/`** — `package.json`: `{"name":"pi-extensions","private":true,"dependencies":{"pi-mcp-adapter":"^6.0.0"}}`. Instalado: **6.0.0** (coincide exactamente con `mcp-onboarding.json:piBuiltinMcpHandledVersion`). `.gitignore` = `*` + `!.gitignore`. Los 40 paquetes incluyen `@modelcontextprotocol`, `jose`, `undici`, `zod`, `ajv`, `pkce-challenge`, `recheck` + `recheck-jar` + `recheck-macos-arm64` (binario nativo), y la cadena de lanzamiento de navegador `open`/`default-browser`/`run-applescript`/`wsl-utils`/`is-wsl`/`is-docker`.

**`logs/`** — `local-qwen9b.err.log` registra **6 ciclos** de arranque/parada de `llama_server` en `http://127.0.0.1:9118`, cargando `/Users/ruben/Code/mcp-gateway/mcp-gateway/models/Qwen3.8-9B-heretic-uncensored-Q4_K_M.gguf` (`n_slots = 4, n_ctx_slot = 4096`). El puerto **9118 no aparece en ninguna configuración viva**: el único endpoint local declarado es `models.json:145` → `http://localhost:20128/v1` (proveedor `omniroute`). `local-qwen9b.out.log` pesa **0 bytes**.

### 1.5 Distribución del peso

| Ruta | Tamaño | % de `~/.pi` |
|---|---:|---:|
| `agent/sessions/` | 214 MB | 69,7 % |
| `agent/npm/` | 83 MB | 27,0 % |
| `secrets/` | 5,4 MB | 1,8 % |
| `agent/mcp-cache.json` | 584 KB | 0,2 % |
| `agent/backups/` | 200 KB | — |
| `agent/capabilities.json` | 196 KB | — |
| **Total** | **307 MB** | 100 % |

El **96,7 %** del volumen son transcripciones de sesión y `node_modules`. La configuración declarativa propiamente dicha pesa ~1 MB.

---

## 2. Capa declarativa no sensible (leída completa)

### 2.1 `AGENTS.md` (1.300 B, 0644, 2026-10-19 03:42)

Dos políticas de usuario, nada más. **No documenta el modelo de configuración ni la precedencia entre ficheros** (ver §4.2 y **M-2**).

**Política 1 — credenciales You.com** (`AGENTS.md:1-6`):
- `:3` — pool obligatorio de **dos** claves, alternando entre `you-key-1` y `you-key-2`; prohibido sustituir por OAuth, una tercera credencial o acceso anónimo.
- `:4` — «Both keys are stored in the **OS credential store** by pi-mcp-adapter, bound to `https://api.you.com/mcp`. **Never print, include in prompts/arguments, log, or copy their values** into repositories or documentation.»
- `:5` — no rotar/revocar/sustituir; si una clave no está disponible, **fallar explícitamente** en lugar de caer en OAuth u otra clave en silencio.
- `:6` — la política aplica igual a MCP, CLI, SDK y REST; los caminos CLI de clave única **no deben usarse por defecto**.

**Política 2 — visión de imágenes** (`AGENTS.md:8-12`, declarada «permanente»): las imágenes enviadas deben verse y entenderse perfectamente antes de continuar; si el modelo carece de visión nativa, se extrae el contenido (OCR local, `tesseract`, metadatos) hasta entenderla; no avanzar con tareas pendientes hasta descifrarlas.

### 2.2 `settings.json` (606 B, 0644, 2026-10-23 04:51)

```
lastChangelogVersion : "1.4.0"                    (:2)
theme                : "dark"
defaultProvider      : "account-router"           (:4)
defaultModel         : "agnes-3.0-flash"          (:5)
defaultThinkingLevel : "high"
compaction.modelOverrides :
    deepseek/deepseek-v4-pro  → reserveTokens 32768, keepRecentTokens 60000
    deepseek/deepseek-flash   → reserveTokens 32768, keepRecentTokens 60000
packages             : ["npm:pi-mcp-adapter",
                        "../../Code/PI-agent/src/pi-account-router"]   (:20-21)
extensions           : ["-builtin:mcp"]           (:24)
hideThinkingBlock    : false
```

`"-builtin:mcp"` con prefijo `-` **deshabilita** el MCP integrado de Pi a favor del adaptador npm. Los `compaction.modelOverrides` afectan a dos modelos `deepseek/*` que **no son el proveedor ni el modelo por defecto** y que no están definidos en `models.json` (solo existen en `models-store.json`) → configuración heredada de la etapa en que `deepseek` era el default (`backups/settings.json.bak.20260928-120759`). Ver **M-3**.

### 2.3 MCP: `mcp-adapter.json` + `mcp-onboarding.json` + `mcp-project-approvals.json`

**`mcp-adapter.json`** (716 B, 0644, 2026-10-25 05:19) — `settings.namespaceProxyTools: false` y **4 servidores**:

| Servidor | URL | Auth | Estado |
|---|---|---|---|
| `googledrive` | `https://googledrive.run.tools/` | — | activo |
| `api` | `https://api.you.com/mcp` | — | **`disabled: true`** (`:11`) |
| `you-key-1` | `https://api.you.com/mcp` | `bearer` + **`bearerTokenStore: true`** (`:16`) | activo |
| `you-key-2` | `https://api.you.com/mcp` | `bearer` + **`bearerTokenStore: true`** (`:24`) | activo |

Ambas claves comparten la misma allowlist (`:18` y `:26`): `X-Allowed-Tools: you-search,you-contents,you-research,you-balance,you-discover` — **5 herramientas**, que coinciden exactamente con las 5 que `mcp-cache.json` cachea para cada una. La allowlist se cumple.

`bearerTokenStore: true` significa que **el token no está en el JSON**: vive en el credential store del SO. Eso es coherente con `AGENTS.md:4` y es el punto mejor resuelto de toda la instalación (§6).

**La migración es fechable.** `mcp-adapter.json.bak-20261024-you` (212 B, 2026-10-25 05:18:49) contiene solo `googledrive` + `api` (**sin** `disabled`, **sin** `you-key-1/2`). Trece segundos después, `mcp-adapter.json` (05:19:02) ya tiene el pool de dos claves y `api` deshabilitado. Es decir: el 2026-10-25 05:19 se pasó del camino de clave única al pool de dos claves, cumpliendo `AGENTS.md:3` y `:6`. Toda la actividad de `mcp.log` (última entrada 2026-10-23 08:02) es anterior y está etiquetada `[api]`, el servidor de clave única.

**`mcp-onboarding.json`** (121 B, 0644) — `{"version":1, "sharedConfigHintShown":false, "setupCompleted":false, "piBuiltinMcpHandledVersion":"6.0.0"}`. El `6.0.0` coincide con el `pi-mcp-adapter` instalado. Pero `setupCompleted: false` contradice el uso real (13 servidores en caché, 221 herramientas, 3 aprobaciones, un adapter en producción). Ver **B-4**.

**`mcp-project-approvals.json`** (699 B, **0600**, 2026-10-11) — `version:1` + `approvals[3]`, cada una `{projectRoot, serverName, definitionHash(sha256), approvedAt}`:

| projectRoot | serverName | approvedAt |
|---|---|---|
| `/Users/ruben/Code/PI-agent` | `you-official` | 2026-10-11T00:02:01.583Z |
| `/Users/ruben/Code/PI-agent` | `you-key-1` | 2026-10-11T00:20:30.274Z |
| `/Users/ruben/Code/PI-agent` | `you-key-2` | 2026-10-11T00:20:31.350Z |

`you-key-1` y `you-key-2` comparten **el mismo `definitionHash`** (`0c339e43…`) → definiciones idénticas salvo el secreto, exactamente lo esperable en un pool. `you-official` está aprobado pero **ya no existe** en `mcp-adapter.json` → aprobación huérfana (sigue en `mcp-cache.json` con 4 tools). Y `openspec`, cacheado el 2026-10-25 05:50 con **40 herramientas**, no tiene ninguna aprobación registrada. Ver **M-4**.

### 2.4 `trust.json` (247 B, 0644, 2026-10-25 06:05)

5 entradas, **todas a `true`**, ninguna a `false` (nunca se ha revocado confianza):

```
/Users/ruben/Code                                                        : true
/Users/ruben/Code/XIAOMI-note-5g                                         : true
/Users/ruben/Jart-MUX                                                    : true
/Users/ruben/jart-os-development/04-INCUBATOR/jart-cleaning              : true
/Users/ruben/jart-os-development/04-INCUBATOR/jart-ible                  : true
```

`/Users/ruben/Code` es el **padre** de ~50 de los 54 directorios de sesión y de `XIAOMI-note-5g` (que también está listado aparte → redundante). Ver **M-4**.

### 2.5 `crashes.json` (7.564 B, 0644, 2026-10-19 02:13) — patrones

Array de **5** crashes, todos `kind: "uncaught_exception"`, todos `notified: true`. Dos patrones, **ambos originados en extensiones propias, ninguno en el núcleo de Pi**:

**Patrón 1 — `Unknown theme color: #60aaff`** · 3 ocurrencias en 38 s (2026-10-05T21:44:08 / :24 / :46Z), versión `1.0.3`, `cwd: /Users/ruben/Code/FLYBOX`, `sessionFile: null`. Stack:
```
Proxy.tokenAnsi → Proxy.style → blue (~/.pi/agent/extensions/capabilities-footer.ts:129:37)
  → Object.render (capabilities-footer.ts:185:12) → Container.render → VStack.render
  → renderCached → measureHeight
```
Causa: se pasa un **hex literal** (`#60aaff`) a un proxy de tema que solo acepta **nombres de color**. Falla dentro de `measureHeight`, o sea en la fase de medición del layout → rompe el renderizado completo del footer, no solo un color.

**Patrón 2 — `This extension ctx is stale after session replacement or reload`** · 2 ocurrencias, versión `1.3.0`:

| Fecha | cwd | sessionFile | Frames propios |
|---|---|---|---|
| 2026-10-17T10:51:42.865Z | `/Users/ruben/Code/INK-react-en-terminal` | `…2026-10-17T10-51-38-655Z_01a1497d….jsonl` | `pi-account-router/src/extension.ts:146` (`show`) ← `:205` (`refreshFooter`) |
| 2026-10-19T00:13:28.768Z | `/Users/ruben/Code/Jart-FACTORY` | `…2026-10-19T00-13-26-112Z_01a15181….jsonl` | `pi-account-router/src/extension.ts:142` (`show`) ← `:201` (`refreshFooter`) |

Stack: `ExtensionRunner.assertActive → get ui → show → refreshFooter`. El mensaje de Pi **documenta la corrección**: «move post-replacement work into `withSession` and use the ctx passed to `withSession`». Los números de línea **cambian entre las dos ocurrencias** (146/205 → 142/201), o sea el fichero fue editado entre el 17 y el 19 de octubre **y el bug persistió**. Este es el paquete que `settings.json:21` carga como proveedor por defecto. Ver **M-1**.

Ningún crash registrado después de 2026-10-19 pese a uso continuado hasta el 2026-10-25 → o se corrigió, o el registro se detuvo. No verificable en solo lectura (**Laguna 6**).

### 2.6 `prompts/` — 13 ficheros (12 `opsx-*` + 1 local)

**12 `opsx-*.md`** (suite OpenSpec, todos con mtime idéntico **2026-10-14 01:19** → instalación en lote, no edición manual): `apply` (10.821 B), `archive` (17.236), `bulk-archive` (21.941), `continue` (9.549), `explore` (19.668), `ff` (10.856), `new` (5.530), `onboard` (17.976), `propose` (15.862), `sync` (15.490), `update` (10.465), `verify` (18.091). Todos con frontmatter `description:` y todos replican un preámbulo común de ~2 KB (**Store selection** + **Project check** + ramas `"root": null` auto-selected/explicit). El preámbulo gobierna el manejo de *stores* OpenSpec registrados (`openspec store list --json`, flag `--store <id>` «sticky») y prohíbe crear `openspec/` como efecto colateral (`never create the root as a side effect`). La duplicación es real pero no literal: los md5 de los primeros 2.000 bytes difieren entre `apply`/`new`/`verify`/`sync` (solo por la línea `description:`), de modo que un cambio en el preámbulo exige editar 12 ficheros. Ver **B-5**.

**`auditoria-dev.md`** (4.678 B, 2026-10-17 12:35) — el único prompt de autoría local, y el que define el canon de esta misma auditoría. Frontmatter: `description: "Auditoría completa multidisciplinar de elite + adversariales + Dementor (comando /auditoria-dev)"`. Estructura: (1) rol de arquitecto senior + equipo Scrum con 8 grupos de especialistas (Arquitectura, Calidad, Seguridad, Datos, Ops, IA/ML, Sistemas, Producto/Proceso); (2) fase adversarial con 4 adversarios + el **Dementor** (escéptico absoluto: «asume que todo es falso… **no corrige**: solo produce findings»); (3) informe consolidado con veredicto falsable, severidades `BLOCKER > CRITICAL > MAJOR > MINOR > INFO`, evidencia `fichero:línea`, sección obligatoria «Lo que SÍ funciona», correcciones de los propios auditores y estimación de esfuerzo «rango honesto, no solo-dev-optimista»; (4) entrega preguntando **siempre** antes de escribir. Guardrails que este anexo hereda: «El pase de auditoría es **read-only**», «un hallazgo sin evidencia ejecutable va marcado como `sin-verificar`», y «**Si el repo / objetivo carece de VCS, señalarlo como hallazgo estructural (no obviarlo)**» → aplicado en **B-1**.

---

## 3. Estructura sin valores de los ficheros sensibles

### 3.1 `models.json` (6.108 B, `-rw-------`, 2026-10-10 00:11)

Claves raíz: `providers` (object, 6 entradas) y `defaults` (object, 2 claves).

| Proveedor | Campos | `models` | `apiKey` (tipo · longitud · naturaleza) |
|---|---|---|---|
| `account-router` | `apiKey` | **ausente** (`null`) | string · 20 · **indirección**: literal `managed-by-extension` (`:4`) |
| `anthropic` | `headers` | ausente | **`null`**; solo `headers.anthropic-workspace-id` |
| `agnes-ai` | `api,apiKey,baseUrl,compat,models,name` | array[2]: `agnes-2.5-flash`, `agnes-3.0-flash` | string · 52 · **Keychain**: `!security find-generic-password -s agnes-ai -a pi -w` (`:15`) |
| `kilo-gateway` | idem | array[7] (todos `:free`) | string · 7 · placeholder `keyless` (`:47`) |
| `pollinations` | idem | array[1]: `openai` | string · 7 · placeholder `keyless` (`:124`) |
| `omniroute` | idem | array[3]: `auto/best-free`, `auto/best-coding`, `auto/best-fast` | string · 36 · **LITERAL EN CLARO** (`:147`) → `[REDACTADO]` |

Campos no sensibles por proveedor: `name` (`Agnes AI`, `Kilo Gateway (Free)`, `Pollinations (Keyless)`, `OmniRoute Local`), `api` = `openai-completions` en los 4 definidos, `baseUrl` (`https://apihub.agnes-ai.com/v1`, `https://api.kilo.ai/api/gateway`, `https://text.pollinations.ai/openai`, `http://localhost:20128/v1` en `:145`), y `compat` = `{supportsStore, supportsDeveloperRole, supportsReasoningEffort, maxTokensField}` (este último `true` solo en `kilo-gateway` y `omniroute`; `maxTokensField: "max_tokens"` en los cuatro).

Campos por modelo (unión): `contextWindow, cost, id, input, maxTokens, name, reasoning`.

`defaults` (`:185-187`) = `{"provider": "kilo-gateway", "model": "nvidia/nemotron-3-ultra-550b-a55b:free"}` → **contradice** `settings.json:4-5`. Ver **H-5**.

**Tres convenciones de secreto distintas conviven en este único fichero**: indirección a la extensión, shell-out al Keychain de macOS con prefijo `!`, y literal en claro. Ver **H-1** y **M-9**.

### 3.2 `models-store.json` (78.150 B, `-rw-------`, 2026-10-25 06:05)

Caché HTTP de catálogos remotos. 5 proveedores, cada uno con exactamente `{checkedAt, etag, lastModified, models}` → revalidación condicional correcta (ETag + Last-Modified), no *refetch* ciego.

| Proveedor | Modelos |
|---|---:|
| `github-copilot` | 26 |
| `anthropic` | 17 |
| `qwen-token-plan-individual` | 9 |
| `openai-codex` | 7 |
| `deepseek` | 2 |
| **Total** | **61** |

Campos por modelo (unión, más rica que la de `models.json`): `api, baseUrl, compat, contextWindow, cost, headers, id, input, inputLimits, maxTokens, name, promptCache, provider, reasoning, thinkingLevelMap, type`. Nótese `promptCache` y `thinkingLevelMap`, ausentes en `models.json` — y `scripts/pi-optimization-routine.sh:7` declara explícitamente «No inventa valores (p.ej. no declara `promptCache` sin dato real del proveedor)», o sea ese campo solo se rellena desde el catálogo real.

**No hay ningún modelo `agnes-*`** en este store (búsqueda por `agnes` → vacío): los modelos del proveedor por defecto proceden de `models.json`/`account-router.json`, no del catálogo remoto.

### 3.3 `capabilities.json` (200.429 B, `-rw-r--r--`, 2026-10-25 05:28) — el «limbo»

`{"version":1, "capabilities":{247}}`. Claves con formato `owner/repo[/subruta]` (p. ej. `1Levick3/postgresql-mcp-server`, `JigsawStack/image-generation`, `ScrapeGraphAI/scrapegraph-mcp`).

Campos por entrada (unión, 17): `description, firstSeen, id, install, installs, lastSeen, location, name, page, source, status, trust, type, url, use, uses, verified`.

| Dimensión | Distribución |
|---|---|
| `type` | `mcp` = 170 · `skill` = 77 |
| `status` | `known` = 239 · `installed` = 4 · `used` = 4 |
| `verified` | `false` = 126 · `null` = 87 · `true` = 34 |
| `trust` | `high` = **1** · `null` = **246** |
| `firstSeen` | 2026-09-28T12:47:15.651Z → 2026-10-25T04:28:43.008Z |

**Qué implica que pese 200 KB — y qué no implica.** `registry-search.ts:14` lo declara literalmente: «"Limbo" = `~/.pi/agent/capabilities.json`. **NO se carga en el prompt**», y `:36` lo resuelve como `join(agentDir(), "capabilities.json")`. El acceso es *retrieval* BM25 bajo demanda (`:17`), con búsqueda primero offline en el limbo y solo después en los registros remotos (`:15`). Por tanto los 200 KB **no son coste de contexto ni de tokens**: son disco y parseo. Es la decisión de diseño más acertada del conjunto (§6).

Lo que sí implican: (a) **crecimiento monótono sin poda** — `capabilities.json.bak-tuios` (169.930 B, 2026-10-19) tiene **211** entradas frente a **247** hoy: **+36 en 6 días** (~6/día, ~2,2 MB/año proyectado); (b) el campo de seguridad está vacío: **`trust` es `null` en 246 de 247 entradas (99,6 %)**, de modo que el «rerank (popularidad/exact/**trust**)» y la «Seguridad: trust por origen» que la propia extensión anuncia en `:17-18` operan sobre un campo sin datos → el rerank degrada a popularidad y el aviso de fuente no confiable no puede dispararse. Ver **M-5**.

### 3.4 `mcp-cache.json` (597.749 B, `-rw-r--r--`, 2026-10-25 06:50)

`{"version":1, "servers":{13}}`. Por servidor: `cachedAt, configHash, tools` + opcionales `instructions, prompts, resources, discoveryFailed`. **221 herramientas** cacheadas en total.

| Servidor | Tools | Bytes JSON | `cachedAt` | ¿En `mcp-adapter.json`? |
|---|---:|---:|---|:--:|
| `stitch` | 17 | **319.983** | 2026-10-03 13:35 | **no** |
| `googledrive` | 22 | 48.655 | 2026-10-09 19:40 | sí |
| `obsidian` | 12 | 47.534 | 2026-10-09 18:18 | **no** |
| `jart-cortex` | 75 | 44.597 | 2026-10-12 13:22 | **no** |
| `notebooklm` | 20 | 28.884 | 2026-10-09 18:17 | **no** |
| `you-key-1` | 5 | 18.852 | 2026-10-11 01:12 | sí |
| `you-key-2` | 5 | 18.852 | 2026-10-11 00:21 | sí |
| `openspec` | 40 | 18.201 | 2026-10-25 06:50 | **no** |
| `vault` | 16 | 15.683 | 2026-10-12 05:53 | **no** |
| `api` | 4 | 13.436 | 2026-10-23 05:58 | sí (`disabled`) |
| `you-official` | 4 | 13.341 | 2026-10-11 00:04 | **no** |
| `codegraph` | 1 | 8.643 | 2026-10-17 09:54 | **no** |
| `youdotcom--brian-ifpw` | **0** | 155 | 2026-10-11 01:00 | **no** · `discoveryFailed: true` |

**9 de 13 servidores cacheados no están declarados en `mcp-adapter.json`.** `stitch` concentra el **53,5 %** del fichero con la entrada más vieja (22 días). `youdotcom--brian-ifpw` es una entrada permanentemente fallida que se retiene igual. Ver **M-3**.

### 3.5 Familia `account-router*` (todo `-rw-------`)

| Fichero | B | mtime | Estructura (campos · cardinalidad) |
|---|---:|---|---|
| `account-router.json` | 1.854 | 10-19 05:50 | `version:number` · `provider:{adapter:string, models:array[2]}` · `accounts[4]` → `{credential, id, quotaGroup}` · `quotaGroups[4]` → `{id:string, limits:array, maxConcurrent:number}` |
| `account-router-accounts.json` | 732 | 10-09 22:16 | `version` · `updatedAt:string` · `attribution:string` · `accounts[4]` → `{credentialReference, email, id}` · `additionalDistinctCredentialFound:boolean` |
| `account-router-accounts-verification.json` | 2.280 | 10-09 22:23 | `verifiedAt` · `model` · `independentQuotasVerified:bool` · `sharedAggregateRPM:number` · `distinctAccountsObserved:number` · `results[5]` → `{continuationHasToolResult, mode, payloads, requests, success, toolExecutions, usage}` |
| `account-router-performance.json` | 3.149 | 10-09 22:39 | igual + `benchmark:boolean`, `results[4]` |
| `account-router-performance-pilot.json` | 490 | 10-09 22:38 | 1 medición: `{accountId, httpStatus, outputValidated, outputCap, reportedInputTokens, reportedOutputTokens, headersMs, firstContentMs, completedMs, cliWallMs, contentEvents, note}` |
| `account-router.json.bak-20261010001706` | 834 | 10-09 22:16 | `provider{1}` · `accounts[4]` · `quotaGroups[**1**]` |
| `account-router.json.bak-20261019-vision` | 1.382 | 10-19 05:48 | `provider{1}` · `accounts[4]` · `quotaGroups[4]` |

Lecturas estructurales (sin valores):
- **Dos representaciones de la misma cuenta.** `account-router.json` lleva `accounts[].credential` **embebido**; `account-router-accounts.json` lleva `accounts[].credentialReference` **por referencia** (más `email`, que es PII). Misma verdad, dos modelos de secreto. Ver **H-1**.
- **Evolución fechable**: `quotaGroups` pasó de **1 → 4** y `provider` de **1 → 2** campos (ganó `models`) entre el 09-10 y el 19-10.
- **Deriva config↔estado**: la config declara `quotaGroups[4]`, pero el estado vivo tiene `groups[5]`. `latEWMA{4}` sí casa con `accounts[4]`. Ver **M-6**.
- Los 3 ficheros `-verification`/`-performance*` son **salidas de experimento** (los nombres de campo `independentQuotasVerified`, `sharedAggregateRPM`, `distinctAccountsObserved` indican una investigación sobre si las 4 cuentas comparten cuota), no configuración; los 3 datan de una ventana de **23 minutos** el 2026-10-09 (22:16–22:39), hace 16 días, y conviven en la raíz de configuración con los ficheros vivos.

### 3.6 `auth.json` (3.997 B, `-rw-------`, 2026-10-25 07:41:17)

Solo estructura, como exige el encargo. **9 proveedores autenticados**:

| Clave | Tipo | Nº de campos |
|---|---|---:|
| `agnes-ai` | object | 2 |
| `agnes-dianez` | object | 2 |
| `agnes-msb` | object | 2 |
| `agnes-planetary` | object | 2 |
| `anthropic` | object | 2 |
| `deepseek` | object | 2 |
| `qwen-token-plan-individual` | object | 2 |
| `github-copilot` | object | **5** |
| `openai-codex` | object | **5** |

Los dos con 5 campos (`github-copilot`, `openai-codex`) son consistentes con OAuth (token + refresh + expiración + …); los de 2 campos, con un par clave/valor simple. Las **4 identidades `agnes-*`** son el pool que rota el account-router, y casan con los 4 índices de `~/.pi/proxy/agnes-rotation.json` (`errors: {"0":6,"1":6,"2":5,"3":0}`) y con `accounts[4]` de `account-router.json`.

**Solape entre los tres ficheros de proveedores:**

| Fichero | Proveedores |
|---|---|
| `models.json` (6) | `account-router`, `agnes-ai`, `anthropic`, `kilo-gateway`, `omniroute`, `pollinations` |
| `models-store.json` (5) | `anthropic`, `deepseek`, `github-copilot`, `openai-codex`, `qwen-token-plan-individual` |
| `auth.json` (9) | `agnes-ai`, `agnes-dianez`, `agnes-msb`, `agnes-planetary`, `anthropic`, `deepseek`, `github-copilot`, `openai-codex`, `qwen-token-plan-individual` |

**Solo `anthropic` está en los tres.** Consecuencias verificables: (a) `auth.json` tiene 3 identidades `agnes-*` (`dianez`, `msb`, `planetary`) **sin proveedor definido** en `models.json` → las consume el router, no la capa de modelos; (b) `deepseek`, `github-copilot`, `openai-codex` y `qwen-token-plan-individual` tienen auth + catálogo **sin entrada en `models.json`**; (c) `kilo-gateway`, `omniroute` y `pollinations` están en `models.json` **sin entrada en `auth.json`** (sus claves viven en el propio `models.json`). No hay un registro único de proveedores. Ver **M-2**.

### 3.7 `profiles/default.json` (1.504 B, `-rw-------`, 2026-10-13 01:00)

`{name:string, description:string, version:number, provider:object{1}, accounts:array[4], quotaGroups:array[4], policies:object{0}}`.

Es la **tercera copia** del conjunto cuentas/cuotas (junto a `account-router.json` y `account-router-state/profiles/default-e592ff32df1f.json`), con un esquema propio (`name`/`description` que los otros no tienen; sin `latEWMA` ni `leases` que el estado vivo sí tiene) y **`policies` vacío** — la capa de políticas está declarada pero sin configurar. Ver **M-7**.

### 3.8 `~/.pi/proxy/agnes-rotation.json` (122 B, `-rw-r--r--`, 2026-10-01 23:55)

```json
{"currentIndex": 3, "errors": {"0": 6, "1": 6, "2": 5, "3": 0}, "lastRotation": 1790559310257}
```

`lastRotation` = **2026-09-28 03:35:10** → **27 días sin rotar**, mientras `account-router-state/` se escribía el 2026-10-25 08:15. Tres de los cuatro índices acumulan 5-6 errores sin resetear. Es un **segundo mecanismo de rotación de cuentas Agnes, anterior y abandonado**, que coexiste con el account-router. Perms 0644 (no contiene secretos, solo contadores). Ver **M-7**.

---

## 4. Modelo de configuración resultante

### 4.1 Mapa fichero → función

| Capa | Fichero(s) | Qué configura | Quién escribe |
|---|---|---|---|
| **Política** | `AGENTS.md` | 2 políticas de usuario inyectadas al agente (pool You.com; visión de imágenes) | usuario |
| **Preferencias** | `settings.json` | tema, proveedor/modelo/thinking por defecto, overrides de compaction, `packages[]`, `extensions[]` | Pi + usuario |
| **Modelos (usuario)** | `models.json` | proveedores definidos a mano + `apiKey` + `defaults` propio | usuario |
| **Modelos (catálogo)** | `models-store.json` | caché HTTP (etag/lastModified) de 61 modelos oficiales en 5 proveedores | Pi (auto) |
| **Credenciales** | `auth.json` | 9 proveedores autenticados (OAuth/API) | Pi (login) |
| **Enrutado de cuentas** | `account-router.json`, `account-router-accounts.json`, `profiles/default.json` | provider+adapter, 4 cuentas, 4 grupos de cuota, políticas | usuario + `pi-account-router` |
| **Estado del router** | `account-router-state/` (0700) | `lastAccountId`, `groups`, `leases`, `waiters`, `latEWMA`, `disabledAccountIds`, `audit/*.jsonl` | `pi-account-router` (auto) |
| **Evidencia empírica** | `account-router-{accounts-verification,performance,performance-pilot}.json` | verificación de cuotas independientes y benchmarks de latencia | `pi-account-router` (auto) |
| **Rotación legacy** | `~/.pi/proxy/agnes-rotation.json` | `currentIndex`, `errors`, `lastRotation` (inactivo desde 09-28) | proxy Agnes (legacy) |
| **MCP (declaración)** | `mcp-adapter.json` | 4 servidores, auth bearer + `bearerTokenStore`, allowlist `X-Allowed-Tools` | usuario + adaptador |
| **MCP (descubrimiento)** | `mcp-cache.json` | 13 servidores / 221 tools cacheados por `configHash` | `pi-mcp-adapter` (auto) |
| **MCP (aprobación)** | `mcp-project-approvals.json` (0600) | 3 aprobaciones por `(projectRoot, serverName, definitionHash)` | Pi (con consentimiento) |
| **MCP (onboarding)** | `mcp-onboarding.json` | estado del wizard + `piBuiltinMcpHandledVersion` | `pi-mcp-adapter` (auto) |
| **Confianza** | `trust.json` | 5 raíces confiadas (todas `true`) | Pi (auto) |
| **Capacidades** | `capabilities.json` | limbo BM25 de 247 MCP/skills, **fuera del prompt** | `registry-search.ts` (auto) |
| **Comandos** | `prompts/*.md` (13) | comandos slash con frontmatter `description:` | OpenSpec (12) + usuario (1) |
| **Extensiones** | `extensions/*.ts` (2 + 1 symlink roto) | `search_registry`, `read_skill`, `fetch_skill`, `capabilities`, `search_skills`, `skills-refresh` | usuario |
| **Dependencias** | `npm/` | `pi-mcp-adapter@6.0.0` + 39 paquetes transitivos | npm |
| **Diagnóstico** | `crashes.json`, `mcp.log`, `logs/` | 5 crashes, log del adaptador, log de llama_server | Pi / adaptador (auto) |
| **Mantenimiento** | `scripts/pi-optimization-routine.sh`, `bin/fd` | `pi-optimize [--apply]`; binario `fd` **sin referencias** | usuario |
| **Reversión** | 17 × `.bak*` + `backups/` | snapshots manuales copy-on-write | usuario/agente |

### 4.2 Precedencia

**No está documentada en ningún sitio.** `AGENTS.md` solo contiene dos políticas de usuario; `settings.json` no declara ningún orden; no existe un fichero de esquema o documentación de resolución. Lo siguiente es **inferido por evidencia de código**, y se marca como tal:

1. **Variables de entorno de sesión** — `PI_PROVIDER` / `PI_MODEL` / `PI_REASONING_LEVEL`. Evidencia: `scripts/pi-optimization-routine.sh:25-29` las trata como la fuente de verdad de la sesión y, si `PI_PROVIDER` está vacío, avisa «fuera de una sesión de pi (no hay `PI_PROVIDER`); **leyendo settings.json**» → el propio script documenta que env gana y `settings.json` es el *fallback*.
2. **Raíz del agente** — `PI_CODING_AGENT_DIR` sobrescribe `~/.pi/agent`. Evidencia: `skill-router.ts:22` (`process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent")`) y `pi-optimization-routine.sh:10` (`AGENT_DIR="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}"`).
3. **`settings.json:4-5`** (`defaultProvider`/`defaultModel`) — es lo que el script de diagnóstico lee como defaults efectivos (`for k in ("defaultProvider","defaultModel","defaultThinkingLevel","theme")`).
4. **`models.json:185-187`** (`defaults.provider`/`defaults.model`) — existe y **discrepa** del punto 3. **Cuál de los dos gana no es determinable sin leer el fuente del agente o ejecutarlo**, ambas cosas fuera del alcance de solo lectura sobre `~/.pi`. → **Laguna 4**, **H-5**.
5. **`models-store.json`** — no es un nivel de precedencia sino una **caché de catálogo**: aporta metadatos (`promptCache`, `thinkingLevelMap`, `inputLimits`, `cost`) de los 61 modelos de los 5 proveedores con catálogo remoto. Que `settings.json` y `models-store.json` se escriban en el **mismo segundo** (2026-10-25 06:05:59 ambos… en realidad `settings.json` es del 10-23; los que comparten segundo son `models-store.json` y `trust.json`, 06:05:59) indica que Pi revalida catálogo y confianza en el mismo arranque.

### 4.3 Política de secretos observada

**Cuatro mecanismos distintos, aplicados de forma desigual:**

| Mecanismo | Dónde | Cobertura |
|---|---|---|
| **Credential store del SO** (macOS Keychain) | `models.json:15` vía `!security find-generic-password -s agnes-ai -a pi -w`; `mcp-adapter.json:16,24` vía `bearerTokenStore: true` | `agnes-ai` (modelos) y `you-key-1`/`you-key-2` (MCP). Es lo que `AGENTS.md:4` declara como política. |
| **Indirección a la extensión** | `models.json:4` (`managed-by-extension`) | `account-router` |
| **JSON en claro con `0600`** | `models.json:147` (literal `ork_…` `[REDACTADO]`); `account-router.json` (`accounts[].credential` embebido) | `omniroute` y las 4 cuentas del router |
| **Placeholder no secreto** | `models.json:47,124` (`keyless`) | `kilo-gateway`, `pollinations` |

Además: `account-router-accounts.json` usa `credentialReference` (referencia) para las **mismas** cuentas que `account-router.json` lleva embebidas → el modelo por referencia existe y está implementado, pero no se aplica en el fichero vivo.

**Permisos:** impecables donde importa. Los 12 ficheros con credenciales o referencias están en `0600` (`models.json`, `models-store.json`, `auth.json`, `mcp-project-approvals.json`, los 5 `account-router*.json`, `profiles/default.json`, los 3 `models.json.bak-*`, los 2 `account-router.json.bak-*`), y `account-router-state/` y `backups/anthropic-auth-*/` en `0700`. Los backups de ficheros sensibles **heredan** el `0600` correctamente.

**Dónde falla la política:** no en los ficheros marcados como sensibles, sino en los que **no** lo están: `sessions/*.jsonl` (0644, con material con forma de credencial → **H-3**), `secrets/vault/server.log` (0644 → **H-2**) y `models.json:147` (literal en claro → **H-1**).

**Un riesgo de diseño adicional:** el prefijo `!` en `models.json:15` convierte un campo de configuración en **una orden que se ejecuta** (`security find-generic-password …`). Es un mecanismo elegante para no persistir el secreto, pero implica que cualquiera que pueda escribir `models.json` puede ejecutar código arbitrario como el usuario en el arranque de Pi. `models.json` es `0600`, así que el vector requiere ya ser `ruben`; se documenta como propiedad del diseño, no como vulnerabilidad explotable (**M-9**).

### 4.4 Cómo se conectan MCP y extensiones

**Cadena MCP:**
```
settings.json:24  "-builtin:mcp"        → deshabilita el MCP integrado de Pi
settings.json:20  "npm:pi-mcp-adapter"  → carga el adaptador (npm/, v6.0.0 instalada)
        ↓
mcp-adapter.json  → 4 servidores declarados; bearer + bearerTokenStore (token en Keychain)
        ↓           + X-Allowed-Tools (allowlist de 5 herramientas You.com)
mcp-cache.json    → descubrimiento cacheado por configHash: 13 servidores / 221 tools
        ↓
mcp-project-approvals.json (0600) → aprobación por (projectRoot, serverName, definitionHash)
mcp-onboarding.json               → piBuiltinMcpHandledVersion 6.0.0 == versión instalada ✓
mcp.log                           → actividad del adaptador
```
La coherencia de versión es exacta: `npm/package.json` pide `^6.0.0`, `node_modules/pi-mcp-adapter` es `6.0.0`, y `mcp-onboarding.json` declara `piBuiltinMcpHandledVersion: "6.0.0"`.

**Cadena de extensiones:** dos vías distintas.
1. **Por paquete** (`settings.json:19-22` `packages[]`): `npm:pi-mcp-adapter` (resuelto desde `npm/node_modules/`) y `../../Code/PI-agent/src/pi-account-router` (ruta **relativa** al repo en desarrollo, verificada existente, `package.json` → `name: pi-account-router`, `version: 0.1.0`, **`main: null`**). Este paquete es el que aporta el proveedor `account-router` (default en `settings.json:4`) y el footer cuya gestión de `ctx` crasha (**M-1**).
2. **Por fichero suelto** (`extensions/*.ts`, descubiertos por convención, sin manifiesto): `registry-search.ts` y `skill-router.ts`. El tercero, `capabilities-footer`, es un **symlink a un directorio inexistente** (**H-4**).

**Cadena de capacidades:** `registry-search.ts` escribe y lee `capabilities.json` (`:36`) como índice offline; busca primero ahí y solo luego en Smithery/skills.sh (`:15`, vía CLI `skills` con `execFile`), y «apunta» lo nuevo al limbo — de ahí el crecimiento de 211→247 entradas. `skill-router.ts:24-32` busca SKILL.md en 5 ubicaciones: `$PI_CODING_AGENT_DIR/skills` (**no existe**), `cwd/.pi/skills`, `cwd/.agents/skills`, `~/.agents/skills`, y `.agents/skills` ascendiendo por los padres.

---

## 5. Hallazgos

Severidad según el canon de `prompts/auditoria-dev.md`: **alta / media / baja**. Todo hallazgo lleva evidencia `ruta:línea` o `ruta (bytes, permisos)`. Lo que no pude falsar por ejecución va marcado `sin-verificar`.

### ALTA

**H-1 · Una clave API en claro dentro de `models.json`, en un fichero que por lo demás usa Keychain e indirección.**
Evidencia: `~/.pi/agent/models.json:147` → `"apiKey": "ork_…"` `[REDACTADO]`, string literal de 36 caracteres, proveedor `omniroute` (el mismo que declara `baseUrl: http://localhost:20128/v1` en `:145`). Contrastar con las otras 5 claves del fichero: `:4` `"managed-by-extension"` (indirección), `:15` `"!security find-generic-password -s agnes-ai -a pi -w"` (Keychain), `:47` y `:124` `"keyless"` (placeholder), `anthropic.apiKey = null`. `models.json (6.108 B, -rw-------)`.
Por qué importa: rompe la política declarada en `AGENTS.md:4` («stored in the OS credential store… Never print, include in prompts/arguments, log, or copy their values»). El `0600` contiene la exposición ante otros usuarios, pero no ante (a) cualquier proceso que corra como `ruben`, (b) los **3 backups** `models.json.bak-*` que replican el fichero (`1.186 B`, `5.912 B`, `6.038 B`, todos `0600`, el más viejo de 2026-10-03), ni (c) una copia accidental a un repo o a una transcripción de sesión — que es exactamente lo que ocurrió en esta auditoría (§Aviso). El hecho de que el proveedor sea un proxy local (`localhost:20128`) reduce el valor de la clave, no el precedente.
Añádase la inconsistencia gemela: `account-router.json` lleva `accounts[].credential` **embebido** mientras `account-router-accounts.json` lleva `credentialReference` **por referencia** para las mismas 4 cuentas — el modelo correcto ya está implementado en el mismo subsistema y no se usa en el fichero vivo. Con los backups, las credenciales del router existen en **5 ficheros** distintos.
Recomendación: mover `omniroute.apiKey` al Keychain con el mismo patrón `!security find-generic-password` de `:15`; migrar `account-router.json` a `credentialReference`; rotar la clave `[REDACTADO]` por haber estado expuesta en una transcripción.

**H-2 · `~/.pi/secrets/` no contiene secretos: contiene un log de 5,2 MB en modo 0644 que sigue creciendo.**
Evidencia: `~/.pi/secrets/vault/server.log (5.186.594 B, -rw-r--r--, mtime 2026-10-25 08:11)`. Es el **único** fichero bajo `~/.pi/secrets/`. Abierto en escritura por el proceso `vault` PID 667 en los descriptores `1u` y `2u` (stdout y stderr) → es el volcado sin filtrar de un servidor. 34.916 líneas. Sonda **solo de conteos** (nunca se leyeron valores): 72 líneas contienen `token`, 8 contienen `secret`, 0 contienen `Bearer`, `Authorization`, `sk-`, `apiKey`, `api_key`, `password` o `-----BEGIN`. Crecimiento medido: 5.180.294 B a las 08:11 → 5.186.594 B durante la auditoría (+6.300 B), aunque el delta en una ventana de 6 s fue 0 (escritura por ráfagas, no continua). Sin rotación ni `logrotate`.
Por qué importa: (a) la protección real no es el `0644` del fichero sino el `0744` del directorio `~/.pi/secrets/vault/` (sin bit `x` para grupo/otros, que por tanto no pueden resolver la ruta) — es **seguridad accidental**, y un `chmod 755` rutinario la elimina; (b) un log que menciona `token` 72 veces y vive en el directorio de secretos es, como mínimo, un fallo de separación entre datos y telemetría; (c) crece sin límite.
`sin-verificar`: si las 72 líneas con `token` contienen valores reales o solo nombres de campo. No lo comprobé deliberadamente (regla de secretos). Requiere inspección manual del propietario.
Recomendación: sacar el log de `secrets/` (a `~/.pi/agent/logs/`), ponerlo `0640` o `0600`, y añadir rotación por tamaño.

**H-3 · 214 MB de transcripciones de sesión en 0644 que contienen material con forma de credencial.**
Evidencia: `~/.pi/agent/sessions/` (`drwxr-xr-x`) con **129** `.jsonl`, todos `-rw-r--r--`, 214 MB, rango 2026-09-28 → 2026-10-25. Sonda **solo de conteos** sobre los 129 ficheros (ningún valor leído ni reproducido):

| Patrón | Ficheros que lo contienen |
|---|---:|
| `Bearer ` | **54** |
| `apiKey` | **52** |
| `ghp_` (prefijo GitHub PAT) | **14** |
| `sk-ant` (prefijo Anthropic) | **11** |
| `-----BEGIN` (bloque PEM) | **11** |

Muestra de los 5 ficheros mayores: uno acumula 34 líneas con `Bearer `, 89 con `apiKey` y 3 con `sk-ant`; otro, 6 `Bearer `, 18 `apiKey`, 2 `ghp_` y **2 `-----BEGIN`**.
Por qué importa: es la **fuga real** del sistema, no una teórica. Contradice frontalmente `AGENTS.md:4` («Never print, include in prompts/arguments, **log**, or copy their values into repositories or documentation»). Todo el esfuerzo de `0600` + Keychain de la capa de configuración queda anulado por el hecho de que los transcripts —que son la consecuencia inevitable de pegar claves, cabeceras o PEMs en una conversación— se persisten en claro, sin cifrar, sin retención y legibles por cualquier proceso local. Y son el 69,7 % del volumen de `~/.pi`.
`sin-verificar`: si esas credenciales siguen **vivas**. Los conteos prueban presencia de material con forma de secreto, no validez; pueden ser ejemplos de documentación, claves revocadas o texto citado. No validé ninguna contra su proveedor (fuera de alcance y no debo).
Recomendación: `chmod 0600` sobre `sessions/**` y `0700` sobre `sessions/`; política de retención (28 días o N MB); y un filtro de redacción en la escritura del transcript. Después, y solo entonces, auditar vivencia de las 11 claves `sk-ant` y 14 `ghp_` detectadas.

**H-4 · `extensions/capabilities-footer` es un symlink colgante, y es la extensión que ya provocó 3 crashes.**
Evidencia: `~/.pi/agent/extensions/capabilities-footer -> /Users/ruben/Code/FLYBOX/src` (symlink, 28 B, 2026-10-06 01:29). `readlink` devuelve el destino; `test -e` → **DANGLING**; `ls /Users/ruben/Code/FLYBOX/src` → `No such file or directory`. El fichero original era `~/.pi/agent/extensions/capabilities-footer.ts`, citado por `crashes.json` en los 3 crashes del patrón 1 (`capabilities-footer.ts:129:37` y `:185:12`, 2026-10-05, `cwd: /Users/ruben/Code/FLYBOX`). El código solo sobrevive en `backups/capabilities-footer.ts.bak-20261006*` (6 copias, 12.561–38.336 B, todas `-rw-r--r--`, 19 días de antigüedad).
Por qué importa: cualquier carga de extensiones que recorra `extensions/` se encuentra una ruta muerta; el footer de capacidades que el diseño prevé no puede renderizarse; y la secuencia temporal (crash ×3 el 10-05 → symlink el 10-06 → destino borrado después) dibuja una migración a `FLYBOX` **a medias** cuyo cabo suelto es un enlace roto en el directorio de extensiones vivo. Es configuración activamente rota, no meramente stale.
Recomendación: o repoblar el destino, o eliminar el symlink y restaurar una de las 6 copias de `backups/` (la mayor, `-pre-repo`, 38.336 B, es la última evolución), corrigiendo de paso el `#60aaff` literal de la línea 129 por un nombre de color del tema.

**H-5 · Dos defaults contradictorios en dos ficheros vivos, sin precedencia documentada.**
Evidencia: `settings.json:4-5` → `"defaultProvider": "account-router"`, `"defaultModel": "agnes-3.0-flash"` · `models.json:185-187` → `"defaults": {"provider": "kilo-gateway", "model": "nvidia/nemotron-3-ultra-550b-a55b:free"}`. Ningún fichero de `~/.pi` declara cuál gana (§4.2).
Agravantes verificados: (a) `agnes-3.0-flash` **no existe** en el proveedor por defecto de `settings.json` — `models.json` define `account-router` **solo** con `apiKey` y `models: null`; el modelo está declarado bajo `agnes-ai`, y la resolución real pasa por `account-router.json` → `provider.models: array[2]`, es decir por un tercer fichero; (b) el default de `models.json` apunta a `kilo-gateway`, cuya `apiKey` es el placeholder `keyless` (`:47`) y cuyos 7 modelos son todos `:free` — un default de modelos gratuitos; (c) la cadena completa `settings.json` → `models.json` → `account-router.json` → `auth.json` no está descrita en ninguna parte.
Por qué importa: el proveedor y modelo efectivos no son determinables leyendo la configuración. Cualquier cambio de default exige adivinar qué fichero manda, y un operador (o un agente) que edite el equivocado no verá efecto.
`sin-verificar`: cuál gana en runtime — requiere ejecutar Pi o leer `/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/`, ambos fuera del alcance de solo lectura sobre `~/.pi`.
Recomendación: eliminar `defaults` de `models.json` o alinearlo con `settings.json:4-5`, y documentar la precedencia en `AGENTS.md`.

### MEDIA

**M-1 · Bug vivo y documentado en el paquete que `settings.json` carga como proveedor por defecto.**
`crashes.json`, 2 entradas (2026-10-17T10:51:42.865Z, 2026-10-19T00:13:28.768Z), ambas `version: 1.3.0`: `ExtensionRunner.assertActive → get ui → show (/Users/ruben/Code/PI-agent/src/pi-account-router/src/extension.ts:146 / :142) → refreshFooter (:205 / :201)`, mensaje «This extension ctx is stale after session replacement or reload». El paquete es `settings.json:21`. Los números de línea **cambian** entre las dos ocurrencias → el fichero se editó en medio y el defecto persistió. El propio mensaje de error da la corrección: «move post-replacement work into `withSession`». `notified: true` en ambas.
Impacto: el crash se dispara al hacer `newSession`/`fork`/`switchSession`/`reload`, o sea en el flujo normal de trabajo largo. Es la causa más probable del `.tmp` abandonado de **M-6** (el segundo crash es del 10-19 00:13 y el `.tmp` del 10-19 10:41, mismo día).

**M-2 · No existe registro único de proveedores: los tres ficheros de modelos casi no se solapan.**
§3.6: `models.json` (6 proveedores), `models-store.json` (5), `auth.json` (9) → **solo `anthropic` está en los tres**. 3 identidades `agnes-*` autenticadas sin proveedor en `models.json`; 4 proveedores con auth+catálogo sin entrada en `models.json`; 3 proveedores en `models.json` sin entrada en `auth.json`. Consecuencia: no se puede responder «qué proveedores tengo y con qué credencial» sin cruzar 3 ficheros a mano. Se agrava con `settings.json:19-22` usando una **ruta relativa** (`../../Code/PI-agent/src/pi-account-router`) cuyo `package.json` declara `main: null` y que depende de que `PI_CODING_AGENT_DIR` (`skill-router.ts:22`, `pi-optimization-routine.sh:10`) no se sobrescriba — si se sobrescribe, la ruta se rompe. Que esto ya pasó una vez lo documenta el propio backup `settings.json.bak-20261017-scr-to-src` (rename `scr`→`src`).

**M-3 · `mcp-cache.json`: 597.749 B con 9 de 13 servidores huérfanos y el 53,5 % del peso en una entrada de 22 días.**
§3.4: huérfanos (cacheados, no declarados en `mcp-adapter.json`): `codegraph`, `jart-cortex`, `notebooklm`, `obsidian`, `openspec`, `stitch`, `vault`, `you-official`, `youdotcom--brian-ifpw`. `stitch` = 319.983 B con 17 tools y `cachedAt 2026-10-03 13:35` (el más viejo, ~18,8 KB por herramienta). `youdotcom--brian-ifpw` tiene `discoveryFailed: true` y 0 tools pero conserva su entrada. `api` sigue cacheado pese a `mcp-adapter.json:11` `"disabled": true`. `you-key-1` y `you-key-2` duplican 18.852 B idénticos (coherente con su `definitionHash` compartido). No se aprecia ninguna purga por `configHash` ni por antigüedad.
Impacto: residuo informativo de servidores ya no configurados (incluyendo sus `instructions`, `prompts` y `resources`) en un fichero `0644`, más peso de parseo en cada arranque.

**M-4 · `trust.json` confía en todo `/Users/ruben/Code` mientras las aprobaciones MCP cubren 1 sola raíz.**
`trust.json`: 5 entradas, **todas `true`**, ninguna `false` (nunca se revocó nada), incluyendo `/Users/ruben/Code` — padre de ~50 de los 54 directorios de sesión, y que vuelve redundante la entrada explícita de `/Users/ruben/Code/XIAOMI-note-5g`. `mcp-project-approvals.json`: **1** raíz única (`/Users/ruben/Code/PI-agent`), 3 aprobaciones, una de ellas (`you-official`) para un servidor que ya no existe en `mcp-adapter.json`. Y `openspec` —40 herramientas, cacheado el 2026-10-25 05:50— no tiene ninguna aprobación registrada.
Impacto: la confianza amplia sobre un contenedor de decenas de repos anula el propósito del modelo de aprobación por proyecto; cualquier repo clonado en `~/Code` hereda confianza automáticamente.

**M-5 · El control de confianza del limbo de capacidades está vacío en el 99,6 % de las entradas.**
§3.3: `capabilities.json` → `trust`: `high` = **1**, `null` = **246** (de 247). `verified`: `false` = 126, `null` = 87, `true` = 34. La extensión anuncia en `registry-search.ts:17` «rerank (popularidad/exact/**trust**)» y en `:18` «Seguridad: **trust por origen** + aviso para fuentes no confiables (no ejecutar)». Con 246/247 en `null`, el rerank por trust es nominal y el aviso de fuente no confiable no puede dispararse: 170 servidores MCP y 77 skills indexados sin calificación de confianza.
Añádase crecimiento sin poda (211 → 247 entradas en 6 días, `capabilities.json.bak-tuios` 169.930 B vs 200.429 B) y una copia de seguridad completa del índice conviviendo con el vivo.
`sin-verificar`: si `registry-search.ts` rellena `trust` al instalar (las 4 entradas `status: installed` / 4 `used` podrían ser las únicas con datos reales) — no leí el cuerpo completo de la extensión.

**M-6 · `account-router-state/`: `.tmp` abandonado hace 6 días, deriva config↔estado y audit truncado.**
(a) `account-router-state/e592ff32df1fbb1186fde4f8.json.d656e6f5-c318-49a9-83a0-e9f65aeaf744.tmp (1.260 B, -rw-------, mtime 2026-10-19 10:41)` frente al estado vivo `(1.552 B, mtime 2026-10-25 08:15)` → un *write-tmp-then-rename* interrumpido y nunca limpiado; el mismo día del crash **M-1** (2026-10-19T00:13). Deja una segunda copia del estado del router que podría confundir una recuperación.
(b) Deriva: el estado vivo declara `groups[5]` mientras `account-router.json` declara `quotaGroups[4]` y `profiles/default.json` también `quotaGroups[4]`. `latEWMA{4}` sí casa con `accounts[4]`. `leases[2]` no vacío en reposo.
(c) **Audit truncado**: `account-router-state/audit/` contiene solo `2026-10-18.jsonl` (122.317 B) y `2026-10-19.jsonl` (70.536 B), mientras el router siguió escribiendo estado hasta el 2026-10-25 08:15 → **6 días de enrutado de credenciales sin traza de auditoría**, en el componente que decide qué cuenta paga cada petición.

**M-7 · Estado de cuentas triplicado y un segundo mecanismo de rotación abandonado.**
Tres copias de cuentas/cuotas con tres esquemas: `account-router.json` (`accounts[4]` con `credential` embebido, `quotaGroups[4]`, `provider{adapter, models[2]}`), `profiles/default.json` (`name`, `description`, `accounts[4]`, `quotaGroups[4]`, **`policies{}` vacío**), `account-router-state/profiles/default-e592ff32df1f.json` (`lastAccountId`, `groups`, `leases`, `waiters`, **sin `latEWMA`** → esquema anterior al estado vivo del 10-25, sin migrar). Ninguna precedencia documentada.
Y aparte, `~/.pi/proxy/agnes-rotation.json (122 B, -rw-r--r--, 2026-10-01)`: `currentIndex: 3`, `errors {"0":6,"1":6,"2":5,"3":0}`, `lastRotation` = **2026-09-28 03:35:10** → 27 días parado mientras el account-router estaba activo. Dos rotadores de las mismas 4 cuentas Agnes, uno muerto y no retirado, con contadores de error sin resetear.

**M-8 · Sin control de versiones en `~/.pi`: 17 backups manuales como único mecanismo de reversión.**
`find ~/.pi -maxdepth 3 -name .git` (excluyendo `node_modules`) → **vacío**. 207 ficheros y 307 MB de configuración viva, credenciales y transcripciones sin VCS. El sustituto son los 17 `.bak*` de §1.3, con **7 convenciones de nomenclatura incompatibles**, sin retención, sin índice y sin cifrado. `prompts/auditoria-dev.md` exige explícitamente señalar esto: «Si el repo / objetivo carece de VCS, señalarlo como hallazgo estructural (no obviarlo)».
Agravante: `backups/anthropic-auth-2026-10-09T17-42-01-556Z/auth.json (3.675 B, -rw-------, dir drwx------)` es un snapshot de credenciales de **16 días** que sobrevive fuera de cualquier ciclo de rotación — permisos correctos, pero es una copia viva de un secreto antiguo.
Nota forense: los mtimes de los `.bak` **no** sirven para ordenarlos (preservan el mtime del original, §1.3); dos de ellos (`models.json.bak-20261003-140755` y `models.json.bak-agnes-fix-20261003-141404`) comparten mtime idéntico pese a nombres que indican horas distintas.

**M-9 · El secreto en `models.json` se resuelve ejecutando una orden: `!security …`.**
`models.json:15` → `"apiKey": "!security find-generic-password -s agnes-ai -a pi -w"`. El prefijo `!` convierte el campo en un shell-out al Keychain de macOS. Es la mejor opción disponible para no persistir el valor, y hay que reconocérsela (§6), pero su propiedad de seguridad debe quedar explícita: **quien pueda escribir `models.json` puede ejecutar código arbitrario como `ruben` en cada arranque de Pi**. Hoy el fichero es `0600`, así que el vector presupone ser ya el usuario; el riesgo es de escalada lateral (un proceso comprometido corriendo como `ruben`, o una extensión con permiso de escritura), no de acceso remoto.
Relacionado: `omniroute.baseUrl` es `http://localhost:20128/v1` (`:145`) — HTTP en claro. Aceptable en loopback, pero es el proveedor cuya clave está en claro (**H-1**), así que ambos extremos del par son débiles.

**M-10 · `logs/` con permisos `0744`, un log huérfano y un servidor local que la config viva no referencia.**
`~/.pi/agent/logs/` es `drwx--r--` (**0744**): sin bit `x` para grupo/otros, que no pueden travesar el directorio — inconsistente con el `0755` del resto de `agent/` (y mismo caso que `secrets/vault/`, §H-2). Dentro: `local-qwen9b.err.log (3.244 B, -rw-r--r--, 2026-10-17)` con 6 ciclos de `llama_server` en `http://127.0.0.1:9118` cargando `Qwen3.8-9B-heretic-uncensored-Q4_K_M.gguf` desde `/Users/ruben/Code/mcp-gateway/mcp-gateway/models/` (ruta con segmento duplicado), y `local-qwen9b.out.log` de **0 bytes** desde el 2026-10-02. El puerto **9118 no aparece en ninguna configuración viva**: el único endpoint local declarado es `models.json:145` (`20128`). Es plumbing de un modelo local que la configuración actual no conoce.
Relacionado, mismo patrón de huérfano: `bin/fd` (2.970.480 B, Mach-O arm64, `-rwxr-xr-x`, mtime **2026-08-26** — el objeto más viejo de `~/.pi`, anterior a la creación del árbol) **no está referenciado** por `settings.json`, `scripts/`, `extensions/*.ts` ni `mcp-adapter.json` (grep vacío). Un binario ejecutable de 2,9 MB, sin versión, checksum ni procedencia registradas, dentro del directorio de configuración del agente.

### BAJA

**B-1 · Sin VCS en `~/.pi`** — tratado como hallazgo estructural en **M-8**; se lista aquí porque `prompts/auditoria-dev.md` lo categoriza como estructural y no de seguridad.

**B-2 · Política de backups ad-hoc sin retención.** §1.3: 17 artefactos, 7 convenciones de nombre, el más viejo de 2026-09-27 (28 días), 6 copias de un fichero que ya no existe (`capabilities-footer.ts.bak-*`), y un `zshrc.bak.20260928-120759` (2.215 B) que es un backup del `~/.zshrc` del usuario y **no pertenece** al árbol de configuración de Pi. Los nombres semánticos (`-vision`, `-you`, `-tuios`, `agnes-fix`, `-pre-sota`) son útiles y trazables — el defecto es la ausencia de índice, caducidad y criterio único.

**B-3 · 8 `.DS_Store` bajo `~/.pi`, uno de ellos dentro del directorio `0700` de credenciales.**
`~/.pi/.DS_Store`, `~/.pi/secrets/.DS_Store`, `~/.pi/agent/.DS_Store` (8.196 B), `~/.pi/agent/account-router-state/.DS_Store` (6.148 B, dentro del `drwx------`), `~/.pi/agent/sessions/.DS_Store` (**22.532 B**), `~/.pi/agent/backups/.DS_Store`, `~/.pi/agent/backups/skills-20260928-121149/.DS_Store`, `~/.pi/agent/npm/.DS_Store`. Todos `0644`. Revelan nombres de fichero y orden de exploración de Finder; el de `sessions/` (22 KB) indica navegación extensa por las transcripciones. En `account-router-state/` el `0700` del padre lo protege, pero es incoherente con el propósito del directorio.

**B-4 · `mcp-onboarding.json` con `setupCompleted: false` pese a un adaptador en plena producción.**
`{"version":1,"sharedConfigHintShown":false,"setupCompleted":false,"piBuiltinMcpHandledVersion":"6.0.0"}` (121 B, 0644, 2026-10-23) frente a 13 servidores cacheados, 221 herramientas, 3 aprobaciones y un `mcp.log` con decenas de búsquedas exitosas. O el flag no se escribe nunca, o el wizard puede volver a dispararse. La parte de versión **sí** es coherente (§4.4).

**B-5 · 12 prompts `opsx-*` con un preámbulo de ~2 KB duplicado, instalados en lote y sin actualizar desde el 2026-10-14.**
Los 12 comparten mtime idéntico `2026-10-14 01:19` y replican las secciones **Store selection** + **Project check** + ramas `"root": null` (verificado en `opsx-apply.md`, `opsx-new.md`; los md5 de los primeros 2.000 B difieren solo por la línea `description:`). Son 96 KB de los ~178 KB de `prompts/`. Un cambio en el preámbulo exige 12 ediciones; y al ser contenido de un tercero (OpenSpec) viviendo en el árbol de configuración del agente, nada señala cuándo queda obsoleto respecto al CLI `openspec` instalado. Solo `auditoria-dev.md` (4.678 B, 2026-10-17) es de autoría local.

**B-6 · `mcp.log` (0644) persiste el historial de búsqueda literal del usuario.**
`~/.pi/agent/mcp.log (4.786 B, -rw-r--r--, 2026-10-23 08:02)`: decenas de líneas `… [api] info Search successful for query: "<consulta completa>" - N web results…`. No contiene credenciales, pero expone en claro y sin rotación un rastro detallado de la actividad de investigación (temas, proveedores evaluados, herramientas). Además documenta que **todo** el tráfico registrado pasó por el servidor `api` — el de clave única que `AGENTS.md:6` prohíbe como default y que `mcp-adapter.json:11` deshabilitó dos días después (**§2.3**). El log (10-23) y la caché (10-25) no avanzan juntos.

**B-7 · `npm/`: 83 MB y 40 paquetes para una única dependencia declarada, con binario nativo y automatización de navegador.**
`npm/package.json` → `"dependencies": {"pi-mcp-adapter": "^6.0.0"}` (instalada 6.0.0). La expansión transitiva incluye `recheck` + `recheck-jar` + `recheck-macos-arm64` (binario nativo y un JAR), `jose`, `undici`, `zod`, `ajv`, `pkce-challenge` y la cadena `open`/`default-browser`/`default-browser-id`/`run-applescript`/`wsl-utils`/`is-wsl`/`is-docker`/`is-inside-container`/`bundle-name`. Superficie de ejecución de terceros relevante dentro del árbol que maneja las credenciales del agente. `package-lock.json` (27.966 B) presente → instalación reproducible; `.gitignore` = `*` + `!.gitignore` → correcto. El rango `^6.0.0` permite saltos de *minor* silenciosos, mitigados por el lock.

**B-8 · `crashes.json` en 0644 con rutas absolutas y `sessionFile`, sin purga.**
7.564 B, `-rw-r--r--`, 5 entradas de hasta 20 días, todas `notified: true` (el usuario ya fue avisado de las 5 y ninguna se resolvió: el patrón 1 terminó en symlink roto, **H-4**; el patrón 2 sigue vivo, **M-1**). Expone la estructura de directorios del usuario y los UUID de sesión. No hay límite de entradas ni caducidad.

**B-9 · `settings.json` conserva `compaction.modelOverrides` para un proveedor que ya no es el default.**
`settings.json` → overrides para `deepseek/deepseek-v4-pro` y `deepseek/deepseek-flash` (`reserveTokens 32768`, `keepRecentTokens 60000`), mientras `:4-5` declaran `account-router`/`agnes-3.0-flash`. `deepseek` **no** está en `models.json`; solo existe en `models-store.json` (2 modelos). Es residuo de la etapa en que `deepseek` era el default, documentada en `backups/settings.json.bak.20260928-120759` (`"defaultProvider": "deepseek"`, `"defaultModel": "deepseek-v4-pro"`). No es incorrecto (sigue aplicando si se usa deepseek), pero es configuración que ya nadie recuerda por qué está ahí, y ningún `compaction.modelOverrides` cubre al proveedor por defecto actual.

**B-10 · 7 directorios de sesión vacíos y rutas de proyecto fragmentadas por renombres.**
Vacíos: `--Users-ruben--`, `--Users-ruben-Movies--`, `--Users-ruben-Code-OBSIDIAN--`, `--Users-ruben-Code-PI-alternatives--`, `--Users-ruben-Code-PI-agent-pi-planner--`, `--Users-ruben-Code-deepseek-harness--`, `--Users-ruben-Code-ALBERTO - TEXTO--`. Y el mismo proyecto aparece bajo 3 grafías por renombres sucesivos: `--Users-ruben-Code-PI-agent-pi-account-router--`, `-scr-pi-account-router--`, `-src-pi-account-router--` (el rename `scr`→`src` está fechado por `settings.json.bak-20261017-scr-to-src`), más `--Users-ruben-Code-TUI-studio--` y `-TUI-studio-OLD--`. La codificación cwd→nombre tampoco escapa espacios (`ALBERTO - TEXTO`), lo que rompe el *globbing* ingenuo. Resultado: historial fragmentado y no agregable por proyecto, sin retención ni compresión sobre 214 MB.

---

## 6. Lo que SÍ funciona / es real

Medido, no decorativo — cada punto con su evidencia:

1. **Disciplina de permisos en la capa sensible: 12 de 12.** Todos los ficheros con credenciales o referencias a ellas están en `0600`: `models.json`, `models-store.json`, `auth.json`, `mcp-project-approvals.json`, los 5 `account-router*.json`, `profiles/default.json`, los 3 `models.json.bak-*` y los 2 `account-router.json.bak-*`. Los directorios que los contienen, en `0700`: `account-router-state/` y `backups/anthropic-auth-2026-10-09T17-42-01-556Z/`. **Y los backups heredan el `0600` del original** — el fallo habitual en snapshots manuales aquí no se produce. Cero excepciones en toda la capa sensible.

2. **El secreto del proveedor principal nunca toca el disco.** `models.json:15` resuelve la clave de `agnes-ai` con `!security find-generic-password -s agnes-ai -a pi -w` → Keychain de macOS, no JSON. Exactamente la política que `AGENTS.md:4` declara.

3. **El pool de dos claves You.com está implementado de punta a punta y es coherente en tres capas.** Política declarada (`AGENTS.md:3`), implementada sin token en disco (`mcp-adapter.json:16,24` → `"auth": "bearer"` + `"bearerTokenStore": true`), y con superficie de herramientas recortada por allowlist (`:18,26` → `X-Allowed-Tools` con 5 nombres) que `mcp-cache.json` confirma: **5 tools cacheadas para `you-key-1`, 5 para `you-key-2`**. La allowlist se cumple al pie de la letra.

4. **La migración de clave única a pool de dos claves es fechable, se hizo y se cerró bien.** `mcp-adapter.json.bak-20261024-you` (212 B, 05:18:49) tiene solo `googledrive` + `api` sin deshabilitar; `mcp-adapter.json` (716 B, **05:19:02**) tiene el pool completo **y** `api` con `"disabled": true` (`:11`). Trece segundos, y el camino prohibido por `AGENTS.md:6` quedó explícitamente desactivado en vez de simplemente abandonado.

5. **`capabilities.json` (200 KB) no cuesta un solo token de contexto.** `registry-search.ts:14`: «NO se carga en el prompt». Es un índice BM25 en disco (`:17`, k1=1.2, b=0.75) con búsqueda offline primero y remota después (`:15`). Progressive disclosure implementado de verdad: 247 capacidades disponibles sin ocupar ventana de contexto. Es la decisión de arquitectura más sólida del conjunto.

6. **`models-store.json` hace revalidación HTTP condicional correcta.** Los 5 proveedores llevan `{checkedAt, etag, lastModified}` → ETag + Last-Modified para 61 modelos, en vez de *refetch* ciego en cada arranque. Y el script de mantenimiento se autoimpone no inventar metadatos: `pi-optimization-routine.sh:7` «No inventa valores (p.ej. no declara `promptCache` sin dato real del proveedor)» — `promptCache` y `thinkingLevelMap` solo aparecen donde el catálogo real los aporta.

7. **Coherencia de versión exacta en la cadena MCP.** `npm/package.json` pide `^6.0.0` · `node_modules/pi-mcp-adapter/package.json` es `6.0.0` · `mcp-onboarding.json` declara `piBuiltinMcpHandledVersion: "6.0.0"`. Y `settings.json:24` (`"-builtin:mcp"`) desactiva el MCP integrado justo porque el adaptador lo sustituye: no hay dos implementaciones compitiendo.

8. **El enrutado de cuentas no es una idea, es un sistema con estado y evidencia empírica.** `account-router-state/` en `0700` con estado vivo (`leases[2]`, `waiters[0]`, `latEWMA{4}`, `disabledAccountIds[0]`), escritura atómica tmp+rename (de ahí el `.tmp` de **M-6**, que es la *prueba* de que el patrón existe), `audit/*.jsonl` diario, y —lo más notable— **tres ficheros de evidencia experimental**: `account-router-accounts-verification.json` (2.280 B, `results[5]`), `account-router-performance.json` (3.149 B, `results[4]`, `benchmark: true`) y `account-router-performance-pilot.json` (490 B, una petición instrumentada con `headersMs`/`firstContentMs`/`completedMs`/`cliWallMs`/`contentEvents`). Los nombres de campo (`independentQuotasVerified`, `sharedAggregateRPM`, `distinctAccountsObserved`) muestran que se **midió** si las 4 cuentas tienen cuotas independientes en lugar de suponerlo. Eso es método, y es infrecuente.

9. **Las aprobaciones MCP están ligadas al contenido, no al nombre.** `mcp-project-approvals.json` aprueba por `definitionHash` sha256, y `you-key-1`/`you-key-2` comparten hash (`0c339e43…`) porque sus definiciones son idénticas salvo el secreto. Cambiar la definición invalida la aprobación: el diseño correcto.

10. **`scripts/pi-optimization-routine.sh` es herramienta defensiva bien construida.** `-rwxr-xr-x`, `set -uo pipefail`, respeta `PI_CODING_AGENT_DIR` (`:10`), valida el JSON con `python3 -c 'import json,sys;json.load(...)'` **antes** de interpretarlo, separa modo reporte de modo `--apply`, y distingue explícitamente «dentro de una sesión de pi» de «fuera» (`:25-29`) — que es de donde sale la única precedencia documentada de todo el sistema (§4.2).

11. **El canon de auditoría propio es exigente y se aplica a sí mismo.** `prompts/auditoria-dev.md` obliga a evidencia `fichero:línea`, a marcar `sin-verificar` lo no falsable por ejecución, a un pase adversarial con un escéptico que «**no corrige**: solo produce findings», a una sección obligatoria de «Lo que SÍ funciona» «medido, no decorativo», a incluir los errores de los propios auditores, y a señalar la ausencia de VCS como hallazgo estructural. Este anexo sigue ese canon punto por punto, incluidos el §Aviso de integridad y los 6 `sin-verificar`.

---

## 7. Lagunas

Lo que **no** pude determinar, y por qué. Ninguna de estas lagunas debe leerse como «no hay problema» ni como «lo hay».

1. **No leí el valor de ningún secreto** (regla del encargo). De `auth.json` registré solo tamaño (3.997 B), permisos (`-rw-------`), mtime (2026-10-25 07:41:17), los 9 nombres de clave y la cardinalidad de cada objeto (2 campos ×7, 5 campos ×2). **No puedo afirmar** qué campos concretos lleva cada proveedor, ni si algún token está expirado, ni si las 4 identidades `agnes-*` siguen activas. Igual para `account-router.json` (`accounts[].credential`, `quotaGroups[].limits`) y `profiles/default.json`.

2. **No abrí `~/.pi/secrets/vault/server.log`.** Solo sonda de conteos de patrones + `lsof` + medición de crecimiento. Las **72** líneas que contienen `token` y las **8** que contienen `secret` pueden ser nombres de campo inofensivos o fugas reales: **no lo puedo afirmar en ninguna dirección**. Requiere inspección manual del propietario. Es la laguna con mayor impacto potencial sobre **H-2**.

3. **Los conteos de patrones en `sessions/*.jsonl` miden presencia de cadenas, no credenciales válidas.** 54 ficheros con `Bearer `, 52 con `apiKey`, 14 con `ghp_`, 11 con `sk-ant`, 11 con `-----BEGIN` prueban que hay material *con forma de* secreto persistido en claro; **no** prueban que ninguna clave siga viva. Pueden ser ejemplos de documentación, claves revocadas, texto citado o claves de terceros. No validé ninguna contra su proveedor (fuera de alcance, y hacerlo sería usarlas). La gravedad final de **H-3** depende de esa validación, que solo el propietario puede hacer.

4. **La precedencia real entre `settings.json:4-5` y `models.json:185-187` es indeterminada** (**H-5**). Resolverla exige leer el fuente del agente en `/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/dist/bundle/` (citado en los stacks de `crashes.json`) o ejecutar `pi` — ambas cosas fuera del ámbito `~/.pi` y prohibidas por el modo de solo lectura. Tampoco puedo confirmar cómo resuelve Pi el `main: null` de `pi-account-router`, ni si `provider.adapter` de `account-router.json` (un string cuyo **valor no registré**) apunta a algo existente.

5. **No audité la cadena de suministro.** De `npm/node_modules/` solo inspeccioné los 40 nombres top-level y la versión de `pi-mcp-adapter` (6.0.0). Sin revisar *postinstall*, binarios, versiones resueltas ni `package-lock.json` entrada por entrada; `recheck-macos-arm64` y `recheck-jar` son superficie nativa/JVM no examinada. Ídem `bin/fd`: confirmé que es Mach-O arm64 de 2.970.480 B y que **ninguna** configuración viva lo referencia, pero no su procedencia, versión ni firma.

6. **No ejecuté nada.** Ni `pi`, ni el adaptador MCP, ni `pi-optimization-routine.sh`, ni ninguna extensión. Todo lo dicho sobre comportamiento en runtime procede de leer código, configuración y logs — no de observarlo. En particular: no puedo saber si los crashes de `crashes.json` siguen reproduciéndose (no hay entradas posteriores a 2026-10-19 pese a uso hasta el 2026-10-25: ¿corregido, o dejó de registrarse?), ni si el symlink roto de **H-4** produce un error visible o se ignora en silencio, ni si `skill-router.ts` encuentra skills en las otras 4 rutas candidatas (`cwd/.pi/skills`, `cwd/.agents/skills`, `~/.agents/skills`, y ascendiendo por los padres) dado que `~/.pi/agent/skills` **no existe**.

7. **No comprobé el Keychain de macOS.** `bearerTokenStore: true` (`mcp-adapter.json:16,24`) y `!security find-generic-password -s agnes-ai -a pi -w` (`models.json:15`) declaran la intención; consultar el Keychain para verificar que las entradas existen habría requerido `security find-generic-password`, que puede exponer el secreto en la salida. No lo ejecuté. Que el diseño sea correcto no prueba que las entradas estén pobladas.

8. **No registré los valores de `account-router-state/e592ff32df1fbb1186fde4f8.json`** más allá de tipos y cardinalidades, de modo que la deriva `groups[5]` vs `quotaGroups[4]` (**M-6b**) está probada en estructura pero no explicada: puede ser un grupo implícito por defecto, un grupo huérfano de una configuración anterior, o un contador interno. Determinarlo exige leer `pi-account-router`.

9. **No verifiqué la vigencia de los 247 registros de `capabilities.json`** (sus `url`, `source`, `page`), ni el contenido individual de cada entrada — solo distribuciones agregadas. Tampoco leí el cuerpo completo de `registry-search.ts` (16.630 B) ni de `skill-router.ts` (4.833 B): cité sus cabeceras JSDoc y las líneas de resolución de rutas, no su lógica. Por eso **M-5** lleva `sin-verificar` sobre si `trust` se rellena al instalar.

10. **Rutas fuera de `~/.pi` mencionadas por la configuración, no inspeccionadas** (ámbito del encargo): `/Users/ruben/Code/PI-agent/src/pi-account-router` (solo confirmé que existe y leí `{name, version, main}` de su `package.json`), `/Users/ruben/Code/FLYBOX/src` (solo confirmé que **no** existe), `/Users/ruben/Code/mcp-gateway/mcp-gateway/models/*.gguf`, y las 5 raíces de `trust.json`. El anexo **A2** cubre el repo `PI-agent`.

11. **Los 7 directorios de sesión vacíos son ambiguos**: no puedo distinguir «proyecto donde nunca se lanzó Pi» de «sesiones borradas a mano». Ídem el paradero de las skills archivadas en `backups/skills-20260928-121149/` (3 SKILL.md): no sé si se movieron a otra de las rutas candidatas de `skill-router.ts` o se retiraron definitivamente.

12. **Cobertura temporal parcial.** El inventario es una instantánea del 2026-10-25 08:11–08:30. `~/.pi/agent/account-router-state/` cambió de mtime **durante** la auditoría (08:15:28 → 08:25), y `secrets/vault/server.log` creció 6.300 B mientras trabajaba: el sistema estaba vivo. Cualquier cifra de este anexo puede haber cambiado al leerlo.
