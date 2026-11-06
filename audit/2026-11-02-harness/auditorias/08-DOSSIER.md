# Auditoría del dossier de anillos (A1, A2, colofón AD1, demos)

**Fecha:** 2026-11-02 · **Objeto:** `~/Code/QWEN-code/auditoria-pi-agent/` · **Método:** lectura completa + verificación de artefactos + contraste con el árbol actual.
**Regla de secretos:** el material sensible se describe por tipo y ubicación; **no se reproduce ningún valor**.

---

## 1 · Hallazgos críticos

### D-1 · Clave privada real dentro del dossier (CRÍTICO)

`demo/tmp/d1.db` (184.320 B, **modo 0644**) contiene en la tabla `meta`:

| clave | longitud |
|---|---|
| `memory.signer.privatePem` | **119 B** — clave privada Ed25519 en PEM (verificado: contiene cabecera `PRIVATE KEY`) |
| `memory.signer.publicPem` | 113 B |

Es decir: el propio dossier materializa el defecto **S4-K1** que denuncia («la clave que firma vive en la misma DB que firma») y lo deja en un fichero legible por terceros. **Acción:** regenerar o eliminar `d1.db` antes de compartir el dossier.

**Cierre 2026-11-06 (CH-004, ejecutado):** eliminado `demo/tmp/d1.db` de la copia del expediente (184.320 B, SHA-256 `780f0c46a2d9716e008f6c38ac2fb863a5564012424bf2a77a0c4afe2fd09283`, modo 0644); gate `grep -r "PRIVATE KEY" demo/` → **0** resultados. La copia **original** del dossier (`/Users/ruben/Code/PROJECTS/QWEN-code/auditoria-pi-agent/demo/tmp/d1.db`, mismo SHA-256) se **eliminó** el 2026-11-06 con autorización expresa del propietario; `find /Users/ruben -name d1.db` → 0.

### D-2 · Secreto volcado a una transcripción de auditoría (CRÍTICO, `sin-verificar`)

`A1-config-viva.md:9` declara que un `grep` volcó el **valor literal** de una clave de `models.json:147` a la transcripción de la auditoría. El informe lo redacta (`A1:517`), pero la transcripción externa lo conserva. La recomendación de rotar (`A1:520`) no consta ejecutada.

**Estado actual (verificado hoy):** `models.json` tiene **11 proveedores**; en la verificación del 2026-11-06 solo **1** de las 10 entradas `apiKey` era un secreto real (`omniroute`); el resto eran placeholders (`managed-by-extension`, `keyless`, `lm-studio`, `mtplx-…`).

**Cierre 2026-11-06 (CH-003, ejecutado):** la clave literal `omniroute` estaba en **22 ficheros** (7 de `~/.pi/agent/models.json*`, 6 sesiones de Pi, 2 transcripciones de Qwen, 7 de `~/.claude/transcripts`). Rotada en OmniRoute (`registered_keys`: `9d5b904e…` revocada, nueva `4ad1222e…` activa), actualizada en `~/.pi/agent/models.json`, **6 `.bak` borrados** y **15 transcripciones redactadas**; escaneo amplio final → **0** copias del valor antiguo.

### D-3 · La base de evidencia caducó en 24 horas (CRÍTICO para su uso)

El dossier es del 25-oct. Hoy (2-nov), verificado:

| Premisa del dossier | Realidad hoy |
|---|---|
| HEAD `7b0e0b38`, 8 dirty | HEAD `850ac20`, 23 commits después, 97 borrados + 6 untracked |
| `pi-memory` en `src/` | **Borrado del árbol** (recuperable) |
| `settings.json` carga solo router + mcp-adapter | Carga **5 paquetes**, incluido `npm:pi-memory` — pero se resuelve a **`pi-memory@0.4.2`**, un linaje anterior y sin dependencia de `@pi-agent/intermediate` |
| `defaultProvider: account-router` | `litellm` / `router-agnes` |
| `models.json`: 1 clave literal | **5 claves literales** |
| `server.log` 5,2 MB 0644 | 7,1 MB, **0600** (permiso remediado) |
| 129 sesiones, 214 MB, 0644 | **183, 275 MB, 0 en 0600** |
| `~/.pi/agent/skills` no existe | sigue sin existir |
| `capabilities-footer` colgante | sigue colgante |

Sin banda «as-of» ni procedimiento de refresco, el dossier se lee como presente y es falso en varios puntos centrales.

---

## 2 · Contradicciones activas (el dossier no se supera a sí mismo)

`DISENO-EXTRACCION-ANILLOS-PI.md` **v5** es la versión corregida, pero **S1/S2/S3/S4 siguen formalmente vigentes y dicen lo contrario** en el punto más caro: dónde vive la memoria.

| Documento | Dice | v5 manda |
|---|---|---|
| `S1:248-253` | memoria **transversal** de rango propio | autoridad en anillo-0, custodia en anillo-1, sin pieza transversal |
| `S1:279-293` | **4 escritores** de memoria | **11** |
| `S1:299-314` | 12 piezas «copiar tal cual» | solo 9 verificadas puras |
| `S1:523-539` | gates = **paso 8** | gates = **paso 1** |
| `S2:219-235` | anillo-0 = **proceso** dueño del almacén | anillo-0 = biblioteca pura sin proceso ni estado |
| `S3:353-356` | ledger escrito **desde los tres** | escritura **solo** desde el servicio de anillo-1 |
| `S4:121-143` | anillo-0 concentra autoridad en un proceso | modelo de amenaza desfasado |

