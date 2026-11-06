# Meta-auditoría: ¿cada elemento y el bloque completo conforman el verdadero SOTA?

Fecha: 2026-10-10. Método: cada elemento se volvió a verificar **hoy** contra su campamento (universidad, labs, empresa, dev), y el conjunto se comprueba por coherencia global. Estado: **V** = verificado hoy (arXiv API / URL / repo local de Pi), **N** = por título/venue sin re-verificar, **H** = hipótesis.

## 1. Por elemento

| Elemento | Campamento SOTA | Fuente(s) | Veredicto |
|---|---|---|---|
| **Menor presión de cuota** (ya implementado) | Universidad: RouterBench P3, CARGO P2 | `docs` + P2/P3 V | **Conforme.** No aplica a 4 claves del mismo modelo/coste → heurístico, y eso es lo que SOTA prescribe (P1 inaplicable por carencia de coste diferencial). |
| **L1: EWMA latencia por cuenta** | Empresa/industrial: **LAD** (Facebook, NSDI'20, S3c-N) es el LB aware de latencia a gran escala; **hedged requests** (Google, NSDI'15, S3-N) es el SOTA de cola | S3/S3b/S3c + medido `docs/performance.md` | **Conforme con matiz:** con 4 recursos, EWMA+colas es la aproximación estándar; LAD (regresión online de latencia) es el SOTA para **cientos** de recursos — se documenta como referencia, no como requisito. **EWMA = SOTA-práctico; LAD = SOTA-escala.** |
| **L1: hedge pre-output opt-in** | Empresa: Kulkarni et al. NSDI'15 (S3-N, URL usenix no re-verificada hoy: 404) | S3 + S1 (ToS §5.4) | **Conforme**, con guardrail ToS correcto (el hedge **gasta** 2 slots, no los elude; §5.4 prohíbe eludir). |
| **L2: sin margen monetario** | — (hecho del proveedor, no SOTA global) | S1 (medido 2026-10-10: 0 USD entrada/salida/cacheada en flash) | **Conforme y honesto:** el límite es del dominio (gratis), no del arte. El techo es RPM (medido), ya maximizado. |
| **L3: sombra selectiva = gate de riesgo → verificador determinista → 1 regeneración** | Universidad: ReST P13 V, TRAM P14 V, CARGO P2 V, MT-Bench sesgos P12 V. **Refuerzo nuevo hoy**: P25 (OpenAI, "LLMs no pueden autocorregirse razonamiento aún" V) + P27 (survey autocorrección V) + P28 (CRITIC, NAACL'24, **N**: cita por venue; no encontrado en arXiv API hoy) | P2/P12–P14/P25/P27/P28 | **Conforme y ahora más fuerte:** la evidencia P25/P27 cierra el debate — **autocorrección sin señal externa NO mejora (peor incluso)**; con verificador externo SÍ. Esto valida exactamente el diseño L3 (verificador determinista + regeneración, no "juez LLM libre"). |
| **L4: "2 pares siempre" = retraso; selectivo = evolución** | Labs: S4/S5 (S4 **re-verificado hoy en la página**: 90.2% = win-rate vs single-agent Claude Opus 4 en su eval interna de investigación; 15× tokens confirmado en el texto). Dev: llm-council (S9, V) | S4/S5/P4/P14 | **Conforme.** El único dato de S4 se matizó (es win-rate en eval interna, no "90% de mejora universal"). |
| **L5: capturar→guardar→reutilizar** | **Este era el hueco global; hoy cubierto.** Universidad: **Voyager P18** (skill library — reusar código aprendido), **ExpeL P19** (experiencias→insights sin fine-tuning), **Self-RAG P20** (retrieval+crítica auto-entrenada), **Generative Agents P21** (memory stream+reflexión, Stanford), **STaR P22** (bootstrap con datos auto-generados), **RAG P23** (reutilización por retrieval), **MemGPT P24** (jerarquía de memoria). Labs: **DeepSeek-R1 P26 V** (RLVR = el campamento de entrenamiento SOTA del 2025), **Claude memory tool S10 (200 hoy)**, OpenAI memory (help.openai.com 403 a bots → marcado **no re-verificado**). Dev: nanochat/autoresearch/llm-council (S9, V) | P18–P24, P26, S10, S9 | **Conforme tras añadir el campamento de memoria.** Mi L5 original solo citaba P10/P13 + S9: era "SOTA de inferencia" pero **no** el SOTA de "guardar y reutilizar experiencia", que es Voyager/ExpeL/MemGPT. Ahora sí. |

## 2. Correcciones aplicadas hoy (diff del bloque)

1. **Papers: +11 IDs nuevos verificados hoy** (P18–P28 + S10), 1 marcado **N** (CRITIC, NAACL'24).
2. **Landscape §2.2:** LAD (S3c) añadido como referencia de escala; nuestro EWMA etiquetado "SOTA-práctico".
3. **Landscape §3:** línea nueva "autocorrección sin señal externa no funciona (P25/P27/P28)" → refuerza L3 y descarta "juez LLM libre".
4. **Landscape §6:** tabla del campamento de memoria/experiencia (P18–P24 + S10 + P26).
5. **L3:** evidencia P25/P27/P28 añadida; familia RLVR→ReST→TRAM trazada.
6. **L5:** tabla SOTA de "guardar y reutilizar" añadida; el diseño B (episodios + inyección) queda anclado en ExpeL/Voyager/MemGPT; el diseño A (juez local) en P26/ReST + nanochat (S9).
7. **S4 (Anthropic):** +90.2% corregido a "win-rate vs single-agent Claude Opus 4 en eval interna de investigación" (verificado en el texto de la página hoy); 15× tokens confirmado en el texto.

## 3. A nivel global: ¿conforma el "verdadero SOTA"?

**Sí, con una matización importante.** El bloque cubre los 4 campamentos y es consistente en cadena (L1 selecciona → L3 verifica/selecciona el gate → L5 guarda/reutiliza; L4 fija la arquitectura; L2 cierra coste):

- **Universidades** (UCB/Stanford/CMU/MIT/UIUC/UIUC-Adobe): self-consistency, debate, Reflexion, MoA, TRAM, MemGPT, Generative Agents, Voyager, ExpeL, STaR, RAG, Self-RAG, ReST (DeepMind), Heterogeneous Swarms, RouteLLM/RouterBench/CARGO.
- **Labs** (OpenAI/Anthropic/Google/DeepSeek/Meta): multi-agent S4, effective-agents S5, caching S6/S7, "no self-correction" P25, MT-Bench P12, DeepSeek-R1 P26, hedged/SRE/LAD (Google/Facebook).
- **Empresas** (OpenRouter, vLLM, SGLang): routing de proveedor S2, PagedAttention P5, RadixAttention P7, SpecInfer P6.
- **Dev** (karpathy + comunidad): nanochat/autoresearch/llm-council/micrograd/llm.c (S9), SGLang es híbrido lab/dev.

**Matiz honesto (lo que este bloque NO es):**
1. **SOTA es relativo al dominio**: 4 claves de **un mismo proveedor y modelo, gratis, 10 RPM/clave** (medido S1). El SOTA global de routing (RouteLLM etc.) presupone **costes y calidades diferenciados entre modelos**; aquí no hay diferencia → el heurístico "presión de cuota" es la forma SOTA *vacia* de esos trabajos para nuestra restricción. **SOTA-en-contexto, no SOTA-absoluto.**
2. **A nivel de pesos, el SOTA absoluto de "aprender y reutilizar" (RLVR, P26) lo hacen los labs con sus pesos; nosotros no podemos.** Nuestro SOTA absoluto alcanzable = **B (experiencia reutilizable vía prompt) + C (estadística del router)**, y el **A local** (juez pequeño) como extensión — que es exactamente lo que el bloque dice.
3. **Mediciones de 4 muestras** (`docs/performance.md`): suficiente para detectar outlier (8×), **insuficiente para p95/SLO** (decido documentado en `docs/performance.md`). El bloque no afirma SLO.
4. **CRITIC (P28)** y **OpenAI memory** están marcados **N** (no re-verificados hoy) — el bloque no se apoya en ellos, son refuerzos opcionales.

## 4. Falta "perfección" documentada (pendiente solo si se implementa)
- Esquema exacto de episodio (JSON) y política de retention/dedupe de L5-B.
- Umbral EWMA de L1 (λ, frío, castigo) → se calibra en la implementación, no aquí.
- Gate de riesgo de L3 (señal CARGO vs. señal "el paso ya falló") → decisión de diseño.
