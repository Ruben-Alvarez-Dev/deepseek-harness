# INFORME DE AUDITORÍA — Agente Pi (configuración viva, casa/harness y planificación)

**Encargo:** Ruben · **Auditor principal:** Qwen Code 0.26.1 (sesión QWEN-code-32) · **Fecha:** 2026-10-25
**Equipo:** 3 auditores de sólo lectura (A1 config viva, A2 repo, A3 planificación) + demo supervisada D2 por el auditor principal + panel multidisciplinar S1–S4 (en curso, fase de diseño de anillos, fuera del alcance de este informe).
**Anexos:** `00-ALCANCE-Y-METODO.md` (manifiesto de integridad), `A1-config-viva.md` (686 l.), `A2-repo-implementado.md` (393 l.), `A3-planificado-no-implementado.md` (424 l.), `MATRIZ-GAPS.md` (312 l.), `demo/VEREDICTO-DEMO-D2.md` + capturas JSON.
**Veredicto en una línea:** Pi es un sistema **excepcionalmente bien documentado y con norma real** (OpenSpec, CONVENTIONS, gates, expediente), pero con una **brecha de ejecución severa** (72 % del código sin consumidor, 72 % del plan sin empezar, expediente y HANDOFF mentirosos) y una **higiene de secretos viva en fallo** (clave en claro, 214 MB de transcripciones 0644 con credenciales, log de vault 0644 creciendo); la demo real prueba que la memoria **funciona cuando se cablea**, y que hoy simplemente **no está cableada**.

---

## 1 · Alcance y método

Objetos: O1 configuración viva `~/.pi/**`; O2 repo casa `/Users/ruben/Code/PI-agent` @ `7b0e0b38` (8 dirty congelados en el manifiesto); O3 planificación `/Users/ruben/Code/pi-arnes-documental-privado` (sin git); O4 changes/handoff de la casa; O5 cartel `pi-harness/MOVIDO-AQUI.md`. Excluido `PHI-agent` (otro agente). Correcciones de alcance aplicadas en `00` tras A3: `DOCS-HARNESS/D-revision/` no existe en disco (purgado E-022) y los destinos del cartel O5 fueron purgados (E-018/E-022/E-024).
Método: inventario forense con `stat` individual, lectura completa de lo no sensible, estructura-only de lo sensible, demo real supervisada con canario y escaneo de mutaciones, y regla de evidencia `[V]` medido / `[A]` reportado con `ruta:línea`.

## 2 · Configuración viva (A1) — 207 ficheros, 77 dirs, 307 MB

Lo bueno [V]: secretos principales en 0600 (`auth.json`, `models.json`, `account-router*.json`), `account-router-state/` en 0700, pool You.com en credential store del SO según política declarada.
Lo severo:

| # | Hallazgo | Severidad | Evidencia |
|---|---|---|---|
| S-1 | **Clave API literal en claro** (`omniroute`) en `models.json:147`, pese a que el mismo fichero usa Keychain (`:15`) e indirección (`:4`); replicada en 3 `.bak` | **ALTA** | A1 H-1; rotación recomendada |
| S-2 | `~/.pi/secrets/vault/server.log`: 5,19 MB en **0644**, abierto por el proceso vault (PID 667), **creció 6.300 B durante la auditoría**; único fichero de `secrets/`, protegido sólo por el 0744 accidental del directorio | **ALTA** | A1 H-2 |
| S-3 | **129 transcripciones de sesión (214 MB) en 0644 con material de credencial**: 54 con `Bearer `, 14 con `ghp_`, 11 con `sk-ant`, 11 con `-----BEGIN`; contradice `AGENTS.md:4` | **ALTA** | A1 H-3 |
| S-4 | `extensions/capabilities-footer`: symlink **colgante**; es la extensión detrás de 3 crashes y su código sólo sobrevive en 6 `.bak` | **ALTA** | A1 H-4 |
| S-5 | Defaults contradictorios entre `settings.json:4-5` y `models.json:185-187` | **MEDIA** | A1 H-5 |

Aviso de integridad [V]: un `grep` de A1 volcó accidentalmente el valor de S-1 a su transcripción interna; el informe A1 lo deja `[REDACTADO]`. **La clave debe rotarse igualmente** (estaba en claro en disco antes de la auditoría).

## 3 · Casa/harness (A2) — qué corre de verdad

- **Solo `pi-account-router` se ejecuta** (cargado desde fuente vía `~/.pi/agent/settings.json → packages`). `pi-intermediate` (3.614 l.) y `pi-memory` (6.489 l.) compilan sin consumidor: **10.103/13.982 líneas (72 %) y 24/27 capacidades** viven en bibliotecas que ningún proceso corre [V].
- Verificación real: `tsc --noEmit` + biome; **0 tests** en intermediate y memory desde que E-020 borró 526; el router conserva 14 `.probe-*.ts` **gitignored** como única evidencia de sus gates G0–G8 [V].
- `openspec validate --all --strict` da **27/27 verde** incluyendo `verification-evaluation`, capacidad **incumplible por construcción** (su componente murió en E-018; 0 apariciones): el gate valida formato, no implementabilidad [A, verificado el salto de componentes].
- Expediente: **E-031…E-046 no existen** (salto E-030→E-047 verificado [V]) con `CONVENTIONS.md:48` declarando «currently: 047»; A3 lo confirma contra 17 revisiones git.
- `HANDOFF.md:35` «Pendiente: Ninguno» [V] con decisiones abiertas y 37 commits de retraso [A]; `router/HANDOFF.md:56` «Cero changes activos» con 2 en el árbol (uno dentro del dirty actual) [V].
- La casa se nombra por un harness que el dueño ordenó destruir (E-018/E-022/E-024, 918 MB) y `README.md:1,4` lo sigue afirmando [V].

