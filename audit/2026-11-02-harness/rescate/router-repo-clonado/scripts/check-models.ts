/** CI: validate every published model card against the Zod schema and check version references. */
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { loadModelCatalog, resolveModelCard } from "../src/adapters/model-catalog.ts";

const catalogRoot = join(fileURLToPath(new URL("..", import.meta.url)), "catalog");

async function main(): Promise<void> {
  const catalog = await loadModelCatalog(catalogRoot);
  let total = 0;
  for (const versions of catalog.byModelKey.values()) {
    total += versions.length;
    for (const card of versions) {
      resolveModelCard(catalog, `${card.provider}/${card.modelId}@v${card.version}`);
      if (card.supersedes !== null) resolveModelCard(catalog, card.supersedes);
      if (card.supersededBy !== null) resolveModelCard(catalog, card.supersededBy);
    }
  }
  console.log(`check:models OK — ${total} model card(s) valid across ${catalog.byModelKey.size} model(s).`);
}

main().catch((error: unknown) => {
  console.error(`check:models FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
