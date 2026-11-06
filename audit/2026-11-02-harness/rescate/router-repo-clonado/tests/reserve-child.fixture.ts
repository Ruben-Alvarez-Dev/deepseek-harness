import { FileStateStore } from "../src/adapters/file-state-store.ts";
import { systemClock } from "../src/adapters/system-clock.ts";
import { AccountRouter } from "../src/application/router.ts";
import type { Lease } from "../src/domain/types.ts";
import { poolConfig } from "./helpers.ts";

const path = process.argv[2];
if (!path) throw new Error("Missing fixture state path");
const router = new AccountRouter(poolConfig(1), new FileStateStore(path), systemClock);
let lease: Lease | undefined;
process.on("message", async (message) => {
  if (message === "go") {
    try {
      lease = await router.acquire(new Set(["account-0"]));
      process.send?.("acquired");
    } catch {
      process.send?.("blocked");
    }
  } else if (message === "finish") {
    if (lease) await router.release(lease);
    process.exit(0);
  }
});
process.send?.("ready");
