# Forense: material borrado y sepultado en PI-agent

**Fecha:** 2026-11-02 · **Método:** arqueología git de solo lectura (`fsck`, `reflog`, `log --diff-filter`, `cat-file`, `bundle verify`).
**Alcance:** `/Users/ruben/Code/PI-agent` (HEAD `850ac20`, 91 commits, 1 rama, 0 tags, 0 stashes, 0 remotes).
**Verificación:** cada recuperación citada se ejecutó en esta sesión salvo donde se indica «inferido».

---

## 1 · Hallazgo principal: había cuatro planificaciones, no una

| Fecha | Artefacto | Estado | Recuperación |
|---|---|---|---|
| 2026-10-10 | **`pi-harness`** — plan de runtime propio: paquete único que compone `pi-agent-core` + intermediate + memory, con `control/` (PDP hot-swap, PEP, workflow con saga, journal), routing, memory, supervisor, eval, perfiles. Fases P0–P6 con gates falsables, 24–30 días, no-goals explícitos | **purgado** por E-022 (`e8fb692`) | `git show e8fb692^:docs/docs-harness/D-revision-0*.md` → **recuperado y verificado** (449 líneas) |
| 2026-10-11/17 | **`024-pi-atlas-sota-program`** — «Programa SOTA de Pi, Fase 1 Atlas: inventario total + índice sin LLM». Tesis: sin mapa completo, cualquier propuesta de mejora es opinión | **purgado** por E-020 (`e54c5d9`) | `git show e54c5d9^:openspec/changes/024-pi-atlas-sota-program/…` → 6 ficheros, **recuperables** |
| 2026-10-18 | **Arquitectura del ecosistema** — tres planos, puertos, INV-10, deltas D01–D11 | **vivo** en `src/pi-account-router/docs/audit-2026-10-18/arquitectura-ecosistema/` | ya en el árbol (pero **untracked**) |
| 2026-10-25 | **Extracción por anillos** — anillo-0 kernel / anillo-1 gateway / anillo-2 connections | **vivo** en `~/Code/QWEN-code/auditoria-pi-agent/` | fuera de todo git |

La «propuesta integral» que se recordaba no es una: son **cuatro**, y las dos más antiguas están purgadas.

## 2 · Tests borrados: recuperables y contados

- Commit `e54c5d9` (E-020, 2026-10-17): **215 ficheros, +110 / −15.438 líneas**, 204 borrados.
- **81 ficheros de test y 9.057 líneas**: intermediate 18/1.471 · memory 41/3.240 · router 22/4.346.
- Casos estáticos 474 (113 + 181 + 180); con `it.each` → **526**. La cifra del expediente se verifica exacta.
- Recuperación: `git checkout e54c5d9^ -- src/pi-intermediate/tests src/pi-memory/tests src/pi-account-router/tests`.

## 3 · El router tiene una historia git en un bundle (única copia)

- Blob `cf84e015` = `archive/pi-account-router-2026-10-17.bundle`, 357.863 B.
- **Verificado**: `git bundle verify` → *«The bundle contains 2 refs… records a complete history»*, commit `12d0940`.
- El `archive/README.md` decía: *«32 commits, up to 2026-10-17… this bundle is the only copy of that history»*. Borrado en E-017 (`1dc6eed`); el blob sigue alcanzable.
- Recuperación: `git cat-file blob cf84e015 > /tmp/router.bundle && git clone /tmp/router.bundle router`.

## 4 · 97 ficheros de `pi-memory` borrados sin registrar

- `git ls-tree -r HEAD -- src/pi-memory` = **97**; índice intacto (`git diff --cached` vacío); `git status` = ` D` sin stage.
- **12.655 líneas / 538.886 B** recuperables con `git restore src/pi-memory` (o `git checkout -- src/pi-memory`).
- Reparto: 46 `src/`, 33 `probes/`, 11 raíz, 7 `docs/`.

## 5 · Objetos inalcanzables

- **54 objetos**: 7 blobs, 38 commits, 9 trees.
- 36 stashes dropeados: 30 del 2026-10-12 (base `75f6b9c`) y 6 del 2026-10-25 (base `7b0e0b3`). Su contenido fue **superseded y ya está en HEAD** (verificado: el WIP `maxTransientRetries` está en `config.ts`/`domain/types.ts`/`routed-streams.ts`; el de `footerGeneration` en `extension.ts`).
- 2 raíces squash «v1.0 base limpia» (`454d791`, `48c31fb`), 292 ficheros, diff vs main de solo 4 docs.
- 5 blobs pre-rename `pi-agnes-router`; 2 blobs huérfanos reales (`b9e0aa3` = `memory.ts` previo al change 049; `a1eceb0` = `extension.ts` previo al 049).
- **Riesgo**: los 30 commits del 2026-10-12 están **fuera de `prune-expire`**; un `git gc` normal los poda.

