# Delta recomendado — conservar la arquitectura, cerrar sus invariantes

**Estado:** comparación y recomendación completadas para el alcance inspeccionado; **cambios de producto no aplicados ni ratificados**. Ronda INV-10. [Índice](00-indice.md) · [Ejecución y fuentes](09-evidencia-delta.md).

## 0. Conclusión ejecutiva

**No recomiendo sustituir la arquitectura de Rubén.** Su separación de motores, adaptadores, autoridad, ejecución y evidencia ya resuelve el problema estructural. La diferencia necesaria está entre esas responsabilidades declaradas y ciertos caminos concretos de implementación.

La propuesta 05 se conserva como consolidación de destino, no como lista de novedades que deban implementarse. **Para decidir cambios, este delta tiene precedencia sobre sus recomendaciones tecnológicas no justificadas.**

Recomiendo once intervenciones acotadas dentro de los propietarios existentes. Ninguna exige otro repositorio, un framework universal, un broker distribuido o una migración general de bases de datos. La evidencia nueva consta de 68 aserciones aisladas; varias confirman defectos, no seguridad aprobada. Las referencias correctivas ejecutadas son contrafactuales locales, no código de producto ya arreglado.

## 1. Qué conservar, expresamente

| Pieza existente | Evidencia / estado | Decisión |
|---|---|---|
| Router: dominio/aplicación, StateStore, Clock, CredentialResolver, EpisodeStorePort e inyección | `pi-account-router/src/ports.ts:1–56`, `src/extension.ts:39–78`, `src/application/router.ts:20–28` | **Conservar.** No extraer otro motor por estética. Mantener E-020/E-028, raíz única, estado bloqueado y conclusiones G3–G7. |
| Memoria: Store, backend SPI, control, stack, fabric y hooks separados | Fuentes M en 09; V02/V03/V12/V13 | **Conservar módulos y puertos útiles.** Corregir quién puede escribir y cómo se recomponen sus efectos; no reescribir la memoria. |
| Adaptadores por runtime y declaración de cobertura | D46/D54; `M/hooks.ts`, `M/extension.ts` | **Conservar.** Conformance por canal/versiones, no un agente universal nuevo. |
| Gates actuales de PROXY | V08: evaluador realmente llamado por el entrypoint, incluso sin skills | **Conservar el evaluador y sus controles efectivos.** No repetir que todos están desconectados; identificar cuáles tienen hechos y obligatoriedad reales. |
| Sandbox SPI, proveedores y selección explícita fail-closed | `I/sandbox.ts`; V09 | **Conservar**, incluido Gondolin. No «añadir» una micro-VM que ya tiene adapter. Verificar compatibilidad/efectos antes de anunciar aislamiento. |
| Knapsack exacto existente | V05 y medición sintética en 09 | **Conservar de entrada.** El defecto demostrado está en el coste del texto, no en la optimización combinatoria. |
| FACTORY CLI determinista y puertos/verificadores | D61, dispatcher actual y V10 | **Conservar.** No daemon ni LLM en kernel. No equiparar su CLI G3 a toda VerificationFacade/Dementor. |
| CORE registry/telemetry, catálogo y registro de concesiones | D35/D37 | **Conservar sus responsabilidades y bootstrap independiente.** La ruta actual del alias CORE no aportó fuentes Python en la inspección acotada; eso no invalida su diseño ni demuestra ausencia global de implementación. |
| Jart-Contratos: misión, catálogo, firma, tickets y compartimentos | D16/D19/D20 + C35 | **Conservar el diseño ya elaborado.** El controlador separado es suyo, no una invención nueva del asistente. La documentación no acredita despliegue efectivo. |
| Instalación independiente y separación de dominios | D55, D61; puertos ya presentes | **Conservar.** Conectar añade capacidades; no instala todo ni desactiva garantías obligatorias. |

## 2. Dónde está realmente el desajuste

Ejemplo central: la memoria ya tiene el esquema de capas adecuado, pero no todas las entradas recorren el mismo dueño de escritura.

