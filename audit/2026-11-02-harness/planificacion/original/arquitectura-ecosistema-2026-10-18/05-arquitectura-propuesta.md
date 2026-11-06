# Propuesta integral — capacidades portables y ejecución gobernada de Jart-OS

**Fecha:** 2026-10-18 · **Estado:** PROPUESTA DEL ASISTENTE / NO RATIFICADA / NO IMPLEMENTADA.

> **RECTIFICACIÓN TRAS REVISIÓN CON RUBÉN:** la estructura principal aquí descrita ya estaba en los diseños de Jart-OS: núcleo/adaptadores, controlador separado, misiones, registro y capacidades independientes. Este documento es esencialmente una consolidación con concreciones adicionales, **no una arquitectura nueva ni una mejora estructural demostrada sobre la existente**. Se presentó con una novedad que no correspondía. La aportación comprobada del expediente son la trazabilidad y los hallazgos localizados; las opciones técnicas nuevas no justifican por sí solas una migración.

> **RESULTADO VIGENTE INV-10:** leer [08-delta-recomendado.md](08-delta-recomendado.md) y [09-evidencia-delta.md](09-evidencia-delta.md). La comparación ya está entregada. Se conservan las piezas existentes y se justifican once cambios acotados; 08 retira como recomendaciones inmediatas opciones de este documento que no demostraron beneficio. No ejecutar su tabla tecnológica como un plan de migración aprobado.

**Encargo:** proponer una arquitectura completa, optimizada y contrastada con prácticas actuales. No autoriza instalaciones, cambios de producto, extracciones, servicios nuevos ni despliegues. Documento de diseño dentro del router, no nuevo canon ni ADR aceptado.

Lectura: [hallazgos](01-hallazgos.md), [fuentes locales](02-fuentes.md), [comprobaciones previas y límites](03-evidencia.md), [contraste oficial actual](06-contraste-sota.md). Las afirmaciones sobre el destino arquitectónico son **INT**; los resultados ejecutados siguen limitados al expediente anterior.

## 0. Decisión arquitectónica que propongo

**Arquitectura hexagonal de capacidades, con composición modular y una frontera de ejecución basada en misiones autorizadas.** Reutilizar los motores existentes; adaptar cada runtime; separar físicamente el agente del controlador cuando se anuncie ejecución gobernada. Separar datos por propietario, no por una base universal. Separar proceso solo por necesidad de confianza, aislamiento o ciclo de vida.

No crear otro «Jart-KERNEL» que absorba todos los productos, ni una extensión que deba instalarse para poder usar cualquier otra. No sustituir todos los runtimes por un loop propio. No convertir cada función en microservicio.

### Elecciones concretas

| Tema | Recomendación de esta propuesta |
|---|---|
| Dueños funcionales | CORE registra/resuelve; Contratos administra misiones/capacidades; PROXY aporta políticas/gates y salida controlada; memoria, routing, CANON y FACTORY conservan dominios propios. |
| Reutilización | Bibliotecas de dominio allí donde el lenguaje lo permite; CLI para trabajo discreto entre lenguajes; API solo para procesos que deban vivir separados o coordinar estado. |
| Perfil gobernado inicial | Un dominio de autoridad en la workstation, un controlador de ejecución por dominio, agentes con identidad/permisos distintos; no cuatro autoridades distribuidas el primer día. |
| Datos de autoridad | PostgreSQL dedicado al dominio de autoridad para misiones, canjes, reservas y outbox. No usar la DB de memoria como autoridad. CORE conserva catálogo YAML/git y arranque sin DB; su PostgresStore sigue su secuencia ya documentada. |
| Políticas | Reutilizar el núcleo determinista de PROXY, una vez comprobado su cableado. No añadir inicialmente Rego, Cedar ni un DSL propio. |
| Protocolo | JSON v1 conforme a C30, contratos OpenAPI donde ya corresponda; interfaces CLI existentes para productos CLI. No imponer MCP a todo. |
| Nuevas misiones firmadas | Payload JSON canónico JCS dentro de envoltura DSSE tipada; algoritmo y firmante en allowlist; backend hardware según dispositivo real. Conservar formatos existentes de otros recibos mediante adapters, no reinterpretarlos como misiones. |
| Tickets | Opacos, aleatorios y de un uso; atributos, atenuación y consumos en servidor. No implementar macaroons distribuidos de entrada. |
| Logs nuevos | Diagnóstico RFC 5424; telemetría OTLP/Protobuf; evidencia duradera tipada y codificada sin JSON. Nada de JSONL/JSONB como solución encubierta de auditoría. |
| Sandbox | Backend explícito y probado por host; si no cubre el efecto solicitado, ese perfil no se habilita. En macOS, VM Linux selectiva para ejecución no confiable que exija aislamiento fuerte, no `sandbox-exec` deprecado como garantía universal. |
| Transporte local | Cliente de control sobre socket Unix autenticado, con operaciones versionadas. HTTP/TLS para otros nodos cuando exista necesidad territorial; no broker distribuido en el primer camino crítico. |
| Evolución | Migración por secciones verticales y recibos comparables, con un solo decisor activo por responsabilidad. Sin doble ejecución de efectos ni migración masiva. |

Estas son elecciones de diseño, no afirmaciones de disponibilidad actual. «SOTA» aquí significa prácticas actuales defendibles, no rendimiento demostrado ni certificación de seguridad.

## 1. Objetivos y límites

### Prioridades, en este orden

1. Preservar autoridad, intimidad, alcance aprobado y veracidad de la evidencia.
2. Tener un recorrido completo y recuperable entre intención, permiso, ejecución y efecto.
3. Mantener instalación independiente y adaptación a varios agentes.
4. Reducir duplicación, mantenimiento, consumo de tokens y latencia medidos.
5. Escalar a varios nodos cuando el primer dominio funcione y las reglas territoriales estén resueltas.

Una mejora de coste no justifica omitir verificación requerida, inventar evidencia o eludir una cuota. Una biblioteca compartida no justifica acoplar todas las instalaciones.

### Se conserva del marco existente

- C25: el runtime pertenece al molde; cambiarlo exige versión/aprobación/registro.
- C35: se firma misión y objetivo, no cada paso; cada tarea sigue perteneciendo al catálogo. Fallar no permite improvisar.
- C28: libro institucional separado de memoria, mensajería y estado vivo; firma del emisor, contrafirma institucional y réplica territorial según su protocolo.
- CORE: registro antes que telemetría; autoriza en su sentido registral, no ejecuta efectos. Catálogo YAML/git; sin JSON/SQLite como almacén de CORE.
- Stack: productos standalone. FACTORY sigue siendo núcleo CLI determinista, sin daemon ni LLM interno.
- Router: una carpeta/versión canónica, Node como runtime soportado, G4/G5/G6 vigentes, E-020/E-028 sin cambios, ningún soak restaurado.
- TUIOS excluido. Las instituciones no se identifican automáticamente con aplicaciones de nombres parecidos.

No se ratifican umbrales, economía institucional, composición del Triunvirato ni ampliaciones del catálogo mediante este diseño.

## 2. Vista lógica — tres planos, no tres nuevas aplicaciones

```text
PLANO DE GOBIERNO Y CONTROL
  catálogo/procedimientos aprobados ── CORE registry / resolvedor
               │ referencias versionadas, identidad, concesiones registradas
               v
  revisión/firma humana ── Contratos: misión + FSM + capacidades + presupuestos
                                      │
                           decisión de política/gates de PROXY
                                      │ autorización vinculada al efecto
                                      v
PLANO DE TRABAJO
  Pi / otros runtimes ── adapter ── controlador de ejecución ── FS / procesos / MCP / APIs
       │ propone                      │ ejecuta con permisos acotados
       │                              └─ salida de inferencia: PROXY + routing + credenciales
       ├─ contexto: memoria + procedencia CANON + economía de tokens
       └─ artefactos: CLI FACTORY / verificadores / Dementor según operación

PLANO DE EVIDENCIA Y OBSERVACIÓN
  recibos duraderos de operación ── referencias al libro institucional C28
             │                              │
             │                              └─ actas en knowledge, no dentro del libro
             └─ diagnóstico / métricas / trazas ── CORE telemetry ── BOARD/BAR/laboratorio
```

