# pi-atlas-inventory Specification (delta)

## ADDED Requirements

### Requirement: Snapshot con manifiesto y archivo
`atlas fetch` SHALL ser el único comando que accede a la red. SHALL escribir el contenido crudo en
`atlas/data/`, un archivo comprimido en `atlas/snapshots/` y un `atlas/manifest.json` con fecha y
hora, commit de `main` de upstream, recuento por fuente según la propia fuente y `sha256` de cada
fichero y del archivo comprimido.

#### Scenario: manifiesto completo
- **WHEN** termina `atlas fetch`
- **THEN** existe `atlas/manifest.json` con fecha, commit, recuento por fuente y `sha256` por fichero
- **AND** cada fichero de `atlas/data/` coincide con su `sha256` del manifiesto
- **AND** el archivo de `atlas/snapshots/` coincide con su `sha256` del manifiesto

#### Scenario: actualización incremental
- **WHEN** se ejecuta `atlas fetch --since <fecha>` sobre un snapshot existente
- **THEN** el manifiesto refleja el nuevo commit, la nueva fecha y los recuentos actualizados
- **AND** se archiva un snapshot nuevo sin borrar el anterior

### Requirement: Alcance del inventario
El inventario SHALL cubrir cuatro bloques: Pi upstream, Pi Durable, el entorno público (pi.dev y
ecosistema npm) y lo propio (el repositorio y la configuración de `~/.pi/agent`). De las PRs cerradas
sin fusionar y de las issues cerradas como no planificadas SHALL capturar también los comentarios.
SHALL registrar en el manifiesto toda fuente fuera de alcance con su motivo.

#### Scenario: los cuatro bloques presentes
- **WHEN** se consulta el índice tras `atlas build`
- **THEN** hay fichas con origen en upstream, en Pi Durable, en el entorno público y en lo propio

#### Scenario: motivo de un rechazo
- **WHEN** se muestra una PR cerrada sin fusionar
- **THEN** sus comentarios están en el índice como fichas unidas a ella

#### Scenario: exclusiones declaradas
- **WHEN** una fuente queda fuera de alcance
- **THEN** figura en el manifiesto con su motivo
- **AND** `docs/atlas/MAPA.md` la lista en una sección de exclusiones

### Requirement: Ficha por elemento con identificador estable
Cada elemento inventariado SHALL tener una ficha con un identificador estable y legible, un tipo
tomado de una lista cerrada, paquete y superficie cuando apliquen, título, cuerpo, localizador en su
fuente, estado, versión cuando aplique, fechas, URL y `sha256` del contenido. El identificador SHALL
ser el mismo entre reconstrucciones mientras el elemento exista en la fuente.

#### Scenario: identificador estable entre snapshots
- **WHEN** se reconstruye el índice desde un snapshot posterior en el que la issue 10607 sigue existiendo
- **THEN** su ficha conserva el identificador `issue:10607`

#### Scenario: tipo fuera de la lista
- **WHEN** un extractor intenta crear una ficha con un tipo que no está en la lista cerrada
- **THEN** `atlas build` falla y nombra el extractor y el tipo

### Requirement: Relaciones con evidencia literal
El sistema SHALL registrar las relaciones entre fichas como aristas con un tipo tomado de una lista
cerrada y con la evidencia literal de la que se extrajo cada una. SHALL NOT crear aristas inferidas
por un modelo. SHALL distinguir la relación de cierre, que solo se crea cuando la fuente la declara,
de la simple mención.

#### Scenario: PR que cierra una issue
- **WHEN** el cuerpo de una PR contiene `fixes #10607`
- **THEN** existe una arista de cierre entre la PR y `issue:10607` cuya evidencia es ese fragmento

#### Scenario: referencia suelta
- **WHEN** el cuerpo de una PR contiene `#10607` sin palabra de cierre
- **THEN** la arista creada es de mención y no de cierre

### Requirement: Capacidades como unidad de trabajo
El inventario SHALL agrupar las fichas en capacidades declaradas en `atlas/capabilities.tsv`, donde
cada fila asigna fichas a una capacidad por identificador o por patrón de identificador y lleva autor
y justificación. Toda ficha que no sea de comunidad (issue, PR, discussion, comentario o release)
SHALL pertenecer al menos a una capacidad.

