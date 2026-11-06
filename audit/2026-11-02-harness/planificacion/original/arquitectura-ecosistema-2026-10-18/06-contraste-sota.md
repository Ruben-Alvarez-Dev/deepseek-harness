# Contraste técnico para la propuesta arquitectónica

Fecha: 2026-10-18. Estado: investigación de soporte, no certificación SOTA. Encargo: proponer la arquitectura completa; no implementarla. Volver al [índice](00-indice.md).

## 1. Alcance y método

Se consultaron fuentes oficiales por HTTPS, sin autenticación, instalaciones ni llamadas a proveedores de inferencia. Se extrajeron apartados temáticos: **no se afirma lectura completa de estas páginas web ni comparación exhaustiva del mercado**. SHA-256 identifica la respuesta recibida, no la legitimidad de sus afirmaciones ni que una ruta `current`/`main` permanezca fija. No se guardaron copias del corpus web.

El manifiesto D01–D61 de [02-fuentes.md](02-fuentes.md) conserva su alcance original. Esta ampliación no se suma artificialmente a sus cifras de lectura completa. D16/D19/D35/D37/D61 y el código de presupuestos se releyeron durante esta ronda; las decisiones propuestas siguen siendo INT.

## 2. Fuentes oficiales consultadas

| ID | Fuente / localizador | Qué respalda y qué no |
|---|---|---|
| S01 | [OPA — Integration](https://www.openpolicyagent.org/docs/integration), apartados Library / Service / Wasm | Una misma responsabilidad de políticas admite distintas formas de despliegue. No obliga a instalar OPA ni demuestra que resulte óptimo aquí. |
| S02 | [MCP — Security Best Practices, edición 2026-07-28, fuente oficial](https://raw.githubusercontent.com/modelcontextprotocol/specification/main/docs/docs/2026-07-28/tutorials/security/security_best_practices.mdx), Confused Deputy / Token Passthrough / Audience | Separación entre credenciales del recurso y autorización del cliente; no pasar tokens indistintamente. MCP no es un sandbox ni cubre ejecución fuera de él. |
| S03 | [OpenTelemetry — OTLP](https://opentelemetry.io/docs/specs/otlp/), encoding / retry / backpressure | Exportación de telemetría con Protobuf y comportamiento de entrega. No proporciona autorización, custodia WORM ni transacciones con efectos externos. |
| S04 | [RFC 8785 — JCS](https://www.rfc-editor.org/rfc/rfc8785.txt), §3 | Bytes canónicos JSON para objetos firmables; prohíbe nombres duplicados y restringe representación numérica. No sustituye schema, cobertura de campos ni validación semántica. |
| S05 | [DSSE — Protocol](https://raw.githubusercontent.com/secure-systems-lab/dsse/master/protocol.md), PAE / signature | Firmar tipo y bytes con separación de dominio, en vez de concatenaciones caseras ambiguas. El protocolo no decide quién puede autorizar una misión. |
| S06 | [PostgreSQL — Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html), Serializable / retries | Serialización del estado transaccional y necesidad de reintentar la transacción completa en fallos de serialización. No vuelve transaccional una API externa. La respuesta recibida corresponde a documentación PostgreSQL 18. |
| S07 | [PostgreSQL — Privileges](https://www.postgresql.org/docs/current/ddl-priv.html), owner / INSERT / DELETE | Se pueden separar permisos de aplicación de propiedad/DDL. El propietario y superusuario conservan capacidades que invalidan una supuesta inmutabilidad absoluta. |
| S08 | [SLSA v1.1 — Provenance](https://slsa.dev/spec/v1.1/provenance), subject / builder / resolvedDependencies | Vinculación de procedencia a artefactos y plataforma constructora. No concede permiso de ejecución ni certifica el resultado funcional. Se consulta una versión concreta, no se afirma que sea la última. |
| S09 | [Sigstore — Transparency Log](https://docs.sigstore.dev/logging/overview/), inclusion / consistency | Inclusión y consistencia requieren pruebas y observación; una cadena local no acredita por sí sola completitud frente a truncamiento. No se propone enviar datos privados a Rekor público. |
| S10 | [RFC 5424 — Syslog](https://www.rfc-editor.org/rfc/rfc5424.txt), §§6.2–6.3 | Formato de diagnóstico estructurado textual sin JSON. No aporta retención inviolable ni entrega fiable por sí mismo. |
| S11 | [RFC 8949 — CBOR](https://www.rfc-editor.org/rfc/rfc8949.txt), §4.2 | Codificación binaria y requisitos de codificación determinista. Hace falta fijar un perfil de tipos/límites; «usar CBOR» no basta para una huella reproducible. |
| S12 | [Cedar — Authorization](https://docs.cedarpolicy.com/auth/authorization.html), PARC / default deny / forbid | Principal, acción, recurso y contexto; denegación por defecto y prioridad de prohibiciones. No demuestra que debamos añadir otro motor o lenguaje a Jart-PROXY. |
| S13 | [Yubico — YubiKey and PIV](https://developers.yubico.com/PIV/Introduction/YubiKey_and_PIV.html), algoritmos y firmware | Ed25519 en PIV depende de firmware compatible; la página lo incluye desde 5.7. No asumir que cualquier YubiKey/PIV lo soporta. No se ha inventariado el hardware de Rubén. |
| S14 | [Apple — Protecting keys with the Secure Enclave, documentación oficial estructurada](https://developer.apple.com/tutorials/data/documentation/security/protecting-keys-with-the-secure-enclave.json), restricciones / generación | En el mecanismo documentado, Secure Enclave utiliza NIST P-256, no Ed25519. Clave no exportable no equivale a aprobación humana del contenido mostrado. La respuesta JSON es documentación recibida, no un formato de logs propuesto. |

### Huellas de las respuestas recibidas

| ID | Bytes | SHA-256 |
|---|---:|---|
| S01 | 124479 | `868698a58e36aafe5e3a07b6a521be4da75e12ebc0af542f1d469246b2c6d4ba` |
| S02 | 42581 | `0d859ba68bbab6148907ef2bf7b2e169a1b9a2cbe1e8731d7c0d47e15ed37f23` |
| S03 | 462913 | `e067b231bd8cc3e70f94c87b372723d4bd8801a3864712cd6cc24fccab235b31` |
| S04 | 41879 | `63d52294eb0e3f0014174288186d388b4ddbf2c67d1ce8af1d9726eb0c3ab240` |
| S05 | 6638 | `6c0d965475162230f9f461acf634b4d4b409eab1a1839d31a9c24c76b3676253` |
| S06 | 47642 | `0b5013fde5e842c82664f2d9fe599f1c8ef7756e8c3ecc254b589e3be9e0d356` |
| S07 | 43332 | `f08e26f6f67b2aed451f744622ec4814dd4af68e7fbaf22a6336a790f661e567` |
| S08 | 62138 | `d6f9509b9921880ef455475daeb0fe32903405cb702ebd471eb4d3460ee4eb44` |
| S09 | 42866 | `d6cef3c9c70d4f2a831bda61c3c72bfc49bec4c0b92d08faff6ea68347e99d8c` |
| S10 | 85162 | `24d91f90a05d2536730ada929c296f45ae9cd72226e22b6775ad8c04cae37a53` |
| S11 | 185226 | `f1164a5b31a39350ad46abe29b83575eb933ca6c45366989c118b6b1058a214a` |
| S12 | 35706 | `6f3dfe980a5f14c00713d28e24d43a078297bafcbaa31b6a6ef37c8754240d09` |
| S13 | 12723 | `09f88f2a87660a4a73e08a481541a7d90742a9860f21dd097ec7b5bacc21e716` |
| S14 | 33007 | `eb35ad8a74bbc1eaa220807ac4e3a327e636b05ff3329e10ae88536aee972250` |

Las URLs iniciales de MCP devolvieron HTTP 308 y una ruta inicial de algoritmos PIV devolvió 404. Se localizaron las fuentes oficiales correctas; los intentos fallidos no se cuentan como evidencia favorable ni se ocultan como consultas exitosas. No se utilizó You.com ni se accedió a sus credenciales.

## 3. Documentación Pi consultada completa — sin ejecución

Raíz PI: `/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/`.

| ID | Ruta relativa | Líneas | SHA-256 |
|---|---|---:|---|
| P01 | `docs/sdk.md` | 147 | `d9034ccbf2219a58712d8dd4fcdf47e687d77131e71dd5d119d8a71e9bd2a2e8` |
| P02 | `docs/extensions.md` | 277 | `a2b5ff0f95e7e470ed0846d7c4fbfc5781fe7e694b8e7f51ea08859f3ad7325d` |
| P03 | `docs/cli-integration.md` | 106 | `edf8e723a70b4c3c40275db0391219e55d30597936212a9cfdef33963dd37f93` |
| P04 | `examples/sdk/12-full-control.ts` | 74 | `3cf794d470ddbde4504ae965d24a23c42378d1ac86033522e46907ac05518343` |

**DOC:** P01 permite controlar herramientas, modelos y recursos descubiertos mediante SDK; P04 reemplaza descubrimiento y servicios explícitamente. P02 declara que las extensiones ejecutan con los permisos del proceso Pi; los hints de herramientas no son comprobaciones. P03 diferencia aceptación de prompt y finalización de ejecución, y documenta los transportes JSONL nativos.

**INT:** Pi ofrece un punto de integración plausible para un controlador, no una frontera de confianza certificada. Las extensiones ejecutables pertenecen al TCB del proceso que las carga. SDK/RPC no impiden por sí solos acceso a disco/red, ni convierten un prompt de confirmación en una firma. No se ejecutaron los ejemplos ni se usaron sus rutas temporales. La propuesta no convierte los JSONL del protocolo/transcript nativo en el formato del nuevo log de auditoría.

## 4. Implicaciones para las decisiones propuestas

1. **Reutilizar no exige daemon:** S01 y P01/P03 permiten separar elección de interfaz, despliegue y dominio.
2. **Capacidad opaca no es macaroon cifrado:** D16 mezcla ambos términos. Para el primer diseño operativo se propone ticket aleatorio con atributos en el servidor y derivación atenuante allí. No se afirma implementar el protocolo macaroon ni sus propiedades criptográficas.
3. **Firma completa y tipada:** S04/S05 más C35; ningún campo relevante queda fuera por conveniencia. Algoritmo permitido explícito y dependiente del dispositivo real (S13/S14).
4. **Persistencia antes del efecto, no exactamente-una-vez mágico:** S06 permite canje único y reserva transaccional. Un fallo después de enviar una API puede dejar resultado desconocido. Hace falta conciliación, no retry ciego.
5. **Sin nuevo motor de políticas por moda:** aprovechar el núcleo de Jart-PROXY con reglas deterministas y conformance. S01/S12 sirven de contraste, no de autorización de dependencia.
6. **Logs y evidencia separados:** diagnóstico RFC 5424; telemetría OTLP/Protobuf; evidencia tipada sin blobs JSON; prueba de integridad/custodia explícita. S03/S07/S09/S10/S11 no justifican vender WORM contra administrador.
7. **Procedencia no es aprobación:** S08 no sustituye firma de misión, controles del ejecutor ni verificación de sus efectos.
8. **Economía de tokens, no cosmética:** `pi-intermediate/src/token-ring.ts:22–24` estima por caracteres; `:125–146` retira descripciones de schemas; `:159–169` asigna memoria proporcional a candidatos × presupuesto; `:318–320` puede eliminar expresiones de incertidumbre; `:411–416` mide preservación léxica, no equivalencia semántica. Son motivos para limitar la reutilización y evaluar, no prueba ejecutada de un fallo en producción. Se propone selección/deduplicación/recuperación antes de compresión con pérdida.

## 5. Qué significa «SOTA» en esta entrega

Arquitectura alineada con prácticas verificables actuales: mínimo privilegio, mediación completa donde se prometa, capacidades atenuantes, datos tipados, transacciones, idempotencia, procedencia y evaluación con fallos. **No** un récord de rendimiento, un estándar oficial llamado «arnés universal», una garantía de ausencia de prompt injection o una auditoría independiente.

No se ha hecho benchmark de la arquitectura propuesta, despliegue de sandbox, nueva prueba del ledger, inventario remoto ni certificación de hardware. Las puertas de aceptación de [05-arquitectura-propuesta.md](05-arquitectura-propuesta.md) son trabajo futuro, no resultados.
