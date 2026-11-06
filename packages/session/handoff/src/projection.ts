/** Durable checkpoint delivery state, reconstructed from the session log on resume. */

import { z } from 'zod'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
import type { HandoffProjectionState } from './types.ts'

const handoffStateSchema: z.ZodType<HandoffProjectionState> = z.object({
  pending: z.object({
    text: z.string(),
    parentSession: z.string(),
  }).optional(),
  delivered: z.boolean(),
}) as unknown as z.ZodType<HandoffProjectionState>

/**
 * Fold the child session's checkpoint and delivery events into one host-only
 * state. The durable `handoff/checkpoint` record seeds the pending text; the
 * loop's committed `user/message` with the `handoff` plugin source marks it
 * delivered, so a resumed process reconstructs exactly the same state.
 */
export const handoffProjection: ProjectionDefinition<'handoff'> = {
  key: 'handoff',
  stateVersion: 1,
  stateSchema: handoffStateSchema,
  init: () => ({ delivered: false }),
  apply: (state, event) => {
    if (event.type === 'handoff/checkpoint') {
      return {
        pending: { text: event.data.text, parentSession: event.data.parentSession },
        delivered: false,
      }
    }
    if (event.type === 'user/message'
      && event.data.source.kind === 'plugin'
      && event.data.source.plugin === 'handoff') {
      if (state.delivered && state.pending === undefined) return state
      return { delivered: true }
    }
    return state
  },
}
