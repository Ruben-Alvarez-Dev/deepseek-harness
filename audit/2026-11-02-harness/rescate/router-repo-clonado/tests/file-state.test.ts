import { fork } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import lockfile from "proper-lockfile";
import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeState, FileStateStore, statePath } from "../src/adapters/file-state-store.ts";
import { systemClock } from "../src/adapters/system-clock.ts";
import { AccountRouter } from "../src/application/router.ts";
import { defaults } from "../src/config.ts";
import { emptyState, RouterError } from "../src/domain/types.ts";
import { poolConfig } from "./helpers.ts";

const directories: string[] = [];
async function temporary() {
  const dir = await mkdtemp(join(tmpdir(), "pi-router-test-"));
  directories.push(dir);
  return dir;
}
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(directories.splice(0).map((p) => rm(p, { recursive: true, force: true })));
});

describe("private atomic local state", () => {
  it("serializes competing stores, persists and uses private permissions", async () => {
    const dir = await temporary();
    const path = join(dir, "state.json");
    await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        new FileStateStore(path).transaction((state) => {
          state.disabledAccountIds.push(`a-${i}`);
        }),
      ),
    );
    const state = decodeState(await readFile(path, "utf8"));
    expect(state.disabledAccountIds).toHaveLength(12);
    expect((await stat(path)).mode & 0o777).toBe(0o600);
    expect(await new FileStateStore(path).transaction((s) => s.disabledAccountIds.length)).toBe(12);
  });

  it("migrates v1 state without deleting retained consumption/cooldown/auth metadata", async () => {
    const path = join(await temporary(), "state.json");
    const { waiters: _waiters, ...rest } = emptyState();
    const legacy = {
      ...rest,
      version: 1,
      disabledAccountIds: ["account-0"],
      groups: [
        {
          id: "group-0",
          policy: poolConfig(1).quotaGroups[0],
          starts: [100000],
          cooldownUntil: 200000,
        },
      ],
    };
    const original = JSON.stringify(legacy);
    await writeFile(path, original);
    const decoded = decodeState(original);
    expect(decoded.version).toBe(3);
    expect(decoded.waiters).toEqual([]);
    expect(decoded.groups).toEqual(legacy.groups);
    expect(decoded.disabledAccountIds).toEqual(["account-0"]);
    expect(await readFile(path, "utf8")).toBe(original);
    await new FileStateStore(path).transaction(() => undefined);
    expect(decodeState(await readFile(path, "utf8"))).toEqual(decoded);
  });

  it("migrates v2 leases without startedAt instead of failing closed", async () => {
    // Real state written before L1 (2026-10-12): version 2, leases with five keys only.
    // This previously threw "state is corrupt" and made the router unusable for every
    // user with pre-L1 state (the reported production failure).
    const legacyV2 = JSON.stringify({
      version: 2,
      lastAccountId: "agnes-msb",
      groups: [
        {
          id: "agnes-msb-pool",
          policy: {
            id: "agnes-msb-pool",
            maxConcurrent: 1,
            limits: [{ requests: 10, windowMs: 60000 }],
          },
          starts: [1791784378493],
          cooldownUntil: 1791686186606,
        },
      ],
      disabledAccountIds: [],
      leases: [
        {
          id: "cd4f85a1-f7d1-4c8d-942f-7f86b1be9977",
          accountId: "agnes-msb",
          groupId: "agnes-msb-pool",
          owner: "4a961c99-50b9-426e-af55-99c6488c4d80",
          pid: 41079,
        },
      ],
      waiters: [],
    });
    const decoded = decodeState(legacyV2);
    expect(decoded.version).toBe(3);
    expect(decoded.leases).toEqual([
      {
        id: "cd4f85a1-f7d1-4c8d-942f-7f86b1be9977",
        accountId: "agnes-msb",
        groupId: "agnes-msb-pool",
        owner: "4a961c99-50b9-426e-af55-99c6488c4d80",
        pid: 41079,
        startedAt: 0,
      },
    ]);
    expect(decoded.waiters).toEqual([]);
    expect(decoded.groups[0]?.starts).toEqual([1791784378493]);
    // A v3 file with a lease still missing startedAt remains structural corruption.
    expect(() =>
      decodeState(
        JSON.stringify({
          ...emptyState(),
          leases: [{ id: "x", accountId: "a", groupId: "g", owner: "o", pid: 1 }],
        }),
      ),
    ).toThrow("state is corrupt");
  });

  it("rejects corrupt JSON and structural corruption without overwriting", async () => {
    const path = join(await temporary(), "state.json");
    for (const value of [
      "{broken",
      JSON.stringify({ ...emptyState(), leases: [{ pid: 1 }] }),
      JSON.stringify({
        ...emptyState(),
        leases: [{ id: "x", accountId: "a", groupId: "g", owner: "o", pid: 1 }],
      }),
      JSON.stringify({
        ...emptyState(),
        leases: [{ id: "x", accountId: "a", groupId: "g", owner: "o", pid: 1, startedAt: 0 }],
      }),
      JSON.stringify({ ...emptyState(), unexpected: "DO_NOT_ECHO" }),
    ]) {
      await writeFile(path, value);
      await expect(new FileStateStore(path).transaction(() => 0)).rejects.toThrow(
        "state is corrupt",
      );
      expect(await readFile(path, "utf8")).toBe(value);
    }
  });

  it.each([false, true])(
    "fails closed on unlock failure and preserves any primary failure: %s",
    async (primaryFailure) => {
      const path = join(await temporary(), "state.json");
      const original = lockfile.lock;
      vi.spyOn(lockfile, "lock").mockImplementationOnce(async (file, options) => {
        const release = await original(file, options);
        return async () => {
          await release();
          throw new Error("NEVER_ECHO");
        };
      });
      const operation = new FileStateStore(path).transaction(() => {
        if (primaryFailure) throw new RouterError("state", "Expected primary failure");
        return "ok";
      });
      await expect(operation).rejects.toThrow(
        primaryFailure ? "Expected primary failure" : "lock release failed",
      );
      await expect(operation).rejects.not.toThrow("NEVER_ECHO");
    },
  );

  it("does not commit when a transaction throws", async () => {
    const path = join(await temporary(), "state.json");
    const store = new FileStateStore(path);
    await store.transaction(() => undefined);
    await expect(
      store.transaction((state) => {
        state.disabledAccountIds.push("a");
        throw new Error("unsafe body");
      }),
    ).rejects.toThrow("transaction failed");
    expect(decodeState(await readFile(path, "utf8")).disabledAccountIds).toEqual([]);
  });

  it("prunes dead PID reservations but retains quota", async () => {
    const store = new FileStateStore(join(await temporary(), "state.json"));
    const config = poolConfig(1);
    const router = new AccountRouter(config, store, systemClock);
    const lease = await router.acquire(new Set(["account-0"]));
    await store.transaction((state) => {
      const held = state.leases[0];
      if (held) held.pid = 2147483647;
    });
    const replacement = await router.acquire(new Set(["account-0"]));
    expect(replacement.id).not.toBe(lease.id);
    expect(await store.transaction((s) => s.groups[0]?.starts.length)).toBe(2);
    await router.release(replacement);
  });

  it("coordinates actual child processes without overcommitting one group", async () => {
    const path = join(await temporary(), "state.json");
    const fixture = fileURLToPath(new URL("./reserve-child.fixture.ts", import.meta.url));
    const children = Array.from({ length: 4 }, () =>
      fork(fixture, [path], {
        execArgv: ["--import", "tsx"],
        stdio: ["ignore", "pipe", "pipe", "ipc"],
      }),
    );
    try {
      await Promise.all(
        children.map(
          (child) =>
            new Promise<void>((resolve, reject) => {
              child.once("error", reject);
              child.once("exit", () => reject(new Error("Fixture exited before readiness")));
              child.once("message", (m) =>
                m === "ready" ? resolve() : reject(new Error("Unexpected fixture message")),
              );
            }),
        ),
      );
      const results = children.map(
        (child) => new Promise<unknown>((resolve) => child.once("message", resolve)),
      );
      for (const child of children) child.send("go");
      expect((await Promise.all(results)).filter((r) => r === "acquired")).toHaveLength(1);
      const exits = children.map(
        (child) => new Promise<void>((resolve) => child.once("exit", () => resolve())),
      );
      for (const child of children) child.send("finish");
      await Promise.all(exits);
      expect(decodeState(await readFile(path, "utf8")).leases).toEqual([]);
    } finally {
      for (const child of children) child.kill();
    }
  });

  it("namespaces state by endpoint and respects cancellation before IO", async () => {
    const config = defaults();
    const before = statePath("/agent", config);
    config.provider.baseUrl = "https://other.example/v1";
    expect(statePath("/agent", config)).not.toBe(before);
    const controller = new AbortController();
    controller.abort();
    await expect(
      new FileStateStore(join(await temporary(), "state.json")).transaction(
        () => 0,
        controller.signal,
      ),
    ).rejects.toThrow("aborted");
  });
});
