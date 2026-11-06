# Informe — ¿qué mejoras de la planificación por anillos de Pi conviene adoptar en DSH?

**Fecha:** 2026-11-02 · **Autor:** sesión de auditoría (DSH) · **Estado:** completo.
**Pregunta:** de la planificación de extracción por anillos del ecosistema Pi (dossier de 2026-10-25: anillo-0 kernel · anillo-1 gateway · anillo-2 connections), ¿qué es inteligente, beneficioso y rentable adoptar en `deepseek-harness`, cómo, y con qué contraste frente al estado del arte?

---

## Veredicto

**De 60 mejoras, 2 se adoptan, 7 ya existen en DSH (5 con implementación superior), 45 no aplican por ser defectos internos de Pi, 3 se rechazan por ser peores que el estado del arte, y 1 hipótesis se cae al verificarla.**

La planificación es excelente **para Pi**. En DSH, adoptarla en bloque sería un **retroceso arquitectónico**: reintroduciría mecanismos que DSH ya resolvió mejor (medición replay-aware frente a estimación; pruner con original retenido; capability seams frente a anillos de pureza). Lo transferible es pequeño y concreto.

---

## 1 · Qué se estudió

| Fuente | Contenido |
|---|---|
| `/Users/ruben/Code/QWEN-code/auditoria-pi-agent/` | 17 ficheros, 4.541 líneas, 2026-10-25. **No versionado en git.** Auditoría del agente Pi + diseño de extracción por anillos + 4 especialistas (S1 arquitectura, S2 runtime, S3 AI/ML, S4 seguridad) + 2 colofones adversariales + 2 demos ejecutadas |
| Modelo de anillos | Anillo-0 = kernel puro (sin red, FS, procesos, reloj, DB); anillo-1 = gateway (orquesta, compone, expone, custodia); anillo-2 = connections (todo lo que toca el mundo). La memoria se declara **pieza transversal** de rango propio. Coste declarado: **8 puertos nuevos + 16 adaptaciones** |
| Contraste | Código real de `deepseek-harness` (no su documentación) + estado del arte externo |

## 2 · Resultado del contraste

### Lo que DSH ya tiene, y en 5 casos mejor

| Mejora de Pi | Lo que hay en DSH |
|---|---|
| Compactación estructurada (goal/decisions/artifacts/next) | Checkpoint de **8 secciones** que además reutiliza el prefijo caliente del KV cache (`compaction-basic/src/summarizer.ts:27-29,31-66`) |
| Compresión de tool results (head/tail) | `compaction-tool-result-pruner`: cabeza + «middle pruned» + cola, **original retenido para replay exacto**, activado por presión de tokens |
| Contabilidad de tokens por capa | `token-meter`: replay-aware, determinista, `contextBreakdown`, reutiliza el `usage` del proveedor. Pi estima con `ceil(len/4)` |
| Sandbox con `workdir` | `bash-sandbox` propaga `spec.workdir` (`index.ts:33,65,142`). El bug de `bwrap` que Pi documenta no existe aquí |
| Journal / replay no destructivo | El replay de DSH es determinista desde el log; la compactación conserva el contenido sombreado |
| Credenciales con permisos | `credentials-local` **se niega a arrancar** si el fichero es legible por otros (`index.ts:116-143`) |
| Evidencia ejecutable y specs alineadas | CI con cobertura por fichero, snapshots grabados y catálogos generados desde el código |

### Las 2 adopciones

**A1 · Reglas de redacción por defecto en el waterfall de telemetría** (SEC-6).
- **Qué**: el punto de extensión `session-telemetry/record` existe pero **no trae ninguna regla** (`session-telemetry/src/index.ts:27`). Publicar un conjunto por defecto (claves de proveedor, tokens de sesión, bloques PEM).
- **Cómo**: reglas montadas como plugin; redacción en el **borde de exportación**, nunca sobre el log model-visible (rompería *model-visible ⟺ logged*).
- **Coste**: bajo. **Riesgo**: falsos positivos en telemetría (mitigable), ninguno en replay.
- **SOTA**: detección por patrón + entropía es el estándar industrial; la práctica superior es no introducir el secreto en el contexto (referencias fuera de banda), que DSH ya soporta con `.credentials.yaml` write-only.

