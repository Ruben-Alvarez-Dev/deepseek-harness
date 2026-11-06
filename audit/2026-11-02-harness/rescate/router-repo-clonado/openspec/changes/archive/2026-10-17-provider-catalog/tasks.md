# Tasks: provider-catalog

Layout ejecutado según ADR 0005 + amendment 2026-10-13: SIN subpaquete `pi-providers/`.
Datos en `catalog/contracts/`, lógica en `src/adapters/provider-catalog.ts` (Zod),
CI en `scripts/check-contracts.ts` (`npm run check:providers`), wiring en `package.json`.

- [x] 1. (Amendment) Estructura de directorios: `catalog/contracts/{provider}/` en vez de `pi-providers/`
- [x] 2. Schema de contrato: `ProviderContractSchema` en `src/adapters/provider-catalog.ts` (Zod en vez de JSON Schema — sin dependencia nueva; UUIDv7 con prefijo `ctr_` + ISO 8601 obligatorios)
- [x] 3. Tipos TypeScript alineados: `ProviderContract` = `z.output<...>` en el mismo archivo
- [x] 4. `loadProviderCatalog` + `resolveProviderContract` (por ref `provider/contract-vN`) + `latestProviderContract` (cadena supersedes/supersededBy) en `src/adapters/provider-catalog.ts`
- [x] 5. `validateAgainstProviderContract` — modelos fuera de contrato y ventanas de cuota que exceden el RPM del contrato → `RouterError("config")` (modo strict)
- [x] 6. `catalog/contracts/agnes/free-v1.json` con datos verificados de `docs/agnes-research.md` (10 RPM efectivos 2026-10-10; sin headers de rate limit)
- [ ] 7. CONTRATO qwen/deepseek-v4-flash: **FUERA DE ALCANCE (2026-10-17)** — no hay datos de fuente en el repo que verificar; `_template.json` documenta cómo añadirlo
- [x] 8. `catalog/contracts/_template.json` como plantilla documentada
- [x] 9. `providerContract` (string `provider/contract-vN`, opcional) en `AccountSchema` (config.zod.ts) y `Account` (domain/types.ts) — según diseño "Cuenta → Contrato" (ADR 0005: perfiles retirados)
- [x] 10. Tests en `tests/provider-catalog.test.ts`: contrato válido; modelo no listado rechazado; límite excedido rechazado; cadena supersedes/supersededBy + latest; resolución por ref; cadena inconsistente rechazada. El caso "inmutable → error en CI" requiere store de hashes (fuera del propósito) y queda documentado en el handoff en vez de implementado
- [x] 11. CI: `npm run check:providers` (Zod + referencias de cadena); añadido a `verify`
- [x] 12. Suite completa `npm run check` verde
- [ ] 13. **FUERA DE ALCANCE (2026-10-17)**: `catalog-sources.json` + `catalog:update` auto-populate — excede el propósito de la extensión (restricción del propietario)