Los módulos de política de PROXY usados dentro del controlador son bibliotecas o puertos, no una petición a otro daemon por regla. El endpoint de inferencia del proxy y el controlador de herramientas tienen distinta función: si se co-localizan, no se fusionan sus autoridades.

## 3. Componentes, propietarios y fronteras

| Responsabilidad | Dueño propuesto / encaje existente | Implementación y despliegue | No debe hacer |
|---|---|---|---|
| Identidad registral, catálogo, ubicación, config, referencias de concesiones | CORE registry | Biblioteca/CLI de bootstrap; API de registro según su contrato; adaptadores de persistencia | Ejecutar comandos, alojar el loop del agente, almacenar contraseñas. |
| Reglas de evaluación, normalización de decisiones y gates reutilizables | Núcleo de Jart-PROXY, siguiendo el linaje NESS/HARNESS | Dominio determinista inyectado donde se decide; misma implementación, no copia por agente | Ser otra autoridad de concesiones o mantener un catálogo rival. |
| Misión, firma válida/autorizada, FSM, derivación, revocación operativa, canjes | Jart-Contratos | Módulos del controlador; AuthorityStore transaccional | Decidir que una firma legisla; abrir catálogo; tratar `approved=true` como permiso suficiente. |
| Lanzamiento de sesión, mediación, ejecución y recuperación | Controlador del arnés de Contratos | Proceso confiable distinto del worker; puertos de ejecución y sandbox | Cargar plugins editables por el agente; ejecutar texto de shell irrestricto con identidad privilegiada. |
| Integración de agente | Adapter por runtime y versión | Extensión/hooks/SDK/CLI según cobertura; código mínimo | Duplicar política, conceder permisos, ocultar huecos o reemplazar silenciosamente runtime. |
| Credenciales y firma | Puertos de custodia separados: store aprobado del SO; OpenBao si el perfil territorial lo requiere | Helper de firma bajo control humano; inyección de secretos al usar el recurso | Confundir registro de claves públicas con password manager; devolver secretos al modelo. |
| Elección de modelo/endpoint | URA o política de PROXY cuando ese producto esté conectado | Adaptador opcional; backend explícito en standalone | Hacer obligatoria URA para rotar cuentas de un proveedor; decidir permisos. |
| Reparto entre cuentas, cuotas y concurrencia | Motor del router | Biblioteca de aplicación con StateStore; local en standalone, propietario único en proxy en modo centralizado | Contar claves como cuotas independientes; volver a enrutar la misma solicitud en dos capas. |
| Memoria y recuperación | Motor de memoria, desacoplado del composition root Pi | Biblioteca local; CLI/API opcional cuando exista consumidor que lo necesite | Ser autoridad jurídica, gestionar todos los secretos o custodiar por defecto el libro institucional. |
| Procedencia y conocimiento verificado | CANON / knowledge según sus interfaces | Consultas y artefactos de procedencia; referencias y recibos | Convertir una cita en autorización o asumir que un hash prueba verdad. |
| Selección y presupuesto de contexto | Capacidad de economía de tokens, evolución de la lógica existente | Biblioteca por solicitud; sin LLM adicional por defecto | Alterar misión, restricciones, firmas, errores críticos o incertidumbre para ahorrar tokens. |
| Producción y verificación de artefactos | FACTORY y sus puertos/verificadores existentes | CLI determinista, invocación puntual; juicios externos fuera del kernel | Convertirse en orquestador residente universal o en toda la institución Fábrica. |
| Libro institucional | Responsabilidad C28 y custodia institucional | Referencias, huellas y veredictos; réplicas por valija; backend bajo su dueño | Guardar chats, cada delta de tokens, memoria o todo el journal operativo. |
| Telemetría y visualización | CORE telemetry; BOARD/BAR consumidores | OTLP/métricas y adaptadores de diagnóstico | Condicionar el arranque del registro; inventar una autoridad propia en el dashboard. |

**No son catorce paquetes ni catorce procesos.** La distribución concreta sigue el propietario y el repositorio canónico existente. `pi-intermediate` deja de ser, como destino de diseño, una bolsa universal de gobierno/memoria/secretos: se asigna cada responsabilidad antes de cualquier extracción. No se crea otro paquete hermano dentro del router.

## 4. Interfaces: pequeñas, versionadas y verificables

### Puertos lógicos mínimos

- `RegistryPort`: resolver identidad, catálogo, concesión registrada y versión/freshness.
- `PolicyPort`: evaluar petición normalizada frente a hechos y policy bundle inmutable.
- `AuthorityPort`: admitir misión, activar, emitir/derivar capacidad, revocar, consultar estado.
- `ExecutionPort`: preparar, ejecutar operación tipada, consultar/conciliar efecto, cancelar cuando sea posible.
- `SandboxPort`: declarar mecanismos y cobertura; lanzar trabajo con mounts/red/límites permitidos.
- `CredentialUsePort`: usar una referencia para un recurso y propósito concretos; no `get_all_secrets`.
- `ModelTransportPort` / `PoolStatePort`: petición de inferencia y reserva de cuota/concurrencia.
- `MemoryPort` / `ProvenancePort` / `ContextBudgetPort`: recuperación autorizada, procedencia y selección.
- `VerificationPort`: verificar objeto exacto con perfil/versiones/evidencias.
- `ReceiptPort`: commit duradero de evidencia y exportación institucional mediante outbox.

Son contratos de diseño, no nuevos nombres publicados ni promesa de reemplazar los puertos útiles que ya existen. El router ya tiene StateStore/EpisodeStorePort/CredentialResolver; FACTORY tiene StorePort/ExecPort/VerifyPort. Se conservan y adaptan cuando satisfagan el límite.

### Protocolo y compatibilidad

- JSON v1 para mensajes de control de Jart-OS, con schema y major version explícitos; CORE y APIs del stack conservan OpenAPI y freshness/provenance. El CLI FACTORY no se convierte en API para uniformarlo todo.
- Un pequeño conjunto de contratos de wire y fixtures de conformance, generado donde proceda; no una dependencia de negocio que arrastre memoria, ORM, SDK del agente o runtime de todos los productos.
- Los adapters traducen vocabulario real (`Write/file_path`, `write/path`, etc.) a operaciones semánticas. Nombre de herramienta o hint `readOnly` no demuestra el efecto.
- Mayor desconocida o campo crítico desconocido: no ejecutar. Cambios aditivos solo si el schema permite ignorarlos sin modificar autoridad. Rechazar claves JSON duplicadas, cantidades no finitas y números fuera del perfil acordado.
- Campos de control comunes: identidad/sesión, misión, operación, correlación/causalidad, destino/audience, schema version, policy/catalog digest. IDs no son credenciales.
- RPC del controlador limitado a operaciones registradas; nada de un método genérico privilegiado `eval(code)`.
- Socket Unix con permisos del SO **y autenticación de sesión**; no confiar solo en «viene de localhost». El launcher asigna la sesión y una prueba de posesión ligada al canal/principal. La implementación del mecanismo de identidad se prueba por host; no se atribuye a Node una API portable de peer credentials que no se haya comprobado.
- Para otros nodos, TLS autenticado y audience/replay checks. La identidad del cliente ante el controlador no se reenvía como token indiscriminado al proveedor o MCP (S02).

No hay event bus obligatorio en el camino de cada operación. NATS/valija conservan su papel territorial ya documentado; no se añade otra plataforma de mensajería para resolver canjes locales.

### Dependencias internas y distribución

```text
adapter del host / CLI / API
          ↓
casos de uso de la capacidad
          ↓
dominio puro + puertos
          ↑ implementados por
adapters de almacenamiento / transporte / SO / verificadores
```