## 4 · Planificación (A3) — 212 ítems, 4,2 % cerrados

Distribución [A, verificado el muestreo]: **9 cerrados (4,2 %)**, 7 en curso, **153 sin empezar (72 %)**, 26 bloqueados, 3 purgados, 14 contradichos por el repo.
Los cinco que más pesan:

1. **M21** — crear el repo git de `pi-arnes`: minutos de trabajo que **bloquean 53 de 60 movimientos** del plan.
2. **D02** — ámbito de datos en `pi-memory/src/memory-control.ts:136-138,162-164`: **fuga entre tenants viva en el árbol actual**, con evidencia ejecutada (V02) y sin corregir.
3. **Decisión (a)** — soak G7: única vía para identificar la causa del corte de Agnes («NO identificada»); runner y evidencia retirados.
4. **E-031…E-046** — 16 entradas del expediente nunca escritas, incumpliendo la norma `:13` de la casa.
5. **8 changes OpenSpec + specs ejecutables** de pi-arnes sin `REQ/SCN`: 34 piezas del diseño v0.1 **inverificables**.

Contradicciones plan↔repo [V]: `current_phase: construccion` con 0 código y 0 git; HANDOFF raíz 7 días y 17 entradas más viejo que HEAD; router negando changes presentes; spec exigiendo «AST CodeCompressor» mientras el código dice «el código nunca se comprime». Además: `pi-arnes` y `PI-agent` tienen **cero referencias cruzadas** y 5 solapamientos donde la casa ya implementó lo que pi-arnes planifica como viabilidad pendiente.

## 5 · Demo real supervisada (D2)

- **Baseline** [V]: Pi 1.4.0 con config viva responde correctamente vía `account-router`/`agnes-3.0-flash` (5.049 tokens input).
- **pi-memory cableado con `-e`** [V]: 3 ejecuciones `memory` — save (`persist, admitted`, score 0.753) → search (1 hit semantic) → get (valor exacto); el modelo lo usó bien. Selection Plane de intermediate **registrada** (6 tools) pero **no ejercitada**.
- **Persistencia** [V por ausencia]: el canario `ZULU-42` no aterrizó en ningún almacén de disco; el backend SPI por defecto es efímero. Durabilidad, consolidación, olvido y grafo **sin probar**.
- **Mutaciones** [V]: sólo estado esperado de router/logs; `AGENTS.md` mutado a las 08:55 por sesión Pi concurrente del usuario (externo a la demo); repo intacto (8 dirty).
- **Respuesta a «¿funcionan al 100 %?»:** pi-memory **funciona en proceso y en Pi real** cuando se cablea (D2: save/search/get) y **persiste de verdad** con backend de fichero explícito (D1 T5/T6); no está cableado en la config viva y su backend por defecto es efímero. pi-intermediate **funciona en toda la superficie ejercitada** (D1 9/9: cuotas anti-gaming, router en dos etapas, governor por capa, gate fail-closed, fachada TokenRing/CCR); quedan sin ejercitar PromptFoundry, tiers de gobernanza, sandbox real, grafo/PPR, embeddings y gateway. «Garantía total» no existe; la cobertura acotada y declarada está en `demo/VEREDICTO-DEMO-D1.md` y `demo/VEREDICTO-DEMO-D2.md`.

## 6 · Matriz de brechas consolidada (extracto; completa en `MATRIZ-GAPS.md`)

| Ítem | Estado | Impacto |
|---|---|---|
| Cablear consumidores de intermediate+memory | sin empezar | 72 % del código muerto |
| D02 ámbito de datos (fuga tenants) | sin empezar, fuga viva | seguridad de memoria |
| M21 git de pi-arnes | sin empezar | desbloquea 53 movimientos |
| Restaurar suite de tests (526 borradas) | sin empezar | sin red de regresión |
| Escribir E-031…E-046 | sin empezar | trazabilidad de la casa |
| Corregir HANDOFF raíz y del router | sin empezar | continuaciones sobre premisas falsas |
| Soak G7 / causa corte Agnes | bloqueado | fiabilidad del routing de cuentas |
| Rings 0/1/2 (intención del dueño) | **no especificado en ningún sitio** | requiere change OpenSpec previo |

## 7 · Decisiones que requieren al dueño (por prioridad)

1. **Rotar la clave `omniroute`** de `models.json:147` y purgarla de los 3 `.bak` (S-1).
2. **Restringir y sanear transcripciones**: 214 MB en 0644 con `Bearer`/`ghp_`/`sk-ant`/claves privadas (S-3); decidir retención y permisos 0600.
3. **`server.log` del vault**: 0644 y creciendo bajo proceso vivo (S-2).
4. **Symlink colgante** `capabilities-footer`: restaurar desde `.bak` o eliminar (S-4).
5. **Autorizar la spec de anillos** como change OpenSpec antes de cualquier implementación (no existe en disco).
6. **Orden de implementación** tras esta auditoría: seguridad → M21 → D02 → consumidores → tests → expediente/HANDOFF → anillos.

## 8 · Deuda explícita y límites de esta auditoría

- Sin ejecutar gates ni tests (sólo lectura + demo acotada): la calidad funcional de intermediate/memory más allá de D2 queda sin medir.
- `node_modules` (2.532 ficheros) sin auditar; precedencia real `settings.json`↔`models.json` exige leer fuente de Pi.
- Sesiones de Pi vivas concurrentes durante la auditoría: algunas mutaciones atribuibles sólo por ventana temporal.
- El panel S1–S4 (arquitectura, sistemas, AI/ML, seguridad) y el colofón adversarial siguen en curso: sus veredictos de diseño de anillos y del port a Qwen Code van en entregables separados, no en este informe.
