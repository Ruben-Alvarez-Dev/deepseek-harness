# 00 · Alcance, metodología y manifiesto de integridad — Auditoría del agente Pi

**Auditoría encargada por:** Ruben · **Auditor:** Qwen Code 0.26.1 (sesión QWEN-code-32) · **Instante de cierre del manifiesto:** 2026-10-25T08:16:04 (hora local)
**Mandato:** auditar en profundidad (i) la configuración actual del agente Pi y (ii) la o las carpetas de proyecto bajo `/Users/ruben/Code` donde están planificadas sus mejoras aún no implementadas; producir documentación profesional. **Todo el material vive en este subfolder (`auditoria-pi-agent/`); nada fuera.** Ninguna implementación de la propuesta SOTA previa se ejecuta hasta cerrar esta auditoría.

---

## 1 · Objetos auditados (identificación verificada)

| # | Objeto | Ruta | Identidad / estado |
|---|---|---|---|
| O1 | Configuración viva de Pi | `~/.pi/` (`agent/`, `proxy/`, `secrets/`) | 40 entradas en `agent/`; incluye `auth.json` y `account-router*.json` en 0600, `capabilities.json` (200 KB), `mcp-cache.json` (597 KB), `prompts/`, `extensions/`, `sessions/`, `backups/` |
| O2 | Repo «casa» de Pi | `/Users/ruben/Code/PI-agent` | git `7b0e0b38` (2026-10-24T10:23+02:00); **8 ficheros dirty** al inicio de la auditoría (ver §3); contiene `src/pi-intermediate`, `src/pi-memory`, `src/pi-account-router`, `openspec/` (27 specs), `docs/docs-expe/`; **`DOCS-HARNESS/` y `pi-harness/` no existen en disco** (purgados E-018/E-022/E-024; ver O4/O5) |
| O3 | Planificación ejecutiva | `/Users/ruben/Code/pi-arnes-documental-privado` | **sin git**; `EXECUTION-STATE.yaml`, `PLAN-SERIAL-OPENSPEC.md`, `HANDOFF.md`, `docs/superpowers/`, `research/ulw/`, `work/` |
| O4 | Cambios planificados en la casa | `PI-agent/openspec/changes/` (vacío a nivel raíz; 2 changes untracked bajo `src/pi-account-router/openspec/changes/`), `PI-agent/HANDOFF.md` | parte de O2; se auditan como fuente de planificación. **Corrección (A3):** `DOCS-HARNESS/D-revision/` **no existe** (purgado en E-022; solo recuperable desde git), así que no es fuente auditable en disco |
| O5 | Cartel de mudanza | `/Users/ruben/Code/pi-harness/MOVIDO-AQUI.md` | **señal caduca:** sus destinos (`PI-agent/DOCS-HARNESS/`, `PI-agent/pi-harness/`) fueron purgados por orden del dueño (E-018/E-022/E-024); el cartel lo ignora |
| — | **Excluido:** `PHI-agent` | `/Users/ruben/Code/PHI-agent` | agente distinto (`phi-kernel`, `phi-tui`); no es Pi |
| — | **Excluidos:** `nanopi`, `pie` | `/Users/ruben/Code/…` | sin relación identificada con el agente Pi; no se auditan |

## 2 · Método

1. **Tres auditores paralelos de solo lectura**, cada uno con un anexo propio:
   - **A1** — configuración viva (`~/.pi/**`): inventario forense, modelo de configuración, política de secretos, MCP/extensions/prompts/sessions, higiene y riesgos → `A1-config-viva.md`.
   - **A2** — repo implementado (`PI-agent`): norma de la casa, OpenSpec (27 capacidades + changes), expediente de obra, arquitectura de `src/`, `DOCS-HARNESS`, `pi-harness/`, estado git → `A2-repo-implementado.md`.
   - **A3** — planificado no implementado (`pi-arnes-documental-privado` + `openspec/changes` + `HANDOFF` + `D-revision`) y matriz de brechas → `A3-planificado-no-implementado.md` + `MATRIZ-GAPS.md`.
2. **Integración** por el auditor principal: `INFORME-AUDITORIA-PI-AGENT.md` (resumen ejecutivo, hallazgos por severidad, matriz de brechas consolidada, riesgos, recomendaciones) cruzando A1-A3 contra este manifiesto.
3. **Reglas de evidencia:** todo hallazgo cita `ruta:línea` o `ruta (bytes, permisos, mtime)`; lo medido en esta auditoría se marca **[V]**, lo reportado por un anexo o por documentación de terceros **[A]**; las cifras auto-reportadas por proyectos externos se marcan como tales.
4. **Regla de secretos:** ningún valor de credencial (`auth.json`, `account-router-accounts*.json`, `~/.pi/secrets/`, tokens, keys) se reproduce en ningún entregable; solo estructura, tamaños, permisos y mtimes.
5. **No mutación:** nada fuera de este subfolder se modifica, mueve o borra; el dirty de O2 debe permanecer idéntico; no se ejecutan builds, tests, servidores ni el propio Pi.

