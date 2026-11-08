/** Longitudinal usage window: log mapping, day windows, filters, and kill criteria. */

import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { zstdCompressSync } from 'node:zlib'
import { afterEach, describe, expect, it } from 'vitest'
import {
  KILL_CRITERIA,
  measureWindow,
  parseOptions,
  parseSessionLog,
  renderReport,
  utcDay,
} from './longitudinal-usage.ts'

const DAY = 86_400_000
/** 2026-11-06T00:00:00Z */
const NOV_6 = Date.UTC(2026, 10, 6)
/** 2026-11-07T00:00:00Z */
const NOV_7 = NOV_6 + DAY
/** 2026-10-01T00:00:00Z */
const OCT_1 = Date.UTC(2026, 9, 1)

const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

/** One request in a fixture log: optional tool calls, memory injection, and gate decision. */
interface RequestFixture {
  readonly toolCalls?: readonly string[]
  readonly memoryInjected?: boolean
  readonly gate?: { readonly name: string; readonly decision?: 'unlisted' | 'explicit-deny' }
}

/** Build one durable session log, the shape the session writer produces. */
function sessionLog(
  id: string,
  createdAt: number,
  requests: readonly RequestFixture[],
  agentPreset?: string,
): string {
  const header = {
    type: 'session',
    version: 4,
    id,
    createdAt,
    cwd: '/tmp/workspace',
    ...(agentPreset === undefined ? {} : { agentPreset }),
  }
  const events: Record<string, unknown>[] = []
  let seq = 0
  for (const request of requests) {
    const content = (request.toolCalls ?? []).map((name, index) => ({
      type: 'tool-call',
      id: `call-${String(seq)}-${String(index)}`,
      name,
      arguments: '{}',
    }))
    events.push({
      type: 'assistant/message',
      seq: seq++,
      time: createdAt,
      data: {
        turn: 1,
        step: 1,
        usage: { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0, totalTokens: 2 },
        message: { role: 'assistant', content: [...content, { type: 'text', text: 'ok' }] },
      },
    })
    if (request.memoryInjected === true) events.push({ type: 'memory/injected', seq: seq++, time: createdAt, data: {} })
    if (request.gate !== undefined) {
      events.push({
        type: 'tool/dispatch-gate',
        seq: seq++,
        time: createdAt,
        data: { name: request.gate.name, normalized: request.gate.name, decision: request.gate.decision ?? 'unlisted', mode: 'audit' },
      })
    }
  }
  return [header, ...events].map(event => JSON.stringify(event)).join('\n')
}

/** Write one compressed session log under a fixture home and return that home. */
async function homeWith(sessions: readonly { workspace: string; id: string; log: string }[]): Promise<string> {
  const home = await mkdtemp(join(tmpdir(), 'dsh-longitudinal-usage-'))
  roots.push(home)
  for (const session of sessions) {
    const directory = join(home, 'sessions', session.workspace, session.id)
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'session.v4.jsonl.zstd'), zstdCompressSync(Buffer.from(session.log)))
  }
  return home
}

