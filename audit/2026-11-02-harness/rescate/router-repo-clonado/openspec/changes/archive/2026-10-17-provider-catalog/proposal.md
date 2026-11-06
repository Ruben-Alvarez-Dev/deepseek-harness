# provider-catalog

## Why

Providers (Agnes, DeepSeek/Qwen, OpenAI, Anthropic...) tienen especificaciones distintas que cambian con el tiempo: URLs, modelos disponibles, rate limits, precios, autenticación, términos de uso. Dos cuentas del mismo proveedor pueden estar bajo contratos diferentes (free tier vs Token Plan vs Enterprise), cada uno con sus propias condiciones.

Agnes ya cambió sus límites: julio 2026 → 20 RPM gratis, septiembre 2026 → 10 RPM efectivos. Un usuario que contrató en julio puede tener condiciones distintas de uno que contrató en septiembre. Si simplemente machacamos los datos del proveedor, perdemos el contrato original del usuario.

Además, `docs/agnes-research.md` documenta la investigación en prosa, pero no es un formato estructurado que el router pueda consultar en runtime para validar: ¿está este modelo disponible en este contrato? ¿Cuál es el límite real de RPM? ¿La URL base es distinta para enterprise?

El SOTA en gestión de APIs (Stripe API versioning, AWS API versioning, OpenAPI specs) versiona las especificaciones del proveedor para que los clientes puedan anclarse a una versión concreta.

## What Changes

- **New directory**: `pi-providers/` con `src/`, `schemas/`, `contracts/`
- **New files**: `schemas/provider.schema.json` — JSON Schema del catálogo de proveedores
- **New files**: `contracts/agnes/free-v1.json`, `contracts/agnes/tokenplan-v1.json` — contratos versionados
- **New file**: `src/catalog.ts` — carga y resolución de contratos
- **New file**: `src/validator.ts` — valida que un perfil respeta los límites del contrato
- **New tests**: `pi-providers/tests/`
- **Modified**: profile system — los perfiles referencian `providerContract` en cada cuenta

## Capabilities

### New Capabilities

- `provider-catalog`: Catálogo versionado de especificaciones de proveedores con contratos inmutables

### Modified Capabilities

- `profile-system`: Los perfiles referencian contratos de proveedor versionados

## Impact

- Catálogo de proveedores como source of truth para límites, modelos y URLs
- Contratos versionados e inmutables: añadir `free-v2.json` no pisa `free-v1.json`
- Las cuentas en perfiles referencian `providerContract: "agnes/free-v1"` → validación automática
- Sin dependencias externas nuevas
## Amendment (2026-10-13) — reconciled to the reduced & audited plan

Restored verbatim from commit `ab1ac19`; reconciled with decisions `0899a20`/`abd2294`/`a0d1f1e`:

- Sources: **LiteLLM `model_prices_and_context_window.json` (4042 models, community MIT) is the primary
  source**; Agnes wiki `.md` supplies Agnes contracts (Agnes is not fully covered by LiteLLM).
- Population is automatic: `catalog-sources.json` declares fetch URLs; `npm run catalog:update`
  fetches → parses → regenerates JSON → shows diff; the user only reviews `git diff` and commits.
  Zero hand-written JSON.
- Serialization mandatory (commit `a0d1f1e`): prefixed UUIDv7 (`pvd_`, `ctr_`, `mdl_`, `mdv_`, `eng_`)
  and ISO 8601 timestamps (`z.string().datetime()`); Zod rejects unprefixed IDs.
- No SQLite, no vectors, no HF embeddings (unchanged from reduced plan; audit gaps accepted).

- Implementation location (ADR 0005, owner order 2026-10-13): NO sibling `pi-providers/` package.
  The catalog ships inside the single extension: logic in `src/adapters/`, data under a root
  `catalog/` directory, scripts in `scripts/`.