```text
HOY — caminos inspeccionados

Tool Pi ───────────────► MemoryFabric ──► MemoryControl ──► Backend/Store
                              │                               ▲
                              └─ append al ledger             │
Gateway /memory/save ────────────────► MemoryControl ────────────┤
Hook de sesión ─────────────────────► MemoryControl ────────────┤
Flush de compactación ─────────────────────────────────► Store ┘

Replay de Fabric solo conoce parte de esos cambios.
En las fixtures puede borrar records o reactivar revisiones invalidadas.

DELTA — mismas piezas, una frontera de comandos

Tool / gateway / hooks / flush
              │
              ▼
     MemoryFabric / servicio de comandos existente
              │
              ├─ ámbito autorizado en backend
              ├─ admisión / cambios explícitos
              └─ unidad de trabajo: datos + índices + evidencia

Consultas: proyección por puerto de lectura, siempre acotada.
Replay: checkpoint verificado + eventos completos, sin escribir fuera del ámbito.
```

No son cajas nuevas: es **cerrar caminos laterales entre cajas que ya existen**. Separar carpetas o instalar un servidor de memoria no arreglaría por sí solo esos caminos.

## 3. Intervenciones concretas

### D01 — Una frontera de escritura efectiva para memoria

**Antes:** `M/memory-gateway.ts:42` llama a Control; `M/hooks.ts:100` reconstruye vía Control; `M/plane.ts:74` escribe directamente en Store. El tool Pi sí usa Fabric. V12 confirma escritura sin evento y borrado al hacer replay.

**Cambio mínimo:** usar el servicio de comandos de Fabric —o su interfaz estrecha equivalente— para todas las mutaciones: save, revisión/merge, invalidación, reconstrucción de sesión, flush, consolidación y olvido. Mantener consultas separadas. No exponer desde transports un Control/Store que permita saltar ese dueño.

**Mejora y aceptación:** cada cambio durable tiene decisión/evidencia y participa en su unidad de trabajo; las mismas entradas por tool/gateway/hooks producen un estado equivalente. La ruta `/memory/save` y el flush ya no crean records ausentes del historial. No crear otra façade general que vuelva a contener todo PiCore.

### D02 — Ámbito de datos en el puerto de almacenamiento, no solo en search

**Antes:** search compone tenant, pero get/forget por ID delegan sin comprobarlo (`M/memory-control.ts:136–163`). V02 devuelve/invalida B desde A; get ya incrementó accessCount antes de cualquier guard tardío.

**Cambio mínimo:** construir un backend acotado al principal/tenant obtenido de contexto confiable. Validar con `peek` autorizado antes de lecturas con efectos; aplicar ámbito también a invalidate, snapshots, checkpoints, mantenimiento, import y replay. No aceptar tenant/rol del cuerpo de la petición como autoridad. Scope prefijado de forma literal y delimitada, sin comodines SQL inadvertidos.

**Mejora y aceptación:** un ID válido de otro tenant no permite leer, mutar contadores, invalidar ni incluir ese dato en recuperación/exportación. Operaciones de mantenimiento sin variante scoped se declaran no soportadas o se deniegan en ese perfil: no caen a la operación global. V02 demuestra el defecto local; el resto de la matriz es puerta futura, no prueba ya ejecutada.

### D03 — Unidad de trabajo real, incluyendo efectos secundarios del Store

**Antes:** Fabric guarda vista y luego append; Store invalida topic antes de insertar. V03 deja fila/FTS/vector huérfanos o una revisión invalidada tras un fallo.

**Cambio mínimo:** transacción/savepoint sobre la misma conexión para efectos locales de comando: revisión previa, memoria nueva, FTS, vector, evento e idempotencia. Comprobar que backend/ledger pertenecen realmente a ese dominio transaccional. En un backend remoto, requerir capacidad equivalente o protocolo de conciliación explícito; no envolver una llamada remota en un `BEGIN` local y llamarlo atómico.

