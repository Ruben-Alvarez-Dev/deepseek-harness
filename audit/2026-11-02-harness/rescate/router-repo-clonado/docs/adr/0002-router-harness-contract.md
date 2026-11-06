# ADR 0002: contrato de integración del router con el harness (provider, bus y errores)

**Estado:** aceptado

## Contexto

El harness compone piezas independientes: el limbo (selección/gobernanza), la memoria y este
router de cuentas. Para engranarlas de forma óptima según la configuración — una, varias o todas
a la vez — cada pieza debe exponer un contrato mínimo y hablar un idioma común. La doc oficial de
Pi distingue dos capas (`docs/virtual-models.md`, `docs/custom-provider.md`):

- `pi.registerProvider()` → proveedor físico que resuelve credenciales, cuotas y stream.
- `pi.registerVirtualModel()` → decisión por petición (`route(request, ctx)`), el futuro supervisor.

Este router es, y debe seguir siendo, **un provider** (cuentas+cuotas+stream), **no** un virtual
model. La decisión de qué modelo/cuenta usar por petición corresponde a otra pieza (supervisor) que
puede resolver en este provider mediante `ctx.modelRegistry`.

## Decisión

1. **Frontera de pieza**: el router se expone como paquete Pi estándar con `pi.extensions` y
   `peerDependencies` host-provided. No registra virtual models ni toca el runtime del host.
2. **Puertos hexagonales** (`src/ports.ts`): `StateStore`, `Clock`, `CredentialResolver`,
   `EpisodeStorePort` y `ExtensionBus`. La composición (root) inyecta implementaciones; los
   consumidores dependen solo de interfaces, nunca de clases concretas.
3. **Idioma común**: el bus oficial de Pi (`pi.events`, `emit(channel, data)`/`on(channel, data)`)
   se usa para anunciar hechos entre piezas sin acoplarlas. Canales emitidos por esta pieza:
   - `account-router/http_feedback` `{ accountId, status }` — tras cada respuesta HTTP clasificada.
   - `account-router/episode_captured` `{ taskFamily, provenance }` — tras capturar una lección.
   El `ExtensionBus` recibido por el root es una vista estrecha de `pi.events`, para facilitar
   pruebas y permitir al harness enrutar a un bus propio.
4. **Clasificación de errores**: la respuesta upstream se clasifica por vocabulario fijo
   (`upstreamDiagnostic`), nunca copiando el body. Novedades 2026-10-12:
   - `insufficient_quota` en un 429 (permanente) → **desactiva la cuenta** (como 401/403) en vez de
     enfriar el grupo y esperar en bucle.
   - 429 sin cuerpo de cuota → rate-limit transitorio: cooldown + resume normal.
5. **Memoria como puerto**: el store de episodios se obtiene vía `createEpisodeStore()` de la
   fábrica en adapters; el harness puede inyectar su propia implementación de `EpisodeStorePort`
   (p. ej. `pi-memory`) sin tocar el router.

## Consecuencias

- Cualquier otra pieza puede suscribirse a los canales del bus y reaccionar sin editar este repo.
- El supervisor futuro (virtual model) podrá delegar en este provider sin conocer su interior.
- El router deja de depender de implementaciones concretas internas: todo lo que cruza frontera lo
  hace por interfaz (`ports.ts`).
- Cambiar los canales del bus o añadir puertos requiere actualizar esta ADR y los tests de contrato
  (`tests/episode-integration.test.ts`, `tests/transport.test.ts`).