# D-REVISION 02 — Revisión a fondo: ¿la estructura es la correcta o hay que adoptar otra?

> **Objeto (tal como se pidió):** revisar **a fondo** (1) las piezas que ya tenemos,
> (2) lo que dice la investigación SOTA, y (3) la base del autor — y decidir si la
> estructura candidata (D-01) es la correcta o hay que **adoptar una mejor**.
> **Entradas:** `D-revision-00` (análisis de cobertura), `D-revision-01` (plan
> candidato), `CANON-pi-agent` (reviews 12 y 14, HANDOFF), `B-metodologia-arsenal`
> (recursos), y la lectura directa del clon upstream (`A-referencia/`).
> **Regla:** todo lo que aquí se concluye viene con fuente; lo medido, medido hoy
> (418/418; el estado de L0/CORTEX se toma de `reviews/14` [medido 2026-10-09]).

## 1. Qué se compara

- **Nuestras piezas** (lo que existe): `pi-intermediate`, `pi-memory`,
  `pi-agnes-router` (3 cajas, 418 pruebas) + la carpeta reservada `pi-harness/`.
- **La base del autor** (lo que no se toca): `agent` (motor + huecos), `ai`
  (proveedores y "menú" virtual), `coding-agent` (superficie de extensiones),
  `durable` (otro harness: reanudar + estado propio).
- **La SOTA** (lo que se ha hecho de mejor en el mundo, con las fuentes de
  `reviews/14` y el anexo A de la misma): routers por petición de los productos,
  esfuerzo adaptativo por paso (investigación), reanudación durable, y la
  ausencia general de "diario de decisiones".

## 2. Lo que dice la SOTA (síntesis con fuentes)

| Hecho SOTA | Fuente | Qué implica para nosotros |
|---|---|---|
| **Routers por petición ya es el estándar de producto** (Cursor, Copilot, Azure, AWS, OpenRouter): un clasificador elige modelo/esfuerzo **por petición**, con modos coste/calidad | `reviews/14` §A.3 | Nuestra centralita ya **es** un router por petición (cupo, no calidad): encaja; el "menú virtual" del autor es el vehículo oficial para el día en que queramos enrutado por **calidad** (E3, research) |
| **Ningún producto deja que el modelo decida su esfuerzo con una herramienta**; el que lo hace (ARES, Sonata, SelfBudgeter) es investigación con −20…−60 % de tokens | `reviews/14` §A.4 | El esfuerzo adaptativo es **research tras S3/S6**, no del harness inicial (V2/E2/E3: research) |
| **Cambiar de esfuerzo del mismo modelo conserva la caché; cambiar de modelo la pierde siempre** (Anthropic/OpenAI) | `reviews/14` V2/V4 | La **regla de cambio** (V2: cambiar solo si el ahorro de los próximos turnos supera el coste de reescritura) es la que debe vivir en el supervisor; es política, no heurística |
| **Reanudación + estado propio + caja de entrada "si está ocupado"** es lo que trae el harness durable del autor (commit-antes-de-mostrar, `requestId` idempotente, inbox steer/follow/reject, reset con nota) | `durable/README` + `spec.md` | El **nuestro `control/` debe adoptar 4 patrones suyos** (ver §4) — es el "adoptar lo mejor" de esta revisión |
| **No existe en producto ni en el harness del autor un "diario de decisiones" (PDP journaled + saga + replay)** | `reviews/12` (S3) + `durable/spec` (ausencia) | Es **nuestra** pieza (la que falta en todos lados): ventaja propia, no de compra |

## 3. Las opciones de estructura (y su veredicto)

| Opción | Qué es | Veredicto | Por qué |
|---|---|---|---|
| **A — Componer el motor (`agent`) + nuestras 3 cajas + `control` + `supervisor` + perfiles + examen** (plan candidato D-01) | "Lo que el autor deja en huecos, nosotros lo rellenamos por dentro" | ✅ **CORRECTA** | El motor es estable y documentado (huecos = exactamente lo que nos hace falta: `A-referencia/02`). No reescribimos el bucle. Las 3 cajas ya están (418/418). La SOTA no obliga a otro base |
| **B — Hacer de `durable` la base del harness** | Montar el runtime sobre el otro harness del autor | ❌ **Rechazada como base** | Es **experimental** ("la API cambia sin aviso"), no trae el diario de decisiones, y su storage **no tiene candado entre procesos** (limitación literal) — justo lo que nuestro estado compartido **sí** tiene (centralita). Sí **se roba lo mejor** (los 4 patrones, §4) |
| **C — Forkear `coding-agent`** | Tomar el producto entero y modificarlo | ❌ **Rechazada** | El autor se mueve a diario (6 versiones/semana); cada fork es una guerra de sincronización. Su propia doc dice "compón, no demueles" |
| **D — Quedarnos en modo extensión (sin runtime)** | Todo "por fuera", como hoy | ❌ **Insuficiente** | Unas extensiones no pueden **gobernar** (decidir con reglas, comparar libros, reprodecirse): la Ronda 5 (reviews/12) lo dijo: **"control antes que nada"**. Sin runtime no hay conserje |

