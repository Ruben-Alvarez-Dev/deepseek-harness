/** Deployment configuration for passive memory. */

import { existsSync, mkdirSync, statSync } from 'node:fs'
import z from '@deepseek-ai/schemastery'

/** Deployment-owned passive-memory policy. */
export interface Config {
  /** Directory holding `MEMORY.md` and one `<id>.md` file per topic; created when missing. */
  memoryDir: string
  /** Maximum entries rendered into one injection. */
  injectLimit?: number
  /** Character quota for one injected block. */
  injectQuotaChars?: number
  /** Maximum index lines loaded from `MEMORY.md`. */
  maxIndexLines?: number
  /** Inject only on the first pre-step of each turn. */
  injectOncePerTurn?: boolean
  /** Append a redacted capture record when a session is disposed. */
  capture?: boolean
  /** Maximum characters kept per captured side. */
  captureMaxChars?: number
}

/** Validate and default the passive-memory policy. */
export const Config: z<Config> = z.object({
  memoryDir: z.string(),
  injectLimit: z.number().step(1).min(1).default(5),
  injectQuotaChars: z.number().step(1).min(400).default(4000),
  maxIndexLines: z.number().step(1).min(1).default(200),
  injectOncePerTurn: z.boolean().default(true),
  capture: z.boolean().default(true),
  captureMaxChars: z.number().step(1).min(200).default(2000),
})

/** Validated, detached policy with every default applied. */
export interface ResolvedConfig {
  readonly memoryDir: string
  readonly injectLimit: number
  readonly injectQuotaChars: number
  readonly maxIndexLines: number
  readonly injectOncePerTurn: boolean
  readonly capture: boolean
  readonly captureMaxChars: number
}

/**
 * Validate and freeze the deployment policy.
 * @param config - raw plugin configuration.
 * @returns the resolved policy.
 * @throws when a bound is out of range or the memory directory is not a directory.
 */
export function resolveConfig(config: Config): ResolvedConfig {
  const memoryDir = config.memoryDir
  if (typeof memoryDir !== 'string' || memoryDir.length === 0) {
    throw new Error('memory-passive: memoryDir must be a non-empty path')
  }
  if (!existsSync(memoryDir)) mkdirSync(memoryDir, { recursive: true })
  if (!statSync(memoryDir).isDirectory()) {
    throw new Error(`memory-passive: memoryDir "${memoryDir}" is not a directory`)
  }
  const injectLimit = config.injectLimit ?? 5
  const injectQuotaChars = config.injectQuotaChars ?? 4000
  const maxIndexLines = config.maxIndexLines ?? 200
  const injectOncePerTurn = config.injectOncePerTurn ?? true
  const capture = config.capture ?? true
  const captureMaxChars = config.captureMaxChars ?? 2000
  assertInteger('injectLimit', injectLimit, 1, 20)
  assertInteger('injectQuotaChars', injectQuotaChars, 400, 1_000_000)
  assertInteger('maxIndexLines', maxIndexLines, 1, 2000)
  assertInteger('captureMaxChars', captureMaxChars, 200, 1_000_000)
  if (typeof injectOncePerTurn !== 'boolean') throw new Error('memory-passive: injectOncePerTurn must be a boolean')
  if (typeof capture !== 'boolean') throw new Error('memory-passive: capture must be a boolean')
  return {
    memoryDir,
    injectLimit,
    injectQuotaChars,
    maxIndexLines,
    injectOncePerTurn,
    capture,
    captureMaxChars,
  }
}

function assertInteger(name: string, value: number, min: number, max: number): void {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`memory-passive: ${name} must be an integer between ${min} and ${max}`)
  }
}
