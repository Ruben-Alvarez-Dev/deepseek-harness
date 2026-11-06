# Hallazgos e implicaciones

Fecha: 2026-10-18. Estado: investigación abierta. Fuentes D/C/W: [manifiesto](02-fuentes.md); S/P: [contraste adicional](06-contraste-sota.md).
Comprobaciones E: [evidencia anterior](03-evidencia.md); V00–V13: [ejecución INV-10](09-evidencia-delta.md). Las implicaciones INT no son decisiones aprobadas.

## H01 — El marco previo excede las extensiones Pi

**DOC:** D03 §1 y D04 §§1–3 distinguen territorio, infraestructura, organización y ejecución. Pi es uno de los runtimes posibles, no la definición de Jart-OS. D04 C25 fija el motor en el molde y exige nueva `template_version` para cambiarlo.

**INT:** portabilidad de capacidades del arnés no equivale a reemplazar el loop de todos los agentes ni a migrar una identidad de runtime sin trámite. El diseño debe contemplar varios agentes sin reducirlos a una API común ficticia.

## H02 — Componente, paquete, proceso y confianza son ejes distintos

**DOC/COD:** D46 define lógica agnóstica y adaptadores heterogéneos; C01/C02 muestran lógica y puertos parcialmente reutilizables. W01 documenta integraciones por biblioteca, servicio y Wasm para una misma responsabilidad.

**EXE:** E07 ejecutó packing sin runtime Pi.

**INT:** una extensión puede incorporar una biblioteca compartida sin necesitar otra extensión activa. Un servicio no es la única forma de reutilización. Dos procesos bajo control modificable del mismo agente no constituyen por sí solos autoridades independientes. Diferencias de lenguaje no prohíben reutilizar lógica mediante ejecutables o bindings, aunque no impliquen una biblioteca nativa común.

## H03 — Misión, procedimiento y tarea no son sinónimos

**DOC:** D04 C35, línea 320, precisa C20/C21:

- misión/plan = intención concreta; procedimiento = técnica reutilizable; tarea = operación del catálogo;
- se firma la misión y su objetivo queda dentro de los bytes autorizados;
- firma válida y pertenencia de cada paso al catálogo son comprobaciones independientes;
- destino, vigencia y nonce forman parte del control;
- el agente no puede ampliar su catálogo; los comandos libres exigen una excepción diferenciada;
- ante fallo no hay improvisación fuera de la misión aprobada.

**INT:** el dominio de órdenes no se resuelve con un schema genérico ni con un booleano `approved`. Requiere representar alcance, secuencia, efectos y autorización. Mi recomendación anterior de firma por cada acción no reflejaba esta distinción.

**ABIERTA:** reconciliar C35 con contratos FSM, ramas y plantillas paramétricas de D16/D20, sin interpretar una plantilla amplia como autorización ilimitada.

## H04 — Jart-Contratos ya contiene un diseño propio del arnés

**DOC:** D14–D20 documentan requisitos REQ-00…10, decisiones D1…16, contratos FSM, capacidades de un uso, identidad, congelación de artefactos, delegación atenuante, firmas por lotes y compartimentos. D14 declara diseño en curso y nada desplegado. D23–D28 amplían el estudio; el análisis preliminar 06 está superseded según D14.

D20 D16 distingue **[A] arnés**, **[S] sustrato de confianza**, **[P] plataforma** y **[X] transversal**. D17 explicita que solo se controla lo que atraviesa el mediador.

**INT:** antes de crear otro gestor hay que mapear necesidades contra esta pieza. El prototipo C08 no demuestra su implementación ni define su arquitectura; sus defectos no deben atribuirse automáticamente a todo Jart-Contratos.

## H05 — Núcleo agnóstico y cobertura de adaptadores ya están diseñados

