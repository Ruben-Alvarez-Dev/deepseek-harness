import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseConfig } from "../src/config.ts";
import { formatZodErrors, RouterConfigSchema } from "../src/config.zod.ts";

const valid = () => ({
  version: 1,
  provider: { adapter: "agnes" },
  accounts: [{ id: "a", quotaGroup: "g", credential: { env: "KEY_A" } }],
  quotaGroups: [{ id: "g", limits: [{ requests: 10, windowMs: 60000 }] }],
});

const message = (value: unknown): string => {
  try {
    parseConfig(value);
  } catch (error) {
    return String(error);
  }
  throw new Error("expected parseConfig to throw");
};

describe("config-zod", () => {
  it("passes every shipped example", async () => {
    for (const file of ["agnes", "authorized-pool", "openai-compatible"]) {
      const raw = JSON.parse(await readFile(`examples/${file}.json`, "utf8"));
      const config = parseConfig(raw);
      expect(config.version).toBe(1);
    }
  });

  it("catches a negative request limit with the exact field path", () => {
    const value = {
      ...valid(),
      quotaGroups: [{ id: "g", limits: [{ requests: -1, windowMs: 60000 }] }],
    };
    expect(message(value)).toContain("quotaGroups[0].limits[0].requests");
    expect(message(value)).toMatch(/positive/);
  });

  it("catches a missing required account field with the exact field path", () => {
    const { quotaGroup: _omitted, ...rest } = valid().accounts[0] as { quotaGroup: string };
    const value = { ...valid(), accounts: [rest] };
    expect(message(value)).toContain("accounts[0].quotaGroup");
    expect(message(value)).toMatch(/[Rr]equired/);
  });

  it("catches a type mismatch with the exact field path", () => {
    const value = {
      ...valid(),
      quotaGroups: [{ id: "g", maxConcurrent: "five", limits: [{ requests: 1, windowMs: 60000 }] }],
    };
    const msg = message(value);
    expect(msg).toContain("quotaGroups[0].maxConcurrent");
    expect(msg).toMatch(/expected number, received string/);
  });

  it("rejects unknown top-level fields without echoing their values", () => {
    const msg = message({ ...valid(), inventedField: "SECRET_VALUE" });
    expect(msg).toContain("inventedField");
    expect(msg).toMatch(/Unrecognized/i);
    expect(msg).not.toContain("SECRET_VALUE");
  });

  it("rejects unknown nested fields", () => {
    const msg = message({
      ...valid(),
      accounts: [{ id: "a", quotaGroup: "g", credential: { env: "K" }, invented: 1 }],
    });
    expect(msg).toMatch(/Unrecognized/);
    expect(msg).toContain("invented");
  });

  it("applies documented defaults when optional fields are omitted", () => {
    const minimal = {
      version: 1,
      provider: { adapter: "agnes" },
      accounts: [{ id: "a", quotaGroup: "g", credential: { env: "KEY_A" } }],
      quotaGroups: [{ id: "g", limits: [{ requests: 10, windowMs: 60000 }] }],
    };
    const config = parseConfig(minimal);
    expect(config.maxWaitMs).toBeNull();
    expect(config.rateLimitRecovery).toBe("wait");
    expect(config.requestTimeoutMs).toBe(120000);
    expect(config.rateLimitCooldownMs).toBe(60000);
    expect(config.transientCooldownMs).toBe(5000);
    expect(config.maxTransientRetries).toBe(2);
    expect(config.shadowEnabled).toBe(false);
    expect(config.latencyEWMAAlpha).toBe(0.5);
    expect(config.latencyThresholdMs).toBe(2000);
    expect(config.accounts[0]?.enabled).toBe(true);
    expect(config.quotaGroups[0]?.maxConcurrent).toBe(1);
  });

  it("keeps explicit policy values without overriding them", () => {
    const config = parseConfig({
      ...valid(),
      maxWaitMs: 30000,
      rateLimitRecovery: "error",
      requestTimeoutMs: 60000,
      rateLimitCooldownMs: 120000,
      transientCooldownMs: 1000,
      maxTransientRetries: 5,
      shadowEnabled: true,
      latencyEWMAAlpha: 0.2,
      latencyThresholdMs: 1500,
    });
    expect(config.maxWaitMs).toBe(30000);
    expect(config.rateLimitRecovery).toBe("error");
    expect(config.requestTimeoutMs).toBe(60000);
    expect(config.rateLimitCooldownMs).toBe(120000);
    expect(config.transientCooldownMs).toBe(1000);
    expect(config.maxTransientRetries).toBe(5);
    expect(config.shadowEnabled).toBe(true);
    expect(config.latencyEWMAAlpha).toBe(0.2);
    expect(config.latencyThresholdMs).toBe(1500);
  });

  it("fails cross-field when an account references a nonexistent quotaGroup", () => {
    const msg = message({
      ...valid(),
      accounts: [{ id: "a", quotaGroup: "nonexistent", credential: { env: "KEY" } }],
    });
    expect(msg).toMatch(/Invalid account-router configuration/);
  });

  it("fails cross-field on duplicate account IDs", () => {
    const value = { ...valid(), accounts: [...valid().accounts, ...valid().accounts] };
    expect(() => parseConfig(value)).toThrow();
  });

  it("formats ZodError issues with field paths via formatZodErrors", () => {
    const result = RouterConfigSchema.safeParse({ ...valid(), maxWaitMs: -1 });
    if (result.success) throw new Error("expected validation failure");
    const formatted = formatZodErrors(result.error);
    expect(formatted).toContain("maxWaitMs");
    expect(formatted).toMatch(/Invalid account-router configuration/);
  });
});
