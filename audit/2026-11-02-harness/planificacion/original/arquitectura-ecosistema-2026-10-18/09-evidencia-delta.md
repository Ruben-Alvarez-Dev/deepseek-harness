# Evidencia nueva — delta sobre diseño y código existentes

Ronda INV-10 del expediente 2026-10-18. [Índice](00-indice.md) · [Recomendación diferencial](08-delta-recomendado.md).

## 1. Qué se ejecutó realmente

Comando local: `node .probe-architecture-delta.mjs`, desde la raíz canónica del router.

- Node observado: `v26.5.0`.
- Probe local gitignored por E-020, **no suite versionada**: `.probe-architecture-delta.mjs`.
- SHA-256 del probe final: `0661a7fd3c1bf7d27e579b5525c5dda25a919c70ac1a508dfc4d447a646901a3` (315 líneas).
- Resultado final: **68 aserciones satisfechas, 0 fallos del probe; 11 bases SQLite exclusivamente `:memory:`; 0 intentos de I/O prohibido en los módulos evaluados**.
- Hubo versiones preliminares de 59 y 66 aserciones. No se suman como 193 pruebas ni como réplicas independientes. Las cifras y hashes de este documento corresponden a la versión final de 68.

**Un PASS aquí puede confirmar un defecto existente. No significa «68 controles de seguridad del producto aprobados».** Las referencias correctivas se ejecutaron dentro del probe, no se aplicaron a producto.

### Aislamiento y límites

Se transpilaron los cuerpos completos de 29 módulos TypeScript inspeccionados mediante el compilador ya instalado y se evaluaron en contextos VM con `require` allowlisted. Se utilizaron los cuerpos reales de Store, LocalFirstBackend, MemoryControl, MemoryFabric, ledger, firma, hooks, renderer, gates y VerificationFacade. No se importaron entrypoints por el cargador ordinario de la aplicación.

El código evaluado solo pudo abrir SQLite `:memory:`. `fetch`, procesos, timers y escritura de ficheros de aplicación quedaron interceptados para fallar. Se leyeron fuentes para construir el probe; el driver escribió este expediente y el probe bajo la raíz autorizada. No se afirma «cero lecturas de filesystem».

- Las claves Ed25519 se generaron sintéticamente en RAM. Ninguna clave real, Keychain, valor de entorno de credenciales, proveedor o cuenta fue consultado.
- En el SPI se sustituyeron módulos de consolidación/GC por stubs que fallarían si se invocasen. **No se ejecutaron esos mantenimientos**; sus riesgos se localizan estáticamente.
- En FACTORY se suministraron dos ficheros sintéticos mediante un FS simulado y un checker de fixture. No se ejecutaron adversariales externos ni el CLI real; el digest de paquete no se probó en este caso sin lista `files`.
- El entrypoint del proxy se registró contra un host mínimo simulado; se invocaron sus callbacks reales. No es una prueba dentro del Pi instalado ni de todos sus canales.
- Sandbox: solo generación de argumentos y `supports()`. No se ejecutaron bwrap, srt, Gondolin, sandbox-exec ni una VM.
- No hubo instalaciones, servicios arrancados, inferencias, llamadas de proveedor, publicación, cambio de permisos, worktrees ni copias de aplicación.
- La VM de JavaScript es un mecanismo del probe para controlar imports, **no el sandbox propuesto para ejecutar agentes no confiables**.

## 2. Resultados y controles positivos

