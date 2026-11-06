# Contraste SOTA y recomendación (borrador)

**Fecha:** 2026-11-02 · **Estado:** borrador para discusión; no es el informe final.
**Alcance:** solo los 3 candidatos que sobrevivieron al mapa Pi→DSH.

---

## C1 · Redacción de secretos en contenido model-visible y persistido

**Situación en DSH.** La redacción existe **solo como punto de extensión de telemetría**: `session-telemetry/record` es un waterfall y el Service Definition **no trae reglas** (`packages/session/session-telemetry/src/index.ts:27`). Un despliegue monta las suyas. El session log y el contenido enviado al modelo **no pasan por ninguna redacción**.

**Tensión arquitectónica.** DSH cumple el invariante *«model-visible ⟺ logged»*: todo lo que llega al modelo es reconstruible desde el log. Redactar el contenido model-visible **antes de loguearlo** rompería el replay determinista. Por tanto la redacción no puede ser un filtro ciego en el camino del modelo.

**Estado del arte.**
- Detección por patrón + entropía es el estándar industrial (gitleaks/trufflehog), con falsos negativos conocidos.
- La práctica más sólida no es redactar sino **no introducir el secreto en el contexto**: referencias fuera de banda al credential store. DSH ya tiene el store (`.credentials.yaml`, write-only).
- Redacción en el **borde de exportación** (OpenTelemetry) es la práctica asentada: se redacta al salir, no en el origen.
- Para PII, Presidio (Microsoft) es la referencia: analizador + anonymizer desacoplados.

**Veredicto: ADOPTAR, reducido.**
1. **Sí**: publicar reglas de redacción por defecto en el waterfall `session-telemetry/record` (coste bajo, cero impacto en el modelo, cero impacto en replay). Hoy el seam está vacío.
2. **No**: redactar el contenido model-visible del session log. Rompe el invariante.
3. **Sí, como gate de pruebas**: un canario de secretos en el harness de snapshots que falle si un fixture contiene credenciales reales.
4. **Regla de diseño**, no código: el secreto se referencia, no se copia.

---

## C2 · Session log a prueba de manipulación

**Situación en DSH.** Persistencia JSONL append-only por generaciones (`session-persistence-jsonl`), sin cadena de hash ni ancla externa.

**Estado del arte.** La cadena de hash simple (lo que propone Pi: `hash = H(prevHash ‖ event)`) es **la versión débil**: sin ancla externa, quien puede reescribir el log recalcula la cadena, y el verificador local comparte destino con el dato. Lo correcto desde hace años es **log de transparencia**: árbol de Merkle + checkpoints firmados + testigos externos (RFC 9162, Certificate Transparency; despliegues reales como Android Binary Transparency). Para agentes hay incluso un borrador IETF específico: *The Agent Record: Transparent, Witness-Countersigned Event Logs for AI Agent Identity, History, and Memory*.

**Veredicto: RECHAZAR por ahora (y si algún día, hacerlo bien).**
- No hay requisito de auditoría externa en DSH.
- El coste real de un log de transparencia (árbol, testigos, anclaje, operación) es un subsistema, no un campo.
- La propuesta del dossier es la versión decorativa; mi auditoría de Pi lo confirmó en su propio código (el `prevHash` se escribe y nunca se lee, la tabla admite `UPDATE`/`DELETE`).

---

## C3 · Contenido no confiable genérico y «blanqueo» por compactación

**Situación en DSH.**
- `tool-web` marca contenido web como **untrusted** (`packages/web/tool-web/src/trust.ts`): existe el concepto, aplicado a una sola fuente.
- Los plugins de contexto inyectan mensajes identificados por origen (`source.kind === 'plugin'`, `packages/context/time-context/src/index.ts:163`).
- **Verificado: la interacción con compactación ya está cubierta y fijada por tests.** `manual-compaction.spec.ts:288-317` inyecta un mensaje de plugin «INJECTED CONTEXT», compacta y comprueba que (a) no se persiste como `user/message` y (b) el contenido aparece **exactamente una vez** tras la compactación; `:319-343` impide además la reinyección reentrante desde listeners. El riesgo de «blanqueo» que yo había planteado **no se sostiene**: existe manejo explícito y probado.

**Estado del arte.**
- **Spotlighting** (Microsoft, arXiv 2403.14720): datamarking, delimitación y encoding para separar instrucciones de datos no confiables. Barato, medible, sin cambiar el modelo.
- **CaMeL** (Google DeepMind, arXiv 2503.18813): separación de plano de control y plano de datos con capacidades; defensa por diseño, no por prompt. Efectivo pero es una **redistribución arquitectónica** del agente.
- **OWASP Top 10 for LLM Applications 2025**: prompt injection sigue como riesgo #1; recomienda defensa en profundidad y no confiar en filtros de texto.

**Veredicto: ADAPTAR, mínimo y verificable.**
1. **Investigar primero** (barato): ¿la compactación puede ingerir mensajes inyectados? Si sí, es un defecto concreto que arreglar propagando la procedencia al checkpoint.
2. **Extender la marca de confianza** más allá de `tool-web` a toda inyección de contenido externo (MCP, ficheros, sesión).
3. **No**: portar el detector de inyección de Pi (regex multilingüe): el propio dossier lo degrada a «mitigación de ruido» y OWASP lo desaconseja como control.
4. **No**: CaMeL completo. Es investigación aplicable a un rediseño, no a un parche.

---

## Análisis conjunto

**Sinergias.** C1 y C3 son el mismo problema en dos caras: **procedencia del dato en la frontera** (qué es secreto, qué es no confiable, de dónde vino). Resolverlos juntos —un campo de procedencia en el evento de sesión— es más barato que dos mecanismos separados, y encaja con el invariante «model-visible ⟺ logged».

**Conflicto.** C1 choca con ese invariante si se aplica en el camino del modelo. La resolución es redactar **en exportación**, no en el log; y registrar la redacción como evento si algún día afecta a contenido model-visible.

**Orden recomendado.**
1. Investigación barata: ¿la compactación blanquea contenido inyectado? (1–2 h, sin código de producto)
2. Reglas de redacción por defecto en telemetría (el seam ya existe; coste bajo)
3. Marca de procedencia unificada para contenido inyectado
4. (Condicional) propagar procedencia al checkpoint de compactación

**Lo que NO se adopta** (con razón): los tres anillos como estructura (DSH ya está separado por capability seams), la memoria PALIMPSEST, el routing de capacidad con trust tiers, el knapsack de contexto, la auditoría hash-chained local, el detector de inyección por regex, el port de eval nDCG (no hay retrieval).

---

## Conclusión

De ~60 mejoras propuestas, **3 tocan a DSH**, y de esas 3 solo **2 son adoptables ahora** (redacción por defecto y procedencia unificada), más **1 investigación** que puede destapar un defecto real (blanqueo por compactación).

El valor del dossier para DSH **no son sus mecanismos: es su disciplina de diagnóstico** —medir antes de afirmar, separar lo que el código hace de lo que la spec promete, y no dar por bueno un control que no está cableado—. Eso DSH ya lo tiene en sus gates, pero el dossier demuestra lo caro que sale perderlo.
