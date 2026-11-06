import type { Episode } from "./domain/episode.ts";
import type { CredentialReference, RouterState } from "./domain/types.ts";

export type HoldoutCategory = "development" | "test" | "evaluation";

/**
 * Port for the episodic-memory piece. Injected by the composition root so the
 * router never depends on a concrete store; the harness can swap impls.
 */
export interface EpisodeStorePort {
  capture(episode: Episode): Promise<string>;
  topK(opts: {
    taskFamily: string;
    query: string;
    k: number;
    projectScope?: string;
    excludeHoldouts?: HoldoutCategory[];
  }): Promise<Episode[]>;
  countByFamily(): Promise<Record<string, number>>;
  evictExpired(now?: number): Promise<number>;
  clear(): Promise<void>;
  onChange(callback: () => void): () => void;
  getConfig(): Promise<{ defaultTtlMs: number; holdoutCategories: HoldoutCategory[] }>;
}

/** Narrow bus view of Pi's shared EventBus: extension-to-extension communication. */
export interface ExtensionBus {
  emit(channel: string, data: unknown): void;
}

export interface StateStore {
  transaction<T>(change: (state: RouterState) => T, signal?: AbortSignal): Promise<T>;
  /**
   * Subscribe to state-changing commits in this process. File stores only fire when the
   * file was actually rewritten, so read-only transactions never notify.
   */
  onChange?(callback: () => void): () => void;
}

export interface Clock {
  now(): number;
  sleep(ms: number, signal?: AbortSignal): Promise<void>;
  isProcessAlive(pid: number): boolean;
}

export type CredentialEnvironment =
  | Record<string, string>
  | ((name: string) => Promise<string | undefined>);

export interface CredentialResolver {
  resolve(
    reference: CredentialReference,
    env?: CredentialEnvironment,
    signal?: AbortSignal,
  ): Promise<string | undefined>;
}
