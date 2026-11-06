/**
 * Goal-oriented session handoff: a `/handoff <goal>` command that summarizes the
 * live session into a checkpoint and creates a linked child session.
 *
 * @module @deepseek-ai/dsh-handoff
 */

import type { Context } from '@deepseek-ai/cordis'
import type { PreStepDecision } from '@deepseek-ai/dsh-agent'
import { CommandDefinitionId } from '@deepseek-ai/dsh-commands/brand'
import type { CommandResult } from '@deepseek-ai/dsh-commands'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type {} from '@deepseek-ai/dsh-session/types'
import { executeHandoff } from './command.ts'
import { Config, resolveConfig } from './config.ts'
import type {} from './types.ts'

export const name = 'handoff'
export const inject = ['commands', 'sessions', 'tokenMeter']

export { Config, resolveConfig }
export type { ResolvedConfig } from './config.ts'
export { HANDOFF_USAGE } from './command.ts'
export { buildHandoffCheckpoint, type CheckpointInput, type HandoffCheckpoint } from './checkpoint.ts'

/** One checkpoint waiting for the child's first model step. */
interface PendingCheckpoint {
  readonly text: string
}

/**
 * Register the `/handoff` command and deliver pending checkpoints to the
 * child's first model step.
 * @param ctx - context carrying commands, sessions, and the token meter.
 * @param config - deployment checkpoint bounds.
 */
export function apply(ctx: Context, config: Config): void {
  const limits = resolveConfig(config)
  const pending = new WeakMap<object, PendingCheckpoint>()

  // The checkpoint is durable log data; delivery is request-scoped so the
  // child's surface begins with the system prompt, never with quoted text.
  ctx.on('session/event', (session, event) => {
    if (event.type !== 'handoff/checkpoint') return
    pending.set(session, { text: event.data.text })
  })
  ctx.on('session/disposed', (session) => { pending.delete(session) })
  ctx.on('agent/pre-step', async ({ agent, signal }, next): Promise<PreStepDecision> => {
    const decision = await next()
    if (decision.kind === 'reject') return decision
    const checkpoint = pending.get(agent.session)
    if (checkpoint === undefined) return decision
    if (decision.messages.some(message => message.source.kind === 'plugin' && message.source.plugin === 'handoff')) {
      return decision
    }
    signal.throwIfAborted()
    pending.delete(agent.session)
    const message = createUserMessage({
      content: [{ type: 'text', text: checkpoint.text }],
      source: { kind: 'plugin', plugin: 'handoff' },
    })
    return { ...decision, messages: [...decision.messages, message] }
  }, { prepend: true })

  const active = new Set<Promise<CommandResult>>()
  const handler = (invocation: Parameters<typeof executeHandoff>[1]): Promise<CommandResult> => {
    const operation = Promise.resolve(executeHandoff(ctx, invocation, limits))
    active.add(operation)
    const retire = (): void => { active.delete(operation) }
    // Both branches retire without rethrowing, so no unhandled mirror can form.
    void operation.then(retire, retire)
    return operation
  }
  ctx.effect(function* () {
    // Yield drain before registration: composite teardown is LIFO, so no new
    // invocation enters while already-started handlers quiesce.
    yield async () => { await Promise.allSettled(active) }
    yield ctx.commands.register({
      definitionId: CommandDefinitionId('@deepseek-ai/dsh-handoff'),
      name: 'handoff',
      description: 'Start a linked continuation session from a goal checkpoint',
      handler,
    })
  }, 'handoff lifecycle')
}
