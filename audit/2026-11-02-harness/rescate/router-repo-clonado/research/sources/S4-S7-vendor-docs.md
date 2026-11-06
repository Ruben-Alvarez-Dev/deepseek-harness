# S4–S7 — Documentación de vendors (URLs verificadas hoy, 2026-10-10)

- **S4** Anthropic — *Building our multi-agent research system*
  https://www.anthropic.com/engineering/multi-agent-research-system (200)
  - Dato duro: orquestar subagentes multiplica **~15× tokens** vs chat; **+90.2% = win-rate vs un agente único Claude Opus 4 en la eval interna de investigación de Anthropic** (verificado en el texto de la página hoy; no aplica a ejecución); "para trabajo con efectos, la **verificación** es el multiplicador de ROI"; subagentes = exploración **lectora**.
  - Aprovecha estas líneas: L3, L4 (el SOTA de "2 pares" es orquestador+verificador, no espejo siempre-activo).
- **S5** Anthropic — *Building effective agents*
  https://www.anthropic.com/research/building-effective-agents (200)
  - "Complejidad mínima que funciona; workflow > agente". Base para descartar la dualidad permanente (L4).
- **S6** Anthropic — *Prompt caching* (docs oficiales)
  https://docs.claude.com/en/docs/anthropic/caching (200)
- **S7** OpenAI — *Prompt caching* (docs oficiales)
  https://platform.openai.com/docs/guides/prompt-caching (200)
  - Aprovecha estas líneas: L2 (mecanismo de cacheo de prefix; en Agnes el tier "entrada cacheada" a 0 USD lo hace **probable**, no demostrado).

