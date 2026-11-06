# Tasks: catalog-runtime-validation

- [x] 1. `src/config.ts`: `validateProviderContracts(config)` — referencia,
  modelos (si el proveedor del contrato coincide con el adapter configurado) y
  ventanas de cuota vs `limits.rpm`; cero I/O sin `providerContract`
- [x] 2. `loadConfig()` llama a la validación tras `parseConfig`
- [x] 3. `tests/catalog-runtime.test.ts`: referencia inexistente falla con
  mensaje preciso; grupo 20 req/60000 vs contrato 10 RPM falla; config
  conforme pasa; sin `providerContract` no se toca el catálogo
- [x] 4. `npm run verify` verde
- [x] 5. `openspec validate --all --strict` + archive
