# Pase adversarial + Dementor

**Fecha:** 2026-11-02 · **Protocolo:** `/auditoria-dev` §2 · **Objeto:** el pack PI-agent completo y los hallazgos de las rondas anteriores.
**Regla:** aquí no se corrige nada; solo se producen findings. El veredicto integrado está en `00-INFORME.md`.

---

## A · Adversarios

### A1 · Adversario de diseño — «la conclusión del estudio es cómoda»

**Ataque:** concluir que «el plan no transfiere a DSH» puede ser pereza disfrazada de rigor. Si DSH aceptara el criterio de pureza del anillo-0 como gate, ¿no mejoraría?

**Contra-ataque con evidencia:** DSH ya separa por capability seam y tiene `packages/util` como capa cero-dependencias; lo que el anillo-0 aportaría es un **lint de importación transitiva**, que DSH no tiene. Pero el coste de un gate así sobre 100+ paquetes no está presupuestado en el dossier y su beneficio no está medido. **Finding:** la conclusión se sostiene, con una matización: *existe un posible gate de pureza que no se ha evaluado en coste*.

### A2 · Adversario de diseño — «los anillos resuelven algo que DSH sí tiene»

**Ataque:** DSH tiene un problema real de acoplamiento: `docs/architecture.md` es un mapa de 65 líneas para 100+ paquetes. La extracción por anillos de Pi es en el fondo una **taxonomía de dependencias**. ¿No sería útil una versión para DSH?

**Evidencia:** DSH ya genera `docs/module-graph.md` y tiene `verify-package-invariants`. **Finding:** el dolor que el dossier resuelve ya está cubierto por generadores; no hay caso.

### A3 · Adversario de seguridad — «el pack se audita, pero el pack está vivo»

**Ataque:** auditar PI-agent es inútil si el riesgo operativo sigue activo mientras se escribe el informe.
**Evidencia (rondas previas, ejecutada):**
- `pi-jart-ura` corre con **3 LaunchAgents cargados** que apuntan dentro del repo, contra la norma de la casa.
- Duplica credenciales: `.env` con 7 claves `sk-` junto al keychain y `~/.pi/agent/auth.json`.
- El perfil desktop de DSH corre con `danger-full-access`.
**Finding:** hay riesgos vivos que no esperan al informe. Prioridad de remediación: rotar/duplicar credenciales y decidir los LaunchAgents.

### A4 · Adversario de seguridad — «el dato más grave no está en el código»

**Ataque:** la auditoría anterior de la casa (`audit-2026-10-28`) documentó una **fuga entre proyectos** de `pi-memory:recall` inyectando memorias de otro proyecto. Es el único defecto de confidencialidad reproducido en vivo.
**Evidencia:** el informe lo declara y el plan 062 lo remedió… en código **nunca commiteado ni existente en disco** (`05-FORENSE.md` §7).
**Finding:** el defecto vivo está **sin remedio**: el fix se perdió. Severidad máxima del pack.

### A5 · Adversario de calidad — «las cifras del dossier no están re-ejecutadas»

**Ataque:** el dossier declara cifras (526 tests, 72 % de código sin consumidor, 11 caminos de mutación). Se han verificado **algunas** (526 exacto, 97 ficheros), no todas.
**Finding:** el estudio usa cifras del dossier marcadas `[V]` sin re-ejecutar el 100 %. Debe declararse como límite, no como hecho propio.

### A6 · Adversario de proceso — «la casa se audita a sí misma y gana»

**Ataque:** la casa Pi exige «un solo sitio por hecho», «todo cambio se apunta» y «números antes que adjetivos». Las cuatro planificaciones convivieron **sin que ninguna mandara**, y tres de ellas fueron **purgadas**.
**Evidencia:** E-020 y E-022 borraron 1.428 ficheros (204 + 1.224) en dos commits de limpieza; el expediente tiene 27 entradas ausentes.
**Finding:** el problema no es la calidad de las propuestas, es que **el proceso no conserva sus propias decisiones**. Borrar «lo obsoleto» destruyó la trazabilidad de por qué se decidió.

### A7 · Adversario de proceso — «el informe también será otro documento huérfano»

**Ataque:** este mismo expediente nace en `audit/` de un repo ajeno (DSH), fuera de git, sobre otro repo (PI-agent), también fuera de git en partes clave. Si nadie lo versiona, en 15 días es el quinto plan enterrado.
**Finding:** el expediente debe versionarse o declararse explícitamente como efímero. Es el riesgo más probable de todos.

