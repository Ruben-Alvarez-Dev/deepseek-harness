/** Fixed redaction rules: every family, counts, and untouched text. */

import { describe, expect, it } from 'vitest'
import { REDACTION_RULE_NAMES, redactSecrets } from '@deepseek-ai/dsh-redaction'

describe('redactSecrets', () => {
  it('redacts every rule family and reports counts', () => {
    const input = [
      '-----BEGIN PRIVATE KEY-----\nMIIEsecret\n-----END PRIVATE KEY-----',
      'sk-abcdefghijklmnop1234',
      'Authorization: Bearer abcdefghijklmnopqrstuvwxyz012345',
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnopqrstuvwx',
      'ghp_abcdefghijklmnopqrstuvwxyz012345',
      'AKIAABCDEFGHIJKLMNOP',
      'API_KEY=super-secret-value',
      'password: hunter2',
    ].join('\n')
    const { text, summary } = redactSecrets(input)
    expect(summary.count).toBeGreaterThanOrEqual(8)
    expect(text).not.toContain('MIIEsecret')
    expect(text).not.toContain('sk-abcdefghijklmnop1234')
    expect(text).not.toContain('abcdefghijklmnopqrstuvwxyz012345')
    expect(text).not.toContain('AKIAABCDEFGHIJKLMNOP')
    expect(text).not.toContain('super-secret-value')
    expect(text).not.toContain('hunter2')
    expect(summary.kinds['private-key']).toBe(1)
    expect(summary.kinds['secret-assignment']).toBe(2)
  })

  it('leaves non-secret text unchanged', () => {
    const plain = 'deploy the migration and run pnpm test'
    expect(redactSecrets(plain)).toEqual({ text: plain, summary: { count: 0, kinds: {} } })
  })

  it('exposes the audited rule order', () => {
    expect(REDACTION_RULE_NAMES).toEqual([
      'private-key',
      'sku-key',
      'bearer-token',
      'jwt',
      'github-token',
      'aws-access-key',
      'secret-assignment',
    ])
  })
})