**Mejora y aceptación:** inyectar fallo en cada etapa deja todo confirmado o todo revertido; reintento idempotente no duplica. El contrafactual local V03 ya demuestra que el mismo Store permite revertir fila/FTS/vector y preservar el original. No hace falta cambiar SQLite de memoria por PostgreSQL para corregir este defecto.

### D04 — Replay semántico, validado y limitado antes de reemplazar datos

**Antes:** `M/fabric.ts:208–227` interpreta saves/forgets parciales y hace `replaceAll`. V12 borra un record de gateway y reactiva una revisión sustituida. No reproduce todas las invalidaciones/merges/mantenimientos ni verifica primero completitud/custodia del historial.

**Cambio mínimo:** no habilitar reemplazo destructivo como garantía de recuperación hasta que exista cobertura completa. Empezar desde checkpoint validado y aplicar eventos que representen **todos los cambios**: nuevas revisiones y sus invalidaciones, merge, olvido, archive y mantenimiento según sus reglas. Alternativa válida: reproducción determinista del comando con entradas/tiempo/versiones fijados, si demuestra la misma semántica. No recalcular scores o tiempos como si fueran los de origen.

**Mejora y aceptación:** `estado antes == estado reconstruido` para contenido, scopes, estados, validez, topics e índices reconstruibles; no basta contar filas. Historial parcial/corrupto/esquema desconocido: detener antes de borrar. Scope A nunca reemplaza B. Primero migrar/sellar el estado legado; no inventar eventos retrospectivos y venderlos como evidencia original.

### D05 — Proteger exactamente los datos que se pretende autenticar

**Antes:** V01 demuestra campos fuera del hash, firma eliminable y sufijo borrable; V04 permite cambiar locator/confidence. La clave de memoria reside por defecto en la misma DB (`M/memory-stack.ts:19–25`).

**Cambio mínimo:**

1. Versionar el objeto firmable del ledger e incluir referencias, fuente, privacidad, schema e idempotencia relevantes, además del contenido/identidad/tiempo.
2. Definir modo `signature-required` sin ambigüedad; no inferir «firma válida» de una firma ausente. Mantener legado identificado, sin degradación silenciosa.
3. Completar y versionar el payload de CanonClient con locator y confidence, coordinado con su productor real. Firma válida no prueba que la cita sea cierta.
4. Exponer en la composición el signer/trust port ya previsto, con material de confianza fuera de la DB editable cuando ese perfil lo requiera. Sustituir tipos que obliguen a poseer PEM privado por interfaces estructurales. No imponer hardware nuevo a toda memoria local.
5. Para detectar rollback/truncamiento frente a un escritor capaz de cambiar historia, cabeza/checkpoint custodiado fuera de ese almacén y comparación al abrir/restaurar. API append-only no es custodia absoluta.

**Mejora y aceptación:** cada campo protegido alterado invalida prueba; ausencia de firma requerida rechazada; menor cabeza respecto al ancla provoca cuarentena. Cambiar formato sin resolver quién posee la clave no sirve. No rotar/revocar/reemplazar claves You.com ni acceder a sus valores como parte del cambio.

### D06 — Recibo de verificación ligado siempre al sujeto evaluado

**Antes:** V10: sin `files`, dos artefactos diferentes comparten hash y payload de firma de VerificationFacade. `artifactHash` queda en metadata fuera de los hechos firmables.

**Cambio mínimo:** todo recibo declara sujeto y alcance: digest de paquete cuando se verifica paquete completo, o digest de artefacto individual con tipo explícito. Vincular perfil/spec pertinente y verificadores efectivamente invocados cuando su presencia fundamente el veredicto. Campo obligatorio o rechazo; no `packageDigest:null` con ACCEPT firmable genérico. Versionar schema de recibo y coordinar signer/verifier existentes; no sustituir SSHSIG por DSSE solo para tapar la ausencia de un campo.

**Mejora y aceptación:** no trasladar recibo de A a B; sin lista de paquete no afirmar verificación del paquete completo. Mantener los guards no-verifier/required-unavailable que sí funcionan. El CLI actual sigue su dispatcher anillo-1/G3/empírico: si un perfil exige un adversarial o recibo distinto, conectar esa comprobación explícitamente; no asumir que se invocó VerificationFacade por usar la palabra FACTORY.

