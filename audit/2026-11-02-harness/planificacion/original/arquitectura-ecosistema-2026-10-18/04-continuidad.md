# Continuidad, correcciones y cuestiones abiertas

Fecha: 2026-10-18. Estado: investigación abierta. Volver al [índice](00-indice.md).

## 1. Bitácora de evolución — no confundir con decisiones del propietario

Todas las entradas siguientes pertenecen a la conversación del 2026-10-18. El orden es secuencial; no se inventan horas de los turnos anteriores.

| Entrada | Alcance / cambio | Estado y destino |
|---|---|---|
| INV-01 | Investigación inicial de logs después de retirar una implementación no solicitada | Documento precedente conservado; contiene errores. No usar su recomendación como elección aprobada. Ver §2. |
| INV-02 | Lectura del código de pi-memory y auditorías iniciales de dos extensiones / primera ampliación a /Code | Veredictos categóricos retirados por alcance insuficiente y confusión de conceptos. No son ADRs. |
| INV-03 | Rubén excluye TUIOS y solicita nueva auditoría por el propio asistente, ahora con OpenAI | Exclusión vigente. Se corrige la falsa disyuntiva biblioteca/servicio y se investigan specgate/security-gateway. |
| INV-04 | Revisión de código y ensayos aislados en memoria | Resultados y límites centralizados en [03-evidencia.md](03-evidencia.md). Hipótesis híbrida, sin aprobación de implementación. |
| INV-05 | Profundización documental de Jart-OS | Cobertura fijada en [02-fuentes.md](02-fuentes.md); los hallazgos incorporan decisiones previas, estados y sustituciones. |
| INV-06 | Rubén pide dejar por escrito los descubrimientos para no perder el hilo | Se crea este expediente, se enlaza desde el handoff y se advierte sobre el documento inicial de logs. Solo cambios documentales dentro del router. Sin commit/push en esta entrega. |
| INV-07 | Rubén pide una arquitectura completa, optimizada y SOTA | Se redacta [05-arquitectura-propuesta.md](05-arquitectura-propuesta.md) y se contrasta con fuentes oficiales en [06-contraste-sota.md](06-contraste-sota.md). Incluye elecciones concretas, coste/fallos/cobertura y adopción. No implica ratificación ni implementación. |
| INV-08 | Rubén pide un esquema-diagrama porque cuesta visualizar la arquitectura | Se añade [07-esquema-visual.md](07-esquema-visual.md): flujo del modo gobernado, separación de permisos y composición standalone. Simplifica la propuesta; no añade servicios ni modifica producto. |
| INV-09 | Rubén señala que ya tenía esa arquitectura y pregunta qué se ha cambiado | Se rectifica: cambió la comprensión del asistente, no la arquitectura estructural del propietario. La propuesta 05 es principalmente consolidación; no hay mejora comparativa demostrada en esa entrega. Se exige justificar deltas concretos en lugar de volver a ratificar lo existente. |
| INV-10 | Rubén exige completar el trabajo pendiente | Se compara código actual con diseño y se ejecuta probe local final de 68 aserciones. [08-delta-recomendado.md](08-delta-recomendado.md) conserva la arquitectura y justifica once cambios; [09-evidencia-delta.md](09-evidencia-delta.md) fija pruebas, contrafactuales y límites. Comparación entregada; no cambios de producto ni despliegue. |

No se asigna aquí una nueva decisión de producto, un ADR aceptado ni una numeración E global. El expediente central de PI-agent está fuera del límite de escritura de esta tarea y no se ha modificado. La reversión de INV-06 consiste en retirar este directorio y sus dos referencias añadidas (handoff y aviso de investigación inicial), conservando intactos los fuentes externos.

## 2. Correcciones de los análisis anteriores