**DOC:** D41–D54 describen `ActionRequest → evaluate → Verdict`, políticas comunes y traducción por host. D54 §4 exige declarar bloqueo, herramientas nativas/MCP, subagentes, huecos y fallback. D55 §5 conserva el antiguo Jart-HARNESS como referencia, indicando que su núcleo ya tenía implementación en Jart-PROXY.

**COD/EXE:** C03/E06 muestran que un vocabulario de herramienta distinto cambia el resultado del gate actual. Esto prueba un límite de reutilización sin adaptador, no una evasión demostrada del host Pi activo.

**INT:** no construir Jart-NESS de nuevo por leer su roadmap antiguo. Verificar linaje hasta Jart-PROXY, su código actual y cada camino de ejecución. Una integración debe declarar si observa, coopera o controla efectivamente; no prometer seguridad universal por tener hooks.

## H06 — La instalación independiente tiene precedente explícito

**DOC:** D55 §1 exige que HUNTER, URA y OS-AI operen standalone; conectarlos añade capacidad, no dependencia obligatoria entre productos. D61 permite FACTORY desde cualquier agente capaz de ejecutar su CLI y excluye daemon, servidor y descomposición distribuida de su propio núcleo.

**INT:** independencia de instalación no exige duplicación de implementación, y esa regla no autoriza desactivar un control declarado obligatorio. D61 es un límite de FACTORY, no una prohibición universal de servicios en Jart-OS. El ADR-0005 del router también tiene alcance propio.

## H07 — Jart-CORE ya separa registro y telemetría

**DOC:** D55 §3.3 y D35 §§2–4 registran la decisión de 2026-08-08: `registry` arranca primero; `telemetry` puede depender de él, nunca al revés. La caída de telemetría no impide arrancar o servir. D35 asigna al registro las autorizaciones registradas, no su enforcement.

D34, leído hasta actualización 14, describe implementación progresiva, librería sin servicio residente, wrapper HTTP y conexión puntual Python→BOARD. Son antecedentes fechados, no comprobaciones nuevas del despliegue actual. La actualización 14 advierte que ese mecanismo puntual no fija el transporte de telemetría.

**INT:** no crear otra autoridad central de datos o un daemon de logs por desconocer estas decisiones. Tampoco convertir CORE en dueño del loop agéntico, del ejecutor y de la semántica de todos los dominios.

## H08 — Diagnóstico, memoria y libro institucional no deben fundirse

**DOC:** D04 C28, línea 315, asigna al libro plazas/revocaciones, veredictos, catálogo, versiones y hashes de actas. Excluye mensajería, estado vivo y memoria. C23 conserva el acta en conocimiento; C27 diferencia bus de trabajo y canal de mando. D53 describe journal de evaluación; D55/D35 describen telemetría: no son automáticamente el mismo dato.

**INT:** compartir correlación, identidad y verificación de integridad no exige un único almacén ni la misma retención. La caída del diagnóstico puede ser tolerable; la ausencia de evidencia de autorización puede impedir una acción sensible. No aplicar universalmente «fire-and-forget» o «nunca bloquear».

**ABIERTA:** determinar propietario y contrato de cada clase de evento antes de elegir backend o feed. No hay formato de logs aprobado.

## H09 — Hay varias autoridades distintas bajo la palabra «canon»

**DOC/COD:** D08 define ratificación arquitectónica; D35 define registro; C11 verifica procedencia/citas; D16 define autorización de ejecución. D10 separa autoridad, realidad observada y freshness en la representación.

**INT:** una cita sustentada no concede permiso; una firma no demuestra verdad; un registro de identidad no prueba salud ni despliegue. No externalizar todas esas responsabilidades bajo una supuesta única «autoridad CANON».

## H10 — Gobierno y evaluación ya están diferenciados, con detalles abiertos

**DOC:** D03 §§2–3 registra el gobierno transversal y que el usuario no es el gate rutinario. Mantiene abiertos los detalles internos del Triunvirato, umbrales y economía. D38/D39 son propuestas/semillas explícitas, no licencia para implementar sus cifras o metáforas. D04 distingue La Fábrica institucional (RRHH), pipelines T6 y aplicaciones instaladas.

