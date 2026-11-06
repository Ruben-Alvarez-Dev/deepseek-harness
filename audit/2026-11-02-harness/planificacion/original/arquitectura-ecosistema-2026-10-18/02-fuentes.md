# Fuentes y cobertura de lectura — ecosistema Jart / arnés portable

Fecha de captura: 2026-10-18. Estado: investigación en curso, no certificación del ecosistema.
Volver al [índice](00-indice.md).

## 1. Cómo interpretar este registro

- D01–D61 se leyeron completos en la ronda de profundización documental. El handoff D34 se leyó en dos tramos por el límite de salida de la herramienta.
- Total: **61 documentos, 8.692 líneas, 646.248 bytes, 61 contenidos distintos por SHA-256**. Las líneas se cuentan con `len(bytes.splitlines())`; no siempre coinciden con `wc -l` si falta el salto final.
- El inventario de `Jart-OS/DOCS/` encontró **27.714 archivos y 593.728.508 bytes**. Inventariar no significa leer: no se ha leído todo el corpus ni se ha recalculado su clasificación documental histórica.
- Los hashes fijan los bytes localizados al documentar esta ronda; no autentican autoría, ratificación ni calidad del contenido.
- Las etiquetas CANON, propuesta, superseded o implementado se atribuyen al documento. Una afirmación histórica de despliegue o de tests no se convierte por leerla en una comprobación actual.
- No se copiaron fuentes completas ni corpus al router. Se conservan localizadores, huellas y síntesis propia. No se leyeron almacenes reales de credenciales ni se ejecutaron instrucciones encontradas en los documentos.

## 2. Localizadores

Las rutas siguientes son absolutas locales. El corpus conserva rutas originales tras trasladar documentación; no debe deducirse ausencia de diseño porque el `.md` ya no esté en el repositorio de código.

| Alias | Raíz |
|---|---|
| CODE | `/Users/ruben/Code` |
| DOCS | `/Users/ruben/Code/Jart-OS/DOCS` |
| DEV | `DOCS/jart-os-development` |
| OS | `DEV/jart-os` |
| CORE | `OS/components/Jart-CORE` |
| NESS | `OS/components/Jart-NESS` |
| STD | `OS/components/Jart-STANDARD` |
| CT | `DEV/04-INCUBATOR/jart-contratos` |
| AI | `DEV/04-INCUBATOR/jart-os-ai` |
| OLD | `OS/90-ARCHIVE/jart-os-doc-legacy/raw/nvme/core/PROJECT-Jart-OS` |

`CODE/_Jart-OS` resuelve actualmente a `/Users/ruben/jart-os-development/jart-os`; no es el mismo directorio que `CODE/Jart-OS`, colección documental. Los textos sobre rutas inexistentes se interpretan con su fecha, no como estado actual automático.

## 3. Manifiesto de documentos leídos completos

