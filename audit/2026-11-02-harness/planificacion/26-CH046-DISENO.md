# CH-046 (P6) — Telemetría redactada, invariants y auditoría final: diseño

**Fecha:** 2026-11-06 · **Estado:** DISEÑO (implementación no iniciada) · **Base:** `origin/master` = `0d1f50007f`, worktree `.worktrees/ch046`, rama local `feat/ch046-telemetry-redaction` · **Regla:** un change a la vez; gates medidos; sin push.

## 1 · Objetivo y gate

P6 = **E-1 (redacción por defecto en telemetría)**, **G-3 (invariants por componente)** y **`/auditoria-dev` final**. **E-3 (pin de integridad de plugins) queda diferido** a decisión explícita del propietario: el plan lo condiciona a aceptar el riesgo de terceros y la fricción de instalación, y el gate de P6 no lo incluye. **G-1/G-2** son plugins instalables del mercado (context-doctor, compaction-audit): se documenta su disponibilidad como recomendación operativa, sin código nuevo en este repositorio.

Gate falsable:

| Métrica | Objetivo | Cómo se mide |
|---|---|---|
| Redacción por defecto | **100 % de los registros del fixture** sin secretos | 20 registros con 6 familias de secreto en `body`/`attributes`/anidados; el registro canónico de entrada no se muta |
| Cobertura de invariants | **gate del repo en verde, 0 violaciones** | `pnpm run verify-package-invariants` + suites `invariant.spec.ts` afectadas |
| `/auditoria-dev` final | **0 BLOCKER / 0 CRITICAL** | auditoría adversarial sobre los changes F4 (CH-043…045) y este, con evidencia fichero:línea |

## 2 · Seams verificados en `origin/master`

| Seam | Evidencia | Uso |
|---|---|---|
| Waterfall de redacción | `SessionTelemetryRecord` + `session-telemetry/record` (`packages/session/session-telemetry/src/index.ts:64+`); coordinador invoca `ctx.waterfall('session-telemetry/record', record, () => record)` (`coordinator.ts:203`) | E-1: transformar el registro de salida |
| Contrato de reglas | README del seam: «listeners stack by transforming `next()`'s return value», «throwing listener withholds that one record fail-closed», «redaction applies to the outbound copy only» | Reglas deterministas y sin reescritura del log canónico |
| Precedente de regla | `packages/session/session-telemetry-otel/tests/fixtures/telemetry-redact-rule.ts` (scrub recursivo de `body`) | Mismo patrón, reglas auditadas y empaquetadas |
| Gate de invariants | `pnpm run verify-package-invariants` (`scripts/verify-package-invariants.ts`) + `package-invariants.ts` | G-3 medido |
| Reglas de secretos | CH-044 (`memory-passive/src/redact.ts`, rama anterior) define las seis familias; este change las **extrae a un paquete util** compartido | Una sola casa para las reglas |

## 3 · Diseño

### `@deepseek-ai/dsh-redaction` (`packages/util/redaction`)

Utilidad pura y auditable: `redactSecrets(text)` con reglas fijas (bloque PEM, `sk-`, Bearer, JWT, GitHub token, AWS access key y asignaciones `API_KEY=`/`password=`), devolviendo `{ text, summary: { count, kinds } }`. Es la **única casa** de las reglas; el paquete de memoria de CH-044 migrará a ella al integrarse (se anota como follow-up de integración). Sin configuración: las reglas son invariantes de seguridad, no tunables.

### `@deepseek-ai/dsh-telemetry-redaction` (`packages/session/telemetry-redaction`)

Plugin sin configuración que se monta en la composición de telemetría:

- Listener `session-telemetry/record`: `const record = next()`; devuelve una copia con `body` y `attributes` recorridos recursivamente (strings, arrays, objetos) pasados por `redactSecrets`. El registro de entrada **no se muta**; el log canónico nunca se toca.
- Si el `next()` final contiene una estructura no soportada (ciclo), la regla no puede recorrerla y **contenida**: se lanza un error del listener → el coordinador retiene ese registro (fail-closed documentado por el seam). Se prefiere retener a filtrar.
- Con el plugin montado no se necesita ninguna regla de despliegue: eso es la «redacción por defecto» (la activación en perfiles queda como decisión del propietario, como el resto de opt-ins).

### G-3 e invariants

