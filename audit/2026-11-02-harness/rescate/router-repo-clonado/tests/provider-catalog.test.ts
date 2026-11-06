import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  latestProviderContract,
  loadProviderCatalog,
  ProviderContractSchema,
  resolveProviderContract,
  validateAgainstProviderContract,
} from "../src/adapters/provider-catalog.ts";
import { RouterError } from "../src/domain/types.ts";

const validContract = {
  id: "ctr_d424a0c2-132f-7a32-ad87-2d1217934923",
  contractId: "agnes/free-v1",
  provider: "agnes",
  contractType: "free",
  displayName: "Agnes Free Tier",
  verifiedAt: "2026-10-10T00:00:00Z",
  supersedes: null,
  supersededBy: null,
  auth: { method: "api_key", headerName: "Authorization", headerFormat: "Bearer {key}" },
  api: {
    baseUrl: "https://apihub.agnes-ai.com/v1",
    chatEndpoint: "/chat/completions",
    apiType: "openai-completions",
  },
  models: [
    { id: "agnes-3.0-flash", contextWindow: 512000, maxOutputTokens: 65536 },
    { id: "agnes-2.5-flash", contextWindow: 512000, maxOutputTokens: 65536 },
  ],
  limits: {
    rpm: 10,
    rpmNominal: 30,
    rpd: null,
    maxConcurrent: null,
    notes: "10 RPM efectivos verificados 2026-10-10.",
  },
  knownQuirks: {
    rateHeaders: false,
    retryAfter: false,
    insufficientQuotaCode: "insufficient_quota",
    notes: "Sin headers de rate limit.",
  },
  sources: [
    {
      url: "https://wiki.agnes-ai.com/en/docs/tokenplan",
      description: "Límites de cuota",
      verifiedAt: "2026-10-10T00:00:00Z",
    },
  ],
};

async function catalogWith(
  ...contracts: object[]
): Promise<Awaited<ReturnType<typeof loadProviderCatalog>>> {
  const dir = await mkdtemp(join(tmpdir(), "pi-contracts-test-"));
  for (const [index, contract] of contracts.entries()) {
    const c = contract as Record<string, unknown>;
    const slug = String(c.contractId as string).replace("/", "/");
    const targetDir = join(dir, "contracts", slug.split("/")[0] ?? String(index));
    await mkdir(targetDir, { recursive: true });
    const file = join(targetDir, `${slug.split("/")[1] ?? String(index)}.json`);
    await writeFile(file, JSON.stringify(contract, null, 2));
  }
  const catalog = await loadProviderCatalog(dir);
  void rm(dir, { recursive: true, force: true });
  return catalog;
}

describe("provider catalog", () => {
  it("validates a well-formed contract against the schema", () => {
    const result = ProviderContractSchema.safeParse(validContract);
    expect(result.success).toBe(true);
  });

  it("rejects an unprefixed contract id (serialization policy)", () => {
    const broken = { ...validContract, id: "no-prefijo" };
    expect(ProviderContractSchema.safeParse(broken).success).toBe(false);
  });

  it("resolves a contract by reference", async () => {
    const catalog = await catalogWith(validContract);
    const contract = resolveProviderContract(catalog, "agnes/free-v1");
    expect(contract.contractId).toBe("agnes/free-v1");
    expect(contract.limits.rpm).toBe(10);
    expect(() => resolveProviderContract(catalog, "agnes/free-v9")).toThrow(RouterError);
  });

  it("rejects a model that is not listed in the contract", async () => {
    const catalog = await catalogWith(validContract);
    const contract = resolveProviderContract(catalog, "agnes/free-v1");
    expect(() =>
      validateAgainstProviderContract(contract, { modelIds: ["agnes-3.0-pro"] }),
    ).toThrow(/agnes-3.0-pro is not available in contract agnes\/free-v1/);
    expect(() =>
      validateAgainstProviderContract(contract, { modelIds: ["agnes-3.0-flash"] }),
    ).not.toThrow();
  });

  it("rejects a quota window that exceeds the contract RPM", async () => {
    const catalog = await catalogWith(validContract);
    const contract = resolveProviderContract(catalog, "agnes/free-v1");
    expect(() =>
      validateAgainstProviderContract(contract, {
        window: { requests: 20, windowMs: 60000 },
      }),
    ).toThrow(/exceeds contract agnes\/free-v1 \(10 RPM\)/);
    expect(() =>
      validateAgainstProviderContract(contract, { window: { requests: 10, windowMs: 60000 } }),
    ).not.toThrow();
    // A window with a different granularity is converted to its RPM equivalent.
    expect(() =>
      validateAgainstProviderContract(contract, { window: { requests: 1, windowMs: 5000 } }),
    ).toThrow();
  });

  it("chains supersedes/supersededBy and resolves the latest", async () => {
    const v1 = {
      ...validContract,
      id: "ctr_d424a0c2-132f-7a32-ad87-2d1217934923",
      contractId: "agnes/free-v1",
      supersedes: null,
      supersededBy: "agnes/free-v2",
      limits: { ...validContract.limits, rpm: 20 },
    };
    const v2 = {
      ...v1,
      id: "ctr_e9a0b1c2-334d-7f55-8c6f-0a1b2c3d4e5f",
      contractId: "agnes/free-v2",
      supersedes: "agnes/free-v1",
      supersededBy: null,
    };
    const catalog = await catalogWith(v1, v2);
    expect(latestProviderContract(catalog, "agnes", "free").contractId).toBe("agnes/free-v2");
    // An anchored reference still resolves the old contract.
    expect(resolveProviderContract(catalog, "agnes/free-v1").limits.rpm).toBe(20);
  });

  it("rejects an inconsistent contract chain (two open ends)", async () => {
    const v1 = { ...validContract, contractId: "agnes/free-v1", supersededBy: null as null };
    const v2 = {
      ...validContract,
      id: "ctr_e9a0b1c2-334d-7f55-8c6f-0a1b2c3d4e5f",
      contractId: "agnes/free-v2",
      supersedes: "agnes/free-v1",
      supersededBy: null as null,
    };
    const catalog = await catalogWith(v1, v2);
    expect(() => latestProviderContract(catalog, "agnes", "free")).toThrow(/inconsistent/);
  });
});
