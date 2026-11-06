import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { defaults, loadConfig, parseConfig } from "../src/config.ts";

const valid = () => ({
  version: 1,
  provider: { adapter: "agnes" },
  accounts: [{ id: "a", quotaGroup: "g", credential: { env: "KEY_A" } }],
  quotaGroups: [{ id: "g", limits: [{ requests: 10, windowMs: 60000 }] }],
});

describe("configuration boundary", () => {
  it("uses conservative existing-Pi defaults and advertises only free text models", () => {
    expect(parseConfig(defaults())).toEqual(defaults());
    expect(defaults().accounts[0]?.credential).toEqual({ piProvider: "agnes-ai" });
    expect(
      defaults().provider.models.every((m) => m.input.length === 1 && m.input[0] === "text"),
    ).toBe(true);
  });

  it("defaults to cancellable unlimited waiting and accepts explicit recovery/error policy", () => {
    expect(parseConfig(valid()).maxWaitMs).toBeNull();
    expect(parseConfig(valid()).rateLimitRecovery).toBe("wait");
    expect(
      parseConfig({ ...valid(), maxWaitMs: null, rateLimitRecovery: "error" }).rateLimitRecovery,
    ).toBe("error");
    expect(() => parseConfig({ ...valid(), rateLimitRecovery: "unknown" })).toThrow();
  });

  it("applies defaults and supports zero queue duration", () => {
    expect(parseConfig({ ...valid(), maxWaitMs: 0 }).maxWaitMs).toBe(0);
    expect(parseConfig(valid()).quotaGroups[0]?.maxConcurrent).toBe(1);
  });

  it.each([
    { ...valid(), secret: "DO_NOT_ECHO" },
    { ...valid(), version: 2 },
    { ...valid(), maxWaitMs: -1 },
    { ...valid(), requestTimeoutMs: Number.NaN },
    { ...valid(), accounts: [] },
    { ...valid(), accounts: [{ id: "a\u001b", quotaGroup: "g", credential: { env: "KEY" } }] },
    { ...valid(), accounts: [{ id: "a", quotaGroup: "missing", credential: { env: "KEY" } }] },
    {
      ...valid(),
      accounts: [{ id: "a", quotaGroup: "g", credential: { env: "KEY", piProvider: "a" } }],
    },
    { ...valid(), accounts: [{ id: "a", quotaGroup: "g", credential: { apiKey: "DO_NOT_ECHO" } }] },
    { ...valid(), accounts: [{ id: "a", quotaGroup: "g", credential: { env: "!command" } }] },
    { ...valid(), quotaGroups: [{ id: "g", limits: [{ requests: 0, windowMs: 60000 }] }] },
    { ...valid(), quotaGroups: [{ id: "g", limits: [{ requests: 1.5, windowMs: 60000 }] }] },
    {
      ...valid(),
      quotaGroups: [{ id: "g", maxConcurrent: 0, limits: [{ requests: 1, windowMs: 60000 }] }],
    },
    {
      ...valid(),
      quotaGroups: [
        {
          id: "g",
          limits: [
            { requests: 1, windowMs: 60000 },
            { requests: 2, windowMs: 60000 },
          ],
        },
      ],
    },
    { ...valid(), provider: { adapter: "unknown" } },
    { ...valid(), provider: { adapter: "agnes", baseUrl: "https://unrelated.example/v1" } },
    {
      ...valid(),
      provider: {
        adapter: "agnes",
        models: [{ ...defaults().provider.models[0], id: "agnes-3.0-flash-max" }],
      },
    },
    {
      ...valid(),
      provider: {
        adapter: "openai-compatible",
        baseUrl: "http://remote.example/v1",
        models: defaults().provider.models,
      },
    },
    {
      ...valid(),
      provider: {
        adapter: "openai-compatible",
        baseUrl: "https://user:DO_NOT_ECHO@example.com",
        models: defaults().provider.models,
      },
    },
  ])("rejects invalid configuration without echoing values", (value) => {
    expect(() => parseConfig(value)).toThrow(/Invalid account-router configuration/);
    try {
      parseConfig(value);
    } catch (e) {
      expect(String(e)).not.toContain("DO_NOT_ECHO");
    }
  });

  it("supports namespaced generic model IDs without relaxing account identifiers", () => {
    const config = defaults();
    config.provider.adapter = "openai-compatible";
    const model = config.provider.models[0];
    if (model) model.id = "qwen/qwen3-coder:free";
    expect(parseConfig(config).provider.models[0]?.id).toBe("qwen/qwen3-coder:free");
  });

  it("requires unique account IDs and model IDs", () => {
    const value = valid();
    value.accounts.push(...value.accounts);
    expect(() => parseConfig(value)).toThrow();
    const config = defaults();
    config.provider.models.push(...config.provider.models);
    expect(() => parseConfig(config)).toThrow();
  });

  it("falls back only when the implicit config is absent", async () => {
    expect(await loadConfig("/nonexistent/router-test")).toEqual(defaults());
    await expect(
      loadConfig("/nonexistent/router-test", "/nonexistent/explicit.json"),
    ).rejects.toThrow("Cannot read");
  });

  it("parses every shipped example and standard package manifest", async () => {
    for (const file of ["agnes", "authorized-pool", "openai-compatible"]) {
      expect(parseConfig(JSON.parse(await readFile(`examples/${file}.json`, "utf8"))).version).toBe(
        1,
      );
    }
    const pkg = JSON.parse(await readFile("package.json", "utf8"));
    expect(pkg.pi.extensions).toEqual(["./src/extension.ts"]);
    expect(pkg.dependencies["@earendil-works/pi-ai"]).toBeUndefined();
    expect(pkg.peerDependencies["@earendil-works/pi-ai"]).toBe("*");
  });
});
