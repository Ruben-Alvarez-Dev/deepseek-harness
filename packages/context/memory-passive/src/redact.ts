/** Fixed secret-redaction rules applied before memory is captured or injected. */

import type { RedactionSummary } from './types.ts'

interface Rule {
  readonly name: string
  readonly pattern: RegExp
  readonly replacement: string | ((match: string, ...groups: string[]) => string)
}

const RULES: readonly Rule[] = [
  {
    name: 'private-key',
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    replacement: '[REDACTED_PRIVATE_KEY]',
  },
  {
    name: 'sku-key',
    pattern: /\bsk-[A-Za-z0-9_-]{16,}\b/g,
    replacement: '[REDACTED_API_KEY]',
  },
  {
    name: 'bearer-token',
    pattern: /\bBearer\s+[\w.~+/=\-]{16,}/gi,
    replacement: 'Bearer [REDACTED_TOKEN]',
  },
  {
    name: 'jwt',
    pattern: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
    replacement: '[REDACTED_JWT]',
  },
  {
    name: 'github-token',
    pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g,
    replacement: '[REDACTED_GITHUB_TOKEN]',
  },
  {
    name: 'aws-access-key',
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
    replacement: '[REDACTED_AWS_KEY]',
  },
  {
    name: 'secret-assignment',
    pattern: /\b([A-Z0-9_]*(?:API_KEY|SECRET|TOKEN|PASSWORD|ACCESS_KEY|PRIVATE_KEY)[A-Z0-9_]*)\s*[:=]\s*("[^"\n]*"|'[^'\n]*'|[^\s,;]+)/gi,
    replacement: (_match: string, key: string) => `${key}=[REDACTED]`,
  },
]

/**
 * Replace recognized secrets with fixed placeholders.
 * @param text - untrusted capture or memory text.
 * @returns the redacted text plus per-rule replacement counts.
 */
export function redactSecrets(text: string): { text: string; summary: RedactionSummary } {
  let current = text
  const kinds: Record<string, number> = {}
  for (const rule of RULES) {
    let count = 0
    current = current.replace(rule.pattern, (...args: unknown[]) => {
      count += 1
      if (typeof rule.replacement === 'function') {
        const [match, ...groups] = args as [string, ...string[]]
        return rule.replacement(match, ...groups)
      }
      return rule.replacement
    })
    if (count > 0) kinds[rule.name] = (kinds[rule.name] ?? 0) + count
  }
  const count = Object.values(kinds).reduce((total, value) => total + value, 0)
  return { text: current, summary: { count, kinds } }
}
