# S4 · Seguridad y gobernanza — Auditoría del agente Pi

**Anexo especialista:** seguridad y gobernanza · **Fecha:** 2026-10-25 · **Régimen:** solo lectura estricta, nada fuera de `auditoria-pi-agent/`
**Regla de secretos aplicada:** no se reproduce ningún valor de credencial. Solo estructura, tamaños, permisos y mtimes. Los valores leídos accidentalmente se marcan `[REDACTADO]`.
**Convención de evidencia:** `[V]` = verificado por ejecución/lectura directa en esta auditoría; `[A]` = reportado por documentación del proyecto o por otro anexo. Rutas relativas a `/Users/ruben/Code/PI-agent/` salvo que se indique `~/`.

---

## 0 · Veredicto central

> **La capa de gobernanza de Pi (`hard-gates`, `governance`, `sandbox`, `provenance`, `keystore`) está implementada y es de buena calidad, pero NO está cargada en la configuración viva.** El Pi que hoy ejecuta Ruben corre con `pi-account-router` + `pi-mcp-adapter` + MCP builtin y **ninguna puerta dura, ningún sandbox, ninguna redacción de secretos y ninguna detección de inyección activas**. El anillo-0 existe como biblioteca; como autoridad, hoy es nominal.

Esto no invalida el diseño —lo confirma como diseño—, pero cambia el orden de cualquier remediación: **antes de extraer anillos hay que cablear el que ya existe**, porque una extracción en anillos sobre una autoridad no cargada reproduce el vacío a mayor escala.

Segundo veredicto, independiente: **el gateway normalizado de memoria no tiene ninguna autenticación ni autorización, y no debe exponerse fuera de loopback en su forma actual.** Hoy no es explotable por red porque no existe ningún listener (`[V]` grep: cero `createServer`/`.listen()`/`Bun.serve` en todo `src/`), pero la superficie ya está definida y derivada automáticamente a OpenAPI **y** a tools MCP desde las mismas rutas.

---

## 1 · Modelo de autoridad hoy

### 1.1 Cadena de decisión real (verificada)

| # |Quién decide | Dónde | Permiso | Qué controla | Estado |
|---|---|---|---|---|---|
| 1 | `settings.json` | `~/.pi/agent/settings.json` | **0644** | `defaultProvider`, `defaultModel`, `packages[]`, `extensions[]`, `compaction.modelOverrides` | **Raíz de confianza en fichero world-readable** `[V]` |
| 2 | `pi-account-router` (package) | cargado por `settings.json → packages[1]` | — | Qué cuenta/pool responde; `baseUrl`; cuotas | Cargado y activo `[V]` |
| 3 | `pi-mcp-adapter` (npm) | `settings.json → packages[0]` | — | Proxy MCP; pool You.com de 2 keys | Cargado y activo `[V]` |
| 4 | `-builtin:mcp` | `settings.json → extensions[0]` | — | MCP del host | Cargado `[V]` |
| 5 | `account-router.json` | `~/.pi/agent/account-router.json` | 0600 | 4 `accounts`, 4 `quotaGroups`, `credential.piProvider` | Sano: **ningún secreto en claro** `[V]` |
| 6 | `auth.json` | `~/.pi/agent/auth.json` | 0600 (3.997 B) | Material de clave real por provider | Correcto `[V]` |
| 7 | `mcp-project-approvals.json` | `~/.pi/agent/` | 0600 | `projectRoot` + `serverName` + `definitionHash` + `approvedAt` | **Buen diseño**: aprobación anclada a hash de la definición `[V]` |
| 8 | `trust.json` | `~/.pi/agent/trust.json` | **0644** | 5 rutas absolutas → `bool` | Decisión de confianza en world-readable `[V]` |
| 9 | `capabilities.json` | `~/.pi/agent/` | **0644** (200.429 B) | Catálogo de capacidades que alimenta selección/routing | **Entrada sin firmar ni versionar** `[V]` |
| 10 | `mcp-cache.json` | `~/.pi/agent/` | **0644** (597.885 B) | Cache MCP | **Entrada sin firmar** `[V]` |
| 11 | `prompts/auditoria-dev.md` | `~/.pi/agent/prompts/` | **0644** | Guardrails del comando `/auditoria-dev` | Autoridad **en prosa**, no ejecutada `[V]` |
| 12 | `pi-memory` / `pi-intermediate` | `src/` del repo | — | Gates, sandbox, governance, provenance, keystore | **NO CARGADOS** `[V]` |

**Comprobación del punto 12** `[V]`:
- `grep -c "pi-memory" ~/.pi/agent/settings.json` → `0`; `grep -c "pi-intermediate" …` → `0`.
- `settings.json → packages` = `npm:pi-mcp-adapter`, `…/pi-account-router`; `extensions` = `-builtin:mcp`. Ni una referencia a la capa de gobernanza.
- Las dos extensiones sueltas en `~/.pi/agent/extensions/` (`registry-search.ts`, `skill-router.ts`) importan solo `node:*`, `@earendil-works/pi-coding-agent` y `typebox` — **ningún gate**.
- `grep -rln "gateBash|gateToolCall|hard-gates|pi-intermediate|pi-memory"` sobre `~/.pi/agent/{extensions,scripts,profiles}/` → **cero coincidencias**.

Único consumidor real de los gates en todo el repo `[V]`:
```
src/pi-intermediate/src/hard-gates.ts:55,63,68,75   (definición)
src/pi-memory/src/hooks.ts:11,48,55                 (único import)
src/pi-memory/src/extension.ts:56 (tool_call), :66 (user_bash)   (único registro)
```
Es decir: **toda la política de seguridad de Pi cuelga de que se cargue una extensión que la configuración viva no carga.**

### 1.2 Qué rompe la cadena

**R1 · La raíz de confianza es un 0644 que carga código por ruta relativa mutable** `[V]`
`settings.json` (0644) declara `packages: […, ../../Code/PI-agent/src/pi-account-router]`. Dos problemas compuestos:
1. Un fichero **world-readable** decide qué código se carga como extensión del agente.
2. La resolución es por **ruta relativa a un árbol de trabajo mutable**, no por nombre+versión+integridad. Cualquier proceso que corra como `ruben` (y Pi no tiene separación de privilegios: todo corre como el mismo usuario) puede reescribir `settings.json` o el árbol en `../../Code/PI-agent/src/` y obtener ejecución de código en el agente en el siguiente arranque.

No hay firma, ni hash, ni `integrity`, ni pin de commit sobre el paquete cargado. `mcp-project-approvals.json` demuestra que **el patrón de anclar por `definitionHash` ya existe en Pi** —simplemente no se aplica a `packages`.

**R2 · Las entradas que alimentan routing son 0644 y no están firmadas** `[V]`
`capabilities.json` (200 KB) y `mcp-cache.json` (597 KB) en 0644. El riesgo no es la lectura (no son secretos); es que son **entrada de decisión** sin control de integridad. Un escrito no autorizado cambia qué capacidades se ofrecen al modelo y qué servidores MCP se creen disponibles. Contraste interno útil: `account-router.json` sí está en 0600 y sí pasa por validación Zod + semántica estricta (`src/pi-account-router/src/config.ts:61-149`), mientras que los caches de 597 KB no pasan por nada.

**R3 · Backups dispersos, sin política y con duplicación de material sensible** `[V]`
- `~/.pi/agent/backups/` es **0755** y contiene: `anthropic-auth-2026-10-09T17-42-01-556Z/auth.json` (0600, 3.675 B, dentro de dir 0700 — correcto), `settings.json.bak.20260928-120759` (**0644**), `zshrc.bak.20260928-120759` (**0644**, 2.215 B) y 6 `.bak` de `capabilities-footer.ts`.
- Fuera de `backups/`, en `~/.pi/agent/` directamente: `account-router.json.bak-20261010001706`, `account-router.json.bak-20261019-vision`, `models.json.bak-*` (×3), `settings.json.bak-*` (×2), `capabilities.json.bak-tuios`, `mcp-adapter.json.bak-20261024-you`.
- Consecuencia: hay **dos copias de `auth.json`** y varias de `settings.json` en rutas y con mtimes distintos. Ninguna está inventariada, firmada ni sujeta a retención. Una rotación de credenciales que olvide los `.bak` deja material vivo en disco indefinidamente.
- `zshrc.bak.*` en 0644 dentro del árbol del agente es especialmente indeseable: los perfiles de shell suelen exportar tokens.

**R4 · Las probes son la única evidencia de los gates G0-G8 y están gitignored** `[V]`
`src/pi-account-router/.gitignore:13-14` excluye `.probe-*.ts` y `.probe-*.mjs`. Existen 14 ficheros `.probe-*` en el árbol (`g0`, `g2`, `g3`, `g3-mp`, `g3-mp-child`, `g3b`, `g4`, `g5`, `g7`, `g8`, `p1`, `stale-ctx`, `architecture-delta.mjs`). `git ls-files | grep -i probe` devuelve **solo** `scripts/live-account-probe.extension.ts`.

El propio `.gitignore` lo declara: *«Local in-memory probes (E-020: no regression suites in the house; results are recorded in change tasks.md)»*. Es una decisión consciente y documentada, pero su efecto de gobernanza es duro: **la evidencia de que G0-G8 miden lo que el dossier afirma no es reproducible ni revisable ni resistente a alteración.** Un `tasks.md` que transcribe resultados no distingue un gate medido de un gate inventado. Para una auditoría externa esto es `sin-verificar` por construcción.

**R5 · Artefactos no versionados dentro del árbol del paquete** `[V]`
- `src/pi-account-router/dist/pi-account-router-0.1.0.tgz` existe con `dist/` y `*.tgz` gitignored → binario no rastreable en el árbol.
- `src/pi-account-router/.omo/run-continuation/*.json`: **45 ficheros** de continuación de sesión de agente, gitignored, dentro del directorio del paquete. Son transcripciones de sesiones: pueden contener cualquier cosa que pasó por el contexto, incluidos secretos. No están en VCS (bien), pero tampoco están cifrados ni inventariados.
- `src/pi-account-router/.tmp-dbg-g5-oyocty/e.json`, huérfano.

