# Investigación inicial: Agnes AI

Consultado y probado: 2026-10-09 (UTC).

## Resumen

La integración técnica con Pi es viable: existe una API oficial compatible con OpenAI y una prueba real de streaming con tool calling ha funcionado. El reparto proactivo entre pools autorizados es implementable. No está demostrado que acumular cuentas gratuitas para un mismo usuario esté permitido ni que sus cuotas sean independientes.

## Investigación local

- La carpeta del proyecto estaba vacía al comenzar.
- No se encontraron referencias Agnes en la búsqueda inicial de proyectos vecinos, extensiones locales y skills.
- Posteriormente se comprobaron los archivos de configuración de Pi, sin imprimir secretos.
- `~/.pi/agent/models.json` ya registra `agnes-ai`, con API `openai-completions`, base URL `https://apihub.agnes-ai.com/v1` y modelos `agnes-2.5-flash` y `agnes-3.0-flash`.
- `~/.pi/agent/auth.json` contiene una credencial `api_key` para Agnes. No se ha copiado, mostrado ni modificado.
- `~/.pi/agent/settings.json` selecciona `agnes-ai` / `agnes-3.0-flash` por defecto.

## Fuentes oficiales

1. Índice: https://wiki.agnes-ai.com/llms.txt
2. Modelo actual: https://wiki.agnes-ai.com/en/docs/agnes-30-flash
3. Cuotas y pools: https://wiki.agnes-ai.com/en/docs/tokenplan
4. Precios: https://wiki.agnes-ai.com/en/docs/pricing
5. Condiciones: https://wiki.agnes-ai.com/en/docs/terms-of-service
6. Inicio rápido: https://wiki.agnes-ai.com/en/docs/quickstart
7. Repositorio oficial: https://github.com/AgnesAI-Labs/AgnesAI-Models

Se leyeron las versiones Markdown de las fuentes 2–6 directamente desde la wiki. La búsqueda web y la extracción de páginas sirvieron para descubrir y contrastar las fuentes; las tablas completas se verificaron en Markdown, ya que la extracción web omitía algunas tablas.

## Interfaz y capacidades

- Base URL: `https://apihub.agnes-ai.com/v1`.
- Chat: `POST /v1/chat/completions`, autenticación `Authorization: Bearer ...`.
- La wiki también documenta `/v1/responses` y `/v1/messages`; estos endpoints no se probaron.
- `agnes-3.0-flash`: contexto anunciado de 512K y salida máxima de 65.536 tokens; cifras documentadas, no verificadas mediante pruebas de tamaño.
- Chat acepta historial, streaming y herramientas. Es una base adecuada para mantener el contexto en Pi y seleccionar credencial por petición; el cambio entre cuentas aún no se ha probado.
- La wiki anuncia entradas de texto e imágenes por URL; imágenes no probadas.

## Gratuidad y límites

- La página de precios publica actualmente USD 0 para entrada, entrada cacheada y salida de `agnes-2.5-flash` y `agnes-3.0-flash`.
- Esto no convierte todos los modelos Agnes en gratuitos: Pro y Flash Max tienen precios publicados distintos de cero.
- La factura de la cuenta y sus permisos son la fuente de verdad para cargos reales. Las promociones pueden cambiar.
- La wiki anuncia un límite efectivo de texto para usuarios gratuitos de **10 RPM**, con actualización fechada el **23 de septiembre de 2026**.
- El README oficial de julio aún anuncia 20 RPM gratuitos. Para diseño conservador, preferir el aviso posterior de la wiki; no se ha medido el límite real de la cuenta.
- La tabla de la propia wiki mezcla un valor nominal de 30 RPM con 10 efectivos; no utilizar el nominal como capacidad disponible.
- No se encontró una cifra explícita de cuota diaria para texto gratuito en las páginas revisadas. Las cuotas de 5 horas y semanales publicadas son del Token Plan. No extrapolarlas al nivel gratuito ni interpretar ausencia de cifra como uso ilimitado.
- Varias claves del mismo tipo **no** comparten un único pool medido: el 2026-10-10 se observó que una clave rechaza (429) al llegar a ~10 RPM mientras otra clave distinta sigue siendo aceptada de inmediato, y la primera sigue rechazada. Es decir, el límite de RPM gratis se aplica **por clave**, no por usuario. La frase de la wiki "Each API key type uses a separate limit pool" describe tipos de acceso (free/enterprise/TokenPlan), no una cuota única por usuario.
- Consecuencia práctica: la configuración por defecto del router **no** debe agrupar claves distintas en un solo grupo de 10 RPM; cada clave medida merece su propio grupo con su propio límite.
- Un mismo usuario puede disponer de pools separados para tipos free/default, enterprise y Token Plan, según sus derechos.
- Las fuentes revisadas no establecen con suficiente precisión la independencia de **tipos de cuenta**; `N × 10 RPM` como capacidad sostenida es una hipótesis condicionada al número de claves realmente autorizadas, no una promesa del proveedor.