**INT:** no equiparar automáticamente Jart-FACTORY productor de artefactos con toda la institución Fábrica, ni el score de un verificador con presupuesto de tokens o permiso jurídico. La misma palabra «tier» tampoco identifica tiers de infraestructura, grado del agente y score de sesión.

## H11 — El cableado real es condición de reutilización

**DOC:** D55 §5 y D57 describen controles probados pero no alcanzados por el camino de producción del proxy en commits fechados; D57 sustituye partes de D56/D58. También detectan nombres de herramientas que el host no emitía.

**COD:** C10 muestra puertos reales y controles fail-closed en la fachada actual de FACTORY; no acredita que cada CLI ejecute todos los anillos para todas las operaciones.

**INT:** la próxima validación debe atravesar entrada real → decisión → ejecutor → efecto/denegación → evidencia. No basta una suite contra entradas inventadas. Las cifras históricas de D57 no se presentan como estado actual de Pi o del proxy.

## H12 — El ledger de pi-memory no es una implementación certificada del sustrato

**COD:** C04 muestra campos fuera de la huella, verificación condicional de firma y ausencia de triggers de protección en el esquema inspeccionado. C06 sitúa las claves de firma de memoria en la misma base.

**EXE:** E01–E03 muestran que cambiar `ref`, retirar una firma y borrar el último evento pueden conservar un resultado válido; alterar contenido sin actualizar su hash sí se detecta.

**INT:** no copiarlo como log «inmutable por diseño». Separar protección contra modificación, detección de cambios, completitud, identidad del firmante y custodia. Ni triggers ni otra API impiden por sí solos que el dueño privilegiado sustituya la base.

## H13 — Atomicidad y reconstrucción requieren trabajo específico

**COD:** C05 actualiza primero la vista y después el ledger, sin una transacción envolvente en `save()`. Su replay interpreta saves y forgets, no reconstruye todos los efectos de mantenimiento.

**EXE:** E04 dejó una fila sintética de proyección tras inyectar un fallo de append. No es una prueba de caída física del producto completo.

**INT:** la co-ubicación no garantiza atomicidad; separar procesos tampoco la resuelve. Si hay una misma DB, estudiar transacción común; si no, definir recibos, idempotencia y recuperación, sin prometer ACID distribuido.

## H14 — El empaquetado de memoria todavía depende del layout de desarrollo

**COD:** C07 declara dependencia `file:../pi-intermediate` y reexport físico `../../pi-intermediate/src/index.ts`. `PiCore` compone además selección, claves, seguridad y presupuesto.

**EXE:** E08 muestra el destino que produciría ese deep import en un layout convencional por nombre de paquete. No se ejecutó una instalación limpia.

**INT:** separar motor y composition root antes de afirmar instalación autónoma en otros agentes. La independencia física de carpetas no acredita todavía distribución independiente.

## H15 — Los prototipos de firma y permisos no acreditan autoridad humana

**COD:** C08 acepta la firma suministrada o la genera, y selecciona ejecución por estado aprobado. C06 no incluye `locator.payload` ni `confidence` en la representación firmable de una proposición.

**EXE:** E05 aceptó una cadena arbitraria como firma y ejecutó solo un stub; E09 comprobó que modificar locator/confidence no cambia los bytes canónicos.

**INT:** distinguir firma registrada, firma criptográficamente válida, identidad autorizada y aprobación del usuario. Ninguno de estos ensayos demuestra que un servicio vulnerable esté desplegado o que la integración de Jart-CANON exista.

## H16 — Los documentos no permiten elegir almacenamiento por inercia

**DOC:** D31/D35/D37 contienen restricciones de producción contra JSON/SQLite como almacén de CORE. D34 relata su secuencia de implementación. D32 propone consolidar en SQLite y se declara borrador pre-dementor que cambia la ley de persistencia, pendiente de ratificación.

