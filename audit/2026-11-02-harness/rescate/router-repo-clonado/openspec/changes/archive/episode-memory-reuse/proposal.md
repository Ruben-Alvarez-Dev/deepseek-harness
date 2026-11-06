# Episodic learning reuse (nivel B), documentado — DOCUMENTAL SOLO

## Why
El usuario pidió documentar (sin implementar) cómo captar, guardar y reutilizar lo que el sistema
adversarial/verificador va aprendiendo, al SOTA de universidades, labs, empresas y dev
(`research/lines/L5-learn-and-reuse.md`, `research/analysis/meta-audit-sota.md`). El SOTA de
"reutilizar experiencia" es el campamento **Voyager/ExpeL/MemGPT/Self-RAG/STaR (P18–P24)** más
el producto **memory tool (S10)**: episodios etiquetados por verificador → retrieval → inyección
al contexto. La pieza de captura (triplas de datos) ya existe como L3 (verificador determinista +
regeneración selectiva); esta documentación completa la cadena.

## Scope gate: documental
- **Sí:** propuesta, requisitos OpenSpec, diseño (esquema de episodio, retention, retrieval,
  inyección vía el hook estándar `before_agent_start` de Pi S9), métricas de aceptación.
- **No (queda pendiente, decisión posterior):** ningún cambio en `src/`, `tests/`, README ni
  estado compartido. Tasks quedan pendientes salvo las de documentación.

## Measurable acceptance criteria (de este change documental)
1. `openspec validate episode-memory-reuse --strict` pasa con los requisitos nuevos.
2. El diseño especifica: esquema JSON de episodio, política de retention/dedupe, política de
   inyección (top-K, presupuesto de tokens, opt-in por sesión), y su anclaje en SOTA (P18–P24,
   P25/P27, S10, S9-hook, L3).
3. Cero diferencias en `src/`, `tests/` ni ficheros de estado tras este change.

## Unresolved prerequisites (bloquean la implementación futura, no esta)
- Gate de L3 activado (necesario para producir episodios etiquetados con veredicto).
- Aprobación de formato y ubicación del store privado (`~/.pi/agent/…`, 0600, sin secretos).
- Decisión top-K / presupuesto de tokens y comando de activación (`/router-memory on|off`).
- ToS S1 §8.2 (uso de datos) y privacidad: el episodio solo contendría campos redactados.
