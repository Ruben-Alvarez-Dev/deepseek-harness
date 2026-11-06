import { defaults } from "../src/config.ts";
import {
  checkAbort,
  emptyState,
  type RouterConfig,
  type RouterState,
} from "../src/domain/types.ts";
import type { Clock, StateStore } from "../src/ports.ts";

export class MemoryStore implements StateStore {
  state: RouterState = emptyState();
  private pending: Promise<unknown> = Promise.resolve();
  private readonly listeners = new Set<() => void>();
  /** Mirrors FileStateStore: only notifies when a commit actually changed the state. */
  onChange(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  transaction<T>(change: (state: RouterState) => T, signal?: AbortSignal): Promise<T> {
    const job = this.pending.then(() => {
      checkAbort(signal);
      const before = JSON.stringify(this.state);
      const draft = structuredClone(this.state);
      const result = change(draft);
      this.state = draft;
      if (JSON.stringify(draft) !== before) for (const listener of [...this.listeners]) listener();
      return result;
    });
    this.pending = job.catch(() => undefined);
    return job;
  }
}

export class FakeClock implements Clock {
  time = 100000;
  sleepHook?: () => void;
  dead = new Set<number>();
  now() {
    return this.time;
  }
  async sleep(ms: number, signal?: AbortSignal) {
    this.sleepHook?.();
    checkAbort(signal);
    this.time += ms;
  }
  isProcessAlive(pid: number) {
    return !this.dead.has(pid);
  }
}

export function poolConfig(count = 3): RouterConfig {
  const config = defaults();
  config.accounts = Array.from({ length: count }, (_, i) => ({
    id: `account-${i}`,
    quotaGroup: `group-${i}`,
    credential: { env: `TEST_KEY_${i}` },
    enabled: true,
  }));
  config.quotaGroups = config.accounts.map((a) => ({
    id: a.quotaGroup,
    maxConcurrent: 1,
    limits: [{ requests: 10, windowMs: 60000 }],
  }));
  config.maxWaitMs = 0;
  config.rateLimitRecovery = "error";
  return config;
}
