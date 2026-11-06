# ADR 0001: raíz activa y snapshots físicos versionados

**Estado:** **SUPERSEDED** — retirado por orden del propietario el 2026-10-13. La regla de
copias físicas en `versions/` queda abolida (una sola versión en la raíz); ver ADR 0005.
Este documento se conserva como referencia histórica de la decisión original.

## Contexto

El proyecto requiere una versión activa editable y copias físicas `v1` y `v2`, sin que ningún
artefacto de trabajo salga de la raíz del repositorio.

## Decisión

La raíz conserva el paquete activo (`src/`, `tests/`, `docs/`, `openspec/` y `package.json`).
Las copias físicas se alojan en `versions/v1/` y `versions/v2/`. No se usan worktrees anidados ni
directorios externos. La regla se replica en `AGENTS.md` y `docs/repository-layout.md`.

## Consecuencias

- Las herramientas npm y Pi se ejecutan desde la raíz activa.
- Las versiones archivadas no son objetivos de instalación ni desarrollo cotidiano.
- Todo cambio estructural futuro debe preservar esta frontera y actualizar esta ADR si la cambia.
