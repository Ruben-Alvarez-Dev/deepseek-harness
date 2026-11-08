/** Passive memory: store, redaction, capture, injection and the recall gate. */

import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry, { agentEvents, type Agent } from '@deepseek-ai/dsh-agent'
import { createMessage, createUserMessage } from '@deepseek-ai/dsh-llm'
import { Session, SessionId, SessionStore } from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import * as memoryPassive from '@deepseek-ai/dsh-memory-passive'
import { boundCaptureText, captureExchange } from '@deepseek-ai/dsh-memory-passive/src/capture.ts'
import { redactSecrets } from '@deepseek-ai/dsh-memory-passive'
import { MemoryStore } from '@deepseek-ai/dsh-memory-passive/src/store.ts'
import { MEMORY_FIXTURE_DIR, MEMORY_QUERIES } from './fixtures/queries.ts'

const INJECT_QUOTA = 2000
let context: Context | undefined
let temporary: string | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  if (temporary !== undefined) await rm(temporary, { recursive: true, force: true })
  temporary = undefined
})

function memoryAgent(session: Session, id = 'memory-agent'): Agent {
  return {
    id: SessionId(id),
    options: {},
    session,
    inbox: {},
    status: 'running',
    ctx: new Context(),
    send: () => {},
    followup: () => {},
    steer: () => {},
    inject: () => {},
    cancel() {},
    runMaintenance: (task: (signal: AbortSignal) => Promise<void>) => task(new AbortController().signal),
    whenIdle: () => Promise.resolve(),
  } as unknown as Agent
}

function openTurn(session: Session, text: string, turn = 1): ReturnType<typeof createUserMessage> {
  session.append('turn/start', { turn })
  const message = createUserMessage({
    content: [{ type: 'text', text }],
    source: { kind: 'user' },
  })
  session.append('user/message', message, { surfaceOp: 'append' })
  return message
}

async function mount(config: Partial<memoryPassive.Config> = {}): Promise<Context> {
  const ctx = context = new Context()
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(memoryPassive, {
    memoryDir: MEMORY_FIXTURE_DIR,
    injectLimit: 5,
    injectQuotaChars: INJECT_QUOTA,
    capture: false,
    ...config,
  })
  return ctx
}

async function fire(
  ctx: Context,
  agent: Agent,
  turn: number,
  step: number,
  messages: ReturnType<typeof createUserMessage>[] = [],
): Promise<unknown[]> {
  const decision = await agentEvents(ctx, agent).waterfall(
    'agent/pre-step',
    { messages, turn, step, signal: new AbortController().signal },
    () => Promise.resolve({ kind: 'enter' as const, messages: [] }),
  )
  if (decision.kind !== 'enter') return []
  return decision.messages
}

describe('memory-passive store', () => {
  it('parses the bounded index and ranks entries deterministically', async () => {
    const store = new MemoryStore(MEMORY_FIXTURE_DIR, 200)
    const { entries, deferred } = await store.loadIndex()
    expect(entries.length).toBeGreaterThanOrEqual(30)
    expect(deferred).toBe(0)
    const selected = await store.select('rollback a failed production deploy', 5)
    expect(selected[0]?.id).toBe('deploy-rollback')
    expect(await store.select('rollback a failed production deploy', 5)).toEqual(selected)
  })

  it('fails loud on a malformed index line', async () => {
    temporary = await mkdtemp(join(tmpdir(), 'memory-malformed-'))
    const { writeFile } = await import('node:fs/promises')
    await writeFile(join(temporary, 'MEMORY.md'), 'not an index line\n', 'utf8')
    const store = new MemoryStore(temporary, 200)
    await expect(store.loadIndex()).rejects.toThrow('malformed MEMORY.md line 1')
  })

  it('creates the memory directory when it is missing', async () => {
    temporary = await mkdtemp(join(tmpdir(), 'memory-create-'))
    const memoryDir = join(temporary, 'memory')
    const resolved = memoryPassive.resolveConfig({ memoryDir })
    expect(resolved.memoryDir).toBe(memoryDir)
    expect((await stat(memoryDir)).isDirectory()).toBe(true)
  })

  it('rejects path traversal in topic ids', async () => {
    const store = new MemoryStore(MEMORY_FIXTURE_DIR, 200)
    await expect(store.readTopic('..')).rejects.toThrow('invalid memory id')
  })

  it('renders within the character quota', async () => {
    const store = new MemoryStore(MEMORY_FIXTURE_DIR, 200)
    const entries = await store.select('deploy rollback release canary docker postgres', 5)
    const rendered = await store.render(entries, 800)
    expect(rendered.text.length).toBeLessThanOrEqual(800)
    expect(rendered.text).toContain('untrusted')
  })
})