describe('parseSessionLog', () => {
  it('counts requests with usage, tool calls by name, and memory injections', () => {
    const log = `${sessionLog('session-a', NOV_6, [
      { toolCalls: ['skill', 'bash'] },
      { memoryInjected: true },
    ], 'sota')}\n${JSON.stringify({
      type: 'assistant/message',
      seq: 9,
      time: NOV_6,
      data: { message: { role: 'assistant', content: [{ type: 'tool-call', name: 'read' }] } },
    })}`
    expect(parseSessionLog(log)).toEqual({
      id: 'session-a',
      createdAt: NOV_6,
      agentPreset: 'sota',
      requests: 2,
      toolCalls: { skill: 1, bash: 1 },
      memoryInjections: 1,
      dispatchGate: { unlisted: {}, explicitDeny: 0 },
    })
  })

  it('ignores a tool call on a message without provider usage', () => {
    const log = sessionLog('session-b', NOV_6, [{ toolCalls: ['skill'] }])
    const withoutUsage = JSON.parse(log.split('\n')[1] as string) as { data: { usage?: unknown } }
    delete withoutUsage.data.usage
    const lines = log.split('\n')
    lines[1] = JSON.stringify(withoutUsage)
    expect(parseSessionLog(lines.join('\n'))).toMatchObject({ requests: 0, toolCalls: {} })
  })

  it('counts dispatch-gate decisions by requested tool name', () => {
    const log = sessionLog('session-g', NOV_6, [
      { gate: { name: 'bash' } },
      { gate: { name: 'bash' } },
      { gate: { name: 'write', decision: 'explicit-deny' } },
    ], 'sota')
    expect(parseSessionLog(log).dispatchGate).toEqual({ unlisted: { bash: 2 }, explicitDeny: 1 })
  })

  it('rejects a log without a session header', () => {
    expect(() => parseSessionLog('')).toThrow('session log is empty')
    expect(() => parseSessionLog(JSON.stringify({ type: 'turn/start', seq: 0 }))).toThrow('session header')
  })
})

describe('utcDay', () => {
  it('maps an instant to its UTC day', () => {
    expect(utcDay(NOV_6)).toBe('2026-11-06')
    expect(utcDay(NOV_6 + DAY - 1)).toBe('2026-11-06')
    expect(utcDay(NOV_6 + DAY)).toBe('2026-11-07')
  })
})