### D07 — Presupuestar el texto real, conservando el algoritmo que ya funciona

**Antes:** se empaqueta con coste de summary+ID pero se emiten también título, kind y cabecera. V05: presupuesto 32→1016 unidades del propio estimador; 0→8.

**Cambio mínimo:** una única función de render de item compartida por estimación y emisión; redacción antes de calcular coste; reservar cabecera/separadores y espacio de salida/tool result donde corresponda. Presupuesto no válido/cero: no inyectar. Límites de candidatos/tamaño/presupuesto. Mantener knapsack/MMR existentes; usar tokenizador del modelo cuando esté disponible y marcar fallback conservador.

**Mejora y aceptación:** texto final cabe bajo el contador acordado; títulos largos/summary vacío/multibyte/0 no rompen el límite. V05 demuestra referencia acotada sin reemplazar el algoritmo. Su medición sintética no justifica introducir greedy, otro modelo compresor ni un servicio.

`/caveman` ya es opt-in: conservar esa condición y declarar pérdida semántica posible; no convertirlo en reescritura automática de respuestas/autoridad. V06 invalida la idea de que un score léxico certifique preservación de significado.

### D08 — Candidatos independientes y un solo rerank final

**Antes:** la supuesta señal densa de RetrievalFabric reordena el shortlist léxico; `corpus` no aporta candidatos a rank. Además, Fabric usa Control.search, que puede rerankear, y luego rerankea otra vez con el mismo proveedor.

**Cambio mínimo:** puertos acotados de candidatos léxicos, vectoriales y de entidad, siempre autorizados por ámbito; unión por ID, RRF y **un** rerank final. Alimentar el puerto léxico con búsqueda sin rerank, no con una búsqueda ya enriquecida. Aprovechar nearest/índices del backend existentes donde cumplan modelo/ACL; no recorrer `store.all()` sin límites ni enviar el corpus entero a embeddings.

**Mejora y aceptación:** V07 recupera el candidato semántico omitido en una fixture (recall@2 0→1); V13 reduce reranks 2→1 conservando el orden de esa fixture. Para adoptar en producción: holdout con casos lexical-only/vector-only/ambos, ACL, fallback y límites; comparar recall/nDCG, coste y latencia. No declarar mejora universal a partir de dos registros. Si no hay embeddings reales, declarar hashing/fallback, no venderlo como semántica real.

### D09 — Adaptadores y obligatoriedad de controles según garantía, no reputación

**Antes:** vocabulario no normalizado (V08). En el proxy publicado el evaluador sí corre, pero score inicial fijo ELITE deja fuera SCOPE; facts SDD/AV/premises no se alimentan y no hay user_bash en ese entrypoint. El adapter de memoria tiene user_bash y sandbox opt-in: no son equivalentes ni se sustituyen por nombre.

**Cambio mínimo:** normalizar herramientas/argumentos en el adapter, mantener reglas en el evaluador existente y declarar cobertura por canal. Para el perfil que promete límites de workspace, el scope es obligatorio independientemente de score. Exigir facts/readiness antes de anunciar gates activos; sin hechos requeridos, no permitir la operación gobernada. No activar todo SDD contra `null` ni usar un score de cortesía como permiso jurídico.

**Mejora y aceptación:** la misma operación por vocabularios equivalentes recibe la misma decisión; tool_call/user_bash/MCP/nested/subagentes tienen pruebas separadas. V08 muestra que exigir SCOPE al mismo motor ya rechaza el caso; no demuestra mediación completa del host. Para gobierno fuerte, completar el controlador separado que Jart-Contratos ya diseña, sin presentar la extensión in-process como si ya fuera esa autoridad.

### D10 — Corregir y certificar los adapters de sandbox existentes

**Antes:** GondolinProvider, SrtProvider, SeatbeltProvider y BwrapProvider ya están implementados. V09 verifica construcción de Gondolin y observa que Bwrap no monta el workdir solicitado.

