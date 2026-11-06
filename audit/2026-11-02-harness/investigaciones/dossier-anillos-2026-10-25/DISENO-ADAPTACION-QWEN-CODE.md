# DISEÑO DE ADAPTACIÓN A QWEN CODE — v2 (post-colofón AD2, final de análisis)

**Fecha:** 2026-10-25 · **Par de:** `DISENO-EXTRACCION-ANILLOS-PI.md` v5 · **Fuentes:** `S3` §3-§6, `S2` §6, `S4` §3.4, `COLOFON-ADVERSARIAL-2.md` (verificado contra el código de Qwen Code 0.26.1), `REFERENCIA-QWEN-CODE.md`, `PROPUESTA-CONFIG-SOTA.md`.
**Veredicto en una línea:** tras el ataque adversarial, del plan de port original queda **un ítem medible (A1), dos cambios de core de Qwen (atribución por capa en `/context detail` y ledger de evidencia de mutaciones de memoria), una regla de diseño declarada (B5, con su invariante aún sin verificar en el host) y B3 sobre `PreCompact`/`PostCompact`**; A2, B1/B2 tal como estaban y C1 se retiran o reformulan contra superficies que existen; las cifras de coste se declaran estimaciones no medidas, no beneficios.

## 1 · Fase 1 revisada — lo que sobrevive

| # | Ítem | Mecanismo real en 0.26.1 | Estado |
|---|---|---|---|
| P1.1 | **A1** harness de calidad de recuperación (nDCG, recall@k, probes por tipo) | comando/script offline sobre fixtures `query → ids relevantes`; hueco real de Qwen y precondición que el propio plan impone a A3/C1 | **se mantiene, 1ª prioridad, coste 0/turno** |
| P1.2 | **B5** invariante CacheAligner (prefijo estable, recall en la cola) como regla de diseño | regla declarada; **tarea previa:** verificar dónde inyectan `UserPromptExpansion`/`UserPromptSubmit` su stdout (prefijo vs cola) — sin verificar en 0.26.1 (FN6) | se mantiene como regla + verificación |
| P1.3 | **B3** compactación estructurada (`structuredCompact`) | `PreCompact` acepta `additionalContext` con tope duro (`chatCompressionService.ts:169,336,425,623-642`) | se mantiene |
| P1.4 | **Ajuste del truncado nativo** en lugar de compresión por hook | `truncateToolOutput` ya ofrece `keep:'head'\|'tail'\|'both'`, `previewChars`, capas `producer`/`per_tool`/`combined`, volcado íntegro a fichero y presupuestos por herramienta (10× en MCP); más `toolOutputBatchBudget`, `maxOutputChars` y `emitToolUseSummaries` (default true) | **config, no código**: sustituye a A2 |
| P1.5 | **Ledger de evidencia** de mutaciones de memoria + **atribución por capa** en `/context detail` | cambios de core de Qwen (no ports): lo único que Qwen no tiene bajo ninguna forma; atribuir siempre el valor efectivo e incluir la capa `tool` | se mantienen como petición de core |
| P1.6 | Regla anti-recursión (el recall inyectado no se re-persiste) | excluir/marcar no-resumibles los mensajes de recall en la entrada de `PreCompact` y de destilados | se mantiene |

## 2 · Retirados o reformulados por AD2