**R6 · Temporal huérfano en el state del router** `[V]`
`~/.pi/agent/account-router-state/e592ff32df1fbb1186fde4f8.json.d656e6f5-c318-49a9-83a0-e9f65aeaf744.tmp` (0600, mtime 2026-10-19, 1.260 B) frente al estado vivo `e592ff32df1fbb1186fde4f8.json` (0600, mtime 2026-10-25). El camino atómico de `file-state-store.ts:229-247` hace `unlink` en `finally`, así que este `.tmp` testimonia un fallo de proceso entre `open(temp,"wx")` y el `finally`. Es inofensivo en permisos, pero indica que **no hay barrido de temporales al arrancar** y que el directorio acumula restos de escrituras abortadas.

**R7 · Autoridad en prosa** `[V]`
`~/.pi/agent/prompts/auditoria-dev.md` (0644) establece «*El pase de auditoría es read-only: no modificar código ni specs*» y «*Prohibido afirmar sin evidencia ejecutable*». Son guardrails correctos y bien redactados, pero son **instrucciones al modelo**, no mecanismos. Un fichero 0644 que contiene la política de seguridad y que puede reescribirse sin dejar rastro no es un control; es documentación. Esta auditoría los cumple por decisión propia, no porque nada lo impida.

### 1.3 Lo que SÍ sostiene la cadena (equilibrio obligatorio)

No todo son roturas. Estos controles son reales, están bien construidos y deben conservarse tal cual:

- **Resolución de credenciales de solo lectura y sin ejecución.** `src/pi-account-router/src/adapters/credentials.ts:22` lo declara y lo cumple: no ejecuta comandos de credencial ni refresca OAuth. Rechaza credenciales no-`api_key` (`:94`), rechaza claves respaldadas por comando con prefijo `!` (`:100-104`), y solo permite interpolación `$VAR`/`${VAR}` bajo regex estricta (`:105-110`). Añade rechazo de caracteres de control/formato Unicode (`:11-18`). **Esto cierra la clase de ataque «el fichero de config ejecuta código»** y es lo mejor del repo en materia de secretos.
- **Validación de `baseUrl` fail-closed.** `config.ts:79-89`: rechaza `username`/`password`/`search`/`hash` en la URL, exige `https:` o `http:` solo a `localhost`/`127.0.0.1`/`[::1]`, y para el adapter `agnes` fija la URL al constante exacto `AGNES_BASE_URL` (`config.ts:12`, comprobación en `:88`). No hay SSRF por configuración.
- **Estado corrupto → parada, nunca reset.** `file-state-store.ts:26-30`: `corrupt()` lanza *«refusing to reset quota history»*. `decodeState` valida versión, claves exactas (`exact()`), IDs contra `/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/`, timestamps, unicidad, orden monotónico de `starts`, y revalida cada `group.policy` pasándolo por `parseConfig` (`:98-104`). Además **valida antes de escribir** (`:224-225`), así que un caller roto no puede envenenar decisiones futuras de cuota.
- **Escritura atómica real.** `file-state-store.ts:229-247`: `open(temp,"wx",0o600)` → `writeFile` → `file.sync()` → `rename` → `directory.sync()` (no-Windows). Con re-comprobación de `lock.healthy()` **antes y después** del rename (`:238`, `:243`) y fallo explícito si el unlock falla (`:257-260`), sin reportar éxito.
- **Locking con compromiso detectado.** `:180-201`: `proper-lockfile` con `stale: 10000`, `onCompromised`, deadline de 10 s y `RouterError` al agotarse. Nunca se mantiene el lock durante streaming ni durante espera de cuota (declarado en `:157`).
- **Propiedad de lease por UUID.** `application/router.ts:21` (`readonly owner = randomUUID()`), y `release`/`shutdown` filtran por `owner` (`:112-116`, `:170-175`). Un proceso no puede liberar ni robar leases ajenos.
- **Feedback de cuota conservador.** `router.ts:120-140`: 401/403 → deshabilita la cuenta; `status 0` → cooldown transitorio; 429/5xx → respeta `Retry-After` con fallback. Falla hacia «menos requests», no hacia más.
- **Sandbox fail-closed por preferencia explícita.** `sandbox.ts:300-311`: con `PI_CORE_SANDBOX_PROVIDER` fijado, si ese proveedor no está disponible devuelve `NoneProvider` —**nunca cae a un sandbox distinto del pedido**. `SrtProvider` y `GondolinProvider` declaran `supports(opts) === opts.network !== true` (`:186-188`, `:250-252`), de modo que una política que pide red se **deniega** en lugar de degradarse. `ExecutionGate.decide()` (`:367-371`) bloquea contenido en cuarentena si no hay sandbox disponible.
- **Cuota cloud fail-closed.** `memory-cloud.ts:66-70`: por encima de `maxRecords` lanza `QuotaExceededError` **sin tocar datos**.
- **Tenant en cada consulta SQL.** `memory-cloud.ts` añade `AND tenant = ?` en `get`/`search`/`timeline`/`invalidate`/`stats`/`exportAll`, como defensa en profundidad sobre RLS (`:194-196`).

---

## 2 · Matriz de amenazas por anillo

Severidad: `BLOCKER > CRITICAL > MAJOR > MINOR > INFO`.

### 2.0 Amenazas transversales (independientes del anillo)

| ID | Sev | Amenaza | Evidencia | Por qué importa |
|---|---|---|---|---|
| **S4-T1** | **BLOCKER** | Toda la capa de gates/sandbox/governance/provenance está **desconectada en la configuración viva** | `[V]` `settings.json` sin `pi-memory`/`pi-intermediate`; único consumidor `pi-memory/src/hooks.ts:11,48,55`; único registro `pi-memory/src/extension.ts:56,66`; cero coincidencias en `~/.pi/agent/{extensions,scripts,profiles}/` | El agente real ejecuta bash, escribe ficheros y consume MCP **sin ninguna puerta dura**. `rm -rf`, lectura de `~/.pi/auth.json` y exfiltración por `curl` no están bloqueados por nada cargado. Toda la documentación de gates describe capacidad, no estado |
| **S4-T2** | **CRITICAL** | Raíz de confianza world-readable que carga código por ruta relativa mutable | `[V]` `~/.pi/agent/settings.json` (0644) → `packages[1] = ../../Code/PI-agent/src/pi-account-router` | Escalada a ejecución de código en el agente por cualquier proceso del mismo usuario. Sin `integrity`, sin pin, sin firma —aunque `mcp-project-approvals.json` ya usa `definitionHash` |
| **S4-T3** | **CRITICAL** | Ausencia total de separación de privilegios: kernel, gateway, conexiones, caches, backups y secretos corren como el mismo UID | `[V]` todo `~/.pi/**` y `/Users/ruben/Code/PI-agent/**` propiedad de `ruben:staff` | La extracción en anillos **no crea una frontera de seguridad** si todos los anillos comparten UID y permisos de fichero. Un anillo-2 comprometido tiene la misma autoridad POSIX que el anillo-0 |
| **S4-T4** | **MAJOR** | Evidencia de gates no reproducible (probes gitignored) | `[V]` `.gitignore:13-14`; 14 `.probe-*` presentes; `git ls-files` solo lista `scripts/live-account-probe.extension.ts` | G0-G8 quedan como afirmación documental. Imposible auditar, imposible detectar regresión, imposible distinguir medición de aspiración |
| **S4-T5** | **MAJOR** | Caches de decisión 0644 sin integridad | `[V]` `capabilities.json` (200.429 B, 0644), `mcp-cache.json` (597.885 B, 0644) | Alteración local silenciosa de qué capacidades/MCP se ofrecen al modelo. 597 KB de superficie sin hash ni firma |
| **S4-T6** | **MAJOR** | Backups dispersos duplican material sensible sin retención ni inventario | `[V]` `~/.pi/agent/backups/` (0755) con `auth.json` (0600) + `settings.json.bak` (0644) + `zshrc.bak` (0644); 8 `.bak` sueltos en `agent/` | Una rotación de credenciales incompleta deja claves vivas en disco. El `.bak` de `zshrc` en 0644 puede contener exports de tokens |
| **S4-T7** | **MINOR** | 45 transcripciones de sesión de agente dentro del árbol del paquete | `[V]` `src/pi-account-router/.omo/run-continuation/*.json` (gitignored) | Potencial acumulación de secretos de contexto en texto plano, sin cifrado ni barrido |

### 2.1 Anillo-0 · kernel — ¿autoridad única?

**Superficie que crea:** concentración en un único proceso de (a) evaluación de gates, (b) custodia de la clave de firma, (c) resolución de credenciales, (d) cabecera del journal de evidencia. Si el anillo-0 es la única autoridad y todo lo demás la consulta, **su compromiso es total e irreversible**: no queda nada por encima que pueda denegar.

