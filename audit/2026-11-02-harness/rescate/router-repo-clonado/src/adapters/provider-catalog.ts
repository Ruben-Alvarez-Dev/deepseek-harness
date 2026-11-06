import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { RouterError } from "../domain/types.ts";

/** Prefixed UUIDv7 (RFC 9562, serialization policy a0d1f1e). */
export const CtrUuidV7Schema = z
  .string()
  .regex(
    /^ctr_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    "Contract id must be a prefixed UUIDv7 (ctr_)",
  );

const SlugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "provider/contractType must be a slug");
const ContractRefSchema = z
  .string()
  .regex(
    /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*-v\d+$/,
    "contract reference must be provider/contract-vN",
  );

export const ProviderContractSchema = z
  .object({
    id: CtrUuidV7Schema,
    contractId: ContractRefSchema,
    provider: SlugSchema,
    contractType: SlugSchema,
    displayName: z.string().min(1),
    verifiedAt: z.string().datetime(),
    supersedes: ContractRefSchema.nullable().default(null),
    supersededBy: ContractRefSchema.nullable().default(null),
    auth: z
      .object({
        method: z.string().min(1),
        headerName: z.string().min(1),
        headerFormat: z.string().min(1).optional(),
      })
      .strict(),
    api: z
      .object({
        baseUrl: z.string().url(),
        chatEndpoint: z.string().min(1).optional(),
        apiType: z.string().min(1).optional(),
      })
      .strict(),
    models: z
      .array(
        z
          .object({
            id: z.string().min(1),
            contextWindow: z.number().int().positive().optional(),
            maxOutputTokens: z.number().int().positive().optional(),
          })
          .strict(),
      )
      .min(1),
    limits: z
      .object({
        rpm: z.number().int().positive().nullable(),
        rpmNominal: z.number().int().positive().nullable().optional(),
        rpd: z.number().int().positive().nullable().optional(),
        maxConcurrent: z.number().int().positive().nullable().optional(),
        notes: z.string().optional(),
      })
      .strict(),
    knownQuirks: z
      .object({
        rateHeaders: z.boolean(),
        retryAfter: z.boolean(),
        insufficientQuotaCode: z.string().nullable().optional(),
        notes: z.string().optional(),
      })
      .strict(),
    sources: z
      .array(
        z
          .object({
            url: z.string().url(),
            description: z.string().min(1),
            verifiedAt: z.string().datetime(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export type ProviderContract = z.output<typeof ProviderContractSchema>;

export interface ProviderCatalog {
  /** By contract slug, e.g. "agnes/free-v1". */
  byContractId: Map<string, ProviderContract>;
}

function catalogContractError(message: string): never {
  throw new RouterError("config", message);
}

async function collectFiles(dir: string, out: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await collectFiles(full, out);
    else if (entry.name.endsWith(".json") && !entry.name.startsWith("_")) out.push(full);
  }
}

/** Load every published contract under `<catalogRoot>/contracts/`. */
export async function loadProviderCatalog(catalogRoot: string): Promise<ProviderCatalog> {
  const dir = join(catalogRoot, "contracts");
  let files: string[];
  try {
    files = [];
    const s = await stat(dir);
    if (s.isDirectory()) {
      await collectFiles(dir, files);
    }
  } catch {
    files = [];
  }
  const byContractId = new Map<string, ProviderContract>();
  for (const file of files) {
    const raw: unknown = JSON.parse(await readFile(file, "utf8"));
    const result = ProviderContractSchema.safeParse(raw);
    if (!result.success)
      catalogContractError(
        `Contract file ${file} is invalid: ${result.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`,
      );
    const contract = result.data;
    if (byContractId.has(contract.contractId))
      catalogContractError(`Duplicate contract reference ${contract.contractId}.`);
    byContractId.set(contract.contractId, contract);
  }
  return { byContractId };
}

/** Resolve a concrete contract by reference ("agnes/free-v1"). */
export function resolveProviderContract(
  catalog: ProviderCatalog,
  contractId: string,
): ProviderContract {
  const contract = catalog.byContractId.get(contractId);
  if (!contract) catalogContractError(`Provider contract ${contractId} not found in catalog.`);
  return contract;
}

/** Follow supersededBy chains to the end for a provider/contractType. */
export function latestProviderContract(
  catalog: ProviderCatalog,
  provider: string,
  contractType: string,
): ProviderContract {
  const candidates = [...catalog.byContractId.values()].filter(
    (c) => c.provider === provider && c.contractType === contractType,
  );
  if (candidates.length === 0)
    catalogContractError(`No contract for ${provider}/${contractType} in catalog.`);
  const tips = candidates.filter((c) => c.supersededBy === null);
  if (tips.length !== 1)
    catalogContractError(
      `Contract chain ${provider}/${contractType} is inconsistent: ${tips.length} open ends expected 1.`,
    );
  const tip = tips[0];
  if (!tip) catalogContractError(`No contract for ${provider}/${contractType} in catalog.`);
  let cursor = tip;
  let hops = 0;
  while (cursor.supersedes !== null && hops++ < candidates.length + 1) {
    cursor = resolveProviderContract(catalog, cursor.supersedes);
    if (cursor.provider !== provider || cursor.contractType !== contractType)
      catalogContractError(`Contract chain ${provider}/${contractType} points outside its series.`);
  }
  return tip;
}

export interface ProviderContractCheck {
  /** Models the account may use; all must be listed in the contract. */
  modelIds?: string[];
  /** A quota-group window; its rate must not exceed the contract RPM. */
  window?: { requests: number; windowMs: number };
}

/**
 * Validate account-side choices against a contract (strict mode): unknown
 * models and over-limit windows throw `RouterError("config")`.
 */
export function validateAgainstProviderContract(
  contract: ProviderContract,
  check: ProviderContractCheck,
): void {
  const known = new Set(contract.models.map((m) => m.id));
  for (const modelId of check.modelIds ?? []) {
    if (!known.has(modelId))
      catalogContractError(`Model ${modelId} is not available in contract ${contract.contractId}.`);
  }
  const window = check.window;
  if (window && contract.limits.rpm !== null) {
    const rpm = window.requests * (60000 / window.windowMs);
    if (rpm > contract.limits.rpm)
      catalogContractError(
        `Quota limit ${window.requests} req/${Math.round(window.windowMs / 1000)}s (${rpm} RPM) exceeds contract ${contract.contractId} (${contract.limits.rpm} RPM).`,
      );
  }
}