describe('memory-passive redaction and capture', () => {
  it('redacts private keys, API keys, bearer tokens, JWTs and assignments', () => {
    const input = [
      '-----BEGIN PRIVATE KEY-----\nMIIEsecret\n-----END PRIVATE KEY-----',
      'key sk-abcdefghijklmnop1234',
      'Authorization: Bearer abcdefghijklmnopqrstuvwxyz012345',
      'jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnopqrstuvwx',
      'ghp_abcdefghijklmnopqrstuvwxyz012345',
      'API_KEY=super-secret-value',
    ].join('\n')
    const { text, summary } = redactSecrets(input)
    expect(text).not.toContain('MIIEsecret')
    expect(text).not.toContain('sk-abcdefghijklmnop1234')
    expect(text).not.toContain('super-secret-value')
    expect(summary.count).toBeGreaterThanOrEqual(6)
    expect(summary.kinds['private-key']).toBe(1)
  })

  it('captures a redacted exchange into the local inbox', async () => {
    temporary = await mkdtemp(join(tmpdir(), 'memory-capture-'))
    const record = await captureExchange(
      { user: 'deploy failed with key sk-abcdefghijklmnop1234', assistant: 'rotate the key and retry' },
      'capture-session',
      temporary,
      2000,
    )
    if (record === null) throw new Error('expected a capture record')
    expect(record.sessionId).toBe('capture-session')
    expect(record.user).not.toContain('sk-abcdefghijklmnop1234')
    expect(record.user).toContain('[REDACTED_API_KEY]')
    expect(record.redactions.count).toBeGreaterThan(0)
    const line = JSON.parse((await readFile(join(temporary, 'inbox.jsonl'), 'utf8')).trim()) as { user: string }
    expect(line.user).toBe(record.user)
  })

  it('bounds the tracked exchange at ingest', () => {
    const oversized = 'x'.repeat(5000)
    expect(boundCaptureText(oversized, 200)).toHaveLength(200)
    expect(boundCaptureText(oversized, 200).endsWith('…')).toBe(true)
    expect(boundCaptureText('short exchange', 200)).toBe('short exchange')
  })

  it('captures an oversized exchange within the per-side bound', async () => {
    temporary = await mkdtemp(join(tmpdir(), 'memory-bound-'))
    const record = await captureExchange(
      { user: 'u'.repeat(5000), assistant: 'a'.repeat(5000) },
      'bound-session',
      temporary,
      200,
    )
    if (record === null) throw new Error('expected a capture record')
    expect(record.user.length).toBeLessThanOrEqual(200)
    expect(record.assistant.length).toBeLessThanOrEqual(200)
  })

  it('writes the capture when a tracked session is disposed', async () => {
    temporary = await mkdtemp(join(tmpdir(), 'memory-dispose-'))
    const ctx = context = new Context()
    await ctx.plugin(SessionStore)
    await ctx.plugin(SessionProjectionRegistry)
    await ctx.plugin(memoryPassive, { memoryDir: temporary, capture: true, injectQuotaChars: 4000 })
    const session = ctx.sessions.create(SessionId('dispose-session'))
    openTurn(session, 'deploy failed with key sk-abcdefghijklmnop1234')
    session.append('assistant/message', {
      turn: 1,
      step: 1,
      message: createMessage({
        role: 'assistant',
        content: [{ type: 'text', text: 'rotate the key and retry' }],
        source: { kind: 'model', provider: 'test', model: 'test' },
      }),
      stream: [],
    }, { surfaceOp: 'append' })
    await ctx.fiber.dispose()
    let captured = ''
    for (let attempt = 0; attempt < 40 && captured.length === 0; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 25))
      try {
        captured = await readFile(join(temporary, 'inbox.jsonl'), 'utf8')
      } catch {
        captured = ''
      }
    }
    expect(captured).toContain('dispose-session')
    expect(captured).not.toContain('sk-abcdefghijklmnop1234')
  })
})

