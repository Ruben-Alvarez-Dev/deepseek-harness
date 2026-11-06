import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import {
  type AssistantMessageEvent,
  type Model,
  normalizeContext,
  Type,
} from "@earendil-works/pi-ai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PiCredentialResolver } from "../src/adapters/credentials.ts";
import { routerModels } from "../src/adapters/models.ts";
import { isRawUpstreamBody, MANAGED_AUTH, RoutedStreams } from "../src/adapters/routed-streams.ts";
import { systemClock } from "../src/adapters/system-clock.ts";
import { AccountRouter } from "../src/application/router.ts";
import { FakeClock, MemoryStore, poolConfig } from "./helpers.ts";

interface Payload {
  model: string;
  messages: Record<string, unknown>[];
  tools?: unknown[];
  marker?: string;
  chat_template_kwargs?: { enable_thinking?: boolean };
}
interface Captured {
  authorization: string | undefined;
  payload: Payload;
}
type Handler = (request: IncomingMessage, response: ServerResponse, payload: Payload) => void;
const closers: (() => Promise<void>)[] = [];
afterEach(async () => {
  await Promise.all(closers.splice(0).map((close) => close()));
});

function completion(response: ServerResponse, content = "héllo 🌍", tool = false) {
  response.writeHead(200, { "Content-Type": "text/event-stream" });
  const base = {
    id: "test-response",
    object: "chat.completion.chunk",
    created: 1,
    model: "agnes-3.0-flash",
  };
  const chunks: Record<string, unknown>[] = tool
    ? [
        {
          ...base,
          choices: [
            {
              index: 0,
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: "call_probe",
                    type: "function",
                    function: { name: "probe", arguments: '{"value":' },
                  },
                ],
              },
              finish_reason: null,
            },
          ],
        },
        {
          ...base,
          choices: [
            {
              index: 0,
              delta: { tool_calls: [{ index: 0, function: { arguments: '"ok"}' } }] },
              finish_reason: "tool_calls",
            },
          ],
        },
      ]
    : [
        { ...base, choices: [{ index: 0, delta: { content }, finish_reason: null }] },
        { ...base, choices: [{ index: 0, delta: {}, finish_reason: "stop" }] },
      ];
  chunks.push({
    ...base,
    choices: [],
    usage: { prompt_tokens: 12, completion_tokens: 3, total_tokens: 15 },
  });
  const bytes = Buffer.from(
    `${chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("")}data: [DONE]\n\n`,
  );
  // Fragment frames and multibyte text; the native Pi transport, not this extension, parses SSE.
  for (let i = 0; i < bytes.length; i += 7) response.write(bytes.subarray(i, i + 7));
  response.end();
}