| ID | Aserciones | Código actual y resultado observado | Contraste / límite |
|---|---|---|---|
| V01 | 1–11 | Ledger firmado válido acepta cambios de `ref`, `sourceHarness`, `sourceEventId`, `privacyClass`, `idempotencyKey`, `schemaVersion`; también firma borrada y eliminación del último evento. El contenido alterado sí se detecta. Esquema inspeccionado: cero triggers sobre `event_ledger`. | Reproduce y amplía la ronda anterior. La ausencia de triggers no prueba por sí sola inseguridad; el alcance firmado y la cabeza custodiada son problemas distintos. No se simula root ni se prueba custodia externa. |
| V02 | 12–16 | Con Store/Backend/Control reales y `tenant-A`, search filtra A, pero `get('other')` devuelve un registro B y ya incrementó su accessCount; `forget('other')` invalida B. | Un guard de referencia con `peek` y ámbito rechaza B antes del `get`. Prueba de frontera en backend local compartido, no explotación de una API desplegada. No basta arreglar dos métodos y declarar cubierto todo mantenimiento. |
| V03 | 17–19, 66 | Inserción duplicada tras invalidar el topic deja la revisión anterior invalidada. Si falla append después de un save real, quedan fila, FTS y vector persistidos en la DB sintética. | En la misma conexión, un savepoint de referencia revierte fila/FTS/vector y conserva el original ante duplicado. No acredita una transacción con backend remoto ni ausencia de otras rutas no atómicas. |
| V04 | 20–22 | CanonClient acepta una firma real de la clave pineada después de cambiar `locator.payload` y `confidence`. | Una representación de referencia que incluye esos campos rechaza el mismo cambio. Demuestra cobertura de campos, **no** una implementación JCS/DSSE aprobada ni verificación de la fuente citada. |
| V05 | 23–32 | DMA con presupuesto 32 entrega texto valorado en **1016 tokens por su propio estimador**; presupuesto 0 devuelve cabecera de 8 tokens y ningún memory ID. | Render-cost de referencia, manteniendo el knapsack existente, respeta 0/1/8/16/32/128/256 y conserva un item que cabe. No se afirma conteo exacto del proveedor ni equivalencia de selección para todo corpus. |
| V06 | 33–34 | `/caveman` normal transforma `I think the migration is safe.` en `the migration is safe.`. El probe léxico da 1 a dos frases con permisos de Alice/Bob intercambiados. | Pérdida de incertidumbre y límite del métrico. El comando es **opt-in** en el adapter leído; no se demuestra que comprima automáticamente toda respuesta de producción. |
| V07 | 35–37 | RetrievalFabric recibe corpus con A/B, pero el candidato semánticamente relevante B, ausente del shortlist léxico, no llega a dense ni a fused. | Unión independiente de candidatos lo incluye en la fixture. Cobertura/recall@2 del caso: 0→1; no se afirma mejora global, del top-1 o con embeddings reales. No usar `all()` sin ACL como supuesto arreglo. |
| V08 | 38–45 | Hard gate reconoce `write/path`, no normaliza `Write/file_path`. Entry publicado del proxy registra `tool_call`, no `user_bash`; bloquea secreto sin skills, pero permite write fuera de cwd bajo ELITE. Su contexto lleva SDD/AV nulos y premises vacías. | El mismo evaluador rechaza ese write al exigir SCOPE_GATE. No activar toda la cadena a ciegas: SDD sin hechos puede bloquear escrituras legítimas. No es un bypass demostrado del Pi instalado. |
| V09 | 46–49 | GondolinProvider ya existe; rechaza `network:true` y construye mount read-only. La invocación bwrap actual no incluye el workdir solicitado. | Construcción de política, no prueba del aislamiento ni de la compatibilidad del CLI instalado. Retira la falsa novedad de «añadir micro-VM». |
| V10 | 50–56 | VerificationFacade acepta dos artefactos sintéticos diferentes con checker válido. Sin `files`, artifactHash difiere pero hash del recibo y payload/firma coinciden. | Incluir sujeto/digest distingue ambos en referencia. Los guards existentes sin verificador y required-unavailable bloquean correctamente. No se atribuye este camino al dispatcher real de FACTORY. |
| V11 | 57–58 | El deep import físico resuelve en layout convencional hacia `@pi-agent/pi-intermediate`, no hacia la dependencia declarada `@pi-agent/intermediate`. El nombre de paquete sí resuelve en la instalación local actual. | Prueba de resolución, no instalación limpia ni publicación. Permite recomendar usar la frontera pública existente sin crear otro paquete. |
| V12 | 60–65 | Ruta `/memory/save` escribe sin evento en fabric; replay borra ese registro. Flush de compactación también escribe sin evento; hook de sesión registra lifecycle pero no el save reconstruido. Dos revisiones del mismo topic quedan correctamente active/invalidated antes de replay, pero **ambas active después**. | Store, Control, Fabric, ruta y hooks reales en RAM. Demuestra falta de mediación completa y de replay semántico; no se tocó una memoria real. Consolidación/GC no ejecutados. |
| V13 | 67–68 | Búsqueda compuesta MemoryFabric→MemoryControl→reranker y RetrievalFabric→reranker llama dos veces al mismo reranker. | Puerto de candidatos sin rerank previo reduce **2→1 llamadas** y conserva el orden de los dos registros de fixture. No se afirma misma calidad con cualquier reranker/corpus ni mejora global de latencia. |
| V00 | 59 y assert final | Cero intentos de red/proceso/escritura FS prohibida desde los módulos evaluados. | No incluye lecturas explícitas de fuentes y escrituras autorizadas del driver/expediente. |

### Medición sintética de packing — motivo para conservar, no sustituir por moda

100 muestras tras 20 calentamientos, `n=10`, `B=800`, knapsack exacto existente en VM:

- matriz `take`: **8811 bytes**; no incluye el DP Float64 ni runtime;
- mediana **0.0192 ms**, p95 **0.0231 ms**;
- un solo workload sintético y un entorno local; no SLO, benchmark end-to-end, intervalo estadístico ni acreditación de producción.

No hay evidencia aquí para reemplazar el algoritmo exacto por greedy. Sí la hay para corregir el coste que se le entrega y limitar entradas.

