/**
 * Dispatch-gate coverage: canonical matching (the 12 bypass vectors), the
 * enforce/audit split through the real executor, the durable audit record, and
 * a real Loader composition.
 */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import { SESSION_FORMAT_VERSION, Session, SessionId, type SessionEvent } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime, { defineContentToolFixture, type ToolExecutionInput } from '@deepseek-ai/dsh-tools'
import * as dispatchGate from '@deepseek-ai/dsh-tool-dispatch-gate'
import {
  compilePatterns, decideToolDispatch, normalizeToolName, type CompiledPolicy,
} from '@deepseek-ai/dsh-tool-dispatch-gate'
import * as sourcePlugin from './fixtures/source-tools.ts'

const SIGNAL = new AbortController().signal
let context: Context | undefined
let root: string | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

const POLICY = (allow: string[], deny: string[] = []): CompiledPolicy => ({
  mode: 'enforce',
  allow: compilePatterns(allow, 'allow'),
  deny: compilePatterns(deny, 'deny'),
})

function sessionAgent(id: string): { agent: Agent; session: Session } {
  const session = Session.create(SessionId(id), [], {
    version: SESSION_FORMAT_VERSION, id: SessionId(id), createdAt: 0, cwd: '/workspace', isSeeded: false,
  })
  return { agent: { session } as unknown as Agent, session }
}

async function setup(config?: dispatchGate.Config): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(dispatchGate, config)
  ctx.tools.register(defineContentToolFixture({
    name: 'read', description: 'allowed fixture', parameters: {},
    async execute() { return [{ type: 'text' as const, text: 'read ran' }] },
  }))
  ctx.tools.register(defineContentToolFixture({
    name: 'secret', description: 'gated fixture', parameters: {},
    async execute() { return [{ type: 'text' as const, text: 'secret ran' }] },
  }))
  return ctx
}

async function run(ctx: Context, name: string, extra: Partial<ToolExecutionInput> = {}) {
  return ctx.tools.execute({ callId: ToolCallId(`call-${name}`), name, arguments: {}, signal: SIGNAL, ...extra })
}

function gateEvents(session: Session): Extract<SessionEvent, { type: 'tool/dispatch-gate' }>[] {
  return session.snapshotEvents().filter(
    (event): event is Extract<SessionEvent, { type: 'tool/dispatch-gate' }> => event.type === 'tool/dispatch-gate',
  )
}

