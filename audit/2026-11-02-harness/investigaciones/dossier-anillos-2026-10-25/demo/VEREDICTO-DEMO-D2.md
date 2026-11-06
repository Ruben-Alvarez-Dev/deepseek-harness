# Veredicto de demo supervisada D2 — Pi 1.4.0 real, 2026-10-25

**Método:** sesiones efímeras de Pi (`--no-session`, `--no-mcp`, `--mode json`) ejecutadas con cwd dentro de este subfolder; capturas completas en `d2a-baseline.json` / `d2b-memory.json`; supervisión por canario (`ZULU-42`) y escaneo de mutaciones (`find ~/.pi -mmin -25`, `git status` del repo auditado). Ninguna configuración viva fue modificada: la extensión se cargó con `--extension/-e`.

## D2a — baseline (config viva tal cual)

- Comando: `pi -p "Responde exactamente con la palabra: DEMO-OK" --mode json --no-session --no-mcp`
- Resultado: exit 0; respuesta `DEMO-OK`; `provider: account-router`, `model: agnes-3.0-flash`, usage input 5.049 / output 31 / reasoning 25; durationMs 1.786.
- **Veredicto [V]:** la única pieza cableada hoy (`pi-account-router` como provider) funciona en Pi real.

## D2b — `pi-memory` cargado desde fuente (`-e …/pi-memory/src/extension.ts`)

- Comando: `pi -p "…guarda el hecho 'clave-demo=ZULU-42' y recupéralo…" --mode json --no-session --no-mcp -e …/extension.ts`
- Secuencia supervisada (3 ejecuciones de herramienta, todas `memory`):
  1. `save {action: save, text: "clave-demo=ZULU-42", title: "Demo memoria"}` → `saved m_6985396ceddf (persist, admitted)` · `details {ok: true, action: persist, id: m_6985396ceddf, score: 0.753}`
  2. `search {action: search, query: "clave-demo"}` → 1 hit `kind: semantic`, previews ok
  3. `get {action: get, id: m_6985396ceddf}` → `clave-demo=ZULU-42` · `state: active`
- Respuesta final del modelo: `ZULU-42` (correcta). usage input 5.897 / output 53.
- Herramientas **registradas** además por composición con `@pi-agent/intermediate`: `capabilities`, `find_capability`, `search_registry`, `fetch_skill`, `read_skill`, `search_skills` (Selection Plane). **No fueron invocadas** en esta demo (0 ejecuciones): su funcionamiento sigue sin evidencia empírica.
- **Veredicto [V]:** pi-memory funciona de extremo a extremo dentro de Pi real cuando se cablea: admisión PMO/DMAA (`admitted`, score 0.753), ledger (`persist`), búsqueda semántica y recuperación exacta.
- **Veredicto [V] sobre persistencia:** el canario `ZULU-42` **no aparece en ningún almacén de disco** (ni `~/.pi`, ni cwd, ni ficheros nuevos): el backend por defecto del SPI es efímero/en memoria. La durabilidad de PALIMPSEST queda **sin probar** en D2: exige backend configurado y test dedicado (cubierto después por D1 T5/T6). Mecanismo confirmado por S2-02: sin `PI_CORE_DB`, `M/core.ts:49` abre `:memory:`; la volatilidad observada es el **cableado por defecto**, no un defecto del backend.

## Supervisión de mutaciones

| Mutación observada | Atribución |
|---|---|
| `~/.pi/agent/account-router-state/e592….json`, `mcp.log`, `mcp-cache.json`, `~/.pi/secrets/vault/server.log` | arranque/routing de Pi: esperado |
| `~/.pi/agent/AGENTS.md` (1.300 → 1.585 B, mtime 08:55) | **externa**: anterior al inicio de la demo (09:09); sesiones Pi vivas concurrentes del usuario |
| 4 session jsonl de otros proyectos (07:28–08:09) | sesiones Pi vivas concurrentes, no la demo |
| Repo `PI-agent` | intacto: 8 dirty idénticos al manifiesto |
| Persistencia del canario | inexistente en disco (backend efímerO) |

## Respuesta a «¿funcionan al 100 %?»

- **pi-memory:** el pipeline en proceso (admisión → ledger → search → get) **funciona** en Pi real [V]. No está cableado en la config viva [V]. Durabilidad, consolidación sleep-time, olvido por saliencia, grafo bi-temporal y gateway **no quedan probados por esta demo** (requieren D1 con backend temporal y asserts).
- **pi-intermediate:** carga y registra su Selection Plane vía composición [V], pero routing en dos etapas, Token Economy Ring y hard gates **no se ejercitaron**: sin evidencia empírica todavía (pendiente demo D1 determinista).
- **«Garantía total»:** no existe como prueba; lo que hay es cobertura empírica acotada: 2 sesiones reales supervisadas + canario + escaneo de mutaciones. El resto se cubre con D1 y con los anexos S1–S4.

## Pendiente

- **D1:** driver determinista (node v26, TS nativo, sin descargas) sobre `pi-intermediate` (router 2 etapas, `ring.budgetPerTurn`, hard-gates) y `pi-memory` (consolidación, olvido, grafo, backend temporal en `demo/tmp/`), con asserts y salida capturada aquí.