| ID | Sev | Amenaza | Evidencia | Fail-closed hoy |
|---|---|---|---|---|
| **S4-K1** | **CRITICAL** | La clave privada de firma vive **dentro de la misma base de datos** que los datos que firma | `[V]` `pi-memory/src/memory-stack.ts:19-25`: `store.getMeta("memory.signer.privatePem")` / `store.setMeta(…)` | **No.** Quien puede editar la DB puede sustituir la clave y refirmar. La firma no prueba nada frente a ese escritor. Es exactamente el defecto D05 del dossier (`08-delta-recomendado.md`, §3 D05.4-5) y está confirmado en código |
| **S4-K2** | **CRITICAL** | El objeto firmable cubre solo 3 campos | `[V]` `pi-memory/src/memory-signer.ts:21-23`: `JSON.stringify([m.id, sha256(m.body), m.validFrom])` | **No.** `kind`, `scope`, `topicKey`, `entityKeys`, `title`, `summary`, `importance`, `state`, `validTo` quedan **fuera de la firma**. Cambiar `scope` permite sacar un registro del prefijo de tenant sin invalidar la firma; cambiar `importance`/`state` altera recuperación y validez impunemente |
| **S4-K3** | **MAJOR** | La firma se produce pero no se verifica en lectura | `[V]` `memory-control.ts:104` firma en `save()` y **devuelve** la firma al caller sin persistirla junto al registro; `verify()` (`:80-82`) solo se invoca en `rollback()` (`:221`) | **Parcial.** Solo el camino de rollback exige firma válida. La lectura normal (`get`, `search`, `recall`, `timeline`) no verifica nada, así que un registro alterado en el store se sirve como legítimo |
| **S4-K4** | **MAJOR** | `KeyStore` es volátil y su revocación no sobrevive al proceso; `keyId` se genera con `Math.random()` | `[V]` `pi-intermediate/src/keystore.ts:14-15` (`Map`/`Set` en memoria, sin persistencia), `:19` (`"key_" + Math.random().toString(36).slice(2,10)`) | **No.** `revoke()` solo añade a un `Set` en memoria: **reiniciar el proceso borra toda revocación**. Y `Math.random()` no es CSPRNG —un `keyId` predecible/colisionable es un identificador criptográfico débil |
| **S4-K5** | **MAJOR** | La cadena de hash del journal no tiene ancla externa | `[V]` `pi-intermediate/src/governance.ts:62-79`: `hash = sha256(prev + event)` y `lastHash()` lee `SELECT hash FROM journal ORDER BY rowid DESC LIMIT 1` de la misma DB | **No.** Un escritor con acceso a la DB puede truncar o reescribir la tabla y recalcular la cadena desde el punto elegido. Sin cabeza custodiada fuera del almacén, la cadena detecta corrupción accidental, no adulteración deliberada (dossier D05.5) |
| **S4-K6** | **MAJOR** | Redacción de secretos y detección de inyección son denylists de regex | `[V]` `governance.ts:15-21` (`SECRET_PATTERNS`, 5 patrones), `:23-30` (`INJECTION_PATTERNS`, 6 patrones en inglés), `:33` `detectInjection`, `:38` `redact` | **Débil.** `redact()` exige `[A-Za-z0-9._\-]{12,}` tras `key=`: un secreto más corto pasa intacto. Los 6 patrones de inyección se evaden parafraseando o cambiando de idioma. Es mitigación de ruido, no un control de seguridad, y no debe venderse como tal |
| **S4-K7** | **MAJOR** | El sandbox macOS por defecto es **deny-list**, no allow-list | `[V]` `pi-intermediate/src/sandbox.ts:325-338`: perfil seatbelt con `(allow default)` + denegaciones explícitas | **Parcial.** El comentario en `:96-99` explica honestamente por qué `(deny default)` rompe dyld/mach/sysctl —la razón es legítima—, pero el efecto es que **todo lo no enumerado está permitido**. Contraste: `srt` y `gondolin` sí son allow-only en red (`:147`, `:186-188`, `:250-252`) |
| **S4-K8** | **CRITICAL** | Las listas de deny-read del sandbox **no incluyen `~/.pi`**, que es donde viven las credenciales reales | `[V]` `sandbox.ts:149` (`srtSettings`) y `:325-327` (`seatbeltProfile`): `~/.ssh`, `~/.aws`, `~/.gnupg`, `~/.config/gcloud` — **ni `~/.pi` ni `~/.pi/agent/auth.json` ni `~/.pi/secrets/`** | **No.** Incluso con el sandbox activado, un comando en cuarentena puede leer `~/.pi/agent/auth.json`. La protección cubre las credenciales de *otros* ecosistemas y omite las propias del agente auditado |
| **S4-K9** | **MINOR** | Sandbox opt-in por variable de entorno | `[V]` `pi-memory/src/extension.ts:37`: `const sandboxRequired = process.env.PI_CORE_SANDBOX_ALL === "1"` | **No por defecto.** Sin la variable, `user_bash` (`:66-71`) no enruta por sandbox. El fallo *sí* bloquea cuando la variable está puesta y no hay proveedor (`:49`, `:69`) —correcto—, pero el estado por defecto es sin aislamiento |

**Qué debe conservar el anillo-0 para que un anillo superior comprometido no escale:**

1. **La clave de firma fuera del almacén que firma.** Material en el credential store del SO o en un fichero 0400 fuera de la DB; nunca `setMeta` en la misma base editable (cierra S4-K1).
2. **Un objeto firmable versionado y completo.** `scope`, `kind`, `state`, `importance`, `validTo`, `topicKey` y `entityKeys` dentro del payload firmado, con `signatureVersion` explícito y rechazo —no inferencia— cuando falta una firma requerida (cierra S4-K2/K3).
3. **Una cabecera de journal anclada fuera del almacén** (fichero append-only 0400 en otra ruta, o el credential store) y comparación al abrir/restaurar; cabeza menor que el ancla ⇒ cuarentena (cierra S4-K5).
4. **Revocación persistente y `keyId` derivado de la clave**, no de `Math.random()`: `key_<sha256(publicPem)[:16]>`, igual que ya hace `MemorySigner` en `memory-signer.ts:18` (cierra S4-K4).
5. **Denegación como única degradación**: conservar el patrón de `detectSandboxProvider` (`sandbox.ts:300-311`) y `supports()` —si la política no es representable, denegar, jamás ejecutar directo.
6. **Deny-read que incluya `~/.pi/**`** en todos los perfiles de sandbox (cierra S4-K8).
7. **Un mecanismo que verifique que el anillo-0 está realmente cargado** antes de aceptar ninguna operación gobernada. Hoy no existe nada que distinga «gates activos» de «gates presentes en el repo» —esa es precisamente la causa de S4-T1.

### 2.2 Anillo-1 · gateway — exposición MCP/OpenAPI de la memoria

**Superficie que crea:** `Gateway` (`pi-intermediate/src/gateway.ts:84`) deriva **desde las mismas rutas** un documento OpenAPI 3.1 (`:143-179`) y un conjunto de tools MCP (`:181-191`). Registrar una ruta publica simultáneamente una operación HTTP y una tool invocable por el modelo. Es una decisión de diseño elegante y **multiplica por dos la superficie de cada ruta nueva**.

| ID | Sev | Amenaza | Evidencia | Fail-closed hoy |
|---|---|---|---|---|
| **S4-G1** | **CRITICAL** | El gateway **no tiene ninguna autenticación ni autorización** | `[V]` `gateway.ts:113-139`: `handle()` lee `req.headers` pero **nunca comprueba ninguna credencial**; no existe ningún middleware de auth en la cadena. Los handlers de memoria ignoran el contexto: `memory-gateway.ts:22` y `:41` usan `(_ctx, body)` | **No.** Quien alcance el transporte ejecuta `recall`, `save`, `get`, `search`, `consolidate` sin identidad |
| **S4-G2** | **CRITICAL** | `get(id)` y `forget(id)` **no aplican ámbito de tenant** | `[V]` `memory-control.ts:136-137` (`get` → `this.backend.get(id)` directo) y `:162-163` (`forget` → `this.backend.invalidate(id)` directo). Contraste: `search()` (`:122-124`) y `timeline()` (`:159-160`) **sí** aplican `scopeOf()`. Expuesto por `memory-gateway.ts:63-70` (`GET /memory/:id`) y por MCP `memory_get`/`memory_forget` (`memory-mcp-server.ts:222`, `:236`) | **No.** Un ID válido de otro tenant se lee y se invalida. Es el defecto D02 del dossier, confirmado línea a línea |
| **S4-G3** | **CRITICAL** | El canal MCP expone volcado y restauración completos junto a las tools inocuas, sin separación de privilegio | `[V]` `memory-mcp-server.ts:242` (`rollback`), `:246-247` (`export` → `control.backend.exportAll()`), `:248-250` (`import` → `control.backend.importAll(records)`) | **No.** `export` ignora por completo el tenant (llama directo al backend). Un cliente MCP con acceso a `memory_save` tiene también exfiltración total y reescritura total |
| **S4-G4** | **MAJOR** | `import`/`export` y `save` aceptan `kind`/`importance` **suministrados por el caller** y la admisión los usa como señal de confianza | `[V]` `memory-mcp-server.ts:196-198` (`kind` y `importance` vienen de `params`); `memory-admission.ts:58-59` (`preference: 0.95`), `:66` (`VALUE_RE` incluye `policy`, `regla`, `prefer`, `always`, `never`), `:84` (peso 0,4 sobre `TYPE_PRIOR` + 0,4 sobre `VALUE_RE`) | **No.** Un caller no confiable se auto-certifica la admisión declarando `kind:"preference"` e `importance:1` y usando las palabras mágicas en el cuerpo. **Envenenamiento de memoria por autopuntuación** |
| **S4-G5** | **MAJOR** | Sin límite de tamaño de petición, sin rate limit, sin cuota en el gateway | `[V]` `gateway.ts:113-139` no inspecciona longitud de `body`; la única cuota existente está en `memory-cloud.ts:66-70` (backend cloud), no en el gateway ni en el backend local | **No.** `consolidate` (`memory-gateway.ts:87-95`) y `import` (`memory-mcp-server.ts:248`) son operaciones caras invocables sin límite |
| **S4-G6** | **MAJOR** | La clave de embeddings viaja en claro desde el config store | `[V]` `memory-stack.ts:121` (`cfg?.get("memory.embeddings.apiKey")`) → `memory-embeddings.ts:294` y `:389` (`headers.authorization = \`Bearer ${this.apiKey}\``); también `models.ts:192` y `remote.ts:48` | **No.** Un `apiKey` en claro persistido en configuración, en lugar de una referencia a env o al credential store |
| **S4-G7** | **MAJOR** | El embedder multi-endpoint envía el contenido de memoria a **todos** los endpoints antes de degradar | `[V]` `remote.ts:55-73`: `embedAsync` recorre `this.endpoints` en round-robin/failover y solo al agotarlos cae a `this.fallback.embed(text)` | **No.** Fail-open de confidencialidad: el texto de memoria sale hacia N destinos y el fallo se traga en silencio (`:70-72` `catch {}`) |
| **S4-G8** | **MAJOR** | El tenant de RLS se fija con `set_config(…, true)` —local a transacción— y `withTenant` restaura un valor de proceso, no de DB; `dropTenant` no tiene autorización | `[V]` `memory-cloud.ts:370-372` (`setGuc` con `true` = transaction-local), `:354-363` (`withTenant` guarda/restaura `this.currentTenant` en memoria), `:327-331` (`dropTenant` borra `memories` y `cloud_tenants` sin comprobación alguna) | **No.** Fuera de una transacción explícita el GUC no se aplica y la política `USING (tenant = current_setting('app.tenant', true))` (`:196`) evalúa vacío. `dropTenant` es destrucción multi-tenant sin gate |
| **S4-G9** | **MINOR** | `LIKE '%query%'` sin escapar comodines | `[V]` `memory-cloud.ts:96-101` | Parcial: el binding previene SQLi, pero `%` y `_` del caller actúan como comodines (ya señalado en D02: «sin comodines SQL inadvertidos») |
| **S4-G10** | **INFO** | **No existe ningún listener de red** | `[V]` grep `node:http|createServer|\.listen\(|Bun\.serve` sobre todo `src/` → **1 sola coincidencia**, y es un comentario en `openai-compat.ts:4` («llama.cpp server on :9003») | N/A — `Gateway.handle()` es en-proceso. **Esto es lo único que hoy hace no explotable S4-G1** |
| **S4-G11** | **INFO** | Lo que sí está bien en el gateway | `[V]` `memory-gateway.ts:26` (`{...r, untrusted: true}` en recall), `:57` (cuarentena → `ApiError("forbidden")`), `:58` (descarte por admisión → error explícito con razón); `gateway.ts:120-123` (validación de `requestSchema` antes del handler); `:127-133` (idempotencia en POST con header `idempotency-key` y flag `idempotent-replayed`); `:136-138` (errores normalizados con `traceId`) | Etiquetar el recall como `untrusted` y rechazar contenido en cuarentena con 403 es la dirección correcta |

