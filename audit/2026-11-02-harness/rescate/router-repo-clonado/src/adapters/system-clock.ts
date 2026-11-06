import { setTimeout } from "node:timers/promises";
import { checkAbort, RouterError } from "../domain/types.ts";
import type { Clock } from "../ports.ts";

export const systemClock: Clock = {
  now: () => Date.now(),
  async sleep(ms, signal) {
    checkAbort(signal);
    try {
      await setTimeout(ms, undefined, { signal });
    } catch {
      checkAbort(signal);
      throw new RouterError("state", "Account router wait failed.");
    }
  },
  isProcessAlive(pid) {
    try {
      process.kill(pid, 0);
      return true;
    } catch (error) {
      return (error as NodeJS.ErrnoException).code !== "ESRCH";
    }
  },
};