El composition root ensambla; el dominio no importa Pi, MCP, PostgreSQL ni el resto de aplicaciones. Los adapters no se importan entre sí para saltarse casos de uso. Contratos puede inyectar el evaluador puro de PROXY; ese evaluador no llama de vuelta al servicio de Contratos. La salida de inferencia puede consultar autoridad mediante su puerto sin introducir un ciclo en los dominios.

Un propietario mantiene cada implementación; otros lenguajes consumen CLI/API o un binding acotado, no una traducción manual divergente de todas sus reglas. Imports públicos por nombre de paquete/entrypoint cuando se distribuya; no rutas físicas `../../otro-producto/src`. Compatibilidad SemVer por contrato/capacidad, no un release lockstep de todo Jart-OS. El repositorio/folder canónico sigue siendo único: esta separación lógica no autoriza nuevos subpaquetes del router.

## 5. Modelo de autoridad — misión, no una colección de botones

### 5.1 Las piezas

1. **Tarea aprobada:** operación tipada, parámetros y límites, efectos permitidos y evidencia requerida. Un comando libre no se disfraza de tarea estrecha.
2. **Procedimiento aprobado:** técnica reutilizable que compone tareas y ramas. No recibe firma de misión por sí mismo.
3. **Misión:** objetivo concreto + destinatario + procedimiento opcional + tareas/pasos/ramas + sujetos + alcance + plazo + presupuestos + criterios de éxito + referencias de catálogo/política.
4. **Autorización:** firma válida, firmante competente y aprobación aplicable a esa misión. Son comprobaciones distintas.
5. **Capacidad derivada:** permite una operación dentro de la misión, no crea nueva autoridad.
6. **Recibo:** documenta decisión, intento, efecto y verificación observada; no convierte por sí solo un resultado en verdad ni en permiso futuro.

### 5.2 Objeto que se firma

La versión inicial debe cubrir **todos** los campos semánticos: objetivo y entregable; UUID del agente y referencia de memoria; molde/runtime/versiones; destino; tareas, parámetros y artefactos/dependencias congelados; ramas aprobadas; permisos de red/rutas; límites de tokens/coste/efectos; condiciones de delegación; checkpoints; plazo/nonce; catálogo/policy digest; perfil de verificación y recuperación permitida.

Identidad del objeto por digest de los bytes canónicos, no por una firma particular. JCS + DSSE separa el tipo `mission/v1` de otros objetos firmados. Claves/algoritmos aceptados explícitos; no downgrade por contenido de un sobre. Usar bibliotecas criptográficas y canonicalizadores contrastados, fixtures cruzados y verificación de bytes completos; no otro `canonical()` ad hoc.

El firmador recibe el objeto sellado y muestra un resumen/diff **derivado de ese mismo objeto** mediante UI confiable. No firmar un hash viendo únicamente el resumen que escribió el agente. Touch ID/presencia física y firma criptográfica no se equiparan sin probar la política de uso de la clave.

### 5.3 Ciclo de vida

`DRAFT → AUTHORIZED → ACTIVE → COMPLETED | ABORTED`.

La propuesta usa `AUTHORIZED` como nombre de dominio para distinguir una firma presente de una autorización admitida; no exige renombrar estados existentes sin migración. Documento firmado inmutable; consumos y transiciones son registros separados. Salud de ejecución (`ready`, `held`, `uncertain`) es estado operacional, no una modificación de lo firmado.

- Spec Gate: todas las tareas legales y suficientemente precisas.
- Admisión: identidad/competencia, firma, destino, plazo y condiciones válidos.
- Activación: almacén duradero y controles obligatorios disponibles.
- Ejecución: solo siguientes transiciones/ramas ya autorizadas.
- Una condición prevista puede seleccionar una rama firmada mediante predicado explícito: por ejemplo, una tarea de observación cumplida puede informar «los tests no pasan» si ese resultado estaba contemplado. Esto no redefine después lo que significaba cumplir la tarea. **Fallo real de una tarea/postcondición exigida: ABORTED y misión nueva**, conforme a C35; no usar una rama genérica de reparación para eludirlo.
- Resultado incierto de transporte: suspender para conciliar, no suponer fallo y repetir.
- Finalización: postcondiciones cumplidas y verificaciones requeridas presentes; después, juicio institucional correspondiente. No es `exitCode=0` ni «el agente dice terminado».
- Una misión abortada no revive. Si se necesita trabajo distinto, nueva misión autorizada; no borrar el aborto.

### 5.4 Firmas por lotes, patrones y delegación

Reconciliación conservadora de C35 y la decisión D14 de Jart-Contratos (fuente D20): **se firma una misión con objetivo, límites y parámetros/repeticiones acotados**, pudiendo instanciar un procedimiento/patrón aprobado. Los subtickets no necesitan nueva firma humana dentro de esa intención.

No se adopta como permiso genérico una firma sobre «cualquier agente, cualquier trabajo futuro hasta revocación». Los patrones sin objetivo de misión concreto quedan como diseño pendiente de ratificación expresa, no como bypass inicial. L3 y ampliación de catálogo permanecen fuera del mecanismo ordinario.

Toda derivación reduce o mantiene el alcance; jamás lo amplía. Sujeto, destino, plazo, número de usos, recursos y presupuesto quedan dentro del padre. Los subagentes consumen el presupuesto de la misión y pasan por la misma frontera. Crear una sesión hija no crea por arte de magia un nuevo agente registrado ni autoriza cambiar de molde/runtime.

### 5.5 Tickets, concurrencia y revocación

- Token aleatorio de 256 bits; guardar un verificador/hash apropiado, no registrarlo en claro.
- Binding servidor: misión, sujeto/sesión, operación, parámetros sellados, artifacts digest, audience, nonce, expiración, presupuesto y dependencia de paso.
- En una transacción: comprobar estado/epoch de revocación, reservar presupuesto, consumir capacidad y persistir intención. Un constraint de unicidad y transición condicional impiden dos canjes válidos concurrentes.
- Una sola autoridad lógica de canje por misión. Las réplicas del libro no canjean tickets independientemente ni forman un multi-master de permisos.
- Revocar plantilla/misión/sesión afecta nuevos despachos en esa autoridad desde su commit. Un efecto ya enviado puede no ser cancelable; se registra y concilia.
- CORE registra concesiones e identidad; Contratos posee consumos y validez operativa de misiones. Las referencias registrales no son otra copia editable de `remaining_uses`. Las bajas de identidad/concesión deben provocar invalidación operativa explícita; no basta cambiar un dashboard.
- Protocolo asimétrico seguro entre ambos: un alta no se activa antes de confirmar su registro/competencia; una revocación operativa se bloquea primero en la autoridad de ejecución y se refleja después en CORE mediante outbox. Si se inicia desde CORE, se dirige a la autoridad competente y queda **pendiente**, no falsamente efectiva, hasta su confirmación. Conservar el historial/decisión registral y la proyección de eficacia, no dos escritores sobre el mismo contador. Probar los fallos de cada tramo antes de habilitar administración remota.
- En varios nodos, revocación global solo se declara completada tras fencing/confirmación de los ejecutores afectados, o consulta online a la autoridad. Una réplica desconectada no tiene «revocación instantánea»: no admite nuevos despachos que requieran frescura. Bundles cacheables son política inmutable, no un permiso mutable eternamente válido.

## 6. Frontera de confianza y cobertura real

### Actores y amenaza

- No confiables: instrucciones del modelo, contenido web, resultados MCP, memoria recuperada, propuestas de comandos y código generado.
- Confiables para su cometido: launcher/controlador desplegado y sellado, verificador de firmas, política aprobada, custodia, backend de sandbox y almacén de autoridad.
- Separados: humano autorizante, worker agente, ejecutor controlado, verificador y custodio institucional. Separación lógica no basta cuando un rol puede editar código/config/llaves del otro.
- Fuera de la garantía local básica: root malicioso, compromiso de kernel/hipervisor, hardware del firmador comprometido o colaboración del administrador para sustituir toda evidencia. Requieren custodia/atestación externa adicionales, no adjetivos.

