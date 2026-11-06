/** Message source carried by the checkpoint message in the child session. */

import type { SessionId } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-session/types'

/** Source of the first user-role message in a handed-off session. */
export interface HandoffCheckpointSource {
  readonly kind: 'handoff-checkpoint'
  readonly version: 1
  /** Parent session the checkpoint was derived from. */
  readonly parentSession: SessionId
  /** Goal supplied with the handoff command. */
  readonly goal: string
}

declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap {
    'handoff-checkpoint': HandoffCheckpointSource
  }
}

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /**
     * Durable checkpoint pending delivery to the child's first model step.
     * Log-only: the checkpoint reaches the request as a volatile user message,
     * so the child's surface still starts with the system prompt.
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