describe('measureWindow', () => {
  /** Three in-window sessions plus one outside the window. */
  async function fixtureHome(): Promise<string> {
    return homeWith([
      { workspace: '--ws-one--', id: 'session-a', log: sessionLog('session-a', NOV_6, [{ toolCalls: ['skill'], memoryInjected: true, gate: { name: 'skill' } }], 'sota') },
      { workspace: '--ws-one--', id: 'session-b', log: sessionLog('session-b', NOV_7, [{ toolCalls: ['bash'], gate: { name: 'bash' } }], 'standard') },
      { workspace: '--ws-two--', id: 'session-c', log: sessionLog('session-c', NOV_7, [], 'sota') },
      { workspace: '--ws-two--', id: 'session-d', log: sessionLog('session-d', OCT_1, [{ toolCalls: ['skill'] }], 'sota') },
    ])
  }

  it('aggregates the window and applies the declared kill criteria', async () => {
    const home = await fixtureHome()
    const report = measureWindow({ home, from: '2026-11-06' })
    expect(report.window).toEqual({ from: '2026-11-06' })
    expect(report.usage).toEqual({
      sessions: 3,
      requests: 2,
      toolCalls: { skill: 1, bash: 1 },
      sessionsWithSkill: 1,
      memoryInjections: 1,
      activeDays: 2,
    })
    expect(report.dispatchGate).toEqual({ unlisted: { bash: 1, skill: 1 }, explicitDeny: 0 })
    expect(report.sessions.map(session => session.id)).toEqual(['session-a', 'session-b', 'session-c'])
    // Memory keeps its single injection; the skill router misses half the sessions.
    expect(report.decisions).toEqual([
      { criterion: 'memory', decision: 'keep', reason: '1 injections in 3 sessions meet the 1 minimum' },
      { criterion: 'skills', decision: 'disable', reason: '1/3 sessions loaded a skill (0.33), below 0.5' },
    ])
    expect(KILL_CRITERIA.memory?.minSessions).toBe(3)
  })

  it('waits for the minimum sample before applying a criterion', async () => {
    const home = await fixtureHome()
    const report = measureWindow({ home, from: '2026-11-06', to: '2026-11-06' })
    expect(report.usage.sessions).toBe(1)
    expect(report.decisions.every(decision => decision.decision === 'keep')).toBe(true)
    expect(report.decisions.map(decision => decision.reason))
      .toEqual([
        'window has 1 sessions, below the 3-session minimum',
        'window has 1 sessions, below the 3-session minimum',
      ])
  })

  it('filters by preset and by workspace', async () => {
    const home = await fixtureHome()
    expect(measureWindow({ home, from: '2026-11-06', preset: 'sota' }).sessions.map(session => session.id))
      .toEqual(['session-a', 'session-c'])
    expect(measureWindow({ home, from: '2026-11-06', workspace: 'ws-one' }).sessions.map(session => session.id))
      .toEqual(['session-a', 'session-b'])
  })

  it('renders one line per decision and per session', async () => {
    const home = await fixtureHome()
    const rendered = renderReport(measureWindow({ home, from: '2026-11-06' }))
    expect(rendered).toContain('window 2026-11-06..open (UTC days, inclusive)')
    expect(rendered).toContain('sessions 3 · requests 2 · active days 2')
    expect(rendered).toContain('dispatch gate in audit · unlisted bash 1 · skill 1 · explicit deny 0')
    expect(rendered).toContain('decision skills: disable — 1/3 sessions loaded a skill (0.33), below 0.5')
    expect(rendered).toContain('session session-c preset sota day 2026-11-07 requests 0 skill 0 memory 0')
  })

  it('keeps only sessions that recorded a dispatch-gate decision', async () => {
    const home = await homeWith([
      { workspace: '--ws-one--', id: 'session-a', log: sessionLog('session-a', NOV_6, [{ toolCalls: ['skill'], gate: { name: 'skill' } }], 'sota') },
      { workspace: '--ws-one--', id: 'session-b', log: sessionLog('session-b', NOV_6, [{ toolCalls: ['bash'] }], 'sota') },
    ])
    expect(measureWindow({ home, from: '2026-11-06' }).usage.sessions).toBe(2)
    const gated = measureWindow({ home, from: '2026-11-06', requireGate: true })
    expect(gated.sessions.map(session => session.id)).toEqual(['session-a'])
    expect(gated.window).toEqual({ from: '2026-11-06', requireGate: true })
    expect(renderReport(gated)).toContain('· gate-mounted sessions only')
  })

  it('fails loudly when the home has no sessions directory', () => {
    expect(() => measureWindow({ home: join(tmpdir(), 'dsh-longitudinal-usage-missing') }))
      .toThrow('is not a sessions directory')
  })

  it('reads a session reached through a symlink', async () => {
    const source = await homeWith([
      { workspace: '--ws-one--', id: 'session-a', log: sessionLog('session-a', NOV_6, [{ toolCalls: ['skill'] }], 'sota') },
    ])
    const linked = await mkdtemp(join(tmpdir(), 'dsh-longitudinal-usage-linked-'))
    roots.push(linked)
    await mkdir(join(linked, 'sessions', '--ws-one--'), { recursive: true })
    await symlink(
      join(source, 'sessions', '--ws-one--', 'session-a'),
      join(linked, 'sessions', '--ws-one--', 'session-a'),
    )
    const report = measureWindow({ home: linked })
    expect(report.sessions.map(session => session.id)).toEqual(['session-a'])
    expect(report.usage.requests).toBe(1)
  })
})

describe('parseOptions', () => {
  it('parses the window and the output mode', () => {
    const parsed = parseOptions(['--home', '/tmp/home', '--from', '2026-11-08', '--to', '2026-12-08', '--json'])
    expect(parsed.options).toEqual({ home: '/tmp/home', from: '2026-11-08', to: '2026-12-08' })
    expect(parsed.json).toBe(true)
    expect(parsed.help).toBe(false)
    expect(parseOptions(['--require-gate']).options.requireGate).toBe(true)
  })

  it('rejects a malformed or inverted day window', () => {
    expect(() => parseOptions(['--from', '2026-11-8'])).toThrow('--from must be a YYYY-MM-DD day')
    expect(() => parseOptions(['--from', '2026-12-01', '--to', '2026-11-01'])).toThrow('is after')
  })

  it('reports help without measuring', () => {
    expect(parseOptions(['--help']).help).toBe(true)
  })
})