### Distribución de permisos

- El worker no tiene sudo, secretos de proveedor, claves del firmante, credenciales administrativas de DB ni escritura sobre el controlador desplegado, su configuración o su ledger.
- El workspace de desarrollo no es automáticamente la instalación confiable. Cambiar fuentes no recarga autoridad: una promoción requiere artefacto verificado y aprobación de actualización.
- Lectura por rutas concretas; escritura de efectos duraderos a través de operaciones autorizadas del ejecutor. Scratch temporal del worker limitado y sin autoridad sobre otras piezas.
- Para pruebas/builds, vista de entradas de solo lectura y salidas declaradas; herramientas y dependencias vinculadas al artefacto/entorno autorizado. No nuevos worktrees ni copias instaladas del router para «aislarlo».
- El controlador tampoco es root ni tiene acceso global al home. Cada ejecutor recibe el mínimo permiso del efecto permitido; una tarea sensible no hereda todos los poderes del controlador.
- No cargar extensiones/skills ejecutables ni servidores MCP descubiertos desde proyecto en un proceso de autoridad. Skills como texto no ganan autoridad; plugins ejecutables pertenecen al TCB de quien los carga.

### Integración Pi

La documentación actual permite SDK con herramientas/recursos explícitos y sin descubrimiento automático (P01/P04). **Recomendación:** worker Pi con loadout controlado y operaciones del gateway, no bash/edit/MCP arbitrarios coexistiendo fuera de la frontera. El SDK permanece en el lado del worker, no dentro del proceso que custodia permisos.

Una extensión habitual sirve para UX, contexto, routing local y controles cooperativos. No se vende como aislamiento del mismo proceso que puede inspeccionar disco y credenciales. Mantener la extensión actual del router no equivale a haber desplegado este perfil.

### Backend físico

- Base nativa: usuarios/permisos separados y ACL por proyecto, con pruebas de rutas y acceso al control/secretos.
- Linux para código no confiable: filesystem/mount y red aislados, límites de recursos y restricciones de syscalls según backend soportado; no asumir que un contenedor por defecto lo hace.
- macOS: no afirmar control de red por crear otro usuario. Para código no confiable con exigencia fuerte, usar una VM Linux de ejecución restringida y persistente mientras haya trabajos; entradas/salidas acotadas y broker fuera de la VM. No una VM por tool call ni para todas las bibliotecas de contexto.
- Un backend nativo macOS puede sustituir esa VM **solo** tras demostrar la cobertura requerida sobre la versión concreta del SO. La dependencia de un mecanismo deprecado no constituye el fundamento del diseño.
- ACL sin aislamiento de red demuestra protección de ciertos ficheros, no «cero exfiltración». IPv4/IPv6, loopback, DNS, sockets y servicios locales deben probarse, no darse por cubiertos.

### Declaración de cobertura por efecto

Cada adapter/backend identifica versión de runtime/SO, herramientas nativas, nested tools, MCP, REPL/codemode, user shell, subagentes, red, filesystem y rutas de configuración/recarga. Clasificación: **observado**, **cooperativo** o **enforced**, con evidencia por canal. «Parcial» y «no verificado» son estados válidos; no autorizan el perfil que requiere cobertura total de ese canal.

Mediación completa significa todos los caminos del **efecto declarado**, no controlar cada pensamiento del modelo ni registrar cada syscall. Si el worker tiene escritura directa al proyecto, no se promete autorización individual de todas sus escrituras. Para prometerla, se retira ese camino o se confina a scratch y se aplica el diff mediante ejecutor.

## 7. Topología y perfiles de instalación

| Perfil | Qué se instala/activa | Garantía y límite |
|---|---|---|
| Capacidad standalone | Solo motor requerido + adapter del agente + dependencias propias | Router o memoria utilizables sin CORE/FACTORY completos. No se anuncia gobierno externo inexistente. |
| Integración cooperativa | Capacidades y hooks/adapters locales, bundles de reglas | Prevención según puntos del host. No resistencia a desactivación/modificación por ese mismo principal. |
| Ejecución gobernada local | Controlador separado + AuthorityStore duradero + launcher/signer + backend de aislamiento necesario | Ningún efecto del ámbito declarado sin autorización y evidencia; pérdida del control implica denegación de nuevos despachos sensibles. |
| Territorial | Dominio(s) registrados, identidad de transporte, delegación por destino, revocación/fencing, réplica C28 y telemetría central | No asumir autorización offline ilimitada ni consenso por tener NATS. |

### Perfil inicial recomendado

Un controlador modular local compone Contratos, políticas de PROXY, ejecutores y adaptadores de recibos. No un daemon por módulo. Worker(s) separados; signer bajo demanda; CORE resolviendo desde catálogo/bundle local sin necesitar telemetría; FACTORY como comando. PostgreSQL del dominio de autoridad dedicado y con propietario administrativo distinto de la aplicación.

Una instancia de PostgreSQL puede alojar tablas del mismo dominio transaccional (misiones, consumos, reservas, outbox y recibos operativos). Esto no abre SQL a todas las aplicaciones ni comparte por defecto burbujas, volúmenes o usuarios con memoria/telemetría. El Postgres registral de CORE y otros servicios mantienen su aislamiento/ownership; co-ubicarlos físicamente requiere encaje territorial explícito.

No se fija un puerto a mano ni se despliega fuera de catálogo. La workstation es el emplazamiento propuesto del primer dominio, no constatación de recursos libres ni autorización para instalar allí nada. No se toma prestado el Postgres de otra app. Si no existe almacén adecuado, el perfil gobernado no se declara operativo; el standalone sigue disponible con su garantía propia.

### Cadena de suministro, despliegue y actualizaciones

- Dependencias y artefactos fijados por versión/digest, lockfiles y procedencia; SBOM de lo desplegado cuando se produzca su release. No descargar/ejecutar plugins en caliente porque el modelo encuentre un nombre.
- Manifest de despliegue del dominio: versiones de controlador, evaluador, adapter, runtime, sandbox y schemas; policy/catalog digest, referencias de claves, capacidades y resultado de las puertas. Nunca secretos.
- Solo promover artefactos verificados desde el workspace de desarrollo al entorno confiable mediante una misión de mantenimiento autorizada. Runtime/config/credenciales de producción fuera del alcance de escritura del worker.
- Actualización con drenaje o suspensión de sesiones afectadas y comprobación de compatibilidad de misiones activas. Una major incompatible no reinterpreta misiones antiguas. Una denegación de emergencia puede restringir/desactivar, nunca ampliar lo firmado.
- Migraciones expand/contract cuando proceda, backups y compatibilidad de lectores; rollback de binario solo si el estado lo admite. No bajar epochs, desrevocar claves o reabrir tickets para «volver a la versión anterior».
- Rotación/revocación de claves mediante el puerto y procedimiento aprobados, no auto-reemplazo por el agente. La prohibición específica de rotar/revocar/reemplazar las claves You.com sigue vigente.
- Inventario local y mantenimiento no implican publicación: router E-028 permanece local, sin remote ni uploads automáticos de código, SBOM o evidencias.

## 8. Propiedad y almacenamiento de datos