**Qué debe conservar el anillo-1:** la derivación única ruta→OpenAPI→MCP (evita drift de contrato), la validación de schema previa al handler, la idempotencia por header y el marcado `untrusted` del recall. **Debe añadir** una capa de authN/authZ anterior a `find()`, un límite de body, rate limit por principal, y separar `export`/`import`/`rollback` a un perfil administrativo distinto del de las tools de lectura/escritura.

### 2.3 Anillo-2 · connections — credenciales de pools y OAuth

**Superficie que crea:** concentración de claves de terceros (pools de cuentas, pool You.com de 2 keys, OAuth de providers) y de los tokens que las acompañan, en el borde de salida a red.

| ID | Sev | Amenaza | Evidencia | Fail-closed hoy |
|---|---|---|---|---|
| **S4-C1** | **MAJOR** | `~/.pi/proxy/agnes-rotation.json` en **0644** | `[V]` 122 B, `-rw-r--r--`, mtime 2026-10-01T23:55, único fichero de `~/.pi/proxy/` | Estado de rotación de un proxy de inferencia world-readable. Si llegara a contener un token o un material de rotación, estaría expuesto; el permiso debe ser 0600 por defecto aunque hoy solo haya metadatos |
| **S4-C2** | **MAJOR** | Pool de 2 keys You.com con `bearerTokenStore: true` y tokens en el credential store del SO, pero la configuración del pool en 0644 | `[V]` `~/.pi/agent/mcp-adapter.json` (0644): `you-key-1` y `you-key-2`, ambos `auth: "bearer"`, `bearerTokenStore: true`, `headers["X-Allowed-Tools"] = you-search,you-contents,you-research,you-balance,you-discover` | **Aceptable en el diseño, no en el permiso.** Que el token viva en el keychain del SO y no en el JSON es **correcto**. Que `X-Allowed-Tools` acote el alcance por key es **correcto y bueno**. Pero el fichero que declara el pool, su URL y su alcance es 0644 |
| **S4-C3** | **MAJOR** | OAuth no soportado por el router, y el rechazo es correcto pero deja la gestión OAuth fuera de todo gate | `[V]` `credentials.ts:94-98`: `if (c.type !== "api_key") throw … "OAuth is unsupported"` | **Sí, fail-closed** —rechaza en lugar de improvisar. Consecuencia no cubierta: los flujos OAuth de Pi quedan fuera del modelo de autoridad del router y sin resolución auditada |
| **S4-C4** | **MAJOR** | Las credenciales resueltas viven en un `Map` en memoria del proceso y se comparan por valor para detectar grupos duplicados | `[V]` `credentials.ts:118-142` (`resolveAccounts`): `resolved.set(account.id, key)` y `groupsByKey.set(key, account.id)` usando **la clave en claro como llave de mapa** | Parcial. La comprobación de «misma clave en dos quota groups» (`:131-136`) es una buena defensa de configuración, pero exige mantener la clave en claro como clave de `Map` durante la vida del proceso, y la expone a cualquier volcado de heap |
| **S4-C5** | **MINOR** | `auth.json` se cachea en memoria por mtime | `[V]` `credentials.ts:29` (`authCache`), `:33-38` (`statAuth`), `:58` (`this.authCache = { mtimeMs, parsed }`) | Correcto como optimización (re-lectura por mtime, no por request). Amplía la ventana en que el JSON completo de credenciales reside en heap |
| **S4-C6** | **INFO** | Lo que sí está bien en connections | `[V]` `account-router.json` en 0600 **sin ningún secreto en claro** —solo referencias `credential.piProvider`; `account-router-accounts*.json` y `account-router-performance*.json` en 0600; `account-router-state/` en **0700** y su fichero de estado en 0600; `auth.json` y su backup en 0600/dirs 0700; `credentials.ts` read-only por diseño (`:22`) | La **política declarada es sólida**: referencias en lugar de valores, 0600/0700 donde toca, y ninguna ejecución de comandos de credencial. El problema no es el diseño de conexiones, son los permisos de lo que lo rodea |

**Qué debe conservar el anillo-2:** el modelo de **referencia** (`{env: NAME}` | `{piProvider: ID}`) en lugar de valor; la prohibición de claves respaldadas por comando (`credentials.ts:100-104`); el pin de `baseUrl` (`config.ts:88`); y el alcance por key vía `X-Allowed-Tools`.

### 2.4 Resumen fail-closed vs fail-open por gate existente

| Gate / mecanismo | Ubicación | Postura | Nota |
|---|---|---|---|
| `failClosed()` wrapper | `hard-gates.ts:75-82` | **fail-closed** ✅ | Devuelve `{allow:false}` si el gate lanza o devuelve forma inválida. Correcto |
| `gateBash` / `gateWritePath` / `gateToolCall` | `hard-gates.ts:55,63,68` | denylist de regex | Correcto en el wrapper, **débil en el contenido**: `rm -rf` se detecta por patrón, no por semántica. Y **no está cargado** (S4-T1) |
| `toolCallGate` / `userBashGate` | `pi-memory/src/hooks.ts:44-58` | **fail-closed** ✅ | `userBashGate` lanza, y el comentario en `extension.ts:65` confirma que un fallo del handler bloquea el comando. Bien diseñado —pero no cargado |
| `detectSandboxProvider` con preferencia | `sandbox.ts:300-311` | **fail-closed** ✅ | Nunca cae a un sandbox distinto del pedido |
| `SrtProvider/GondolinProvider.supports()` | `sandbox.ts:186-188`, `:250-252` | **fail-closed** ✅ | `network:true` ⇒ denegado, no degradado |
| `ExecutionGate.decide(quarantined)` | `sandbox.ts:367-371` | **fail-closed** ✅ | Cuarentena sin sandbox ⇒ `allowed:false` |
| `decodeState` / `corrupt()` | `file-state-store.ts:26-30` | **fail-closed** ✅ | Estado corrupto ⇒ parada, nunca reset de histórico de cuota |
| Lock comprometido / unlock fallido | `file-state-store.ts:238,243,257-260` | **fail-closed** ✅ | Nunca reporta éxito con lock comprometido o unlock fallido |
| `parseConfig` + `validateProviderContracts` | `config.ts:61-149`, `:176-197` | **fail-closed** ✅ | Zod + semántica cross-field + contrato de catálogo; solo para cuentas con `providerContract` opt-in |
| `PiCredentialResolver` (comando/OAuth) | `credentials.ts:94,100-104` | **fail-closed** ✅ | Rechaza en lugar de ejecutar |
| Cuota cloud `maxRecords` | `memory-cloud.ts:66-70` | **fail-closed** ✅ | Lanza sin tocar datos |
| Cuarentena por inyección en `save` | `memory-control.ts:88-95` | **fail-closed** ✅ | No persiste ni inyecta; 403 en el gateway (`memory-gateway.ts:57`) |
| Rollback sin firma válida | `memory-control.ts:221-225` | **fail-closed** ✅ | Rechaza y journaliza |
| Rollback con tenant sin `restoreScoped` / mismatch | `memory-control.ts:229-241` | **fail-closed** ✅ | Deniega en lugar de caer a la operación global |
| `get(id)` / `forget(id)` por tenant | `memory-control.ts:136,162` | **fail-OPEN** ❌ | Sin comprobación de ámbito (S4-G2) |
| Autenticación del gateway | `gateway.ts:113-139` | **fail-OPEN** ❌ | No existe (S4-G1) |
| `export` por tenant | `memory-mcp-server.ts:246-247` | **fail-OPEN** ❌ | `backend.exportAll()` directo, sin ámbito (S4-G3) |
| `dropTenant` | `memory-cloud.ts:327-331` | **fail-OPEN** ❌ | Sin autorización (S4-G8) |
| `redact` / `detectInjection` | `governance.ts:15-38` | **fail-OPEN** ❌ | Lo que no matchea la regex pasa sin marcar (S4-K6) |
| `MultiEndpointEmbedder.embedAsync` | `remote.ts:55-73` | **fail-OPEN** ❌ | `catch {}` por endpoint y degradación silenciosa tras enviar a todos (S4-G7) |
| Verificación de firma en lectura | `memory-control.ts:80-82` vs `:104` | **fail-OPEN** ❌ | Se firma al guardar, no se verifica al leer (S4-K3) |
| Deny-read del sandbox sobre `~/.pi` | `sandbox.ts:149`, `:325-327` | **fail-OPEN** ❌ | Omite las credenciales del propio agente (S4-K8) |
| **Carga efectiva de todo lo anterior** | `~/.pi/agent/settings.json` | **fail-OPEN** ❌ | **No cargado** (S4-T1) |

**Lectura de la tabla:** el repo tiene **16 mecanismos fail-closed correctos** y **10 caminos fail-open**. La calidad del diseño fail-closed es alta y consistente donde existe. El problema no es la postura ante el fallo: es **la cobertura** (lo que no está en la lista fail-closed) y **el cableado** (nada de ello está activo).