#### Scenario: ficha sin capacidad
- **WHEN** una sección de documentación, un flag, un setting, un evento o una herramienta no pertenece a ninguna capacidad
- **THEN** `atlas verify` falla y lista la ficha

#### Scenario: fila sin justificar
- **WHEN** una fila de `atlas/capabilities.tsv` no tiene autor o justificación
- **THEN** `atlas build` falla y señala la fila

### Requirement: Comparativa con lo propio
Las relaciones de solape entre elementos propios y de upstream SHALL proceder únicamente de
`atlas/overlaps.tsv`, con autor y justificación por fila. Cada requisito de las specs propias SHALL
tener al menos una fila: un solape con un elemento de upstream o de Pi Durable, o la declaración
expresa de que no tiene equivalente.

#### Scenario: requisito propio sin clasificar
- **WHEN** un requisito de una spec propia no tiene ninguna fila en `atlas/overlaps.tsv`
- **THEN** `atlas verify` falla y lista el requisito

#### Scenario: solape sin justificar
- **WHEN** una fila de `atlas/overlaps.tsv` no tiene autor o justificación
- **THEN** `atlas build` falla y señala la fila

### Requirement: Cobertura medida contra la fuente
`atlas verify` SHALL comparar el índice con las fuentes y SHALL fallar con código de salida distinto
de cero si: el número de fichas de issues, PRs, discussions o releases difiere del recuento del
manifiesto; algún encabezado de algún documento capturado carece de ficha; o alguna fila de las tablas
de referencia (comandos, flags, settings, variables de entorno, atajos) carece de ficha. SHALL listar
cada laguna encontrada.

#### Scenario: cobertura completa
- **WHEN** todos los recuentos coinciden y no falta ninguna ficha
- **THEN** `atlas verify` termina con código 0 e imprime los recuentos por tipo

#### Scenario: falta un elemento
- **WHEN** el manifiesto declara 6.903 issues y el índice contiene 6.902
- **THEN** `atlas verify` termina con código distinto de cero
- **AND** imprime el identificador que falta

### Requirement: Sin credenciales en el inventario
De `~/.pi/agent`, `atlas fetch` SHALL leer únicamente una lista blanca: `settings.json`, `trust.json`
y los nombres de las entradas de `extensions/` y `npm/`. SHALL registrar claves y estructura y
SHALL NOT registrar valores que coincidan con un patrón de credencial. SHALL NOT leer ningún otro
fichero de ese directorio.

#### Scenario: fichero fuera de la lista blanca
- **WHEN** `atlas fetch` recorre `~/.pi/agent`
- **THEN** no abre `auth.json`, `models.json`, `models-store.json`, `mcp-adapter.json`, `mcp-cache.json` ni nada bajo `sessions/`, `logs/` o `backups/`

#### Scenario: patrón de secreto detectado
- **WHEN** un fichero de `atlas/data/` o una ficha contiene un patrón de credencial conocido
- **THEN** la prueba de secretos falla y nombra el fichero o la ficha sin imprimir el valor

### Requirement: Mapa, comparativa y secciones generados
El sistema SHALL generar desde el índice `docs/atlas/MAPA.md` (estructura por paquete, superficie,
capacidad y elemento), una tabla por tipo de ficha en `docs/atlas/inventario/`,
`docs/atlas/COMPARATIVA.md` (upstream, Pi Durable y lo propio) y `docs/atlas/SECCIONES.md` (las
secciones de la Fase 2 con sus capacidades y el recuento de fichas de cada una). Estos ficheros
SHALL NOT editarse a mano y cada uno SHALL llevar el digest del índice del que se generó.

#### Scenario: mapa al día
- **WHEN** se regenera el mapa tras un `atlas build`
- **THEN** el digest impreso en `docs/atlas/MAPA.md` coincide con el del índice

#### Scenario: mapa desfasado
- **WHEN** el digest de un fichero generado no coincide con el del índice
- **THEN** `atlas verify` lo señala como desfasado

#### Scenario: lista de secciones
- **WHEN** se genera `docs/atlas/SECCIONES.md`
- **THEN** cada capacidad aparece en exactamente una sección
- **AND** cada sección muestra cuántas capacidades y cuántas fichas contiene