| Dato | Fuente de verdad | Persistencia de destino propuesta | Cachés/proyecciones |
|---|---|---|---|
| Catálogo de diseño, tareas/procedimientos/políticas aprobados | Dueño legislativo; CORE registra y resuelve versiones | YAML/git según canon + artefactos de release verificados | Bundle local firmado/versionado, solo lectura. No permite auto-legislar. |
| Entidades, relaciones y concesiones registradas | CORE registry | Secuencia MemoryStore/git existente → PostgresStore dedicado cuando proceda | Consultas con freshness/provenance; no bootstrap dependiente de DB/telemetría. |
| Misión y autorización firmada | Contratos, con firmante competente | Artefacto firmado por digest + tablas relacionales de admisión/estado | Referencias en CORE/libro; nunca un segundo booleano editable que conceda permiso. |
| Nonces, canjes, epoch, reservas y efectos pendientes | AuthorityStore del ejecutor competente | PostgreSQL transaccional del dominio | No cachear consumos como autoridad en workers. |
| Credencial privada | Store aprobado de SO / OpenBao según perfil | Fuera de repos, prompts, memoria y logs | Referencias opacas; exposición mínima al transporte. |
| Memoria | Motor de memoria | Backend propio existente y adaptado; no migración general a CORE | FTS/vector/graph reconstruibles y con ACL. SQLite de memoria no se propone como almacén de CORE ni como nuevo log. |
| Conocimiento/actas/artefactos | CANON/knowledge/FACTORY, cada cual en su alcance | Almacenes actuales por puerto y digest | El libro conserva huellas/referencias, no todo el contenido. |
| Estado de cuotas | Un StateStore por pool/grupo de límite | Archivo bloqueado en standalone; store coordinado en proxy si varios hosts comparten pool | Métricas derivadas; jamás contadores autoritativos duplicados por extensión. |
| Recibos operativos | Ejecutor competente | Tablas tipadas append-only para aplicación; bytes canónicos CBOR para huella/exportación | Exportador institucional y vistas de consulta. Sin JSON/JSONB escondido en `payload`. |
| Libro institucional | Custodia C28 | Perfil de eventos institucionales encadenados y firmados; réplica territorial | Solo estados y huellas institucionales pertinentes; no mensajería ni memoria. |
| Telemetría | CORE telemetry | Backend de observabilidad correspondiente, por adaptador | BOARD/BAR consumen; no escriben verdad de dominio. |

No imponer «una base para todo» ni una tecnología por responsabilidad. No reescribir todos los productos en TypeScript/Python para uniformar. Los motores TS existentes mantienen su runtime probado; el resolvedor Python no se porta por estética. CLI/API dan reutilización entre lenguajes donde una librería no encaja.

## 9. Flujo completo de una misión

1. **Bootstrap:** resolver catálogo/moldes/identidades desde fuente verificada; cargar recursos permitidos; comprobar compatibilidad y declarar cobertura. Sin servicios de telemetría obligatorios para arrancar. La primera inferencia no se autoautoriza: en el perfil gobernado la sesión se vincula a una misión inicial de lectura/planificación, con objetivo explícito, principal/destino, vigencia y presupuesto aprobados. Ese baseline permite proponer la misión de efectos sin un círculo «necesito permiso para pedir permiso»; no permite autoampliar el alcance. Sin baseline válido, solo queda la UI humana de inspección/autorización.
2. **Contexto:** recuperar solo datos accesibles; adjuntar procedencia/freshness; deduplicar y presupuestar. Material externo etiquetado como dato, no instrucciones de autoridad.
3. **Propuesta:** el agente elabora misión/plan con objetivo, tareas legales y criterios verificables. Puede pensar y leer dentro del baseline aplicable sin solicitar confirmaciones repetitivas.
4. **Spec Gate:** legalidad del catálogo, precisión de parámetros, presupuesto, destino y perfil de verificación. El specgate existente puede servir mediante adapter si demuestra ese contrato; no se convierte en autoridad por su nombre.
5. **Autorización:** revisión confiable del objeto/delta; firma de misión por Rubén o competencia delegada expresamente ratificada. No se introduce delegación institucional aún no aprobada.
6. **Admisión/activación:** persistir objeto y decisión; comprobar controles y disponibilidad de custodia exigidos. Crear capacidades acotadas, no entregarle un permiso general al runtime.
7. **Canje y despacho:** transacción de consumo/reserva/intención; ejecutar entrada sellada dentro del sandbox/recurso autorizado. Validar de nuevo condiciones mutables relevantes inmediatamente antes del despacho.
8. **Efecto y checkpoint:** obtener recibo del recurso cuando exista y verificar postcondición. Resultado desconocido se mantiene como tal, con reserva retenida hasta conciliación.
9. **Evaluación:** verificadores requeridos sobre artefacto/efecto exacto; anillos baratos primero. Dementor cuando el perfil lo exige; no se usa su ausencia como aprobación tácita.
10. **Cierre:** recibo final ligado a misión/artefactos/versions/evidencias; registro institucional correspondiente y acta en knowledge. Memoria recibe aprendizajes admitidos, no autoriza la siguiente operación.

## 10. Routing, inferencia y credenciales

### Dos decisiones, no dos routers rivales

- **Modelo/endpoint:** capacidad, privacidad, latencia, coste y compatibilidad. URA puede proveerla; el standalone usa su backend configurado.
- **Cuenta/transporte:** selección dentro del proveedor y sus límites compartidos. Reutilizar el motor del router, no delegar la cuota al LLM.

En standalone, el router mantiene su composición local actual. En el perfil centralizado, el motor puede vivir junto a la salida de PROXY y el adapter Pi convertirse en cliente del resultado: **no ejecutar la misma selección/contabilización de nuevo en ambos lados**. Es una evolución propuesta que requiere aprobación y conformance, no una extracción autorizada del router.

### Controles

- Pool por proveedor/organización/grupo de cuota real, no por API key. Reservar concurrencia/presupuesto antes de enviar y conciliar uso/headers del proveedor.
- Sin credencial real en el worker. El transporte confiable resuelve la referencia, verifica destino y la inyecta justo al usarla. No entregar un token de proveedor como credencial de identidad ante el gateway.
- Egress por operación/recurso/propósito, con control de redirecciones, DNS/destinos internos y datos permitidos. GET no equivale automáticamente a «sin efectos» y hints MCP no son prueba.
- Reintentos acotados con backoff, jitter y Retry-After cuando corresponda; evitar que host, router y proxy multipliquen intentos. Un propietario de la política de retry por clase de fallo.
- 401/403, cuota, saturación, fallo transitorio y overflow mantienen taxonomía diferente. No cambiar cuenta para eludir una prohibición o una cuota común. La compactación se decide en el dueño del contexto, no se arregla rotando credenciales.
- Presupuestos del conjunto de llamadas, subagentes y verificación; reservas conservadoras. Conteo del proveedor prima sobre estimaciones. No prometer techo monetario exacto sin condiciones de precio/cobro verificadas.
- Reglas específicas vigentes se conservan: You.com usa exclusivamente su pool de dos claves autorizadas con alternancia; falta de una clave es error explícito, sin OAuth ni tercera credencial. No imprimir ni volver a consultar sus valores para documentar la arquitectura.

No se cambian modelos, gratuidad ni condiciones de Agnes por inferencia arquitectónica; se mantienen las restricciones documentadas del proveedor y las conclusiones G3–G7.

## 11. Memoria, conocimiento y economía de tokens

### Separación del motor

La memoria maneja admisión, contenido, recuperación, olvido, consolidación, índices y procedencia. El adapter Pi maneja sus eventos/UX. Seguridad, secretos, elección de modelo y presupuesto se inyectan mediante puertos; no se construye un «PiCore» obligatorio que posea todos ellos.

No copiar el ledger actual como custodia universal: E01–E04 muestran límites de integridad/atomicidad. Datos y evento deben hacer commit en la misma transacción cuando comparten almacén; si no, diseñar reconciliación y declarar el estado intermedio.

### Recuperación segura

1. Aplicar ámbito/ACL y restricciones de datos **antes** del ranking y volver a comprobar antes de emitir al modelo.
2. Recuperación híbrida léxica/semántica según necesidad; diversidad/relevancia con candidatos acotados.
3. Devolver fuente, versión, antigüedad y confianza como datos distintos; una puntuación no vuelve fiable una fuente.
4. Aislar memoria de proyecto/equipo/agente conforme al modelo aprobado; no mezclar datos de dos principales por similitud vectorial.
5. Admitir aprendizajes con evidencia y posibilidad de corrección; no auto-promover resultados del agente a norma/catálogo.
6. Olvido/retención del contenido e índices con semántica explícita. Huella institucional no exige conservar el texto sensible para siempre. Borrado de una clave o hash no se vende como borrado físico certificado sin comprobar el backend/backups.

### Optimización por defecto

