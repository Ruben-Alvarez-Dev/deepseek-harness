# HANDOFF — Auditoría y diseño de anillos del agente Pi

**Vigente desde:** 2026-10-25 ~10:25 · sesión QWEN-code-32 · **Regla de la casa:** una sola sección actual; lo antiguo se reemplaza, no se apila.
**Fase:** análisis **CERRADO** (diagnóstico + demos + 4 especialistas + 2 colofones adversariales integrados). Lo único que queda es decisión e implementación del usuario.

## Estado al handoff

**Cerrado y en disco (todo dentro de `auditoria-pi-agent/`, nada fuera):**
- Diagnóstico: `00-ALCANCE-Y-METODO.md`, `A1-config-viva.md`, `A2-repo-implementado.md`, `A3-planificado-no-implementado.md`, `MATRIZ-GAPS.md`, `INFORME-AUDITORIA-PI-AGENT.md`.
- Evidencia empírica: `demo/` — D2 (Pi 1.4.0 real, pi-memory con `-e`, canario ZULU-42; volatilidad = `openDb(":memory:")` sin `PI_CORE_DB`) y D1 (driver 9/9, canario KILO-7, persistencia SQLite probada).
- Especialistas: `S1` (arquitectura), `S2` (runtime), `S3` (AI/ML, 567 l.), `S4` (seguridad).
- Colofones: `COLOFON-ADVERSARIAL-1.md` (AD1: el diseño aguanta como diagnóstico, no como base de implementación; 7 correcciones) y `COLOFON-ADVERSARIAL-2.md` (AD2: de la Fase 1 del port solo sobrevive A1; A2 con signo de ahorro invertido; B1/B2 no alcanzan su slot y son RL-5; C1 es escribir un servidor, no un port).
- `DISENO-EXTRACCION-ANILLOS-PI.md` **v5 final**: emplazamiento único de memoria (álgebra pura anillo-0 sin estado; proceso dueño del almacén = servicio anillo-1; proveedores anillo-2; evidencia transversal), gates como paso 1, inventario de 11 escritores, secuencia reordenada 0–9, lint de grafo transitivo, olvido corregido antes de portar, «viable sin reescribir la lógica de dominio» con 8 puertos + 16 adaptaciones presupuestados como escritura.
- `DISENO-ADAPTACION-QWEN-CODE.md` **v2 final**: Fase 1 = A1 (harness nDCG/recall@k) + B5 como regla (con verificación previa del punto de inyección) + B3 (`PreCompact`) + ajuste del truncado nativo por config + 2 cambios de core (ledger de evidencia, atribución por capa en `/context detail`); A2/B1/B2/C1 retirados o reformulados; colisiones con `PROPUESTA-CONFIG-SOTA.md` declaradas (`updatedInput` en PreToolUse paralelos, Stop hook vs reescritura, slot de memoria único = ENGRAM).

**Nada en vuelo.** No hay agentes corriendo al cierre.

## Siguiente secuencia (requiere al usuario)

1. Presentar veredicto final + decisiones pendientes (abajo). El usuario decide qué se implementa y en qué orden.
2. Implementar **solo tras aprobación explícita**, en este orden: seguridad P1–P9 y cableado de gates (paso 1 de la secuencia v4/v5) → M21 (git de pi-arnes) → D02 → consumidores de intermediate/memory → restaurar tests (526 borradas en E-020) → expediente E-031…E-046 y HANDOFF mentirosos de la casa → spec de anillos como change OpenSpec (primera acción de diseño: persistir la intención del dueño) → extracción pasos 0–9 → port Qwen (A1 → verificación B5 → B3 → truncado nativo → cambios de core → fases 2-3 solo con medición).
3. `PROPUESTA-CONFIG-SOTA.md` sigue pausada hasta que el usuario la retome; P1.4 de la adaptación sustituiría sus claves `truncateToolOutput*` y la regla de no-reescritura convive con su hook `Stop`.

## Decisiones pendientes del usuario (bloquean implementación, no análisis)

Rotar clave `omniroute` de `models.json:147` y purgar sus 3 `.bak` · permisos/retención de 129 sesiones (214 MB, 0644, con `Bearer`/`ghp_`/`sk-ant`/`-----BEGIN`) · `~/.pi/secrets/vault/server.log` (0644, creciendo) · symlink colgante `extensions/capabilities-footer → /Users/ruben/Code/FLYBOX/src` · aprobar la spec de anillos como change OpenSpec · aprobar cableado de gates en `~/.pi/agent/settings.json` y remediación de permisos P1–P6 · aprobar qué piezas del port Qwen se implementan (A1 primero) · resolver si el olvido de Pi se corrige (threshold/`<=`/ponderación) antes de cualquier port de memoria.

## Restricciones permanentes

Todo el material vive en este subfolder y en ningún otro sitio. Sobre `~/.pi` y `/Users/ruben/Code/PI-agent`: solo lectura estricta; **nunca volcar valores de credenciales** (incidente A1: valor de `models.json:147` volcado a su transcripción interna, `[REDACTADO]` en el anexo; rotar igualmente). El repo PI-agent conserva exactamente los 8 dirty del manifiesto. Canarios: `ZULU-42` (D2), `KILO-7` (D1). Hechos duros: Pi 1.4.0 en `/opt/homebrew/bin/pi`; config viva carga solo `pi-account-router` + `pi-mcp-adapter` (gates inactivos, S4-T1 BLOCKER); `pi-memory` no cargable como paquete (vía real `-e src/extension.ts` + `PI_CORE_DB`); roadmap de anillos no persistido en disco; INV-10 prohíbe kernel nuevo.