| ID | Afirmación anterior que no debe heredarse | Corrección y fundamento |
|---|---|---|
| R01 | TUIOS es un consumidor/segundo harness central del sistema | Rubén lo excluyó expresamente. No usarlo para justificar requisitos o servicios. |
| R02 | No existe demanda de contratos; esperar a un tercer consumidor | Los requisitos de autoridad existen por encargo del usuario y están desarrollados en D14–D20. La necesidad de aislamiento no depende de contar consumidores. |
| R03 | Todo componente externo entraría necesariamente en cada inferencia | Confusión entre responsabilidad, paquete, proceso y sincronía. Hay bibliotecas, comandos puntuales, validación local y servicios selectivos. |
| R04 | Lo universal solo puede ser schema; no se puede reutilizar implementación | C01/C02 y E07 muestran lógica reutilizable. Las fronteras entre lenguajes requieren mecanismos concretos, no prohibición general. |
| R05 | Ningún servicio debe bloquear un turno, ni autoridad ni logs | Sin autorización exigida no hay efecto; sin verificador requerido no hay verificado. D16/D20 y C10. Telemetría opcional tiene otra política: D35/D55. |
| R06 | El ledger actual es estándar, inmutable y suficiente como referencia para todos | E01–E03 y H12 muestran límites. No confundir API append-only, tamper-evidence, firma, completitud y protección del almacenamiento. |
| R07 | CANON de conocimiento, aprobación operativa y registro son una autoridad | H09 distingue sus responsabilidades. Cita sustentada no equivale a permiso. |
| R08 | Conviene pedir firma individual para cada acción como modelo general | C35 firma misión e intención; Jart-Contratos desarrolla envolventes/lotes. Hace falta reconciliar esos modelos, no reducirlos a botones de aprobación. |
| R09 | Jart-Contratos carece prácticamente de documentación | La documentación había sido trasladada al corpus. D14–D28 se leyeron completos. No confundir ausencia en la carpeta de código con ausencia de diseño. |
| R10 | El desacoplamiento de Jart-CLI prueba que compartir bibliotecas es malo | Prueba una decisión del alcance de ese producto, no una ley general. |
| R11 | ADR-0005 del router prohíbe componentes/servicios en todo el ecosistema | Tiene alcance del router; sigue restringiendo cualquier cambio suyo. No se extrapola como decisión global de Jart-OS. |
| R12 | Unified Logging no admite mensajes de aplicaciones | W03 documenta precisamente sus APIs para aplicaciones. No implica que cumpla el requisito de auditoría buscado. |
| R13 | Journal de systemd verifica mediante Merkle + raíz firmada | W04 describe consistencia y Forward Secure Sealing; la descripción inicial era incorrecta. |
| R14 | Triggers SQLite o flag de append garantizan WORM frente al propietario | Quien puede retirar protecciones/sustituir el almacén sigue siendo parte del modelo de amenaza. No se acreditó garantía WORM. |
| R15 | SLSA recomienda exactamente nuestro almacén SQLite, OTel API son solo tipos y las cifras de paquetes bastan para decidir | Afirmaciones no respaldadas adecuadamente. No usarlas como hechos; renovar investigación oficial si siguen siendo relevantes. |
| R16 | Todo JSON protocolario contradice el requisito de logs sin JSON | Protocolo, contenido de eventos y almacenamiento son decisiones diferentes. Mantener el requisito del usuario sin extenderlo por inferencia a todos los mensajes. |
| R17 | Auditoría «multidisciplinar + Dementor» significa varios revisores independientes | Fue el mismo asistente bajo varias perspectivas. No hubo delegación ni certificación externa. |
| R18 | La ejecución de un re-dispatch con contexto más corto demuestra compactación automática del host | El probe descrito en el historial simula ese nuevo envío; no acredita por sí solo la integración completa del evento de overflow con una compactación real del host. Revalidar antes de usar ese claim fuera del programa previo. |