**Seleccionar menos y mejor antes de comprimir con pérdida.** Orden: quitar duplicados → reutilizar caché permitida → recuperación dirigida → extracción de fragmentos relevantes → packing con reserva → resumen explícito solo si hace falta.

- Contadores/tokenizadores del proveedor o modelo cuando existan. Estimación por caracteres solo como fallback etiquetado con margen, nunca límite exacto.
- Reservar output y siguiente tool result antes de completar el input. Ante overflow real, host/context manager recompone sin perder misión/restricciones; probar camino real, no solo re-dispatch simulado.
- Preservar restricciones, objetivo, firmas, código/comandos/rutas/IDs, evidencias críticas, negaciones e incertidumbre. Eliminar «creo» no es una optimización inocua.
- Código/errores íntegros mediante referencias y fetch bajo demanda; no inyectar repos enteros ni esconder errores de test para ahorrar tokens.
- Compresión de schemas solo mediante exposición controlada: conservar semántica necesaria para elegir y parametrizar la herramienta. Medir tasa de llamadas correctas; no borrar descripciones globalmente.
- Caché ligada a principal/ámbito, modelo/proveedor, política/catalog digest, schema y versión de contenido. Ni fugas cross-tenant ni cachés de permisos mutables.
- Packing con límites de candidatos, memoria y tiempo. No usar el knapsack exacto como default ilimitado: el código actual asigna O(n·B). Preferir selección acotada/heurística cuando el conjunto no justifique programación dinámica; medir calidad frente a coste.
- Resúmenes con referencias al original y pérdidas declaradas; cache de originales con capacidad/TTL/ACL. Un mapa en memoria no garantiza recuperación después de restart.
- Auto-mejora de prompts offline con holdouts y promoción revisada. Ninguna mejora de score cambia automáticamente catálogo, permisos o runtime registrado.

## 12. Verificación, adversariales y Dementor

Una sola **interfaz de resultado**, no un verificador único ni una escala universal nueva. Adapter a los contratos reales de FACTORY/av/Dementor y demás validadores.

### Perfil por operación

- Comprobaciones de schema, catálogo, firma y límites: siempre en el camino de autoridad correspondiente, deterministas.
- Cambio de código: lint/types/checks pertinentes y recorrido del efecto real en su alcance.
- Artefacto distribuible: reproducibilidad/procedencia/digest y verificadores requeridos de FACTORY.
- Seguridad/autoridad/persistencia: pruebas de bypass, concurrencia, crash y recuperación.
- Juicio semántico/adversarial: solo cuando el perfil de riesgo/producción lo exige, fuera del núcleo determinista y con presupuesto propio.

El número de anillo conserva el significado del producto que lo define; no se asume que todo «L3» de seguridad sea el mismo «L3» de verificación. No aplicar cinco evaluadores a cada lectura ni omitir uno requerido para obtener disponibilidad.

### Recibo de verificación

Liga objeto/digest exacto, misión/operación, spec/policy/profile version, herramientas/versiones realmente invocadas, checks exigidos/descargados/omitidos, evidencias y cobertura, verdict, límites, firmante y momento cuando sean relevantes. No aceptar un recibo de otros bytes o un score sin evidencia.

Verificador sin permiso de modificar el objeto evaluado ni autorizarse a sí mismo. Entradas de datos tratadas como no confiables; acceso de red y secretos restringido. Usar el mismo modelo o el mismo asistente en otra pasada no constituye independencia.

Resultados posibles de integración: aprobado, rechazado, requiere cambio/escalado, no disponible/inconcluso. No mapear desconocido a aprobado. Las escalas internas existentes se traducen sin perder semántica; el score no sustituye el verdict.

## 13. Logging normalizado y evidencia sin JSON

### Cuatro clases con contratos distintos

| Clase | Formato/flujo propuesto | Entrega y retención |
|---|---|---|
| Diagnóstico operativo | RFC 5424, texto estructurado por MSGID y campos; adaptador Unified Logging/journald opcional | Colas/rotación acotadas, redacción y contadores de pérdida. No payloads JSON incrustados. |
| Métricas/trazas | OpenTelemetry, OTLP con Protobuf; scrape de métricas donde corresponda | Exportación asíncrona a CORE telemetry; su caída no bloquea registro ni acciones que no requieran esa evidencia. |
| Journal/recibos de autoridad | Filas tipadas + representación determinista CBOR del evento completo para huella/firma | Commit duradero antes del efecto en eventos de autorización/intención; resultado posterior con estado explícito. Sin columna genérica JSON/JSONB. |
| Libro institucional C28 | Perfil CBOR determinista de hechos/huellas institucionales, encadenamiento, firma de emisor y contrafirma correspondiente | Réplica y detección de divergencia por protocolo territorial; acta completa en knowledge. No todos los tool calls ni mensajes. |

RFC 5424/OTLP normalizan formatos y transporte; CBOR normaliza codificación. **No se afirma que CBOR sea un estándar universal de auditoría, ni que ninguno de esos protocolos garantice inmutabilidad por sí solo.** El perfil de evidencia Jart y su custodia requieren especificación y conformance propias.

CBOR no significa «convertir JSON a bytes y declarar resuelto el requisito»: el perfil de eventos define campos tipados y no transporta como evento el prompt, transcript o sobre JSON completo de la misión. Guarda sus referencias/digests. El control JSON C30 y los formatos nativos de sesión/RPC de Pi son otro ámbito, no el nuevo log. Este diseño no afirma haber eliminado JSON del ecosistema.

### Campos y garantías

Evento: schema version, event ID, stream/sequence, instante y fuente de tiempo, actor/sesión, misión/operación, destino, tipo de hecho, decisión/estado/razón, policy/catalog digest, referencias y hashes de evidencia, clave/algoritmo cuando firme, previous hash. Todos los campos semánticos entran en los bytes protegidos, incluidos referencias y metadatos relevantes; no se repite el defecto de `ref` fuera del hash.

Perfil CBOR explícito: mapas deterministas, tipos/límites definidos, importes/contadores como enteros con unidad, prohibición de representaciones ambiguas y campos críticos desconocidos. Implementación y vectores compartidos; no criptografía propia.

### Custodia

1. Rol de escritura de evidencia no propietario: append mediante operación limitada; sin UPDATE/DELETE/TRUNCATE/DDL sobre las tablas de evidencia ni acceso al rol administrativo. La operación interna puede avanzar la cabeza bajo permisos acotados; no expone edición libre de historia. Esto no prohíbe las transiciones controladas de estado/reservas de la autoridad. Migraciones por ceremonia de mantenimiento, no por el worker.
2. Secuencia/cabeza por stream actualizada atómicamente para no bifurcar con escritores concurrentes. No una cadena global que serialice toda telemetría.
3. Firmas/certificados de servicio separados de la firma humana; ésta no se reutiliza para cada línea de log.
4. Checkpoints de cabeza confirmados por custodio/réplica con permisos distintos y detección de divergencia; sin ese anclaje, borrar el sufijo puede pasar inadvertido.
5. Réplica no es WORM: permisos administrativos distintos, retención y verificación periódica de restauración. Si se exige resistencia a administradores, el perfil requiere almacenamiento con retención bloqueada o testigo realmente independiente, comprobados antes de anunciar esa garantía.
6. Pérdida de historia/cabeza, restauración atrasada o divergencia: cuarentena de autoridad hasta conciliar; no regenerar una cadena «válida» silenciosamente y continuar gastando nonces.
7. C28 exige contrafirma institucional: un evento pendiente de contrafirma no se presenta como finalizado institucionalmente. Si una acción exige finalización previa de ese hecho, no se ejecuta hasta obtenerla. No sustituir UCO por un segundo método del mismo worker.

**Garantía base propuesta:** inmutabilidad frente al agente sin privilegios y modificaciones ordinarias de aplicación, más detección y custodia explícitas. **No:** WORM absoluto frente a administrador/root. El nivel adicional de custodia es obligatorio para afirmar esa garantía más fuerte, no una frase de marketing.

