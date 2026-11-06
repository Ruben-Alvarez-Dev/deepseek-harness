import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { RouterError } from "../domain/types.ts";

/** Prefixed UUIDv7 (RFC 9562, serialization policy a0d1f1e). */
export const MdlUuidV7Schema = z
  .string()
  .regex(
    /^mdl_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    "Model card id must be a prefixed UUIDv7 (mdl_)",
  );

const SourceSchema = z
  .object({
    url: z.string().url(),
    description: z.string().min(1),
    verifiedAt: z.string().datetime(),
  })
  .strict();

const ModelRefSchema = z
  .string()
  .regex(
    /^[a-z0-9][a-z0-9-]*\/[A-Za-z0-9@][A-Za-z0-9._:/*@-]*@v\d+$/,
    "model reference must be provider/model@vN",
  );

export const ModelCardSchema = z
  .object({
    id: MdlUuidV7Schema,
    modelId: z.string().regex(/^[A-Za-z0-9@][A-Za-z0-9._:/@-]{0,199}$/, "Invalid model ID format"),
    provider: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "provider must be a slug"),
    version: z.number().int().min(1),
    name: z.string().regex(/^[^\p{Cc}\p{Cf}]{1,100}$/u, "Invalid model name"),
    context: z
      .object({
        maxInput: z.number().int().positive(),
        maxOutput: z.number().int().positive(),
      })
      .strict(),
    capabilities: z
      .object({
        input: z.array(z.enum(["text", "image_url", "audio"])).min(1),
        streaming: z.boolean(),
        toolCalling: z.boolean(),
        reasoning: z.boolean(),
        vision: z.boolean(),
        audio: z.boolean(),
        caching: z.boolean(),
      })
      .strict(),
    pricing: z
      .object({
        currency: z.string().min(1),
        input: z.number().min(0),
        output: z.number().min(0),
        cacheRead: z.number().min(0).optional(),
        cacheWrite: z.number().min(0).optional(),
        note: z.string().optional(),
      })
      .strict(),
    quirks: z
      .object({
        rateLimitHeaders: z.boolean(),
        notes: z.string(),
      })
      .strict(),
    engine: z
      .record(z.string(), z.unknown())
      .describe("Local inference engine parameters; empty for API-only models"),
    supersedes: ModelRefSchema.nullable().default(null),
    supersededBy: ModelRefSchema.nullable().default(null),
    verifiedAt: z.string().datetime(),
    sources: z.array(SourceSchema).min(1),
  })
  .strict();

export type ModelCard = z.output<typeof ModelCardSchema>;

export interface ModelCatalog {
  /** By "provider/modelId" key, all versions. */
  byModelKey: Map<string, ModelCard[]>;
}

function catalogModelError(message: string): never {
  throw new RouterError("config", message);
}

function modelKey(card: Pick<ModelCard, "provider" | "modelId">): string {
  return `${card.provider}/${card.modelId}`;
}

async function collectFiles(dir: string, out: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await collectFiles(full, out);
    else if (entry.name.endsWith(".json") && !entry.name.startsWith("_")) out.push(full);
  }
}

/** Load every published model card under `<catalogRoot>/models/`. */
export async function loadModelCatalog(catalogRoot: string): Promise<ModelCatalog> {
  const dir = join(catalogRoot, "models");
  let files: string[] = [];
  try {
    const s = await stat(dir);
    if (s.isDirectory()) {
      files = [];
      await collectFiles(dir, files);
    }
  } catch {
    files = [];
  }
  const byModelKey = new Map<string, ModelCard[]>();
  for (const file of files) {
    const raw: unknown = JSON.parse(await readFile(file, "utf8"));
    const result = ModelCardSchema.safeParse(raw);
    if (!result.success)
      catalogModelError(
        `Model card ${file} is invalid: ${result.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`,
      );
    const card = result.data;
    const key = modelKey(card);
    const versions = byModelKey.get(key) ?? [];
    if (versions.some((v) => v.version === card.version))
      catalogModelError(`Duplicate model card version ${key} v${card.version}.`);
    versions.push(card);
    byModelKey.set(key, versions);
  }
  return { byModelKey };
}

/**
 * Resolve a model card. `"provider/model"` returns the latest version;
 * `"provider/model@vN"` returns that exact version.
 */
export function resolveModelCard(catalog: ModelCatalog, ref: string): ModelCard {
  const at = ref.lastIndexOf("@");
  const key = at > 0 ? ref.slice(0, at) : ref;
  const wanted = at > 0 ? Number.parseInt(ref.slice(at + 2), 10) : null;
  const versions = catalog.byModelKey.get(key);
  if (!versions || versions.length === 0)
    catalogModelError(`Model card ${ref} not found in catalog.`);
  if (wanted === null) return versions.reduce((a, b) => (b.version > a.version ? b : a));
  const card = versions.find((v) => v.version === wanted);
  if (!card) catalogModelError(`Model card ${ref} not found in catalog.`);
  return card;
}