**Conclusión de estructura: la candidata (A) es la correcta.** La revisión **no** la
cambia; la **pulida** con 3 adopciones concretas (§4).

## 4. Lo que se ADOPTA de la SOTA / del autor (los 3 ajustes)

1. **El módulo `control/` adopta los 4 patrones de `durable`** (los que el
   harness del autor ya ha depurado) y encima añade lo que `durable` **no** trae:
   | De `durable` (se roba el patrón) | De nosotros (lo que falta en todos) |
   |---|---|
   | commit-antes-de-mostrar (nada se ve sin guardarse) | **diario de decisiones** sellado por orden |
   | reanudación `resume()` de cualquier run a medias | **saga**: "deshacer por orden" + reproducible |
   | `requestId` idempotente (misma petición ⇒ misma solicitud) | **PDP en caliente** (cambiar la instrucción sin cerrar la oficina) |
   | inbox con steer/follow/reject (si está ocupado, no se pisa) | **auditor horizontal** (comparar libros entre piezas) |
2. **La regla de cambio de cerebro (V2) se codifica como política del
   supervisor**, no como truco: "cambiar solo si el ahorro esperado de los
   próximos turnos supera el coste de la reescritura". El esfuerzo **por paso
   adaptativo** (ARES) y el router por **calidad** (E3) quedan etiquetados
   **research** — se abren solo si S1/S6 lo justifican con números.
3. **El "menú" de la centralita se declara oficialmente un modelo virtual del
   harness** (el vehículo del autor, `A-referencia/03`): hoy ya lo hace por
   extensión; el harness lo hace **por dentro** — misma lógica, sin fachada
   obligatoria (la D4, ahora recomendación de la revisión).

## 5. Las 5 decisiones, ahora como **recomendaciones de la revisión**

(Dejan de ser "puerta" y pasan a ser **lo que la revisión dicta**; se ratifican
al arrancar el paso 1, pero **no bloquean la revisión**.)

| # | Recomendación | Fundamento (sobre esta revisión) |
|---|---|---|
| 1 | La central vive en `PI-agent/pi-harness/` | ya reservada, con reglas escritas; no duplicar carpeta |
| 2 | Expediente de obra para **la casa entera** | sin él, ninguna reversión de S6 es segura |
| 3 | Arranque **sin pantalla** (programa medible) | el examen (S1) mide números; la pantalla es decisión posterior |
| 4 | La extensión de memoria pasa a ser **cable fino** del harness | "una lógica, dos fachadas" = §4.3; evita dos lógicas que se desincronizan |
| 5 | El servicio de parecido: **se comprueba en el paso 1** | si no está, S1 arranca determinista (la banca de preguntas no lo requiere) |

## 6. El siguiente paso (y solo el siguiente)

**Paso 1 — "Ordenar y medir"** (lo que se hace, en llano):

1. **Expediente de obra** de toda `PI-agent` (cada cambio queda apuntado y
   reversible) + limpieza menor (lo que no debía estar dentro).
2. **La sala de exámenes**: la banca de ≥200 preguntas marcadas + 3
   repeticiones fijas (B1: qué parte del escritorio se quema; B2: de cada 3,
   ¿son las que importaban?; B3: el conserje, 3 escenas) + **números de
   partida** (baseline) escritos en el expediente.
3. **Comprobar la D5** (¿está encendido el servicio de parecido?) — si no, el
   examen arranca determinista y queda anotado.
4. **Devolver** los números de partida y el listado de lo limpiado. **Aquí, y solo
   aquí, se ratifican las 5 decisiones y se arranca el paso 2.**

**Tamaño del paso 1: medio día a un día.** No toca memoria, no toca la centralita,
no toca nada que ya funcione.

---

**Frase de cierre de la revisión:** *la estructura candidata es la correcta; lo
que cambia es que el "conserje" se construye copiando los 4 patrones que el autor
ya depuró en `durable` y sumando los 4 que nadie tiene (diario, saga, PDP en
caliente y auditor horizontal). Lo demás (esfuerzo adaptativo, router por
calidad) queda aparcado como research hasta que los números lo pidan.*
