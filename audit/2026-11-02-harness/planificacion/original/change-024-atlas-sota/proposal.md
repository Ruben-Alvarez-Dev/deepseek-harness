# Change: Programa SOTA de Pi — Fase 1 «Atlas» (inventario total + índice sin LLM)

## Why

Queremos llevar **nuestra versión de Pi Agent** a estado del arte en todos los frentes (features,
procedimientos, canales) **sin perder la esencia de Pi ni la nuestra**. Hoy no se puede hacer con
rigor porque **no existe una foto completa** de lo que hay:

- Pi upstream se mueve casi a diario: entre `1.0.0` (2026-10-01) y `1.1.0` (2026-10-07) hay 6
  releases contando ambas.
- **Pi Durable** (`@earendil-works/pi-durable`) se publica en npm desde `0.86.0` (2026-09-19) y la
  portada de pi.dev lo anuncia junto a Pi 1.0. Es un arnés aparte que el CLI `pi` instalado no usa.
  Nos enteramos por la portada de la web, no por nuestro propio corpus.
- Durable solapa con lo que `reviews/12` pide como `control/`, pero no es lo mismo. `reviews/12`
  pide decisiones de política registradas (PDP *journaled*), replay y puertas. Durable ofrece
  commits atómicos, reanudación tras caída, checkpoints por tarea y un hook `beforeTool` que
  bloquea; su especificación excluye de forma expresa un journal de decisiones.
- El material está repartido y sin índice: 14 paquetes en el monorepo, 40 documentos oficiales,
  4 documentos en `durable/docs` (la especificación de 246 KB y 3 de diseño), 272 releases,
  6.903 issues, 3.367 PRs, 327 discussions; y en local, 26 specs, 23 changes archivados,
  12 documentos de review (5 rondas), `pi-intermediate`, `pi-memory`, un `HANDOFF.md` de 72 KB y la
  configuración de `~/.pi/agent`.
- Sin ese mapa, cualquier propuesta de mejora es opinión: no se puede saber qué existe ya, qué se
  propuso y se rechazó, qué funciona, ni dónde está.

Este change define el **programa completo en tres fases** y especifica en detalle **solo la Fase 1**.
Las fases 2 y 3 quedan gobernadas por la capability `sota-elevation-program` y se abrirán como
changes propios cuando el Atlas exista.

## What Changes

- **Nueva capability `pi-atlas-inventory`**: inventario completo y verificable de Pi upstream, de
  Pi Durable y de lo nuestro, con una ficha por elemento y las relaciones entre ellas, agrupado en
  **capacidades**, que son la unidad de trabajo de la Fase 2. Cobertura medida con números.
- **Nueva capability `pi-atlas-index`**: índice en **SQLite + FTS5** (BM25 y trigramas) más grafo de
  relaciones, construido de forma determinista desde un snapshot en disco, que **funciona completo
  sin LLM y sin modelos de embeddings**, con CLI de consulta. Cero dependencias: `node:sqlite`
  (verificado en Node 26.5, SQLite 3.53.4 con FTS5).
- **Nueva capability `sota-elevation-program`**: gobierno de las tres fases — qué produce cada una,
  qué puerta la cierra, con qué presupuesto, qué revisores intervienen y qué se registra por
  escrito. Incluye la **carta de esencia** y la regla de que todo el programa va por OpenSpec.
- **Salidas generadas desde la base de datos**: `docs/atlas/MAPA.md`, `docs/atlas/inventario/*.md`,
  `docs/atlas/COMPARATIVA.md` (upstream ↔ Durable ↔ nuestro) y `docs/atlas/SECCIONES.md` (la lista
  de secciones de la Fase 2 con recuento y presupuesto).
- **Sin cambios** en `pi-intermediate`, `pi-memory`, `pi-harness` ni en las 26 specs existentes.

## Impact

- **Specs afectadas**: ninguna existente; se añaden `pi-atlas-inventory`, `pi-atlas-index` y
  `sota-elevation-program`.
- **Relación con `reviews/12`**: esa auditoría reservaba la numeración `024+` para sus pasos S0 a S6
  y este change ocupa el 024 con otro contenido. No los sustituye ni los adopta: S0 (`git init`) no
  forma parte de este programa porque el usuario no lo ha pedido; la
  pregunta de S3 (`control/`) se adelanta con la vía rápida de `design.md` §8; S1 (línea base de
  evaluación) sigue pendiente y condiciona qué se puede medir sobre lo nuestro en la Fase 2.
- **Código nuevo**: un directorio `atlas/` en la raíz (fetch, build y consulta). No vive bajo `pi-*`
  porque es infraestructura del repo, no un componente embrionario.
- **Datos**: snapshot crudo en `atlas/data/` y su archivo comprimido en `atlas/snapshots/`, ambos
  generados y pesados. `atlas/manifest.json` guarda los hashes y recuentos y vive junto al código.
- **Red**: solo `atlas fetch` toca la red (API de GitHub autenticada con `gh`, registro npm, pi.dev).
- **Seguridad**: de `~/.pi/agent` se lee solo una lista blanca de ficheros y se registran claves y
  estructura, nunca valores. Detalle en la spec `pi-atlas-inventory`.
- **Sin git**: el repo no tiene control de versiones y este programa no lo presupone ni lo
  introduce. El registro es el que da OpenSpec (changes archivados con fecha) más los snapshots
  con hash. Consecuencia aceptada: no hay historial de ediciones de un mismo fichero.
- **Riesgo principal**: sobre-arquitectura (crítica A1 de `reviews/12`). Mitigación en `design.md`:
  Fase 1 con tope de tiempo y criterio de abandono, Fase 2 con una sección abierta cada vez y con
  presupuesto fijado antes de empezar.
- **Revisión de esta propuesta**: `reviews/13-revision-propuesta-024.md`.