| ID | Localizador | Líneas | SHA-256 |
|---|---|---:|---|
| D01 | `CODE/Jart-OS/HANDOFF.md` | 140 | `49c1f10c2c054c9c367ccc7e49dd06122ef5c09a6dd926c843f314c5209bd990` |
| D02 | `OS/00-CANON/INDEX.md` | 93 | `947f99a8cdc4c52c46845aa6a13868c690421b827a5b78bac874256e61d94186` |
| D03 | `OS/00-CANON/CANON-capas-y-gobierno.md` | 92 | `b2a8944ff360c82b3a10050da8627a944a8196c82a5b3007e4a6dfa8423fd19d` |
| D04 | `OS/00-CANON/MAPA-CENTRAL.md` | 338 | `0ca4b13754206e6efba418824eb41f310c88387583651ea87a7c43c52b004049` |
| D05 | `OS/00-CANON/PLAN-MAESTRO.md` | 122 | `035175cadbfb1afe5fb4bcf90fad970edaf63df4b2d03df8719262ab2b0768fb` |
| D06 | `OS/00-CANON/NAMING.md` | 112 | `ffa253f4084444ef69a5af0af159fc3211a66b6564933e34f6c61145dce33381` |
| D07 | `OS/00-CANON/BRAND.md` | 65 | `7a7b9a3500175ac321490fa54fafed7d5d39730bc79af2cc96ffc6a1f0d8ec26` |
| D08 | `OS/CANON.md` | 38 | `884681c1c27db68ac4e7189cbfd5bb1d1bf260852f72bf408619e8345cc9feeb` |
| D09 | `OS/README.md` | 18 | `950c5ff42e1c02522f21e666705a0c7d6299bed708a8fcae601d3f7726471c7d` |
| D10 | `OS/DESIGN.md` | 496 | `2dc5dc8ee7ff9cb6680dc713903b3d8d8b8ac198c5f00346a00f79059f9e7705` |
| D11 | `OS/20-RULES/SISTEMA-DE-REGLAS/00-LEEME.md` | 38 | `f6c7e8fffd67f54d19a58af68c9a978ab2a01692bac8abade825be9a97ea7768` |
| D12 | `OS/20-RULES/SISTEMA-DE-REGLAS/PERSONAL/00-nucleo-constitucional.md` | 45 | `63992546ba585db9ae77c8c155fb47ded0dea77ec58613e0a37f2f773dc100a9` |
| D13 | `OS/20-RULES/ARNES/README.md` | 67 | `ad8504ea8dc1151948d7f50ea514917825bf28c1edca6ba62b4a3bb8aed5ebbc` |
| D14 | `CT/README.md` | 60 | `03e906e2c68b9d0111c73f8a893fce63856df2c56055ed0c5ee0a42fa4ba40de` |
| D15 | `CT/01-REQUISITOS.md` | 129 | `9f779be0ad4795e83349e81637094f3ae54b99540808a9bfcc212d9986717ad7` |
| D16 | `CT/02-DISENO.md` | 228 | `ca24b7c2132d8e00e02cb7bec3b17048d9849776e04aa38b128b56a8b8f1c9e9` |
| D17 | `CT/03-AMENAZAS.md` | 71 | `51196a96d40c1907cf41e78031459610bf525644495fa14f18062a4678fe1c74` |
| D18 | `CT/04-RELACIONES.md` | 54 | `d5ed90d057744519513ffb5b31fd6784d30838f1f5f2cba5ccd001de7ec7fead` |
| D19 | `CT/05-TOPOLOGIA.md` | 91 | `e918c3e978eb7a4811cca5c50afcc14b6b70ce8cc8c1829efcf937af6769606c` |
| D20 | `CT/DECISIONES.md` | 121 | `736de786e857079029bdcaf8840b40893b93a1190428538ee3cace1d91990f63` |
| D21 | `DEV/03-CANON/DRIFT.md` | 48 | `4510def67e537b61a76bf642c395d9c05656dd62cca241a456c62a4f719c79d5` |
| D22 | `DEV/03-CANON/OFFICIAL-DOCS-READING.md` | 32 | `ffa7ab3ec9e9828ae39cc5b6a0a26ea063bc3cd804758a474a1b78514756a519` |
| D23 | `CT/07-ESTUDIO-HARNESSES/00-SPEC.md` | 72 | `8c1b7e86d6171b31cbb2a2050fbd18636b1ab8fdddaa9260078107c9f6012492` |
| D24 | `CT/07-ESTUDIO-HARNESSES/PARTE-I-objetos.md` | 137 | `52e5721bedac6087c135c1717cb7424c658d481a7905f63047c515a2e658dfcc` |
| D25 | `CT/07-ESTUDIO-HARNESSES/PARTE-II-anatomia.md` | 120 | `0fa5c76168ddd6ccdc3e60e148c68765c4513144822ab1864a0daba775a71d3a` |
| D26 | `CT/07-ESTUDIO-HARNESSES/PARTE-III-sota.md` | 123 | `b27dac8154d5458bda2dfe819a4acd2d9195a5ebaa740e0ec3a840ef5e37ab23` |
| D27 | `CT/07-ESTUDIO-HARNESSES/PARTE-IV-sintesis.md` | 59 | `1f9786e8a55fd45075453873e229e77036bb49e468988dbd18e963da6885f037` |
| D28 | `CT/07-ESTUDIO-HARNESSES/APENDICE-A-evidencia.md` | 70 | `58fb93264b6ebf2780984d2c10e43d0d8f4be83f0194e39b55584c04193f5b08` |
| D29 | `CORE/README.md` | 36 | `8b8b1dfefef5342e72ca81f2d88a2175f49df53de13d718731abfccf437217fa` |
| D30 | `CORE/docs/DESIGN-DATAVERSE.md` | 273 | `24527324f264968fd1240b63c9f154e60380ce4bc1368b9f06233f6b1e20040a` |
| D31 | `CORE/docs/ADR-0001-persistencia-identidad.md` | 54 | `d720238bbbb5c75fac1f34d56d3ae4134d1231a3b412563eae60f1499b410a84` |
| D32 | `CORE/docs/PROPUESTA-jart-core-store-v1.md` | 226 | `81c8cda5033953a2703c89be2dfe8561de64cc94fdf1aeb27ebbfe2ed4432095` |
| D33 | `CORE/docs/SCOPE-open-questions.md` | 35 | `57cf2e9f0f909c1ba8fb62d67635223f5d63256045b4306a790e6513c4784317` |
| D34 | `CORE/HANDOFF-2026-08-23-consolidacion-panel-de-control.md` | 1211 | `7048e083abe88b5e9e40d7aa5379e4aba343d32513107cf4a4aba2c0af5a76f2` |
| D35 | `CORE/openspec/project.md` | 89 | `3ed19a0e050319c86b0435ce6214b944f2eb1a82f290c16555fec9a7ba0e82b9` |
| D36 | `CORE/docs/ANALISIS-identidad-y-datos.md` | 44 | `fadecf0eb40f85d1183cc6697272ab8c9b8d2f619ba62e27f20377a5cc152bcc` |
| D37 | `CORE/docs/MISION-JC-001.md` | 394 | `8ae3852e4f25a8bda47203b84217297b8215518184334a7278a6e7387ffa2104` |
| D38 | `OLD/PROPUESTA-triunvirato-documental.md` | 109 | `a3d935b586754b26fdafc21ccd4def4efecb23e3032f4f33acdcc5df49ad1cfe` |
| D39 | `OLD/SEMILLA-economia-agentes-hacienda.md` | 74 | `29172a8962bc7ab01aeb2ff34d0015c115429486754be4fd6b29cf83d78f2e42` |
| D40 | `DOCS/jart-os-workstation/SYSTEM/documentation/JART-OS-INSTALL-SPEC.md` | 149 | `5e93e3cc53c83b414554e453cd8cf2930bb35eca0e3af4e1d43c4664fb7a04b5` |
| D41 | `NESS/README.md` | 29 | `d433b10955db538a039136bf4504e9b3f94c214b3b65c6e550c0a55ad56a64be` |
| D42 | `NESS/00-VISION.md` | 51 | `1fa4d041400bb632b4c486e997dad9b55d58f7c62d583e8cd44da2f7dc4dc699` |
| D43 | `NESS/05-ROADMAP.md` | 49 | `f0069d9487e6e1ee9eca82b8985d92ca925f6943e9a162d88aff65343b39c265` |
| D44 | `NESS/01-ARQUITECTURA/01-modelo-de-capas.md` | 48 | `8527a099f841e9eac3f509cc57c317eb6a4f28fd237d88e034345dfcf78b68ac` |
| D45 | `NESS/01-ARQUITECTURA/02-escalafon-gobierno.md` | 48 | `2992da9c2ab77473ba3dc68161e0ccece88d72a71a187052ff9f1427dd60eaa4` |
| D46 | `NESS/01-ARQUITECTURA/03-nucleo-y-adaptadores.md` | 87 | `a0daa0b32a2ff510c15a8203e26fac4d193c6246e2321da7165d7086f86cc791` |
| D47 | `NESS/01-ARQUITECTURA/04-modelo-de-datos.md` | 145 | `138e0a7fe1822e7fe172f2cc5017f44afa7c1272e1660cd1042e1291251a7f60` |
| D48 | `NESS/01-ARQUITECTURA/05-flujo-de-decision.md` | 107 | `0ce7b4e170a9cac119fbf96183ded58fdb7c5bfe166adf98d60d56afc488ac3e` |
| D49 | `NESS/02-NUCLEO/01-policy-engine.md` | 81 | `1080d41c3092000ceab7c56849642e774297df04202d4d3bd7afa18ad839ba50` |
| D50 | `NESS/02-NUCLEO/02-catalogo-de-gates.md` | 124 | `53ecd80f6f41b010c1fce28362de05c9898990e6843f3948339e196035548c65` |
| D51 | `NESS/02-NUCLEO/03-scoring-de-confianza.md` | 81 | `cfab7ce3622196cdef413eef59c0b803ef8d6c0943f2efc5b4d2bf5981961917` |
| D52 | `NESS/02-NUCLEO/04-perfiles-y-paquetes.md` | 54 | `aa938b5310518f0f5beb31b5dfa9b1a4e43787428907780e9815bfb0b797514a` |
| D53 | `NESS/02-NUCLEO/05-auditoria-y-journal.md` | 73 | `dec5054373bd1c8baa602182c406d10813313f619cf043f65c707b425a61a58a` |
| D54 | `DEV/04-INCUBATOR/jart-router/references/03-CONTRATO-ADAPTADOR.md` | 68 | `73114b9caaff470b4f688745feed770da50c9bd89e779c79b66a6dae4780b247` |
| D55 | `AI/openspec/project.md` | 173 | `d4daaed47b5167d17f999c96b21082f83875e758f245e86b707bbc59d88564ce` |
| D56 | `AI/jart-proxy/docs/pi-harness-final.md` | 460 | `49e8dddac2196ee5194efcdc57a0fa46d94d3031f9b9741f0dd03497851c4780` |
| D57 | `AI/docs/gates.md` | 670 | `6153f00af4f94ee46616b29a12979738f8fc2cf0c4334357f51f36de6671527b` |
| D58 | `AI/docs-enforcement/00-dementor-design.md` | 257 | `2c7e5adea7c80c8b542697fefbfc1ef3adf80dfdea86b79c4e36ddcec3a84a9e` |
| D59 | `STD/README.md` | 104 | `6c4e875696604943c860329ca4115775f0ef5db820cb46bba31a67c57d885b57` |
| D60 | `STD/docs/architecture.md` | 157 | `796e40e7adbd06b20489d3bc923b82e369627adf0bb4ef14f28725c0d2a7d7d1` |
| D61 | `CODE/Jart-FACTORY/specs/000-NORTH-STAR.md` | 53 | `20863d63a9e1f23a943db436a61138901063c398e71258eafeb2e896ab671243` |

