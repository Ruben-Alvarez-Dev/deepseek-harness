# Evidencia ejecutada y límites

Fecha: 2026-10-18. Volver al [índice](00-indice.md). Localizadores C: [fuentes](02-fuentes.md).

## 1. Procedencia y alcance

**Ampliación posterior INV-10:** [09-evidencia-delta.md](09-evidencia-delta.md) registra una ejecución nueva de 68 aserciones con probe retenido localmente. Reproduce parte de estos casos y añade otros; no sumar rondas como pruebas independientes. Los párrafos siguientes conservan la procedencia histórica de E01–E10.

Estas comprobaciones se ejecutaron durante la revisión OpenAI de esta misma conversación, **antes** de la profundización D01–D61 y de escribir el expediente. Aquí se transcriben sus resultados; no se presentan como nueva ejecución al guardar el documento.

- Node observado: `v26.5.0`.
- Producto PI observado: HEAD `855afc9`, antes de estos cambios documentales.
- Cero solicitudes a proveedores de modelos, cero acceso a secretos reales, cero servicios arrancados.
- Los ensayos se lanzaron por stdin con `node --input-type=module`; no se guardó un runner ni una suite.
- Para aislar clases TypeScript se usó `stripTypeScriptTypes`, se retiraron imports/exports en memoria y se evaluó el código con `vm.runInNewContext`. Las dependencias necesarias se suministraron explícitamente.
- El esquema de `event_ledger` se extrajo del texto de `pi-intermediate/src/db.ts` y se ejecutó en `DatabaseSync(':memory:')`, no en una base de usuario.
- Las claves Ed25519 del ensayo se generaron en memoria, nunca se imprimieron ni se persistieron. SHA-256/firma/verificación se suministraron desde `node:crypto`.

**Límite fundamental:** son pruebas de propiedades aisladas y fallos inyectados. No prueban instalación limpia, comportamiento completo del host, adversarial externo independiente, durabilidad en disco, aislamiento de SO o ausencia de otros controles envolventes.

## 2. Matriz de resultados

### E01 — Control positivo y negativo del ledger (C04)

1. Dos eventos sintéticos añadidos mediante `LedgerStore.append()` con firmante/verificador: `verify() → {ok:true,count:2}`.
2. Un `UPDATE` directo de contenido fue admitido por el esquema.
3. La verificación posterior devolvió `ok:false, reason:'content-tampered'`.
4. Consulta a `sqlite_master` sobre triggers de `event_ledger`: **0**.

**Soporta:** la verificación detecta este cambio de contenido, pero el esquema inspeccionado no lo impide. No demuestra inmutabilidad frente al propietario del fichero.

### E02 — Metadatos y firma ausente (C04)

Sobre el mismo ledger:

- `UPDATE event_ledger SET ref=...` → `verify() → {ok:true,count:2}`.
- `UPDATE event_ledger SET signature=NULL ...` con verificador configurado → `verify() → {ok:true,count:2}`.

**Soporta:** `ref` queda fuera de la huella y la política actual no exige firma presente para cada entrada. No se falsificó Ed25519.

### E03 — Truncamiento de la cola (C04)

Borrado mediante SQL del segundo/último evento: `verify() → {ok:true,count:1}`.

**Soporta:** sin una cabeza o cardinalidad esperada independiente, la rutina no detecta este truncamiento. No implica que toda eliminación intermedia pase desapercibida.

### E04 — Fallo entre vista y ledger (C05)

Se invocó el método real `MemoryFabric.save()` sobre una instancia construida para el ensayo:

- `control.save` simulado insertaba una fila en una tabla SQLite en memoria y devolvía una memoria sintética.
- `ledger.append` simulado lanzaba `injected ledger failure`.
- Resultado: excepción y **1 fila restante** en la proyección sintética.

**Soporta:** el método de orquestación por sí solo no revierte la actualización previa ante un fallo de append. No se ejercitó el backend completo ni una caída física.

### E05 — Firma arbitraria en el prototipo de contratos (C08)

Solo se extrajeron las clases `Contract` y `ContractManager` del texto fuente, sin imports, inicializadores de directorios ni instancia global. Persistencia y auditoría se sustituyeron por no-ops; ejecución por un stub inerte.

- `approveAction(..., 'NOT_A_SIGNATURE')` dejó `status='approved'` y conservó esa cadena.
- `executeApprovedActions()` invocó el stub y devolvió éxito.

**Soporta:** esa trayectoria de las clases no comprueba validez criptográfica de la firma suministrada. No se leyó el target real ni se ejecutó shell. No demuestra que el gateway esté instalado, expuesto o que sea implementación de Jart-Contratos.

### E06 — Vocabulario de herramientas (C03)

Ejecutado el código de `gateToolCall` en memoria:

```text
('write', {path:'/etc/synthetic-probe'}) → allow:false
('Write', {file_path:'/etc/synthetic-probe'}) → allow:true
```

**Soporta:** no se puede usar este motor como control portable sin traducir nombres y argumentos. No demuestra que Pi envíe el segundo formato ni que exista bypass en su integración real.

### E07 — Lógica reutilizable sin Pi (C02)

`packKnapsack` con presupuesto 5 e ítems `a:(3,4)`, `b:(2,3)`, `c:(4,4)` devolvió:

```text
selected: ['a','b']; totalTokens:5; totalScore:7
```

Solo se suministró SHA-256 al evaluar el módulo. No se importó el runtime Pi.