**No existe `SUPERSEDES.md`.** Un implementador que abra S2 §2.2 construirá el diseño que v5 prohíbe.

Además: **v3 y v4 no existen como ficheros**. El diseño que AD1 atacó se sobrescribió; la cadena de correcciones solo es verificable contra las citas de los colofones, no contra el texto.

---

## 3 · El presupuesto de v5 está mal

v5 anuncia **8 puertos + 16 adaptaciones** (`v5:5`), pero:
- §3 añade `DenseVectorPort` y `RetentionPolicyPort` → **10 puertos** (`v5:25`).
- §4 dice «16 + las 8 impurezas de AD1» → **24 cambios** (`v5:31`).

El calendario de 9 pasos se apoya en una cifra que el propio texto desmiente.

---

## 4 · Demos: lo que prueban y lo que no

**D1 (`d1-results.txt`, 9/9)** — «9/9» significa «ninguna excepción», no «9 propiedades demostradas»:

| Test | Realidad |
|---|---|
| T3 | `reversible=false`, `roundtrip=n/a`: **no prueba CCR lossless**; sí atribución por capa |
| T4 | Bloquea por **sandbox ausente**, no por fuente desconocida |
| T7 | `merged:0, archived:0, summaries:0`: **no consolidó nada**; prueba checkpoint/rollback |
| T8 | `forget(m3)=false`: el archivado lo puso `forgetSalience(0.999)` |

Además, `d1-driver.ts:54` hace `rmSync(tmp)`: **re-ejecutar D1 borra el `d1.db` que se audita** y regenera la clave privada. No hay modo replay.

**D2** — depende de Pi 1.4.0, config viva, credenciales y cuota: **no es determinista**. `d2a.err` y `d2b.err` son **0 bytes**: no hay evidencia de stderr ni de exit code.

---

## 5 · Errores de citas propagados

`src/pi-account-router/HANDOFF.md:56` **no** dice «Cero changes activos»; está en **`:47`**. La cita errónea se repite en `A2:281`, `A3:244`, `MATRIZ:309` e `INFORME:36`.

También desplazadas: `HANDOFF.md:35-38` → `:38-42`, `:22` → `:26`, `:54` → `:45`.

Y conteos inconsistentes del mismo hecho: `MemoryBackend` «13+13» (A2), «13+12» (S1), **11+12** (v5 y AD1). `P1–P9` (HANDOFF) vs `P1–P12` (v5) vs P13 (S4).

---

## 6 · Lo que el dossier hace bien

- **Diagnóstico estructural sólido y verificado**: 72 % de código sin consumidor, `verification-evaluation` sin implementación, expediente E-031…E-046 ausente, HANDOFF mentiroso, defectos de PALIMPSEST (tenant, clave en DB, replay destructivo, olvido inmortal, migrador no atómico).
- **A1 es una fotografía forense seria**: estructura los ficheros sensibles sin volcar valores; 2/3 de sus hallazgos siguen siendo ciertos.
- **El colofón AD1 es ejemplar**: refuta 7 de 8 claims del diseño propio, y v5 integra 6 enteras y 1 parcial.
- **La cadena de evidencia es mejor que la media**: separa DOC/COD/EXE/INT y marca lo no verificado.

---

## 6-bis · Matiz del pase línea a línea (2026-11-02): tres claims del dossier ya están corregidos en HEAD

El dossier describe el snapshot del 25-oct. La ola W (E-063…E-066) corrigió después: el **olvido inmortal** (umbral 0.15 → 0.2 con comentario explícito en `memory-forget.ts:38`), la **clave privada en la DB** (custodia externa por defecto, `memory-key-custody.ts`), y el **replay destructivo** (replay diferencial con guard de integridad, `fabric.ts:273-323`). Los hallazgos del dossier siguen siendo válidos como diagnóstico de su momento; como estado actual, tres de sus críticas centrales ya no aplican. Siguen vivos: ≥9 caminos de mutación sin ledger, las actions `sessions/project/cross` muertas por drift de tool, y el BLOCKER `merged = r.archived` (`memory-control.ts:242`).

## 7 · Acciones antes de usar el dossier

1. ~~Rotar la clave expuesta y purgar la transcripción (D-2).~~ **Hecho 2026-11-06 (CH-003).**
2. ~~Regenerar o eliminar `demo/tmp/d1.db` (D-1).~~ **Hecho 2026-11-06 (CH-004):** copia del expediente eliminada; gate `grep -r "PRIVATE KEY" demo/` = 0. La original de QWEN-code sigue intacta (fuera de alcance).
3. Escribir un `SUPERSEDES.md`: v5 es autoridad; S1/S2/S3/S4 superados en emplazamiento, escritores, copia y secuencia.
4. Corregir las citas de línea erróneas en los 5 documentos donde se propagaron.
5. Sellar el dossier con manifiesto SHA-256 y banda «as-of 2026-10-25».
6. Versionarlo: hoy no es repo git y no tiene copia.
