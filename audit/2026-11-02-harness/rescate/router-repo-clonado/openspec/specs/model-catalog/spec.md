# model-catalog Specification

## Purpose
Model specifications SHALL be stored as versioned, structured JSON cards providing exact capabilities, context windows, pricing, and known quirks for every model used by the router.

## Requirements

### Requirement: Versioned model cards
Each model card SHALL be a versioned JSON file. Specification changes SHALL create a new version rather than modifying the existing one.

#### Scenario: New model version
- **GIVEN** `agnes-3.0-flash-v1.json` with contextWindow 512000
- **WHEN** Agnes increases context to 1M tokens
- **THEN** `agnes-3.0-flash-v2.json` is created and v1 gains `supersededBy` — v1 is preserved for users who need the old spec

### Requirement: Capabilities enumeration
Model cards SHALL explicitly enumerate input/output modalities, streaming, tool calling, reasoning, and caching support.

#### Scenario: Text-only model
- **GIVEN** a model card for a text-only model
- **WHEN** inspected
- **THEN** `capabilities.input` is `["text"]`, `capabilities.vision` is `false`, `capabilities.audio` is `false`

#### Scenario: Multimodal model
- **GIVEN** a model card for a model that accepts images
- **WHEN** inspected
- **THEN** `capabilities.input` includes `"image_url"` and `capabilities.vision` is `true`

### Requirement: Context window specification
Model cards SHALL specify max input tokens, max output tokens, and any combined limits with source attribution.

#### Scenario: Context window from official docs
- **GIVEN** `agnes-3.0-flash-v1.json`
- **WHEN** inspected
- **THEN** `context.maxInput` is 512000 and sources reference the official wiki page

### Requirement: Pricing transparency
Model cards SHALL document published pricing even when it is zero, with source and verification date.

#### Scenario: Free model
- **GIVEN** a free model
- **WHEN** inspected
- **THEN** pricing fields are `0` with `currency: "USD"` and a note about verifying actual billing

### Requirement: Known quirks
Model cards SHALL document known behavioral quirks that affect the router: non-standard tool call formats, streaming oddities, lack of rate headers, token counting discrepancies.

#### Scenario: Agnes lacks rate headers
- **GIVEN** `agnes-3.0-flash-v1.json`
- **WHEN** inspected
- **THEN** `quirks.notes` mentions the absence of rate limit headers

### Requirement: Engine serialization
For this extension's API-only models, model cards SHALL carry an `engine` object that is
empty or a note explaining the model is not available for local inference. Documentation of
local-inference engine flags (llama.cpp/vllm/ollama) is out of scope for this extension
(owner constraint, 2026-10-17).

#### Scenario: API-only model has empty engine
- **GIVEN** an API-only model (e.g., Agnes 3.0 Flash via HTTPS)
- **WHEN** inspected
- **THEN** `parameters.engine` is an empty object `{}` with a note explaining the model is not available for local inference

### Requirement: All model cards pass CI
Every model card in `catalog/models/` SHALL pass schema validation (Zod) in CI.

#### Scenario: Malformed card fails CI
- **GIVEN** a model card missing required `context.maxInput`
- **WHEN** CI runs model validation
- **THEN** validation fails