## Condiciones relevantes

Sección 5.4 de los términos:

> Circumventing rate limits, access controls, or other security measures implemented by Agnes AI

Esta conducta está expresamente prohibida. El hecho de respetar cada límite individual no demuestra que crear o acumular cuentas para ampliar la cuota de un mismo usuario esté autorizado. No se encontró autorización expresa de esa práctica en las páginas revisadas.

- Sección 4.1: compartir credenciales se restringe a empleados o contratistas autorizados bajo obligaciones de confidencialidad.
- Sección 8.2: se contempla uso de datos del cliente para mejorar o entrenar modelos salvo opt-out disponible. Revisar antes de enviar código sensible.
- Sección 12.2: el nivel gratuito no tiene SLA.

No confundir un router para pools autorizados con autorización para eludir un límite del proveedor. El núcleo puede ser genérico sin depender de esta práctica.

## Comprobaciones reales

Se realizaron peticiones directas con la configuración local, sin instalar paquetes ni ejecutar código remoto:

1. `GET /v1/models` sin credenciales: HTTP 401.
2. `GET /v1/models` con la credencial existente: HTTP 200; el catálogo incluye `agnes-3.0-flash` y `agnes-2.5-flash`, además de modelos de pago y multimedia. Estar en el catálogo no demuestra permiso de uso de todos ellos.
3. Tras una pausa de 6 segundos, `POST /v1/chat/completions` con `agnes-3.0-flash`, streaming, `max_tokens: 128`, thinking desactivado y una herramienta ficticia `router_probe`:
   - HTTP 200.
   - 7 eventos SSE JSON.
   - `finish_reason: tool_calls`.
   - Nombre y argumentos de herramienta válidos: `router_probe({"value":"ok"})`.
   - Uso reportado: 299 tokens de entrada, 26 de salida, 325 totales.
   - No se ejecutó la herramienta ficticia.

No se modificó configuración global, no se mostraron credenciales y no se comprobó la facturación de la cuenta. No se provocó rate limiting ni se probaron cuotas, dos cuentas distintas, continuaciones después de herramientas, cancelación o reintentos.

## Dirección de diseño

- Extensión de proveedor Pi que seleccione una cuenta antes de cada petición y reutilice el transporte OpenAI compatible cuando proceda.
- Núcleo de planificación independiente de Agnes; credenciales y transporte en adaptadores.
- Representar explícitamente cuentas, credenciales y grupos de cuota compartida: no equiparar una clave con un pool independiente.
- Reparto proactivo por rotación entre pools disponibles, no agotamiento secuencial ni rotación ciega.
- Respetar RPM, cuotas adicionales conocidas, concurrencia, cooldown y `Retry-After`; esperar cuando no haya capacidad.
- Coordinar el consumo si varias sesiones/procesos de Pi utilizan el mismo pool.
- Conservar historial y resultados de herramientas; verificar compatibilidad de contexto y estado antes de cambiar cuentas.
- Evitar reintentos transparentes después de haber emitido respuesta parcial y evitar multiplicar los reintentos del router con los de Pi.
- Modelos de pago excluidos por defecto para el objetivo gratuito.

Este documento registra la investigación inicial, anterior a la implementación. La extensión y su verificación posterior se describen en [verification.md](verification.md). La integración oficial reduce el mantenimiento frente a automatizar sesiones web; el ahorro real depende de demanda, permisos, calidad, latencia y estabilidad. La implementación no demuestra por sí sola rentabilidad ni cuotas independientes entre cuentas Agnes reales.