**Cambio mínimo:** conservar SPI/selección explícita; hacer que cada proveedor represente de verdad cwd/mounts/readonly/red y devuelva no soportado si no puede. En bwrap, plan de mounts y cwd derivado del perfil, incluidos requisitos del sistema ejecutado; no copiar flags de una distro a otra suponiendo que funcionan. Probar la versión real del CLI antes de habilitarlo.

**Mejora y aceptación:** el trabajo válido puede acceder a sus entradas/salidas, y no a rutas/red prohibidas. Backend ausente o política no representable: denegar, no ejecutar directo. La micro-VM no es un producto nuevo a inventar; Gondolin se valida/reutiliza si cumple. V09 es construcción, no E2E de aislamiento; esos tests físicos requieren su autorización/entorno.

### D11 — Frontera pública de paquete y composición ligera, sin nuevos paquetes

**Antes:** una ACL centraliza los deep imports, pero sigue resolviendo por layout físico. V11 confirma que el nombre de dependencia público ya resuelve localmente. El host Pi está declarado como dependencia obligatoria aunque las importaciones runtime del host encontradas están en `M/extension.ts`.

**Cambio mínimo:** usar el entrypoint público de `@pi-agent/intermediate` desde esa ACL y mantener compatibilidad de exports. Para consumidores del motor, evaluar host como peer opcional/entrada de adapter, conservando instalación Pi soportada; no publicar ni quitar dependencias a ciegas. Usar `createMemoryStack/createMemoryFabric` existentes e inyectar sus opciones antes de crear otro motor o un PiCore universal. Mantener façade de compatibilidad para consumidores actuales.

**Mejora y aceptación:** import/instalación limpia aislada y uso de motor sin cargar SDK Pi; Pi adapter sigue funcionando. Decidir y probar salida JavaScript o loader soportado para consumidores: exports a `.ts` y una versión mínima de Node no demuestran por sí solos ejecución nativa desde un paquete instalado. V11 solo prueba resolución, no instalación limpia. No crear carpetas hermanas, versiones ni worktrees del router; no convertir este ajuste de manifest en permiso de publicación (E-028).

## 4. Cambios de la propuesta 05 que retiro como recomendación inmediata

| Recomendación anterior | Resultado del contraste |
|---|---|
| «Extraer el núcleo del router» | Ya hay aplicación/dominio/puertos e inyección. **No hacerlo sin un cambio de consumidor que lo exija.** |
| «Crear un arnés/controlador común» como novedad | Ya diseñado en Contratos/NESS. Hablar de completar su implementación/cobertura, no volver a inventar su arquitectura. |
| «Añadir micro-VM» | Ya hay GondolinProvider y otros adapters. **Validar/corregir los existentes.** |
| Sustituir knapsack por heurística como optimización preferente | Default pequeño y medición sintética barata. **Conservar** y arreglar su contabilidad. |
| DSSE/JCS como cambio global de firmas | No hay comparación contra el sistema existente que lo justifique. Corregir primero cobertura/versión/sujeto/custodia. Mantener como opción futura, no requisito de este delta. |
| Perfil CBOR propio como solución adoptada de auditoría | CBOR no es un estándar de auditoría. No implantar otro almacén/formato bajo apariencia de normalización. Separar el requisito de logs sin JSON, la evidencia de memoria y C28; backend/retención/custodia siguen su decisión específica. |
| PostgreSQL como requisito para corregir memoria | V03 muestra que el backend local puede hacer la transacción. **No migrar memoria por este defecto.** La secuencia PostgreSQL de CORE conserva su alcance propio. |
| PROXY como servicio de inferencia ya demostrado por su nombre | El artefacto inspeccionado declara `pi-extension-enforcement`, con `main:src/index.ts`. Reutilizar sus gates; no atribuirle un transporte/provider y autoridad externa no verificados. |
| FACTORY como sinónimo de todos los anillos siempre ejecutados | Dispatcher, fachada y verificadores son recorridos distintos. Perfil y recibo de capacidades deben identificar el recorrido real. |

