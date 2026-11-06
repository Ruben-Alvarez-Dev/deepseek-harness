# Esquema visual — arquitectura propuesta

Estado: esquema de destino ya presente esencialmente en los diseños anteriores; no arquitectura nueva ni instalación certificada. Para ver **qué cambia de verdad**, leer [08-delta-recomendado.md](08-delta-recomendado.md) y su comparación con código. Simplifica [05-arquitectura-propuesta.md](05-arquitectura-propuesta.md). [Índice](00-indice.md).

## 1. Cómo funciona el modo gobernado

```text
          MEMORIA + CANON + ECONOMÍA DE TOKENS
                       │
                aportan contexto
                       ▼
              ┌─────────────────┐
              │     AGENTE      │
              │ Pi / otro motor │
              │ piensa y propone│
              └────────┬────────┘
                       │ solicita una acción
                       ▼
  TÚ              ┌──────────────────────┐           CORE
  firmas misión ─►│     CONTROLADOR      │◄─ catálogo e identidad
                  │                      │
                  │ Contratos: permiso   │
                  │ PROXY: reglas/gates  │
                  │ Ejecutor: efecto     │
                  └──────────┬───────────┘
                             │ solo lo autorizado
                             ▼
                  ┌──────────────────────┐
                  │ ARCHIVOS / PROCESOS   │
                  │ MCP / APIs / MODELOS  │
                  └──────────┬───────────┘
                             │ resultado
                             ▼
                  ┌──────────────────────┐
                  │     VERIFICACIÓN     │
                  │ según tipo de tarea  │
                  │ FACTORY/anillos/otros│
                  └──────────┬───────────┘
                             ▼
                    RECIBO + EVIDENCIA
```

**El agente propone; el controlador permite y ejecuta; el verificador comprueba.**

Para inferencia, la salida controlada incorpora PROXY, routing de cuentas/cuotas y uso de credenciales sin entregar las claves al agente. FACTORY produce/verifica artefactos mediante su CLI; no interviene obligatoriamente en cada llamada. Dementor entra cuando el perfil de verificación lo exige.

Las flechas son flujo lógico, no un proceso nuevo por caja. La evidencia operativa y el libro institucional siguen separados; métricas/diagnóstico van a CORE telemetry por otro circuito.

## 2. Qué vive separado

```text
       LADO DEL AGENTE          LADO DE CONFIANZA

      ┌──────────────┐          ┌───────────────────┐
      │ Pi/otro motor│          │ Controlador       │
      │ + adaptador  │◄────────►│ + módulos comunes │
      └──────────────┘    ║     └─────────┬─────────┘
                          ║               │
                   separación de         ▼
                   permisos/custodia   PostgreSQL
                                       de autoridad
```

Separación de permisos, código desplegado y secretos; no necesariamente máquinas distintas. El backend de sandbox/VM se añade donde el efecto lo requiera. El controlador puede ser **un proceso modular**, no un servicio por responsabilidad. CORE conserva su arranque independiente; la DB de autoridad no es la DB de todo el ecosistema.

## 3. No hace falta instalarlo todo

```text
SOLO MEMORIA:       agente + motor de memoria + adaptador

SOLO ROUTING:       agente + motor del router + adaptador

MODO GOBERNADO:     agente + adaptador + controlador de confianza
                                      + almacén de autoridad
                                      + aislamiento requerido
```

Standalone conserva autonomía, pero no promete controles externos que no tiene. Si se activa el modo gobernado, perder el controlador no habilita una salida libre por herramientas alternativas.
