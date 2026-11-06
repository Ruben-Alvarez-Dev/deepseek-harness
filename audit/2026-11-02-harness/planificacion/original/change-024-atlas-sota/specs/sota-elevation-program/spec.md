# sota-elevation-program Specification (delta)

## ADDED Requirements

### Requirement: Programa en tres fases con puerta
El programa de mejora SHALL avanzar en tres fases en este orden: Atlas (inventario e índice),
Elevación (investigación del estado del arte por sección) y Propuestas (cambios argumentados).
Una fase SHALL NOT empezar hasta que el change que cierra la anterior esté archivado, con la única
excepción de los dossieres de decisión anticipada.

#### Scenario: fase prematura
- **WHEN** se propone un change de Fase 2 y el change de Fase 1 no está archivado
- **THEN** la revisión de la propuesta lo rechaza y cita este requisito

### Requirement: Decisión anticipada acotada
Una decisión que bloquee el programa y pueda tomarse leyendo un conjunto pequeño y enumerado de
documentos SHALL poder abrirse como change propio sin esperar al cierre de la fase en curso. Ese
change SHALL enumerar los documentos que lee, SHALL producir un único dossier de decisión y
SHALL NOT incluir cambios de código.

#### Scenario: dossier de decisión sobre Pi Durable
- **WHEN** se abre el change que compara Pi Durable con un `control/` propio antes de cerrar la Fase 1
- **THEN** su propuesta enumera los documentos que lee
- **AND** su única salida es un dossier de decisión

#### Scenario: decisión anticipada que crece
- **WHEN** un change de decisión anticipada incluye tareas de implementación
- **THEN** la revisión lo rechaza

### Requirement: Presupuesto y criterio de abandono
Cada fase y cada sección SHALL fijar antes de empezar un presupuesto de trabajo y SHALL registrarlo en
su change. Al agotarse el presupuesto sin cumplir la puerta, el trabajo SHALL detenerse y SHALL
presentarse al usuario un informe con lo conseguido y las lagunas, para que decida si amplía, recorta
alcance o abandona.

#### Scenario: presupuesto agotado
- **WHEN** se agota el presupuesto de la Fase 1 y `atlas verify` no pasa
- **THEN** el trabajo se detiene
- **AND** el usuario recibe el informe de lagunas y decide cómo seguir

#### Scenario: sección sin presupuesto
- **WHEN** se propone un change de sección sin presupuesto declarado
- **THEN** la revisión lo rechaza

### Requirement: Todo por OpenSpec y por escrito
Todo trabajo del programa SHALL pasar por un change de OpenSpec (propose, validate, apply, archive)
validado con la CLI en modo estricto. Todo artefacto del programa SHALL quedar en el repositorio:
changes en `openspec/changes/`, dossieres en `docs/sota/`, mapa en `docs/atlas/` y revisiones en
`reviews/` con numeración consecutiva.

#### Scenario: validación estricta
- **WHEN** se cierra un change del programa
- **THEN** `openspec validate <id> --strict` termina sin errores

#### Scenario: artefacto fuera del repositorio
- **WHEN** una conclusión del programa solo existe en una conversación o en un fichero fuera del repositorio
- **THEN** no cuenta como entregada

### Requirement: Carta de esencia
El programa SHALL mantener `docs/atlas/ESENCIA.md` con los invariantes de Pi y los propios, cada uno
con su fuente verificada contra la versión capturada y con una comprobación. La carta SHALL ser
aprobada por el usuario antes de cerrar la Fase 1 y SHALL modificarse solo mediante un change dedicado.

#### Scenario: invariante sin fuente vigente
- **WHEN** un invariante de Pi no se localiza en la documentación de la versión capturada
- **THEN** no entra en la carta como invariante y se lista como candidato sin verificar

#### Scenario: propuesta que declara su efecto
- **WHEN** se propone un change de Fase 3
- **THEN** su `proposal.md` indica, para cada invariante de la carta, si lo respeta, lo refuerza o lo afecta

#### Scenario: propuesta que rompe un invariante
- **WHEN** un change de Fase 3 afecta a un invariante y no existe un change previo que modifique la carta
- **THEN** la revisión lo rechaza

### Requirement: Elevación por secciones y capacidades
La Fase 2 SHALL dividirse en las secciones de `docs/atlas/SECCIONES.md`, con un change por sección, y
SHALL tener como máximo una sección abierta a la vez. Cada capacidad de la sección SHALL producir un
dossier con: estado actual citado a fichas del Atlas, estado del arte con fuentes externas fechadas,
brecha expresada con una medida y opciones con sus costes. Cuando no exista medida propia disponible,
el dossier SHALL declararlo en lugar de estimarla.

#### Scenario: segunda sección en paralelo
- **WHEN** hay un change de sección abierto y se propone otro
- **THEN** la revisión lo rechaza hasta que el primero esté archivado

#### Scenario: dossier sin medida
- **WHEN** un dossier describe la brecha solo con adjetivos y no declara que falta la medida
- **THEN** la revisión lo devuelve como incompleto

### Requirement: Trazabilidad de afirmaciones
Toda afirmación de hecho en un dossier o en una propuesta SHALL citar una ficha del Atlas, con su
identificador y el prefijo del hash de su contenido, o una fuente externa con URL y fecha de consulta,
y SHALL llevar la etiqueta `[verificado]` cuando se haya comprobado contra la fuente o en disco, o
`[claim]` cuando solo se reproduzca lo que la fuente afirma.

#### Scenario: afirmación sin fuente
- **WHEN** la revisión de trazabilidad encuentra una afirmación de hecho sin cita
- **THEN** el documento no pasa la puerta

#### Scenario: cita a ficha inexistente
- **WHEN** un documento cita un identificador que no existe en el índice
- **THEN** la comprobación de citas falla y nombra el identificador

#### Scenario: cita a contenido que ha cambiado
- **WHEN** el hash citado no coincide con el de la ficha en el índice actual
- **THEN** la comprobación de citas la señala para revisión

### Requirement: Revisión independiente en cada puerta
Cada puerta de fase y cada cierre de sección SHALL pasar por tres revisiones independientes: una que
busca el defecto que invalida el conjunto, una que intenta falsar las afirmaciones contra sus fuentes
y una de cobertura y trazabilidad. Los revisores SHALL recibir los artefactos y no las conclusiones del
autor. El informe SHALL registrarse en `reviews/` y los hallazgos bloqueantes SHALL resolverse o
aceptarse de forma explícita por el usuario antes de archivar.

#### Scenario: hallazgo bloqueante abierto
- **WHEN** una revisión deja un hallazgo bloqueante sin resolver ni aceptar
- **THEN** el change no se archiva

#### Scenario: informe registrado
- **WHEN** se cierra una puerta
- **THEN** existe en `reviews/` un informe con los hallazgos de las tres revisiones y su resolución

### Requirement: Aprobación del usuario antes de aplicar
Ninguna propuesta de Fase 3 SHALL aplicarse sin aprobación explícita del usuario para ese change.
La aprobación de un change SHALL NOT extenderse a otro.

#### Scenario: aplicar sin aprobación
- **WHEN** un change de Fase 3 no tiene aprobación registrada
- **THEN** sus tareas no se ejecutan