## 3. Localizadores de los hechos principales

Raíces M/I/P/F definidas en §4. Fuentes estáticas complementarias no ejecutadas se indican expresamente.

- Escritura dispersa: `M/fabric.ts:94–115,208–227`; `M/memory-gateway.ts:30–55`; `M/plane.ts:61–75`; `M/hooks.ts:94–110,126–138`.
- Topic/atomicidad: `M/memory.ts:154–181`; `M/fabric.ts:105–115`.
- Tenant: `M/memory-control.ts:71–73,122–167,171–209,251–256`; `M/memory-spi.ts:80–137`. El mantenimiento global se observa en código, no se ejecuta.
- Budget: `M/memory-dma.ts:49–67`; `I/token-ring.ts:22–24,159–191`.
- Candidatos/doble rerank: `M/fabric.ts:94–100`; `M/memory-control.ts:122–134`; `M/retrieval-fabric.ts:82–121,130–164`.
- Ledger/firma: `M/memory-ledger.ts:82–83,139–178,198–212`; `M/canon-contract.ts:50–63`.
- Custodia de clave en DB, solo lectura: `M/memory-stack.ts:19–25`; inyección ya posible en Stack/Fabric, pero no expuesta por PiCore en `M/core.ts:23–65`.
- Proxy: `P/index.ts:172–192,247–255,314–329`; `P/scoring.ts:5–6,96–121`; `P/gates.ts:381–443`. Está cableado el evaluador; no están todos sus hechos/canales ni una autoridad externa independiente.
- Sandbox existente: `I/sandbox.ts:62–89,229–308,323–350`; integración opt-in Pi: `M/extension.ts:34–74` (lectura estática, no carga del runtime).
- FACTORY: `F/verification/facade.ts:65–78,198–215,238–245`; `F/verification/types.ts:44–54`.
- Ruta de CLI FACTORY, solo lectura: `Jart-FACTORY/package.json:25–27` → `F/cli/main.ts:6–15` → `F/cli/jart-factory.ts:15–29,106–150,212–312`. Dispatcher de anillo-1/G3 y empírico, detenido antes de publish; no se localiza llamada a VerificationFacade en ese dispatcher. No heredar garantías de la fachada por nombre de producto.
- Portabilidad: `M/intermediate.ts:11`; `pi-memory/package.json:8–25`; separación ya existente del router: `pi-account-router/src/ports.ts:1–56`, `src/extension.ts:39–78`, `src/application/router.ts:20–28`.

## 4. Manifiesto de módulos evaluados

Alias: **M** = `/Users/ruben/Code/PI-agent/src/pi-memory/src`; **I** = `/Users/ruben/Code/PI-agent/src/pi-intermediate/src`; **P** = `/Users/ruben/Code/_Jart-OS-AI/jart-proxy/src`; **F** = `/Users/ruben/Code/Jart-FACTORY/kernel`.

Los alias bajo Code pueden ser symlinks. Se usó la fuente alcanzable por esas rutas; no se presenta el corpus documental como binario desplegado.

