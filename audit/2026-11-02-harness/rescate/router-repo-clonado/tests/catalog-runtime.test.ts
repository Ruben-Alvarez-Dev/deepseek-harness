import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.ts";

const directories: string[] = [];
async function configDir(value: object): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "pi-config-rt-"));
  directories.push(dir);
  await writeFile(join(dir, "account-router.json"), JSON.stringify(value), { mode: 0o600 });
  return dir;
}
afterEach(async () => {
  await Promise.all(directories.splice(0).map((p) => rm(p, { recursive: true, force: true })));
});

/** Base config: agnes adapter, one account bound to the shipped free-v1 contract. */
function base(): Record<string, unknown> {
  return {
    version: 1,
    provider: { adapter: "agnes" },
    accounts: [
      {
        id: "local",
        quotaGroup: "free",
        credential: { piProvider: "agnes-ai" },
        providerContract: "agnes/free-v1",
      },
    ],
    quotaGroups: [{ id: "free", maxConcurrent: 1, limits: [{ requests: 10, windowMs: 60000 }] }],
  };
}

describe("catalog-runtime", () => {
  it("loads a contract-conformant configuration", async () => {
    const config = await loadConfig(await configDir(base()));
    expect(config.accounts[0]?.providerContract).toBe("agnes/free-v1");
  });

  it("fails the load on a missing contract reference", async () => {
    const value = base();
    value.accounts = [
      {
        id: "local",
        quotaGroup: "free",
        credential: { piProvider: "agnes-ai" },
        providerContract: "agnes/free-v9",
      },
    ];
    await expect(loadConfig(await configDir(value))).rejects.toThrow(
      "Provider contract agnes/free-v9 not found in catalog",
    );
  });

  it("fails the load when a quota window exceeds the contract RPM", async () => {
    const value = base();
    value.quotaGroups = [
      { id: "free", maxConcurrent: 1, limits: [{ requests: 20, windowMs: 60000 }] },
    ];
    await expect(loadConfig(await configDir(value))).rejects.toThrow(
      "exceeds contract agnes/free-v1 (10 RPM)",
    );
  });

  it("keeps windows exactly at the contract limit", async () => {
    const value = base();
    value.quotaGroups = [
      { id: "free", maxConcurrent: 1, limits: [{ requests: 5, windowMs: 30000 }] }, // 10 RPM equivalent
    ];
    const config = await loadConfig(await configDir(value));
    expect(config.quotaGroups[0]?.limits).toEqual([{ requests: 5, windowMs: 30000 }]);
  });

  it("loads configurations without providerContract", async () => {
    const value = base();
    value.accounts = [{ id: "local", quotaGroup: "free", credential: { piProvider: "agnes-ai" } }];
    const config = await loadConfig(await configDir(value));
    expect(config.accounts[0]?.providerContract).toBeUndefined();
  });
});
