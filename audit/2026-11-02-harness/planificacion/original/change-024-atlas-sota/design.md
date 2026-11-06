# Design — `024-pi-atlas-sota-program`

## 1. El programa en tres fases

| Fase | Pregunta que responde | Produce | Se cierra cuando |
|---|---|---|---|
| **1 · Atlas** (este change) | ¿Qué hay, dónde está, qué se dijo y qué se propuso? | Snapshot, índice SQLite, mapa, comparativa, carta de esencia y **lista de secciones de la Fase 2 con recuento y presupuesto** | Cobertura contra el manifiesto, umbrales de recuperación cumplidos, lista de secciones aprobada y revisión sin bloqueantes |
| **2 · Elevación** (un change por sección) | Para cada capacidad: ¿cuál es el estado del arte y a qué distancia estamos? | Un dossier por **capacidad** en `docs/sota/<sección>/` con fuentes, brecha medida y opciones | Cada dossier pasa revisión de fuentes y trazabilidad, dentro del presupuesto de su sección |
| **3 · Propuestas** (changes propios) | ¿Qué cambiamos, por qué y en qué orden? | Changes OpenSpec argumentados, enlazados a su dossier y a fichas del Atlas | El usuario aprueba cada change; nada se aplica sin aprobación |

**Unidad de trabajo de la Fase 2: la capacidad**, no la ficha. El Atlas tendrá más de 14.000 fichas,
de las que unas 10.900 son issues, PRs, discussions y releases; investigar ficha a ficha no termina
nunca. Una capacidad es algo que Pi o lo nuestro hace o permite («compactación de contexto»,
«puerta previa a herramienta», «modo RPC», «instalación de paquetes»): se espera del orden de 50 a
150, agrupadas en secciones. Las fichas son la evidencia de cada capacidad.

**Tope de la Fase 1** (propuesto, decisión D7): 5 días de trabajo. Si al llegar al tope
`atlas verify` no pasa, se cierra con las lagunas listadas en el informe y el usuario decide si se
amplía o se recorta alcance. Es la defensa contra la crítica A1 de `reviews/12` («síndrome de la
catedral»).

**Trabajo en curso de la Fase 2**: una sección abierta cada vez.

## 2. Qué se inventaría (alcance de la Fase 1)

Recuentos medidos el 2026-10-08 hacia las 08:20 UTC. Cambian de hora en hora (las issues abiertas
pasaron de 209 a 210 durante la revisión): la cifra que vale es la que `atlas fetch` fije en el
manifiesto junto al commit.

| Bloque | Fuente | Volumen medido |
|---|---|---|
| Monorepo upstream | `github.com/earendil-works/pi`, rama `main` | 14 paquetes: `agent ai chord client codemode coding-agent durable env evals mcp protocol server telemetry tui` |
| Documentación oficial | `packages/coding-agent/docs/*.md` | 40 ficheros, 350 KB, 482 encabezados |
| Ejemplos | `packages/coding-agent/examples/` | 70 extensiones en fichero, 9 en directorio, SDK, plugin experimental |
| Pi Durable | `packages/durable/` | README 36 KB; `docs/spec.md` 246 KB; 3 documentos de diseño |
| Historial | `CHANGELOG.md` por paquete, releases | 272 releases; changelog de coding-agent 625 KB con unas 3.050 entradas |
| Propuestas y debate | issues, PRs, discussions | 6.903 issues (≈210 abiertas), 3.367 PRs (75 abiertos, 1.043 fusionados), 327 discussions |
| Motivos de rechazo | comentarios de PRs cerradas sin fusionar y de issues cerradas como `not_planned` | por medir en `fetch` |
| Web | `pi.dev` (docs, changelog, modelos, catálogo de paquetes, Radius) | por medir en `fetch` |
| Ecosistema | paquetes npm con keyword `pi-package` / `pi-extension` | por medir en `fetch` |
| Lo nuestro | este repo y `~/.pi/agent` | 26 specs, 23 changes, 12 documentos de review, `pi-intermediate` (60 ficheros), `pi-memory` (97), `pi-harness` (solo `AGENTS.md`), `pi-core` y `pi-planner` (vacíos), 3 extensiones (2 ficheros y 1 enlace simbólico), 1 paquete (`pi-mcp-adapter`), `builtin:mcp` desactivado |

**Fuera de alcance en Fase 1**: Discord y X (sin API utilizable sin bot o credenciales propias); el
resto de comentarios de issues y PRs (nivel 2, bajo demanda por capacidad durante la Fase 2); código
de terceros del ecosistema (solo metadatos y README).

**«Canales»** se interpreta en tres sentidos y los tres se inventarían: superficies de uso (TUI,
print, JSON, RPC, SDK, servidor/cliente experimental, MCP, Radius), canales de distribución
(instalador de pi.dev, npm, Nix, catálogo de paquetes) y canales de comunidad (issues, PRs,
discussions).

## 3. Modelo de datos