describe('memory-passive injection', () => {
  it('injects fenced memory on the first step and logs the injection', async () => {
    const ctx = await mount()
    const session = Session.create(SessionId('inject-session'))
    const agent = memoryAgent(session)
    const request = openTurn(session, 'rollback a failed production deploy')
    const messages = await fire(ctx, agent, 1, 1, [request])
    const injected = messages.filter((message) => {
      const source = (message as { source: { kind: string; plugin?: string } }).source
      return source.kind === 'plugin' && source.plugin === 'memory-passive'
    })
    expect(injected).toHaveLength(1)
    const text = JSON.stringify(injected[0])
    expect(text).toContain('deploy-rollback')
    expect(text).toContain('untrusted')
    expect(text.length).toBeLessThanOrEqual(INJECT_QUOTA)
    const events = session.snapshotEvents().filter(event => event.type === 'memory/injected')
    expect(events).toHaveLength(1)
    expect(JSON.stringify(events[0]?.data)).toContain('deploy-rollback')
  })

  it('injects once per turn and skips later steps', async () => {
    const ctx = await mount()
    const session = Session.create(SessionId('once-session'))
    const agent = memoryAgent(session)
    const request = openTurn(session, 'rollback a failed production deploy')
    expect(await fire(ctx, agent, 1, 1, [request])).toHaveLength(1)
    expect(await fire(ctx, agent, 1, 2, [request])).toHaveLength(0)
    expect(await fire(ctx, agent, 1, 3, [request])).toHaveLength(0)
  })

  it('injects nothing when the request has no matching memory', async () => {
    const ctx = await mount()
    const session = Session.create(SessionId('empty-session'))
    const agent = memoryAgent(session)
    const request = openTurn(session, 'xyzzy unrelated words only')
    expect(await fire(ctx, agent, 1, 1, [request])).toHaveLength(0)
  })

  it('respects the configured quota', async () => {
    const ctx = await mount({ injectQuotaChars: 800 })
    const session = Session.create(SessionId('quota-session'))
    const agent = memoryAgent(session)
    const request = openTurn(session, 'deploy rollback release canary docker postgres redis cache')
    const messages = await fire(ctx, agent, 1, 1, [request])
    expect(messages).toHaveLength(1)
    const message = messages[0] as { content: Array<{ type: string; text: string }> }
    const text = message.content.map(block => block.text).join('')
    expect(text.length).toBeLessThanOrEqual(800)
    expect(text).toContain('untrusted')
  })

  it('registers no tools', async () => {
    const ctx = context = new Context()
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    const before = ctx.tools.schemas().length
    await ctx.plugin(memoryPassive, { memoryDir: MEMORY_FIXTURE_DIR, capture: false })
    expect(ctx.tools.schemas().length).toBe(before)
  })
})

describe('memory-passive recall gate', () => {
  it('meets recall@k >= 0.80 over the labeled fixture', async () => {
    const store = new MemoryStore(MEMORY_FIXTURE_DIR, 200)
    let hits = 0
    let total = 0
    for (const entry of MEMORY_QUERIES) {
      const selected = await store.select(entry.query, 5)
      const rendered = await store.render(selected, INJECT_QUOTA)
      expect(rendered.text.length).toBeLessThanOrEqual(INJECT_QUOTA)
      const ids = selected.map(memory => memory.id)
      const relevant = new Set(entry.expected)
      const found = ids.filter(id => relevant.has(id)).length
      total += Math.min(relevant.size, 5)
      hits += found
    }
    expect(MEMORY_QUERIES.length).toBeGreaterThanOrEqual(30)
    expect(hits / total).toBeGreaterThanOrEqual(0.8)
  })
})