## 6 · Expediente incompleto

- `E-031…E-057` (salvo `E-047`): **27 entradas nunca escritas**; solo viven en mensajes de commit.
- El expediente salta `E-030 → E-047 → E-058`.
- Sin entrada: `E-012`, `E-015`, `E-017` (purgada por E-020), `E-044`, `E-045` (sin commit propio), `E-046`, `E-048`.

## 7 · Material perdido para siempre

1. **Change 062 (2026-10-28)**: `src/pi-memory/src/memory-tenant.ts` + ediciones en `core.ts`, `memory-control.ts`, `memory-spi.ts`, `fabric`, `plane`, `hooks` + probes `p062/p063`. `tasks.md` las marca `[x]` y `HANDOFF-2026-10-28.md` dice «verificado por ejecución», pero: `git rev-list --objects --all | grep memory-tenant` vacío, no está en disco, y el borrado de `src/pi-memory` lo dejó fuera. **No recuperable desde este repo.**
2. **Evidencia del soak** `docs/soak-2026-10-18/` (1h42 de ejecución): gitignored, nunca versionada, retirada en E-044.
3. **`.probe-*.ts` no versionados** borrados (g3b, g3-mp, g4, g5, g8 previos): sin copia.

## 8 · Recuperable, con comando

| Material | Valor | Comando |
|---|---|---|
| `src/pi-memory` completo | 97 ficheros / 12.655 líneas | `git restore src/pi-memory` |
| Historia del router | **32 commits verificados por clonación**, única copia | `git cat-file blob cf84e015 > /tmp/router.bundle && git clone /tmp/router.bundle router` |
| Tests E-020 | 81 ficheros / 9.057 líneas / 526 casos | `git checkout e54c5d9^ -- src/pi-intermediate/tests src/pi-memory/tests src/pi-account-router/tests` |
| D-revision + corpus purgado | 33,7 KB de plan + 1.224 ficheros | `git checkout e8fb692^ -- docs/docs-harness` |
| Change 024 Atlas SOTA | 6 ficheros de programa | `git show e54c5d9^:openspec/changes/024-pi-atlas-sota-program/…` |
| Journal inmutable del router | 247 líneas, revertido por E-046 | `git show b7d8fe7:src/pi-account-router/src/adapters/audit-log.ts` |
| Runner de soak | 353 líneas | `git show 38dc122^:src/pi-account-router/scripts/soak.ts` |

Verificado en esta sesión: D-revision extraído (449 líneas), bundle **clonado**: 32 commits confirmados (`feb7a31` 2026-10-12 → `12d0940` 2026-10-17), conteos de tests y de borrados.

## 9 · E-017 mintió por omisión

`1dc6eed` (E-017) borró `archive/pi-account-router-2026-10-17.bundle` justificándolo con «solo existe la versión actual». **Es falso**: el blob sobrevive en el ODB, contiene la única copia de 32 commits de historia propia del router (`refs/heads/main = 12d0940`, un commit que no existe en este ODB), y se clona correctamente. El registro de ese borrado se perdió además cuando E-020 recortó el expediente a «E-018 en adelante».

**Lección:** el expediente documenta altas y no purgas. 5 de 9 commits con borrados no tienen entrada; las 1.428 eliminaciones de E-020 y E-022 no dejaron rastro del porqué.

## 10 · Dos linajes de `pi-memory` (verificado 2026-11-02)

| Linaje | Versión | Dónde | Depende de `@pi-agent/intermediate` | Contiene el fix de tenant (change 062) |
|---|---|---|---|---|
| Repo (HEAD, borrado del árbol) | `@pi-agent/memory@1.0.0` | `src/pi-memory/` en HEAD | **Sí** (`file:../pi-intermediate`) | **No** (`git grep memory-tenant` vacío) |
| Publicado (en ejecución) | `pi-memory@0.4.2` | `~/.pi/agent/npm/node_modules/pi-memory` | **No** (solo peers `@earendil-works/*`) | **No** (`find`/`grep` vacíos) |

Consecuencias: (a) el sistema vivo ejecuta un linaje **más antiguo** que el que se borró del árbol; (b) «0 consumidores de `pi-intermediate`» es cierto **en runtime** y falso en HEAD; (c) la fuga entre proyectos **no está corregida en ninguna de las dos copias**.

---

## Lectura

El material borrado **no se perdió**: está en commits alcanzables (`e54c5d9^`, `e8fb692^`) y en blobs/commits inalcanzables. Lo único irrecuperable es lo que **nunca se versionó**: el change 062, la evidencia del soak y los probes sueltos.

El riesgo inmediato no es una pérdida pasada, es una **futura**: 30 commits colgantes fuera de `prune-expire` que un `git gc` elimina, y un directorio (`docs/audit-2026-10-18/arquitectura-ecosistema/`) que sigue sin trackear.
