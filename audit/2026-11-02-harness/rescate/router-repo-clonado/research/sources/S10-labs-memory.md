# S10 — Productos de memoria de labs (nuevo, 2026-10-10)

- **Claude memory tool** — V hoy (200), https://docs.claude.com/en/docs/agents-and-tools/tool-use/memory-tool
  - El lab productiza el **nivel B**: una memoria persistente que el propio modelo **lee/escribe y consume** en runs futuros. Es la prueba industrial de que "captar y reusar lo aprendido" es SOTA ya implementado en producto.
- **OpenAI memory (ChatGPT)** — **N** (no re-verificado hoy: `help.openai.com` devuelve 403 a bots; la página existe).
  - El lab opuesto hace lo mismo: guardar preferencias/contexto de sesión para reutilizar.
- **SOTA-relevante para L5:** los dos labs convergen en **memoria persistente por contexto (B)**, no en pesos. El nivel **A** (entrenar un juez local con RLVR sobre el dataset de triplas) es lo que **ningún** producto público ofrece a este usuario → es la extensión genuina que añade valor al bloque.

