import { randomUUID } from "node:crypto";
import { open, readFile, rename } from "node:fs/promises";
import { dirname, join } from "node:path";
import lockfile from "proper-lockfile";
import {
  DEFAULT_CAPS,
  DEFAULT_GLOBAL_CAP,
  DEFAULT_HOLDOUT_CATEGORIES,
  DEFAULT_TTL_MS,
  type Episode,
  type EpisodeStoreState,
  emptyEpisodeState,
  isExpired,
  normaliseLesson,
} from "../domain/episode.ts";
import { RouterError } from "../domain/types.ts";
import type { Clock, EpisodeStorePort, HoldoutCategory } from "../ports.ts";
import { systemClock } from "./system-clock.ts";

const ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/;
const safeId = (v: unknown): v is string => typeof v === "string" && ID.test(v);
const timestamp = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const exact = (obj: Record<string, unknown>, keys: string[]) =>
  Object.keys(obj).sort().join(",") === keys.sort().join(",");

function corrupt(): never {
  throw new RouterError("state", "Episode store state is corrupt; refusing to overwrite history.");
}

export function decodeEpisodeState(contents: string): EpisodeStoreState {
  let value: unknown;
  try {
    value = JSON.parse(contents);
  } catch {
    corrupt();
  }
  if (!record(value)) corrupt();
  const v = value as Record<string, unknown>;
  // Migrate v1 → v2: add defaultTtlMs and holdoutCategories
  if (v.version === 1) {
    v.version = 2;
    v.defaultTtlMs = DEFAULT_TTL_MS;
    v.holdoutCategories = DEFAULT_HOLDOUT_CATEGORIES;
  }
  if (v.version !== 2) corrupt();
  const keys = ["version", "episodes", "caps", "globalCap", "defaultTtlMs", "holdoutCategories"];
  if (!exact(v, keys)) corrupt();
  if (!Array.isArray(v.episodes)) corrupt();
  if (typeof v.globalCap !== "number" || v.globalCap < 0) corrupt();
  if (typeof v.defaultTtlMs !== "number" || v.defaultTtlMs < 0) corrupt();
  if (!Array.isArray(v.holdoutCategories)) corrupt();
  const validClasses = new Set(["tool", "build", "refactor", "prose", "other"]);
  const validProvenances = new Set(["shadow", "verifier", "manual"]);
  const validHoldouts = new Set(["development", "test", "evaluation"]);
  for (const ep of v.episodes as Record<string, unknown>[]) {
    // Required new-schema fields (legacy aliases allowed but not required)
    const requiredKeys = [
      "id",
      "taskFamily",
      "projectScope",
      "deterministicObservation",
      "receiptRefs",
      "validatedFix",
      "provenance",
      "expiry",
      "accountPressure",
      "ts",
    ];
    for (const key of requiredKeys) {
      if (!(key in ep)) corrupt();
    }
    if (!safeId(ep.id)) corrupt();
    if (!validClasses.has(ep.taskFamily as string)) corrupt();
    if (typeof ep.projectScope !== "string" || ep.projectScope.length === 0) corrupt();
    if (typeof ep.deterministicObservation !== "string" || ep.deterministicObservation.length === 0)
      corrupt();
    if (!Array.isArray(ep.receiptRefs)) corrupt();
    if (typeof ep.validatedFix !== "string") corrupt();
    if (!validProvenances.has(ep.provenance as string)) corrupt();
    // holdoutCategory is optional on disk (legacy data excluded it); default to development.
    if (ep.holdoutCategory !== undefined && !validHoldouts.has(ep.holdoutCategory as string))
      corrupt();
    if (!timestamp(ep.expiry)) corrupt();
    if (typeof ep.accountPressure !== "number" || ep.accountPressure < 0 || ep.accountPressure > 1)
      corrupt();
    if (!timestamp(ep.ts)) corrupt();
    if (ep.holdoutCategory === undefined) ep.holdoutCategory = "development";
  }
  return {
    version: 2,
    episodes: v.episodes as Episode[],
    caps: { ...DEFAULT_CAPS, ...(v.caps as Record<string, number> | undefined) },
    globalCap: typeof v.globalCap === "number" ? v.globalCap : DEFAULT_GLOBAL_CAP,
    defaultTtlMs: typeof v.defaultTtlMs === "number" ? v.defaultTtlMs : DEFAULT_TTL_MS,
    holdoutCategories:
      (v.holdoutCategories as HoldoutCategory[] | undefined) ?? DEFAULT_HOLDOUT_CATEGORIES,
  } as EpisodeStoreState;
}

