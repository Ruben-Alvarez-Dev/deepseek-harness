# Índice del expediente — auditoría y planificación SOTA (2026-11-02)

**Ubicación:** `/Users/ruben/Code/PROJECTS/DEEPSEEK-harness/audit/2026-11-02-harness/`
**Estructura:**

```
audit/2026-11-02-harness/
├── 00-INDICE.md            ← este índice
├── auditorias/             ← 00-INFORME · 01-INVENTARIO · 02-MAPA-DSH · 05-FORENSE ·
│                              06-ADVERSARIAL-Y-DEMENTOR · 08-DOSSIER · 14-AUDITORIA-LINEA-POR-LINEA
├── investigaciones/        ← 03-SOTA · 04-ITEM-POR-ITEM · 07-ESTUDIO-ADOPCION · 09-HANDOFF-SOTA ·
│                              10-FRONTERA · 16-ESTRATEGIA-NCM-JEV
│   ├── dossier-anillos-2026-10-25/   ← copia íntegra del dossier QWEN (con LEEME.md)
│   └── fuentes/                      ← descargas reales de papers/docs/repos (con DESCARGAS.md)
├── planificacion/          ← 12-PROPUESTA · 13-PLAN-SOTA-DSH · 15-PLAN-MAESTRO-OPENSPEC
│   └── original/           ← tus 4 planificaciones rescatadas (con LEEME.md)
├── referencias/            ← 17-BIBLIOGRAFIA (autores + URLs)
├── rescate/                ← bundle del router + repo clonado + D-revision (con LEEME.md)
└── 18-NOTAS-TRABAJO.md
```
**Orden de lectura recomendado:** 00 → 14 → 12 → 13 → 15 → 17, con 01–11 y 16 como anexos de evidencia.

| # | Fichero | Qué contiene |
|---|---|---|
| 00 | `00-INDICE.md` | Este índice |
| 01 | `00-INFORME.md` | Auditoría consolidada del pack PI-agent (ronda 1): severidades, lo que funciona, correcciones, esfuerzo |
| 02 | `01-INVENTARIO-CONSOLIDADO.md` | Las ~60 mejoras del dossier QWEN normalizadas con estado y evidencia |
| 03 | `02-MAPA-DSH.md` | Correspondencia Pi → DSH verificada contra el código |
| 04 | `03-SOTA-Y-RECOMENDACION.md` | Contraste externo de los candidatos + análisis conjunto |
| 05 | `04-AUDITORIA-ITEM-POR-ITEM.md` | Las 60 filas con disposición adoptar/ya-existe/no-aplica/rechazar |
| 06 | `05-FORENSE.md` | Arqueología git: material borrado/sepultado, qué se recupera y con qué comando, qué se perdió |
| 07 | `06-ADVERSARIAL-Y-DEMENTOR.md` | Ataques al diseño/seguridad/proceso + escepticismo absoluto + correcciones propias |
| 08 | `07-ESTUDIO-ADOPCION.md` | Estudio de qué adoptar en DSH (2 adopciones de 60) |
| 09 | `08-DOSSIER.md` | Auditoría del dossier QWEN: clave en `d1.db`, caducidad, contradicciones v5↔S1-S4 |
| 10 | `09-HANDOFF-SOTA.md` | Handoff entre ecosistemas (DSH, pi, opencode, Claude Code, Amp): matriz y veredicto |
| 11 | `10-FRONTERA-INVESTIGACION.md` | Laboratorios, academia, startups y GitHub: carrera de memoria 2026, survey, replicas |
| 12 | ~~`11-CORTEX-PIMEMORY-MCP.md`~~ | **Migrado** el 2026-11-05 a `/Users/ruben/Code/JARTOS/Jart-CORTEX/audit/2026-11-02-cortex/03-LINAJE-MEMORIA.md` (cortex fuera del alcance de DSH) |
| 13 | `12-PROPUESTA-INTEGRACION.md` | Propuesta de integración: anillo de negociación + memoria pasiva híbrida |
| 14 | `13-PLAN-SOTA-DSH.md` | Plan maestro de optimización DSH (20 mejoras, 7 frentes, fases con gates) — **documento de decisión** |
| 15 | `14-AUDITORIA-LINEA-POR-LINEA.md` | Fusión de los pases línea a línea (pi-memory 6,5k, seams DSH 14,7k; cortex migrado a su repo) |
| 16 | `15-PLAN-MAESTRO-OPENSPEC.md` | **La planificación ejecutable**: 27 changes OpenSpec serializados con gates |
| 17 | `16-ESTRATEGIA-NCM-JEV.md` | Estrategia NCM (Next-Concept Modeling) y Jev: sustitutos libres locales |
| 18 | `17-BIBLIOGRAFIA.md` | Todas las fuentes con autores y URL, ordenadas por categoría |
| 19 | `18-NOTAS-TRABAJO.md` | Notas de trabajo de la ronda 1 (histórico) |
| 20 | `19-HANDOFF.md` | **Handoff para la siguiente sesión**: estado, decisiones pendientes, próximo paso |

**Relación entre documentos:** 01–12 son la evidencia; 13–15 son las decisiones; 17 es la trazabilidad de fuentes. El plan ejecutable es 15. **cortex queda fuera del alcance desde el 2026-11-05**: su evidencia y su plan viven en `/Users/ruben/Code/JARTOS/Jart-CORTEX/audit/2026-11-02-cortex/`.

**Estado:** expediente cerrado en F0 (2026-11-06) y pendiente de versionar (CH-012 del plan). Todo lo afirmado lleva evidencia `fichero:línea` o comando ejecutado, salvo lo marcado `sin-verificar` en cada informe.