**A2 · Pin de integridad de plugins** (SEC-2, parcial).
- **Qué**: DSH confía en el lockfile de pnpm; no hay hash-pin por paquete del perfil.
- **Cómo**: si se quiere, es diseño nuevo de DSH (manifiesto + hash verificado al montar), no un port de Pi.
- **Coste**: medio; **riesgo**: bajo. **Prioridad**: baja salvo que el perfil acepte plugins de terceros (hoy el usuario ya instala del mercado).

### Lo rechazado

- **Journal hash-chained local**: la cadena sin ancla es decorativa — quien reescribe el log recalcula la cadena. El estado del arte es log de transparencia (Merkle + checkpoints firmados + testigos, RFC 9162; borrador IETF específico para agentes). Coste real: un subsistema. **Sin requisito hoy → no se hace.**
- **Detector de inyección por regex**: el propio dossier lo degrada a «mitigación de ruido»; OWASP 2025 desaconseja filtros de texto como control. Si se quiere de verdad, el camino es Spotlighting (arXiv 2403.14720) o separación control/datos tipo CaMeL (arXiv 2503.18813), no un regex.
- **Knapsack de contexto**: compite con los dos mecanismos que DSH ya tiene (compaction + pruner) sin resolver nada que no esté resuelto.

### La hipótesis que se cayó al verificarla

«La compactación puede blanquear contenido inyectado no confiable.» **Falso:** `compaction-basic/tests/manual-compaction.spec.ts:288-317` inyecta un mensaje de plugin, compacta y comprueba que no se persiste como `user/message` y que el contenido aparece exactamente una vez; `:319-343` impide la reinyección reentrante. DSH ya lo maneja y lo tiene fijado con test.

## 3 · Por qué 45 ítems no aplican

No son mejoras malas: son **defectos internos de Pi** que DSH no puede tener porque no tiene esas piezas. Los bloques recurrentes:

- **Memoria PALIMPSEST**: olvido inmortal por aritmética (`0.3 × importance(0.5) = 0.15` = umbral), RRF que fusiona tres permutaciones del mismo FTS5, ANN con cero llamadas, 11 caminos de escritura. DSH no tiene capa de memoria en el core.
- **Kernel SQLite compartido**: esquema de todo el ecosistema en un fichero, sin PRAGMA ni transacciones, PEM privado dentro de la DB que firma. DSH no tiene ese kernel.
- **Gates no cableados**: `hard-gates` solo se registraba en un paquete que Pi no cargaba. En DSH lo que no se monta no corre.
- **Proceso de la casa Pi**: expediente con 26 entradas ausentes, probes gitignored, suites borradas por decisión del usuario, 72 % de código sin consumidor.

## 4 · Lo que sí merece llevarse

**La disciplina de diagnóstico, no los mecanismos.** El dossier demuestra una y otra vez lo caro que sale confundir *lo que el código hace* con *lo que la spec promete*: controles que no están cableados, specs canónicas verdes sobre componentes que no existen, firmas que no firman lo que dicen firmar, un olvido que no olvida por aritmética.

DSH ya tiene los gates para no llegar ahí (cobertura por fichero, snapshots de sesión, catálogos generados, presupuestos de doc). El estudio confirma que el invariante *model-visible ⟺ logged* y la medición replay-aware son la diferencia arquitectónica que hace innecesaria casi toda la planificación heredada.

## 5 · Índice del expediente

| Fichero | Contenido |
|---|---|
| `00-INFORME.md` (este) | Veredicto, adopciones, rechazos, conclusión |
| `00-NOTAS-TRABAJO.md` | Estado del estudio, modelo de los tres anillos, auditoría previa de PI-agent, plan |
| `01-INVENTARIO-CONSOLIDADO.md` | Las ~60 mejoras normalizadas con estado y evidencia del dossier |
| `02-MAPA-DSH.md` | Correspondencia Pi → DSH verificada contra el código |
| `03-SOTA-Y-RECOMENDACION.md` | Contraste externo de los candidatos + análisis conjunto |
| `04-AUDITORIA-ITEM-POR-ITEM.md` | Las 60 filas con disposición y razón |

## 6 · Límites

- El contraste SOTA se hizo para los candidatos que sobrevivieron; no se revisó la literatura de cada uno de los 60 ítems, porque 45 son internos de Pi.
- No se ejecutó nada del código de Pi; la evaluación de sus defectos se apoya en las medidas del dossier y en la auditoría propia de PI-agent de días previos.
- No se ha propuesto implementación concreta de A1/A2: eso requiere un change de DSH con su propio diseño.
