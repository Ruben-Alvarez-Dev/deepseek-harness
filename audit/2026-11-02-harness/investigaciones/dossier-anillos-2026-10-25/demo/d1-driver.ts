// D1 — driver determinista de verificación empírica de @pi-agent/intermediate y @pi-agent/memory.
// Auditoría Pi 2026-10-25. Solo lectura sobre PI-agent; escritura únicamente en ./tmp/ dentro de este subfolder.
// v2: corrige T3 (spend/used/remaining/report viven en TokenGovernor, no en TokenRing) y T6 (search() filtra por scope con default "project").
import { SelectionCore, TokenGovernor, TokenRing } from "../../../PI-agent/src/pi-intermediate/src/index.ts";
import { PiCore } from "../../../PI-agent/src/pi-memory/src/index.ts";
import { mkdirSync, rmSync } from "node:fs";

const results: Array<[string, string, string]> = [];
function t(name: string, fn: () => string) {
  try { results.push([name, "PASS", fn()]); }
  catch (e) { results.push([name, "FAIL", (e as Error).message.slice(0, 300)]); }
}

const cap = (i: number) => ({ id: `cap-${i}`, kind: "tool", name: `cap ${i}`, family: "fam-a", description: `capacidad ${i}`, sourceId: "src-a", contentHash: `h${i}` });

t("T1 intermediate: cuota anti-gaming por familia/fuente", () => {
  const c = new SelectionCore({});
  for (let i = 1; i <= 10; i++) { const r = c.addCapability(cap(i) as any); if (!r.ok) throw new Error(`add ${i} rechazado: ${r.reason}`); }
  const r11 = c.addCapability(cap(11) as any);
  if (r11.ok) throw new Error("11ª capacidad admitida: la cuota no se aplica");
  return `10 admitidas, 11ª rechazada reason=${r11.reason}`;
});

t("T2 intermediate: router en dos etapas (find + route)", () => {
  const c = new SelectionCore({});
  c.addCapability({ ...cap(1), name: "alpha translator", description: "traduce alpha a beta" } as any);
  const hits = c.router.findCapability("alpha translator", 5);
  if (!hits.length) throw new Error("findCapability sin hits");
  const route = c.router.route("alpha translator");
  return `hits=${hits.length} routeKeys=${Object.keys(route as object).join(",")} selected=${JSON.stringify((route as any).selected)?.slice(0, 120)}`;
});

t("T3 intermediate: TokenRing por capas + CCR lossless + TokenGovernor", () => {
  const r = new TokenRing(6000, { promptThreshold: 400, cavemanDial: "normal" });
  const long = "palabra ".repeat(200);
  const c = (r as any).compress(long);
  if (typeof c.compressedTokens !== "number") throw new Error("compress sin compressedTokens");
  let round = "n/a";
  if (c.reversible && c.ccrId) { const back = r.retrieve(c.ccrId); round = back === long ? "lossless-ok" : "ROUND-TRIP-ROTO"; }
  const cav = (r as any).caveman(long, { dial: "ultra" });
  if (!cav || typeof cav.saved !== "number") throw new Error("caveman sin saved");
  const rep = r.governor.report();
  return `compress: tokens=${c.compressedTokens} reversible=${c.reversible} roundtrip=${round} | caveman(ultra): applied=${cav.applied} saved=${c.saved} | governor: report=${JSON.stringify(rep)} used=${r.governor.used()}`;
});

t("T4 intermediate: gate fail-closed sobre fuente desconocida", () => {
  const c = new SelectionCore({});
  const d = c.execDecision("no-existe");
  if (d.allowed) throw new Error("fuente desconocida resultó permitida");
  return `allowed=false reason=${d.reason}`;
});

const TMP = new URL("./tmp/", import.meta.url).pathname;
rmSync(TMP, { recursive: true, force: true }); mkdirSync(TMP, { recursive: true });
const DB = TMP + "d1.db";

t("T5 memory: persistencia real entre instancias (dbPath file)", () => {
  const a = new PiCore({ dbPath: DB });
  const r = a.memoryCtl.save({ id: "m1", kind: "semantic", title: "t1", body: "canario-D1=KILO-7", scope: "s1" } as any);
  a.db.close();
  const b = new PiCore({ dbPath: DB });
  const m = b.memory.get("m1");
  b.db.close();
  if (!m || !m.body.includes("KILO-7")) throw new Error(`no persistió: ${JSON.stringify(m)?.slice(0, 120)}`);
  return `decision=${JSON.stringify((r as any).decision)?.slice(0, 80)} recuperado tras reapertura con dbPath file`;
});

t("T6 memory: search lexical tras reapertura, con scope explícito y default", () => {
  const b = new PiCore({ dbPath: DB });
  const hits = b.memoryCtl.search("KILO-7", { scope: "s1" } as any);
  const hitsDefault = b.memoryCtl.search("KILO-7");
  b.db.close();
  if (!hits.length) throw new Error("search con scope s1 sin hits tras reapertura");
  return `hits(scope=s1)=${hits.length} first=${hits[0].id} | hits(scope default 'project')=${hitsDefault.length} (gotcha: default implícito)`;
});

t("T7 memory: consolidate + checkpoint + rollback", () => {
  const a = new PiCore({ dbPath: DB });
  for (const id of ["m2", "m3", "m4"]) a.memoryCtl.save({ id, kind: "semantic", title: id, body: `texto ${id} repetido para consolidar`, scope: "s1" } as any);
  const c = a.memoryCtl.consolidate();
  const cps = a.memoryCtl.listCheckpoints(5);
  const rb = a.memoryCtl.rollback(c.checkpoint);
  a.db.close();
  if (!c.checkpoint) throw new Error("consolidate no devolvió checkpoint");
  return `consolidate=${JSON.stringify(c)} checkpoints=${cps.length} rollback=${rb}`;
});

t("T8 memory: forget + forgetSalience", () => {
  const a = new PiCore({ dbPath: DB });
  const n = a.memoryCtl.forgetSalience(0.999);
  const f = a.memoryCtl.forget("m3");
  const after = a.memory.get("m3");
  a.db.close();
  return `forgetSalience(0.999)=${n} forget(m3)=${f} m3 tras forget=${after ? (after as any).state ?? "presente" : "ausente"}`;
});

t("T9 memory: aislamiento por prefijo de scope (tenant)", () => {
  const a = new PiCore({ dbPath: DB });
  a.memoryCtl.save({ id: "m5", kind: "semantic", title: "t5", body: "tenant dos", scope: "t2:x" } as any);
  const s1 = a.memory.allByScopePrefix("s1");
  const t2 = a.memory.allByScopePrefix("t2:");
  a.db.close();
  if (s1.some(m => m.id === "m5")) throw new Error("fuga: m5 (scope t2) aparece bajo prefijo s1");
  return `s1=${s1.length} t2=${t2.length} sin fuga cruzada por prefijo`;
});

for (const [n, s, d] of results) console.log(`${s}  ${n}  ::  ${d}`);
const fails = results.filter(r => r[1] === "FAIL").length;
console.log(`\nTOTAL ${results.length}  PASS ${results.length - fails}  FAIL ${fails}`);
process.exit(fails ? 1 : 0);
