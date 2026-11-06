import { describe, expect, it, vi } from "vitest";
import { systemClock } from "../src/adapters/system-clock.ts";
import { AccountRouter } from "../src/application/router.ts";
import { retryAfterMs } from "../src/domain/policy.ts";
import { FakeClock, MemoryStore, poolConfig } from "./helpers.ts";

function setup(count = 3) {
  const config = poolConfig(count);
  const store = new MemoryStore();
  const clock = new FakeClock();
  const router = new AccountRouter(config, store, clock);
  const available = new Set(config.accounts.map((a) => a.id));
  return { config, store, clock, router, available };
}

describe("proactive shared-quota routing", () => {
  it("rotates each request without waiting for any account to fail", async () => {
    const { router, available } = setup();
    const ids = [];
    for (let i = 0; i < 6; i++) {
      const lease = await router.acquire(available);
      ids.push(lease.accountId);
      await router.release(lease);
    }
    expect(ids).toEqual([
      "account-0",
      "account-1",
      "account-2",
      "account-0",
      "account-1",
      "account-2",
    ]);
  });

  it("skips unavailable, configured-disabled and authentication-disabled accounts", async () => {
    const { config, store, router, available } = setup();
    const account = config.accounts[0];
    if (account) account.enabled = false;
    available.delete("account-1");
    const lease = await router.acquire(available);
    expect(lease.accountId).toBe("account-2");
    await router.feedback(lease, 401, null);
    await router.release(lease);
    await expect(router.acquire(available)).rejects.toThrow("No eligible account");
    expect(store.state.disabledAccountIds).toEqual(["account-2"]);
  });

  it("does not multiply quota for two keys sharing one group", async () => {
    const { config, router, available } = setup(2);
    config.accounts.forEach((a) => {
      a.quotaGroup = "group-0";
    });
    config.quotaGroups = [
      { id: "group-0", maxConcurrent: 2, limits: [{ requests: 2, windowMs: 60000 }] },
    ];
    for (let i = 0; i < 2; i++) await router.release(await router.acquire(available));
    await expect(router.acquire(available)).rejects.toThrow("capacity unavailable");
  });

  it("enforces the longest rolling window even with unused minute capacity", async () => {
    const { config, router, available, clock } = setup(1);
    config.quotaGroups = [
      {
        id: "group-0",
        maxConcurrent: 1,
        limits: [
          { requests: 10, windowMs: 60000 },
          { requests: 1, windowMs: 86400000 },
        ],
      },
    ];
    await router.release(await router.acquire(available));
    clock.time += 60001;
    await expect(router.acquire(available)).rejects.toThrow("capacity unavailable");
    clock.time += 86400000;
    await router.release(await router.acquire(available));
  });

  it("reserves concurrency atomically and allows independent groups concurrently", async () => {
    const { router, available } = setup();
    const leases = await Promise.all([
      router.acquire(available),
      router.acquire(available),
      router.acquire(available),
    ]);
    expect(new Set(leases.map((l) => l.accountId)).size).toBe(3);
    await expect(router.acquire(available)).rejects.toThrow("capacity unavailable");
    await Promise.all(leases.map((l) => router.release(l)));
  });

  it("reclaims dead process leases, but never refunds consumption", async () => {
    const { config, router, store, available, clock } = setup(1);
    const other = new AccountRouter(config, store, clock, 555);
    await other.acquire(available);
    await expect(router.acquire(available)).rejects.toThrow("capacity unavailable");
    clock.dead.add(555);
    const lease = await router.acquire(available);
    expect(store.state.groups[0]?.starts).toHaveLength(2);
    await router.release(lease);
  });

  it("rejects conflicting live policies and permits changes only after history expires", async () => {
    const { config, router, store, available, clock } = setup(1);
    await router.release(await router.acquire(available));
    const changed = structuredClone(config);
    changed.quotaGroups[0]?.limits.push({ requests: 100, windowMs: 3600000 });
    const other = new AccountRouter(changed, store, clock);
    await expect(other.acquire(available)).rejects.toThrow("Conflicting quota policies");
    clock.time += 60000;
    await other.release(await other.acquire(available));
  });

  it("waits for returning capacity within the configured deadline", async () => {
    const { config, router, clock, available } = setup(1);
    config.maxWaitMs = 1000;
    const group = config.quotaGroups[0];
    if (group) group.limits = [{ requests: 1, windowMs: 1000 }];
    await router.release(await router.acquire(available));
    await router.release(await router.acquire(available));
    expect(clock.time).toBe(101000);
  });

  it("does not reserve newly available capacity after state contention overruns a positive deadline", async () => {
    const { config, router, store, available, clock } = setup(1);
    config.maxWaitMs = 100;
    vi.spyOn(store, "transaction").mockImplementationOnce(async (operation) => {
      clock.time += 101;
      return operation(store.state);
    });
    await expect(router.acquire(available)).rejects.toThrow("capacity unavailable");
    expect(store.state.leases).toEqual([]);
    expect(store.state.groups).toEqual([]);
  });

  it("keeps default-style unlimited waiting alive across a full minute", async () => {
    const { config, router, available, clock, store } = setup(1);
    config.maxWaitMs = null;
    const group = config.quotaGroups[0];
    if (group) group.limits = [{ requests: 1, windowMs: 60000 }];
    await router.release(await router.acquire(available));
    await router.release(await router.acquire(available));
    expect(clock.time).toBe(160000);
    expect(store.state.waiters).toEqual([]);
  });

  it("shares fair waiting priority across runtimes and prevents overtaking", async () => {
    const config = poolConfig(1);
    config.maxWaitMs = null;
    const store = new MemoryStore();
    const a = new AccountRouter(config, store, systemClock);
    const b = new AccountRouter(config, store, systemClock);
    const available = new Set(["account-0"]);
    const held = await a.acquire(available);
    const first = a.acquire(available);
    await vi.waitFor(() => expect(store.state.waiters).toHaveLength(1));
    const second = b.acquire(available);
    await vi.waitFor(() => expect(store.state.waiters).toHaveLength(2));
    await a.release(held);
    const one = await first;
    const third = a.acquire(available);
    await vi.waitFor(() =>
      expect(store.state.waiters.map((t) => t.owner)).toEqual([b.owner, a.owner]),
    );
    await a.release(one);
    const two = await second;
    expect(two.owner).toBe(b.owner);
    await b.release(two);
    await a.release(await third);
    expect(store.state.waiters).toEqual([]);
  });

  it("does not let a queued group block unrelated authorized capacity", async () => {
    const config = poolConfig(2);
    config.maxWaitMs = null;
    const store = new MemoryStore();
    const a = new AccountRouter(config, store, systemClock);
    const b = new AccountRouter(config, store, systemClock);
    const held = await a.acquire(new Set(["account-0"]));
    const abort = new AbortController();
    const pending = a.acquire(new Set(["account-0"]), abort.signal);
    const rejected = expect(pending).rejects.toThrow("aborted");
    await vi.waitFor(() => expect(store.state.waiters).toHaveLength(1));
    const independent = await b.acquire(new Set(["account-1"]));
    expect(independent.accountId).toBe("account-1");
    abort.abort();
    await rejected;
    await a.release(held);
    await b.release(independent);
    expect(store.state.waiters).toEqual([]);
  });

  it("reclaims dead waiting tickets without refunding past requests", async () => {
    const { router, available, clock, store } = setup(1);
    await router.release(await router.acquire(available));
    store.state.waiters.push({
      id: "dead-ticket",
      owner: "dead-owner",
      pid: 444,
      groupIds: ["group-0"],
    });
    clock.dead.add(444);
    await router.release(await router.acquire(available));
    expect(store.state.waiters).toEqual([]);
    expect(store.state.groups[0]?.starts).toHaveLength(2);
  });

  it("cancels unlimited waiting without dropping the peer lease or usage", async () => {
    const { config, router, available, clock, store } = setup(1);
    config.maxWaitMs = null;
    const held = await router.acquire(available);
    const abort = new AbortController();
    clock.sleepHook = () => abort.abort();
    await expect(router.acquire(available, abort.signal)).rejects.toThrow("aborted");
    expect(store.state.waiters).toEqual([]);
    expect(store.state.leases).toEqual([held]);
    expect(store.state.groups[0]?.starts).toHaveLength(1);
    await router.release(held);
  });

  it("stops waiting at deadline and supports cancellation without reservations", async () => {
    const { config, router, store, available, clock } = setup(1);
    config.maxWaitMs = 500;
    const held = await router.acquire(available);
    await expect(router.acquire(available)).rejects.toThrow("capacity unavailable");
    expect(clock.time).toBe(100500);
    const controller = new AbortController();
    clock.sleepHook = () => controller.abort();
    await expect(router.acquire(available, controller.signal)).rejects.toThrow("aborted");
    expect(store.state.leases).toHaveLength(1);
    await router.release(held);
  });

  it("cools all keys in a group and enables accounts without resetting quota", async () => {
    const { config, router, available, clock, store } = setup(2);
    config.accounts.forEach((a) => {
      a.quotaGroup = "group-0";
    });
    config.quotaGroups = config.quotaGroups.slice(0, 1);
    const lease = await router.acquire(available);
    await router.feedback(lease, 429, "30");
    await router.release(lease);
    await expect(router.acquire(available)).rejects.toThrow("capacity unavailable");
    clock.time += 30000;
    const next = await router.acquire(available);
    expect(next.accountId).toBe("account-1");
    await router.feedback(next, 403, null);
    await router.release(next);
    await router.enable(next.accountId);
    expect(store.state.disabledAccountIds).toEqual([]);
    expect(store.state.groups[0]?.starts).toHaveLength(2);
    expect(store.state.groups[0]?.cooldownUntil).toBe(130000);
    await expect(router.enable("unknown")).rejects.toThrow("Unknown configured account");
  });

  it("fallback cooldowns and longer server deadlines never shorten existing cooldown", async () => {
    const { router, available, store } = setup(1);
    const lease = await router.acquire(available);
    await router.feedback(lease, 503, null);
    expect(store.state.groups[0]?.cooldownUntil).toBe(105000);
    await router.feedback(lease, 429, "bad");
    expect(store.state.groups[0]?.cooldownUntil).toBe(160000);
    await router.feedback(lease, 503, "1");
    expect(store.state.groups[0]?.cooldownUntil).toBe(160000);
    await router.release(lease);
  });

  it("cleanup is idempotent and affects only its owner", async () => {
    const { config, router, store, available, clock } = setup(2);
    const other = new AccountRouter(config, store, clock);
    await router.acquire(available);
    const ownedByOther = await other.acquire(available);
    await router.shutdown();
    await router.shutdown();
    expect(store.state.leases).toEqual([ownedByOther]);
    expect(store.state.groups.flatMap((g) => g.starts)).toHaveLength(2);
    const status = await other.status(available);
    expect(status.groups[1]?.inFlight).toBe(1);
    await other.release(ownedByOther);
  });
});

describe("Retry-After", () => {
  it("accepts fractional seconds, zero and HTTP dates without capping", () => {
    const now = Date.parse("2026-10-09T00:00:00Z");
    expect(retryAfterMs("0.5", now)).toBe(500);
    expect(retryAfterMs("0", now)).toBe(0);
    expect(retryAfterMs("Fri, 09 Oct 2026 01:00:00 GMT", now)).toBe(3600000);
    expect(retryAfterMs("Fri, 09 Oct 2026 00:00:00 GMT", now)).toBe(0);
  });
  it.each([null, "", "-2", "Infinity", "123x", "2026-10-09", "999999999999999999999"])(
    "rejects invalid header %s",
    (value) => {
      expect(retryAfterMs(value, 100000)).toBeUndefined();
    },
  );
});
