/** Message source carried by the checkpoint message in the child session. */

import type { SessionId } from '@deepseek-ai/dsh-session'

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
