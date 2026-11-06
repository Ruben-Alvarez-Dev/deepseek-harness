# pi-atlas-index Specification (delta)

## ADDED Requirements

### Requirement: Índice SQLite que no necesita modelos
El sistema SHALL mantener el inventario en un único fichero SQLite con tablas relacionales para
fuentes, fichas y aristas y con índices de texto completo FTS5. La construcción y la consulta SHALL
funcionar completas sin ningún LLM y sin ningún modelo de embeddings, y sin dependencias externas al
runtime de Node.

#### Scenario: construcción sin red
- **WHEN** se ejecuta `atlas build` con la red deshabilitada sobre un snapshot existente
- **THEN** el índice se construye correctamente

#### Scenario: consulta sin red
- **WHEN** se ejecuta `atlas query` con la red deshabilitada
- **THEN** devuelve resultados

### Requirement: Construcción determinista
`atlas build` SHALL ser una función del snapshot: sin acceso a red, sin dependencia del reloj y sin
aleatoriedad. SHALL calcular un digest de contenido sobre las filas de fichas y aristas en orden
canónico y SHALL guardarlo en el índice.

#### Scenario: mismo snapshot, mismo digest
- **WHEN** se ejecuta `atlas build` dos veces sobre el mismo snapshot
- **THEN** ambos índices tienen el mismo digest de contenido

#### Scenario: snapshot alterado
- **WHEN** un fichero del snapshot no coincide con su `sha256` del manifiesto
- **THEN** `atlas build` falla y nombra el fichero

### Requirement: Recuperación léxica con fusión de rangos
`atlas query` SHALL combinar una búsqueda BM25 por palabras, insensible a diacríticos y con mayor peso
para el título que para el cuerpo, con una búsqueda por trigramas para subcadenas de identificadores,
y SHALL fusionar ambos resultados por rangos recíprocos. Para una misma consulta sobre un mismo
índice, el orden de los resultados SHALL ser siempre el mismo.

#### Scenario: diacríticos
- **WHEN** se busca `sesion`
- **THEN** aparecen las fichas que contienen `sesión`

#### Scenario: subcadena de identificador
- **WHEN** se busca `ToolRender`
- **THEN** aparece la ficha de `registerToolRenderer`

#### Scenario: orden estable
- **WHEN** se repite la misma consulta sobre el mismo índice
- **THEN** el resultado es idéntico, incluido el orden

### Requirement: Consultas literales sin error de sintaxis
`atlas query` SHALL tratar la entrada del usuario como texto literal y SHALL escaparla antes de pasarla
al motor de texto completo, de modo que ningún carácter de la consulta se interprete como operador.

#### Scenario: consulta con guiones, puntos o almohadilla
- **WHEN** se busca `--no-mcp`, `codemode.mode` o `#10607`
- **THEN** la consulta no produce error de sintaxis
- **AND** devuelve la ficha del flag, del setting o de la issue correspondiente

#### Scenario: consulta de menos de tres caracteres
- **WHEN** se busca un término de dos caracteres
- **THEN** la búsqueda por palabras se ejecuta y la de trigramas se omite sin error

### Requirement: Filtros y expansión por grafo
`atlas query` SHALL admitir filtros por tipo, estado, versión, paquete, superficie y rango de fechas, y
SHALL poder ampliar cada resultado con las fichas unidas a él por una arista. `atlas show <id>` SHALL
mostrar una ficha con todas sus aristas y la evidencia de cada una.

#### Scenario: filtro por tipo y estado
- **WHEN** se busca `codemode` filtrando por tipo `pr` y estado abierto
- **THEN** solo se devuelven PRs abiertas

#### Scenario: expansión a un salto
- **WHEN** se muestra una PR con expansión
- **THEN** aparecen la issue que cierra y la release en la que entró, cada una con su evidencia

### Requirement: Calidad de recuperación con umbral
El sistema SHALL incluir un conjunto de evaluación de al menos 50 preguntas con respuesta conocida,
la mitad por nombre exacto y la mitad por paráfrasis, escritas a partir de las fuentes por alguien
que no haya implementado el índice. La evaluación SHALL fallar si el recall@10 es inferior a 0,90 en
las preguntas por nombre exacto o inferior a 0,60 en las de paráfrasis, y SHALL fallar también si
cualquiera de los dos valores baja respecto al último registrado.

#### Scenario: informe por grupo
- **WHEN** se ejecuta la evaluación de recuperación
- **THEN** el informe da un recall@10 para las preguntas por nombre exacto y otro para las de paráfrasis

#### Scenario: umbral de paráfrasis no alcanzado
- **WHEN** el recall@10 de las preguntas por paráfrasis es inferior a 0,60
- **THEN** la evaluación termina con código distinto de cero

#### Scenario: regresión
- **WHEN** un cambio del índice reduce el recall@10 de cualquiera de los dos grupos respecto al último valor registrado
- **THEN** la evaluación termina con código distinto de cero
