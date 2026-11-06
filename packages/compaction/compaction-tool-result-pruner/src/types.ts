import type { ToolCallId } from '@deepseek-ai/dsh-llm'
import type { SessionSeq } from '@deepseek-ai/dsh-session/types'

/** Turn-pressure trigger for per-step pruning, independent of compaction. */
export interface PressureConfig {
  /** Prune tool results once the measured session context exceeds this many tokens. */
  maxContextTokens: number
  /**
   * Per-result pruning threshold used by the pressure trigger; must fit the
   * configured head, marker, and tail.
   */
  pruneThresholdChars: number
}

/** Character-budget policy for deterministic tool-result pruning. */
export interface ToolResultPruneConfig {
  /** Prune when total text exceeds this many Unicode code points. Defaults to `8192`. */
  thresholdChars?: number
  /** Maximum leading Unicode code points retained. Defaults to `4096`. */
  headChars?: number
  /** Maximum trailing Unicode code points retained. Defaults to `1024`. */
  tailChars?: number
  /** Optional per-turn pressure trigger; absent keeps trim-on-compaction only. */
  pressure?: PressureConfig
}

/** Validated, detached, deeply immutable pruning configuration. */
export interface ResolvedConfig {
  readonly thresholdChars: number
  readonly headChars: number
  readonly tailChars: number
  /** Present only when the per-turn pressure trigger is configured. */
  readonly pressure?: Readonly<PressureConfig>
}

/** Optional per-call override for one pruning pass. */
export interface PruneSessionOptions {
  /** Threshold to use instead of the configured `thresholdChars`. */
  thresholdChars?: number
}

/** Cited source event and size accounting for one landed surface replacement. */
export interface PrunedEntry {
  /** Full-fidelity tool-result event shadowed by the replacement. */
  readonly originalSeq: SessionSeq
  /** Newly appended pruned tool-result event. */
  readonly replacementSeq: SessionSeq
  /** Tool call shared by the original and replacement. */
  readonly callId: ToolCallId
  /** Original text size in Unicode code points. */
  readonly charsBefore: number
  /** Replacement text size in Unicode code points. */
  readonly charsAfter: number
}

/** Aggregate outcome of one stable-surface pruning pass. */
export interface PruneResult {
  /** Replacements in the snapshotted surface order. */
  readonly pruned: readonly PrunedEntry[]
  /** Total Unicode code points removed across replacements. */
  readonly charsRemoved: number
}