## 3 · Manifiesto de integridad de fuentes

### 3.1 Estado git de O2 al inicio

- HEAD: `7b0e0b38fb00b80c988727790054d5f607738c3f` · Sat Oct 24 10:23:08 2026 +0200 · «E-047: router S-2 repair-before-discard … gates: typecheck+biome+check:specs verdes»
- Dirty (8):
  - `M src/pi-account-router/HANDOFF.md`
  - `M src/pi-account-router/catalog/models/agnes/agnes-3.0-flash-v1.json`
  - `M src/pi-account-router/research/logs-estandar-inmutable-investigacion.md`
  - `M src/pi-account-router/scripts/check-contracts.ts`
  - `M src/pi-account-router/scripts/check-models.ts`
  - `M src/pi-account-router/src/extension.ts`
  - `?? src/pi-account-router/docs/audit-2026-10-18/arquitectura-ecosistema/`
  - `?? src/pi-account-router/openspec/changes/2026-10-19-discarded-tool-call-observability/`

### 3.2 Documentos clave (SHA-256 truncado a 16 hex · bytes · mtime)

| Hash | Bytes | mtime | Fichero |
|---|---|---|---|
| `9cf73799be2fd085` | 4 870 | 2026-10-17T13:19 | `PI-agent/README.md` |
| `4b535cc31438a8b1` | 8 088 | 2026-10-24T10:20 | `PI-agent/CONVENTIONS.md` |
| `e488658b4b5e630a` | 2 917 | 2026-10-17T13:18 | `PI-agent/HANDOFF.md` |
| `901a1b22c776abcc` | 70 | 2026-10-17T13:07 | `PI-agent/package.json` |
| `936ccbce8a8f841b` | 2 408 | 2026-10-17T13:11 | `PI-agent/openspec/project.md` |
| `34e89374bb2221c0` | 597 | 2026-10-11T02:13 | `PI-agent/.mcp.json` |
| `895b9ad0037d752a` | 2 687 | 2026-09-28T04:42 | `pi-arnes-documental-privado/EXECUTION-STATE.yaml` |
| `0bcd2c05703672b3` | 17 045 | 2026-09-28T03:39 | `pi-arnes-documental-privado/PLAN-SERIAL-OPENSPEC.md` |
| `98c3841542845a31` | 8 483 | 2026-09-28T04:39 | `pi-arnes-documental-privado/HANDOFF.md` |
| `6f4c56103c34368b` | 4 900 | 2026-09-28T04:33 | `pi-arnes-documental-privado/work/2026-09-28-respuestas-usuario.md` |
| `4f5595b500c2d180` | 592 | 2026-10-10T21:14 | `pi-harness/MOVIDO-AQUI.md` |

### 3.3 Configuración viva O1 (bytes · permisos · mtime; sin valores)

| Bytes | Perm | mtime | Fichero |
|---|---|---|---|
| 606 | 644 | 2026-10-23T04:51 | `~/.pi/agent/settings.json` |
| 1 300 | 644 | 2026-10-19T03:42 | `~/.pi/agent/AGENTS.md` |
| 716 | 644 | 2026-10-25T05:19 | `~/.pi/agent/mcp-adapter.json` |
| 6 108 | 600 | 2026-10-10T00:11 | `~/.pi/agent/models.json` |
| 200 429 | 644 | 2026-10-25T05:28 | `~/.pi/agent/capabilities.json` |
| 3 997 | 600 | 2026-10-25T07:41 | `~/.pi/agent/auth.json` |
| 1 854 | 600 | 2026-10-19T05:50 | `~/.pi/agent/account-router.json` |

**Advertencia de volatilidad:** O1 es estado vivo (Pi puede escribir en él durante la auditoría: p. ej. `mcp-cache.json`, `sessions/`, `account-router-state/`). Los anexos A1 deben marcar qué observaciones son instantánea y cuáles estructurales. O3 no tiene git: su integridad se sostiene solo en los hashes de §3.2.

## 4 · Entregables previstos en este subfolder

| Fichero | Contenido | Autor |
|---|---|---|
| `00-ALCANCE-Y-METODO.md` | este documento | auditor principal |
| `A1-config-viva.md` | auditoría de `~/.pi/**` | agente A1 |
| `A2-repo-implementado.md` | auditoría de `PI-agent` (norma, openspec, código, DOCS-HARNESS) | agente A2 |
| `A3-planificado-no-implementado.md` | auditoría de la planificación | agente A3 |
| `MATRIZ-GAPS.md` | brechas planificado↔implementado | agente A3 |
| `INFORME-AUDITORIA-PI-AGENT.md` | informe profesional integrado | auditor principal |
