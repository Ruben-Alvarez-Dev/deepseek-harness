import type { AssistantMessage } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import {
  invalidToolCall,
  sanitizeToolCalls,
  sanitizeTranscript,
  upstreamDiagnostic,
} from "../src/adapters/message-safety.ts";

const valid = { type: "toolCall", id: "call_ok", name: "read", arguments: {} };

describe("message integrity boundary", () => {
  it.each([
    { ...valid, id: "" },
    { ...valid, name: " " },
    { ...valid, id: undefined },
    { ...valid, name: 0 },
    { ...valid, id: "call\nforged" },
    { ...valid, arguments: null },
    { ...valid, arguments: [] },
  ])("rejects an incomplete runtime block %#", (block) => {
    expect(invalidToolCall(block)).toBe(true);
  });

  it("preserves valid empty arguments, text and thinking", () => {
    expect(invalidToolCall(valid)).toBe(false);
    expect(invalidToolCall({ type: "text", text: "hello" })).toBe(false);
    const original = { content: [{ type: "text", text: "hello" }, valid, { ...valid, id: "" }] };
    const cleaned = sanitizeToolCalls(original as AssistantMessage);
    expect(cleaned.content).toHaveLength(2);
    expect(original.content).toHaveLength(3);
    expect(cleaned).not.toBe(original);
  });

  it("drops invalid calls and orphan results without rewriting branch/custom/system entries", () => {
    const messages = [
      { role: "system", content: "instructions" },
      { role: "custom", content: "metadata" },
      { role: "assistant", content: [valid, { ...valid, id: "", name: "" }] },
      { role: "toolResult", toolCallId: "", toolName: "", content: "bad" },
      { role: "toolResult", toolCallId: "orphan", toolName: "read", content: "bad" },
      { role: "toolResult", toolCallId: "call_ok", toolName: "read", content: "good" },
    ];
    const before = structuredClone(messages);
    const cleaned = sanitizeTranscript(messages);
    expect(cleaned).toHaveLength(4);
    expect(cleaned[2]?.content).toEqual([valid]);
    expect(cleaned[3]?.content).toBe("good");
    expect(cleaned[0]).toBe(messages[0]);
    expect(cleaned[1]).toBe(messages[1]);
    expect(messages).toEqual(before);
    expect(sanitizeTranscript(cleaned)).toEqual(cleaned);
  });

  it.each([
    ["input[43].call_id: empty string", "tool_call_id"],
    ["messages.21.content.1.tool_use.id: invalid", "tool_call_id"],
    ["tool_calls.0.id must not be empty secret=synthetic-key", "tool_call_id"],
    ["tool_calls.0.function.name is required", "tool_name"],
    ["invalid arguments secret=synthetic-key", "tool_arguments"],
    ["unknown model secret=synthetic-key", "model"],
  ])("classifies %s without copying arbitrary text", (raw, field) => {
    expect(upstreamDiagnostic(raw)).toBe(`invalid_request: ${field}`);
    expect(upstreamDiagnostic(raw)).not.toContain("synthetic-key");
  });

  it("classifies permanent quota exhaustion without copying the body", () => {
    const raw =
      '{"message":"Allocated quota exceeded, please increase your quota limit.","code":"insufficient_quota"}';
    expect(upstreamDiagnostic(raw)).toBe("account_quota_exhausted");
    expect(upstreamDiagnostic(raw)).not.toContain("Allocated");
  });

  it("classifies the Agnes 400 usage-limits rejection as permanent exhaustion", () => {
    // Real body observed from apihub.agnes-ai.com (2026-10-16): permanent until a reset date.
    const raw =
      '{"type":"error","error":{"type":"invalid_request_error","message":"You have reached your specified API usage limits. You will regain access on 2026-11-01 at 00:00 UTC."},"request_id":"req_ag"}';
    expect(upstreamDiagnostic(raw)).toBe("account_quota_exhausted");
    expect(upstreamDiagnostic(raw)).not.toContain("regain");
    expect(upstreamDiagnostic(raw)).not.toContain("2026-11-01");
  });

  it("does not expose unknown bodies or keys", () => {
    expect(upstreamDiagnostic("Authorization: Bearer synthetic-secret")).toBeUndefined();
    expect(upstreamDiagnostic(undefined)).toBeUndefined();
  });
});