SQLite, un solo fichero `atlas/atlas.sqlite`, artefacto **derivado** del snapshot.

```sql
source(id, kind, uri, ref, fetched_at, sha256, bytes)
item(id, kind, source_id, package, surface, title, body, locator, state, version,
     created_at, updated_at, url, sha256)
edge(src, dst, rel, evidence)
item_fts   -- FTS5(title, body, locator) tokenize='unicode61 remove_diacritics 2'
item_tri   -- FTS5(title, body)          tokenize='trigram'
manifest(key, value)
```

- `item.id` es **estable y legible**: `cap:tool-gating`, `doc:extensions.md#tool-exposure`,
  `flag:--no-mcp`, `setting:codemode.mode`, `event:tool_call`, `pkg:durable`, `rel:1.1.0`,
  `issue:10607`, `pr:10557`, `spec:durable#<ancla>`, `ours:spec/hard-gates#<requisito>`,
  `ours:review/12#A1`.
- `item.kind` cerrado: `capability`, `package`, `doc_section`, `web_page`, `cli_command`,
  `cli_flag`, `setting`, `env_var`, `event`, `tool`, `slash_command`, `keybinding`, `api_symbol`,
  `example`, `release`, `changelog_entry`, `issue`, `pr`, `discussion`, `comment`,
  `spec_requirement`, `eco_package`, `ours_component`, `ours_spec`, `ours_change`, `ours_finding`,
  `ours_config`.
- `item.package` y `item.surface` permiten generar el mapa por paquete y superficie.
- `edge.rel` cerrado: `part_of`, `documented_in`, `introduced_in`, `closes`, `mentions`,
  `depends_on`, `exemplified_by`, `supersedes`, `overlaps`.
- `closes` solo se crea cuando la fuente lo declara (palabra clave `fixes`/`closes`/`resolves` ante
  el número, o la relación de cierre que da la API). Un `#NNNN` suelto es `mentions`.
- Toda arista lleva `evidence`: el fragmento literal de donde se extrajo. **No hay aristas inferidas
  por un modelo.**
- Dos ficheros mantenidos a mano recogen el juicio humano, con autor y justificación por fila:
  `atlas/capabilities.tsv` (qué fichas pertenecen a cada capacidad, por id o por patrón de id) y
  `atlas/overlaps.tsv` (qué elemento nuestro solapa con cuál de upstream, o «sin equivalente»).

## 4. Recuperación: léxica de base, vectorial como decisión

La petición dice «SQLite con FAISS o similar, sin necesidad de LLM ni embeddings». FAISS indexa
vectores. Hay dos formas de obtenerlos: con un modelo de embeddings, que queda descartado, o por
álgebra sobre el propio corpus (TF-IDF con SVD, también llamado LSA, o *hashing*), que no usa ningún
modelo y es determinista. La segunda sí cabe en la petición.

Este change construye la **base léxica**, que hace falta en cualquier caso:

1. **BM25 sobre FTS5** con pesos por columna (título > localizador > cuerpo) y sin diacríticos.
2. **Trigramas** en una segunda tabla FTS5, para subcadenas de identificadores. El tokenizador por
   palabras deja `registerToolRenderer` como un solo token y no encuentra `ToolRender`; el de
   trigramas sí. No devuelve nada con menos de 3 caracteres.
3. **Fusión de rangos recíprocos (RRF)** entre 1 y 2: aritmética fija, sin parámetros aprendidos.
4. **Expansión por grafo a un salto** y **filtros estructurados** por `kind`, `state`, `version`,
   `package`, `surface` y fechas.
5. **Escapado de consultas**: `--no-mcp`, `codemode.mode` y `#10607` dan error de sintaxis en FTS5
   si se pasan sin entrecomillar. La CLI entrecomilla siempre la entrada del usuario.

Lo léxico encuentra bien nombres exactos y mal las paráfrasis: una pregunta de prueba como «cómo
evito que el agente escriba sin permiso» dio cero resultados. Por eso hay umbrales (propuestos):

- recall@10 ≥ 0,90 en preguntas por nombre exacto;
- recall@10 ≥ 0,60 en preguntas por paráfrasis.

Si el segundo no se alcanza, la Fase 1 no cierra sin una de dos cosas: la capa vectorial LSA
(decisión D6) o la aceptación expresa del usuario. Las preguntas las escribe un revisor a partir de
las fuentes, sin ver la implementación del índice.

## 5. Determinismo y reproducibilidad

- `atlas fetch` es el **único** paso con red. Escribe JSONL crudo en `atlas/data/`, ordenado por id.
- `atlas/manifest.json` guarda: fecha y hora, commit de `main`, recuento por fuente
  según la API, `sha256` por fichero y `sha256` del archivo comprimido del snapshot.
- Cada snapshot se archiva comprimido en `atlas/snapshots/`. GitHub es mutable: sin ese archivo el
  índice **no** se puede reconstruir igual. Los snapshots anteriores no se borran.
