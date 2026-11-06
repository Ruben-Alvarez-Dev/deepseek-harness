# Plan serial 100 % OpenSpec-driven — ALBERTO

**Tipo:** plan de movimientos y handoff, no spec aprobada ni autorización para implementar. **Versión:** 0.1, 2026-09-28. Cada fila se ejecuta **solo después** de la anterior salvo las investigaciones de lectura explícitamente marcadas paralelizables. Si una puerta falla, se vuelve a la fila indicada, se actualizan los artefactos y no se «salta» el error. Fuente del workflow: [OpenSpec oficial](https://github.com/Fission-AI/OpenSpec/blob/main/docs/workflows.md) y [schema `spec-driven`](https://github.com/Fission-AI/OpenSpec/blob/main/docs-lab/reference/schemas/spec-driven/index.md). CLI local: `openspec 1.9.0`.

## Convenciones operativas para cualquier agente

- **Ruta raíz:** `/Users/ruben/Code/pi-arnes-documental-privado`. No usar `/Users/ruben/Code/JESUS` ni renombrar archivos internos ajenos.
- **Estados de paso:** `PENDIENTE` → `EN CURSO` → `VERIFICADO` o `BLOQUEADO`. Un paso `VERIFICADO` exige artefacto, prueba/inspección y revisión registrada; no vale «el modelo dijo que sí».
- **Identificadores:** `Mxx` = movimiento; `Gx` = puerta humana; `REQ-xxx` = requisito; `SCN-xxx` = escenario verificable; `RISK-xxx` = riesgo; `EV-xxx` = evidencia; `DEC-xxx` = decisión.
- **Fuente de verdad prevista:** `openspec/specs/<capability>/spec.md` para comportamiento vigente; `openspec/changes/<change-id>/{proposal.md,specs/,design.md,tasks.md}` para cambios abiertos. No editar comportamiento fuera de un change revisado. La investigación no es spec normativa.
- **Orden de artefactos:** `proposal → specs → design → tasks → apply/implement → verify → archive`; OpenSpec permite revisiones, pero cualquier cambio sustantivo durante `apply` vuelve a `proposal/specs/design/tasks` y a sus aprobaciones. La [guía oficial](https://github.com/Fission-AI/OpenSpec/blob/main/docs/editing-changes.md) admite actualizar artefactos, no congelarlos ciegamente.
- **Cambios propuestos:** `bootstrap-private-harness`, `ingest-and-provenance`, `ocr-and-transcription`, `redaction-policy-and-review`, `safe-pdf-and-md-export`, `local-model-adapters`, `legal-medical-profiles`, `security-and-release-gates`. Los nombres son **candidatos**, se ratifican en M14.
- **Aislamiento de datos:** nunca poner expedientes originales o hashes reversibles en Git, OpenSpec, Engram, sesiones Pi, informes o fixtures. Los logs de pruebas llevan solo datos sintéticos. Los originales reales no entran antes de G6.

## Etapa A — intención, alcance y puertas de aprobación

| Paso | Acción serial | Entrada | Salida y condición de cierre |
|---|---|---|---|
| M00 | Leer `HANDOFF.md`, investigación y este plan; comprobar nombres de rutas | Archivos existentes | Registrar fecha, último paso comprobado y divergencias; no empezar en un paso supuesto. |
| M01 | Confirmar usuarios, destinatarios y finalidad por tipo de copia | Conversación con usuario | Matriz `audiencia × uso × sensibilidad × revisión`; ninguna categoría inventada. |
| M02 | Confirmar política geográfica/temporal y qué información debe conservarse para comprender el caso | M01 | Ejemplos de transformación aceptada/rechazada; se documenta riesgo de reidentificación. |
| M03 | Confirmar modos de funcionamiento: solo lectura/análisis, testado, exportación y divulgación | M01–M02 | Actores, autoridad y permisos por modo; quién aprueba cada exportación. |
| M04 | Inventariar hardware real, macOS, almacenamiento libre, red y volumen/tipos de documentos **sin leer expedientes** | Usuario + comandos no sensibles | Inventario verificable; chip del MacBook y límites de RAM. |
| M05 | Delimitar explícitamente exclusiones: diagnóstico, tratamiento, representación legal, preservación de firma/validez, anonimato absoluto | M01–M04 | Declaración de no objetivos aprobada por usuario. |
| M06 | Presentar 2–3 arquitecturas (Pi solo; Pi+nucleo externo; varios arneses), riesgos y recomendación | Síntesis + M01–M05 | Comparativa entendible, sin implementar. |
| M07 / G0 | Conseguir aprobación explícita de intención y dirección arquitectónica | M06 | Respuesta inequívoca del usuario; si no, volver M01/M06. |

## Etapa B — formalización OpenSpec, todavía sin código

| Paso | Acción serial | Entrada | Salida y condición de cierre |
|---|---|---|---|
| M08 | Escribir diseño por secciones: límites de confianza, datos, estados, perfiles, UX, fallos, privacidad | G0 | Diseño conversacional sometido a revisión sección por sección. |
| M09 / G1 | Obtener aprobación del **diseño completo** | M08 | Respuesta explícita; no interpretar aprobación de carpeta/investigación como aprobación de diseño. |
| M10 | Escribir spec arquitectónica formal en `docs/superpowers/specs/YYYY-MM-DD-alberto-documental-design.md` | G1 | Documento autoconsistente: objetivos/no objetivos, interfaces, diagramas de flujo/estados, errores, datos, amenazas, criterios. |
| M11 | Auto-revisar spec con matriz intención→requisito y un revisor adversarial | M10 | Ambigüedades y contradicciones resueltas o marcadas `OPEN`, sin «TBD» ocultos. |
| M12 / G2 | Solicitar aprobación del **archivo de spec** al usuario | M11 | Aprobación explícita del archivo y versión; de otro modo revisar M10. |
| M13 | Revisar `openspec 1.9.0` y su schema actual; decidir si usar CLI tal cual o schema personalizado, sin instalar nada | G2 | ADR con comandos/versiones y razón. No presentar un schema inventado como oficial. |
| M14 | Inicializar proyecto OpenSpec en la carpeta aprobada y crear el primer `change` solo tras G2 | M13 | `openspec/` creado en la raíz correcta; identidad y permisos revisados. |
| M15 | Redactar `proposal.md` del change `bootstrap-private-harness` | M14 | Problema, motivación, alcance/no alcance, riesgos/dependencias. |
| M16 | Redactar `specs/` con capacidades y escenarios `WHEN/THEN` para invariantes; separar privacidad, ingestión, censura, exportación y agentes | M15 | Cada `REQ` tiene al menos un `SCN`, oráculo y caso negativo; no contienen secretos. |
| M17 | Redactar `design.md`: contratos API, almacenes, máquina de estados, frontera Pi↔núcleo, capacidades, transacciones, revocación | M16 | Decisiones alternativas y costes explícitos; no se atribuye determinismo al LLM. |
| M18 | Redactar `tasks.md` **ejecutable y granular**, cada tarea enlazada a `REQ/SCN`, archivos previstos y prueba | M17 | Dependencias acíclicas y orden de ejecución, estimación/rollback/DoD. |
| M19 | Ejecutar `openspec status`, `show` y `validate` según ayuda de versión 1.9.0; revisar manualmente trazabilidad | M18 | Validación sin errores y evidencia guardada sin PII. |
| M20 / G3 | Pedir al usuario revisión de proposal/specs/design/tasks y **método de ejecución** | M19 | Aprobación explícita; sin ella no crear código, instalar paquetes ni modelos. |

## Etapa C — pruebas de viabilidad y perímetro, solo fixtures sintéticos

Cada experimento es un change OpenSpec o subtarea trazada en el change aprobado. Si un experimento cambia diseño, actualizar artefactos y regresar a G3.

| Paso | Acción serial | Entrada | Salida y condición de cierre |
|---|---|---|---|
| M21 | Crear repo Git y estructura mínima, `.gitignore` de datos/secretos/sesiones/modelos/cachés, fixture sintético | G3 | `git status` sin datos privados; hashes de fixture y prueba de exclusión. |
| M22 | Definir perfil Pi aislado y launcher fijado; prohibir carga global de extensiones/skills/credenciales | M21 | Inventario efectivo de recursos cargados; cero ajenos; prueba explícita de flags `-e`/`--skill`. |
| M23 | Elegir frontera OS (usuario dedicado o VM/sandbox) y red; ensayar denegación de egress | M22 | Canary de red local/remota y acceso a rutas fuera de ámbito; registrar efectos, no exit codes. |
| M24 | Fixture Pi G01–G12: RPC `bash`, TUI `!`, `user_bash`, extensiones explícitas, tool set dinámico, sesiones, concurrencia | M23 | Tabla PASS/FAIL con hashes, ficheros, eventos y egress; un bypass bloquea avance. |
| M25 | Probar Pi↔servidor MLX Qwen3.5 tool-call/no-stream/SSE/cancelación/continuación; alternativa GGUF si falla | M24 | Trazas sintéticas de ida/vuelta sin llamadas duplicadas ni herramientas con efectos. |
| M26 | Probar arranque/carga secuencial/descarga de modelos en ambas máquinas | M25 | RSS, `memory_pressure`, swap, latencia, tokens/s, memoria tras `/unload`; fallo si swap sostenido o truncamiento. |
| M27 | Probar pipeline PaddleOCRVL+MLX y testigo Tesseract con cinco páginas sintéticas representativas | M26 | Transcripción, orden, bbox, transformaciones, omisiones, tiempo/página en M1 y MacBook. |
| M28 | Resolver licencia de PyMuPDF y pesos/datasets para uso previsto; escoger motor PDF aprobado | M27 | Registro de licencia, versión, restricciones y alternativa; revisión jurídica si corresponde. |
| M29 / G4 | Revisar viabilidad técnica y privacidad antes de construir el núcleo | M21–M28 | Aprobación humana de resultados o cambio de diseño. Ningún expediente real. |

## Etapa D — núcleo documental deterministic-first

| Paso | Acción serial | Entrada | Salida y condición de cierre |
|---|---|---|---|
| M30 | Implementar modelo de caso y máquina de estados (`imported→parsed→policy_ready→reviewed→approved→exported→verified`) | G4 + specs | Transiciones atómicas, inválidas rechazadas, auditoría sin PII y pruebas unitarias. |
| M31 | Implementar almacén de originales inmutables lógicos, hash, permisos y copias de trabajo | M30 | Original no cambia tras parse/export/fallo; fixture y hashes. |
| M32 | Implementar inventario de PDF: páginas, texto, imágenes, capas OCR, metadatos, formularios, adjuntos, firmas, QR/barras | M31 | Informe por objeto, casos mixtos y errores explícitos; ningún canal ignorado silenciosamente. |
| M33 | Implementar registro canónico de bloques con coordenadas, transformaciones, motor y confianza | M32 | Bbox y texto reversibles a página de origen; si geometría indeterminada, estado de revisión. |
| M34 | Conectar OCR/layout como adaptador sustituible; no otorgar decisión de exportación al modelo | M33 | OCR de PDFs/fotos sintéticos, motor/version/hash y errores trazados. |
| M35 | Implementar corrección humana del OCR con historial de revisiones | M34 | Texto privado corregible sin mutar original ni perder procedencia. |
| M36 | Implementar políticas tipadas por persona/rol/dato/contexto/audiencia/lugar/fecha | M35 | Reglas serializables, versionadas y validadas; conflictos bloquean. |
| M37 | Implementar detección candidata PII (reglas/NER/barcodes) y resolución contextual asistida | M36 | Recall en fixtures, falsos negativos medidos; candidato ≠ censura aprobada. |
| M38 | Implementar preview lado a lado y aprobación explícita de cada decisión según granularidad acordada | M37 | Checklist de página/caso, bloqueo de regiones inciertas, firma y geografías raras. |
| M39 | Implementar vista Markdown privado solo desde bloques canónicos | M38 | Secuencia/orden/tablas/citas/páginas y enlaces de origen reproducibles. |
| M40 | Implementar representación censurada independiente y Markdown público desde ella | M39 | Búsqueda automatizada de centinelas en MD público y frontmatter; privada nunca pasa directa. |
| M41 | Implementar PDF público como derivado testado; OCR final desde la **imagen ya testada** si procede | M40 | Ningún objeto/capa del original sensible llega al público; calidad/accessibilidad medidas. |
| M42 | Implementar verificador independiente: texto, render, objetos, metadatos, adjuntos, QR, nombres, logs, índices | M41 | Informe `PASS/BLOCK` con pruebas reproducibles y revisión visual; no exportar si hay incertidumbre. |
| M43 | Implementar exportación atómica, manifest de procedencia y retención/borrado controlados | M42 | No quedan salidas parciales; correlación de hashes sin revelar PII; restauración y purge verificados. |

## Etapa E — perfiles y modelos como ayudas delimitadas

| Paso | Acción serial | Entrada | Salida y condición de cierre |
|---|---|---|---|
| M44 | Crear interfaz Pi con tools estrechas: `inspect_case`, `propose_redactions`, `review_queue`, `request_export`, nunca shell libre en producción | M43 | Core reautoriza todas las acciones; prueba de input malicioso de documento. |
| M45 | Crear perfil documentalista: exhaustividad, transcripción, anomalías, lagunas y revisión, sin salida pública autónoma | M44 | Escenarios de omisión/tablas/fotos y trazabilidad. |
| M46 | Crear perfil jurídico España: análisis por fuentes y jurisdicción, incertidumbre, alegaciones alternativas, no consejo definitivo | M45 | Evaluación ciega sobre fixtures/casos autorizados, citas verificadas; sin inventar normas. |
| M47 | Crear perfil médico documental: resumen de hechos clínicos y discrepancias, no diagnóstico/tratamiento | M46 | Evaluación clínica supervisada, límites visibles. |
| M48 | Añadir subperfiles SDRC/Sudeck y psiquiatría con evidencias, cronología y contradicciones; revisión especializada | M47 | Casos difíciles y falsos positivos/negativos documentados; ninguna sustitución de facultativos. |
| M49 | Evaluar modelos candidatos y elegir **por tarea y máquina**; documentar degradación/fallback | M48 | Benchmarks locales, licencia, RAM, calidad española, riesgo, revisión humana. |

## Etapa F — adversarial, piloto, publicación controlada

| Paso | Acción serial | Entrada | Salida y condición de cierre |
|---|---|---|---|
| M50 | Crear corpus sintético adversarial: imagen compartida, OCR invisible, QR/PDF417, firma real, foto oblicua, cuasiidentificación, prompt injection | M49 | Fixtures versionados sin PII real, oráculos por canal. |
| M51 | Ejecutar unit/integration/E2E, fuzzing de PDF/política, pruebas de concurrencia y estados | M50 | Reporte reproducible con fallos por riesgo; cero fallos P0/P1. |
| M52 | Revisor independiente intenta extraer centinelas desde PDF/MD, metadatos, capas, objetos y sesiones | M51 | Evidencia negativa de fuga por métodos definidos; límites de cobertura declarados. |
| M53 | Ensayo de red OS, credenciales, perfil Pi, egress, temporales, logs, índices y backups | M52 | Inventario de datos residuales, purga/retención y bloqueo de salidas no autorizadas. |
| M54 | Auditoría de usabilidad: revisar censuras, rol/caso/audiencia, geografía y aceptación de ambigüedad | M53 | El usuario entiende qué se oculta y qué queda; sin botones que aparenten «anonimato garantizado». |
| M55 / G5 | Puerta para piloto con **documentos reales**: consentimiento/finalidad, licencia, seguridad, backup, plan de incidente, revisión profesional | M50–M54 | Aprobación explícita del usuario; si falta, no acceder a originales. |
| M56 | Piloto de alcance mínimo, local y supervisado; no difusión, copia pública solo tras verificación | G5 | Métricas de error, tiempo y fallos; originales intactos. |
| M57 | Corregir divergencias por nuevo change OpenSpec (proposal/specs/design/tasks) y revalidar | M56 | Sin cambios silenciosos de comportamiento. |
| M58 / G6 | Decidir despliegue personal, límites y procedimiento de revisión periódica | M57 | Aprobación humana de versión, hardware, destinatarios y riesgo residual. |
| M59 | Archivar changes en OpenSpec tras verificación, actualizar specs vigentes y entregar manual/handoff operativos | G6 | `openspec validate`, estado limpio, trazabilidad `REQ→SCN→test→evidencia`; sin datos reales en repo. |

## Puertas que un agente NO puede concederse a sí mismo

| Puerta | Qué habilita | Quién la concede |
|---|---|---|
| G0 | Escribir diseño arquitectónico formal | Usuario, tras comparación de enfoques |
| G1 | Escribir archivo de spec de diseño | Usuario, tras revisar diseño por secciones |
| G2 | Inicializar OpenSpec y preparar change/proposal/specs/design/tasks | Usuario, tras revisar la spec escrita |
| G3 | Código, estructura de producto, paquetes y modelos con fixtures **sintéticos** | Usuario, tras revisar plan OpenSpec implementable |
| G4 | Construcción del núcleo según arquitectura y pruebas de viabilidad | Usuario, tras informe de viabilidad/seguridad |
| G5 | Primer acceso a expedientes auténticos | Usuario y revisores pertinentes, tras QA/licencias/seguridad |
| G6 | Operación habitual y archivo del change | Usuario, tras piloto y riesgo residual |

## Plantilla de registro al cerrar cualquier movimiento

```text
Paso: Mxx
Estado: VERIFICADO | BLOQUEADO
Fecha/hora:
Entrada exacta y versión:
Artefactos modificados (rutas absolutas):
REQ/SCN/RISK vinculados:
Prueba/observación EV-xxx (comando, hash, captura o informe):
Resultado esperado / real / diferencia:
Riesgo residual:
Siguiente paso permitido:
Puerta humana pendiente:
```

**Criterio de handoff:** otro agente debe poder encontrar el último `Mxx` verificado, las evidencias y la siguiente puerta leyendo solo `HANDOFF.md`, este plan y los artefactos OpenSpec. Si no puede, la tarea precedente no está cerrada.
