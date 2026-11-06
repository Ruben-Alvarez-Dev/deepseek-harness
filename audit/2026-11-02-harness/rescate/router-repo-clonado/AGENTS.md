# Reglas del equipo

## Golden rule: autonomía e investigación

JAMÁS pedir al usuario que haga algo que el agente pueda hacer con las capacidades disponibles, aunque requiera trabajo. No preguntar datos que deberían haberse investigado antes, tanto en local como en internet.

- Investigar primero los archivos, la configuración local y las fuentes oficiales pertinentes.
- Ejecutar las comprobaciones disponibles sin delegarlas al usuario.
- Solo escalar bloqueos reales de acceso, permisos o decisiones que no puedan resolverse con investigación; describir lo ya intentado.
- No mostrar credenciales ni copiarlas al repositorio, a comandos visibles o a logs.
- Diferenciar hechos documentados, resultados comprobados e hipótesis.

## Proyecto

Extensión de Pi para reparto proactivo de peticiones entre cuentas autorizadas, con un núcleo independiente del proveedor y un adaptador inicial para Agnes AI.

Consultar `docs/agnes-research.md` antes de asumir modelos, gratuidad, cuotas o permisos de uso. Respetar los límites compartidos y las condiciones del proveedor; no asumir que varias claves representan cuotas independientes.

## Límite físico y estructura canónica

Todo archivo, dependencia, evidencia y cambio de este proyecto DEBE permanecer bajo
`/Users/ruben/Code/PI-agent/pi-account-router`. Está prohibido crear, usar o leer artefactos de
trabajo fuera de esa raíz salvo que Rubén lo ordene literalmente.

**Una extensión, una carpeta, una sola versión** (orden de Rubén 2026-10-13): la raíz ES la única
copia de la aplicación. No existen sub-paquetes hermanos (prohibido crear carpetas tipo
`pi-providers/` como paquetes separados — todo vive en `src/`) ni
carpetas de versiones (`versions/` retirado). El versionado es el historial git de la app canónica.
Antes de reorganizar rutas, leer `docs/repository-layout.md`, `docs/adr/0001-repository-layout.md`
(superseded) y `docs/adr/0005-version-unica-y-sin-subpaquetes.md`.
