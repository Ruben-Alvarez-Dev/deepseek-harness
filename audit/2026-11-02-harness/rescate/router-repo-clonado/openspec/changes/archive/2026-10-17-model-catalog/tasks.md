# Tasks: model-catalog

Layout ejecutado según ADR 0005 + amendment 2026-10-13: SIN subpaquete `pi-models/`.
Fichas en `catalog/models/{provider}/`, lógica en `src/adapters/model-catalog.ts` (Zod),
CI en `scripts/check-models.ts` (`npm run check:models`), wiring en `package.json`.

- [x] 1. (Amendment) Estructura de directorios: `catalog/models/{provider}/` en vez de `pi-models/`
- [x] 2. Schema de ficha: `ModelCardSchema` en `src/adapters/model-catalog.ts` (Zod en vez de JSON Schema; UUIDv7 con prefijo `mdl_` + ISO 8601 obligatorios)
- [x] 3. Tipos TypeScript alineados: `ModelCard` = `z.output<...>` en el mismo archivo
- [x] 4. `loadModelCatalog` + `resolveModelCard` (por `provider/model` y por `provider/model@vN`)
- [x] 5. `catalog/models/agnes/agnes-3.0-flash-v1.json` con datos de `docs/agnes-research.md` + wiki (contexto 512K/65.536, sin headers de rate limit, USD 0)
- [x] 6. `catalog/models/agnes/agnes-2.5-flash-v1.json`
- [ ] 7. **FUERA DE ALCANCE (2026-10-17)**: ficha qwen/deepseek — no hay datos de fuente en el repo; `_template.json` documenta cómo añadirla
- [x] 8. `catalog/models/_template.json` como plantilla documentada
- [ ] 9. **FUERA DE ALCANCE (2026-10-17)**: `scripts/import-litellm.ts` (4042 modelos) + HF enrichment — exceden el propósito de la extensión (restricción del propietario)
- [x] 10. Referencia `modelRef` en contracts: los contratos listan modelos por `id` (`contract.models[].id`), consistente con las fichas; no se añade campo nuevo
- [x] 11. Tests en `tests/model-catalog.test.ts`: ficha válida; ID sin prefijo rechazado; query por modelId (latest); query por modelId@version; carga de fichas publicadas. El caso "import HF" queda sin test junto con su exclusion del scope
- [x] 12. CI: `npm run check:models` (Zod + referencias de versión); añadido a `verify`
- [x] 13. Suite completa `npm run check` verde
- [x] 14. (Amendment) Sustituido: ver task 9 (fuera de alcance por restricción de propósito, 2026-10-17)

**Requerimientos spec fuera de alcance (2026-10-17):** "HuggingFace import" y el escenario
llama.cpp de "Engine parameter serialization" — recortados del spec al archivar; las fichas
API-only documentan `engine` vacío + nota (escenario API-only conservado).