**R19 — Novedad arquitectónica indebidamente atribuida:** INV-07 presentó como propuesta nueva una estructura ya descrita en D16/D19/D35/D46/D54 y parcialmente localizada en código. Se retira esa atribución. Reutilización, adaptadores, controlador separado, tickets y distinción de responsabilidades no son novedades de este asistente. La revisión aportó hallazgos y trazabilidad; las concreciones adicionales no tienen una mejora comparativa demostrada. No se ha cambiado código de producto.

**R20 — Infraestructura existente omitida:** INV-10 localiza GondolinProvider y más providers en `pi-intermediate/src/sandbox.ts`; no presentar una micro-VM nueva como innovación necesaria. El router también conserva puertos e inyección ya disponibles. El knapsack por defecto no justifica una sustitución sin medir: se corrige el coste del render.

**R21 — Nombre de producto no equivale a recorrido:** el proxy inspeccionado declara una extensión Pi y sí llama al evaluador en su entrypoint. Tiene gates/facts/canales parciales; no es prueba de transporte de inferencia o autoridad externa. El CLI real de FACTORY usa su dispatcher G3/empírico, no hereda por nombre las propiedades de VerificationFacade. Estos hechos actuales tienen precedencia sobre inferencias de wiring basadas solo en documentos antiguos.

El [documento inicial de logs](../../../research/logs-estandar-inmutable-investigacion.md) se conserva como antecedente advertido, no se borra ni se corrige silenciosamente el cuerpo histórico. Las dos primeras auditorías de arquitectura permanecen en la conversación como antecedentes retirados; no se transcriben como informes vigentes.

## 3. Cuestiones abiertas — investigar antes de pedir decisiones nuevas

| ID | Cuestión | Evidencia disponible | Próxima comprobación / criterio |
|---|---|---|---|
| Q01 | ¿Qué componentes existentes implementan hoy las funciones del arnés? | H04/H05/H11 | Seguir linaje diseño→repositorio→entrypoint→consumidor real. No inventariar nombres como capacidades operativas. |
| Q02 | ¿Qué contratos de dominio se comparten y cuáles son solo de integración? | H03/H04/H09 | Modelar misión, procedimiento, tarea, autorización y resultado por separado; conservar terminología y versiones. |
| Q03 | ¿Cómo se concilian misión firmada, patrones, delegación y recuperación? | D04 C35; D16; D20 D14 | Casos de rama preaprobada, fallo parcial, renovación, revocación y nonce concurrente. Ninguna excepción genérica abre catálogo. |
| Q04 | ¿Qué exige el modo standalone y qué exige el modo gobernado? | D55 §1; D16/D20; H06 | Definir capacidades y garantías por perfil. No instalar todo por una función local; tampoco eludir autoridad anunciada. |
| Q05 | ¿Quién posee cada dato y qué se puede consultar/cachear/exportar? | D35/D55; H07/H08 | Matriz de ownership para identidad, permisos, memoria, telemetría, evidencia y conocimiento. Un solo escritor lógico por responsabilidad donde proceda, no una DB única por dogma. |
| Q06 | ¿Cuál es la amenaza y la frontera de confianza efectiva? | D15/D17/D19 | Precisar permisos de agente, ejecutor, firmante y custodio; root fuera/dentro; canales MCP/shell/red/subagentes. Un UUID no acredita identidad intransferible por sí solo. |
| Q07 | ¿Qué garantías soporta cada agente/version? | D54; E06; D57 | Declaración de cobertura y recorrido real por host. Bloquear o declarar incapacidad; nunca afirmar full por defecto. |
| Q08 | ¿Qué significado tiene «no JSON» en cada ámbito? | Petición actual; D04 C30; D31/D32/D37 | No volver a preguntar en abstracto: distinguir restricción de logs, restricción de almacén CORE y protocolo. Revisar ratificaciones específicas antes de elegir formato. |
| Q09 | ¿Está aprobada alguna sustitución del almacenamiento CORE? | D31/D32/D34/D35/D37 | D32 es borrador. Buscar decisión posterior y código antes de declarar elegido SQLite o reabrir Postgres como si no existiera historia. |
| Q10 | ¿Cómo se distinguen identidad registral y pieza de juego? | D04 C19/C20/C31; D30; D34 actualización 7 | Mantener el alcance de cada identidad; no fundir UUID de infraestructura y ciudadanía por mera coincidencia técnica. |
| Q11 | ¿Qué se puede reaprovechar de los ledgers y qué hay que endurecer? | C04/C09; E01–E03 | Campos firmados, cabeza protegida, truncamiento, clave externa, retención, concurrencia y recuperación. No normalizar encima de garantías falsas. |
| Q12 | ¿Qué componente se extrae primero y cuánto cuesta de verdad? | Puertos C01/C10; lógica C02 | Elegir una sección vertical acotada después del mapa de ownership. Medir una segunda integración real antes de generalizar a doce agentes. |
| Q13 | ¿Qué versiones y estados están realmente vigentes? | D02/D21/D22/D34/D57 | Distinguir encabezados antiguos de actualizaciones; fijar código y comprobar adopción. No convertir un resumen de mercado histórico en SOTA actual. |
| Q14 | ¿Qué política de fallo corresponde a cada dependencia? | H07/H08; D16/D20 | Matriz por operación: degradable, denegación obligatoria, resultado incierto y recuperación. No una regla única para todos los componentes. |