`verify-package-invariants` valida que cada companion `./invariant` declarado sea real (no vacío, sin chequear presencia de servicios/metadatos) y cuenta los owners. Este change **no publica** `./invariant` para sus dos paquetes: redaction es una función pura (sin relación entre observaciones independientes) y el plugin de telemetría es un transform puro sobre el registro; publicarlo violaría la regla anti-vacío. El gate de G-3 se mide ejecutando el gate del repo y las suites `invariant.spec.ts` relevantes, con el conteo reportado.

### E-3 (diferido)

El pin de integridad de plugins requiere decidir sobre confianza de terceros y fricción de instalación; se documenta la decisión pendiente y no se implementa en este change (el gate de P6 no lo exige).

## 4 · Verificación y proceso

- Tests de `dsh-redaction` (reglas y resumen), tests del plugin (registro con secretos en body/attributes/anidados → 0 fugas, entrada intacta, fail-closed ante ciclo, gate de 20 registros al 100 %).
- `pnpm run typecheck`, `pnpm run test:docs`, `pnpm run verify-package-invariants`; Agent Note bilingüe `proposed/feature/2026-11-06-telemetry-redaction.md`; commits locales en `feat/ch046-telemetry-redaction`; **sin push**.
- `/auditoria-dev` sobre F4 + este change: informe en `auditorias/`, 0 BLOCKER/CRITICAL; si aparece un hallazgo, se corrige antes del cierre o se documenta con decisión del propietario.
- Actualizar 15/19/26 con el número medido.

## 5 · Riesgos

| Riesgo | Mitigación |
|---|---|
| Falsos positivos de redacción | Reglas conservadoras con placeholders; el fixture verifica que el contenido no secreto se conserva |
| Filtrar un secreto no cubierto | Las seis familias cubren las credenciales del ecosistema; el gate exige 0 fugas y la extracción a util deja una sola casa para ampliar reglas |
| Redacción tardía respecto al backend | El seam aplica las transformaciones antes de `emit()`; el coordinador entrega el resultado del waterfall |
| Auditoría convierte P6 en un cambio enorme | Se audita el diff F4 (ramas locales) con evidencia y se limita a 0 BLOCKER/CRITICAL, no a una reescritura |

## 6 · Implementación y medición (2026-11-06)

- **E-1 implementado opt-in** (dos paquetes, commits locales en `.worktrees/ch046`, sin push):
  - `@deepseek-ai/dsh-redaction` (`packages/util/redaction`) — única casa de las 7 reglas fijas (PEM, `sk-`, Bearer, JWT, GitHub, AWS, asignaciones), con conteos por regla y nombres auditables.
  - `@deepseek-ai/dsh-telemetry-redaction` (`packages/session/telemetry-redaction`) — listener del waterfall `session-telemetry/record` que recorre `body`/`attributes` (strings, arrays, objetos), no muta el registro de entrada, no toca el log canónico y **retiene fail-closed** un registro con ciclo.
- **Gate de redacción medido:** **20/20 registros sin fugas** con las 6 familias en body, valores anidados y attributes; entrada intacta verificada; ciclo retenido. 6 tests verdes (3 por paquete).
- **G-3 medido:** `pnpm run verify-package-invariants` → **39 companions conformes, 0 violaciones**; ninguno de los dos paquetes publica `./invariant` (transform puro, sin relación entre observaciones independientes) y ambos README declaran la omisión con la frase exigida.
- **E-3:** diferido a decisión del propietario (fuera del gate de P6); **G-1/G-2** documentados como plugins de mercado, sin código nuevo.
- **Pendiente para el cierre:** `/auditoria-dev` final sobre F4 (CH-043…045) + este change; el cierre de CH-046 exige **0 BLOCKER / 0 CRITICAL** en ese informe.

## 7 · Auditoría final y cierre (2026-11-06)

`/auditoria-dev` sobre F4 (CH-043…046) en `auditorias/09-AUDITORIA-P6-F4.md`: **0 BLOCKER y 0 CRITICAL abiertos**. Un **CRITICAL** de CH-045 (superficie de la hija con el checkpoint antes del system prompt, `turn/start` duplicado) se detectó y remedió en `944c37b`, con re-verificación por ejecución (superficie vacía antes del bucle, `system` en nodo 0, checkpoint como mensaje de petición).

Quedan **2 MAJOR** (reglas de redacción duplicadas entre CH-044 y `dsh-redaction`, que se resuelven al integrar; tracking de captura sin acotar) y **4 MINOR** documentados con plan y esfuerzo; ninguno bloquea P6. CH-046 se cierra **opt-in, sin activar en presets y sin push**; E-3 sigue diferido a decisión del propietario.