describe('normalizeToolName and compilePatterns', () => {
  it('canonicalizes case, surrounding space, zero-width characters, and fullwidth forms', () => {
    expect(normalizeToolName(' READ ')).toBe('read')
    expect(normalizeToolName('re\u200bad')).toBe('read')
    expect(normalizeToolName('\uff52\uff45\uff41\uff44')).toBe('read')
  })

  it('rejects an unknown programmatic mode instead of silently auditing', async () => {
    const ctx = new Context()
    try {
      expect(() => { dispatchGate.apply(ctx, { mode: 'Enforce' as never }) })
        .toThrow('mode must be "audit" or "enforce"')
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('rejects empty and non-trailing wildcard patterns at load time', () => {
    expect(() => compilePatterns([''], 'allow')).toThrow('must not be empty')
    expect(() => compilePatterns(['mcp__*__x'], 'allow')).toThrow('trailing "*"')
    expect(compilePatterns(['mcp__git__*', '*'], 'allow')).toEqual(['mcp__git__*', '*'])
  })
})

describe('the 12 bypass vectors', () => {
  it('1. exact allowlisted name is allowed', () => {
    expect(decideToolDispatch('read', POLICY(['read'])).allowed).toBe(true)
  })

  it('2. an unlisted unknown name is not allowed', () => {
    expect(decideToolDispatch('nuke', POLICY(['read'])).decision).toBe('unlisted')
  })

  it('3. an unlisted uppercase variant is not allowed', () => {
    expect(decideToolDispatch('SECRET', POLICY(['read'])).allowed).toBe(false)
  })

  it('4. an unlisted name with surrounding spaces is not allowed', () => {
    expect(decideToolDispatch('  secret  ', POLICY(['read'])).allowed).toBe(false)
  })

  it('5. a zero-width character cannot smuggle a name past the allowlist', () => {
    expect(decideToolDispatch('sec\u200bret', POLICY(['read'])).allowed).toBe(false)
  })

  it('6. a fullwidth variant cannot smuggle a name past the allowlist', () => {
    expect(decideToolDispatch('\uff53\uff45\uff43\uff52\uff45\uff54', POLICY(['read'])).allowed).toBe(false)
  })

  it('7. exact entries do not prefix-match a longer name', () => {
    expect(decideToolDispatch('read_evil', POLICY(['read'])).allowed).toBe(false)
  })

  it('8. an MCP tool outside the allowlist is not allowed', () => {
    expect(decideToolDispatch('mcp__git__push', POLICY(['read'])).allowed).toBe(false)
  })

  it('9. an MCP wildcard admits the matching server tools', () => {
    expect(decideToolDispatch('mcp__git__push', POLICY(['mcp__git__*'])).allowed).toBe(true)
    expect(decideToolDispatch('mcp__fs__read', POLICY(['mcp__git__*'])).allowed).toBe(false)
  })

  it('10. an empty name is never allowed, even under a total wildcard', () => {
    expect(decideToolDispatch('', POLICY(['*'])).allowed).toBe(false)
  })

  it('11. an explicit deny wins over an allow wildcard', () => {
    const decision = decideToolDispatch('secret', POLICY(['*'], ['secret']))
    expect(decision.allowed).toBe(false)
    expect(decision.decision).toBe('explicit-deny')
  })

  it('12. a parented sub-dispatch is decided like any other call', async () => {
    const ctx = await setup({ mode: 'enforce', allow: ['read'] })
    const result = await run(ctx, 'secret', { parent: {} as NonNullable<ToolExecutionInput['parent']> })
    expect(result.isError).toBe(true)
    expect(result.error?.message).toContain('not in the dispatch allowlist')
  })
})

describe('executor integration', () => {
  it('enforce allows the allowlisted tool and denies the rest before dispatch', async () => {
    const ctx = await setup({ mode: 'enforce', allow: ['read'] })
    const { agent, session } = sessionAgent('enforce')
    await expect(run(ctx, 'read', { agent })).resolves.toMatchObject({ isError: false })
    const denied = await run(ctx, 'secret', { agent })
    expect(denied.isError).toBe(true)
    expect(denied.error?.message).toContain('not in the dispatch allowlist')
    const events = gateEvents(session)
    expect(events.map(event => event.data)).toEqual([
      { name: 'secret', normalized: 'secret', decision: 'unlisted', mode: 'enforce' },
    ])
  })

  it('audit mode logs the decision but lets the call run', async () => {
    const ctx = await setup({ mode: 'audit', allow: ['read'] })
    const { agent, session } = sessionAgent('audit')
    const result = await run(ctx, 'secret', { agent })
    expect(result.isError).toBe(false)
    expect(gateEvents(session).map(event => event.data)).toEqual([
      { name: 'secret', normalized: 'secret', decision: 'unlisted', mode: 'audit' },
    ])
  })

  it('deny short-circuits downstream pre-execute listeners; allow delegates to them', async () => {
    const ctx = await setup({ mode: 'enforce', allow: ['read'] })
    let downstream = 0
    ctx.on('tools/pre-execute', async (_exec, next) => {
      downstream += 1
      return next()
    })
    await run(ctx, 'read')
    expect(downstream).toBe(1)
    await run(ctx, 'secret')
    expect(downstream).toBe(1)
  })

  it('explicit deny wins over a total allow wildcard', async () => {
    const ctx = await setup({ mode: 'enforce', allow: ['*'], deny: ['secret'] })
    const { agent, session } = sessionAgent('explicit-deny')
    expect((await run(ctx, 'read', { agent })).isError).toBe(false)
    expect((await run(ctx, 'secret', { agent })).isError).toBe(true)
    expect(gateEvents(session)[0]?.data.decision).toBe('explicit-deny')
  })
})

describe('real Loader composition', () => {
  it('enforces the configured allowlist through a mounted cordis.yml', async () => {
    root = await mkdtemp(join(tmpdir(), 'dispatch-gate-loader-'))
    const fixture = await readFile(new URL('./fixtures/cordis.yml', import.meta.url), 'utf8')
    const configPath = join(root, 'cordis.yml')
    await writeFile(configPath, fixture)
    const ctx = context = new Context()
    ctx.baseUrl = pathToFileURL(root).href + '/'
    await ctx.plugin(Loader)
    ctx.loader.builtins.include = Include
    const modules = new Map<string, unknown>([
      ['@deepseek-ai/dsh-system-prompt', SystemPrompt],
      ['@deepseek-ai/dsh-tools', ToolRuntime],
      ['@deepseek-ai/dsh-tool-dispatch-gate', dispatchGate],
      ['./source-tools.ts', sourcePlugin],
    ])
    ctx.loader.internal = {
      version: 'v2',
      async import(specifier: string) {
        if (!modules.has(specifier)) throw new Error('Unexpected Loader import: ' + specifier)
        return modules.get(specifier)
      },
    } as unknown as NonNullable<typeof ctx.loader.internal>
    await ctx.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(configPath).href } })
    await ctx.loader.await()

    const safe = await run(ctx, 'safe')
    expect(safe.isError).toBe(false)
    const danger = await run(ctx, 'danger')
    expect(danger.isError).toBe(true)
    expect(danger.error?.message).toContain('not in the dispatch allowlist')
  })
})
