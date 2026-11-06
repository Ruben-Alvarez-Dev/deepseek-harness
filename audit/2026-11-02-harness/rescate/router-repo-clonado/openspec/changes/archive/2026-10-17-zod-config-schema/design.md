# Design: Zod Config Schema

## Architecture

```
src/config.zod.ts          ← Zod schemas (NEW)
src/config.ts              ← delegates to Zod (MODIFIED)
tests/config-zod.test.ts    ← validation tests (NEW)
```

## Schemas

### `LimitSchema`
```typescript
z.object({
  requests: z.number().int().positive("requests must be a positive integer"),
  windowMs: z.number().int().positive("windowMs must be a positive integer"),
})
```

### `QuotaGroupSchema`
```typescript
z.object({
  id: z.string().min(1),
  maxConcurrent: z.number().int().min(1).max(10),
  limits: z.array(LimitSchema).min(1, "at least one limit required"),
})
```

### `AccountSchema`
```typescript
z.object({
  id: z.string().min(1),
  quotaGroup: z.string().min(1),
  credential: z.union([EnvRefSchema, PiProviderRefSchema]),
  enabled: z.boolean().default(true),
  priority: z.enum(["premium", "normal", "fallback"]).default("normal"),
})
```

### `RouterConfigSchema`
```typescript
z.object({
  version: z.literal(1),
  provider: z.object({
    adapter: z.enum(["agnes", "openai-compatible"]),
    baseUrl: z.string().url().optional(),
    models: z.array(ModelSchema).optional(),
  }),
  accounts: z.array(AccountSchema).min(1),
  quotaGroups: z.array(QuotaGroupSchema).min(1),
  // Policies — all optional with defaults
  rateLimitRecovery: z.enum(["wait", "error"]).default("wait"),
  maxWaitMs: z.number().int().nullable().default(null),
  maxTransientRetries: z.number().int().min(0).max(5).default(2),
  rateLimitCooldownMs: z.number().int().positive().default(60000),
  transientCooldownMs: z.number().int().positive().default(5000),
  requestTimeoutMs: z.number().int().positive().default(120000),
  shadowEnabled: z.boolean().default(false),
  episodeMemoryEnabled: z.boolean().default(false),
  latencyEWMAAlpha: z.number().min(0).max(1).default(0.5),
  latencyThresholdMs: z.number().int().positive().default(2000),
  // Future policies (Phase 2-3) — added here but optional
  circuitBreaker: CircuitBreakerSchema.optional(),
  backoffJitter: BackoffJitterSchema.optional(),
})
```

## Migration path

`parseConfig()` in `config.ts` changes from:
```typescript
export function parseConfig(raw: unknown): RouterConfig {
  // 200 lines of manual validation...
}
```
to:
```typescript
export function parseConfig(raw: unknown): RouterConfig {
  const result = RouterConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new RouterError("config", formatZodErrors(result.error));
  }
  return result.data;
}
```

Existing defaults spread across `parseConfig()` move into `.default()` on the Zod schema.
Cross-field validations (e.g., "account quotaGroup must exist in quotaGroups") remain in `parseConfig()` after Zod validation.

## Error formatting

Zod errors → human-readable:
```
ZodError: [
  { path: ["accounts", 0, "quotaGroup"], message: "Required" },
  { path: ["quotaGroups", 2, "maxConcurrent"], message: "Expected >=1, got 0" }
]
↓ formatZodErrors()
"accounts[0].quotaGroup: Required. quotaGroups[2].maxConcurrent: Expected >=1, got 0."
```

## Interlock with future changes

- Credentials remain the flat `env` or `piProvider` alternatives in `credential`.
- `circuit-breaker`: adds `CircuitBreakerSchema` to policies
