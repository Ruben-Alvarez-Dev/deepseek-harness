/**
 * Explicit tool-dispatch allowlist on `tools/pre-execute`.
 *
 * The gate compares a canonical form of the requested tool name against an
 * explicit allowlist; in `enforce` mode an unlisted call is denied before it
 * executes, in `audit` mode it is logged and delegated. Denials are recorded as
 * a durable log-only session event so an audit period can be reviewed.
 *
 * @module @deepseek-ai/dsh-tool-dispatch-gate
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { PreToolDecision, ToolExecution } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-session/types'

/** Plugin name used by Cordis compositions. */
export const name = 'tool-dispatch-gate'

/** Enforcement posture: `audit` logs, `enforce` denies. */
export type GateMode = 'audit' | 'enforce'

/** Deployment-owned dispatch policy. */
export interface Config {
  /** `audit` observes and logs (default); `enforce` denies unlisted calls. */
  mode?: GateMode
  /**
   * Normalized allowlist entries: an exact name, or a prefix ending in `*`
   * (for example `mcp__git__*`). `*` alone allows every non-empty name.
   */
  allow?: string[]
  /** Normalized deny entries that win over `allow`. Same pattern grammar. */
  deny?: string[]
}

/** Validate and default the dispatch policy. */
export const Config: z<Config> = z.object({
  mode: z.union(['audit', 'enforce']).default('audit'),
  allow: z.array(z.string()).default([]),
  deny: z.array(z.string()).default([]),
})

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /**
     * Durable record of one dispatch-gate decision that did not allow the call.
     * Log-only: the gate never changes the model-visible surface or the
     * conversation, and the payload carries no arguments.
     */
    'tool/dispatch-gate': {
      /** Exact tool name the caller requested. */
      name: string
      /** Canonical form used for matching. */
      normalized: string
      /** Why the gate did not allow the call. */
      decision: 'unlisted' | 'explicit-deny'
      /** Mode the gate ran in when it recorded this decision. */
      mode: GateMode
    }
  }
}

/** Compiled policy used for one decision. */
export interface CompiledPolicy {
  readonly mode: GateMode
  readonly allow: readonly string[]
  readonly deny: readonly string[]
}

/** Outcome of one dispatch decision. */
export interface DispatchDecision {
  readonly allowed: boolean
  readonly normalized: string
  readonly decision?: 'unlisted' | 'explicit-deny'
}

/**
 * Canonical form used for matching: NFKC, format characters removed, trimmed,
 * lowercased. The executed name is never rewritten.
 * @param raw - requested tool name.
 * @returns the canonical comparison form.
 */
export function normalizeToolName(raw: string): string {
  return raw.normalize('NFKC').replace(/\p{Cf}/gu, '').trim().toLowerCase()
}

/**
 * Compile raw allow/deny entries into normalized patterns.
 * @param values - configured entries.
 * @param field - config field name used in failures.
 * @returns normalized entries; a trailing `*` stays the wildcard marker.
 */
export function compilePatterns(values: readonly string[], field: 'allow' | 'deny'): string[] {
  const compiled: string[] = []
  for (const value of values) {
    const normalized = normalizeToolName(value)
    if (normalized === '') {
      throw new Error(`tool-dispatch-gate: ${field} entries must not be empty`)
    }
    const wildcard = normalized.endsWith('*')
    const body = wildcard ? normalized.slice(0, -1) : normalized
    if (body.includes('*')) {
      throw new Error(`tool-dispatch-gate: ${field} entry ${JSON.stringify(value)} may only use a trailing "*"`)
    }
    compiled.push(wildcard ? `${body}*` : body)
  }
  return compiled
}

/**
 * Decide one call against an already compiled policy.
 * @param rawName - requested tool name.
 * @param policy - compiled allow/deny policy.
 * @returns the decision; an empty or unmatched name is never allowed.
 */
export function decideToolDispatch(rawName: string, policy: CompiledPolicy): DispatchDecision {
  const normalized = normalizeToolName(rawName)
  if (normalized === '') return { allowed: false, normalized, decision: 'unlisted' }
  if (matchesAny(normalized, policy.deny)) return { allowed: false, normalized, decision: 'explicit-deny' }
  if (matchesAny(normalized, policy.allow)) return { allowed: true, normalized }
  return { allowed: false, normalized, decision: 'unlisted' }
}

/**
 * Pattern match for one canonical name. A pattern ending in `*` is a prefix
 * match over the text before the marker; anything else is exact.
 * @param name - canonical requested name.
 * @param patterns - compiled patterns.
 * @returns whether any pattern matches.
 */
function matchesAny(name: string, patterns: readonly string[]): boolean {
  for (const pattern of patterns) {
    if (pattern.endsWith('*')) {
      if (name.startsWith(pattern.slice(0, -1))) return true
      continue
    }
    if (name === pattern) return true
  }
  return false
}

/**
 * Register the dispatch gate.
 * @param ctx - the plugin context whose scope owns the listener.
 * @param config - optional validated policy.
 */
export function apply(ctx: Context, config: Config = {}): void {
  const mode = config.mode ?? 'audit'
  const policy: CompiledPolicy = {
    mode,
    allow: compilePatterns(config.allow ?? [], 'allow'),
    deny: compilePatterns(config.deny ?? [], 'deny'),
  }
  ctx.on('tools/pre-execute', async (exec: ToolExecution, next: () => Promise<PreToolDecision>): Promise<PreToolDecision> => {
    const decision = decideToolDispatch(exec.name, policy)
    if (decision.allowed) return next()
    recordDecision(exec, decision, mode)
    if (mode === 'enforce') {
      return { kind: 'deny', reason: `tool "${exec.name}" is not in the dispatch allowlist` }
    }
    return next()
  }, { prepend: true })
}

/** Append the durable audit record when the call has an owning session. */
function recordDecision(
  exec: ToolExecution,
  decision: DispatchDecision,
  mode: GateMode,
): void {
  if (exec.agent === undefined || decision.decision === undefined) return
  exec.agent.session.append('tool/dispatch-gate', {
    name: exec.name,
    normalized: decision.normalized,
    decision: decision.decision,
    mode,
  })
}
