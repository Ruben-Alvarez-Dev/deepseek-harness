/** Configuration resolution for deterministic tool-result pruning. */

import { deepFreeze } from '@deepseek-ai/dsh-util-values'
import type { PressureConfig, ResolvedConfig, ToolResultPruneConfig } from './types.ts'

/** Fixed marker substituted for every removed middle span. */
export const PRUNE_MARKER = '\n\n[... tool result middle pruned ...]\n\n'

/** Low-friction defaults for coding-agent tool output. */
export const DEFAULTS: ResolvedConfig = deepFreeze({
  thresholdChars: 8192,
  headChars: 4096,
  tailChars: 1024,
})

const CONFIG_KEYS: ReadonlySet<string> = new Set([
  'thresholdChars',
  'headChars',
  'tailChars',
  'pressure',
])

const PRESSURE_KEYS: ReadonlySet<string> = new Set([
  'maxContextTokens',
  'pruneThresholdChars',
])

/**
 * Count Unicode code points without splitting surrogate pairs.
 * @param text - text to measure.
 * @returns the Unicode code-point count.
 */
export function codePointLength(text: string): number {
  return Array.from(text).length
}

/**
 * Resolve and validate pruning budgets.
 * @param config - raw plugin configuration.
 * @returns a detached deeply immutable configuration.
 */
export function resolveConfig(config: ToolResultPruneConfig = {}): ResolvedConfig {
  for (const key of Object.keys(config)) {
    if (!CONFIG_KEYS.has(key)) {
      throw new Error(
        `ToolResultPruneConfig: unknown key "${key}" `
        + '(allowed: thresholdChars, headChars, tailChars)',
      )
    }
  }

  const resolved: ResolvedConfig = {
    thresholdChars: config.thresholdChars ?? DEFAULTS.thresholdChars,
    headChars: config.headChars ?? DEFAULTS.headChars,
    tailChars: config.tailChars ?? DEFAULTS.tailChars,
  }
  assertPositiveInteger('thresholdChars', resolved.thresholdChars)
  assertNonNegativeInteger('headChars', resolved.headChars)
  assertNonNegativeInteger('tailChars', resolved.tailChars)

  const emittedChars = resolved.headChars
    + codePointLength(PRUNE_MARKER)
    + resolved.tailChars
  if (emittedChars > resolved.thresholdChars) {
    throw new Error(
      `ToolResultPruneConfig: headChars + marker + tailChars (${emittedChars}) `
      + `must be at most thresholdChars (${resolved.thresholdChars})`,
    )
  }

  // Schemastery normalizes an absent optional object field to an empty object;
  // an empty block means "not configured", while a partial block fails loud.
  const pressure = config.pressure === undefined
    || Object.keys(config.pressure).length === 0
    ? undefined
    : resolvePressure(config.pressure, emittedChars)
  return deepFreeze(structuredClone(pressure === undefined ? resolved : { ...resolved, pressure }))
}

/**
 * Validate the optional per-turn pressure trigger.
 * @param raw - configured pressure block.
 * @param emittedChars - fixed head + marker + tail budget.
 * @returns a detached immutable pressure policy.
 */
function resolvePressure(raw: PressureConfig, emittedChars: number): PressureConfig {
  if (typeof raw !== 'object') {
    throw new Error('ToolResultPruneConfig: pressure must be an object')
  }
  for (const key of Object.keys(raw)) {
    if (!PRESSURE_KEYS.has(key)) {
      throw new Error(
        `ToolResultPruneConfig: unknown pressure key "${key}" `
        + '(allowed: maxContextTokens, pruneThresholdChars)',
      )
    }
  }
  assertPositiveInteger('pressure.maxContextTokens', raw.maxContextTokens)
  assertPositiveInteger('pressure.pruneThresholdChars', raw.pruneThresholdChars)
  if (emittedChars > raw.pruneThresholdChars) {
    throw new Error(
      `ToolResultPruneConfig: pressure.pruneThresholdChars (${raw.pruneThresholdChars}) `
      + `must be at least headChars + marker + tailChars (${emittedChars})`,
    )
  }
  return { maxContextTokens: raw.maxContextTokens, pruneThresholdChars: raw.pruneThresholdChars }
}

function assertPositiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`ToolResultPruneConfig: ${name} (${value}) must be a positive integer`)
  }
}

function assertNonNegativeInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`ToolResultPruneConfig: ${name} (${value}) must be a non-negative integer`)
  }
}
