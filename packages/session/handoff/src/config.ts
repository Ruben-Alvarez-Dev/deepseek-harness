/** Deployment configuration for the handoff command. */

import z from '@deepseek-ai/schemastery'

/** Deployment-owned checkpoint bounds. */
export interface Config {
  /** Maximum assistant text kept in the checkpoint. */
  checkpointAssistantChars?: number
  /** Maximum recent tool calls listed in the working set. */
  maxToolCalls?: number
  /** Maximum argument characters kept per tool call. */
  argumentChars?: number
}

/** Validate and default the handoff policy. */
export const Config: z<Config> = z.object({
  checkpointAssistantChars: z.number().step(1).min(100).default(2000),
  maxToolCalls: z.number().step(1).min(0).default(8),
  argumentChars: z.number().step(1).min(20).default(200),
})

/** Validated, detached handoff policy. */
export interface ResolvedConfig {
  readonly checkpointAssistantChars: number
  readonly maxToolCalls: number
  readonly argumentChars: number
}

/**
 * Validate and freeze the handoff policy.
 * @param config - raw plugin configuration.
 * @returns the resolved policy.
 * @throws when a bound is out of range.
 */
export function resolveConfig(config: Config): ResolvedConfig {
  const checkpointAssistantChars = config.checkpointAssistantChars ?? 2000
  const maxToolCalls = config.maxToolCalls ?? 8
  const argumentChars = config.argumentChars ?? 200
  assertInteger('checkpointAssistantChars', checkpointAssistantChars, 100, 100_000)
  assertInteger('maxToolCalls', maxToolCalls, 0, 100)
  assertInteger('argumentChars', argumentChars, 20, 10_000)
  return { checkpointAssistantChars, maxToolCalls, argumentChars }
}

function assertInteger(name: string, value: number, min: number, max: number): void {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`handoff: ${name} must be an integer between ${min} and ${max}`)
  }
}
