# Investigación viva — arquitectura del ecosistema y arnés portable

Fecha: 2026-10-18 · Estado: **DELTA COMPARATIVO ENTREGADO / SIN CAMBIOS DE PRODUCTO NI RATIFICACIÓN**.
Responsable de esta revisión: asistente de la sesión, proveedor OpenAI comprobado mediante `PI_PROVIDER=openai-codex`.

## 1. Encargo y autorización

Rubén pidió revisar la arquitectura más allá de memoria y router: arnés reutilizable entre agentes, anillos de verificación, credenciales, órdenes de servicio, planificación, autoridad/gobernanza, seguridad, adversariales/Dementor y economía de tokens. Posteriormente pidió profundizar en la documentación de Jart-OS y **dejar por escrito los descubrimientos para conservar continuidad**. En el siguiente encargo pidió expresamente **proponer la arquitectura completa, optimizada y SOTA**; esa propuesta se documenta en el documento 05, con contraste oficial en el 06.

Esta autorización permite investigar, documentar y proponer la arquitectura. **No aprueba** implementar, extraer paquetes, crear servicios, reorganizar repositorios, cambiar políticas, instalar componentes, modificar credenciales o desplegar nada.

**TUIOS está excluido por aclaración expresa del propietario**: no es centro del sistema ni consumidor previsto. La falta de un consumidor instalado tampoco invalida por sí misma un requisito de seguridad o de autoridad declarado por Rubén.

## 2. Leer en este orden

**Resultado vigente: empezar por [08-delta-recomendado.md](08-delta-recomendado.md); comprobar sus pruebas en [09-evidencia-delta.md](09-evidencia-delta.md).** El documento 05 consolida principalmente diseño preexistente; no es una arquitectura nueva que haya que volver a implantar.

| Documento | Fuente única de |
|---|---|
| [01-hallazgos.md](01-hallazgos.md) | Descubrimientos e implicaciones, clasificados por tipo de evidencia |
| [02-fuentes.md](02-fuentes.md) | Cobertura, rutas, versiones observadas y manifiesto de lectura con SHA-256 |
| [03-evidencia.md](03-evidencia.md) | Comprobaciones ejecutadas, resultados y límites de las reproducciones |
| [04-continuidad.md](04-continuidad.md) | Evolución de conclusiones, correcciones, preguntas y próximo orden de investigación |
| [05-arquitectura-propuesta.md](05-arquitectura-propuesta.md) | Consolidación de destino; novedad rectificada y opciones inmediatas revisadas por 08 |
| [08-delta-recomendado.md](08-delta-recomendado.md) | Comparación cerrada del alcance inspeccionado: conservar/cambiar, once deltas, beneficio y aceptación |
| [09-evidencia-delta.md](09-evidencia-delta.md) | Nueva ejecución: 68 aserciones aisladas, contrafactuales, controles positivos y hashes de 29 módulos |
| [07-esquema-visual.md](07-esquema-visual.md) | Empezar aquí para visualizar: flujo de trabajo, separación de confianza e instalación independiente |
| [06-contraste-sota.md](06-contraste-sota.md) | Contraste técnico actual, fuentes oficiales adicionales y límites de la etiqueta SOTA |

Este expediente no sustituye la auditoría de continuidad del router en el directorio padre, sus specs ni sus actas. No es una copia del corpus de Jart-OS ni un nuevo canon.

## 3. Estado de la conclusión

**Conclusión INV-10:** conservar la arquitectura existente y cerrar sus invariantes mediante los deltas D01–D11 de 08. No crear otro kernel, backend general, framework o servicio para corregir problemas de cableado, ámbito, atomicidad, replay y firma.

La estructura principal del documento 05 ya estaba diseñada. El contraste nuevo justifica cambios concretos y retira como recomendaciones inmediatas varias opciones tecnológicas no comparadas. Entre lo que se conserva: puertos del router, capas de memoria, evaluador de PROXY realmente conectado, Gondolin ya existente y knapsack exacto.

La comparación incluye casos reproducidos de aislamiento entre tenants, escrituras sin evento, replay destructivo o que reactiva revisiones, presupuesto de texto incorrecto, firmas incompletas, recibos sin sujeto y doble rerank. Las 68 aserciones no son 68 garantías del producto: parte confirma defectos; las correcciones de referencia permanecen en el probe local.

**La recomendación diferencial está entregada; su implementación y validación en instalaciones reales no están realizadas.** El límite del alcance y las puertas de adopción están expresos en 08/09. Las responsabilidades de CORE, Contratos, PROXY, FACTORY y demás productos se conservan; no se equiparan aplicaciones con instituciones ni procesos con fronteras de confianza.

## 4. Disciplina de evidencia

| Marca | Significado |
|---|---|
| DOC | Lo dice un documento identificado; no acredita implementación actual |
| COD | Se ha localizado en código; no acredita ejecución completa |
| EXE | Se ha ejecutado una comprobación concreta; vale solo para su alcance |
| INT | Interpretación o propuesta del asistente; no ratificada |
| ABIERTA | Requiere investigación o una decisión aún no acreditada |

Las ratificaciones históricas se describen como **registradas por las fuentes**, no como una nueva ratificación del usuario en esta conversación. Un hash acredita bytes, no legitimidad. Una suite verde no acredita que los controles estén conectados al camino real.

## 5. Reglas para actualizar este expediente

1. Registrar cada descubrimiento material al producirse, antes de ampliar la recomendación.
2. Añadir la fuente con ruta, fecha/versión y localizador; para lecturas completas nuevas, ampliar el manifiesto sin renumerar IDs.
3. No contar inventario, búsqueda, lectura parcial o resumen ajeno como lectura completa.
4. Separar declaración documental, implementación, ejecución observada y autoridad.
5. Rectificar indicando qué afirmación se retira y por qué; no borrar silenciosamente el razonamiento anterior.
6. Mantener conclusiones en un único documento de hallazgos; los demás enlazan, no duplican.
7. No copiar secretos, corpus, historiales de sesión ni fuentes completas a este expediente.
8. Todo cambio de producto requiere su autorización y flujo propios. Documentar no los sustituye.

Se entrega Markdown de trabajo, no un informe cerrado con PDF. No se ha generado ningún derivado ni se ha realizado commit/push en esta ronda de documentación.
