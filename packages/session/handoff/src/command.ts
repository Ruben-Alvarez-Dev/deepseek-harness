/** `/handoff <goal>`: build a checkpoint and create the linked child session. */

import type { Context } from '@deepseek-ai/cordis'
import type { CommandInvocation, CommandResult } from '@deepseek-ai/dsh-commands'
import type {} from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-token-meter'
import { buildHandoffCheckpoint } from './checkpoint.ts'
import type { ResolvedConfig } from './config.ts'
import './types.ts'

/** Usage line shown when the command is invoked without a goal. */
export const HANDOFF_USAGE = 'Usage: /handoff <goal>'

/**
 * Execute one handoff request: checkpoint the parent's live state into a new
 * linked child session and leave the parent untouched.
 * @param ctx - context carrying `sessions` and `tokenMeter`.
 * @param invocation - command invocation with the goal in `rawInput`.
 * @param limits - resolved checkpoint bounds.
 * @returns the child session identity on success, or a usage error.
 */
export function executeHandoff(
  ctx: Context,
  invocation: CommandInvocation,
  limits: ResolvedConfig,
): CommandResult {
  const goal = invocation.rawInput.trim()
  if (goal.length === 0) return { kind: 'error', text: HANDOFF_USAGE }
  const session = invocation.agent.session
  const tokens = ctx.tokenMeter.measure(session).totalTokens
  const checkpoint = buildHandoffCheckpoint({ session, goal, tokens, limits })
  const header = session.header
  const child = ctx.sessions.create(undefined, {
    meta: {
      parentSession: session.id,
      ...header.cwd === undefined ? {} : { cwd: header.cwd },
    },
  })
  // The checkpoint is a log-only record; the child's first pre-step delivers it
  // as a request-scoped message so the system prompt stays surface node 0.
  child.append('handoff/checkpoint', {
    parentSession: String(session.id),
    goal,
    tokens,
    text: checkpoint.text,
  })
  return {
    kind: 'success',
    text: `Handoff ready in session ${child.id} (parent ${session.id}, ${tokens} tokens summarized as a checkpoint). Continue there.`,
  }
}