Nunca loguear tokens de canje, claves, cabeceras de autorización, cuerpos íntegros de prompts o archivos sensibles. Hash de dato personal no se considera anonimización. Exportación y consulta también tienen ACL y retención.

## 14. Atomicidad, efectos externos y recuperación

### Dentro del dominio transaccional

En una transacción local: identidad operativa/epoch válidos, paso permitido, consumo único, reserva, intención/recibo y outbox. Si falla, no despachar. Usar transiciones/constraints y bloqueo/isolation correctos para el agregado; serializable donde sea necesario, con reintento completo y acotado de la transacción. No poner toda la actividad del sistema bajo un lock global.

El outbox evita que una publicación caída haga desaparecer un hecho ya confirmado. Exportador con entrega al menos una vez y deduplicación por ID/digest; consumidores mantienen cursor y versiones, no obedecen un evento como permiso ejecutable.

### Fuera de la transacción

No hay ACID entre PostgreSQL y un email, pago, API o proceso externo. Protocolo de operación:

`PREPARED → DISPATCHED → SUCCEEDED | FAILED | UNKNOWN`.

PREPARED duradero ya consume/reserva la capacidad; no es autorización para que dos workers despachen. Un único ejecutor/lease con fencing por operación; lease vencido no libera por sí solo permiso para repetir un efecto posiblemente enviado. Cuando el recurso externo no entiende fencing, un contador local no puede detener por magia a un ejecutor antiguo: no hay takeover/reenvío hasta probar su terminación y conciliar el efecto, o se mantiene UNKNOWN.

- Si el recurso admite idempotency key, usar el ID de operación y verificar su contrato/retención.
- Si se conoce el efecto por consulta segura, conciliar y vincular evidencia.
- Si no se puede saber, mantener UNKNOWN y detener la rama; no afirmar éxito, no reembolsar presupuesto como si nada hubiera pasado ni reintentar automáticamente.
- Compensación solo si está autorizada y es semánticamente válida. No existe rollback universal de efectos reales.
- Cancelación best-effort no demuestra que el efecto no ocurrió.

Backups cifrados, WAL/recuperación cuando proceda y restore ensayado. Antes de reactivar autoridad tras restore: comprobar cabeza anclada, nonces/operaciones inciertas, epochs y claves revocadas. Invalidar sesiones y tickets previos mediante un nuevo epoch de recuperación verificado fuera del estado restaurado; no regenerar los permisos desaparecidos del backup. Si no puede probarse un punto seguro, mantener cuarentena. El operador no puede confiar en «la DB abre» como prueba suficiente.

## 15. Política de fallos

| Falta/fallo | Comportamiento |
|---|---|
| Exportación de métricas/trazas o panel caído | Continuar funciones no dependientes; buffers limitados y pérdida visible. Registry sigue arrancando. |
| Memoria no disponible | Sesión sin recuperación, explícitamente, si la misión lo permite; no inventar recuerdo. |
| Contexto/tokenizador exacto no disponible | Estimación conservadora etiquetada; reducir contexto. No alterar misión/restricciones ni fingir medida exacta. |
| Registry online caído | Bootstrap/resolución desde fuente local válida; no crear identidades/concesiones nuevas ni usar permisos mutables que exijan frescura online. |
| Firma, identidad o permiso inválidos/expirados | Denegar; no pedir a otro agente que lo haga por otra vía. |
| AuthorityStore / evidencia preefecto requerida indisponible | No nuevos despachos sujetos a ese control; conservar estado y comunicar bloqueo. |
| Verificador requerido no disponible | No entregar estado verificado; dejar inconcluso/bloqueado según perfil. |
| Canal del sandbox sin cobertura | No habilitar esa clase de efecto en perfil gobernado; no degradar a ejecución nativa libre. |
| Respuesta del proveedor incierta | Conciliar; retry solo con semántica segura. |
| Una clave del pool You.com no disponible | Error explícito; no sustituir por OAuth, otra clave o acceso anónimo. |
| Custodio/countersigner institucional requerido caído | No finalizar el hecho ni ejecutar lo que dependa de su finalización. No confundirlo con telemetría opcional. |
| Controller caído / epoch no verificable | Workers no heredan sus herramientas/secretos; se detienen nuevos efectos del ámbito gobernado. |
| Evidencia manipulada o restauración atrasada | Cuarentena y reconciliación; nunca reset automático a vacío. |

No se impone que cada componente caído bloquee cualquier pensamiento, lectura permitida o consulta histórica. El bloqueo corresponde a las garantías de la operación concreta.

## 16. Optimización y criterios medibles

No declarar «óptima» una arquitectura sin workload. Optimización propuesta: sacar LLMs y servicios innecesarios del camino frecuente, hacer baratos los controles obligatorios, evitar duplicación de estado y preservar las garantías.

### Camino rápido

- Policy/catalog bundle inmutable prevalidado y cargado; sin parsear corpus ni llamar a un LLM por operación.
- Baseline permitido y lecturas locales según perfil, sin nueva firma por cada lectura.
- Canje de efecto con una transacción acotada; no consulta a todos los productos ni a todos los nodos.
- Credencial resuelta por handle, transporte streaming sin buffering de transcript completo ni reoptimización por token.
- Memoria recupera top-k acotado; embeddings/reranking opcionales solo si mejoran el resultado medido.
- Verificación barata primero; profundo/semántico por perfil y por cambio, cacheable por digest+perfil+versión cuando la frescura lo permita.
- Tareas independientes en paralelo solo si el procedimiento lo autoriza y no comparten presupuesto/efecto sin reserva.

### Presupuestos iniciales de aceptación — objetivos, no resultados

- Medir p50/p95/p99 del **overhead añadido** de normalización/política, canje duradero, IPC, recuperación de memoria y arranque por separado; distinguir frío/caliente y cola.
- Objetivo inicial local: p95 de evaluación pura ≤5 ms y p95 de admisión/canje con commit ≤50 ms en la máquina objetivo bajo una carga declarada. Si el backend no llega, revisar batches, consultas y límites; no quitar durabilidad o permisos. No se incluyen firma humana, inferencia, VM cold start ni API externa en esas cifras.
- Buffers, candidatos, concurrencia, tamaño de mensaje, CPU/RAM/tiempo de jobs y llamadas semánticas con límites explícitos en el perfil. Los valores se fijan con el censo/benchmark, no copiando cifras genéricas.
- Economía: coste y tokens de **misión completada y verificada**, incluyendo errores, reintentos, revisores y subagentes. Comparación pareada con baseline, sin selección de ejemplos favorables.
- Calidad: tasa de misión completada, llamadas de herramientas correctas, relevancia/fidelidad de recuperación, cobertura real y recuperación después de fallo. No optimizar solo tokens ahorrados.
- Para afirmar mejora: protocolo, workload, baseline y umbral fijados antes de medir; evidencia de no regresión y distribución/intervalo según métrica. Si hay empate, elegir la implementación más sencilla. Mantener la lección de G4.

Nada aquí autoriza un soak ni sustituye las decisiones de aceptación del router.

## 17. Adopción ordenada — sin big bang

