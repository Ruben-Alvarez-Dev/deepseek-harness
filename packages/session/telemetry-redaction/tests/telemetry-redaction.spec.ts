/** Default telemetry redaction: waterfall transform, immutability, and the leak gate. */

import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { SessionTelemetryRecord } from '@deepseek-ai/dsh-session-telemetry'
import * as telemetryRedaction from '@deepseek-ai/dsh-telemetry-redaction'

let context: Context | undefined
afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
})

function record(body: Record<string, unknown>, attributes: Record<string, string | number> = {}): SessionTelemetryRecord {
  return { channel: 'ledger', time: 1, severity: 'info', attributes: { 'session.id': 'redaction-test', ...attributes }, body }
}

async function mount(): Promise<void> {
  const ctx = context = new Context()
  await ctx.plugin(telemetryRedaction)
}

function run(input: SessionTelemetryRecord): SessionTelemetryRecord {
  return context?.waterfall('session-telemetry/record', input, () => input) as SessionTelemetryRecord
}

const SECRETS = [
  'sk-abcdefghijklmnop1234',
  'Bearer abcdefghijklmnopqrstuvwxyz012345',
  'ghp_abcdefghijklmnopqrstuvwxyz012345',
  'AKIAABCDEFGHIJKLMNOP',
  'API_KEY=super-secret-value',
  '-----BEGIN PRIVATE KEY-----\nMIIEprivatekeymaterial\n-----END PRIVATE KEY-----',
]

describe('telemetry redaction plugin', () => {
  it('redacts body strings, nested values and attributes without mutating the input', async () => {
    const input = record(
      {
        text: 'key sk-abcdefghijklmnop1234',
        nested: { list: ['Bearer abcdefghijklmnopqrstuvwxyz012345', 42, null] },
        count: 3,
      },
      { 'session.cwd': '/workspace', 'session.parent_id': 'ghp_abcdefghijklmnopqrstuvwxyz012345' },
    )
    await mount()
    const before = JSON.stringify(input)
    const output = run(input)
    expect(JSON.stringify(input)).toBe(before)
    expect(JSON.stringify(output)).not.toContain('sk-abcdefghijklmnop1234')
    expect(JSON.stringify(output)).not.toContain('abcdefghijklmnopqrstuvwxyz012345')
    const body = output.body as Record<string, unknown>
    expect(body['count']).toBe(3)
    expect((body['nested'] as { list: unknown[] }).list[1]).toBe(42)
    expect(output.attributes['session.cwd']).toBe('/workspace')
  })

  it('withholds a cyclic record fail-closed', async () => {
    await mount()
    const body: Record<string, unknown> = {}
    body['self'] = body
    expect(() => run(record(body))).toThrow('cyclic record payload')
  })

  it('meets the leak gate: 20 records, six families, zero leaks', async () => {
    const records: SessionTelemetryRecord[] = []
    for (let index = 0; index < 20; index += 1) {
      records.push(record(
        {
          text: `${SECRETS[index % SECRETS.length] as string} attempt ${index}`,
          nested: { deeper: [SECRETS[(index + 1) % SECRETS.length] as string, { value: SECRETS[(index + 2) % SECRETS.length] as string }] },
        },
        { [`attr.${index}`]: SECRETS[(index + 3) % SECRETS.length] as string },
      ))
    }
    await mount()
    let leaks = 0
    for (const entry of records) {
      const output = run(entry)
      const serialized = JSON.stringify(output)
      for (const secret of SECRETS) {
        if (serialized.includes(secret)) leaks += 1
      }
    }
    expect(records).toHaveLength(20)
    expect(leaks).toBe(0)
  })
})