- **A2 (compresión tipada como hook `PostToolUse`) — RETIRADO.** `PostToolUseOutput` solo admite `decision`/`reason`/`additionalContext`/`artifacts` (`hooks/types.ts:849-858`); no existe campo de sustitución (`updatedInput` es exclusivo de `PreToolUse`); y `additionalContext` se **anexa** al resultado ya truncado dentro de la herramienta (`coreToolScheduler.ts:6684-6688`, `:1447-1479`, sin marcador) → efecto neto **+tokens**: el signo del ahorro estaba invertido. La única superficie que reescribe resultados son los **mods** (`ModToolResult.result`, `mods/tool-events.ts:34-41`; `tool-execution.ts:232-263`), pero viven tras `experimental.mods` (default false), en QuickJS sin Node/fs/red, con techo de 4.096 operaciones y límite de payload: no sirven para comprimir salidas grandes de forma fiable. Reformulación aceptada: P1.4 (truncado nativo por config).
- **B1/B2 (cuarentena y redacción como hooks) — REFORMULADOS.** (a) **Matchers:** `*` es cuantificador regex, no glob (`matchesHookPattern`); `mcp__*memory*` no casa `mcp__external-context__context_search`, `mcp__external-context__context_write`, `mcp__mem0__add_memory` ni `search_memory` — justo las tools del slot y la que A1 debe medir. Lista explícita a verificar una a una: `manage_memory`, `search_memory`, `context_search`, `mcp__external-context__.*`, `mcp__mem0__.*`. (b) **Reclasificados:** de «control estructural de seguridad» a **mitigación de ruido fail-open** (S4-K6: 6 regex en inglés evadibles por paráfrasis o idioma; el resultado de un detector de inyección debe ser un nivel de confianza, nunca un booleano certificado). (c) **Redacción por allow-list** de campos publicables, no deny-list de regex (RL-5; el umbral `[A-Za-z0-9._\-]{12,}` tras `key=` deja pasar secretos cortos, base64 y multilínea).
- **C1 (`LocalFirstBackend` en el slot `external-context`) — RETIRADO como port.** El perfil prohíbe dynamic import de proveedores y registro en Core (`docs/design/external-context-provider-extensions.md:14-24,48-58`): enchufar un backend exige **escribir un servidor** MCP conforme al External Context Profile v1 (contratos + test-vectors) o un endpoint HTTP mem0-v2/v3/oss — un proyecto, no un port — y además pierde el hook de aprobación de `enableWrites` que el plan citaba como su atractivo (FP5). Colisión adicional: `PROPUESTA-CONFIG-SOTA` §5 ocupa ese slot con **ENGRAM vía puente MCP** y rechaza mem0. Decisión única: ENGRAM; C1 se replantea, si acaso, dentro del diseño del puente ENGRAM.
- **Cifras de coste — declaradas deuda.** −20…−70 % (A2) y +200–400 tokens (A3) eran estimaciones cualitativas de S3 §8.5 («ningún coste de tokens está medido»), promocionadas sin caveat en el diseño v3. A3 solo avanza si A1 mide ganancia real de nDCG.

## 3 · Colisiones con `PROPUESTA-CONFIG-SOTA.md` (declaradas)

1. **`updatedInput` en `PreToolUse` paralelos:** `guard-destructive` (user) y B1/B2 (extension) emitiendo `updatedInput` sobre la misma llamada = último-escritor-gana sobre una sustitución total (hooks en paralelo por defecto; precedencia secuencial solo con `sequential: true`). Exigir `sequential: true` con orden explícito o un único dueño de `updatedInput`.
2. **Stop hook vs reescritura de resultados:** el auditor de veracidad compara contra la transcripción; cualquier reescritura la degrada sin marcador distinguible. Regla: mientras exista el hook `Stop`, **prohibida toda reescritura de tool results**; el volcado íntegro de `truncateAndSaveToFile` queda como único registro fiel fuera del transcript.
3. **Slot de memoria:** decisión única = ENGRAM (puente MCP); el slot mem0/external-context queda libre solo si ENGRAM se cae.

## 4 · Lo que no cambia

Los 10 descartes de S3 §6.4 (confirmados uno a uno por AD2), la lista roja S4 RL-1…RL-15, las reglas de credenciales de S4 §3.4, y el mapeo de anillos (almacén/servicio de memoria = anillo-1 también en Qwen; mods = política, nunca autoridad).

## 5 · Deuda de este documento

Invariante B5 sin verificar en el host (posición de inyección de `UserPromptExpansion`); cifras de coste sin medir; mods como única superficie de reescritura = experimental/off/limitada; nada de este documento se ha ejecutado aún en Qwen Code; el puente ENGRAM (decisión de slot) aún no está diseñado.