- `atlas build` es una función del snapshot: sin red, sin reloj, sin aleatoriedad. Dos ejecuciones
  sobre el mismo snapshot dan el mismo **digest de contenido** (hash sobre las filas de `item` y
  `edge` en orden canónico).
- `atlas fetch --since <fecha>` actualiza de forma incremental donde la API lo permite y vuelve a
  listar completo donde no.
- Las citas en dossieres y propuestas usan `id@<12 primeros hex del sha256>`: si el contenido de la
  ficha cambia en un snapshot posterior, la cita deja de resolver y hay que revisarla.
- `atlas verify` comprueba las puertas y sale con código distinto de cero si falla alguna.

## 6. Carta de esencia

Fichero `docs/atlas/ESENCIA.md`, redactado en la Fase 1 y **aprobado por el usuario** antes de
cerrarla. Dos listas de invariantes, cada uno con su fuente y con una comprobación:

- **De Pi**: candidatos a verificar contra la documentación de la versión capturada. No se dan por
  buenos los de `openspec/project.md`: ese fichero dice «4 tools built-in», y `settings.md` de la
  1.1.0 lista ocho (`read`, `bash`, `powershell`, `edit`, `write`, `grep`, `find`, `ls`). Lo único
  literal localizado hasta ahora es el lema del README, «minimal, extensible agent harness that you
  can make your own».
- **Nuestros**: los ocho de `openspec/project.md` §Principios de diseño.

En la Fase 3, cada change declara su efecto sobre cada invariante.

## 7. Revisión y registro

- Todo artefacto del programa vive en el repo: changes en `openspec/changes/`, dossieres en
  `docs/sota/`, mapa en `docs/atlas/`, revisiones en `reviews/` continuando la numeración.
- Cada puerta pasa por tres lecturas independientes: **dementor**, **adversarial** y
  **cobertura/trazabilidad**. Los revisores reciben los artefactos, no las conclusiones del autor.
- Etiquetas heredadas de las reviews: `[verificado]` (comprobado contra la fuente o en disco, con
  comando o URL) y `[claim]` (afirmado por una fuente, sin comprobar).

## 8. Decisiones abiertas (del usuario)

| # | Decisión | Recomendación | Bloquea |
|---|---|---|---|
| D1 | Qué es «nuestra versión»: (a) Pi de serie + capa propia de paquetes y extensiones, (b) fork del monorepo, (c) arnés propio sobre Pi Durable | (a) como base y piloto de (c); evitar (b), porque seguir 6 releases por semana en un fork es inasumible para una o dos personas | Fase 3 |
| D2 | Retirada. Proponía `git init` (S0 de `reviews/12`); el usuario no lo ha pedido y el programa no depende de git | — | — |
| D3 | Ubicación del código del Atlas | `atlas/` en la raíz | Tarea 1.1 |
| D4 | Comentarios de issues y PRs | Solo los de rechazadas en el primer pase; el resto bajo demanda | Alcance de `fetch` |
| D5 | Relación con `pi-harness/` (creado hoy por otra sesión, con regla de no inferir contexto del padre) | Aclarar si es el hogar de la opción (c); mientras tanto solo se inventaría su existencia | Fase 3 |
| D6 | Capa vectorial sin modelo (LSA sobre el corpus, indexada con FAISS o `sqlite-vec`) | Construir la base léxica, medir y añadirla solo si el umbral de paráfrasis no se cumple | Cierre de Fase 1 |
| D7 | Tope de la Fase 1 | 5 días de trabajo | Cierre de Fase 1 |

**Vía rápida para D1**: Durable frente a un `control/` propio se puede decidir leyendo cuatro
documentos (`spec.md`, los tres de diseño y `reviews/12`), sin esperar al Atlas. Se abre como change
aparte, limitado a ese dossier de decisión; es la única excepción al orden de fases.

## 9. Riesgos

| Riesgo | Mitigación |
|---|---|
| Sobre-arquitectura: el programa crece más que el producto | Tope de Fase 1, capacidad como unidad, presupuesto por sección, una sección abierta cada vez |
| El Atlas caduca por la velocidad de upstream | `fetch --since`, manifiesto con commit y hora, citas ancladas a hash |
| Límite de la API de GitHub (5.000 peticiones/hora) | Entre 103 y 137 páginas de 100 para issues y PRs según el endpoint; comentarios solo de rechazadas |
| Pi Durable es experimental: cambios incompatibles en 3 de sus 6 últimas releases | El Atlas registra la versión de cada ficha; D1 se decide con su propio dossier |
| Fuga de credenciales al inventariar `~/.pi/agent` | Lista blanca de ficheros y prueba que falla si aparece un patrón de secreto |
| Inventario «completo» que no lo es | Puertas contra recuentos de la API y contra encabezados reales; las lagunas se listan |
| Sin línea base propia (S1 de `reviews/12`) no se puede medir la brecha de lo nuestro | Los dossieres lo declaran como «sin medida propia» en vez de estimar |
