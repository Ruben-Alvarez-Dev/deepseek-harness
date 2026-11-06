import { z } from "zod";

/**
 * Zod schemas for the flat router configuration. Field-level rules live here
 * (shape, types, bounds, defaults, unknown-field rejection); cross-field and
 * provider-semantic checks remain in `parseConfig()` (src/config.ts).
 */

export const IdSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/, "Invalid ID format");

const EnvVarSchema = z
  .string()
  .regex(/^[A-Za-z_][A-Za-z0-9_]{0,127}$/, "Invalid environment variable name");

export const ModelIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9@][A-Za-z0-9._:/@-]{0,199}$/, "Invalid model ID format");

export const ModelNameSchema = z.string().regex(/^[^\p{Cc}\p{Cf}]{1,100}$/u, "Invalid model name");

export const LimitSchema = z
  .object({
    requests: z
      .number()
      .int("requests must be a positive integer")
      .min(1, "requests must be a positive integer")
      .max(100000, "requests must be a positive integer"),
    windowMs: z
      .number()
      .int("windowMs must be a positive integer")
      .min(1, "windowMs must be a positive integer")
      .max(31536000000, "windowMs must be a positive integer"),
  })
  .strict();

export const QuotaGroupSchema = z
  .object({
    id: IdSchema,
    maxConcurrent: z.number().int().min(1).max(100).default(1),
    limits: z.array(LimitSchema).min(1).max(10),
  })
  .strict();

const EnvCredentialSchema = z
  .object({
    env: EnvVarSchema,
  })
  .strict();

const PiProviderCredentialSchema = z
  .object({
    piProvider: IdSchema,
  })
  .strict();

export const CredentialReferenceSchema = z.union([EnvCredentialSchema, PiProviderCredentialSchema]);

export const AccountSchema = z
  .object({
    id: IdSchema,
    quotaGroup: IdSchema,
    credential: CredentialReferenceSchema,
    /** Optional link to a versioned provider contract (provider/contract-vN). */
    providerContract: z
      .string()
      .regex(
        /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*-v\d+$/,
        "providerContract must be provider/contract-vN",
      )
      .optional(),
    enabled: z.boolean().default(true),
  })
  .strict();

export const ModelSchema = z
  .object({
    id: ModelIdSchema,
    name: ModelNameSchema,
    reasoning: z.boolean().default(false),
    input: z
      .array(z.enum(["text", "image"]))
      .min(1)
      .max(2)
      .default(["text"]),
    contextWindow: z.number().int().min(1).max(10000000),
    maxTokens: z.number().int().min(1).max(1000000),
  })
  .strict();

export const ProviderSchema = z
  .object({
    adapter: z.enum(["agnes", "openai-compatible"]),
    baseUrl: z.string().optional(),
    models: z.array(ModelSchema).min(1).max(100).optional(),
  })
  .strict();

export const RouterConfigSchema = z
  .object({
    version: z.literal(1),
    provider: ProviderSchema.optional(),
    accounts: z.array(AccountSchema).min(1).max(100),
    quotaGroups: z.array(QuotaGroupSchema).min(1).max(100),
    maxWaitMs: z.union([z.null(), z.number().int().min(0).max(3600000)]).default(null),
    rateLimitRecovery: z.enum(["wait", "error"]).default("wait"),
    requestTimeoutMs: z.number().int().min(1).max(3600000).default(120000),
    rateLimitCooldownMs: z.number().int().min(1).max(86400000).default(60000),
    transientCooldownMs: z.number().int().min(1).max(86400000).default(5000),
    maxTransientRetries: z.number().int().min(0).max(10).default(2),
    shadowEnabled: z.boolean().default(false),
    latencyEWMAAlpha: z.number().default(0.5),
    latencyThresholdMs: z.number().int().min(100).max(30000).default(2000),
  })
  .strict();

function formatPath(path: readonly (string | number)[]): string {
  if (path.length === 0) return "(root)";
  let out = String(path[0]);
  for (const segment of path.slice(1))
    out += typeof segment === "number" ? `[${segment}]` : `.${segment}`;
  return out;
}

/**
 * Convert a ZodError into a single human-readable line with exact field
 * paths (e.g. `quotaGroups[0].limits[0].requests`). Never echoes raw input
 * values; only key names and type names.
 */
export function formatZodErrors(error: z.ZodError): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const issue of error.issues) {
    const path = formatPath(issue.path as readonly (string | number)[]);
    if (seen.has(path)) continue;
    seen.add(path);
    const message =
      issue.code === "unrecognized_keys"
        ? `Unrecognized key(s): ${(issue as { keys?: PropertyKey[] }).keys?.map(String).join(", ")}`
        : issue.code === "invalid_type" && issue.message.endsWith("received undefined")
          ? "Required"
          : issue.message;
    parts.push(`${path}: ${message}`);
  }
  return `Invalid account-router configuration: ${parts.join(" ")}`;
}
