# A3 · Lo planificado y aún no implementado — Auditoría del agente Pi

**Anexo:** A3 (planificación + matriz de brechas) · **Auditor:** Qwen Code, agente A3 · **Fecha:** 2026-10-25
**Ámbito:** `/Users/ruben/Code/pi-arnes-documental-privado/` (O3, sin git) y `/Users/ruben/Code/PI-agent/` (O2/O4, solo lectura).
**Reglas:** nada fuera de `auditoria-pi-agent/`; cero mutación de fuentes; ningún valor de credencial reproducido (solo referencias).
**Convención de evidencia:** `[V]` = verificado por este anejo en esta sesión (lectura/grep/git en solo lectura); `[A]` = afirmado por la documentación auditada y no re-ejecutado.

---

## 0 · Veredicto del anejo

**Existen dos universos de planificación que no se conocen entre sí, y en ambos la documentación de estado miente en la misma dirección: declara avance donde hay parálisis o ausencia.**

- **O3 (`pi-arnes-documental-privado`)** es un plan íntegro y de alta calidad formal —60 movimientos seriales, 7 puertas humanas, 8 cambios OpenSpec, un diseño v0.1 detallado— que lleva **27 días congelado en M00** con **cero líneas de código, cero repo git y cero OpenSpec inicializado**, mientras su fichero de estado declara `current_phase: construccion`. Es el caso más grave de divergencia plan↔repo encontrado.
- **O2/O4 (`PI-agent`)** sí tiene código real (99 ficheros `.ts`, ~10 100 LOC entre las tres piezas) y **un solo plan cerrado de los siete auditados** (WP-1…WP-6). El resto del trabajo planificado está bloqueado por **4 decisiones del propietario sin fecha**, **11 intervenciones arquitectónicas no ratificadas** y **16 entradas de expediente que nunca se escribieron**, incumpliendo la norma canónica de la propia casa.
- La fuente `DOCS-HARNESS/D-revision/`, que el alcance de esta auditoría da por existente, **no existe**: fue purgada en E-022 y solo vive en la historia git.

Contabilicé **212 ítems planificados** con estado determinado — **143** en O3 y **69** en O2/O4. Desglose aritmético, estado ítem por ítem y matriz completa en `MATRIZ-GAPS.md`.

---

## 1 · Estado de cada fuente de planificación

### 1.1 `pi-arnes-documental-privado/` — inventario completo

Carpeta **sin git**, **15 ficheros** (excluidos `.DS_Store`), **0 ficheros de código** (`.ts`/`.py`/`.js`) `[V]`. Todos los mtimes son de 2026-09-28 `[V]`.

#### `EXECUTION-STATE.yaml` (2 687 bytes, 2026-09-28T04:42)

Qué ejecución trackea: la construcción del arnés documental privado ALBERTO (harness Pi + agentes + skills + MCPs + estructuras + gestión documental/procesal/médica/asistencial del caso del usuario).

Campos de estado, verbatim `[V]`:

| Campo | Línea | Valor |
|---|---|---|
| `current_phase` | :4 | `construccion` |
| `last_verified_movement` | :5 | `M00` |
| `next_movement` | :6 | `"especificaciones ejecutables + núcleo (datos sintéticos)"` |
| `current_gate` | :7 | `continuous_build` |
| `gate_status` | :8 | `user_delegated_2026-09-28` |
| `spec_status` | :9 | `design_v0_1_written` |
| `openspec_status` | :10 | `not_initialized` |
| `implementation_status` | :11 | `not_started` |
| `real_documents_status` | :12 | `prohibited_until_user_authorizes` |

Decisiones pendientes del usuario (:22-24): `geographic_and_temporal_preservation_policy`, `case_content_and_strategy_decisions_as_they_arise`.

En qué punto quedó: **M00 verificado en lectura** (:16, "60/60 movimientos M00–M59 contiguos; gates G0–G6; sin .git ni openspec/; rename JESUS→ALBERTO completo"). Nota crítica (:21): "el usuario ordena construcción continua sin validaciones intermedias". Nota (:29): "Human gates reduced by user instruction (2026-09-28): only real-document access and export approvals require the user".

#### `PLAN-SERIAL-OPENSPEC.md` (17 045 bytes, 2026-09-28T03:39)

La secuencia planificada, en seis etapas `[V]`:

- **Etapa A** (M00–M07): intención, alcance y puertas de aprobación. Cierra en **G0**.
- **Etapa B** (M08–M20): formalización OpenSpec, "todavía sin código". Cierra en **G3**.
- **Etapa C** (M21–M29): pruebas de viabilidad y perímetro, "solo fixtures sintéticos". Cierra en **G4**.
- **Etapa D** (M30–M43): núcleo documental deterministic-first (14 movimientos, el grueso del producto).
- **Etapa E** (M44–M49): perfiles y modelos como ayudas delimitadas.
- **Etapa F** (M50–M59): adversarial, piloto, publicación controlada. Cierra en **G6**.

Dependencias: el plan es **estrictamente serial** —"Cada fila se ejecuta **solo después** de la anterior salvo las investigaciones de lectura explícitamente marcadas paralelizables" (:5)— y anti-salto: "Si una puerta falla, se vuelve a la fila indicada, se actualizan los artefactos y no se «salta» el error" (:5).

Estados definidos (:8): `PENDIENTE` → `EN CURSO` → `VERIFICADO` o `BLOQUEADO`, con la condición "Un paso `VERIFICADO` exige artefacto, prueba/inspección y revisión registrada; no vale «el modelo dijo que sí»".

Los **8 cambios OpenSpec candidatos** (:12): `bootstrap-private-harness`, `ingest-and-provenance`, `ocr-and-transcription`, `redaction-policy-and-review`, `safe-pdf-and-md-export`, `local-model-adapters`, `legal-medical-profiles`, `security-and-release-gates` — "Los nombres son **candidatos**, se ratifican en M14".

Las **7 puertas que un agente no puede concederse** (:107-117): G0 (diseño arquitectónico), G1 (archivo de spec), G2 (inicializar OpenSpec), G3 (código con fixtures sintéticos), G4 (construcción del núcleo), G5 (primer acceso a expedientes auténticos), G6 (operación habitual y archivo). Todas "Usuario".

#### `HANDOFF.md` (8 483 bytes, 2026-09-28T04:39)

Dónde retomar (:3): "**Estado:** investigación inicial concluida, diseño/implementación **NO aprobados**... **Último movimiento verificado:** M00 (2026-09-28); M01 en curso". Próxima acción autorizada: "cerrar geografía/fechas, modos e inventario y preparar propuesta de diseño para revisión; no instalar pesos, dependencias ni procesar documentos reales".

§3 separa con rigor **Confirmado por usuario** / **Propuesto, NO aprobado** (:29) / **Abierto** (:31, nueve decisiones sin cerrar: destinatarios y finalidad de cada copia, granularidad de revisión, política geografía/fechas, chip exacto del MacBook, volumen/tipos, firma digital, licencias, umbrales de error y accesibilidad, sistema de aislamiento).

