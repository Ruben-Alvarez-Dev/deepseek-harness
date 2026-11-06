# Mapa Pi → DSH: qué de la planificación de anillos ya existe en DeepSeek Harness

**Fecha:** 2026-11-02 · **Estado:** borrador de trabajo (ronda 2)
**Método:** cada mejora del inventario se contrasta con el código real de `deepseek-harness` (`packages/`), no con su documentación.

---

## 1 · Correspondencias verificadas

| Mejora de Pi | Qué hay hoy en DSH | Evidencia | Veredicto |
|---|---|---|---|
| **Tres anillos** (kernel puro / gateway / connections) | DSH ya está separado por **capability seams**: Service Definition / Provider / Consumer, plugins Cordis con `ctx.effect()`, y `packages/util` como capa cero-dependencias | `docs/capability-seams.md`, `docs/architecture.md:17-22` | **Ya existe** (otro vocabulario). La extracción por anillos es una migración *hacia* lo que DSH ya es. No adoptar el naming; sí el criterio de pureza como check de diseño |
| **Memoria como pieza transversal** | DSH no tiene memoria en el core: es un MCP externo (cortex L0/L3) | perfil `cordis.patch.yml` | **Ya existe** (por exclusión) |
| **Compaction estructurada** (B3: goal/decisions/artifacts/next/constraints) | `compaction-basic` usa un checkpoint de **8 secciones** (Primary Request, Key Technical Concepts, Files and Code, Errors and Fixes, Pending Jobs, Current Work, Next Step, Critical Context) que además **reutiliza el prefijo caliente del KV cache** | `packages/compaction/compaction-basic/src/summarizer.ts:31-66` y `:27-29` | **DSH ya es superior**: estructura más rica + determinismo de replay |
| **Compresión tipada de tool results** (A2/P1.4: head/tail/middle) | `compaction-tool-result-pruner`: cabeza acotada + marcador «middle pruned» + cola acotada, con el original completo **retenido en el session log** para replay exacto, y activado por presión de tokens | `packages/compaction/compaction-tool-result-pruner/README.md` | **DSH ya lo hace mejor** (gated por presión + replayable) |
| **Invariante CacheAligner** (B5: prefijo estable, volátil en cola) | Implementado a propósito: la llamada de compactación reproduce el prefijo de la última petición ruteada para reutilizar la caché del proveedor | `summarizer.ts:27-29` | **DSH ya lo hace** |
| **Contabilidad de tokens por capa** (MEM-7, TokenGovernor) | `token-meter`: medición **replay-aware** (reconstruye desde el log durable), determinista, sin llamadas al modelo, con `contextBreakdown` y reutilización de `usage` del proveedor | `packages/llm/token-meter/README.md` | **DSH ya es superior**: medir en vez de estimar, y determinista |
| **Sandbox que monte el workdir** (D10/SEC-12) | `bash-sandbox` recibe y propaga `spec.workdir` a cada capability que aplica | `packages/shell/bash-sandbox/src/index.ts:33,65,142` | **DSH ya lo hace**; el defecto de Pi (bwrap sin workdir) no existe aquí |
| **Redacción de secretos** (SEC-6) | Solo hay redacción en **telemetría** (`session-telemetry`/`-otel` con reglas), no sobre contenido model-visible ni persistido antes de log | `packages/session/session-telemetry/src/index.ts` | **Hueco real** → candidato |
| **Log a prueba de manipulación** (DATA-8, hash chain) | Session log JSONL append-only por generaciones, **sin cadena de hash ni ancla** | `packages/session/session-persistence-jsonl/src/generation.ts` | **Hueco parcial** → candidato menor (según necesidad de compliance) |
| **Contenido no confiable / inyección** (MEM/B1) | `tool-web` marca el contenido web como *untrusted* | `packages/web/tool-web/src/trust.ts` | **Parcial**: hay marcado en web; no hay cuarentena genérica de contenido inyectado → revisar |
| **Cuarentena/recall de memoria, RRF, ANN, olvido** (MEM-1..6) | No aplica al core: no hay capa de recuperación semántica | — | **N/A para el core**; aplica al MCP de memoria si se mejora |
| **Trust tiers / governance de capacidades** (T0–T3) | DSH usa permisos, aprobación de usuario y presets; no hay tiers de confianza | `packages/interaction/*`, `packages/guard/*` | **N/A** (modelo distinto) |
| **Knapsack + MMR para empaquetar contexto** | No existe; DSH resuelve la presión con compaction + pruner | — | **No recomendado**: añadiría un tercer mecanismo de control de contexto compitiendo con los dos existentes |
| **Eval de calidad de recuperación** (nDCG/recall@k) | No aplica (no hay retrieval); DSH tiene snapshots de sesión grabadas y benchmarks | `pnpm test:snapshot`, `benchmarks/` | **N/A** |
| **Gates cableados en la config viva** (SEC-1, BLOCKER de Pi) | DSH tiene el modelo de plugins: lo que no se monta no existe; y `docs/architecture.md` documenta el enrutado | — | **N/A**: el problema es de Pi (piezas escritas pero no montadas) |

---

## 2 · Lectura provisional

De ~60 ítems inventariados, **solo 3 aparecen como huecos reales en DSH**:

1. **Redacción de secretos sobre contenido model-visible y persistido** (hoy solo hay redacción de telemetría).
2. **Evidencia a prueba de manipulación del session log** (append-only sin cadena ni ancla) — relevante solo si se exige auditoría externa.
3. **Tratamiento de contenido inyectado como no confiable de forma genérica** (hoy solo en `tool-web`), y su interacción con la compactación (que puede resumir y por tanto «blanquear» contenido inyectado).

Todo lo demás o **ya existe en DSH con mejor implementación**, o es **inherente a Pi** (memoria, routing de cuentas, gates no montados, SQLite sin transacciones) y no transfiere.

La conclusión provisional, contraria a la intuición inicial: **el plan de anillos es excelente para Pi y en su mayoría no aplica a DSH**; adoptarlo en bloque sería un retroceso arquitectónico.

---

## 3 · Pendiente antes de cerrar

- [ ] Contraste SOTA externo de los 3 candidatos (papers, GitHub, comunidad).
- [ ] Verificar el alcance real de la redacción en telemetría: ¿qué campos cubre?
- [ ] Comprobar si la compactación puede reingerir contenido inyectado (riesgo de «blanqueo»).
- [ ] Revisar `packages/web/tool-web/src/trust.ts` para ver el patrón de untrusted y si es generalizable.
- [ ] Decidir modo de entrega del informe final.
