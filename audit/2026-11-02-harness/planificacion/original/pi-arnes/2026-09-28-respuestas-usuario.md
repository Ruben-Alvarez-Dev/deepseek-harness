# Respuestas de usuario — M01/M03/M05 y estado M04 — 2026-09-28

**Fuente:** sesión team-dev (opencode), 2026-09-28. Registro fiel de lo respondido; nada inventado.
**Estado:** M01 recibido (matriz v0.1 abajo) · M02 diferido por el usuario · M03 recibido · M04 cumplido en la parte local (infraestructura remota fuera del alcance del equipo) · M05 reformulación positiva pendiente de redacción final · M06 en preparación.

## M01 — Destinatarios y finalidad

> "Solo yo / archivo privado, Abogados y peritos, Juzgados y TEDH, Médicos y especialistas, las copias censuradas ya veré yo qué hago con ellas primero hay que explicar el caso y los procesos relacionados y encajar todas las piezas en en timeline y coordinar toda la historia alrededor."

Lectura (sin categorías inventadas):
- Destinatarios posibles, todos abiertos: uso privado, abogados/peritos, juzgados/TEDH, médicos/especialistas. Sin plan de difusión definido ("ya veré qué hago").
- **Primera necesidad declarada: comprensión del caso** — explicar, timeline de procesos, encajar piezas y coordinar la historia — antes que censura/exportación.

Matriz v0.1 (borrador; sensibilidad y revisión por confirmar):

| Audiencia | Uso previsto | Sensibilidad | Revisión/aprobación |
|---|---|---|---|
| El usuario | Comprensión, estrategia, gestión | Alta | — |
| Abogados / peritos | Instrucción y pericial | Alta | Usuario (censura 1-a-1) |
| Juzgados / TEDH | Procesal | Crítica | Usuario (export) |
| Médicos / especialistas | Consulta clínica | Crítica | Usuario (export) |
| Difusión | No decidido | — | Usuario |

## M03 — Modos y autoridad

- Censura: "doy la pauta, se censura y yo lo valido, uno a uno" → política del usuario + validación individual por censura.
- Exportación: "yo" → única autoridad de aprobación.
- Fase operativa inicial: lectura/comprensión; sin exportación.

## M05 — Objetivo (reformulación del usuario)

> "el objetivo es hacer el arnés de manera precisa y justa, que sirva de soporte agentico legal, medico, documental, determinista, optimo en entendimiento trazabilidad, estrategias y gestión documental, procesal, médica y asistencial en mi caso"

Lectura: objetivos positivos = precisión y justicia; soporte agéntico legal/médico/documental; determinista; óptimo en entendimiento + trazabilidad + estrategias + gestión. Las barandillas de seguridad (no diagnóstico/tratamiento autónomo, no representación legal, derivados sin garantía de validez probatoria, sin promesa de anonimato absoluto) se mantienen como límites de responsabilidad — redacción final para validación (M05 → G0).

## Otros datos aportados

- **Uso previsto:** personal, asistiendo procesos médico-legales complejos e importantes (licencias: revisar igualmente; impacto AGPL/comercial de PyMuPDF pendiente de M28).
- **Idiomas:** español, eslovaco, inglés → ensayos OCR multiidioma obligatorios en fixtures.
- **Volumen:** más de 400 documentos ya; creciendo. Enfoque: inventario y ingesta por lotes con reanudación.
- **Equipos:** equipo principal = MacBook (esta máquina, `jart-os-workstation`); Mac mini = `local-server`; `remote-server-1/2` en VPN Jart-OS. La infraestructura es dominio del usuario: el equipo la asume como dada y no la gestiona.
- **Plazo:** sin dato.

## M04 — Inventario local (MacBook, ejecutado 2026-09-28)

- Modelo: **MacBook Pro 18,2 — Apple M1 Max (10 núcleos), 32 GB RAM**, macOS 27.2.
- VPN Jart-OS visible desde esta máquina: `jart-os-workstation` (esta), `local-server`, `remote-server-1/2`, `jesus-pc`, `mobile-1`, `tablet-1/2`. (Inventario informativo; la infraestructura no es objeto de trabajo del equipo.)

## Alcance del proyecto (corrección del usuario, 2026-09-28)

> "solo la creación del arnés, los agentes, las skills, mcps, estructuras, gestión documental, procesal, médica y asistencial de todo mi caso"

Entregable del equipo — sistema completo del caso:
1. **Arnés Pi** — perfil, lanzador, topología funcional, aislamiento.
2. **Agentes** — perfiles de trabajo (coordinador, documentalista, procesal ES/SK/TEDH, médico + psiquiatría/SDRC, asistencial, verificador, investigador).
3. **Skills** — canónicas en `~/.agents/skills`, sin duplicar; candidatas a diseñar y verificar.
4. **MCPs** — superficie estrecha y auditada; el núcleo documental como servidor MCP local.
5. **Estructuras** — modelo de caso, registros canónicos, timeline, taxonomía documental, trazabilidad.
6. **Gestión documental, procesal, médica y asistencial** de todo el caso.

**Fuera del alcance del equipo:** red, VPN, discos, aprovisionamiento y mantenimiento de máquinas (dominio del usuario).

## Decisiones abiertas

1. Dirección arquitectónica (M06 → G0).
2. Validación de la matriz M01 y de la redacción M05 (paquete G0).
3. M02 (geografía y fechas) cuando el usuario decida.