## 4. Código inspeccionado en la revisión anterior de esta sesión

No se incluye en el total D01–D61. Raíces: PI = `CODE/PI-agent/src`, FACTORY = `CODE/Jart-FACTORY`, SG = `CODE/security-gateway`, SPEC = `CODE/specgate`.

| ID | Localizador / alcance | Qué permite sostener |
|---|---|---|
| C01 | `PI/pi-account-router/src/ports.ts`; imports de `src/application/` y `src/domain/`; `src/extension.ts:39–78` | Puertos e inyección existentes; separación parcial del runtime |
| C02 | `PI/pi-intermediate/src/token-ring.ts:7,22,161`; `package.json` | Packing reutilizable; estimador heurístico; paquete sin runtime Pi declarado |
| C03 | `PI/pi-intermediate/src/hard-gates.ts:69–71` | Vocabulario específico y permiso por defecto para nombres desconocidos |
| C04 | `PI/pi-intermediate/src/db.ts:174–196`; `PI/pi-memory/src/memory-ledger.ts:82,139–178,198–212` | Esquema y límites de cadena/verificación |
| C05 | `PI/pi-memory/src/fabric.ts:105–115,208–227` | Orden vista→ledger; replay reducido a saves/forgets |
| C06 | `PI/pi-memory/src/canon-contract.ts:50–63`; `src/memory-stack.ts:19–25` | Alcance de bytes firmados; claves persistidas en meta |
| C07 | `PI/pi-memory/src/intermediate.ts:11`; `package.json:22–25`; `src/core.ts:33–64`; `src/extension.ts` | Acoplamiento de layout y composición transversal |
| C08 | `SG/contract-engine.mjs:165–186,217–228,276`; `SG/index.mjs:337–350` | Prototipo de aprobación; no prueba de despliegue ni de equivalencia con Jart-Contratos |
| C09 | `SPEC/src/pre.ts:16–22,170–181`; `src/ledger.ts:117–128` | Integración específica de host; cabeza externa para detectar truncamiento |
| C10 | `FACTORY/kernel/domain/ports.ts:9,71,102`; `kernel/verification/facade.ts:82–94,152–169`; `kernel/infrastructure/verification/av-adapter.ts` | Puertos, verificadores requeridos y adaptador externo |
| C11 | `CODE/Jart-CANON/src/jart_canon/verify.py:78–145`; `README.md` | Verificación de citas/procedencia; no aprobación de ejecución |
| C12 | `CODE/Jart-CLI/README.md:9–14`; `package.json`; imports de `src/` | Desacoplamiento del producto CLI, no prohibición general de bibliotecas |

