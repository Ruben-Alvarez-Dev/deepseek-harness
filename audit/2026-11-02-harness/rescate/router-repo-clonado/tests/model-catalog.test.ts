import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadModelCatalog,
  ModelCardSchema,
  resolveModelCard,
} from "../src/adapters/model-catalog.ts";
import { RouterError } from "../src/domain/types.ts";

const validCard = {
  id: "mdl_e3a96b8c-92c4-73e6-90df-c9ec54f64e13",
  modelId: "agnes-3.0-flash",
  provider: "agnes",
  version: 1,
  name: "Agnes 3.0 Flash (account router)",
  context: { maxInput: 512000, maxOutput: 65536 },
  capabilities: {
    input: ["text"],
    streaming: true,
    toolCalling: true,
    reasoning: true,
    vision: false,
    audio: false,
    caching: false,
  },
  pricing: {
    currency: "USD",
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    note: "Precio publicado 0; la factura es la fuente de verdad.",
  },
  quirks: {
    rateLimitHeaders: false,
    notes: "Agnes no envía headers de rate limit; la señal de agotamiento es el 429.",
  },
  engine: { note: "API-only; sin inferencia local." },
  supersedes: null,
  supersededBy: null,
  verifiedAt: "2026-10-09T00:00:00Z",
  sources: [
    {
      url: "https://wiki.agnes-ai.com/en/docs/agnes-30-flash",
      description: "Especificación del modelo",
      verifiedAt: "2026-10-09T00:00:00Z",
    },
  ],
};

async function modelsWith(
  ...cards: Record<string, unknown>[]
): Promise<Awaited<ReturnType<typeof loadModelCatalog>>> {
  const dir = await mkdtemp(join(tmpdir(), "pi-models-test-"));
  for (const card of cards) {
    const c = card as { provider?: string; modelId?: string; version?: number };
    const targetDir = join(dir, "models", String(c.provider));
    await mkdir(targetDir, { recursive: true });
    await writeFile(join(targetDir, `${c.modelId}-v${c.version}.json`), JSON.stringify(card));
  }
  const catalog = await loadModelCatalog(dir);
  void rm(dir, { recursive: true, force: true });
  return catalog;
}

describe("model catalog", () => {
  it("validates a well-formed card against the schema", () => {
    expect(ModelCardSchema.safeParse(validCard).success).toBe(true);
  });

  it("rejects an unprefixed model id (serialization policy)", () => {
    const broken = { ...validCard, id: "sin-prefijo" };
    expect(ModelCardSchema.safeParse(broken).success).toBe(false);
  });

  it("queries by modelId (latest version)", async () => {
    const v1: Record<string, unknown> = {
      ...validCard,
      supersededBy: "agnes/agnes-3.0-flash@v2",
    };
    const v2: Record<string, unknown> = {
      ...validCard,
      id: "mdl_9f0fbfd1-4abc-7d01-9e2f-3c4d5e6f7a8b",
      version: 2,
      supersedes: "agnes/agnes-3.0-flash@v1",
      context: { maxInput: 1024000, maxOutput: 65536 },
    };
    const catalog = await modelsWith(v1, v2);
    expect(resolveModelCard(catalog, "agnes/agnes-3.0-flash").version).toBe(2);
  });

  it("queries by modelId@version (anchored)", async () => {
    const v1: Record<string, unknown> = { ...validCard };
    const v2: Record<string, unknown> = {
      ...validCard,
      id: "mdl_9f0fbfd1-4abc-7d01-9e2f-3c4d5e6f7a8b",
      version: 2,
      context: { maxInput: 1024000, maxOutput: 65536 },
    };
    const catalog = await modelsWith(v1, v2);
    expect(resolveModelCard(catalog, "agnes/agnes-3.0-flash@v1").version).toBe(1);
    expect(() => resolveModelCard(catalog, "agnes/agnes-3.0-flash@v9")).toThrow(RouterError);
  });

  it("loads every shipped card", async () => {
    const catalog = await loadModelCatalog(join(process.cwd(), "catalog"));
    expect(catalog.byModelKey.get("agnes/agnes-3.0-flash")?.[0]?.context.maxInput).toBe(512000);
    expect(catalog.byModelKey.get("agnes/agnes-2.5-flash")?.[0]?.pricing.currency).toBe("USD");
  });
});