Estas cuestiones son **trabajo de investigación**, no una lista de preguntas que Rubén deba responder ahora. Solo elevar decisiones irreducibles después de agotar las fuentes pertinentes.

## 4. Orden de continuación

Actualización INV-10: ya se entrega la comparación diferencial 08 con evidencia 09. Se han concretado aspectos de Q01/Q05/Q07/Q11/Q12 en los módulos inspeccionados; las preguntas de alcance global no se cierran artificialmente. No reiniciar otra arquitectura ni ejecutar el plan tecnológico 05 como si fuera un mandato. La continuación es aplicar/validar deltas concretos bajo el flujo autorizado del propietario de cada componente.

1. Retomar [00-indice.md](00-indice.md), no las primeras conclusiones de la conversación.
2. Revisar hashes/fechas de las fuentes que se vayan a usar; no asumir que todos los repos estuvieron congelados durante esta sesión.
3. Completar Q01/Q05 con un mapa por responsabilidad, propietario, estado, interfaz y consumidor. Separar implementación actual, diseño ratificado, propuesta y antecedente.
4. Reconciliar Q02/Q03/Q06: autorización, legislación y ejecución; evitar que un wrapper informativo se presente como frontera de seguridad.
5. Contrastar distribución y bootstrap reales (Q04/Q07/Q12) en el alcance que el usuario autorice. Hoy no se autoriza implementación ni instalación.
6. Usar el delta 08 y sus puertas como recomendación vigente; comprobar versiones/fuentes antes de aplicarlo. Mantener reversibilidad y deuda explícitas. No convertir ni 05 ni 08 en ratificación del propietario.
7. Actualizar hallazgos/fuentes/evidencia en cada avance material. Si cambia una conclusión, registrar su rectificación aquí antes de seguir.

## 5. Lo que no se ha decidido ni autorizado

- Ningún nuevo repositorio de contratos, kernel universal, broker, daemon o microservicio.
- Ninguna extracción/movimiento de código de router, memoria, CORE, FACTORY o proxy.
- Ningún backend ni formato definitivo de logs; ninguna aprobación de la propuesta SQLite inicial.
- Ninguna adopción automática de umbrales, tiers, composición del Triunvirato o economía institucional que los textos mantienen como propuesta.
- Ningún test persistente nuevo ni revocación de E-020 del router.
- Ningún cambio de secretos, cuentas, perfiles del SO, red, instalación o configuración.
- Ningún nuevo soak, llamada de inferencia, publicación o remote.

