# model-catalog

## Why

Cada modelo LLM tiene especificaciones precisas que afectan al comportamiento del router: contexto máximo, tokens de salida, capacidades (tools, streaming, vision, audio), precios, parámetros soportados, cutoff de entrenamiento, y peculiaridades documentadas. Dos modelos del mismo proveedor bajo el mismo contrato pueden tener capacidades radicalmente distintas (Agnes 3.0 Flash vs Flash Max vs Pro).

Hoy esta información está dispersa entre `docs/agnes-research.md` (prosa), `src/adapters/models.ts` (hardcodeado), y la documentación oficial del proveedor (wiki, docs, README de GitHub). No hay una fuente única estructurada y consultable.

Además, HuggingFace mantiene un catálogo abierto de ~1M+ modelos con model cards estandarizadas. Podemos usarlo como fuente inicial para poblar nuestro catálogo, completando con verificación manual donde HF no tenga datos suficientes.

El SOTA en gestión de modelos (Ollama Modelfiles, OpenRouter model list, LiteLLM model_prices_and_context_window.json) mantiene un catálogo estructurado y versionado de especificaciones de modelos, actualizado periódicamente.

## What Changes

- **New directory**: `pi-models/` con `src/`, `schemas/`, `models/`
- **New file**: `schemas/model-card.schema.json` — JSON Schema para fichas de modelo
- **New files**: `models/agnes-3.0-flash-v1.json`, `models/deepseek-v4-flash-0731-v1.json`, etc.
- **New file**: `src/catalog.ts` — carga y query del catálogo
- **New file**: `scripts/import-huggingface.ts` — importa model cards desde HF Hub
- **New tests**: `pi-models/tests/`
- **Modified**: provider-catalog — los contratos referencian modelos por ID del catálogo

## Capabilities

### New Capabilities

- `model-catalog`: Catálogo estructurado y versionado de especificaciones de modelos LLM

## Impact

- Fuente única de verdad para specs de modelos
- Versionado: cambios en specs de un modelo = nueva versión del archivo
- Importable desde HuggingFace, verificable manualmente
- Los contratos de proveedor referencian modelos por ID (`"models": ["agnes-3.0-flash@v1"]`)
- Sin dependencias externas nuevas (HF API es opcional para import, no en runtime)
## Amendment (2026-10-13) — reconciled to the reduced & audited plan

Restored verbatim from commit `ab1ac19`; reconciled with `0899a20`/`abd2294`/`a0d1f1e`:

- `scripts/import-litellm.ts` REPLACES the HF-only importer as the primary populate path
  (LiteLLM JSON, 4042 models, per-model max_input_tokens/max_output_tokens/capability flags);
  HF API remains optional enrichment only. Agnes cards come from the Agnes wiki path.
- `catalog-sources.json` + `npm run catalog:update`: fetch → generate → diff → user commits.
- Serialization: prefixed UUIDv7 (`mdl_`, `mdv_`, `eng_`) + ISO 8601, Zod-enforced (`a0d1f1e`).

- Implementation location (ADR 0005, owner order 2026-10-13): NO sibling `pi-models/` package.
  Logic in `src/adapters/`, model cards under root `catalog/models/`, importer in `scripts/`.
