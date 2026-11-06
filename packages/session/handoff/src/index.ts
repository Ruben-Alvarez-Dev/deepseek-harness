/**
 * Goal-oriented session handoff: a `/handoff <goal>` command that summarizes the
 * live session into a checkpoint and creates a linked child session.
 *
 * @module @deepseek-ai/dsh-handoff
 */

import type { Context } from '@deepseek-ai/cordis'
import { CommandDefinitionId } from '@deepseek-ai/dsh-commands/brand'
import type { CommandResult } from '@deepseek-ai/dsh-commands'
import { executeHandoff } from './command.ts'
import { Config, resolveConfig } from './config.ts'

export const name = 'handoff'
export const inject = ['commands', 'sessions', 'tokenMeter']

export { Config, resolveConfig }
export type { ResolvedConfig } from './config.ts'
export { HANDOFF_USAGE } from './command.ts'
export { buildHandoffCheckpoint, type CheckpointInput, type HandoffCheckpoint } from './checkpoint.ts'

/**
 * Register the `/handoff` command for every composed human-command adapter.
 * @param ctx - context carrying commands, sessions, and the token meter.
 * @param config - deployment checkpoint bounds.
 */
export function apply(ctx: Context, config: Config): void {
  const limits = resolveConfig(config)
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
