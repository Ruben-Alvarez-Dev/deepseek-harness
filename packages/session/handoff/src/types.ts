/** Durable checkpoint event declaration for the child session. */

import type {} from '@deepseek-ai/dsh-session-projection/types'
import type {} from '@deepseek-ai/dsh-session/types'

/** Projected checkpoint delivery state for one child session. */
export interface HandoffProjectionState {
  /** Checkpoint text and parent session while delivery is still pending. */
  readonly pending?: {
    readonly text: string
    readonly parentSession: string
  }
  /** Whether the checkpoint message has been delivered and committed. */
  readonly delivered: boolean
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionStateMap {
    /** Checkpoint delivery state for the child session. */
    handoff: HandoffProjectionState
  }
}

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /**
     * Durable checkpoint pending delivery to the child's first model step.
     * The event itself is log-only; the delivered user message is appended to
     * the surface by the agent loop and stays durable. Delivery is process-local.
     */
    'handoff/checkpoint': {
      /** Parent session the checkpoint was derived from. */
      parentSession: string
      /** Goal supplied with the handoff command. */
      goal: string
      /** Measured parent context tokens. */
      tokens: number
      /** Exact checkpoint text delivered to the child's first step. */
      text: string
    }
  }
}
