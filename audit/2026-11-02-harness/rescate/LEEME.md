# Material rescatado (copia; los originales no se tocan)

| Elemento | Contenido | Origen |
|---|---|---|
| `router.bundle` | bundle git con 32 commits de historia del router (verificado por clonación) | blob `cf84e015` de PI-agent |
| `router-repo-clonado/` | el repo del bundle clonado (sin `.git`) | clon de `router.bundle` |
| `D-revision-*.md` | los 3 documentos de la revisión purgada (449 líneas) | `git show e8fb692^:docs/docs-harness/…` |
| `MANIFIESTO-SHA256.txt` | SHA-256 de los 183 ficheros rescatados, con verificación y pérdida declarada | generado 2026-11-06 |

## Cierre CH-005 (2026-11-06)

**Hecho:** `git bundle verify router.bundle` → *«The bundle records a complete history»*; `refs/heads/main` = `12d094097ebf40084992987ccff485d5f605ec9f`; el clon de verificación tiene 32 commits, tal como decía el expediente. Manifiesto SHA-256 generado con 183 ficheros.

**Pérdida declarada:** el repo `PI-agent` ya no existe en disco (no hay `.git`; `/Users/ruben/Code/PI-agent` solo conserva `pi-jart-ura/state/proxy.log`, y `/Users/ruben/Code/AGENTS/PI-agent` es una copia sin historial y sin `src/pi-memory`). Por tanto **no son recuperables hoy**: los 38 commits colgantes, los 81 ficheros de test de `e54c5d9^` (526 casos) ni la reconstrucción de E-031…E-057 (CH-034). Se cierran como pérdida declarada por decisión del propietario (2026-11-06).
