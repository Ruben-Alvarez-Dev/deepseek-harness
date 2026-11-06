/**
 * Passive memory plugin: a local bounded index injected per turn with an
 * untrusted fence, plus a redacted capture write on session disposal.
 *
 * @module @deepseek-ai/dsh-memory-passive
 */

import { createHash } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import type { PreStepDecision } from '@deepseek-ai/dsh-agent'
import { contentText, createUserMessage, type UserMessage } from '@deepseek-ai/dsh-llm'
import { boundCaptureText, captureExchange, type ExchangeState } from './capture.ts'
import { Config, resolveConfig } from './config.ts'
import { MemoryStore } from './store.ts'
import type {} from './types.ts'

export const name = 'memory-passive'

export { Config, resolveConfig }
export type { ResolvedConfig } from './config.ts'
export type { CaptureRecord, MemoryEntry, SelectedMemory } from './types.ts'
export { redactSecrets } from '@deepseek-ai/dsh-redaction'
export type { RedactionSummary } from '@deepseek-ai/dsh-redaction'

/**
 * Mount passive memory: volatile per-turn injection and local redacted capture.
 * @param ctx - plugin context.
 * @param config - deployment policy; `memoryDir` is required.
 */
export function apply(ctx: Context, config: Config): void {
  const resolved = resolveConfig(config)
  const store = new MemoryStore(resolved.memoryDir, resolved.maxIndexLines)

  // Track the latest exchange incrementally: the capture path never reads
  // historical Session events, per the synchronous-read deprecation. Every
  // side is bounded at ingest, so a long session retains at most two capture
  // quotas instead of unbounded text it can never write.
  const exchanges = new WeakMap<object, { user: string; assistant: string }>()
  ctx.on('session/event', (session, event) => {
    const state = exchanges.get(session) ?? { user: '', assistant: '' }
    if (event.type === 'user/message') {
      if (event.data.source.kind === 'user') {
        const text = contentText(event.data.content)
        if (text.length > 0) state.user = boundCaptureText(text, resolved.captureMaxChars)
      }
    } else if (event.type === 'assistant/message') {
      const text = contentText(event.data.message.content)
      if (text.length > 0) state.assistant = boundCaptureText(text, resolved.captureMaxChars)
    }
    exchanges.set(session, state)
  })
  if (resolved.capture) {
    ctx.on('session/disposed', (session) => {
      const state = exchanges.get(session)
      exchanges.delete(session)
      if (state === undefined) return
      void captureExchange(state as ExchangeState, String(session.id), resolved.memoryDir, resolved.captureMaxChars)
        .catch((error: unknown) => {
          ctx.logger.warn(`memory-passive: capture failed: ${error instanceof Error ? error.message : String(error)}`)
        })
    })
  }

  ctx.on('agent/pre-step', async ({ agent, messages, turn, step, signal }, next): Promise<PreStepDecision> => {
    const decision = await next()
    if (decision.kind === 'reject') return decision
    if (resolved.injectOncePerTurn && step !== 1) return decision
    if (decision.messages.some(message => message.source.kind === 'plugin' && message.source.plugin === 'memory-passive')) {
      return decision
    }
    const query = lastDirectUserText(messages)
    if (query === undefined) return decision
    const entries = await store.select(query, resolved.injectLimit)
    if (entries.length === 0) return decision
    const rendered = await store.render(entries, resolved.injectQuotaChars)
    if (rendered.ids.length === 0) return decision
    signal.throwIfAborted()
    const digest = createHash('sha256').update(rendered.text).digest('hex')
    agent.session.append('memory/injected', {
      ids: rendered.ids,
      digest,
      chars: rendered.text.length,
      quotaChars: resolved.injectQuotaChars,
      turn,
    })
    const injected = createUserMessage({
      content: [{ type: 'text', text: rendered.text }],
      source: { kind: 'plugin', plugin: 'memory-passive' },
    })
    return { ...decision, messages: [...decision.messages, injected] }
  }, { prepend: true })
}

/** Latest direct user text, or undefined when the step has none. */
function lastDirectUserText(messages: readonly UserMessage[]): string | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index] as UserMessage
    if (message.source.kind !== 'user') continue
    const text = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as { text: string }).text)
      .join('\n')
    if (text.length > 0) return text
  }
  return undefined
}