| Fase | Cambio propuesto | Puerta de salida / evidencia | Reversión |
|---|---|---|---|
| A0 — mapa de encaje | Fijar versiones, propietarios, consumidores y contratos reales; reconciliar referencias NESS→PROXY y CORE→Contratos | Matriz diseño/código/entrypoint/efecto; diferencias respecto a canon enumeradas. No asumir infraestructura disponible. | Solo documentos; ningún producto afectado. |
| A1 — primera sección vertical de autoridad | Misión firmada sobre una tarea de catálogo estrecha en Pi SDK controlado; canje, efecto acotado y recibo | Firma inválida, objetivo cambiado, tarea fuera de catálogo, sujeto/destino equivocados, replay/concurrencia, caída e intento alternativo denegados; caso válido produce evidencia real. | Deshabilitar el nuevo launcher sin convertir su fallo en permiso; extensión actual conserva su perfil anterior declarado. |
| A2 — endurecimiento y recuperación | Permisos físicos, sandbox, custodia, revocación y restore | Recorridos adversariales por shell/MCP/codemode/subagentes/red/FS; evidencia de UNKNOWN sin doble efecto; cabeza truncada y backup atrasado bloquean. | Detener perfil gobernado, no abrir fallback. Conservar historia. |
| A3 — segundo runtime | Integrar otro agente realmente disponible, elegido por punto de control y trabajo real, no por nombre de mercado | Mismas fixtures/negativos y misión equivalente; cobertura por versión; cero política copiada al adapter. | Retirar ese adapter; contratos y primer runtime no cambian. |
| A4 — capacidades de contexto e inferencia | Desacoplar composición de memoria; puertos de tokens/provenance; routing con dueño único | Instalación limpia aislada, resolución sin deep imports, comparación pareada de calidad/coste; cuotas concurrentes correctas; no promoción de shadow sin oracle. | Volver a composición anterior por capacidad; no rollback de decisiones de autoridad ya comprometidas. |
| A5 — territorial | Destinos registrados, autenticación, fencing, réplica institucional y telemetría | Partición/reconexión/revocación, no doble canje, divergencias visibles, bootstrap sin telemetry, restore coherente. | Suspender destinos remotos; dominio local conserva ámbito y evidencia. |

A1 precede a una extracción masiva: valida la tesis más importante, no un framework vacío. A3 evita declarar universalidad sobre un único SDK. A4 no significa que la memoria actual deba dejar de funcionar hasta entonces; significa que su reorganización se hace después de fijar las fronteras.

No se versiona una nueva suite del router sin resolver E-020. Para cada repositorio, seguir sus reglas de cambio y verificación; pruebas locales del router permanecerían bajo su raíz y sin llamadas reales a proveedores salvo autorización específica. El plan no ejecuta ninguna de estas fases.

## 18. Revisión adversarial de la propuesta — realizada por el mismo asistente

No es una auditoría independiente ni una ejecución real de Dementor. Son objeciones de diseño para impedir conclusiones complacientes.

| Objeción | Respuesta / deuda explícita |
|---|---|
| «El controlador es otro dios central y single point» | Tiene autoridad de ejecución acotada, no memoria/catalogado/legislación/conocimiento. Es punto de disponibilidad deliberado del ámbito gobernado. Mantenerlo pequeño y separado; no introducir HA antes de validar recuperación local. |
| «Socket local + otro usuario no garantiza identidad ni bloqueo de red» | Correcto. Se exige autenticación de sesión, backend físico y prueba por canal. No se habilita cobertura fuerte por un diagrama. |
| «Firmar una misión amplia vuelve a ser cheque en blanco» | Tareas tipadas, límites/objetivo firmados, excepción de comando libre diferenciada y ámbito de delegación cerrado. El catálogo sigue siendo el riesgo humano principal. |
| «Un hash de script no congela imports, binarios o entorno» | Correcto. Vincular inputs/entorno y ejecutar vista sellada con permisos mínimos; no usar solo `sha256(script.py)` como protección TOCTOU. |
| «La VM consume RAM y perjudica modelos locales» | Coste real no medido. Compartir backend de ejecución durante trabajos, usarlo para cargas que lo requieren y medir. No prometer equivalente nativo de aislamiento sin pruebas. |
| «Postgres obligatorio rompe standalone» | Obligatorio para el perfil de autoridad recomendado, no para cada capacidad. Registry conserva bootstrap sin DB, y la memoria/router local no lo necesitan por esta propuesta. |
| «DSSE y CBOR añaden formatos» | Resuelven dos problemas diferentes: autorización JSON C30 con dominio de firma; evidencia no JSON determinista. Mantener pocas librerías contrastadas y fixtures. No usarlos como excusa para recodificar todos los productos. |
| «Revocación instantánea global sin coordinación es imposible» | No se promete: autoridad única por misión, epochs/fencing, confirmación y no nuevos despachos offline que requieran frescura. Los efectos ya enviados se concilian. |
| «La firma humana puede ser auténtica sobre un resumen engañoso» | UI confiable derivada del objeto exacto y revisión de deltas/efectos acumulados; hardware no resuelve por sí solo la intención del firmante. |
| «CBOR + DB append-only sigue sin ser WORM contra administrador» | Correcto. El perfil básico no lo afirma; para ese adversario hace falta custodia independiente/retención bloqueada y prueba correspondiente. |
| «Más verificadores pueden encarecer y no aportar independencia» | Perfiles, evidencia, presupuesto, inputs aislados y diversidad real cuando se exige. No contar pasadas del mismo asistente como especialistas distintos. |
| «No has demostrado que el código actual pueda empaquetarse así» | Correcto. El destino es una propuesta. Los problemas de imports, firmas, atomicidad y cableado están localizados; A0–A4 exigen demostrar la migración y no ocultarlos con interfaces nuevas. |

## 19. Alternativas descartadas para el destino inicial

- **Todo dentro de cada extensión:** autonomía aparente a costa de autoridades/quotas/políticas divergentes; no resuelve custodia.
- **Todo en un gran core obligatorio:** viola responsabilidades y arranque/standalone, aumenta blast radius y dificulta adopción gradual.
- **Microservicios por capacidad + bus distribuido desde el principio:** más operaciones/credenciales/fallos antes de demostrar el primer recorrido. No hay beneficio acreditado que compense.
- **Solo schemas y reimplementar en cada lenguaje:** comparte nombres pero no comportamientos; usar CLI/API o bindings cuando aportan reutilización real.
- **MCP como única muralla:** deja fuera herramientas nativas, subprocesses y red. MCP es una interfaz, no un sistema operativo de seguridad.
- **Nuevo framework universal de planificación:** duplica runtimes y procedimientos sin probar mejora. El agente planifica; FSM y autoridad constriñen el efecto.
- **Blockchain distribuida pública / Rekor público para todo:** innecesaria para el primer dominio, expone metadatos y no sustituye autorización. Se mantiene el libro permisionado C28 en su alcance.
- **Cambiar todos los backends a SQLite:** contradice CORE y no satisface logs sin JSON ni custodia por sí mismo.
- **Adoptar OPA/Cedar/Temporal/SPIRE/Kubernetes por etiqueta SOTA:** cada dependencia debe resolver un requisito no cubierto y justificar coste. Esta propuesta no los instala ni los hace requisito inicial.

## 20. Ratificaciones y límites pendientes

No corresponde pedir ratificar de nuevo, como si fueran aportaciones nuevas, la distribución de responsabilidades, el controlador externo, los tickets opacos o la cobertura explícita que ya aparecen en el diseño previo. Este documento los consolida. Concreciones potencialmente nuevas son el perfil JCS/DSSE de misión, el perfil CBOR de evidencia, el despliegue específico de AuthorityStore y ciertos detalles de recuperación/medición; algunas desarrollan decisiones anteriores. **No hay comparación ejecutada que demuestre que esas opciones mejoren la solución existente ni que justifique sustituir formatos o componentes actuales.** Deben evaluarse como deltas concretos, no ratificarse como un rediseño global.

No se presenta como resuelto: hardware real de firma, ubicación de la instancia dedicada, recursos libres, mecanismo concreto de autenticación/sandbox de cada host, estado actual de todos los entrypoints de PROXY/CORE, aprobación de patrones amplios sin misión concreta, contrafirma/custodia institucional efectivamente disponible o detalles internos del gobierno. Es trabajo de A0 y decisiones puntuales cuando la investigación no las cierre. No se delega al usuario un censo que pueda ejecutarse con autorización; tampoco se inspeccionan servicios/credenciales o se despliega infraestructura bajo pretexto de proponer.

**Veredicto de diseño:** recomiendo esta arquitectura por combinar reutilización y autonomía con autoridad verificable y un coste operacional inicial contenido. **Veredicto de producto:** no lista para declarar las garantías hasta superar sus puertas. Ningún benchmark, implementación o ratificación se da por realizado por escribir este documento.
