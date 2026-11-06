/** CI: validate every published provider contract against the Zod schema and check chain references. */
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  latestProviderContract,
  loadProviderCatalog,
  resolveProviderContract,
} from "../src/adapters/provider-catalog.ts";

const catalogRoot = join(fileURLToPath(new URL("..", import.meta.url)), "catalog");

async function main(): Promise<void> {
  const catalog = await loadProviderCatalog(catalogRoot);
  for (const contract of catalog.byContractId.values()) {
    for (const ref of [contract.supersedes, contract.supersededBy]) {
      if (ref !== null) resolveProviderContract(catalog, ref);
    }
    if (contract.supersededBy === null) latestProviderContract(catalog, contract.provider, contract.contractType);
  }
  console.log(`check:providers OK — ${catalog.byContractId.size} contract(s) valid.`);
}

main().catch((error: unknown) => {
  console.error(`check:providers FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