§6 protocolo de reanudación de 6 pasos, incluido (:4) "**No ejecutar `openspec init` antes de aprobación del diseño**".

#### `work/2026-09-28-respuestas-usuario.md` (4 900 bytes)

Qué pidió el usuario y qué quedó comprometido `[V]`:

- **Estado por movimiento** (:4): "M01 recibido (matriz v0.1 abajo) · M02 diferido por el usuario · M03 recibido · M04 cumplido en la parte local · M05 reformulación positiva pendiente de redacción final · M06 en preparación".
- **Prioridad declarada por el usuario** (:12-14): "**Primera necesidad declarada: comprensión del caso** — explicar, timeline de procesos, encajar piezas y coordinar la historia — antes que censura/exportación".
- **Objetivo M05 reformulado** (:26): "hacer el arnés de manera precisa y justa, que sirva de soporte agentico legal, medico, documental, determinista, optimo en entendimiento trazabilidad, estrategias y gestión documental, procesal, médica y asistencial en mi caso".
- **Compromiso de alcance** (:52-61), 6 entregables: arnés Pi, agentes, skills, MCPs, estructuras, gestión documental/procesal/médica/asistencial. Fuera de alcance: "red, VPN, discos, aprovisionamiento y mantenimiento de máquinas".
- **Datos duros aportados**: 3 idiomas (español, eslovaco, inglés) → OCR multiidioma obligatorio; **más de 400 documentos ya, creciendo** → ingesta por lotes con reanudación; MacBook Pro 18,2 M1 Max 10 núcleos / 32 GB / macOS 27.2; Mac mini = `local-server`.
- **Plazo** (:42): "**sin dato**".

#### `docs/superpowers/` — 1 pieza

`specs/2026-09-28-alberto-documental-design.md` (140 líneas) — el **diseño v0.1**, salida prevista de M10. Planifica: misión + 4 barandillas (:11-16); flujo de uso en 6 pasos (:20-27); arquitectura de 3 capas "el modelo propone; el núcleo ejecuta y verifica" (:31-48); **7 módulos del núcleo** (:54-62); **9 agentes con su límite explícito** (:62-74); **10 skills** (:76-87); **8 tools MCP** (:89-95); estructuras —9 objetos del caso, máquina de **7 estados**, SQLite+FTS, trazabilidad documento→página→bloque→decisión→exportación (:97-102); privacidad (:106-112); calidad (:114-118); encaje hardware (:120-125); no-objetivos (:127); **5 fases de construcción** (:127-135).

Su propio §10 (:137-140) declara el punto exacto de parada: "Diseño base escrito el 28-09-2026. **Siguiente: especificaciones ejecutables y primeras piezas del núcleo, con material sintético.**" Nada de eso existe `[V]`.

#### `research/ulw/2026-09-28-initial/` — 10 piezas, una línea cada una

| Pieza | Líneas | Qué investiga / planifica |
|---|---|---|
| `BRIEF.md` | 16 | Encargo y 5 ejes de investigación; puerta: no crear código ni instalar modelos antes de diseño aprobado. |
| `wave-1-pi-official.md` | 24 | Pi 0.87.1 oficial: `--tools`/`--offline` no son frontera OS; RPC `bash` elude `tool_call`; extensiones con permisos del proceso. |
| `wave-1-hf-models.md` | 17 | Tabla de 8 candidatos de modelos locales con tamaños y licencias; ninguno seleccionado. |
| `wave-1-document-pipeline.md` | 13 | OCR/PDF: `apply_redactions` puede dejar el objeto imagen original; `incremental=True` incompatible con censura; licencia PyMuPDF pendiente. |
| `wave-2-pi-gates.md` | 12 | Demuestra que un guardia solo en `tool_call` se elude; **casos G01–G12 pendientes de ejecutar**. |
| `wave-2-document-pipeline.md` | 11 | PaddleOCR Apple Silicon validado en M4, **no en M1/M2**; esquema mínimo de procedencia por bloque; fixtures pendientes. |
| `wave-2-local-models.md` | 7 | mlx-vlm expone tools, pero **no demuestra** Qwen3.5+Pi end-to-end; licencias MedGemma/MedPsy/Abogatic pendientes. |
| `SYNTHESIS-PROVISIONAL.md` | 61 | Síntesis provisional: 3 arquitecturas comparadas, flujo de 6 etapas, puertas P0–P6 y **§5: los 6 experimentos que aún impiden cerrar la investigación**. |
| `coverage-matrix.md` | 13 | Los 5 ejes siguen "abierto" en evidencia empírica y contraevidencia. |
| `expansion-log.md` | 13 | Bitácora; cierra registrando que no se inicializó OpenSpec ni se escribió código por puertas abiertas. |

### 1.2 `PI-agent/` — fuentes de planificación

#### `openspec/changes/` (raíz) — **vacío**

`ls -la openspec/changes/` → solo `.` y `..` `[V]`. Coherente con `README.md:20`: "Cambios activos: ninguno". La raíz declara **27 capacidades** canónicas con **147 requisitos** en total (suma de `grep -c "^### Requirement:"`) `[V]`, y **no ha tenido ni un solo change abierto**: las 27 specs se escribieron de una vez y nunca se revisaron por el cauce formal `[V]`.

Existe un **segundo proyecto OpenSpec anidado** en `src/pi-account-router/openspec/` con 11 specs canónicas propias, **2 changes activos** y **25 archivados** `[V]`. Ambos proyectos conviven sin referencia cruzada.

#### Los 2 changes activos del router

| Change | Tasks | Código detrás | Spec canónica actualizada |
|---|---|---|---|
| `2026-10-19-discarded-tool-call-observability` | 4/4 secciones `[x]` `[V]` | **Sí**: `src/adapters/message-safety.ts:25,34,56,59` (`DiscardedToolCallShape`, `shapeOf`, `describeInvalidToolCalls`); `routed-streams.ts:22,476,483` (emit `account-router/discarded_tool_calls`) `[V]` | **No** — ver H-6 |
| `2026-10-24-s2-repair-gate` | 4/4 secciones `[x]` `[V]` | **Sí**: `message-safety.ts:94` (`repairToolCalls`); `routed-streams.ts:23,471,483` (gate repair-before-discard) `[V]` | **No** — ver H-6 |

Capacidad que tocan: `provider-transport` (transporte del router / contrato S-2 de tool calls inválidas).

#### `HANDOFF.md` raíz (2 917 bytes, 2026-10-17)

Sellado en E-029/E-030. §"Pendiente" (:38-42): "**Ninguno.** La casa es 100 % local... Todos los hallazgos de la auditoría (M-1…M-6, m-1…m-7) fueron remediados en E-029; **no queda finding abierto**". Declara gate 7/7 "medido el 17-oct" y 27/27 specs. **Falso respecto al estado actual** — ver H-10.