El requisito de **logs sin JSON** no se retira ni se «resuelve» guardando JSON dentro de SQLite. RFC 5424 para diagnóstico y OTLP/Protobuf para telemetría siguen siendo referencias compatibles; ni ellas ni una nueva serialización arreglan firmas incompletas, falta de ancla o escritores que eluden el dueño. La custodia institucional C28 no se convierte en base universal de memoria/telemetría.

## 5. Plan de aplicación verificable, sin big bang

Cada paso sigue el procedimiento del repositorio propietario; no es autorización para editarlo desde este expediente. P0 significa «antes de anunciar/activar esa garantía», no explotación de producción acreditada.

| Orden | Paquete de trabajo | Cierre exigido |
|---|---|---|
| 1 / P0 datos | D02 + protección de replay destructivo | Matriz de operaciones por principal; ningún read/contador/mantenimiento/replay cruza ámbito. Historial incompleto no reemplaza datos. |
| 2 / P0 consistencia | D03 → D01 → D04 | Unidad de trabajo local, todas las entradas mediadas, esquema de efectos/replay completo; snapshot/replay equivalente y fallos por etapa. Resolver legado antes de reactivar capacidades destructivas. |
| 3 / P0 evidencia | D05 + D06 | Objetos versionados y campos/sujetos cubiertos; signer/verifier coordinados, legado explícito, anclas/restore según amenaza. Nada de reescribir historia para fingir seguridad retrospectiva. |
| 4 / P0 gobierno anunciado | D09 + D10 | Adapter/facts/perfil y sandbox reales; controles obligatorios independientes de score; recorrido entrada→decisión→efecto/denegación→recibo. No habilitar fuerte sobre cobertura cooperativa. |
| 5 / P1 eficiencia | D07 → D08 | Presupuesto final correcto; candidatos autorizados; un rerank final; holdout pareado sin regresión de calidad y límites de recursos. |
| 6 / P1 distribución | D11 | Resolución pública, consumo aislado y compatibilidad del adapter; ningún nuevo paquete/repositorio ni host obligatorio para usar solo el motor si el perfil lo permite. |

No hace falta bloquear arreglos de integridad/ámbito esperando un segundo agente o una plataforma territorial completa. Tampoco extraer todo antes de probar una sección vertical. La segunda integración sirve para demostrar portabilidad, no para posponer correcciones necesarias.

Mantener restricciones actuales: sin soak; sin nuevas inferencias autorizadas por inferencia de este encargo; no suite persistente del router sin resolver E-020; sin remotes/publicación; sin cambios de secretos; toda evidencia de esta ronda bajo la raíz canónica.

## 6. Qué mejora está justificada y hasta dónde

- **Corrección demostrada por contrafactual local:** límites de render, guarda previa de ámbito, transacción misma DB, cobertura de campos/sujeto y candidatos independientes eliminan sus contraejemplos sintéticos.
- **Optimización concreta medida por operaciones:** un rerank en lugar de dos, con el mismo orden en la fixture. No ahorro monetario/latencia real todavía demostrado.
- **Simplificación justificada:** conservar puertos, algoritmo y sandbox existentes; no agregar daemon/framework/formato/DB para arreglar un defecto de cableado o invariantes.
- **Pendiente de implementación, no de idear otra arquitectura:** los once cambios tienen dueño, localizador y puerta de aceptación. No están aplicados por documentarlos.
- **Límite de cobertura:** no se ha auditado cada repositorio de `/Code`, demostrado todo el catálogo territorial, certificado hardware o ejecutado Pi real/micro-VM. Eso no impide cerrar esta comparación acotada, ni permite venderla como certificación global.

**Recomendación final:** mantener tu arquitectura; cerrar primero escritura/ámbito/replay y autenticidad de evidencia; después quitar trabajo redundante y arreglar composición/distribución. La diferencia útil no es otro diagrama: son los cambios D01–D11 y las invariantes verificables que los justifican.
