# Estructura del repositorio

## Regla operativa

Todo el trabajo de `pi-account-router` permanece bajo
`/Users/ruben/Code/PI-agent/pi-account-router`. No se crean ni usan worktrees, parches, copias,
dependencias o evidencia fuera de esta raíz sin una instrucción literal de Rubén.

## Regla de una sola copia (orden del propietario 2026-10-13)

La raíz es **la única versión** de la aplicación: una extensión, una carpeta. No existe `versions/`;
los snapshots físicos quedaron prohibidos y eliminados del árbol y del historial. El versionado se
hace exclusivamente con git sobre el contenido canónico de la raíz. Tampoco se crean sub-paquetes
hermanos: toda la lógica de la extensión vive en `src/` (y sus carpetas internas), nunca en
directorios `pi-*/` separados.

## Árbol canónico

```text
pi-account-router/
├── src/                 # código de producción activo (adapters/, application/, domain/)
├── tests/               # pruebas de la única versión
├── docs/                # documentación activa y ADRs
├── openspec/            # especificaciones y cambios activos
├── examples/            # configuraciones de ejemplo activas
├── scripts/             # utilidades live y de mantenimiento
├── research/            # dossier de investigación SOTA
└── package.json         # paquete npm único
```

`node_modules/` pertenece solo a la raíz y está ignorado.

## Regla de edición

1. Las modificaciones de producto se hacen exclusivamente en la raíz.
2. Cada cambio de comportamiento sigue OpenSpec: propuesta, diseño, delta, tareas, validación,
   pruebas y archivado.
3. Antes de crear cualquier directorio nuevo o mover ficheros, comprobar este documento y
   `AGENTS.md`: si algo parece necesitar una segunda copia o un sub-paquete, la respuesta es no.

## Lecciones de la reorganización

Las copias físicas de versión derivaron en drift (dos árboles editándose en paralelo) y los
sub-paquetes hermanauros extendieron la superficie sin que el propietario los pidiera. Git conserva
la historia de la app canónica; nada más conserva copias. Cualquier conflicto entre comodidad de una
herramienta y este límite se resuelve a favor del límite.