#### `DOCS-HARNESS/D-revision/` — **no existe**

`find /Users/ruben/Code -maxdepth 5 -iname "*DOCS-HARNESS*" -o -iname "*D-revision*"` → **vacío** `[V]`. Los tres ficheros (`D-revision-00-analisis-de-cobertura.md`, `D-revision-01-plan-candidato.md`, `D-revision-02-revision-final.md`) fueron borrados en el commit `e8fb692` (E-022, 2026-10-17, "purga del material de lectura — docs/ queda solo docs-expe/, reviews/ fuera") `[V]`. Recuperables únicamente vía historia git. Ver H-1.

#### `docs/docs-expe/00-EXPEDIENTE-DE-OBRA.md` (19 744 bytes, 337 líneas)

Registro canónico de decisiones. Norma (:13): "**Todo cambio se apunta aquí antes de considerarse hecho** (o en su commit, cuando exista git)". Entradas presentes: E-018…E-030 y E-047 `[V]`. **Faltan E-031…E-046** — ver H-7.

#### `src/pi-account-router/HANDOFF.md` + `docs/acta-cierre-2026-10-18.md`

El acta cierra el programa de gates G3→G0(a)→G7 canary→G4→G5→G6→G7(acta) y deja **4 decisiones del propietario** abiertas (:23, :52, :57, :58). El HANDOFF del router declara "Único gate abierto: G7 soak" (:20) y "**Cero changes activos**" (:56) — ambas afirmaciones falsas (ver H-6, H-9).

#### `docs/audit-2026-10-17/` — informe + plan de remediación

`00-INFORME.md` (93 líneas): veredicto "LA CASA ESTÁ SANA EN CÓDIGO Y SEGURIDAD, PERO SUS DOCUMENTOS VIVOS MINTEN"; 6 MAJOR (M-1…M-6), 7 MINOR (m-1…m-7), 3 INFO. `01-PLAN-REMEDIACION.md`: WP-1…WP-6 con verificación y rollback por bloque. **Es el único plan auditado que está cerrado y verificado** — ver H-13.

#### `src/pi-account-router/docs/audit-2026-10-18/arquitectura-ecosistema/` — el delta D01–D11

10 ficheros (`00-indice` … `09-evidencia-delta`), **sin versionar** (`?? …/arquitectura-ecosistema/` en el manifiesto §3.1) `[V]`. `08-delta-recomendado.md` contiene 11 intervenciones acotadas D01–D11 sobre propietarios existentes, con 68 aserciones de evidencia en `09-evidencia-delta.md`. Estado (:3): "**cambios de producto no aplicados ni ratificados**". Ver H-8.

---

## 2 · Hallazgos

Severidad: **CRÍTICO** (bloquea o falsea el estado del proyecto) · **ALTO** (brecha sustantiva de trazabilidad o de producto) · **MEDIO** (deuda de proceso con impacto acotado) · **BAJO** (higiene / informativos).

---

### H-1 · CRÍTICO — La fuente `DOCS-HARNESS/D-revision/` no existe; el alcance de la auditoría apunta a un fantasma

**Evidencia.** `[V]` `find /Users/ruben/Code -maxdepth 5 -iname "*DOCS-HARNESS*" -o -iname "*D-revision*"` → sin resultados. `git log --all --diff-filter=D --name-only` en `PI-agent` lista como borrados: `docs/docs-harness/D-revision-00-analisis-de-cobertura.md`, `D-revision-01-plan-candidato.md`, `D-revision-02-revision-final.md` (además de `00-ORDEN-DE-LECTURA.md` y los `A-referencia/01…04`). Commit responsable: `e8fb692` (E-022, 2026-10-17). `git ls-files` en HEAD no contiene ninguna ruta `docs-harness` `[V]`.

`00-ALCANCE-Y-METODO.md` §1 la declara dos veces como existente: O2 "contiene … `DOCS-HARNESS/`, `pi-harness/`" y O4 "`PI-agent/DOCS-HARNESS/D-revision/` … se auditan como fuente de planificación". El O5 (`pi-harness/MOVIDO-AQUI.md`) declara que el contenido "se movió a `PI-agent/DOCS-HARNESS/`" — es decir, **el cartel de mudanza apunta a un destino que fue purgado tres días después**.

**Por qué importa.** Un anexo de auditoría que cita una fuente inexistente produce hallazgos no reproducibles. La revisión D (análisis de cobertura + plan candidato + revisión final) es precisamente el material que habría permitido contrastar qué revisión quedó bloqueada y por qué; su contenido **no puede auditarse desde el árbol de trabajo**.

**Qué falta para cerrarlo.** Decidir una de dos: (i) restaurar desde git (`git show e8fb692^:docs/docs-harness/D-revision-01-plan-candidato.md`) si la revisión sigue vigente, o (ii) corregir `00-ALCANCE-Y-METODO.md` O2/O4/O5 y declarar la fuente purgada por orden del propietario en E-022. Lo que no es aceptable es mantenerla citada como vigente.

---

### H-2 · CRÍTICO — `pi-arnes` declara `current_phase: construccion` con cero código, cero git y cero OpenSpec; 53 de 60 movimientos sin empezar

**Evidencia.** Plan: `EXECUTION-STATE.yaml:4` `current_phase: construccion`; `:7` `current_gate: continuous_build`; `:21` "el usuario ordena construcción continua sin validaciones intermedias". Repo: `EXECUTION-STATE.yaml:5` `last_verified_movement: M00`, `:10` `openspec_status: not_initialized`, `:11` `implementation_status: not_started`. Verificación en disco `[V]`: `ls -d .git` → *No such file or directory*; `ls -d openspec` → *No such file or directory*; `find . -name "*.ts" -o -name "*.py" -o -name "*.js"` → **0 ficheros**; 15 ficheros en total; todos con mtime 2026-09-28 (27 días antes de esta auditoría).

Estado real por movimiento, contrastando `PLAN-SERIAL-OPENSPEC.md` con `work/2026-09-28-respuestas-usuario.md:4` y `HANDOFF.md:3` `[V]`:

| Estado | Movimientos | Cuenta |
|---|---|---|
| VERIFICADO | M00 | 1 |
| EN CURSO / parcial | M01 (matriz v0.1 borrador), M03, M04 (solo parte local), M05 (redacción final pendiente), M06 (en preparación) | 5 |
| BLOQUEADO por el usuario | M02 (geografía/fechas, diferido) | 1 |
| PENDIENTE (sin empezar) | M07–M59 | **53** |

**Por qué importa.** La declaración `construccion` es la que leería cualquier agente que retome, y es insostenible con el propio plan: la fase de construcción (etapa D, M30+) exige haber pasado **G3** —cuyo primer paso, M21, es literalmente "Crear repo Git y estructura mínima" (`PLAN-SERIAL:52`)— y **G4**. No hay repo git. El plan prohíbe además saltar puertas (:5). Un agente que confíe en `current_phase` empezaría a escribir núcleo documental saltándose M08–M29 (diseño formal, OpenSpec, y las 9 pruebas de viabilidad), que es exactamente lo que el plan existe para impedir.

