# L5 — Capturar y reutilizar experiencia: propuesta documental corregida

**Adenda 11-oct-2026:** sustituye los presentes y las garantías de la nota de 10-oct. No existe EWMA v3 implementada, sombra operativa ni dataset de entrenamiento acumulándose automáticamente en pi-account-router. El change `episode-memory-reuse` sigue **solo documental**; no se activa por esta revisión.

## Tres mecanismos distintos

| Nivel | Qué cambia | Viabilidad y límite |
|---|---|---|
| A. Pesos | Un entrenamiento modifica un modelo | Proyecto separado y no ejecutado. No tenemos pesos ni una API de fine-tune documentada de Agnes. Esto no se demuestra por citar una cláusula genérica de ToS |
| B. Contexto | Episodios/lecciones recuperados se añaden como datos al prompt | Propuesta opt-in; no cambia pesos. Sin controles, puede persistir errores, secretos o prompt injection |
| C. Estadística | Métricas medidas alimentan el selector | Candidato, no EWMA existente. Las 72 simulaciones nuevas no mostraron mejora del desempate por latencia/affinity en el workload congelado |

No llamar «SOTA más rentable» a B sin comparar beneficios y coste. No llamar «gratis» a inferencia, almacenamiento, etiquetado o entrenamiento: consumen CPU/RAM/tokens/tiempo y revisión.

## Anclas bibliográficas y límites

Referencias históricas del índice `papers/00-index.md`, no nueva replicación:

| Referencia | Patrón útil | Qué no demuestra |
|---|---|---|
| Reflexion P10 | Feedback verbal y memoria sin gradiente | Que el feedback sea verdadero o seguro |
| ReST/RLVR P13, DeepSeek-R1 P26 | Aprendizaje con señal de evaluación y pesos accesibles | Que un npm exit=0 dé una recompensa semántica válida |
| Voyager P18 | Biblioteca reutilizable de skills | Seguridad/corrección universal de código almacenado |
| ExpeL P19 | Insights de experiencias sin fine-tune | Generalización a este coding loop sin corpus objetivo |
| MemGPT P24 / Generative Agents P21 | Memoria por capas y retrieval | Ausencia de poisoning o coste óptimo |
| Self-RAG P20 / STaR P22 | Entrenamiento/refinamiento de datos | Implementación aquí ni permisos para entrenar Agnes |
| RAG P23 / Claude memory S10 | Consumo de memoria/contexto | Garantía de entailment o veracidad |

Contraste renovado: `../../../DOCS-HARNESS/E-investigacion-verificacion/03-informe-de-investigacion/03-03-COMPARACION-ARQUITECTONICA-ROUTER-VERIFICACION.md`. Dos Research exhaustive y primarias consideran memoria tipada, privacidad, oráculos y límites; sus cifras autorales no son resultados locales.

## Captura mínima propuesta

Un episodio no es un transcript completo ni chain-of-thought. Solo campos allowlisted:

```text
task_family, project_scope, failure_class,
deterministic_observation, receipt_refs,
validated_fix, expiry, provenance
```

- Solo recibos realmente observados; mantener diferencia entre check-pass y corrección del artefacto.
- No autoetiquetar un dataset a partir de prosa del propio agente. Un test visible se puede manipular; el evaluador/scope/oráculo requieren protección para garantías fuertes.
- No API keys, PII, argumentos/logs íntegros o instrucciones libres. Memoria como **dato no confiable**, nunca autoridad que modifique gates.
- Namespace por proyecto, TTL, retención/borrado, dedupe, presupuesto K/tokens e inyección opt-in.
- Holdouts separados: una lección del test confirmatorio no puede contaminar desarrollo.
- Evaluar ahorro de intentos y coste total frente a baseline sin memoria; no asumir ROI por tener retrieval.

## Colocación y puertas

Inferencia local autorizada únicamente en **Mac mini y dos VPS**, no MBP. El Mac mini no estaba disponible; r1 tiene un modelo ya servido y fue evaluado con 24 fixtures pequeños. No se entrenó/descargó modelo ni se alteró servicio/KV/contexto. bge-m3 es un embedder, no un juez chat.

El piloto `pi-claim-gate` A0 existe, pero no ofrece extracción general de claims, snapshots/runner/ledger protegidos ni store de episodios. No satisface por sí solo todas las puertas de `episode-memory-reuse`. Sigue pendiente acordar esquema semántico, oráculo, aislamiento/privacidad, retención e inyección antes de implementar memoria. La distinción A0/A1/A2 no depende de cuántos jueces se invoquen.
