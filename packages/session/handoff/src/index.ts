/**
 * Goal-oriented session handoff: a `/handoff <goal>` command that summarizes the
 * live session into a checkpoint and creates a linked child session.
 *
 * @module @deepseek-ai/dsh-handoff
 */

import type { Context } from '@deepseek-ai/cordis'
import type { PreStepDecision } from '@deepseek-ai/dsh-agent'
import { registerDrainingCommand } from '@deepseek-ai/dsh-commands'
import { CommandDefinitionId } from '@deepseek-ai/dsh-commands/brand'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type {} from '@deepseek-ai/dsh-session/types'
import { executeHandoff } from './command.ts'
import { Config, resolveConfig } from './config.ts'
import { handoffProjection } from './projection.ts'

export const name = 'handoff'
export const inject = ['commands', 'sessions', 'tokenMeter', 'sessionProjections']

export { Config, resolveConfig }
export type { ResolvedConfig } from './config.ts'
export { HANDOFF_USAGE } from './command.ts'
export { buildHandoffCheckpoint, type CheckpointInput, type HandoffCheckpoint } from './checkpoint.ts'

/**
 * Register the `/handoff` command and deliver pending checkpoints to the
 * child's first model step.
 * @param ctx - context carrying commands, sessions, the token meter, and the
 * projection registry that reconstructs delivery state after a resume.
 * @param config - deployment checkpoint bounds.
 */
export function apply(ctx: Context, config: Config): void {
  const limits = resolveConfig(config)
  ctx.sessionProjections.register(handoffProjection)

  // The checkpoint is durable log data; delivery happens on the first
  // pre-step, after the loop has written the system prompt as surface node 0.
  // The projection folds the checkpoint record and the committed delivery
  // message, so a resumed child reconstructs the same pending/delivered state.
  ctx.on('agent/pre-step', async ({ agent, signal }, next): Promise<PreStepDecision> => {
    const decision = await next()
    if (decision.kind === 'reject') return decision
    const state = ctx.sessionProjections.stateOf(agent.session, 'handoff')
    if (state?.pending === undefined || state.delivered) return decision
    if (decision.messages.some(message => message.source.kind === 'plugin' && message.source.plugin === 'handoff')) {
      return decision
    }
    signal.throwIfAborted()
    const message = createUserMessage({
      content: [{ type: 'text', text: state.pending.text }],
      source: { kind: 'plugin', plugin: 'handoff' },
    })
    return { ...decision, messages: [...decision.messages, message] }
  }, { prepend: true })

  registerDrainingCommand(ctx, {
    definitionId: CommandDefinitionId('@deepseek-ai/dsh-handoff'),
    name: 'handoff',
    description: 'Start a linked continuation session from a goal checkpoint',
  }, invocation => executeHandoff(ctx, invocation, limits), 'handoff lifecycle')
}