**Qué falta para cerrarlo.** O bien corregir `EXECUTION-STATE.yaml:4` a `diseno` / `planificacion` (coherente con `last_verified_movement: M00` y con `HANDOFF.md:3` "diseño/implementación **NO aprobados**"), o bien ejecutar M21 y empezar a producir los artefactos que justifiquen la fase. Mientras, el campo `current_phase` no debe usarse como señal de reanudación: el único dato fiable es `last_verified_movement`.

---

### H-3 · ALTO — Las 7 puertas G0–G6 quedaron sin dueño efectivo: derogadas de hecho, nunca derogadas de derecho

**Evidencia.** Plan: `PLAN-SERIAL-OPENSPEC.md:107` "## Puertas que un agente NO puede concederse a sí mismo", tabla :109-117 con G0–G6 todas "Usuario". Derogación: `EXECUTION-STATE.yaml:8` `gate_status: user_delegated_2026-09-28` y `:29` "Human gates reduced by user instruction (2026-09-28): only real-document access and export approvals require the user; internal milestones are verified by the team with evidence".

**Contradicción no resuelta.** Bajo la nota :29 solo G5 (documentos reales) y G6 (operación/exportación) siguen reservadas al usuario; G0–G4 quedan delegadas al equipo. Pero `PLAN-SERIAL-OPENSPEC.md` **no se actualizó**: sigue exigiendo G0 antes de M08 (:26), G1 antes de M10, G2 antes de M14, G3 antes de M21, G4 antes de M30. Y el diseño v0.1 —que es la salida de **M10**, posterior a G0 y G1— ya está escrito en `docs/superpowers/specs/2026-09-28-alberto-documental-design.md` sin que conste en ningún fichero la aprobación de G0 ni de G1. El propio `HANDOFF.md:3` sigue diciendo "diseño/implementación **NO aprobados**" el mismo día y a la misma hora que `EXECUTION-STATE` declara la delegación.

**Por qué importa.** Es un plan huérfano en el sentido más estricto: nadie es responsable de cerrar G0–G4, y no hay fecha. La nota :26 del propio YAML advierte "Do not infer a gate approval from the user's approval of research or folder creation" — precisamente la inferencia que la coexistencia de `gate_status: user_delegated` con un diseño v0.1 ya escrito invita a hacer.

**Qué falta para cerrarlo.** Enmendar `PLAN-SERIAL-OPENSPEC.md` para reflejar la reducción de puertas (marcando G0–G4 como `delegated_to_team` con su criterio de evidencia, y G5/G6 como reservadas), y registrar explícitamente si G0 y G1 se dan por concedidas para el diseño v0.1 existente. Sin eso, cada agente que retome tendrá que adivinar qué puertas siguen en pie.

---

### H-4 · ALTO — Los 8 cambios OpenSpec planificados no existen en ninguno de los dos repos

**Evidencia.** Plan: `PLAN-SERIAL-OPENSPEC.md:12` lista los 8 candidatos (`bootstrap-private-harness`, `ingest-and-provenance`, `ocr-and-transcription`, `redaction-policy-and-review`, `safe-pdf-and-md-export`, `local-model-adapters`, `legal-medical-profiles`, `security-and-release-gates`). Implementación `[V]`: `pi-arnes-documental-privado/openspec/` no existe; `PI-agent/openspec/changes/` está vacío; `ls src/pi-account-router/openspec/changes/` devuelve 2 changes activos + 25 archivados, **ninguno** con esos nombres. Total: **0 de 8**.

**Por qué importa.** Los 8 nombres son la descomposición canónica de todo el producto en unidades entregables y verificables. Sin ellos no hay `proposal → specs → design → tasks` (:11), y por tanto no hay requisitos (`REQ`) ni escenarios (`SCN`) trazables a prueba — que es exactamente lo que M16/M18 exigen y lo que M59 audita al archivar ("trazabilidad `REQ→SCN→test→evidencia`", :105).

**Qué falta para cerrarlo.** M13 (ADR sobre `openspec 1.9.0` y su schema) → M14 (`openspec init` en la raíz correcta) → M15-M18 del primer change. Nota: `HANDOFF.md:4` prohíbe explícitamente ejecutar `openspec init` antes de la aprobación del diseño, así que este paso depende de cerrar H-3 primero.

---

### H-5 · ALTO — Desconexión total entre `pi-arnes` y `PI-agent`: se planifica desde cero lo que ya está construido

**Evidencia.** Grep cruzado `[V]`: en `pi-arnes-documental-privado/`, `grep -rn "PI-agent\|pi-account-router\|pi-intermediate\|pi-memory"` → **0 coincidencias**. En `PI-agent/`, `grep -rn "pi-arnes\|arnes-documental\|ALBERTO\|documental-privado" --include=*.md` → **0 coincidencias**. Ninguno de los dos universos se referencia.

Solapamientos funcionales concretos, con la pieza ya implementada en `PI-agent`:

