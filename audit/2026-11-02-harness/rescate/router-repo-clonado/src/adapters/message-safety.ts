import type { AssistantMessage } from "@earendil-works/pi-ai";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function identity(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && !/[\p{Cc}\p{Cf}]/u.test(value);
}

export function invalidToolCall(block: unknown): boolean {
  return (
    record(block) &&
    block.type === "toolCall" &&
    (!identity(block.id) || !identity(block.name) || !record(block.arguments))
  );
}

export function countInvalidToolCalls(content: AssistantMessage["content"]): number {
  return content.filter(invalidToolCall).length;
}

/** Copy, never mutate shared stream partials; preserve text, reasoning and usage. */
export function sanitizeToolCalls(message: AssistantMessage): AssistantMessage {
  return { ...message, content: message.content.filter((block) => !invalidToolCall(block)) };
}

interface TranscriptMessage {
  role: string;
  content?: unknown;
  toolCallId?: unknown;
  toolName?: unknown;
}

/** Repair only the outgoing projection; original session entries remain intact. */
export function sanitizeTranscript<T extends TranscriptMessage>(messages: readonly T[]): T[] {
  const validIds = new Set<string>();
  const projected = messages.map((message) => {
    if (message.role !== "assistant" || !Array.isArray(message.content)) return message;
    const content = message.content.filter((block) => !invalidToolCall(block));
    for (const block of content) {
      if (record(block) && block.type === "toolCall" && identity(block.id)) validIds.add(block.id);
    }
    return content.length === message.content.length ? message : { ...message, content };
  });
  return projected.filter(
    (message) =>
      message.role !== "toolResult" ||
      (identity(message.toolCallId) &&
        identity(message.toolName) &&
        validIds.has(message.toolCallId)),
  );
}

/** Diagnostic vocabulary only: never copy arbitrary response bodies into session logs. */
export function upstreamDiagnostic(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  // Quota-in-perpetuity (permanent until credits/plan change): disable the account,
  // do NOT wait-and-retry like a transient 429. Matches Alibaba/Qwen `insufficient_quota`
  // and Agnes' 400 "You have reached your specified API usage limits... regain access on
  // <date>", which is also permanent until the reset date.
  if (
    /insufficient_quota|allocated quota exceeded|quota.*exhausted|token[-_ ]?limit|usage[_ -]?limits|regain[_ -]?access/i.test(
      raw,
    )
  )
    return "account_quota_exhausted";
  if (
    /tool[_ .-]*(?:call|use)[_ .-]*id|call_id|tool_calls[^\n]{0,100}[.\]]id|tool_use\.id/i.test(raw)
  )
    return "invalid_request: tool_call_id";
  if (/tool_calls[^\n]{0,100}(?:function\.)?name|tool(?:_call|_use)?[._ ]name/i.test(raw))
    return "invalid_request: tool_name";
  if (/invalid[_ ](?:json|arguments)|arguments[^\n]{0,40}(?:invalid|parse)/i.test(raw))
    return "invalid_request: tool_arguments";
  if (/model[_ ]not[_ ]found|unknown model|invalid model/i.test(raw))
    return "invalid_request: model";
  return undefined;
}