D04 C30 usa JSON para el protocolo v1. Esto no convierte JSON en formato aprobado de logs ni vuelve equivalentes protocolo y almacenamiento. El requisito actual de Rubén de logs sin JSON se conserva.

**INT:** no declarar que el documento más nuevo gana automáticamente ni que el código existente revoca una política. Registrar la tensión y seguir su aprobación específica. La síntesis no autoriza una migración.

## H17 — Continuidad estructural y delta sobre implementación

**DOC/COD:** responsabilidad, motores/adaptadores, independencia y autoridad separada ya estaban en los diseños y parcialmente en el código. No son una arquitectura nueva del asistente.

**INT:** conservar esa estructura y aplicar solo cambios justificados. [08-delta-recomendado.md](08-delta-recomendado.md) es la recomendación vigente, con once intervenciones y evidencia INV-10; tiene precedencia sobre opciones inmediatas no demostradas de la consolidación 05. La comparación está entregada, no sus cambios de producto.

## H18 — El optimizador existente necesita límites de recursos y evaluación semántica

**COD:** `pi-intermediate/src/token-ring.ts:22–24` estima tokens por caracteres; `:125–146` elimina descripciones de schemas; `:159–169` construye una matriz O(n·B); `:318–320` puede eliminar expresiones de incertidumbre. El probe `:411–416` cuenta preservación léxica, no equivalencia de significado. El CCR `:107` es un mapa en memoria.

**INT:** no reutilizar todas sus transformaciones como una garantía de compresión segura/reversible ni como optimización universal. Seleccionar, deduplicar y recuperar antes de comprimir; preservar autoridad e incertidumbre; limitar candidatos/memoria; usar tokenizadores y evaluación de calidad cuando proceda. No se ha demostrado un fallo semántico de producción ni una mejora global de coste.

**EXE/INT INV-10:** V05/V06 reproducen límites de presupuesto y preservación; el comando Caveman es opt-in en el adapter leído. Packing exacto con defaults pequeños resulta barato en la medición sintética de 09: conservarlo y corregir el coste de render antes de introducir heurísticas nuevas.

## H19 — Las primitivas de autoridad requieren precisión adicional

**DOC:** D16 mezcla tickets opacos con caveats cifrados estilo macaroon; son mecanismos distintos. S13 condiciona Ed25519 en PIV a firmware compatible (desde 5.7 en la documentación consultada); S14 documenta P-256 para Secure Enclave. P02 declara que una extensión Pi tiene los permisos del proceso que la carga, y P01/P04 permiten sustituir herramientas y descubrimiento mediante SDK.

**INT:** empezar con tickets server-side atenuantes y un puerto de firma que declare algoritmo/hardware reales. No prometer no-repudio jurídico o consentimiento sobre contenido solo por usar hardware. SDK controlado ofrece un punto de integración, no aislamiento demostrado. La declaración de cobertura y la plataforma siguen siendo obligatorias.

## H20 — El ámbito de search no cubre accesos por ID

**COD/EXE:** `memory-control.ts:136–163`, V02: Control de tenant A puede obtener e invalidar un record B mediante Backend/Store locales reales; get ya incrementó el contador de acceso. Search sí aplica su scope.

**INT:** ámbito en el backend/puerto para toda operación, antes de efectos de lectura; contexto de principal confiable y mantenimiento scoped. No declarar vulnerada una instalación sin comprobar sus controles envolventes. Delta D02.

## H21 — Hay escritores que eluden el ledger de Fabric

**COD/EXE:** `memory-gateway.ts:42`, `plane.ts:74`, `hooks.ts:100`, V12: gateway y flush escriben sin evento; reconstrucción de sesión añade memoria pero solo registra lifecycle. La tool Pi que usa Fabric no cubre automáticamente los demás entrypoints.