| Planificado en `pi-arnes` | Ya implementado en `PI-agent` |
|---|---|
| M23 (:54) "Elegir frontera OS (usuario dedicado o VM/sandbox) y red; ensayar denegación de egress" | `openspec/specs/os-sandbox/spec.md` (12 requisitos) + `src/pi-intermediate/src/sandbox.ts` (372 líneas) con **5 providers**: `NoneProvider:53`, `BwrapProvider:63`, `SeatbeltProvider:100`, `SrtProvider:175`, `GondolinProvider:258` `[V]` |
| M22 (:53) "perfil Pi aislado y launcher fijado; prohibir carga global de extensiones/skills/credenciales" | `src/pi-intermediate/src/hard-gates.ts:1-4` "Bloquean ANTES de ejecutar (hook tool_call / user_bash) y nunca permiten en caso de error" `[V]` |
| M44 "tools estrechas… nunca shell libre en producción" | `hard-gates.ts` (lista `DESTRUCTIVE` con `rm -rf`, `sudo rm`, :13-14) + `openspec/specs/hard-gates/spec.md` (2 requisitos, fail-closed) `[V]` |
| M37 "detección candidata PII (reglas/NER)" | `src/pi-intermediate/src/governance.ts:32,36` (`detectInjection`, `redact`) `[V]` |
| M27/M34 "OCR como adaptador sustituible" | `tools/ocr/ocr.sh` vivo (confirmado por `docs/audit-2026-10-17/00-INFORME.md` §"Lo que SÍ funciona" #6) `[A]` |

Y en sentido inverso: `wave-2-pi-gates.md` llega por investigación a la conclusión "Pi es interfaz/orquestador **no raíz de confianza**… La política y los cambios de estado sensibles pertenecen a un núcleo externo que revalida cada petición" — que es exactamente el principio que `PI-agent/openspec/project.md` ya adopta como principio de diseño 5 ("Determinista por defecto: sin LLM generativo en el camino crítico") y 7 ("todo artefacto no propio es *untrusted* hasta verificación").

**Por qué importa.** Duplicidad de esfuerzo con riesgo de divergencia: dos implementaciones del mismo perímetro de seguridad, mantenidas por separado, sin que ninguna sepa de la otra. `pi-arnes` presupone en M21-M29 un trabajo de viabilidad (sandbox, egress, launcher, gates) que `PI-agent` ya ejecutó e incluso sometió a prueba física (G3, "48 aserciones de probe" según `src/pi-account-router/HANDOFF.md:14-16`).

**Qué falta para cerrarlo.** Un documento de decisión que establezca si el núcleo documental de `pi-arnes` reutiliza `@pi-agent/intermediate` (sandbox SPI, hard-gates, capability-index) o si construye el suyo, y por qué. Hoy no existe ni la pregunta.

---

### H-6 · ALTO — Los 2 changes activos están implementados pero sin archivar: la spec canónica no refleja el código en producción

**Evidencia.** Ambos changes tienen el 100 % de sus tasks marcadas `[x]` y código verificado en `src/` (tabla §1.2) `[V]`. La norma de la casa, `openspec/AGENTS.md:15-16`: "**archive** (`/opsx:archive <id>`): mover los deltas a `openspec/specs/<capability>/spec.md` y archivar el change en `changes/archive/`".

Verificación del paso incumplido `[V]`:
```
grep -c discarded_tool_calls src/pi-account-router/openspec/specs/provider-transport/spec.md  → 0
grep -c "discarded_tool_calls\|repaired" …/changes/2026-10-24-s2-repair-gate/specs/provider-transport/spec.md → 7
```
El delta tiene 7 menciones; la spec canónica, **cero**. El comportamiento que el router ejecuta hoy en producción (reparar tool calls inválidas antes de descartar, emitir `account-router/discarded_tool_calls` con `dropped`/`repaired`/`shapes`) **no está descrito en ninguna spec vigente**.

Agravante: `src/pi-account-router/HANDOFF.md:56` afirma "**Cero changes activos** en `openspec/changes/`; los del programa archivados el 2026-10-18" `[V]` — falso, hay 2 activos, el más reciente del 2026-10-24.

**Por qué importa.** Rompe la fuente de verdad declarada (`PLAN-SERIAL:10` en O3 y `README.md:20` en O2: "Especificación canónica"). Cualquier auditoría o reanudación que lea `openspec/specs/provider-transport/spec.md` obtendrá un contrato incompleto del transporte, y no hay forma de saber desde la spec que existen `repaired` y `shapes` en el payload.

**Qué falta para cerrarlo.** Ejecutar el archive de ambos changes (mover deltas a la spec canónica + mover a `changes/archive/`) y corregir `src/pi-account-router/HANDOFF.md:56`. Es trabajo de minutos, no de diseño.

---

### H-7 · ALTO — 16 entradas del expediente de obra (E-031…E-046) nunca se escribieron: la norma canónica de la casa se incumplió durante todo el programa de gates

**Evidencia.** Norma `[V]` `docs/docs-expe/00-EXPEDIENTE-DE-OBRA.md:13`: "**Todo cambio se apunta aquí antes de considerarse hecho** (o en su commit, cuando exista git)".

Estado del fichero `[V]`: `grep -oE "E-0[0-9][0-9][a-z]?"` sobre el fichero devuelve E-001, E-015, E-017…E-030 y E-047. **Ningún E-031…E-046.** Encabezados presentes: E-018 (:20), E-019 (:50), E-020 (:56), E-021 (:92), E-022 (:102), E-023 (:126), E-024 (:136), E-025 (:156), E-026 (:186), E-027 (:202), E-028 (:219), E-029 (:237), E-030 (:281), E-047 (:301).

Existencia real de las entradas faltantes `[V]`: `git log --all --oneline | grep -oE "E-0(3[1-9]|4[0-6])[a-z]?"` → E-031, E-032, E-033, E-034, E-035, E-036, E-037, E-038, E-039, E-040, E-041, E-042, E-043, E-043b, E-044, E-045, E-046 (17 identificadores de commit).

No es un borrado posterior: recorrí las **17 revisiones git del fichero** y en ninguna aparecen E-031…E-046 `[V]`. Nunca se escribieron.

**Por qué importa.** Las 16 entradas ausentes cubren precisamente el programa de gates G3→G7 y las cuatro decisiones del propietario que hoy bloquean el proyecto (H-9): el retiro del soak (E-044), el NO-GO de Rust (E-042), la degradación de G5 por oráculo ausente (E-041), la implementación y posterior retiro del log de auditoría inmutable (E-045/E-046). Todo eso **solo vive en mensajes de commit**, no en el registro normativo que la casa declara como fuente de verdad. `HANDOFF.md` raíz remite explícitamente al expediente como "El registro de decisiones" (:4-5).

**Qué falta para cerrarlo.** Reconstruir E-031…E-046 desde `git log` + los artefactos que cada commit cita (acta, project-status, changes archivados), o declarar formalmente en el expediente que ese tramo se perdió y por qué. Lo segundo es más honesto y más barato; lo primero restaura la trazabilidad.

---

### H-8 · ALTO — 11 intervenciones arquitectónicas (D01–D11) diagnosticadas con evidencia, no aplicadas, no ratificadas y sin versionar

**Evidencia.** Plan: `src/pi-account-router/docs/audit-2026-10-18/arquitectura-ecosistema/08-delta-recomendado.md:3` "**Estado:** … **cambios de producto no aplicados ni ratificados**. Ronda INV-10". Autorización vigente, `src/pi-account-router/HANDOFF.md:9-10`: "Ni las primeras auditorías ni la propuesta actual están ratificadas. Autorización: investigar, documentar y proponer; **no implementar ni reorganizar componentes**". El directorio completo está **fuera de git** (`?? …/arquitectura-ecosistema/`) `[V]`.

Las 11 intervenciones (§3, :62-158): **D01** frontera de escritura única para memoria · **D02** ámbito de datos en el puerto de almacenamiento, no solo en search · **D03** unidad de trabajo real incluidos efectos del Store · **D04** replay semántico validado antes de reemplazar datos · **D05** proteger exactamente los datos que se pretende autenticar · **D06** recibo de verificación ligado al sujeto evaluado · **D07** presupuestar el texto real · **D08** candidatos independientes y un solo rerank final · **D09** obligatoriedad de controles según garantía, no reputación · **D10** corregir y certificar los adapters de sandbox · **D11** frontera pública de paquete y composición ligera.

Verifiqué que los defectos que el delta describe **siguen vivos en el código** `[V]`:

- **D02** — el delta cita `M/memory-control.ts:136–163`: "get/forget por ID delegan sin comprobarlo". Código actual:
  ```
  get(id: string): Memory | undefined {
    return this.backend.get(id);
  }
  …
  forget(id: string): boolean {
    return this.backend.invalidate(id);
  }
  ```
  (`src/pi-memory/src/memory-control.ts:136-138` y `:162-164`). Sin comprobación de tenant ni de scope, mientras `search` y `nearest` sí aplican `prefix = this.tenant ? …` (:143-144). **Fuga entre tenants confirmada en el árbol actual**, no corregida.
- **D01** — el delta pide que todas las mutaciones pasen por un único dueño. Código actual: `memory-gateway.ts:42` llama a `control.save(…)`; `plane.ts:65-77` (`flushBeforeCompact`) llama a `core.memory.flush(…)`. Siguen caminos de escritura separados, sin pasar por Fabric.
- **D07** — el delta denuncia presupuestar con coste de summary+ID pero emitir también título/kind/cabecera. `token-ring.ts:22-24` sigue siendo `estimateTokens = Math.max(1, Math.ceil(text.length / 4))`, y no existe una única función de render compartida entre estimación y emisión.

**Por qué importa.** Son defectos de seguridad y de integridad de datos con evidencia ejecutada (68 aserciones en `09-evidencia-delta.md`), diagnosticados hace 7 días, y el único motivo por el que no se corrigen es la falta de ratificación del propietario. Además, al estar fuera de git, **no sobreviven a un `git clean`**: la evidencia y el plan se perderían sin dejar rastro.

**Qué falta para cerrarlo.** (1) Versionar el directorio `arquitectura-ecosistema/`. (2) Ratificación explícita del propietario de D01–D11 (o de un subconjunto priorizado: D02 y D05 son los de riesgo de fuga y de autenticidad). (3) Un change OpenSpec por intervención, con su delta de spec y su verificación.

---

### H-9 · ALTO — 4 decisiones del propietario sin fecha bloquean todo el trabajo restante del router

**Evidencia.** `src/pi-account-router/docs/acta-cierre-2026-10-18.md` `[V]`:

| Decisión | Qué bloquea | Línea | Estado verificado |
|---|---|---|---|
| **(a)** Soak multidía G7 | La causa del corte histórico de Agnes; ROI de memoria; L5-C | :23 | "**PENDIENTE de decisión (a)** … **no hay soak ejecutado ni evidencia de soak**". Runner y evidencia retirados: `ls scripts/soak.ts` → *No such file*; `ls -d docs/soak-2026-10-18` → *No such file* `[V]` |
| **(b)** Suite de regresión persistente | Cualquier garantía de no-regresión | :58 | "E-020 mantiene sin tests; decisión (b) pendiente" |
| **(c)** Binario de verificación Rust/QuickJS | El port Rust (S-10/S-11) | :56-57 | "no ejecutado (NO-GO, G6); cualquier binario de verificación requiere decisión (c)". G6: 0 de 16 celdas verificadas |
| **(d)** Enfoque del log de auditoría inmutable | Trazabilidad append-only del router | :52 | Implementado en E-045 y **retirado en E-046 por orden del propietario** ("no pedido, y no se quiere JSON"). Investigación alternativa en `research/logs-estandar-inmutable-investigacion.md` (11 044 bytes, existe `[V]`) |

Consecuencia más grave, declarada por la propia casa (`src/pi-account-router/HANDOFF.md:34-36`): "**Causa exacta del corte histórico de Agnes: NO identificada.** Solo el soak bajo carga real (decisión (a)) podría confirmarla o descartarla; el canary descarta solo el fallo estático en reposo".

Bloqueo en cascada adicional (acta :53-55): el A/B de memoria es "no ejecutable (pi-claim-gate ausente, E-018)" y "ROI sobre dataset real y L5-C (N≥4/cuenta) requieren alcance de observación autorizado + soak" — es decir, **(a) bloquea también la validación de memoria**, y el oráculo que permitiría suplirlo fue borrado en E-018.

**Por qué importa.** Ninguna de las cuatro tiene fecha, propietario delegado ni criterio de escalada. El proyecto quedó deliberadamente aparcado esperando al usuario, y `HANDOFF.md` raíz lo contradice diciendo "Pendiente: Ninguno" (H-10). Un plan que depende de una pieza bloqueada y no lo declara en su punto de reanudación es un plan que se reanudará mal.

**Qué falta para cerrarlo.** Cuatro decisiones binarias del propietario. Mientras no se tomen, lo único honesto es que `HANDOFF.md` raíz las liste como pendientes.

---

### H-10 · MEDIO — `PI-agent/HANDOFF.md` declara "Pendiente: Ninguno" con 2 changes sin archivar, 4 decisiones abiertas, 11 intervenciones sin aplicar y 16 entradas de expediente faltantes

**Evidencia.** `HANDOFF.md:38-42` `[V]`: "### Pendiente — **Ninguno.** La casa es 100 % local… Todos los hallazgos de la auditoría (M-1…M-6, m-1…m-7) fueron remediados en E-029; **no queda finding abierto**". Sello (:44-46): "gate de la versión: **7/7 medido el 17-oct** … sellado en `8c42530` (E-029)".

Contraste `[V]`: HEAD es `7b0e0b3` (2026-10-24, E-047) — el HANDOFF no se actualizó en 17 entradas de trabajo ni en 7 días. Y en ese estado hay: 2 changes activos sin archivar (H-6), 4 decisiones del propietario abiertas (H-9), 11 intervenciones D sin ratificar (H-8), 16 entradas de expediente ausentes (H-7).

El HANDOFF es, por declaración propia (:4-5), el punto de entrada: "solo existe el estado actual… El registro de decisiones vive en `docs/docs-expe/…`". Es el fichero que un agente lee primero, y el que más desinforma.

**Por qué importa.** Es el mismo patrón que la auditoría interna de la casa ya diagnosticó el 2026-10-17: "SUS DOCUMENTOS VIVOS MINTEN (drift post-E-020/E-028)". Se remedio el drift de entonces (H-13) y se volvió a generar en siete días. No es un incidente, es una propiedad del proceso: **los HANDOFF se sellan y no se mantienen**.

**Qué falta para cerrarlo.** Reescribir §"Pendiente" con las cuatro decisiones (a)-(d), los 2 changes pendientes de archive y el tramo E-031…E-046 sin registrar; y establecer que el sello de handoff caduca cuando HEAD avanza.

---

### H-11 · MEDIO — Dos proyectos OpenSpec anidados con flujos independientes; el de la raíz (27 capacidades) nunca ha tenido un change

**Evidencia.** Raíz: `openspec/specs/` = 27 capacidades, 147 requisitos; `openspec/changes/` = **vacío** `[V]`. `README.md:20`: "Especificación canónica: 27 capacidades en `specs/`. Cambios activos: ninguno". Anidado: `src/pi-account-router/openspec/` = 11 specs canónicas + 2 changes activos + 25 archivados `[V]`.

Las 27 capacidades de la raíz describen el proyecto **PI-CORE — Capa Intermedia (B-stacks)** (`openspec/project.md:4-9`): Selection Plane + Token Economy Ring + Intermediate Memory + federación de skills y MCPs. Es la arquitectura de mayor alcance de las dos, y es la que **no tiene historial de cambios**: se especificó de una vez y nunca se revisó por el cauce `proposal → specs → design → tasks → archive`.

**Por qué importa.** `PLAN-SERIAL:10` (O3) y la práctica del router asumen que el comportamiento vigente solo cambia dentro de un change revisado. Las 27 capacidades de la raíz violan ese principio por construcción: no hay mecanismo registrado por el que hayan evolucionado, ni forma de saber si siguen describiendo el código (ver H-12, donde se comprueba que en varios puntos no).

**Qué falta para cerrarlo.** Decidir si la raíz es un proyecto OpenSpec vivo (y entonces abrir changes para lo que se modifique) o un documento de diseño congelado (y entonces no llamarlo "especificación canónica" ni someterlo a `openspec validate` como gate).

---

### H-12 · MEDIO — Requisitos de spec que nombran componentes inexistentes, y uno que el código contradice abiertamente

**Evidencia.** Contraste `openspec/specs/` ↔ `src/*/src` por grep `[V]`:

| Spec (requisito) | Componente nombrado | En código |
|---|---|---|
| `token-economy-ring:8` "CacheAligner (no romper el prefijo KV)" | `CacheAligner` | **0 ficheros** |
| `token-economy-ring:16` "JSON (SmartCrusher), código (**AST CodeCompressor**), prosa (**Kompress-v2**), CLI/logs (**RTK**)" | `CodeCompressor`, `Kompress`, `RTK` | **0 ficheros** los tres. `SmartCrusher` aparece solo como comentario (`token-ring.ts:46`) |
| `token-economy-ring:37` "Compresión de prompt (ACE + LLMLingua-2)" | `ACE`, `LLMLingua` | Solo comentarios (`token-ring.ts:470`) |
| `token-economy-ring:61` "Optimización de prompts offline (GEPA)" | `GEPA` | Solo comentario (`token-ring.ts:543`) |
| `verification-evaluation:33` "Required adversarial review" | `Dementor`, `VerificationFacade` | **0 ficheros** en `PI-agent` |

**Contradicción directa** `[V]`: `token-economy-ring/spec.md:16-19` exige enrutar el código a un "AST CodeCompressor"; `token-ring.ts:87-90` hace lo contrario:
```
if (kind === "code") {
  // Regla de oro: el código nunca se comprime.
  return { kind, text, reversible: false, saved: 0, … };
}
```

**Contrapunto de equidad.** Sería falso concluir que las 27 capacidades son papel mojado. Verifiqué implementación real y sustancial `[V]`: `sandbox.ts` 372 líneas con 5 providers (None/Bwrap/Seatbelt/Srt/Gondolin); `token-ring.ts` 683 líneas con **knapsack 0/1 exacto por programación dinámica** (:156-203, con nota explícita de que la reconstrucción con parent-pointer 1D es incorrecta), MMR (:212), CCR reversible (:105-123), governor (:234), `maskProtected`/`unmaskProtected` (:275,284) y caveman (:345); `capability-index.ts` 134 líneas con BM25/FTS5; `ingest.ts` 216 líneas con 4 fetchers (LocalDir/JsonCatalog/HttpCatalog/GitRepo); `hard-gates.ts` 82 líneas fail-closed; `db.ts` 288 líneas. Totales: 99 ficheros `.ts`, 3 614 LOC en `pi-intermediate`, 6 489 en `pi-memory`.

**Por qué importa.** El problema no es la ausencia de código, es que **la spec y el código divergen sin que ningún gate lo detecte**. `openspec validate --all --strict` valida forma (longitud de requisito, estructura de escenarios), no correspondencia con la implementación — por eso la casa puede mostrar "27/27" verde y tener a la vez un requisito que el código contradice.

**Qué falta para cerrarlo.** O alinear la spec con el código (retirar `AST CodeCompressor`/`Kompress-v2`/`RTK`/`CacheAligner` y documentar la "regla de oro" de no comprimir código como decisión explícita), o implementar lo especificado. Y añadir al gate una comprobación de que los componentes nombrados en la spec existen en `src/`.

---

### H-13 · BAJO (positivo) — WP-1…WP-6 es el único plan auditado que está cerrado, y la remediación se sostiene

**Evidencia.** Plan: `docs/audit-2026-10-17/01-PLAN-REMEDIACION.md`, 6 work packages con verificación y rollback por bloque. Verificación independiente de cada claim `[V]`:

| WP / finding | Claim | Verificación |
|---|---|---|
| WP-1 (M-1, m-7) | `package.json` raíz ESM | Existe: `{"name":"pi-agent-house","private":true,"type":"module"}` ✓ |
| WP-3 (m-1) | `LICENSE` raíz (decisión D-1(a)) | Existe, 1 875 bytes ✓ |
| WP-3 (M-3) | "23 capacidades" → 27 | `README.md:20` y `HANDOFF.md:25` dicen 27 ✓ |
| WP-3 (M-5) | Fuera `exam-hall`/`per-suite` | 0 coincidencias fuera de docs de auditoría ✓ |
| WP-2 (M-4) | Requisito de `os-sandbox` <500 chars | Máximo actual: **371** chars ("Selección de proveedor por plataforma") ✓ |
| WP-4 (M-6) | `typebox` declarada + devDeps + lockfiles | `pi-memory/package.json:25` `"typebox": "1.3.27"`; `typescript 7.0.2` y `@types/node 26.6.2` en ambas libs; ambos `package-lock.json` presentes ✓ |

**Residuo aceptable.** `grep "23 capacidades"` aún devuelve 3 impactos, todos dentro de `docs/docs-expe/00-EXPEDIENTE-DE-OBRA.md:85,118,254` — menciones históricas en las entradas E-020/E-022/E-029. El propio plan las excluye de la verificación ("solo deben quedar menciones históricas explícitas datadas"). Correcto.

**Por qué importa.** Demuestra que la casa **sabe** cerrar planes con verificación y rollback cuando se lo propone. El contraste con H-2 (27 días sin un artefacto) y H-9 (4 decisiones sin fecha) no es de capacidad, es de prioridad y de dueño.

---

### H-14 · BAJO — Ningún ítem planificado de ninguno de los dos repos tiene fecha ni propietario

**Evidencia.** `[V]` `work/2026-09-28-respuestas-usuario.md:42`: "**Plazo:** sin dato". `EXECUTION-STATE.yaml` no tiene ningún campo de fecha objetivo ni de responsable (solo `updated_at: 2026-09-28`). `PLAN-SERIAL-OPENSPEC.md` define estados y puertas pero ninguna fecha; la columna "Quién la concede" dice siempre "Usuario". En `PI-agent`, las 4 decisiones del acta y las 11 intervenciones del delta carecen de fecha y de nombre. `08-delta-recomendado.md:176-192` tiene un "Plan de aplicación verificable, sin big bang" — con fases, pero sin calendario.

**Por qué importa.** 180 ítems planificados sin una sola fecha es la definición operativa de plan huérfano. Sin fecha no hay forma de distinguir "aparcado deliberadamente" de "abandonado", que es exactamente la ambigüedad que H-2 y H-10 explotan.

---

## 3 · Riesgos de la planificación

**R1 · Estados de ejecución que contradicen el repo (el riesgo mayor).** Dos de los tres ficheros de reanudación afirman más avance del que existe: `EXECUTION-STATE.yaml:4` (`construccion` sin repo git) y `PI-agent/HANDOFF.md:39` ("Pendiente: Ninguno" con 4 decisiones abiertas). Un agente que retome por cualquiera de los dos tomará malas decisiones. En ambos casos el dato fiable está en otra parte (`last_verified_movement`, y `acta-cierre-2026-10-18.md`).

**R2 · Planes huérfanos: sin dueño ni fecha.** Los 180 ítems (H-14). Concretamente en riesgo: el delta D01–D11, que además está **fuera de git** (H-8) — un `git clean -fdx` en `src/pi-account-router/` destruiría 68 aserciones de evidencia y 11 intervenciones sin dejar rastro en la historia.

**R3 · Planes que dependen de piezas bloqueadas.** Cadena crítica en `PI-agent`: decisión (a) → soak → causa del corte de Agnes + ROI de memoria + L5-C; y el oráculo que permitiría suplir el soak (`pi-claim-gate`) fue borrado en E-018, así que **no hay ruta alternativa**. En `pi-arnes`: G0/G1 sin cerrar (H-3) → M14 `openspec init` prohibido (`HANDOFF.md:4`) → los 8 changes bloqueados (H-4) → M16/M18 sin `REQ`/`SCN` → M30-M43 (el núcleo entero) sin especificación ejecutable. La dependencia más frágil es que **M02 (geografía/fechas) está diferido por el usuario** y de él dependen M36-M38 (políticas de censura) y M52 (búsqueda de centinelas): el plan serial no admite saltarlo, y el usuario lo aparcó.

**R4 · Duplicidad entre `pi-arnes` y `openspec/changes`.** H-5: cero referencias cruzadas, cinco solapamientos funcionales verificados, uno de ellos (sandbox/egress) ya implementado y probado físicamente en `PI-agent` mientras `pi-arnes` lo planifica como viabilidad pendiente en M23. Riesgo de construir dos perímetros de seguridad divergentes para el mismo usuario y las mismas máquinas.

**R5 · La spec como fuente de verdad no es verificable.** H-11 + H-12: 27 capacidades canónicas sin historial de changes, y requisitos que nombran componentes inexistentes o que el código contradice. `openspec validate --strict` da verde porque valida forma, no correspondencia. El gate canónico de la casa no detecta el único tipo de drift que importa.

**R6 · Trazabilidad rota en el registro normativo.** H-7: 16 entradas del expediente nunca escritas. La casa declara el expediente como fuente de decisiones y lo alimenta solo hasta donde le conviene; el tramo más delicado (retiros por orden del propietario, NO-GO, degradaciones) vive únicamente en mensajes de commit.

---

## 4 · Lagunas

Lo que este anejo **no pudo determinar**, y por qué:

1. **Contenido de `DOCS-HARNESS/D-revision/`.** No existe en el árbol (H-1). Es recuperable de la historia git (`git show e8fb692^:docs/docs-harness/D-revision-01-plan-candidato.md`), pero hacerlo excede el mandato de solo lectura sobre el árbol de trabajo y requeriría decidir antes si esa revisión sigue vigente. **Queda sin auditar qué revisión concreta quedó bloqueada y por qué**, más allá de lo que E-022 registra como motivo de la purga.
2. **Si G0 y G1 llegaron a concederse.** El diseño v0.1 existe (salida de M10, posterior a ambas puertas) pero no hay artefacto que registre su aprobación. `EXECUTION-STATE.yaml:29` sugiere que quedaron delegadas; `HANDOFF.md:3` dice lo contrario. No hay forma de resolverlo desde los ficheros: haría falta la transcripción de la sesión team-dev del 2026-09-28, que no está en la carpeta.
3. **Estado de M05 y M06.** `respuestas-usuario:4` los declara "pendiente de redacción final" y "en preparación"; no existe ningún borrador de la declaración de no-objetivos (M05) ni de la comparativa de 2-3 arquitecturas (M06) más allá de la tabla de 3 opciones en `SYNTHESIS-PROVISIONAL.md:16-22`. No pude determinar si M06 se dio por satisfecho con esa tabla.
4. **Ejecución de gates y tests.** No ejecuté `npm run typecheck`, `openspec validate`, ni los probes: el mandato prohíbe mutar estado y varios de esos comandos escriben (cachés, `dist/`, `.omo/`). Todas las cifras de gates (7/7, 27/27, 13/13 strict, 12/12, 24/24) se reportan como `[A]`, auto-declaradas por la casa. Lo que sí verifiqué por lectura de código y de ficheros está marcado `[V]`.
5. **Correspondencia spec↔código de las 27 capacidades, exhaustiva.** H-12 cubre los casos que el grep de componentes nombrados permitió decidir (token-economy-ring, verification-evaluation, os-sandbox, capability-index, hard-gates, ingest). Las 21 capacidades restantes —en particular las 12 de memoria (`memory-fabric`, `memory-control-plane`, `memory-governance`, `memory-runtime`, `memory-transport-mcp`, `memory-backend-spi`, `memory-backend-cloud`, `memory-embeddings`, `memory-eval`, `memory-stack`, `layered-memory`, `intermediate-memory`)— tienen ficheros homónimos en `src/pi-memory/src/` (37 ficheros, 6 489 LOC), lo que sugiere implementación, pero **no verifiqué requisito por requisito**. Sería una auditoría propia.
6. **`research/ulw/`: si los 6 experimentos de `SYNTHESIS-PROVISIONAL.md:52-60` se ejecutaron fuera de esta carpeta.** Los 10 ficheros son de 2026-09-28 y los declaran pendientes; no hay evidencias posteriores en la carpeta. No puedo descartar que se hicieran en otra sesión sin registro aquí — pero entonces la carpeta de investigación estaría desactualizada, que es el mismo patrón de H-2.
7. **Relación real entre los dos repos.** H-5 establece que no se referencian. No pude determinar si son el mismo proyecto en dos fases (¿es `PI-agent` el núcleo que `pi-arnes` busca?) o dos proyectos independientes del mismo usuario. `openspec/project.md` de `PI-agent` describe "PI-CORE — Capa Intermedia", y el diseño v0.1 de `pi-arnes` describe un "Núcleo documental determinista" con herramientas MCP estrechas: son arquitecturas compatibles, pero nada afirma que sean la misma.