**Soporta:** esta función puede reutilizarse sin el host. No acredita precisión del estimador de tokens ni mejora de calidad de respuestas.

### E08 — Resolución del deep import en un layout convencional (C07)

```text
resolve('/synthetic/node_modules/@pi-agent/memory/src',
        '../../pi-intermediate/src/index.ts')
→ /synthetic/node_modules/@pi-agent/pi-intermediate/src/index.ts
```

La dependencia declarada tiene nombre `@pi-agent/intermediate` y valor `file:../pi-intermediate`.

**Soporta:** el código conoce una ruta de desarrollo distinta del nombre de dependencia; hay una hipótesis de empaquetado que verificar. **No se hizo `npm pack` ni instalación limpia**, por la restricción de solo lectura.

### E09 — Alcance de la representación firmable (C06)

`CanonClient.canonical(p) === CanonClient.canonical(q)` devolvió **true** al cambiar únicamente `locator.payload` y `confidence`.

**Soporta:** esos campos no están ligados a los bytes que firma este contrato. No demuestra una integración con el servicio real de Jart-CANON ni que el receptor use esos campos para autorizar acciones.

### E10 — Typecheck sin emisión

Se ejecutó desde cada paquete:

```bash
node node_modules/typescript/bin/tsc --project tsconfig.json \
  --noEmit --incremental false --pretty false
```

| Paquete | Salida | Exit |
|---|---|---:|
| `pi-account-router` | sin diagnósticos | 0 |
| `pi-memory` | sin diagnósticos | 0 |
| `pi-intermediate` | sin diagnósticos | 0 |

No se instalaron dependencias ni se ejecutaron scripts npm, tests de repositorios externos o `verify:full`. Estos resultados acreditan compilación de tipos, **no seguridad, cobertura de integración o validez arquitectónica**.

## 3. Reproducción acotada del núcleo E01–E03

Ejemplo documental, no suite versionada ni instrucción de ejecutarlo automáticamente. Lee dos fuentes; toda mutación ocurre en una DB en memoria. No importar el barrel de la aplicación ni usar bases de usuario.

```javascript
// Ejecutar por stdin con node --input-type=module (Node con stripTypeScriptTypes).
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { createHash, generateKeyPairSync, sign, verify } from 'node:crypto';
import vm from 'node:vm';

const root = '/Users/ruben/Code/PI-agent/src';
const sha256 = s => createHash('sha256').update(s).digest('hex');
const ddl = readFileSync(root + '/pi-intermediate/src/db.ts', 'utf8')
  .match(/CREATE TABLE IF NOT EXISTS event_ledger \([\s\S]*?\);/)[0];
let code = stripTypeScriptTypes(
  readFileSync(root + '/pi-memory/src/memory-ledger.ts', 'utf8'));
code = code.replace(/^import\s[\s\S]*?;\s*$/gm, '').replace(/^export /gm, '');
const LedgerStore = vm.runInNewContext(code + '\n;LedgerStore', { sha256 });
const db = new DatabaseSync(':memory:');
try {
  db.exec(ddl);
  const pair = generateKeyPairSync('ed25519');
  const ledger = new LedgerStore(db, {
    sign: h => sign(null, Buffer.from(h), pair.privateKey).toString('base64'),
    verify: (h, s) => verify(null, Buffer.from(h), pair.publicKey,
      Buffer.from(s, 'base64')),
  });
  const a = ledger.append({ type: 'probe', content: 'synthetic A',
    idempotencyKey: 'a', ref: 'original' }).receipt;
  ledger.append({ type: 'probe', content: 'synthetic B', idempotencyKey: 'b' });
  console.log('baseline', ledger.verify());
  db.prepare('UPDATE event_ledger SET ref=? WHERE id=?').run('changed', a.id);
  console.log('changed-ref', ledger.verify());
  db.prepare('UPDATE event_ledger SET signature=NULL WHERE id=?').run(a.id);
  console.log('removed-signature', ledger.verify());
  db.prepare("DELETE FROM event_ledger WHERE idempotencyKey='b'").run();
  console.log('truncated-tail', ledger.verify());
  db.prepare('UPDATE event_ledger SET content=? WHERE id=?').run('changed', a.id);
  console.log('changed-content', ledger.verify());
} finally {
  db.close();
}
```

La transformación por regex es un recurso de aislamiento del ensayo, no un cargador de producción. Si cambia el fuente o sus imports, hay que revisar la extracción antes de reutilizarla.

## 4. Qué sigue sin probarse

- Empaquetado limpio independiente, bootstrap y desinstalación por componente.
- Un segundo host real consumiendo las mismas implementaciones.
- Recorrido completo de autorización con firma física y denegación efectiva de todos los canales laterales.
- Nonces bajo concurrencia, revocación durante desconexión, crash/recovery y efectos de resultado incierto.
- Custodia inmutable, truncamiento/reemplazo de fichero frente al modelo de amenaza elegido.
- Estado actual de servicios/nodos citado históricamente por D01–D61.
- Equivalencia de todas las superficies de FACTORY o de todos los adaptadores del arnés.
- Costes operativos, latencia y memoria de una topología futura. Las estimaciones anteriores no son mediciones.

Los pases multidisciplinares, adversariales y «Dementor» de la conversación fueron perspectivas del mismo asistente. **No hubo equipo delegado, revisión criptográfica independiente ni ejecución del pipeline FACTORY sobre este informe.**
