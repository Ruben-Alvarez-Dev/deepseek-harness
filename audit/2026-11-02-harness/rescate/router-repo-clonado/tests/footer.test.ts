import { mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { FileStateStore } from "../src/adapters/file-state-store.ts";
import { watchDirectoryEvents } from "../src/adapters/file-watcher.ts";
import { FOOTER_MAX_WIDTH, footerLabel, gradientRgb } from "../src/adapters/footer-label.ts";
import { nextQuotaChange, selectAccount, windowPressure } from "../src/domain/policy.ts";
import { emptyState, type GroupState } from "../src/domain/types.ts";
import { poolConfig } from "./helpers.ts";

describe("footer label", () => {
  it("uses a continuous green-to-red ramp, not a handful of fixed colours", () => {
    const samples = Array.from({ length: 101 }, (_, i) => gradientRgb(i / 100));
    expect(new Set(samples.map((rgb) => rgb.join(","))).size).toBeGreaterThanOrEqual(50);
    const [idle, full] = [gradientRgb(0), gradientRgb(1)];
    expect(idle[1]).toBeGreaterThan(idle[0]);
    expect(full[0]).toBeGreaterThan(full[1]);
    expect(gradientRgb(Number.NaN)).toEqual(full);
  });

  it("never exceeds the fixed width, whatever the model name and anomalies", () => {
    for (const model of ["agnes-3.0-flash", "a-very-long-provider-model-name-that-overflows", ""])
      for (const extras of [
        { waiting: 0, cooldownMs: 0, disabled: 0 },
        { waiting: 120, cooldownMs: 999_000, disabled: 9 },
      ]) {
        const { plain } = footerLabel({ index: 4, total: 4, model, usage: 0.5, ...extras });
        expect([...plain].length).toBeLessThanOrEqual(FOOTER_MAX_WIDTH);
        expect(plain.startsWith("#4/4")).toBe(true);
      }
    expect(
      footerLabel({ total: 4, model: "m", usage: 0, waiting: 0, cooldownMs: 0, disabled: 0 }).plain,
    ).toBe("#–/4 m");
  });
});

describe("least-pressure scheduling", () => {
  const group = (id: string, starts: number[]): GroupState => ({
    id,
    policy: { id, maxConcurrent: 1, limits: [{ requests: 10, windowMs: 60000 }] },
    starts,
    cooldownUntil: 0,
  });

  it("dispatches to the emptiest pool instead of blindly following the rotation cursor", () => {
    const config = poolConfig(3);
    const state = emptyState();
    state.groups = [
      group("group-0", []),
      group("group-1", [99_000, 99_100, 99_200, 99_300, 99_400, 99_500]),
      group("group-2", [99_000]),
    ];
    state.lastAccountId = "account-0"; // round-robin alone would pick account-1 (60% used)
    const available = new Set(["account-0", "account-1", "account-2"]);
    const picked = selectAccount(state, config, available, 100_000);
    expect(picked.accountId).toBe("account-0");
    expect(picked.pressure).toBe(0);
    state.groups[0] = group("group-0", [99_000, 99_100]);
    expect(selectAccount(state, config, available, 100_000).accountId).toBe("account-2");
  });

  it("keeps fair rotation among equally pressured pools", () => {
    const config = poolConfig(3);
    const state = emptyState();
    state.groups = [group("group-0", []), group("group-1", []), group("group-2", [])];
    const available = new Set(["account-0", "account-1", "account-2"]);
    const order: string[] = [];
    for (let i = 0; i < 6; i++) {
      const picked = selectAccount(state, config, available, 100_000);
      if (!picked.accountId) throw new Error("No account picked.");
      order.push(picked.accountId);
      state.lastAccountId = picked.accountId;
      const g = state.groups.find(
        (entry) => entry.id === config.accounts.find((a) => a.id === picked.accountId)?.quotaGroup,
      );
      g?.starts.push(100_000);
    }
    expect(order).toEqual([
      "account-0",
      "account-1",
      "account-2",
      "account-0",
      "account-1",
      "account-2",
    ]);
  });

  it("reports window usage and the next instant a quota value changes by itself", () => {
    const g = group("g", [40_001, 50_000]);
    g.cooldownUntil = 105_000;
    expect(windowPressure(g, 100_000)).toBeCloseTo(0.2);
    expect(nextQuotaChange([g], 100_000)).toBe(100_001);
    expect(nextQuotaChange([group("idle", [])], 100_000)).toBeUndefined();
  });
});

describe("reactive state sources", () => {
  it("file store skips rewrites for read-only transactions and notifies only real commits", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pi-reactive-"));
    try {
      const store = new FileStateStore(join(dir, "state.json"));
      const changed = vi.fn();
      store.onChange(changed);
      await store.transaction((state) => {
        state.lastAccountId = "account-0";
      });
      expect(changed).toHaveBeenCalledTimes(1);
      await store.transaction((state) => state.lastAccountId);
      expect(changed).toHaveBeenCalledTimes(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("directory watcher reacts to sibling tmp+rename writes and stops on unwatch", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pi-watch-"));
    try {
      const onData = vi.fn();
      const unwatch = watchDirectoryEvents(dir, onData, 30);
      for (let i = 0; i < 3; i++) {
        await writeFile(join(dir, `s.${i}.tmp`), String(i));
        await rename(join(dir, `s.${i}.tmp`), join(dir, "state.json"));
      }
      // Reactivity to sibling tmp+rename commits. The 30ms debounce coalesces the
      // burst when timers keep up; under heavy system load they may not, so only
      // reactivity is asserted, not the coalesced call count.
      await vi.waitFor(() => expect(onData).toHaveBeenCalled(), { timeout: 5000 });
      unwatch();
      const after = onData.mock.calls.length;
      await writeFile(join(dir, "state.json"), "later");
      await new Promise((done) => setTimeout(done, 400));
      expect(onData.mock.calls.length).toBe(after);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