export function episodeStatePath(agentDir: string): string {
  return join(agentDir, "account-router-state", "episodes.json");
}

/** Port factory: concrete store behind the EpisodeStorePort interface. */
export function createEpisodeStore(path: string, clock: Clock = systemClock): EpisodeStorePort {
  return new EpisodeStore(path, clock);
}

export class EpisodeStore implements EpisodeStorePort {
  readonly onChangeListeners = new Set<() => void>();

  constructor(
    readonly path: string,
    private readonly clock: Clock = systemClock,
  ) {}

  onChange(callback: () => void): () => void {
    this.onChangeListeners.add(callback);
    return () => this.onChangeListeners.delete(callback);
  }

  private notify(): void {
    for (const cb of [...this.onChangeListeners]) cb();
  }

  private async lock(): Promise<{ release: () => Promise<void>; healthy: () => boolean }> {
    const deadline = this.clock.now() + 10000;
    for (;;) {
      let compromised = false;
      try {
        const release = await lockfile.lock(this.path, {
          realpath: false,
          stale: 10000,
          update: 2000,
          retries: 0,
          onCompromised: () => {
            compromised = true;
          },
        });
        return { release, healthy: () => !compromised };
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ELOCKED" || this.clock.now() >= deadline) {
          throw new RouterError("lock_acquire", "Cannot acquire episode store lock.");
        }
        await this.clock.sleep(25);
      }
    }
  }

  private async readState(): Promise<EpisodeStoreState> {
    try {
      const text = await readFile(this.path, "utf8");
      return decodeEpisodeState(text);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return emptyEpisodeState();
      throw err;
    }
  }

  private async writeState(state: EpisodeStoreState): Promise<void> {
    const temporary = `${this.path}.${randomUUID()}.tmp`;
    const file = await open(temporary, "wx", 0o600);
    try {
      await file.writeFile(JSON.stringify(state));
      await file.sync();
    } finally {
      await file.close();
    }
    await rename(temporary, this.path);
    if (process.platform !== "win32") {
      const dirFd = await open(dirname(this.path), "r");
      try {
        await dirFd.sync();
      } finally {
        await dirFd.close();
      }
    }
  }

  async withState<T>(fn: (state: EpisodeStoreState) => T): Promise<T> {
    const lock = await this.lock();
    let result: T | undefined;
    let failure: Error | undefined;
    try {
      const state = await this.readState();
      const before = JSON.stringify(state);
      result = fn(state);
      const serialized = JSON.stringify(state);
      if (serialized !== before) {
        if (!lock.healthy())
          throw new RouterError("lock_compromise", "Episode store lock was compromised.");
        await this.writeState(state);
        this.notify();
      }
    } catch (err) {
      failure = err instanceof Error ? err : new Error("Episode store transaction failed.");
    } finally {
      try {
        await lock.release();
      } catch {
        failure ??= new Error("Episode store lock release failed.");
      }
    }
    if (failure) throw failure;
    return result as T;
  }

  /** Evict expired episodes and return count removed. */
  async evictExpired(now?: number): Promise<number> {
    const t = now ?? this.clock.now();
    let removed = 0;
    await this.withState((state) => {
      const before = state.episodes.length;
      state.episodes = state.episodes.filter((ep) => !isExpired(ep, t));
      removed = before - state.episodes.length;
    });
    return removed;
  }

  /** Capture an episode with retention + dedupe + TTL + holdout filtering. */
  async capture(episode: Episode): Promise<string> {
    await this.withState((state) => {
      // Dedupe: merge if same lesson + taskFamily + provenance already exists.
      const norm = normaliseLesson(episode.validatedFix);
      const dupIdx = state.episodes.findIndex(
        (e: Episode) =>
          e.taskFamily === episode.taskFamily &&
          e.provenance === episode.provenance &&
          normaliseLesson(e.validatedFix) === norm,
      );
      if (dupIdx !== -1) {
        state.episodes[dupIdx] = episode;
        return;
      }
      state.episodes.push(episode);
      // Apply per-class cap.
      const classCap = state.caps[episode.taskFamily] ?? DEFAULT_CAPS[episode.taskFamily];
      if (classCap > 0) {
        const classEpisodes = state.episodes.filter(
          (e: Episode) => e.taskFamily === episode.taskFamily,
        );
        if (classEpisodes.length > classCap) {
          classEpisodes.sort((a: Episode, b: Episode) => a.ts - b.ts);
          const toRemove = new Set(classEpisodes.slice(0, classEpisodes.length - classCap));
          state.episodes = state.episodes.filter((e: Episode) => !toRemove.has(e));
        }
      }
      // Apply global cap.
      if (state.globalCap > 0 && state.episodes.length > state.globalCap) {
        const sorted = [...state.episodes].sort((a: Episode, b: Episode) => a.ts - b.ts);
        const toRemove = new Set(sorted.slice(0, sorted.length - state.globalCap));
        state.episodes = state.episodes.filter((e: Episode) => !toRemove.has(e));
      }
    });
    return episode.id;
  }

  /** Top-K retrieval by task family, excluding holdout categories. */
  async topK(opts: {
    taskFamily: string;
    query: string;
    k: number;
    /** Project scope filter (empty = all). */
    projectScope?: string;
    /** Exclude these holdout categories. Defaults to store config. */
    excludeHoldouts?: HoldoutCategory[];
  }): Promise<Episode[]> {
    return this.withState((state) => {
      const exclude = opts.excludeHoldouts ?? state.holdoutCategories;
      const candidates = state.episodes.filter((e: Episode) => {
        if (e.taskFamily !== opts.taskFamily) return false;
        if (opts.projectScope && e.projectScope !== opts.projectScope) return false;
        // Filter by explicit holdout category (derived at build time), never by provenance cast.
        if (exclude.includes(e.holdoutCategory)) return false;
        return true;
      });
      if (candidates.length === 0) return [];
      const queryTerms = opts.query.toLowerCase().split(/\s+/).filter(Boolean);
      const score = (ep: Episode): number => {
        const text = `${ep.deterministicObservation} ${ep.validatedFix}`.toLowerCase();
        let s = 0;
        for (const term of queryTerms) {
          if (text.includes(term)) s += 1;
        }
        s += ep.accountPressure * 0.1;
        // Recency bonus (decay over 30 days): recent lessons score higher.
        s += 1 - Math.min(1, (Date.now() - ep.ts) / (1000 * 60 * 60 * 24 * 30));
        return s;
      };
      return candidates
        .map((e: Episode) => ({ ep: e, score: score(e) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, opts.k)
        .map((x) => x.ep);
    });
  }

  /** Count episodes by family, excluding holdouts. */
  async countByFamily(): Promise<Record<string, number>> {
    return this.withState((state) => {
      const acc: Record<string, number> = {};
      for (const ep of state.episodes) {
        acc[ep.taskFamily] = (acc[ep.taskFamily] ?? 0) + 1;
      }
      return acc;
    });
  }

  /** Wipe all episodes (for testing). */
  async clear(): Promise<void> {
    await this.withState((state) => {
      state.episodes = [];
    });
  }

  /** Get current store config. */
  async getConfig(): Promise<Pick<EpisodeStoreState, "defaultTtlMs" | "holdoutCategories">> {
    return this.withState((state) => ({
      defaultTtlMs: state.defaultTtlMs,
      holdoutCategories: state.holdoutCategories,
    }));
  }
}