---

## 3 · Secretos y credenciales — política observada vs riesgos

### 3.1 Política observada (lo que Pi hace bien) `[V]`

1. **Referencias, nunca valores.** `account-router.json` (0600) contiene `credential: { piProvider: "…" }` para sus 4 cuentas. Cero claves en claro en configuración de routing.
2. **El material real en 0600 y el estado en 0700.** `auth.json` 0600 (3.997 B); `account-router-accounts.json`, `-accounts-verification.json`, `-performance.json`, `-performance-pilot.json`, `models.json`, `models-store.json`, `mcp-project-approvals.json` y los `.bak` de `account-router`/`models`, todos 0600. `account-router-state/` 0700 con su estado en 0600. El backup de `auth.json` está en dir 0700 con fichero 0600.
3. **Tokens MCP en el credential store del SO.** `mcp-adapter.json` declara `auth: "bearer"` + `bearerTokenStore: true` para `you-key-1`/`you-key-2`: **el token no está en el JSON**. Es la decisión correcta.
4. **Alcance por key.** Cada key You.com lleva `X-Allowed-Tools` con 5 tools enumeradas. Least privilege aplicado a nivel de credencial.
5. **El resolvedor no ejecuta nada.** `credentials.ts:22` + `:100-104`: ni comandos `!` ni refresh de OAuth. Cierra la clase «config que ejecuta código».
6. **Aprobaciones MCP ancladas a hash.** `mcp-project-approvals.json` (0600) con `projectRoot` + `serverName` + `definitionHash` + `approvedAt` (3 aprobaciones). Un cambio en la definición del servidor invalida la aprobación. **Este es el mejor control de gobernanza de toda la configuración viva.**
7. **Escritura atómica en 0600 con fsync de fichero y directorio** (`file-state-store.ts:229-247`).

### 3.2 Riesgos (lo que hay que mover o cifrar)

| # | Sev | Riesgo | Evidencia | Acción |
|---|---|---|---|---|
| **P1** | **CRITICAL** | `settings.json` en **0644** siendo la raíz de confianza que declara `packages`/`extensions`/`defaultProvider` | `[V]` `-rw-r--r--`, 606 B, mtime 2026-10-25T05:19 | **Mover a 0600** y añadir `integrity`/hash pin por paquete. Es el cambio de mayor ratio beneficio/coste de toda la auditoría |
| **P2** | **MAJOR** | `trust.json` en **0644** | `[V]` 247 B, 5 rutas → bool, mtime 2026-10-25T06:05 | 0600. Una decisión de confianza no debe ser world-readable ni reescribible sin rastro |
| **P3** | **MAJOR** | `capabilities.json` (200 KB) y `mcp-cache.json` (597 KB) en **0644** siendo entrada de routing/selección | `[V]` mtimes 2026-10-25T05:28 y 08:52 | 0600 **y** firma o `contentHash` verificado al cargar. El permiso solo mitiga lectura; la integridad es lo que falta |
| **P4** | **MAJOR** | `mcp-adapter.json` en **0644** declara URLs, alcance por key y la existencia del pool | `[V]` 716 B, mtime 2026-10-25T05:19; `.bak-20261024-you` también 0644 (212 B) | 0600. Los tokens ya están fuera (bien), pero el mapa de qué credenciales existen y a dónde apuntan no debe ser público |
| **P5** | **MAJOR** | `~/.pi/proxy/agnes-rotation.json` en **0644** | `[V]` 122 B, mtime 2026-10-01 | 0600 por defecto, contenga o no secretos hoy |
| **P6** | **MAJOR** | `backups/` en **0755** con `settings.json.bak` y `zshrc.bak` en **0644** | `[V]` `backups/` dir 0755; `zshrc.bak.20260928-120759` 2.215 B 0644 | `backups/` a 0700, contenidos a 0600. **Revisar el `.bak` de `zshrc` por exports de tokens** y eliminarlo si los tiene |
| **P7** | **MAJOR** | `apiKey` de embeddings en claro en el config store | `[V]` `memory-stack.ts:121` → `memory-embeddings.ts:294,389`, `models.ts:192`, `remote.ts:48` | Sustituir por referencia (`env`/`envKey`) y resolver en el borde, igual que hace el router con `credential.piProvider` |
| **P8** | **MAJOR** | Clave privada de firma de memoria dentro de la DB que protege | `[V]` `memory-stack.ts:19-25` | Fuera de la DB: credential store del SO o fichero 0400 en ruta distinta (dossier D05.4) |
| **P9** | **MAJOR** | `~/.pi` ausente del deny-read de todos los perfiles de sandbox | `[V]` `sandbox.ts:149`, `:325-327` | Añadir `~/.pi` (y en particular `~/.pi/agent/auth.json`, `~/.pi/secrets/`) a `denyRead`/`readDenies` |
| **P10** | **MINOR** | `~/.pi/agent/logs/` en **0775** y `.err.log` en 0644; `mcp.log` (6.191 B) y `crashes.json` (7.564 B) en 0644 | `[V]` mtimes 2026-10-17 y 2026-10-25T08:54 | 0750/0640 o 0600. Los logs de MCP y de crashes son el lugar clásico donde acaba un token volcado en un mensaje de error |
| **P11** | **MINOR** | `.DS_Store` en `~/.pi/`, `~/.pi/agent/`, `~/.pi/secrets/`, `account-router-state/`, `backups/` | `[V]` 6.148–8.196 B, varios mtimes | Revelan estructura y nombres de fichero en directorios que deberían ser opacos. `~/.pi/secrets/.DS_Store` es particularmente inadecuado |
| **P12** | **MINOR** | `.tmp` huérfano de escritura atómica en el state | `[V]` `account-router-state/…json.d656e6f5-….tmp`, 0600, 2026-10-19 | Barrido de `*.tmp` al abrir el store |
| **P13** | **INFO** | `~/.pi/secrets/vault/` contiene **solo** `server.log` —ningún material de vault | `[V]` `find ~/.pi/secrets` → `vault/`, `vault/server.log` | La ruta sugiere un vault que no existe. O se pobla correctamente o se elimina para no dar falsa sensación de custodia |

### 3.3 Qué es aceptable tal como está

- `auth.json` 0600, su backup en dir 0700/fichero 0600, `account-router-state/` 0700, `account-router*.json` y `models*.json` 0600: **correcto, no tocar**.
- Tokens You.com en el credential store del SO con `bearerTokenStore: true` y alcance por `X-Allowed-Tools`: **correcto y ejemplar**.
- `mcp-project-approvals.json` 0600 con `definitionHash`: **correcto**; extender el mismo patrón a `packages`.
- `you-official` con `disabled: true` y `api` con `disabled: true` en `mcp-adapter.json`: desactivación explícita, correcta.
- Cache de `auth.json` por mtime (`credentials.ts:29-58`): optimización legítima, riesgo de heap aceptable y documentado.

### 3.4 Cómo debe tratar el port a Qwen Code las credenciales

**Regla única: ninguna credencial en claro en ningún fichero de configuración.** Concretamente:

1. **Solo `env` / `envKey` en MCP y providers.** Qwen Code soporta referenciar variables de entorno en la configuración de MCP; usar exclusivamente esa forma. El valor resuelto en el entorno del proceso, nunca literal en `settings.json`, `.mcp.json` ni `mcp-adapter.json`.
2. **El modelo del router es el que hay que portar, no el del adaptador MCP.** `CredentialReference = { env: string } | { piProvider: string }` (`pi-account-router/src/domain/types.ts:12`) es exactamente el patrón correcto: la config nombra la credencial, un resolvedor de solo lectura la materializa, y el resolvedor **no ejecuta nada** (`credentials.ts:22`). Qwen Code debe recibir nombres, no secretos.
3. **Rechazo explícito de claves respaldadas por comando.** Portar la prohibición de `credentials.ts:100-104` (prefijo `!`). Una config que ejecuta un comando para obtener una clave es ejecución de código desde la config.
4. **Prohibido copiar `auth.json`, los `.bak`, `account-router-accounts*.json`, `~/.pi/secrets/**` y cualquier token You.com** al repo de Qwen Code ni a este subfolder de auditoría. Si una integración los necesita, se referencia por `envKey` y el material sigue donde está.
5. **Ficheros de configuración de Qwen Code en 0600** desde el primer commit, no como remediación posterior. Incluir `settings.json`, cualquier `.mcp.json`, y los equivalentes de `trust.json`/`mcp-project-approvals.json`.
6. **Los logs en 0600/0640 y con redacción activa.** `governance.redact()` (`governance.ts:36-40`) es mejor que nada pero es una denylist (S4-K6): en Qwen Code la redacción de logs debe ser allow-list de campos publicables, no deny-list de patrones secretos.
7. **Ningún `apiKey` de embeddings/reranker en el config store** (S4-G6/P7). Referencia a env, resuelta en el borde.

---

## 4 · Gobernanza y proveniencia

### 4.1 `provenance.ts` — primitivas correctas, política ausente

`pi-intermediate/src/provenance.ts` (41 líneas) es criptográficamente correcto y no tiene hallazgos propios:
- `sha256` sobre UTF-8 con `createHash` (`:7-9`).
- `generateKeyPair` con **ed25519** (`:17-23`), exportación PKCS8/SPKI en PEM. Elección moderna y adecuada.
- `signContent`/`verifyContent` con `sign(null, …)`/`verify(null, …)` —el `null` es correcto para ed25519 (no admite parámetros de digest)— y `verifyContent` **envuelve en try/catch devolviendo `false`** (`:31-37`). Fail-closed ante clave o firma malformadas. ✅
- `canonicalOf(name, family, description)` (`:40-42`) —huella canónica por `JSON.stringify` de array.

**El problema no está en las primitivas sino en lo que se firma y dónde vive la clave:**
- `canonicalOf` cubre `name`/`family`/`description`; `MemorySigner.canonical` (`memory-signer.ts:21-23`) cubre `[id, sha256(body), validFrom]`. **Ninguno de los dos es una canonicalización de objeto completo**: no hay orden estable de claves, no hay separador de campos no ambiguo más allá del array JSON, no hay `signatureVersion`, no hay dominio/contexto (un string firmado para un propósito es válido para cualquier otro que use el mismo esquema).
- `JSON.stringify` de un array es aceptable como canonicalización *si y solo si* los campos son escalares y el orden es fijo —que lo es aquí—, pero **no se extiende** cuando se añadan campos: no hay mecanismo de versión que obligue a rechazar firmas antiguas (S4-K2).
- La clave vive en la DB firmada (S4-K1) y la verificación solo ocurre en rollback (S4-K3).

