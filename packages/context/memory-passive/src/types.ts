/** Cross-module types and declaration merges for passive memory. */

import type { RedactionSummary } from '@deepseek-ai/dsh-redaction'
import type {} from '@deepseek-ai/dsh-session/types'

/** One entry parsed from the bounded `MEMORY.md` index. */
export interface MemoryEntry {
  /** Stable identifier naming both the index line and the `<id>.md` topic file. */
  readonly id: string
  /** Short human title shown in the injected block. */
  readonly title: string
  /** Routing keywords used by the deterministic lexical selector. */
  readonly keywords: string
}

/** One selected entry with its redacted topic content. */
export interface SelectedMemory extends MemoryEntry {
  /** Redacted topic content loaded from disk. */
  readonly content: string
}

/** One durable capture record appended to `inbox.jsonl`. */
export interface CaptureRecord {
  /** Unix epoch milliseconds of the capture. */
  readonly ts: number
  /** Session identity the record was captured from. */
  readonly sessionId: string
  /** What the redaction pass removed. */
  readonly redactions: RedactionSummary
  /** Redacted latest direct user text, bounded by the capture quota. */
  readonly user: string
  /** Redacted latest assistant text, bounded by the capture quota. */
  readonly assistant: string
}

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /**
     * Durable record of one memory injection. The event itself is log-only; the
     * injected user message is appended to the surface by the agent loop and
     * stays durable, so later requests resend it.
     */
    'memory/injected': {
      /** Identifiers of the rendered memory entries, in injection order. */
      ids: string[]
      /** SHA-256 of the exact injected text. */
      digest: string
      /** Character count of the injected text. */
      chars: number
      /** Configured character quota for this block. */
      quotaChars: number
      /** Turn whose first step received the block. */
      turn: number
    }
  }
}
