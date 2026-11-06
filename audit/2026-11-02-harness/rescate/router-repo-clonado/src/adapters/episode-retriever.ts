import type { Episode } from "../domain/episode.ts";
import type { EpisodeStorePort } from "../ports.ts";

const DEFAULT_K = 3;
const TOKEN_BUDGET = 300; // max tokens of injected text

export interface RetrievalResult {
  /** Serialised prompt section, ready to inject. Empty if nothing to inject. */
  section: string;
  /** Number of episodes injected. */
  count: number;
  /** The episodes themselves (for logging / diagnostics). */
  episodes: Episode[];
}

/**
 * Build the prompt section from top-K episodes for the given task family.
 * Returns an empty section when opts.enabled is false, the class has no episodes,
 * or the budget would be exceeded.
 */
export async function buildRetrievalSection(
  store: EpisodeStorePort,
  opts: {
    taskFamily: string;
    query: string;
    k?: number;
    enabled: boolean;
    projectScope?: string;
  },
): Promise<RetrievalResult> {
  if (!opts.enabled) return { section: "", count: 0, episodes: [] };
  const k = opts.k ?? DEFAULT_K;
  const episodes = await store.topK({
    taskFamily: opts.taskFamily,
    query: opts.query,
    k,
    projectScope: opts.projectScope,
  });
  if (episodes.length === 0) return { section: "", count: 0, episodes: [] };

  // Budget-aware assembly.
  const lines: string[] = [];
  let usedTokens = 0;
  const estimatedTokens = (text: string) => Math.ceil(text.length / 4); // rough EN estimate
  for (const ep of episodes) {
    const line = `[${ep.validatedFix ? "✓" : "X"} ${ep.taskFamily}] ${ep.validatedFix}`;
    const lineTokens = estimatedTokens(line);
    if (usedTokens + lineTokens > TOKEN_BUDGET && lines.length > 0) break;
    lines.push(line);
    usedTokens += lineTokens;
  }

  const section =
    lines.length > 0
      ? `## Prior lessons (from previous sessions, task family: ${opts.taskFamily})\n${lines.join("\n")}\n`
      : "";

  return { section, count: lines.length, episodes: episodes.slice(0, lines.length) };
}
