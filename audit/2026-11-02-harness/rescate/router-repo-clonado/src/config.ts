import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadProviderCatalog,
  resolveProviderContract,
  validateAgainstProviderContract,
} from "./adapters/provider-catalog.ts";
import { formatZodErrors, RouterConfigSchema } from "./config.zod.ts";
import { type ModelSpec, type RouterConfig, RouterError } from "./domain/types.ts";

const AGNES_BASE_URL = "https://apihub.agnes-ai.com/v1";
const FREE_MODELS = ["agnes-3.0-flash", "agnes-2.5-flash"];

export function defaults(): RouterConfig {
  return {
    version: 1,
    provider: {
      adapter: "agnes",
      baseUrl: AGNES_BASE_URL,
      models: FREE_MODELS.map((id) => ({
        id,
        name: `${id} (account router)`,
        reasoning: true,
        input: ["text"],
        contextWindow: 512000,
        maxTokens: 65536,
      })),
    },
    accounts: [
      {
        id: "agnes-local",
        quotaGroup: "agnes-free",
        credential: { piProvider: "agnes-ai" },
        enabled: true,
      },
    ],
    quotaGroups: [
      { id: "agnes-free", maxConcurrent: 1, limits: [{ requests: 10, windowMs: 60000 }] },
    ],
    maxWaitMs: null,
    rateLimitRecovery: "wait",
    requestTimeoutMs: 120000,
    rateLimitCooldownMs: 60000,
    transientCooldownMs: 5000,
    maxTransientRetries: 2,
    shadowEnabled: false,
    latencyEWMAAlpha: 0.5,
    latencyThresholdMs: 2000,
  };
}

function invalid(at: string): never {
  throw new RouterError("config", `Invalid account-router configuration at ${at}.`);
}

function unique(values: string[], at: string): void {
  if (new Set(values).size !== values.length) invalid(at);
}

export function parseConfig(value: unknown): RouterConfig {
  // Field-level validation (shape, types, bounds, defaults, unknown-field
  // rejection) is owned by the Zod schema; everything below is cross-field
  // or provider-semantic.
  const result = RouterConfigSchema.safeParse(value);
  if (!result.success) throw new RouterError("config", formatZodErrors(result.error));
  const c = result.data;
  const fallback = defaults();
  const p = c.provider ?? { adapter: "agnes" as const };

  const base = p.baseUrl ?? (p.adapter === "agnes" ? AGNES_BASE_URL : undefined);
  if (base === undefined) invalid("provider.baseUrl");
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    invalid("provider.baseUrl");
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !(
      url.protocol === "https:" ||
      (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    )
  )
    invalid("provider.baseUrl");
  const baseUrl = url.toString().replace(/\/$/, "");
  if (p.adapter === "agnes" && baseUrl !== AGNES_BASE_URL) invalid("provider.baseUrl");

  let models: ModelSpec[];
  if (p.models === undefined) {
    if (p.adapter !== "agnes") invalid("provider.models");
    models = fallback.provider.models;
  } else {
    for (const m of p.models) {
      unique(m.input, "model.input");
      if (m.contextWindow < m.maxTokens) invalid("model.contextWindow");
    }
    models = p.models;
  }
  unique(
    models.map((m) => m.id),
    "provider.models",
  );
  if (p.adapter === "agnes" && models.some((m) => !FREE_MODELS.includes(m.id)))
    invalid("provider.models.free-only");

  const accounts = c.accounts;
  const quotaGroups = c.quotaGroups.map((g) => ({
    ...g,
    limits: [...g.limits].sort((a, b) => a.windowMs - b.windowMs),
  }));
  for (const g of c.quotaGroups) {
    unique(
      g.limits.map((l) => String(l.windowMs)),
      "group.limits",
    );
  }
  unique(
    accounts.map((a) => a.id),
    "accounts",
  );
  unique(
    quotaGroups.map((g) => g.id),
    "quotaGroups",
  );
  if (accounts.some((a) => !quotaGroups.some((g) => g.id === a.quotaGroup)))
    invalid("account.quotaGroup");
  const latencyEWMAAlpha =
    c.latencyEWMAAlpha >= 0 && c.latencyEWMAAlpha <= 1
      ? c.latencyEWMAAlpha
      : fallback.latencyEWMAAlpha;
  return {
    version: 1,
    provider: { adapter: p.adapter, baseUrl, models },
    accounts,
    quotaGroups,
    maxWaitMs: c.maxWaitMs,
    rateLimitRecovery: c.rateLimitRecovery,
    requestTimeoutMs: c.requestTimeoutMs,
    rateLimitCooldownMs: c.rateLimitCooldownMs,
    transientCooldownMs: c.transientCooldownMs,
    maxTransientRetries: c.maxTransientRetries,
    shadowEnabled: c.shadowEnabled,
    latencyEWMAAlpha,
    latencyThresholdMs: c.latencyThresholdMs,
  };
}

export async function loadConfig(agentDir: string, explicitPath?: string): Promise<RouterConfig> {
  const path = explicitPath ? resolve(explicitPath) : join(agentDir, "account-router.json");
  let contents: string;
  try {
    contents = await readFile(path, "utf8");
  } catch (error) {
    if (!explicitPath && (error as NodeJS.ErrnoException).code === "ENOENT") return defaults();
    throw new RouterError("config", "Cannot read account-router configuration file.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    invalid("JSON");
  }
  const config = parseConfig(parsed);
  await validateProviderContracts(config);
  return config;
}

/**
 * Fail closed against the shipped provider catalog, only for accounts that
 * explicitly opt in with `providerContract`. No catalog I/O otherwise.
 */
async function validateProviderContracts(config: RouterConfig): Promise<void> {
  const bound = config.accounts.filter((account) => account.providerContract);
  if (bound.length === 0) return;
  const catalogRoot = join(fileURLToPath(new URL("../", import.meta.url)), "catalog");
  const catalog = await loadProviderCatalog(catalogRoot);
  for (const account of bound) {
    if (!account.providerContract) continue;
    const contract = resolveProviderContract(catalog, account.providerContract);
    if (contract.provider === config.provider.adapter) {
      validateAgainstProviderContract(contract, {
        modelIds: config.provider.models.map((m) => m.id),
      });
    }
    const group = config.quotaGroups.find((g) => g.id === account.quotaGroup);
    if (!group) continue;
    for (const limit of group.limits) {
      validateAgainstProviderContract(contract, {
        window: { requests: limit.requests, windowMs: limit.windowMs },
      });
    }
  }
}
