# Tareas — `024-pi-atlas-sota-program`

## F0 · Prerrequisitos (requieren confirmación del usuario)
- [ ] 0.1 Decisiones D3, D4, D6 y D7 confirmadas (ubicación, comentarios, capa vectorial, tope).
- [ ] 0.2 Abrir el change de decisión anticipada sobre Pi Durable frente a `control/` (vía rápida D1).

## F1 · Snapshot (`atlas fetch`)
- [ ] 1.1 Esqueleto `atlas/` en TypeScript sin dependencias (`node:sqlite`, `fetch` nativo, `gh` para
  autenticación).
- [ ] 1.2 Monorepo upstream en el commit de `main`: árbol de `packages/*`, `package.json` de cada
  paquete, `docs/`, `examples/`, `CHANGELOG.md`, `README.md`.
- [ ] 1.3 Issues, PRs, discussions y releases por endpoints de listado paginados (no por la API de
  búsqueda, que corta en 1.000 resultados): cuerpo y metadatos.
- [ ] 1.4 Comentarios de las PRs cerradas sin fusionar y de las issues cerradas como `not_planned`.
- [ ] 1.5 Web `pi.dev` (docs, changelog, modelos, catálogo de paquetes, Radius) y ecosistema npm
  (keywords `pi-package`, `pi-extension`): metadatos y README.
- [ ] 1.6 Lo nuestro: `openspec/`, `reviews/`, `docs/`, `HANDOFF.md`, los cinco directorios `pi-*` y
  la lista blanca de `~/.pi/agent` definida en la spec `pi-atlas-inventory`.
- [ ] 1.7 `atlas/manifest.json` y archivo comprimido en `atlas/snapshots/` con su `sha256`.
- [ ] 1.8 Manifiesto de exclusiones con motivo (Discord, X, resto de comentarios, código de terceros).
- [ ] 1.9 `atlas fetch --since <fecha>` incremental, conservando los snapshots anteriores.

## F2 · Extractores (snapshot → fichas)
- [ ] 2.1 Markdown: una ficha `doc_section` por encabezado, con ancla y texto; `web_page` para pi.dev.
- [ ] 2.2 Referencia: `cli_command`, `cli_flag`, `setting`, `env_var`, `keybinding`, `slash_command`
  desde las tablas de `cli.md`, `settings.md`, `environment-variables.md`, `keybindings.md`,
  `slash-commands.md`.
- [ ] 2.3 API de extensiones: `event`, `tool`, `api_symbol` desde `extensions/types.ts` y los `.d.ts`
  publicados de cada paquete.
- [ ] 2.4 Changelogs: una ficha `changelog_entry` por viñeta, con versión, fecha y categoría.
- [ ] 2.5 Pi Durable: `spec_requirement` por sección de `docs/spec.md` y fichas de los tres
  documentos de diseño.
- [ ] 2.6 Lo nuestro: `ours_spec` por requisito, `ours_change` por change archivado,
  `ours_finding` por hallazgo de review con su severidad, `ours_component` por módulo,
  `ours_config` por clave de configuración.
- [ ] 2.7 Columnas `package` y `surface` en cada ficha donde apliquen.
- [ ] 2.8 Aristas con evidencia literal; `closes` solo con palabra de cierre o relación de la API,
  `mentions` para el resto.
- [ ] 2.9 Prueba: un tipo fuera de la lista cerrada hace fallar `build` nombrando extractor y tipo.

## F3 · Índice (`atlas build`)
- [ ] 3.1 Esquema de `design.md` §3 con FTS5 (`unicode61 remove_diacritics 2` y `trigram`).
- [ ] 3.2 Construcción pura desde el snapshot y cálculo del digest de contenido.
- [ ] 3.3 Prueba: dos `build` consecutivos sobre el mismo snapshot dan el mismo digest.
- [ ] 3.4 Prueba: `build` con la red deshabilitada termina correctamente.
- [ ] 3.5 Prueba: un fichero del snapshot alterado hace fallar `build` nombrando el fichero.

## F4 · Consulta (`atlas query`)
- [ ] 4.1 BM25 con pesos por columna + trigramas + fusión RRF.
- [ ] 4.2 Escapado de la entrada como texto literal; pruebas con `--no-mcp`, `codemode.mode`,
  `#10607` y un término de dos caracteres.
- [ ] 4.3 Filtros por `kind`, `state`, `version`, `package`, `surface` y fechas; expansión por grafo
  a un salto.
- [ ] 4.4 Salida legible y `--json`; `atlas show <id>` con sus aristas y su evidencia.
- [ ] 4.5 Prueba: la misma consulta repetida devuelve el mismo resultado en el mismo orden.

## F5 · Capacidades, mapa y comparativa
- [ ] 5.1 `atlas/capabilities.tsv`: capacidades con sus fichas (por id o patrón), autor y
  justificación; ninguna ficha que no sea de comunidad queda sin capacidad.
- [ ] 5.2 `atlas/overlaps.tsv`: cada requisito propio con su solape o «sin equivalente».
- [ ] 5.3 Generar `docs/atlas/MAPA.md` (paquete → superficie → capacidad → elemento, más la sección
  de exclusiones) e `docs/atlas/inventario/<kind>.md`.
- [ ] 5.4 Generar `docs/atlas/COMPARATIVA.md` upstream ↔ Durable ↔ nuestro.
- [ ] 5.5 Generar `docs/atlas/SECCIONES.md`: secciones de la Fase 2 con recuento de capacidades y
  fichas; añadir a mano, en el change de cada sección, su presupuesto.
- [ ] 5.6 `docs/atlas/ESENCIA.md`: invariantes verificados contra la versión capturada; los no
  localizados, listados como candidatos sin verificar.

## F6 · Puertas y revisión
- [ ] 6.1 `atlas verify`: recuentos, encabezados, tablas de referencia, fichas sin capacidad,
  requisitos propios sin clasificar y ficheros generados desfasados. Las lagunas se listan.
- [ ] 6.2 Prueba de secretos sobre `atlas/data/` y sobre la base; prueba de que `fetch` no abre
  ficheros fuera de la lista blanca.
- [ ] 6.3 Evaluación de recuperación: 50 preguntas escritas por un revisor desde las fuentes
  (25 por nombre exacto, 25 por paráfrasis); umbrales 0,90 y 0,60; fallo también por regresión.
- [ ] 6.4 Si el umbral de paráfrasis no se cumple: presentar al usuario la decisión D6.
- [ ] 6.5 Comprobación de citas `id@hash`: id inexistente y hash desfasado.
- [ ] 6.6 Revisión dementor, adversarial y de cobertura; informe en `reviews/14-atlas-fase1.md`.
- [ ] 6.7 El usuario aprueba `ESENCIA.md` y `SECCIONES.md`.
- [ ] 6.8 Si se agota el tope de la Fase 1 sin pasar `verify`: informe de lagunas al usuario.

## F7 · Cierre
- [ ] 7.1 `openspec validate 024-pi-atlas-sota-program --strict`.
- [ ] 7.2 `openspec archive 024-pi-atlas-sota-program`.
- [ ] 7.3 Proponer el change de la primera sección de la Fase 2, con su presupuesto.