---

## B · Dementor — el escéptico absoluto

Asume que todo lo anterior es falso. Busca falsos positivos y falsos negativos **del propio equipo**.

| # | Sospecha | Resultado |
|---|---|---|
| D1 | «`pi-intermediate` tiene 0 consumidores» es **falso como afirmación absoluta**: en HEAD lo consumía `pi-memory`, y está en el historial | **Falso positivo confirmado.** Correcto solo del árbol de trabajo actual. El informe debe decir «0 consumidores *en el árbol actual*» y precisar que `pi-memory` está borrado sin commitear |
| D2 | «Los tests están perdidos» | **Falso positivo descartado**: 81 ficheros / 9.057 líneas recuperables, verificado por conteo |
| D3 | «El bundle del router es la única copia» | **Se sostiene con matiz**: el README lo dice y `git bundle verify` confirma que está completo; que sea *la única* copia es una afirmación del propio repo, no verificada contra el resto del disco |
| D4 | «El plan de anillos es irrelevante para DSH» | **Parcialmente falso**: 2 ítems útiles (redacción por defecto, pin de integridad) + 1 lección de proceso. Decir «irrelevante» sería sobreactuar |
| D5 | «La fuga entre proyectos sigue viva» | **No verificado en esta sesión**: se apoya en el informe `audit-2026-10-28`, no en una reproducción propia. Debe marcarse como `sin-verificar` |
| D6 | «E-020 borró 526 tests» | **Verificado exacto** (474 estáticos + 52 por `it.each`). El dossier tenía razón |
| D7 | «El dossier QWEN es una fuente fiable» | **Falso en parte**: es un análisis no versionado, con referencias muertas y cifras no re-ejecutadas. Se usó como fuente, no como verdad |
| D8 | «La documentación de DSH está sana» | **Falso**: los gates de docs fallan en el árbol actual (`docs/plugins.md` wrap, `README`/`architecture` desincronizados de su pareja i18n). Es preexistente a este trabajo, pero es un hallazgo |
| D9 | «El informe final no sesga hacia lo que ya pensábamos» | **Riesgo real**: el estudio empezó buscando «qué adoptar» y terminó en «casi nada». La simetría de la conclusión (2 adoptar / 7 ya existe / 45 no aplica) es defendible, pero conviene que un lector independiente revise la tabla ítem por ítem |
| D10 | «Recuperar el material es seguro» | **No del todo**: `git restore src/pi-memory` restaura 97 ficheros sobre un árbol que los tiene borrados a propósito. Requiere decisión del dueño, no ejecución automática |

---

## C · Correcciones a los propios auditores

1. **Conté mal los consumidores** de `pi-intermediate` (D1). Corregido en el veredicto.
2. **Di por muerta la interacción compactación/injected** en DSH y era falsa: existe test (`manual-compaction.spec.ts:288-317`). Corregido en `03-SOTA-Y-RECOMENDACION.md`.
3. **Afirmé que la documentación del estudio estaba en PI-agent y luego en `docs/` de DSH**: las dos ubicaciones eran incorrectas; la definitiva es `audit/2026-11-02-harness/` en el workspace de DSH.
4. **No ejecuté el protocolo `/auditoria-dev`** en el primer pase; esta ronda lo corrige.

---

## D · Estimación de esfuerzo de remediación (honesta)

| Frente | Trabajo | Rango |
|---|---|---|
| Decidir el árbol de PI-agent (97 borrados + 4 untracked) | Una decisión, no código | **1 h** (decisión) |
| Versionar el expediente de anillos y este informe | `git add` + entrada E-NNN | **1–2 h** |
| Extraer material recuperable a un directorio de rescate | Comandos ya listados | **2–4 h** |
| Reversionar los 526 tests y volver a poner un gate | Restaurar + runner + CI | **2–5 días** |
| Remediar la fuga entre proyectos (change 062 perdido) | Reescribir lo que se perdió | **1–2 semanas** |
| Decidir `pi-jart-ura` (entra, se archiva o se apaga) | Aplanar + LaunchAgents + credenciales | **2–5 días** |
| Rellenar E-031…E-057 | Reconstruir desde commits | **1–2 días** |

Rango global: **3–6 semanas** para dejar el pack en estado defendible. No es «solo-dev optimista»: el frente de la fuga es el que domina.