## 6. Registro documental de esta entrega (INV-06)

Creación de cinco Markdown de trabajo dentro de `docs/audit-2026-10-18/arquitectura-ecosistema/`, aviso al comienzo de la investigación inicial de logs y enlace desde `HANDOFF.md`. No se modifica el cuerpo de las fuentes externas, los specs de producto o el código. Verificación documental efectuada el 2026-10-18: todas las rutas, recuentos de líneas y SHA-256 del manifiesto coinciden con sus fuentes; todos los enlaces locales comprobados resuelven; `git diff --check -- .` no reporta errores. El estado VCS muestra únicamente este directorio nuevo y las dos referencias documentales modificadas dentro del router. No se ha realizado una auditoría funcional nueva, un commit ni un push.

## 7. Registro documental de la propuesta (INV-07)

Se añaden dos Markdown: propuesta integral (05) y contraste actual (06); se actualizan índice, hallazgos, continuidad y puntero del handoff. Se aclara en el aviso del antecedente de logs que no hay formato/backend **aprobado**, aunque ahora sí existe una recomendación concreta.

Nuevas comprobaciones: lectura de documentación oficial, relectura de fuentes locales y revisión estática; no se ejecutan servicios, ejemplos SDK, nuevas inferencias, sandbox, firma hardware ni pruebas funcionales de la arquitectura. Se registran los intentos de acceso web fallidos y las fuentes oficiales alternativas recuperadas. Las pruebas E01–E10 siguen atribuidas a la ronda anterior; no se cuentan otra vez.

La propuesta define puertas futuras y objetivos de rendimiento, no resultados obtenidos. No crea ADR aceptado, paquetes, dependencias, esquemas de producto, servicios, políticas vigentes ni rutas de instalación. Continúan E-020/E-028 y la ausencia de soak.

Verificación documental de INV-07: las 61 fuentes del manifiesto base y las cuatro lecturas Pi adicionales conservan hashes/recuentos; se registran huellas de 14 respuestas oficiales web sin redescargarlas para simular estabilidad. Los 32 enlaces locales comprobados resuelven, las fences están equilibradas y `git diff --check -- .` pasa. El diff de `src`, `scripts`, manifiestos de dependencias y `openspec` está vacío. Sin commit/push.

## 8. Cierre de la comparación diferencial (INV-10)

Entrega: 08-delta-recomendado.md y 09-evidencia-delta.md; actualización de hallazgos, índice, continuidad, avisos de precedencia y handoff. Probe `.probe-architecture-delta.mjs` local gitignored (E-020), retenido para reproducibilidad; SHA y alcance en 09. No se crea una suite versionada ni otra aplicación.

Ejecución final: 68 aserciones, 11 DB exclusivamente en RAM, 29 cuerpos de módulo evaluados con imports allowlisted. Sin I/O de red/proceso/escritura FS de aplicación; no proveedores, secretos reales, cambios de permisos ni servicios. Pasadas preliminares de 59/66 no se suman como validación independiente. PASS confirma también defectos esperados, no producto aprobado.

Aportaciones nuevas: ámbito por ID; escritores que eluden Fabric; replay que borra o reactiva revisiones; atomicidad de topic/FTS/vectores; presupuesto final incorrecto; recibo de fachada sin sujeto; candidatos restringidos y doble rerank. Referencia de composición reduce 2→1 reranks y mantiene el orden en su fixture. Se conserva arquitectura, puertos del router, backend Gondolin y knapsack; se retiran cambios tecnológicos inmediatos sin beneficio comparado.

**Cerrado:** el trabajo de comparación y recomendación dentro del alcance declarado. **No realizado:** implementación de los deltas, pruebas físicas/host real, migración o ratificación. No confundir ambos estados ni volver a afirmar que falta entregar el delta ya documentado.