**Conclusión de proveniencia:** hay firma, no hay **garantía de proveniencia**. Una firma que (a) usa una clave que el firmante puede sustituir, (b) cubre 3 de 12+ campos y (c) no se comprueba en lectura, certifica «alguien con acceso a la DB generó este hash en algún momento». Eso es un checksum con pasos extra.

### 4.2 Firma/replay del dossier D01-D11 — contraste contra el código

El dossier `src/pi-account-router/docs/audit-2026-10-18/arquitectura-ecosistema/08-delta-recomendado.md` declara seis defectos de integridad. **Esta auditoría los verifica independientemente en código y los seis se sostienen:**

| Delta | Afirmación del dossier | Verificación independiente `[V]` |
|---|---|---|
| **D01** | «`M/memory-gateway.ts:42` llama a Control; `M/hooks.ts:100` reconstruye vía Control; `M/plane.ts:74` escribe directamente en Store» — caminos laterales sin dueño único de escritura | **Confirmado.** `memory-gateway.ts:41-58` (`control.save`), `memory-control.ts:84-107` (`backend.save` directo en `save()` y en `mergeInto()` `:110-121`), y `reconstructSession` (`memory-control.ts:277-303`) entra por `ctl.save` —pero `rollback()` (`:213-249`) llama a `backend.restore`/`restoreScoped` **saltándose admisión, firma y journal de la mutación** |
| **D02** | «search compone tenant, pero get/forget por ID delegan sin comprobarlo (`M/memory-control.ts:136–163`)» | **Confirmado exactamente en esas líneas**: `get` en `:136-137`, `forget` en `:162-163`, ambos sin `scopeOf()`; `search` (`:122-124`) y `timeline` (`:159-160`) sí lo aplican. Añado: `export` MCP (`memory-mcp-server.ts:246-247`) también carece de ámbito |
| **D05** | «La clave de memoria reside por defecto en la misma DB (`M/memory-stack.ts:19–25`)»; campos fuera del hash; firma eliminable | **Confirmado**: `memory-stack.ts:19-25` (`getMeta`/`setMeta` del PEM privado). Añado la causa raíz que el dossier no explicita: `memory-signer.ts:21-23` firma solo `[id, sha256(body), validFrom]`, dejando `scope`/`state`/`importance`/`kind` fuera |
| **D04** | «`M/fabric.ts:208–227` interpreta saves/forgets parciales y hace `replaceAll`» — replay destructivo sin completitud verificada | **Coherente con lo observado en el plano de control**: `rollback()` (`memory-control.ts:213-249`) sí verifica firma y tenant, pero restaura un snapshot completo (`backend.restore(snap)` en `:246`) sin comprobar que el snapshot cubra todos los cambios posteriores al checkpoint. No se auditó `fabric.ts:208-227` línea a línea en este pase → ver §6 Lagunas |
| **D09** | «El adapter de memoria tiene `user_bash` y sandbox opt-in: no son equivalentes» | **Confirmado**: `pi-memory/src/extension.ts:37` (`PI_CORE_SANDBOX_ALL === "1"`), `:56` (`tool_call`), `:66-71` (`user_bash` con sandbox solo si la variable está puesta) |
| **D10** | «Bwrap no monta el workdir solicitado» | **Confirmado por lectura**: `sandbox.ts:74-88` (`BwrapProvider.invocation`) hace `--ro-bind` de `/usr`, `/bin`, `/lib`, `/lib64`, `--proc`, `--dev`, `--tmpfs /tmp` —**y nunca monta `opts.workdir`**. Contraste: `gondolinArgs` (`:238-252`) sí monta `workdir:workdir`. El trabajo sandboxeado con bwrap no puede acceder a sus propias entradas/salidas |

**Valoración de gobernanza del dossier:** es inusualmente honesto. Distingue explícitamente contrafactuales locales de código arreglado («*Las referencias correctivas ejecutadas son contrafactuales locales, no código de producto ya arreglado*», §0), declara el límite de cobertura (§6), retira cinco de sus propias recomendaciones anteriores (§4), y prohíbe expresamente tocar secretos («*No rotar/revocar/reemplazar claves You.com ni acceder a sus valores como parte del cambio*», D05). **Esa cláusula se cumple en esta auditoría.** El plan de §5 ordena P0-datos → P0-consistencia → P0-evidencia → P0-gobierno → P1, que es el orden correcto.

**Lo que el dossier no dice y esta auditoría añade:** el dossier analiza la arquitectura como si estuviera desplegada. **No está.** S4-T1 (capa de gobernanza no cargada en `settings.json`) es anterior a D01-D11: no tiene sentido cerrar caminos laterales de escritura en una extensión que el agente vivo no carga. Debe ser el **paso 0 del plan de §5**.

### 4.3 El gateway de memoria expuesto — autenticación hoy y requisitos

**Autenticación hoy: ninguna.** `[V]`
- `gateway.ts:113-139`: `handle()` extrae `traceId`, hace `stripBase`, `find`, valida `requestSchema` si existe, construye `RouteContext` con `headers`, aplica idempotencia por `idempotency-key`, invoca el handler y mapea errores. **No hay ni una línea que examine una credencial.**
- Los únicos headers que se leen son `idempotency-key`/`Idempotency-Key` (`:127`). Los de salida son `x-trace-id` (`:115`) e `idempotent-replayed` (`:135`).
- No hay CORS, no hay comprobación de `Origin`, no hay allow-list de hosts, no hay mTLS, no hay firma de petición, no hay replay protection a nivel de transporte (la `IdempotencyStore` de `:86` deduplica por key del cliente, lo cual no es anti-replay: un atacante que reenvíe con la misma key obtiene la respuesta cacheada, y sin key obtiene una ejecución nueva).
- `memory-gateway.ts`: los cuatro handlers con body usan `(_ctx, body)` —**el contexto se descarta**. Ninguna ruta tiene un principal.
- `memory-mcp-server.ts`: el transporte es stdio (`serveMemoryMcpStdio`, `:271-303`), donde la frontera de autenticación es el propio proceso y el pipe. Eso es **aceptable para stdio** y es el único transporte implementado. `handle()` (`:132-142`) no autentica nada, lo cual es coherente con stdio e **inaceptable en cuanto exista otro transporte**.
- **Mitigante decisivo hoy:** no existe listener de red (§2.2, S4-G10). `Gateway.handle()` es una función en-proceso. La exposición es potencial, no actual.

**Requisitos antes de exponer fuera de loopback** —todos obligatorios, en este orden:

1. **No exponer. Punto de partida.** Mientras S4-G1/G2/G3/G8 estén abiertos, la única postura segura es proceso-en-proceso o stdio. Esta es la recomendación de esta auditoría.
2. **AuthN en el borde, anterior a `find()`.** Un middleware en `Gateway.handle()` antes de `gateway.ts:118`. Bearer token de alta entropía del credential store del SO, o mTLS cliente. **Comparación en tiempo constante** (`crypto.timingSafeEqual`), nunca `===`.
3. **AuthZ por operación, con un `principal` en `RouteContext`.** `RouteContext` (`gateway.ts:30-35`) ya lleva `headers` y `traceId`; añadir `principal` poblado **solo por el middleware**, nunca desde el body (el dossier D02 lo exige: «*No aceptar tenant/rol del cuerpo de la petición como autoridad*»). Los handlers deben dejar de usar `_ctx`.
4. **Separar el perfil administrativo.** `export`, `import`, `rollback`, `consolidate`, `forgetSalience`, `stats` (`memory-mcp-server.ts:241-250`) en un scope distinto y por defecto **no publicado** por `toMcpTools()` (`gateway.ts:181-191`). Hoy una tool MCP inocua y un volcado total comparten canal.
5. **Cerrar el ámbito en el puerto de almacenamiento, no en el handler.** D02: construir un backend acotado al principal del contexto confiable, y aplicarlo a `get`, `forget`, `exportAll`, `snapshot`, `restore`, `importAll` y mantenimiento. `CloudBackend` ya pone `tenant = ?` en cada consulta (`memory-cloud.ts`) —el backend local y `MemoryControl.get/forget` deben hacer lo equivalente.
6. **Anti-replay real.** Nonce + timestamp firmado por petición, ventana de aceptación acotada y store de nonces usado una vez. La `IdempotencyStore` actual no cumple esta función.
7. **Límites de recurso.** Tamaño máximo de body, límite de `records[]` en `import`, límite de `limit` en `search`/`timeline`/`nearest` (`memory-control.ts:122-135,159-160`; hoy `opts?.limit ?? 20` y `?? 50` son defaults, no techos), rate limit por principal, y timeout por handler.
8. **CORS cerrado por defecto** y validación de `Origin`/`Host` si llega a haber HTTP; rechazo de cualquier bind a algo distinto de `127.0.0.1`/`::1` salvo configuración explícita y firmada.
9. **Fijar el GUC de RLS dentro de una transacción explícita.** `set_config('app.tenant', ?, true)` es transaction-local (`memory-cloud.ts:370-372`); sin `BEGIN` la política de `:196` evalúa vacío. Y `withTenant` (`:354-363`) debe restaurar el valor de la DB, no un campo en memoria.
10. **Autorizar `dropTenant`** (`memory-cloud.ts:327-331`) o eliminarlo de la superficie expuesta.
11. **Auditar el propio gateway.** `Tracer` (`gateway.ts:104-108`, `:134`) hoy registra `operationId` con `0, 0` —tokens sin atribuir. El journal hash-chained de `governance.ts:62-79` es el destino correcto para las decisiones de authZ, **con ancla externa** (S4-K5).
12. **Firmar y verificar las respuestas de recall** si cruzan frontera de confianza, y mantener el marcado `untrusted: true` (`memory-gateway.ts:26`) —que es correcto y debe conservarse.
13. **Pruebas de seguridad separadas por canal** (D09): `tool_call`, `user_bash`, MCP, HTTP, anidados y subagentes, cada uno con su propia prueba de denegación. Una prueba de uno no acredita otro.

