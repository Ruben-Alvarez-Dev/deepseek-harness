# ADR 0005: versión única en la raíz, sin sub-paquetes y sin copias físicas

**Estado:** aceptado (orden literal del propietario, 2026-10-13)
**Sustituye a:** ADR 0001 (root snapshots físicos en `versions/`)
**Relacionado:** ADR 0003 (depósito de secretos y sistema de perfiles) — **eliminado junto con sus funciones** por esta orden

## Contexto

Dos familias de deriva aparecieron simultáneamente:

1. **Sub-paquetes hermanos** (`pi-profiles/`, `pi-secrets/`) creados por planes de sesiones
   anteriores sin orden del propietario. El propietario los retiró con orden literal:
   «aquí se hace 1 extensión, y una carpeta por extensión. Punto». La cirugía 2026-10-13 devolvió
   la app a configuración plana (`account-router.json`), credenciales env/piProvider y estado en
   `<agentDir>/account-router-state` sin particionado por perfil.

2. **Copias físicas versionadas** (`versions/v1`, `versions/v2` + tags `v1-baseline`,
   `v2-work-in-progress`, `legacy-versions-layout`), heredadas del ADR 0001. El propietario pidió
   una sola copia: «deja solo la última versión, y en el directorio raíz, simplifícalo».

Además, la regla de límite físico hace inviables las copias: `node_modules` anidados y artefactos
de instalación dentro de `versions/` violaban su propia política de no-contener dependencias.

## Decisión

- La raíz del repositorio es **la única versión** de la aplicación. Se elimina `versions/` del
  árbol y se expulsan sus blobs y los tres tags de referencias del historial mediante
  `git filter-repo` + `gc --prune=now` (orden literal del propietario: nada de lo retirado
  sobrevive en el versionado git).
- Quedan prohibidos los sub-paquetes hermanos: el catálogo de proveedores/modelos aprobado en el
  plan (cambios OpenSpec `provider-catalog`, `model-catalog`) se implementará como código dentro
  de `src/` (p. ej. `src/adapters/*catalog*.ts` + datos versionados dentro de la raíz), nunca en
  carpetas `pi-*/` separadas.
- El versionado histórico de la app canónica es git únicamente. `AGENTS.md` y
  `docs/repository-layout.md` quedan actualizados a esta regla.

## Consecuencias

- El historial git cambia de hashes (rewrite); cualquier consumidor externo de los tags pierde
  esos refs (no existen remotos: el rewrite es íntegro y local).
- La superficie del proyecto se reduce: un `package.json`, una suite, un OpenSpec, una raíz.
- ADR 0003 se elimina del árbol y del historial junto con sus funciones: esta ADR 0005 es el único registro de la retirada.
- La investigación retirada sobre secretos/perfiles (docs 0002-0004 referencias) no se reconstruye;
  si algo de ese alcance se pidiera en el futuro, nacería como cambio OpenSpec dentro de la
  extensión única.
