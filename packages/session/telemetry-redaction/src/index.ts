/**
 * Default secret redaction for outbound session telemetry.
 *
 * Mounting this plugin satisfies the telemetry seam's redaction slot with
 * audited rules, so a deployment needs no hand-written `session-telemetry/record`
 * listener of its own. The canonical session log is never touched.
 *
 * @module @deepseek-ai/dsh-telemetry-redaction
 */

import type { Context } from '@deepseek-ai/cordis'
import { redactSecrets } from '@deepseek-ai/dsh-redaction'
import type { SessionTelemetryRecord } from '@deepseek-ai/dsh-session-telemetry'

export const name = 'telemetry-redaction'

/**
 * Mount the default rules on the `session-telemetry/record` waterfall.
 * @param ctx - context carrying the telemetry seam.
 */
export function apply(ctx: Context): void {
  ctx.on('session-telemetry/record', (_record, next) => {
    const record = next()
    return {
      ...record,
      body: scrub(record.body, new Set<object>()),
      attributes: scrub(record.attributes, new Set<object>()) as SessionTelemetryRecord['attributes'],
    }
  })
}

/**
 * Redact every string reachable from one JSON-compatible value.
 * A cycle cannot be copied faithfully, so it throws and the seam withholds the
 * record fail-closed instead of exporting a partially redacted copy.
 * @param value - record body or attributes.
 * @param stack - objects currently being copied, for cycle detection.
 * @returns the redacted copy.
 * @throws when the value contains a cycle.
 */
function scrub(value: unknown, stack: Set<object>): unknown {
  if (typeof value === 'string') return redactSecrets(value).text
  if (Array.isArray(value)) {
    if (stack.has(value)) throw new Error('telemetry-redaction: cyclic record payload')
    stack.add(value)
    const copy = value.map(entry => scrub(entry, stack))
    stack.delete(value)
    return copy
  }
  if (value !== null && typeof value === 'object') {
    if (stack.has(value)) throw new Error('telemetry-redaction: cyclic record payload')
    stack.add(value)
    const copy = Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, scrub(entry, stack)]))
    stack.delete(value)
    return copy
  }
  return value
}