---

## 5 · Lista roja — qué NO debe portarse a Qwen Code ni replicarse en los anillos

Ordenada por severidad. El primer elemento es el más grave.

### 🔴 RL-1 · Cargar extensiones o paquetes por ruta relativa a un árbol de trabajo mutable, declarado en un fichero de configuración world-readable
**Qué es:** `~/.pi/agent/settings.json` (**0644**) → `packages[1] = ../../Code/PI-agent/src/pi-account-router`. `[V]`
**Razón:** Es el vector de escalada más directo de todo el sistema. Combina tres defectos: la raíz de confianza es legible y reescribible por cualquier proceso del usuario; la resolución es por **ruta**, no por identidad (sin versión, sin `integrity`, sin hash, sin pin de commit); y el destino es un árbol de trabajo con **8 ficheros dirty** (manifiesto §3.1 de `00-ALCANCE-Y-METODO.md`), es decir, activamente editado. Cualquier proceso que corra como `ruben` obtiene ejecución de código dentro del agente en el siguiente arranque, sin dejar rastro. **En Qwen Code:** los paquetes y extensiones se resuelven por identidad verificable y la configuración que los declara va en 0600. Nunca una ruta relativa a un directorio de desarrollo. Nunca un fichero 0644 como raíz de confianza. Ironía útil: `mcp-project-approvals.json` ya demuestra que Pi sabe anclar aprobaciones por `definitionHash` —el patrón existe y simplemente no se aplica a `packages`.

### 🔴 RL-2 · Almacenar la clave privada de firma dentro del mismo almacén que los datos firmados
**Qué es:** `pi-memory/src/memory-stack.ts:19-25` — `store.getMeta/setMeta("memory.signer.privatePem")`. `[V]`
**Razón:** Anula la firma por construcción. Quien puede escribir en la DB puede sustituir la clave y refirmar todo el histórico de forma indistinguible. No existe modelo de amenaza en el que esto proteja algo: la firma solo sirve contra un adversario **sin** acceso de escritura al almacén de claves. **En Qwen Code y en el anillo-0:** material de firma en el credential store del SO o en fichero 0400 en ruta independiente, con la pública separada y verificable.

### 🔴 RL-3 · Firmar una fracción del objeto y tratar la firma como garantía del conjunto
**Qué es:** `pi-memory/src/memory-signer.ts:21-23` — `JSON.stringify([m.id, sha256(m.body), m.validFrom])`. `[V]`
**Razón:** `scope`, `kind`, `state`, `importance`, `validTo`, `topicKey`, `entityKeys`, `title` y `summary` quedan fuera. Cambiar `scope` saca un registro del prefijo de tenant; cambiar `state`/`importance` altera validez y orden de recuperación; cambiar `validTo` reescribe la bitemporalidad. **Todo con firma válida.** Es peor que no firmar: produce una sensación de integridad que invita a delegar decisiones en ella. **En Qwen Code:** objeto firmable versionado y completo, o nada. Y rechazar explícitamente una firma ausente cuando el perfil la exige —no inferir validez (dossier D05.2).

### 🔴 RL-4 · Un `KeyStore` cuya revocación vive solo en memoria y cuyos identificadores salen de `Math.random()`
**Qué es:** `pi-intermediate/src/keystore.ts:14-15` (`Map`/`Set` sin persistencia), `:19` (`"key_" + Math.random().toString(36).slice(2, 10)`). `[V]`
**Razón:** Dos fallos independientes. (a) `revoke()` añade a un `Set` en memoria: **reiniciar el proceso resucita todas las claves revocadas**. Una revocación que no sobrevive al reinicio no es revocación. (b) `Math.random()` no es CSPRNG; un identificador de clave predecible o colisionable permite suplantar una entrada del mapa. **En Qwen Code:** revocación persistente y firmada, y `keyId` derivado de la clave —`mem_${sha256(publicPem).slice(0,10)}`, que es exactamente lo que ya hace `MemorySigner` en `memory-signer.ts:18`. El patrón correcto existe en el mismo repo.

### 🔴 RL-5 · Deny-lists de regex como control de redacción de secretos y de detección de inyección
**Qué es:** `pi-intermediate/src/governance.ts:15-21` (5 patrones de secreto), `:23-30` (6 patrones de inyección en inglés), `:33` `detectInjection`, `:38` `redact`. `[V]`
**Razón:** `redact()` exige `[A-Za-z0-9._\-]{12,}` tras `key=`/`token=`: un secreto de 11 caracteres, uno en base64 con `+`/`/`/`=`, o uno multilinea pasan intactos. Los 6 patrones de inyección se evaden parafraseando, traduciendo o insertando caracteres. Y `detectInjection` devuelve un booleano que **no distingue** «comprobado y limpio» de «no reconocido». **En Qwen Code:** la redacción debe ser allow-list de campos publicables (qué *puede* salir), no deny-list de patrones secretos (qué *no debe*). Y el resultado de un detector de inyección debe ser un nivel de confianza, nunca un booleano que un consumidor trate como certificado. Como mitigación de ruido en logs, el código actual es aceptable; como control de seguridad, no debe portarse con ese nombre.

### 🔴 RL-6 · Exponer volcado/restauración/borrado total en el mismo canal y con el mismo privilegio que las tools de lectura
**Qué es:** `pi-memory/src/memory-mcp-server.ts:241-250` — `rollback`, `stats`, `export` (`backend.exportAll()`, **sin ámbito de tenant**), `import` (`backend.importAll(records)`), junto a `memory_save`/`memory_search`/`memory_get`. `[V]`
**Razón:** Un cliente MCP al que se le concede «guardar y buscar recuerdos» recibe de facto exfiltración completa del almacén y reescritura completa del mismo. `export` ni siquiera compone el tenant. Es la violación más clara de least privilege del repo, y es estructural: el `switch` de `callMemoryMethod` no distingue perfiles. **En Qwen Code:** operaciones destructivas y de volcado en un perfil administrativo separado, no publicado por defecto en `tools/list`, y con ámbito forzado en el puerto de almacenamiento.

### 🔴 RL-7 · Puntuación de admisión alimentada por campos que suministra el propio caller
**Qué es:** `pi-memory/src/memory-admission.ts:58-59` (`preference: 0.95`), `:66` (`VALUE_RE` con `policy`, `regla`, `prefer`, `always`, `never`, `decid`), `:84` (0,4·`TYPE_PRIOR[kind]` + 0,4·`VALUE_RE` + 0,2·`importance`); entrada desde `memory-mcp-server.ts:196-198`. `[V]`
**Razón:** `kind` e `importance` son parámetros de la petición. Un caller no confiable declara `kind:"preference"`, `importance:1` y escribe «policy: always …» en el cuerpo, y la admisión le puntúa por encima del umbral `persist: 0.5` **por sí sola**. El sistema de admisión se convierte en un trámite que el atacante aprueba rellenando el formulario. Es envenenamiento de memoria persistente: lo que se admita hoy se inyectará en el contexto de sesiones futuras como recuerdo propio del proyecto. **En Qwen Code:** `kind`/`importance` los determina el sistema que ingesta, según el canal y la fuente verificada, nunca el payload. Y el umbral de admisión no debe depender de ningún campo declarado por el sujeto admitido.

### 🔴 RL-8 · Perfiles de sandbox que protegen `~/.ssh`, `~/.aws`, `~/.gnupg` y `~/.config/gcloud` pero no `~/.pi`
**Qué es:** `pi-intermediate/src/sandbox.ts:149` (`srtSettings.denyRead`) y `:325-327` (`seatbeltProfile.readDenies`). `[V]`
**Razón:** La lista se copió de un supuesto estándar de ecosistemas y no se adaptó al agente que la usa. Las credenciales que de verdad están en juego —`~/.pi/agent/auth.json` (3.997 B, 0600), `account-router-accounts*.json`, `~/.pi/secrets/`— quedan **fuera** de toda denegación de lectura. Con el sandbox activado, un comando en cuarentena puede leerlas igualmente. Un control que protege todo menos lo que importa es peor que ningún control, porque genera la confianza que impide añadir el control real. **En Qwen Code:** el deny-read se deriva del inventario real de secretos del propio sistema, no de una plantilla.

### 🔴 RL-9 · Un proveedor de sandbox que no monta el directorio de trabajo que la política declara
**Qué es:** `pi-intermediate/src/sandbox.ts:74-88` (`BwrapProvider.invocation`) — `--ro-bind` de `/usr`, `/bin`, `/lib`, `/lib64`, `--proc`, `--dev`, `--tmpfs /tmp`, y **ningún bind de `opts.workdir`**. Contraste con `gondolinArgs` (`:238-252`), que sí hace `--mount-hostfs workdir:workdir[:ro]`. `[V]`
**Razón:** Confirma el defecto V09/D10 del dossier por lectura directa. El trabajo válido no puede acceder a sus entradas ni escribir sus salidas, así que en la práctica **el proveedor se abandona o se desactiva** —que es exactamente cómo un control de seguridad acaba en `PI_CORE_SANDBOX_ALL` sin fijar. Un sandbox que no funciona para el caso de uso legítimo no se endurece: se apaga. **En Qwen Code:** cada proveedor debe representar de verdad `cwd`/mounts/readOnly/red y devolver *no soportado* si no puede. Backend ausente o política no representable ⇒ denegar, jamás ejecutar directo.

### 🔴 RL-10 · Evidencia de cumplimiento de gates que no está en control de versiones
**Qué es:** `src/pi-account-router/.gitignore:13-14` excluye `.probe-*.ts`/`.probe-*.mjs`; 14 probes en el árbol; `git ls-files` solo lista `scripts/live-account-probe.extension.ts`. El comentario del `.gitignore` declara que los resultados se transcriben en `tasks.md`. `[V]`
**Razón:** G0-G8 quedan acreditados únicamente por transcripción. Una transcripción no es ejecutable, no es revisable, no detecta regresión y no distingue una medición de una intención. Para cualquier auditor —interno o externo— el estado correcto de esa afirmación es `sin-verificar`, que es justo lo que `prompts/auditoria-dev.md` manda marcar. **En Qwen Code:** si un gate es un requisito de seguridad, su prueba es código versionado y ejecutable en CI. Una política de «no regression suites in the house» (E-020) es legítima como estilo de desarrollo, pero **no puede sostener una afirmación de seguridad**.