Base PI observada: HEAD `855afc9`. FACTORY cambió concurrentemente durante la investigación (`c2b2ac1` → `35590ff` → `3c90e8d` observados); el dispatcher actualizado se releyó, pero no se congeló ni certificó el repositorio completo. Antes de implementar se deben volver a fijar versiones y revisar cambios.

## 5. Fuentes oficiales consultadas por red, sin guardar copias

Consultadas 2026-10-18, HTTP 200. No son una investigación exhaustiva ni una decisión de adoptar esos productos.

| ID | URL | Hecho contrastado |
|---|---|---|
| W01 | <https://www.openpolicyagent.org/docs/integration> | Un motor de políticas puede integrarse como biblioteca, REST o Wasm; componentización no determina despliegue |
| W02 | <https://raw.githubusercontent.com/cedar-policy/cedar/main/README.md> | Motor de autorización reutilizable; políticas separables del código de aplicación |
| W03 | <https://developer.apple.com/documentation/os/logging> y <https://developer.apple.com/tutorials/data/documentation/os/logging.json> | Apple ofrece APIs para que las aplicaciones escriban en Unified Logging |
| W04 | <https://www.freedesktop.org/software/systemd/man/latest/journalctl.html> | `--verify` y Forward Secure Sealing; clave de verificación externa |

No se usó You.com ni se accedió a valores de sus credenciales. Las afirmaciones de mercado de D23–D28 siguen siendo investigación histórica: no se revalidaron sus 43 fuentes ni sus números en esta ronda.

## 6. Ampliaciones sin alterar el manifiesto histórico

[06-contraste-sota.md](06-contraste-sota.md) añade fuentes oficiales y lecturas Pi. [09-evidencia-delta.md](09-evidencia-delta.md) añade el manifiesto de 29 módulos evaluados en INV-10, sus hashes, heads observados y localizadores complementarios. No se renumeran D01–D61 ni se mezclan esas cifras con el alcance original; los heads anteriores son observaciones históricas, no congelación de repositorios.