async function setup(
  handler: Handler = (_req, res) => completion(res),
  count = 3,
  realClock = false,
) {
  const requests: Captured[] = [];
  const server = createServer(async (req, res) => {
    let text = "";
    for await (const chunk of req) text += String(chunk);
    const payload = JSON.parse(text) as Payload;
    requests.push({ authorization: req.headers.authorization, payload });
    handler(req, res, payload);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  closers.push(
    () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  );
  const config = poolConfig(count);
  config.provider.baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
  const models = routerModels(config);
  const model = models[0];
  if (!model) throw new Error("Missing fixture model");
  const store = new MemoryStore();
  const clock = realClock ? systemClock : new FakeClock();
  const router = new AccountRouter(config, store, clock);
  const credentials = new PiCredentialResolver(
    "/not-used",
    Object.fromEntries(config.accounts.map((_, i) => [`TEST_KEY_${i}`, `synthetic-${i}`])),
  );
  const runtime = new RoutedStreams(router, credentials);
  closers.push(() => runtime.shutdown());
  const context = normalizeContext({
    messages: [
      {
        role: "system",
        content: "Test instructions",
        timestamp: 1,
        toolsAdded: [
          {
            name: "probe",
            description: "Inert fixture",
            parameters: Type.Object({ value: Type.String() }),
          },
        ],
      },
      { role: "user", content: "Test", timestamp: 2 },
    ],
  });
  return { config, requests, model, store, router, runtime, context, credentials };
}

async function collect(stream: ReturnType<RoutedStreams["streamSimple"]>) {
  const events: AssistantMessageEvent[] = [];
  for await (const event of stream) events.push(event);
  const message = await stream.result();
  expect(events.filter((e) => e.type === "done" || e.type === "error")).toHaveLength(1);
  return { events, message };
}

describe("real native OpenAI transport through router", () => {
  it("rotates six successful native streams, preserves Unicode/usage and releases before terminal", async () => {
    const { runtime, model, context, requests, store } = await setup();
    for (let i = 0; i < 6; i++) {
      const { events, message } = await collect(
        runtime.streamSimple(model, context, { reasoning: undefined }),
      );
      expect(events[0]?.type).toBe("start");
      expect(message.stopReason).toBe("stop");
      expect(message.content).toContainEqual({ type: "text", text: "héllo 🌍" });
      expect(message.usage.totalTokens).toBe(15);
      expect(store.state.leases).toEqual([]);
    }
    expect(requests.map((r) => r.authorization)).toEqual([
      "Bearer synthetic-0",
      "Bearer synthetic-1",
      "Bearer synthetic-2",
      "Bearer synthetic-0",
      "Bearer synthetic-1",
      "Bearer synthetic-2",
    ]);
    expect(requests[0]?.payload.chat_template_kwargs?.enable_thinking).toBe(false);
  });

  it("preserves tool calls and sends complete continuation context on a different account", async () => {
    let call = 0;
    const { runtime, model, context, requests } = await setup((_req, res) =>
      completion(res, "done", call++ === 0),
    );
    const first = await collect(runtime.streamSimple(model, context));
    expect(first.message.stopReason).toBe("toolUse");
    expect(first.message.content).toContainEqual({
      type: "toolCall",
      id: "call_probe",
      name: "probe",
      arguments: { value: "ok" },
    });
    const continuation = normalizeContext({
      messages: [
        ...context.messages,
        first.message,
        {
          role: "toolResult",
          toolCallId: "call_probe",
          toolName: "probe",
          content: [{ type: "text", text: "fixture-result" }],
          isError: false,
          timestamp: 3,
        },
      ],
    });
    const second = await collect(runtime.streamSimple(model, continuation));
    expect(second.message.stopReason).toBe("stop");
    expect(requests[1]?.authorization).toBe("Bearer synthetic-1");
    expect(
      requests[1]?.payload.messages.some(
        (m) => m.role === "tool" && m.content === "fixture-result",
      ),
    ).toBe(true);
    expect(requests[1]?.payload.tools).toHaveLength(1);
  });

  it("honors request instrumentation, custom fetch, env, headers and raw stream API", async () => {
    const { runtime, model, context, requests } = await setup();
    const fetch = vi.fn(globalThis.fetch);
    const onResponse = vi.fn();
    const onProviderStreamEvent = vi.fn();
    const onPayload = vi.fn((value: unknown) => ({
      ...(value as Record<string, unknown>),
      marker: "replacement",
    }));
    const { message } = await collect(
      runtime.stream(model, context, {
        apiKey: MANAGED_AUTH,
        env: { TEST_KEY_0: "synthetic-scoped" },
        headers: {
          Authorization: "Bearer unauthorized-override",
          "x-api-key": "wrong",
          "X-Fixture": "yes",
        },
        fetch,
        onPayload,
        onResponse,
        onProviderStreamEvent,
      }),
    );
    expect(message.stopReason).toBe("stop");
    expect(requests[0]?.authorization).toBe("Bearer synthetic-scoped");
    expect(requests[0]?.payload.marker).toBe("replacement");
    expect(onPayload).toHaveBeenCalledOnce();
    expect(onResponse).toHaveBeenCalledOnce();
    expect(onProviderStreamEvent).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("recovers a pre-output 429 through an eligible independent fixture group without exposing an error", async () => {
    let calls = 0;
    const { config, runtime, model, context, requests, store } = await setup((_req, res) => {
      if (calls++ === 0) {
        res.writeHead(429, { "Retry-After": "30", "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: "NEVER_ECHO" } }));
      } else completion(res);
    }, 2);
    config.maxWaitMs = null;
    config.rateLimitRecovery = "wait";
    const { events, message } = await collect(runtime.streamSimple(model, context));
    expect(message.stopReason).toBe("stop");
    expect(events.some((e) => e.type === "error")).toBe(false);
    expect(requests.map((r) => r.authorization)).toEqual([
      "Bearer synthetic-0",
      "Bearer synthetic-1",
    ]);
    expect(requests[0]?.payload.messages).toEqual(requests[1]?.payload.messages);
    expect(store.state.groups[0]?.cooldownUntil).toBe(130000);
    expect(store.state.groups.flatMap((g) => g.starts)).toHaveLength(2);
    expect(store.state.leases).toEqual([]);
    expect(store.state.waiters).toEqual([]);
  });

  it("waits for Retry-After in the same group and resumes the original logical stream", async () => {
    let calls = 0;
    const { config, runtime, model, context, requests, store } = await setup((_req, res) => {
      if (calls++ === 0) {
        res.writeHead(429, { "Retry-After": "35", "Content-Type": "application/json" });
        res.end('{"error":{"message":"rate"}}');
      } else completion(res);
    }, 1);
    config.maxWaitMs = null;
    config.rateLimitRecovery = "wait";
    const { message } = await collect(runtime.streamSimple(model, context));
    expect(message.stopReason).toBe("stop");
    expect(requests).toHaveLength(2);
    expect(store.state.groups[0]?.starts).toEqual([100000, 135000]);
    expect(store.state.waiters).toEqual([]);
  });

  it("cancels rate-limit recovery while waiting without replay or leaked ownership", async () => {
    const { config, runtime, model, context, requests, store } = await setup(
      (_req, res) => {
        res.writeHead(429, { "Retry-After": "60", "Content-Type": "application/json" });
        res.end('{"error":{"message":"rate"}}');
      },
      1,
      true,
    );
    config.maxWaitMs = null;
    config.rateLimitRecovery = "wait";
    const pending = collect(runtime.streamSimple(model, context));
    await vi.waitFor(() => expect(store.state.waiters).toHaveLength(1));
    await runtime.shutdown();
    expect((await pending).message.stopReason).toBe("aborted");
    expect(requests).toHaveLength(1);
    expect(store.state.waiters).toEqual([]);
    expect(store.state.leases).toEqual([]);
    expect(store.state.groups[0]?.starts).toHaveLength(1);
  });

  it("refuses recovery if rate-limit feedback could not be persisted", async () => {
    const { config, runtime, router, model, context, requests } = await setup((_req, res) => {
      res.writeHead(429, { "Retry-After": "1", "Content-Type": "application/json" });
      res.end('{"error":{"message":"rate"}}');
    }, 1);
    config.maxWaitMs = null;
    config.rateLimitRecovery = "wait";
    vi.spyOn(router, "feedback").mockRejectedValueOnce(new Error("NEVER_ECHO"));
    const { message } = await collect(runtime.streamSimple(model, context));
    expect(message.stopReason).toBe("error");
    expect(message.errorMessage).toContain("feedback persistence failed");
    expect(message.errorMessage).not.toContain("NEVER_ECHO");
    expect(requests).toHaveLength(1);
  });

  it.each([401, 403, 503])("normalizes HTTP %s without leaking bodies", async (status) => {
    const { runtime, model, context, requests, store } = await setup((_req, res) => {
      res.writeHead(status, { "Content-Type": "application/json", "Retry-After": "30" });
      res.end(
        JSON.stringify({
          error: { message: "NEVER_ECHO synthetic-0 context_length_exceeded", type: "test" },
        }),
      );
    });
    const { message } = await collect(runtime.streamSimple(model, context, { maxRetries: 7 }));
    expect(message.stopReason).toBe("error");
    expect(message.errorMessage).not.toContain("NEVER_ECHO");
    expect(message.errorMessage).not.toContain("synthetic");
    expect(message.errorMessage).not.toBe("context_length_exceeded");
    // Router rotates through all 3 accounts: initial + 2 transient retries each
    // hitting the same failing server, exhausting the pool.
    expect(requests).toHaveLength(3);
    expect(store.state.leases).toEqual([]);
    if (status === 401 || status === 403)
      expect(store.state.disabledAccountIds).toEqual(["account-0", "account-1", "account-2"]);
    // 503: each account's group gets cooldown
    else expect(store.state.groups.every((g) => g.cooldownUntil === 130000)).toBe(true);
  });

  it("normalizes HTTP 429 without retrying or leaking bodies", async () => {
    const { runtime, model, context, requests, store } = await setup((_req, res) => {
      res.writeHead(429, { "Content-Type": "application/json", "Retry-After": "30" });
      res.end(
        JSON.stringify({
          error: { message: "NEVER_ECHO synthetic-0 context_length_exceeded", type: "test" },
        }),
      );
    });
    const { message } = await collect(runtime.streamSimple(model, context, { maxRetries: 7 }));
    expect(message.stopReason).toBe("error");
    expect(message.errorMessage).not.toContain("NEVER_ECHO");
    expect(message.errorMessage).not.toContain("synthetic");
    expect(message.errorMessage).not.toBe("context_length_exceeded");
    expect(requests).toHaveLength(1);
    expect(store.state.leases).toEqual([]);
    expect(store.state.groups[0]?.cooldownUntil).toBe(130000);
  });

  it("preserves recognized context overflow but not its provider body", async () => {
    const { runtime, model, context } = await setup((_req, res) => {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: {
            message: "maximum context length is 512000 tokens NEVER_ECHO",
            code: "context_length_exceeded",
          },
        }),
      );
    });
    const { message } = await collect(runtime.streamSimple(model, context));
    expect(message.errorMessage).toBe("context_length_exceeded");
  });

  it("surfaces the upstream 400 reason instead of an opaque failure (S-1)", async () => {
    const { runtime, model, context, requests } = await setup((_req, res) => {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: {
            message: "invalid_request: tool_calls.0.id must not be empty S1_PROBE",
            type: "invalid_request_error",
          },
        }),
      );
    });
    const { message } = await collect(runtime.streamSimple(model, context));
    expect(message.stopReason).toBe("error");
    expect(message.errorMessage).toContain("HTTP 400");
    // Diagnostics are a fixed vocabulary, never arbitrary provider text.
    expect(message.errorMessage).not.toContain("S1_PROBE");
    expect(message.errorMessage).toContain("Upstream: invalid_request: tool_call_id");
    expect(requests).toHaveLength(1);
  });

  it.each([false, true])(
    "discards an incomplete call even when cleanup fails (%s)",
    async (cleanupFails) => {
      const handler: Handler = (_req, res) => {
        res.writeHead(200, { "Content-Type": "text/event-stream" });
        const base = {
          id: "test-response",
          object: "chat.completion.chunk",
          created: 1,
          model: "agnes-3.0-flash",
        };
        const chunks = [
          {
            ...base,
            choices: [
              {
                index: 0,
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      id: "",
                      type: "function",
                      function: { name: "", arguments: '{"value":' },
                    },
                  ],
                },
                finish_reason: null,
              },
            ],
          },
          {
            ...base,
            choices: [
              {
                index: 0,
                delta: { tool_calls: [{ index: 0, function: { arguments: '"ok"}' } }] },
                finish_reason: "tool_calls",
              },
            ],
          },
          {
            ...base,
            choices: [],
            usage: { prompt_tokens: 12, completion_tokens: 3, total_tokens: 15 },
          },
        ];
        res.end(
          `${chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("")}data: [DONE]\n\n`,
        );
      };
      const { runtime, model, context, router } = await setup(handler);
      if (cleanupFails) vi.spyOn(router, "release").mockRejectedValueOnce(new Error("NEVER_ECHO"));
      const { message } = await collect(runtime.streamSimple(model, context));
      expect(message.stopReason).toBe("error");
      expect(message.errorMessage).toContain(
        cleanupFails ? "cleanup failed" : "incomplete tool call",
      );
      expect(message.errorMessage).not.toContain("NEVER_ECHO");
      const bad = (message.content ?? []).filter((block) => {
        if (block.type !== "toolCall") return false;
        return !block.id.trim() || !block.name.trim();
      });
      expect(bad).toEqual([]);
    },
  );

  it("keeps a valid tool call untouched when no block is incomplete", async () => {
    const { runtime, model, context } = await setup((_req, res) => completion(res, "x", true));
    const { message } = await collect(runtime.streamSimple(model, context));
    expect(message.stopReason).toBe("toolUse");
    expect(message.content).toContainEqual(
      expect.objectContaining({ type: "toolCall", id: "call_probe", name: "probe" }),
    );
  });

  it("removes invalid partial calls on abort, without replaying the request", async () => {
    const controller = new AbortController();
    const { runtime, model, context, requests, store } = await setup((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      const chunk = {
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [
                {
                  index: 0,
                  id: "",
                  type: "function",
                  function: { name: "", arguments: '{"x":' },
                },
              ],
            },
            finish_reason: null,
          },
        ],
      };
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    });
    const stream = runtime.streamSimple(model, context, { signal: controller.signal });
    for await (const event of stream) if (event.type === "toolcall_delta") controller.abort();
    const message = await stream.result();
    expect(message.stopReason).toBe("aborted");
    expect(message.content).toEqual([]);
    expect(requests).toHaveLength(1);
    expect(store.state.leases).toEqual([]);
  });

  it("repairs already poisoned request history without editing the original", async () => {
    const { runtime, model, context, requests } = await setup();
    const first = await collect(runtime.streamSimple(model, context));
    const poisoned = normalizeContext({
      messages: [
        ...context.messages,
        {
          ...first.message,
          stopReason: "toolUse",
          content: [{ type: "toolCall", id: "", name: "", arguments: {} }],
        },
        {
          role: "toolResult",
          toolCallId: "",
          toolName: "",
          content: [{ type: "text", text: "CORRUPT_RESULT" }],
          isError: true,
          timestamp: 3,
        },
      ],
    });
    const before = JSON.stringify(poisoned);
    const result = await collect(runtime.streamSimple(model, poisoned));
    expect(result.message.stopReason).toBe("stop");
    expect(JSON.stringify(requests[1]?.payload.messages)).not.toContain("CORRUPT_RESULT");
    expect(JSON.stringify(poisoned)).toBe(before);
  });

  it("does not expose an unknown HTTP 400 body", async () => {
    const { runtime, model, context } = await setup((_req, res) => {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "synthetic-0 NEVER_ECHO private data" } }));
    });
    const { message } = await collect(runtime.streamSimple(model, context));
    expect(message.errorMessage).toBe("Account router upstream HTTP 400 request failed.");
  });

  it.each([
    ['400 {"type":"error","error":{"message":"secret"}}', true],
    ['400: {"message":"usage limits"}', true],
    ["475 service unavailable: quota group temporarily cooling down.", false],
    ["429 rate limit: account quota group is cooling down.", false],
    ["Account router upstream network or stream error.", false],
    [undefined, false],
  ])("isRawUpstreamBody(%s) → %s", (text, expected) => {
    expect(isRawUpstreamBody(text)).toBe(expected);
  });

  it("rotates away from an Agnes-style 400 usage-limits rejection and never exposes the body", async () => {
    // Agnes rejects an exhausted free key with HTTP 400 "usage limits ... regain access on
    // <date>". That is permanent until the reset date, so the router must disable the account
    // and rotate to the next one instead of letting the whole request die (pre-fix behaviour:
    // one hit, terminal error, no further accounts tried).
    let calls = 0;
    const { runtime, model, context, requests, store } = await setup((_req, res) => {
      if (calls++ === 0) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            type: "error",
            error: {
              type: "invalid_request_error",
              message:
                "You have reached your specified API usage limits. You will regain access on 2026-11-01 at 00:00 UTC. NEVER_ECHO",
            },
            request_id: "req_ag",
          }),
        );
      } else completion(res);
    }, 2);
    const { message } = await collect(runtime.streamSimple(model, context));
    expect(requests.map((r) => r.authorization)).toEqual([
      "Bearer synthetic-0",
      "Bearer synthetic-1",
    ]);
    expect(message.stopReason).toBe("stop");
    expect(message.content).toContainEqual({ type: "text", text: "héllo 🌍" });
    expect(store.state.disabledAccountIds).toEqual(["account-0"]);
    expect(JSON.stringify(message)).not.toContain("NEVER_ECHO");
    expect(JSON.stringify(message)).not.toContain("regain access");
  });

  it("supports empty success responses without inventing text", async () => {
    const { runtime, model, context } = await setup((_req, res) => completion(res, ""));
    const { message } = await collect(runtime.streamSimple(model, context));
    expect(message.stopReason).toBe("stop");
    expect(message.content).toEqual([]);
  });

  it("preserves explicitly enabled generic image input in native conversion", async () => {
    const { runtime, model, requests } = await setup();
    const withImages = { ...model, input: ["text", "image"] as ("text" | "image")[] };
    const context = normalizeContext({
      messages: [
        {
          role: "user",
          timestamp: 1,
          content: [
            { type: "text", text: "Image fixture" },
            { type: "image", data: "aW1hZ2UtZml4dHVyZQ==", mimeType: "image/png" },
          ],
        },
      ],
    });
    const { message } = await collect(runtime.streamSimple(withImages, context));
    expect(message.stopReason).toBe("stop");
    expect(requests[0]?.payload.messages).toContainEqual(
      expect.objectContaining({
        role: "user",
        content: expect.arrayContaining([
          expect.objectContaining({
            type: "image_url",
            image_url: expect.objectContaining({
              url: "data:image/png;base64,aW1hZ2UtZml4dHVyZQ==",
            }),
          }),
        ]),
      }),
    );
  });

  it("reports cleanup failure safely while preserving completed content and usage", async () => {
    const { runtime, model, context, store, requests } = await setup();
    const { message } = await collect(
      runtime.streamSimple(model, context, {
        onResponse: () => {
          vi.spyOn(store, "transaction").mockRejectedValueOnce(new Error("NEVER_ECHO"));
        },
      }),
    );
    expect(message.stopReason).toBe("error");
    expect(message.errorMessage).toContain("cleanup failed");
    expect(message.errorMessage).not.toContain("NEVER_ECHO");
    expect(message.content).toContainEqual({ type: "text", text: "héllo 🌍" });
    expect(message.usage.totalTokens).toBe(15);
    expect(requests).toHaveLength(1);
    expect(store.state.leases).toHaveLength(1);
    await runtime.shutdown();
    expect(store.state.leases).toEqual([]);
    expect(store.state.groups[0]?.starts).toHaveLength(1);
  });

  it("fails a partial malformed stream once, retaining partial text and no replay", async () => {
    const { runtime, model, context, requests, store } = await setup((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      res.write(
        'data: {"id":"test","choices":[{"index":0,"delta":{"content":"partial"},"finish_reason":null}]}\n\n',
      );
      res.end("data: {invalid-json NEVER_ECHO}\n\n");
    });
    const { events, message } = await collect(runtime.streamSimple(model, context));
    expect(events.some((event) => event.type === "text_delta")).toBe(true);
    expect(message.stopReason).toBe("error");
    expect(message.content).toContainEqual({ type: "text", text: "partial" });
    expect(message.errorMessage).not.toContain("NEVER_ECHO");
    expect(requests).toHaveLength(1);
    expect(store.state.leases).toEqual([]);
  });

  it("aborts active body streaming and releases its reservation", async () => {
    const controller = new AbortController();
    const { runtime, model, context, store } = await setup((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      res.write(
        'data: {"choices":[{"index":0,"delta":{"content":"partial"},"finish_reason":null}]}\n\n',
      );
    });
    const stream = runtime.streamSimple(model, context, { signal: controller.signal });
    const events: AssistantMessageEvent[] = [];
    for await (const event of stream) {
      events.push(event);
      if (event.type === "text_delta") controller.abort();
    }
    expect((await stream.result()).stopReason).toBe("aborted");
    expect(events.filter((e) => e.type === "error")).toHaveLength(1);
    expect(store.state.leases).toEqual([]);
    expect(store.state.groups[0]?.starts).toHaveLength(1);
  });

  it("enforces a whole-stream timeout even after HTTP headers", async () => {
    const { runtime, model, context, config, store } = await setup((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      res.write(
        'data: {"choices":[{"index":0,"delta":{"content":"partial"},"finish_reason":null}]}\n\n',
      );
    });
    config.requestTimeoutMs = 100;
    const { message } = await collect(runtime.streamSimple(model, context));
    expect(message.stopReason).toBe("error");
    expect(message.errorMessage).toContain("timeout");
    expect(store.state.leases).toEqual([]);
  });

  it("shutdown cancels queued work, is idempotent and rejects future calls", async () => {
    const { runtime, model, context, config, requests, store } = await setup(undefined, 1, true);
    config.maxWaitMs = 10000;
    const router = runtime.router;
    const held = await router.acquire(new Set(["account-0"]));
    const pending = collect(runtime.streamSimple(model, context));
    await new Promise((resolve) => setTimeout(resolve, 25));
    await runtime.shutdown();
    await runtime.shutdown();
    expect((await pending).message.stopReason).toBe("aborted");
    expect((await collect(runtime.streamSimple(model, context))).message.stopReason).toBe(
      "aborted",
    );
    expect(requests).toEqual([]);
    expect(store.state.leases).toEqual([]);
    await router.release(held);
  });

  it("rejects duplicate key groups, unknown models and unmanaged API-key overrides before HTTP", async () => {
    const { runtime, model, context, requests, config } = await setup();
    const override = await collect(
      runtime.streamSimple(model, context, { apiKey: "synthetic-override" }),
    );
    expect(override.message.errorMessage).toContain("overrides");
    const unknown = await collect(
      runtime.streamSimple({ ...model, id: "paid-model" } as Model<"openai-completions">, context),
    );
    expect(unknown.message.errorMessage).toContain("Unsupported");
    config.accounts.forEach((a) => {
      a.credential = { env: "SAME_KEY" };
    });
    const duplicate = await collect(
      runtime.streamSimple(model, context, { env: { SAME_KEY: "synthetic-same" } }),
    );
    expect(duplicate.message.errorMessage).toContain("Duplicate");
    expect(requests).toEqual([]);
  });
});