### 🔴 RL-11 · Guardrails de seguridad expresados en prosa dentro de un prompt
**Qué es:** `~/.pi/agent/prompts/auditoria-dev.md` (0644): «*El pase de auditoría es read-only: no modificar código ni specs*», «*Prohibido afirmar sin evidencia ejecutable o localizada*». `[V]`
**Razón:** Son instrucciones excelentes y esta auditoría las sigue. Pero son **texto dirigido a un modelo**, en un fichero world-readable y reescribible sin rastro, cuya eficacia depende de que el modelo decida obedecer. Un control que se puede desactivar editando un `.md` en 0644 no es un control. **En Qwen Code:** lo que deba ser invariante se implementa como mecanismo (hook, gate, permiso de herramienta, sandbox); el prompt documenta el mecanismo, no lo sustituye.

### 🔴 RL-12 · Backups ad-hoc dispersos que duplican material sensible sin inventario ni retención
**Qué es:** `~/.pi/agent/backups/` (**0755**) con `auth.json` (0600 en dir 0700), `settings.json.bak` (0644) y `zshrc.bak.20260928-120759` (0644, 2.215 B); más 8 `.bak` sueltos en `~/.pi/agent/` (`account-router.json.bak-*` ×2, `models.json.bak-*` ×3, `settings.json.bak-*` ×2, `capabilities.json.bak-tuios`, `mcp-adapter.json.bak-*`). `[V]`
**Razón:** Dos copias de `auth.json` y cinco de configuración en rutas y mtimes distintos, ninguna inventariada, firmada ni sujeta a caducidad. Una rotación de credenciales que no las conozca deja material vivo indefinidamente. El `.bak` de `zshrc` en 0644 dentro del árbol del agente es el caso peor: los perfiles de shell exportan tokens, y ese fichero es legible por cualquier usuario local. **En Qwen Code:** copias de seguridad bajo una ruta única 0700, con inventario, integridad y caducidad; y ningún backup de perfil de shell dentro del árbol del agente.

### 🔴 RL-13 · Transcripciones de sesión de agente acumuladas dentro del árbol de un paquete
**Qué es:** `src/pi-account-router/.omo/run-continuation/*.json` — **45 ficheros** gitignored en el directorio del paquete; más `.omo/drafts/`, `.omo/plans/` y `.tmp-dbg-g5-oyocty/e.json`. `[V]`
**Razón:** Las transcripciones de sesión contienen lo que pasó por el contexto: rutas, decisiones, y potencialmente secretos volcados en una salida de herramienta. Están fuera de VCS (correcto) pero sin cifrar, sin inventariar y sin barrido, en un directorio que se empaqueta. **En Qwen Code:** artefactos de sesión fuera del árbol de código, en una ruta 0700 dedicada, con retención definida.

### 🔴 RL-14 · `apiKey` en claro persistido en un config store
**Qué es:** `pi-memory/src/memory-stack.ts:121` (`cfg?.get("memory.embeddings.apiKey")`) → `memory-embeddings.ts:294` y `:389`, `models.ts:192`, `remote.ts:48` (`headers.authorization = \`Bearer ${…}\``). `[V]`
**Razón:** Contradice la política que el propio Pi aplica en routing (referencias `piProvider`/`env`, nunca valores). Un secreto en claro en configuración acaba en backups, en snapshots, en logs de arranque y en diffs. **En Qwen Code:** solo `env`/`envKey`, resuelto en el borde. Ver §3.4.

### 🔴 RL-15 · Degradación silenciosa de un proveedor remoto tras enviar el contenido a todos los endpoints
**Qué es:** `pi-memory/src/remote.ts:55-73` (`MultiEndpointEmbedder.embedAsync`): recorre los N endpoints, con `catch {}` por intento (`:70-72`), y solo al agotarlos cae a `this.fallback.embed(text)`. `[V]`
**Razón:** Dos problemas. (a) Confidencialidad: el texto de memoria se envía a **cada** endpoint de la lista antes de degradar —si la lista tiene endpoints de confianza distinta, el contenido ya salió. (b) Observabilidad: el fallo se traga sin journalizar, así que la degradación a `HashingEmbedder` (que no es semántica real) es invisible. El dossier D08 ya avisa: «*Si no hay embeddings reales, declarar hashing/fallback, no venderlo como semántica real*». **En Qwen Code:** failover con endpoints del mismo nivel de confianza declarado, fallo journalizado, y degradación **anunciada** al consumidor.

---

## 6 · Lagunas

Lo que esta auditoría **no** ha verificado, y que por tanto no debe darse por cierto en ninguno de los dos sentidos:

1. **`fabric.ts:208-227` no se auditó línea a línea.** La afirmación D04 (replay con `replaceAll` que borra records de gateway y reactiva revisiones invalidadas) se reporta como coherente con lo observado en el plano de control (`memory-control.ts:213-249`), pero **no se confirmó en `fabric.ts`**. Es la laguna más relevante del pase: D04 es P0 en el plan del dossier.
2. **Los contrafactuales V01-V13 del dossier no se re-ejecutaron.** Régimen de solo lectura estricta y prohibición de ejecutar builds/tests/servidores (`00-ALCANCE-Y-METODO.md` §2.5). Se verificó el código que los afirma, no las ejecuciones. Los seis deltas contrastados (D01, D02, D04-parcial, D05, D09, D10) se confirmaron **por lectura**.
3. **Las 14 `.probe-*` no se leyeron ni ejecutaron.** El estado de G0-G8 sigue siendo `sin-verificar` por construcción (RL-10). No se afirma aquí que los gates fallen ni que pasen: se afirma que **no hay evidencia versionada que permita saberlo**.
4. **No se verificó el comportamiento real del host Pi.** No se ejecutó Pi, así que S4-T1 se basa en la configuración declarada (`settings.json` → `packages`/`extensions`) y en la ausencia de referencias en `~/.pi/agent/{extensions,scripts,profiles}/`. **Queda sin comprobar** si el host Pi tiene algún mecanismo de autodescubrimiento de extensiones que cargue `pi-memory`/`pi-intermediate` por otra vía (convención de directorios, registro npm global, alias `-builtin:*`). Si existiera, S4-T1 se reduciría de BLOCKER. **Es la única comprobación que puede cambiar materialmente el veredicto central** y debe hacerse antes de actuar sobre él.
5. **`pi-mcp-adapter` (npm) no se auditó.** Es el segundo paquete cargado en la configuración viva y gestiona el pool You.com de 2 keys, `bearerTokenStore` y `X-Allowed-Tools`. Su código no está en `/Users/ruben/Code/PI-agent`. La superficie de connections (§2.3) está por tanto **incompleta**: se auditó la configuración y el resolvedor del router, no el adaptador que realmente habla con You.com.
6. **`-builtin:mcp` del host no se auditó.** Tercer elemento cargado en `settings.json → extensions`. Código del host Pi fuera del alcance.
7. **`/Users/ruben/Code/FLYBOX/src` no se auditó.** `~/.pi/agent/extensions/capabilities-footer` es un **symlink** a esa ruta (`lrwxr-xr-x`, 28 B, 2026-10-06). Es código cargable desde fuera del repo auditado y fuera del árbol `~/.pi`. No se siguió el enlace. **Riesgo no cuantificado** del mismo tipo que RL-1.
8. **Contenido de `capabilities.json` (200 KB) y `mcp-cache.json` (597 KB) no inspeccionado.** Solo permisos, tamaño y mtime. No se sabe si contienen secretos incidentales; dado que están en 0644, si los contienen están expuestos. **Recomendado:** escaneo de secretos sobre ambos antes de decidir si basta con cambiar el permiso.
9. **`sessions/` (57 entradas) y `profiles/` no se inspeccionaron.** Volumen de transcripciones potencialmente sensibles sin cuantificar.
10. **No se verificó que los permisos observados sean los que Pi asigna.** Los 0600/0700 podrían ser resultado de un `umask` o de un `chmod` manual, no de una política del código. `file-state-store.ts:229-247` sí fija `mode: 0o700`/`0o600` explícitamente para el state del router; para el resto de ficheros de `~/.pi/agent/` no se identificó el origen del permiso.
11. **`~/.pi/secrets/vault/` contiene solo `server.log`.** No se determinó si existe un vault real en otra ubicación o si la ruta es un resto. Ver P13.
12. **`token-ring.ts` (683 líneas), `contract.ts` (376), `db.ts` (288), `reliability.ts` (209), `ingest.ts` (216), `capability-index.ts`, `source-registry.ts`, `router.ts` y `bash-ops.ts` se leyeron solo parcialmente o por grep.** `ingest.ts:7-11` importa `execFileSync` y `mkdtempSync` y declara `GitRepoFetcher`/`HttpCatalogFetcher`: **la ingesta ejecuta procesos y hace red**, y no se auditó su validación. Es la laguna con mayor probabilidad de contener un hallazgo no detectado.
13. **`memory-embeddings.ts` (421 líneas) y `memory.ts` (558) no se auditaron en profundidad.** `memory.ts:94-95` construye consultas FTS con escapado de comillas dobles (`t.replace(/"/g,'""')`): parece correcto pero **no se verificó** frente a la sintaxis FTS5 de SQLite.
14. **No se analizó la cadena de suministro.** `package-lock.json` de los tres paquetes y el `.tgz` en `dist/` sin auditar. `prompts/auditoria-dev.md` pide explícitamente un especialista de supply-chain; este pase no lo cubre.
15. **No se hizo red-team ni PoC de falsificación.** El prompt de auditoría del propio Pi lo solicita («*PoC de falsificación cuando el objetivo lo permita en modo no destructivo*»). Incompatible con el mandato de solo lectura estricta de este encargo. Los hallazgos son por análisis estático y por permisos observados.

---

**Fin del anexo S4.** Todos los hallazgos citan `ruta:línea` o `ruta (bytes, permisos, mtime)`. Ningún valor de credencial se reproduce. Ningún fichero fuera de `auditoria-pi-agent/` fue modificado; no se ejecutó ningún build, test, servidor ni el propio Pi.