| Ruta | Líneas | SHA-256 |
|---|---:|---|
| `I/provenance.ts` | 41 | `a4f3fc2258151f2011a203bc79ed208d9af7f30c020470fcd4827d9301ee0643` |
| `I/db.ts` | 288 | `cd81a7c48326c474f59cd9ce56bb77d85d4e6691aee085f52b90b479d13406e0` |
| `I/token-ring.ts` | 683 | `9fea145ce1834cce1c1c58400117d38fd6708a575bffd6872bd28780537afc0d` |
| `I/governance.ts` | 79 | `343b29447ef7a7089cb4a11c74ab906cafb86972952516de307ba1f6e139a9da` |
| `I/hard-gates.ts` | 82 | `9ba5af78c681f002f9e026bc2bd19f7b9b4540ea1f5ba5d1d7da1efa6c56ade7` |
| `M/memory-vector.ts` | 46 | `230c92fadabe8c7a08ca614c0e4428824ed0cb172762c361fe0094e1bff292fd` |
| `M/memory-vector-index.ts` | 234 | `cddbcc19b2d36596f78edf63ab37b7e912db344195d7427c3b34bc907c41aa7d` |
| `M/memory.ts` | 558 | `5fb44ce44738d352b1b01603fa1abc613389c47b9c3f4bd9bcce62d8e62e550f` |
| `M/memory-signer.ts` | 37 | `373ba59e2ad84efbc03f085e5fd8f51aa949d4dca333a14beb898d778b44b065` |
| `M/plane.ts` | 76 | `2ded7015caa10d06eaeb265272ae0b03da7ac48dacc5296d1d3a9fed70a999b8` |
| `M/memory-dma.ts` | 68 | `74442a6788fb48569e93e8ddedd63760cd2b1c07626ae1bf6ccd87a34c22746f` |
| `M/memory-admission.ts` | 136 | `e83f39633a49c4a62130c6d171d370feb9eeab548926e0a4a6b6cf1ceafe4ba7` |
| `M/memory-spi.ts` | 181 | `38c2c9bb05c4cb91e28231af77b004f54fc250f0b6e608033e9a47c284990474` |
| `M/memory-control.ts` | 303 | `5a0be0499bcc68df4971ccb8a070aeedd20a55aef4ff1f3036a4d09bdb8f0bf1` |
| `M/memory-ledger.ts` | 222 | `61f69ee3b66793f7cea9f931a7cc49d3a73f20b80b280ca013f74280c35b2968` |
| `M/canon-contract.ts` | 77 | `38a53fefe993b9e1702de2100a4ec9e741c8d9e0de024432e5d416bd1b6e37c9` |
| `M/memory-embeddings.ts` | 421 | `4be431ef17e52e1b92daad70b07c2b1673dfb60570bd5298fde9d779063da29a` |
| `M/retrieval-fabric.ts` | 232 | `b37e28ecb15abc9e4c377864a0b82d9cd09514a381c53ce632cb76d175502796` |
| `M/fabric.ts` | 382 | `f8b230a104a602c4ad0bee419859122145669bd4422bfcb0835b44de9392f1a1` |
| `P/types.ts` | 122 | `2e3ea3e9967e78709396e9d0b50f3e0360603258c284a386c8958f8159e82c4f` |
| `P/scoring.ts` | 121 | `91c3dfc60acf4d2130c626ff35fc18e7bbeefcc82a99ccfa9eb2bf1a1a9e1ee1` |
| `P/proposition-extractor.ts` | 129 | `6cea007665ee6d84941c2b6e0005ac42981ca980afdbc8abde0966575b578e25` |
| `P/mcp-validator.ts` | 51 | `21df78fe30acde70c2ed5b5c1b5e38bdb7a00bf53fdbd537840b3b095494527b` |
| `P/gates.ts` | 444 | `2088075c2cc568d4071140365e93d5deae6bccad412bd0b200f4d3c725c4d491` |
| `P/index.ts` | 329 | `e551f73997a86d6ff2dc0309e9bc288e6ad2baf5a22dca4c3fedb3d6ee20094c` |
| `I/sandbox.ts` | 372 | `0e513ea1f5e51a4ed83614ed2990fff8eb671b9aa51c8d95b78bbf17e3275863` |
| `F/verification/facade.ts` | 245 | `874e684179d7231d008fd9156ea74af4febba518e35ad8584c55f766ae0b76d3` |
| `M/memory-gateway.ts` | 98 | `d1af6aefc1f0966205acbafc86b1ce5c4506552b9c12a17387d10d298b4a351f` |
| `M/hooks.ts` | 148 | `7f484669aae53888d4500b2e1a3e01d5ea56615fdd062f0f7326f91507e30e74` |

HEAD observados, no promesa de repos congelados: PI-agent `855afc9e6304bd62ba7628536c083cb12f77f070`; OS-AI `c0448aeb793e1b96c4afc2d42cc834ddd50ab156`; FACTORY `ce78a9e86ca36b2e43fb00379ae65e3e4642117b`. Para reproducir, mandan hashes de los ficheros concretos; FACTORY había cambiado respecto a rondas anteriores.

## 5. Qué queda demostrado y qué no

**Demostrado en el alcance aislado:** los contraejemplos de §2 existen en estos cuerpos de código; se conservan controles positivos; ciertas correcciones de referencia eliminan el contraejemplo sin necesitar otro repositorio, framework o servicio.

**No demostrado:** que un atacante haya explotado instalaciones reales; que los módulos estén todos cargados hoy; que otro backend replique exactamente el comportamiento local; que los formatos propuestos sean mejores; que una implementación corregida y desplegada haya superado estas puertas; que el ecosistema completo esté auditado.

No hay producto corregido por la existencia de este documento. La recomendación completada es el delta 08; su aplicación a los repositorios pertinentes requiere el flujo y alcance de cambio correspondiente. Este trabajo no modifica la raíz canónica del router salvo documentación y probe local ignorado, ni revoca E-020/E-028.

## 6. Verificación de la entrega documental

Comprobación posterior a la ejecución: los 29 hashes/recuentos del manifiesto y la huella de las 315 líneas del probe coinciden con las fuentes locales. Diez Markdown del expediente: 53 enlaces locales resuelven; fences equilibradas y sin whitespace final. `git diff --check -- .` pasa; el diff de producto (`src`, `scripts`, dependencias y `openspec`) está vacío; `git check-ignore` confirma el probe. No se ha hecho commit/push. Esta verificación documental no se añade a las 68 aserciones funcionales ni demuestra corrección del producto.