**INT:** una sola frontera de comandos con las piezas existentes, no otro servidor. Delta D01; sin mediación completa no puede afirmarse que el ledger reconstruya toda la proyección.

## H22 — Replay puede borrar o reactivar datos incorrectamente

**COD/EXE:** `fabric.ts:208–227`, V12: reemplazar con el historial parcial elimina el record escrito por gateway; dos revisiones del mismo topic pasan de invalidated/active a active/active tras replay.

**INT:** guard de completitud y ámbito antes de reemplazar; checkpoint verificado y eventos con todos los efectos de las mutaciones. No reconstrucción destructiva con historia parcial. Delta D04.

## H23 — Atomicidad falla también en la revisión previa y los índices

**COD/EXE:** `memory.ts:154–181`, V03: el duplicado invalida el topic antes de fallar el INSERT. El save seguido de append fallido deja memoria, FTS y vector. La transacción de referencia misma DB revierte los tres y conserva el original.

**INT:** unidad de trabajo de comando con backend compatible; no migración de memoria a otro motor por este defecto. Delta D03. No acredita transacción remota ni crash físico.

## H24 — El presupuesto no contabiliza el texto completo emitido

**COD/EXE:** `memory-dma.ts:49–67`, V05: presupuesto 32→1016 según el propio estimador; 0→cabecera de 8. El coste usa summary/ID y omite parte del render.

**INT:** compartir renderer/coste, reservar overhead y emitir vacío para cero/no válido. La referencia acotada conserva knapsack y cumple los presupuestos probados. Delta D07; no conteo exacto de proveedor.

## H25 — Candidatos restringidos y rerank duplicado

**COD/EXE:** `fabric.ts:94–100`, `memory-control.ts:122–134`, `retrieval-fabric.ts:82–121,130–164`; V07/V13: dense solo reordena el shortlist léxico, aunque haya más corpus; la composición llama dos veces al mismo reranker.

**INT:** candidatos independientes autorizados y un rerank final. Referencia: 2→1 llamadas con el mismo orden en fixture; candidato B recuperado en un caso. No mejora de calidad/latencia global probada. Delta D08.

## H26 — La fachada de verificación puede emitir prueba no ligada al artefacto

**COD/EXE:** FACTORY `verification/facade.ts:198–245`, V10: sin `files`, dos artefactos con artifactHash distinto producen hash/payload de firma iguales. Los guards sin verificador y required-unavailable sí bloquean.

**COD:** package bin→`cli/main.ts`→dispatcher G3/empírico no equivale a invocación de VerificationFacade.

**INT:** sujeto y alcance obligatorios en el recibo, manteniendo mecanismos de firma existentes si sirven. No atribuir el camino vulnerable al CLI ni a todo FACTORY. Delta D06.

## H27 — El proxy actual está conectado, pero su perfil/canales son parciales

**COD/EXE:** `P/index.ts:172–192,247–255,314–329`, `P/scoring.ts:96–121`, V08: tool_call evalúa gates incluso sin skills; perfil ELITE fijo deja fuera SCOPE y acepta el write fuera de cwd. Facts de SDD/AV/premises no están alimentados; no se registra user_bash en ese entrypoint.

**INT:** no llamar «todo unwired» ni «autoridad externa» a esa extensión. Declarar perfil real y completar facts/adaptadores; controles de ámbito del perfil gobernado no dependen de reputación. Delta D09.

## H28 — Micro-VM y selección de sandbox ya tienen implementación

**COD/EXE:** `I/sandbox.ts`, V09: GondolinProvider existente, política no soportada rechazada y mount readonly construido. Bwrap no incorpora el workdir solicitado en la invocación inspeccionada.

**INT:** validar y corregir adapters actuales antes de añadir infraestructura. No se ejecutó aislamiento físico ni se certificó el CLI. Delta D10. La micro-VM no era una novedad de la propuesta 05.
