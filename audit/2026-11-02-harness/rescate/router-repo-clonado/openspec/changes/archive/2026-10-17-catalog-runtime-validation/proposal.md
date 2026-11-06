# catalog-runtime-validation

## Why

`providerContract` existe en la config y el validador de contratos existe como API,
pero nada lo comprueba al cargar la configuración: una referencia mal escrita
(`"agnes/free-v9"`) o un grupo de cuota por encima del RPM del contrato pasan
desapercibidas hasta runtime. El plan auditoría (O2, 2026-10-17) pide el
cableado mínimo en `loadConfig` sin tocar scheduler ni transporte.

## What Changes

- **Modified file**: `src/config.ts` — `loadConfig()` valida contra el catálogo
  publicado (`catalog/`) cuando alguna cuenta declara `providerContract`.
- **Comportamiento**: referencia inexistente, modelo no listado en el contrato
  (mismo proveedor) o límite de grupo que excede el RPM del contrato →
  `RouterError("config")` con el fallo exacto. Sin `providerContract` →
  cero I/O de catálogo (configs actuales sin cambios).
- **New tests**: `tests/catalog-runtime.test.ts`.

## Capabilities

### Modified Capabilities

- `provider-catalog`: add runtime validation on config load

## Impact

- No cambia el scheduler, el transporte ni `parseConfig` (la validación de
  campo ya es Zod).
- Fails-closed: si la referencia no resuelve, la carga de config falla con
  mensaje preciso.
- Alcance deliberado: no se introduce "strict mode" por defecto ni se
  fuerza `providerContract` en cuentas existentes.
