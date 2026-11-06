/** Redacted local capture of the last exchange when a session is disposed. */

import { appendFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { redactSecrets } from './redact.ts'
import type { CaptureRecord, RedactionSummary } from './types.ts'

const INBOX_FILE = 'inbox.jsonl'

/** Latest direct user and assistant text tracked for one session. */
export interface ExchangeState {
  /** Latest direct user text, already bounded by append volume. */
  readonly user: string
  /** Latest assistant text, already bounded by append volume. */
  readonly assistant: string
}

/**
 * Persist one redacted capture record into the local inbox.
 * No network, no model calls: this is the only write path.
 * @param state - latest direct user and assistant text.
 * @param sessionId - identity recorded with the entry.
 * @param memoryDir - local memory directory.
 * @param maxChars - per-side character bound after redaction.
 * @returns the appended record, or null when there is nothing to capture.
 */
export async function captureExchange(
  state: ExchangeState,
  sessionId: string,
  memoryDir: string,
  maxChars: number,
): Promise<CaptureRecord | null> {
  if (state.user.length === 0 && state.assistant.length === 0) return null
  const redactedUser = redactSecrets(bound(state.user, maxChars))
  const redactedAssistant = redactSecrets(bound(state.assistant, maxChars))
  const redactions = mergeSummaries(redactedUser.summary, redactedAssistant.summary)
  const record: CaptureRecord = {
    ts: Date.now(),
    sessionId,
    redactions,
    user: redactedUser.text,
    assistant: redactedAssistant.text,
  }
  await mkdir(memoryDir, { recursive: true })
  await appendFile(join(memoryDir, INBOX_FILE), `${JSON.stringify(record)}\n`, 'utf8')
  return record
}

function bound(text: string, maxChars: number): string {
  return text.length <= maxChars ? text : `${text.slice(0, maxChars - 1)}…`
}

function mergeSummaries(left: RedactionSummary, right: RedactionSummary): RedactionSummary {
  const kinds: Record<string, number> = { ...left.kinds }
  for (const [kind, count] of Object.entries(right.kinds)) kinds[kind] = (kinds[kind] ?? 0) + count
  return { count: left.count + right.count, kinds }
}
