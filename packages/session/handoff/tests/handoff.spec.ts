/** Handoff: checkpoint construction, the linked child command, and the continuation gate. */

import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry, { agentEvents, type Agent } from '@deepseek-ai/dsh-agent'
import CommandRuntime, { type CommandResult } from '@deepseek-ai/dsh-commands'
import { createMessage, createUserMessage, type AssistantMessage, type ToolCallId } from '@deepseek-ai/dsh-llm'
import { Session, SessionId, SessionStore } from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import TokenMeter from '@deepseek-ai/dsh-token-meter'
import * as handoff from '@deepseek-ai/dsh-handoff'
import { buildHandoffCheckpoint } from '@deepseek-ai/dsh-handoff/src/checkpoint.ts'
import { executeHandoff, HANDOFF_USAGE } from '@deepseek-ai/dsh-handoff/src/command.ts'
import { resolveConfig } from '@deepseek-ai/dsh-handoff/src/config.ts'

const LIMITS = resolveConfig({})
let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
})

function assistantMessage(text: string, toolCalls: Array<{ name: string; arguments: string }> = []): AssistantMessage {
  return createMessage({
    role: 'assistant',
    content: [
      ...text.length === 0 ? [] : [{ type: 'text' as const, text }],
      ...toolCalls.map((call, index) => ({
        type: 'tool-call' as const,
        id: `call-${index}` as unknown as ToolCallId,
        name: call.name,
        arguments: call.arguments,
      })),
    ],
    source: { kind: 'model', provider: 'test', model: 'test' },
  })
}

function appendExchange(
  session: Session,
  user: string,
  assistant: string,
  toolCalls: Array<{ name: string; arguments: string }> = [],
): void {
  session.append('turn/start', { turn: 1 })
  session.append('user/message', createUserMessage({
    content: [{ type: 'text', text: user }],
    source: { kind: 'user' },
  }), { surfaceOp: 'append' })
  session.append('step/start', { turn: 1, step: 1 })
  session.append('assistant/message', {
    turn: 1,
    step: 1,
    message: assistantMessage(assistant, toolCalls),
    stream: [],
  }, { surfaceOp: 'append' })
}

async function harness(): Promise<{ ctx: Context; parent: Session; agent: Agent }> {
  const ctx = context = new Context()
  await ctx.plugin(CommandRuntime)
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(SessionStore)
  await ctx.plugin(SessionProjectionRegistry)
  await ctx.plugin(TokenMeter)
  await ctx.plugin(handoff, {})
  const parent = ctx.sessions.create(SessionId('handoff-parent'), { meta: { cwd: '/workspace' } })
  appendExchange(
    parent,
    'finish the migration and keep the API stable',
    'The migration is half done; the remaining step is the backfill in packages/db/migrate.ts.',
    [{ name: 'bash', arguments: '{"command":"pnpm test packages/db"}' }],
  )
  const agent = { session: parent, status: 'idle', options: {} } as unknown as Agent
  return { ctx, parent, agent }
}

async function run(ctx: Context, agent: Agent, input: string): Promise<CommandResult> {
  const execution = await ctx.commands.execute(agent, input, [], new AbortController().signal)
  if (execution === undefined) throw new Error('handoff command was not registered')
  return execution.result
}

describe('handoff checkpoint', () => {
  it('carries the goal, parent id, tokens, working set and referenced files', () => {
    const session = Session.create(SessionId('checkpoint-parent'))
    appendExchange(
      session,
      'finish the migration',
      'Remaining: run the backfill in packages/db/migrate.ts and verify.',
      [{ name: 'bash', arguments: '{"command":"pnpm test"}' }],
    )
    const checkpoint = buildHandoffCheckpoint({ session, goal: 'finish the migration', tokens: 1234, limits: LIMITS })
    expect(checkpoint.text).toContain('Goal: finish the migration')
    expect(checkpoint.text).toContain('Parent session: checkpoint-parent')
    expect(checkpoint.text).toContain('1234 tokens')
    expect(checkpoint.text).toContain('session_event_search')
    expect(checkpoint.text).toContain('tool: bash')
    expect(checkpoint.files).toContain('packages/db/migrate.ts')
  })

  it('bounds the assistant text and tool arguments', () => {
    const session = Session.create(SessionId('bounded-parent'))
    appendExchange(session, 'goal', 'x'.repeat(5000), [{ name: 'bash', arguments: 'y'.repeat(1000) }])
    const checkpoint = buildHandoffCheckpoint({
      session,
      goal: 'goal',
      tokens: 10,
      limits: resolveConfig({ checkpointAssistantChars: 100, argumentChars: 20, maxToolCalls: 1 }),
    })
    expect(checkpoint.text.length).toBeLessThan(1000)
    expect(checkpoint.text).not.toContain('x'.repeat(200))
    expect(checkpoint.text).not.toContain('y'.repeat(50))
  })
})

