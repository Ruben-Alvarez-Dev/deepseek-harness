import { mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PiCredentialResolver, resolveAccounts } from "../src/adapters/credentials.ts";
import { poolConfig } from "./helpers.ts";

const directories: string[] = [];
async function auth(value: unknown) {
  const dir = await mkdtemp(join(tmpdir(), "pi-router-auth-test-"));
  directories.push(dir);
  await writeFile(join(dir, "auth.json"), JSON.stringify(value), { mode: 0o600 });
  return { dir, resolver: new PiCredentialResolver(dir, { TEST_KEY: "synthetic-key" }) };
}
afterEach(async () => {
  await Promise.all(directories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("read-only secret references", () => {
  it("resolves environment values with provider-scoped precedence and missing-key skipping", async () => {
    const resolver = new PiCredentialResolver("/nonexistent", { KEY: "synthetic-default" });
    expect(await resolver.resolve({ env: "KEY" })).toBe("synthetic-default");
    expect(await resolver.resolve({ env: "KEY" }, { KEY: "scoped" })).toBe("scoped");
    expect(await resolver.resolve({ env: "MISSING" })).toBeUndefined();
    expect(await resolver.resolve({ piProvider: "missing" })).toBeUndefined();
  });

  it("does not treat inherited object properties as credentials or environment variables", async () => {
    const { dir } = await auth({});
    const resolver = new PiCredentialResolver(dir, {});
    expect(await resolver.resolve({ piProvider: "constructor" })).toBeUndefined();
    expect(await resolver.resolve({ env: "constructor" }, {})).toBeUndefined();
  });

  it("reads current Pi credential each time and never modifies storage", async () => {
    const { dir, resolver } = await auth({ "agnes-ai": { type: "api_key", key: "synthetic-one" } });
    expect(await resolver.resolve({ piProvider: "agnes-ai" })).toBe("synthetic-one");
    await writeFile(
      join(dir, "auth.json"),
      JSON.stringify({ "agnes-ai": { type: "api_key", key: "synthetic-two" } }),
    );
    // Force a distinct mtime so the mtime-based cache invalidation is deterministic.
    await utimes(join(dir, "auth.json"), new Date(0), new Date(Date.now() + 5000));
    expect(await resolver.resolve({ piProvider: "agnes-ai" })).toBe("synthetic-two");
    expect(await resolver.resolve({ piProvider: "missing" })).toBeUndefined();
  });

  // biome-ignore lint/suspicious/noTemplateCurlyInString: literal Pi auth interpolation, not JavaScript interpolation.
  it.each(["$TEST_KEY", "${TEST_KEY}"])(
    "supports existing stored environment reference %s",
    async (key) => {
      const { resolver } = await auth({ p: { type: "api_key", key } });
      expect(await resolver.resolve({ piProvider: "p" })).toBe("synthetic-key");
      expect(
        await resolver.resolve({ piProvider: "p" }, async () => "synthetic-auth-context"),
      ).toBe("synthetic-auth-context");
    },
  );

  it.each([
    { p: { type: "oauth", access: "NEVER_ECHO" } },
    { p: { type: "api_key", key: "!echo NEVER_ECHO" } },
    { p: { type: "api_key", key: "$INVALID NEVER_ECHO" } },
    { p: { type: "api_key", key: 123 } },
    { p: "NEVER_ECHO" },
    ["NEVER_ECHO"],
  ])("rejects unsupported auth safely without executing commands", async (value) => {
    const { resolver } = await auth(value);
    await expect(resolver.resolve({ piProvider: "p" })).rejects.not.toThrow("NEVER_ECHO");
  });

  it("fails closed for corrupt storage and rejects control characters", async () => {
    const { dir, resolver } = await auth({});
    await writeFile(join(dir, "auth.json"), "{broken");
    await expect(resolver.resolve({ piProvider: "p" })).rejects.toThrow("JSON");
    await expect(resolver.resolve({ env: "KEY" }, { KEY: "unsafe\nkey" })).rejects.toThrow(
      "format",
    );
  });

  it("detects duplicate resolved keys across pools but accepts shared-group keys", async () => {
    const config = poolConfig(2);
    const resolver = { resolve: async () => "synthetic-same" };
    await expect(resolveAccounts(config.accounts, resolver)).rejects.toThrow(
      "different quota groups",
    );
    config.accounts.forEach((a) => {
      a.quotaGroup = "shared";
    });
    expect((await resolveAccounts(config.accounts, resolver)).size).toBe(2);
  });

  it("skips disabled accounts and obeys abort before reading a credential", async () => {
    const config = poolConfig(2);
    const a = config.accounts[0];
    if (a) a.enabled = false;
    expect(
      (await resolveAccounts(config.accounts, { resolve: async () => "synthetic" })).size,
    ).toBe(1);
    const controller = new AbortController();
    controller.abort();
    await expect(
      resolveAccounts(
        config.accounts,
        { resolve: async () => "synthetic" },
        undefined,
        controller.signal,
      ),
    ).rejects.toThrow("aborted");
  });
});