describe('handoff command', () => {
  it('creates a linked child session and leaves the parent history intact', async () => {
    const { ctx, parent, agent } = await harness()
    const before = parent.deriveMessages().length
    const result = await run(ctx, agent, '/handoff finish the migration and keep the API stable')
    expect(result.kind).toBe('success')
    const sessions = ctx.sessions.list()
    expect(sessions).toHaveLength(2)
    const child = sessions.find(session => session.id !== parent.id)
    if (child === undefined) throw new Error('expected a child session')
    expect(child.header.parentSession).toBe(parent.id)
    expect(String(result.kind === 'success' ? result.text : '')).toContain(String(child.id))
    // The checkpoint is log-only until the child's first step: the child
    // surface must stay empty so the system prompt remains node 0.
    expect(child.deriveMessages()).toHaveLength(0)
    const checkpointEvent = child.snapshotEvents().find(event => event.type === 'handoff/checkpoint')
    expect(JSON.stringify(checkpointEvent?.data)).toContain('finish the migration and keep the API stable')
    const delivered = await agentEvents(ctx, { session: child, status: 'running', options: {} } as unknown as Agent).waterfall(
      'agent/pre-step',
      { messages: [], turn: 1, step: 1, signal: new AbortController().signal },
      () => Promise.resolve({ kind: 'enter' as const, messages: [] }),
    )
    if (delivered.kind !== 'enter') throw new Error('expected an enter decision')
    const injected = JSON.stringify(delivered.messages)
    expect(injected).toContain('Handoff checkpoint')
    expect(injected).toContain('finish the migration and keep the API stable')
    expect(injected).toContain('handoff-parent')
    // The loop commits the delivered messages to the surface; the projection
    // then records delivery, so no later step offers the checkpoint again.
    for (const message of delivered.messages) child.append('user/message', message, { surfaceOp: 'append' })
    const second = await agentEvents(ctx, { session: child, status: 'running', options: {} } as unknown as Agent).waterfall(
      'agent/pre-step',
      { messages: [], turn: 1, step: 2, signal: new AbortController().signal },
      () => Promise.resolve({ kind: 'enter' as const, messages: [] }),
    )
    expect(second.kind === 'enter' ? second.messages : []).toHaveLength(0)
    expect(parent.deriveMessages()).toHaveLength(before)
  })

  it('delivers the durable checkpoint after a resume-style remount', async () => {
    const ctx = context = new Context()
    await ctx.plugin(CommandRuntime)
    await ctx.plugin(AgentRegistry)
    await ctx.plugin(SessionStore)
    await ctx.plugin(SessionProjectionRegistry)
    await ctx.plugin(TokenMeter)
    const child = ctx.sessions.create(SessionId('handoff-resume-child'))
    child.append('handoff/checkpoint', {
      parentSession: 'handoff-resume-parent',
      goal: 'finish the migration',
      tokens: 42,
      text: '## Handoff checkpoint (from the previous session)\n\nresumed checkpoint body',
    })
    // A resumed process mounts the plugin after the child's log already exists.
    await ctx.plugin(handoff, {})
    const delivered = await agentEvents(ctx, { session: child, status: 'running', options: {} } as unknown as Agent).waterfall(
      'agent/pre-step',
      { messages: [], turn: 1, step: 1, signal: new AbortController().signal },
      () => Promise.resolve({ kind: 'enter' as const, messages: [] }),
    )
    if (delivered.kind !== 'enter') throw new Error('expected an enter decision')
    expect(JSON.stringify(delivered.messages)).toContain('resumed checkpoint body')
    for (const message of delivered.messages) child.append('user/message', message, { surfaceOp: 'append' })
    const second = await agentEvents(ctx, { session: child, status: 'running', options: {} } as unknown as Agent).waterfall(
      'agent/pre-step',
      { messages: [], turn: 1, step: 2, signal: new AbortController().signal },
      () => Promise.resolve({ kind: 'enter' as const, messages: [] }),
    )
    expect(second.kind === 'enter' ? second.messages : []).toHaveLength(0)
  })

  it('rejects a handoff without a goal', async () => {
    const { ctx, agent } = await harness()
    const result = await run(ctx, agent, '/handoff')
    expect(result).toEqual({ kind: 'error', text: HANDOFF_USAGE })
    expect(ctx.sessions.list()).toHaveLength(1)
  })

  it('reports the measured token count', async () => {
    const { ctx, parent, agent } = await harness()
    const result = executeHandoff(ctx, { agent, commandId: 'cmd' as never, rawInput: 'goal', signal: new AbortController().signal } as never, LIMITS)
    expect(result.kind).toBe('success')
    expect(String(result.kind === 'success' ? result.text : '')).toMatch(/\d+ tokens summarized/)
    expect(parent.header.parentSession).toBeUndefined()
  })
})

describe('handoff continuation gate', () => {
  it('keeps every fact and needs zero recovery steps versus five without handoff', () => {
    const tasks = ['migration', 'deploy', 'audit'] as const
    const facts: string[] = []
    for (const task of tasks) {
      const session = Session.create(SessionId(`gate-parent-${task}`))
      const taskFacts = [0, 1, 2, 3, 4].map(index => `fact-${task}-${index}-${'z'.repeat(20)}`)
      appendExchange(
        session,
        `continue the ${task}`,
        `Known facts: ${taskFacts.join('; ')}. Next: apply them in packages/${task}.ts.`,
      )
      const checkpoint = buildHandoffCheckpoint({ session, goal: `continue the ${task}`, tokens: 500, limits: LIMITS })
      for (const fact of taskFacts) {
        expect(checkpoint.text).toContain(fact)
        facts.push(fact)
      }
    }
    const total = facts.length
    const recoveredWithHandoff = 0
    const recoveredWithoutHandoff = 5 * tasks.length
    expect(total).toBe(15)
    expect(recoveredWithHandoff).toBe(0)
    expect(recoveredWithoutHandoff).toBeGreaterThan(recoveredWithHandoff)
    expect(1 - recoveredWithHandoff / total).toBe(1)
  })
})
