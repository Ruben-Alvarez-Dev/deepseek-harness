import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { expect, it, vi } from "vitest";
import type { LiveObservation } from "../scripts/live-observation.ts";
import { decodeState, statePath } from "../src/adapters/file-state-store.ts";
import { parseConfig } from "../src/config.ts";
import type { RouterConfig } from "../src/domain/types.ts";

const exec = promisify(execFile);
type Child = ReturnType<typeof exec>;
type Attempt = { session: string; status: number };

const WINDOW_MS = 600;

function config(baseUrl: string): RouterConfig {
  return parseConfig({
    version: 1,
    provider: {
      adapter: "openai-compatible",
      baseUrl,
      models: [{ id: "fixture", name: "Fixture", contextWindow: 32000, maxTokens: 4096 }],
    },
    accounts: [{ id: "one", quotaGroup: "shared", credential: { piProvider: "fixture" } }],
    quotaGroups: [
      { id: "shared", maxConcurrent: 1, limits: [{ requests: 1, windowMs: WINDOW_MS }] },
    ],
  });
}

function payload(body: string) {
  const parsed = JSON.parse(body) as {
    messages: { role: string; content: unknown }[];
    tool_choice: unknown;
  };
  const user = parsed.messages.find((m) => m.role === "user");
  return {
    session: JSON.stringify(user?.content).includes("SESSION_A") ? "A" : "B",
    complete: parsed.messages.some(
      (m) => m.role === "tool" && JSON.stringify(m.content).includes("AGNES_TOOL_OK"),
    ),
    toolChoice: JSON.stringify(parsed.tool_choice),
  };
}

function completion(session: string, complete: boolean) {
  const delta = complete
    ? { content: `SESSION_${session}_DONE` }
    : {
        tool_calls: [
          {
            index: 0,
            id: `probe_${session}`,
            type: "function",
            function: { name: "router_probe", arguments: '{"value":"ok"}' },
          },
        ],
      };
  return `data: ${JSON.stringify({ choices: [{ index: 0, delta, finish_reason: complete ? "stop" : "tool_calls" }], usage: { prompt_tokens: 12, completion_tokens: 3, total_tokens: 15 } })}\n\ndata: [DONE]\n\n`;
}

async function prepare(dir: string, router: RouterConfig) {
  await writeFile(join(dir, "account-router.json"), JSON.stringify(router));
  await writeFile(
    join(dir, "auth.json"),
    JSON.stringify({ fixture: { type: "api_key", key: "synthetic-continuity" } }),
  );
  await writeFile(
    join(dir, "settings.json"),
    JSON.stringify({
      defaultProvider: "account-router",
      defaultModel: "fixture",
      retry: { enabled: false },
    }),
  );
  // Required for reliable startup selection: Pi marks a native provider configured synchronously
  // only when models.json declares it; the extension still supplies the real credential per request.
  await writeFile(
    join(dir, "models.json"),
    JSON.stringify({ providers: { "account-router": { apiKey: "managed-by-extension" } } }),
  );
  return statePath(dir, router);
}

function start(session: string, dir: string): Child {
  const child = exec(
    "pi",
    [
      "-ne",
      "-ns",
      "-np",
      "-nc",
      "--no-mcp",
      "--offline",
      "--no-session",
      "-e",
      resolve("src/extension.ts"),
      "-e",
      resolve("scripts/live-account-probe.extension.ts"),
      "--tools",
      "router_probe",
      "--thinking",
      "off",
      "--system-prompt",
      "Inert continuity test.",
      "--mode",
      "json",
      `SESSION_${session}: call router_probe once with value ok, then return SESSION_${session}_DONE.`,
    ],
    {
      timeout: 30000,
      maxBuffer: 2 * 1024 * 1024,
      env: {
        ...process.env,
        PI_CODING_AGENT_DIR: dir,
        PI_ACCOUNT_ROUTER_CONFIG: "",
        PI_ROUTER_LIVE: "1",
        PI_ROUTER_LIVE_TOOL: "1",
        PI_ROUTER_LIVE_BENCHMARK: "0",
        PI_OFFLINE: "1",
        PI_SKIP_VERSION_CHECK: "1",
        PI_TELEMETRY: "0",
      },
    },
  );
  child.child.stdin?.end();
  return child;
}

function messagesOf(stdout: unknown): Record<string, unknown>[] {
  return String(stdout)
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>)
    .filter((event) => event.type === "message_end")
    .map((event) => event.message as Record<string, unknown>);
}

function expectCompletedRun(stdout: unknown, session: string): LiveObservation {
  const messages = messagesOf(stdout);
  const assistants = messages.filter((m) => m.role === "assistant");
  expect(assistants.map((m) => m.stopReason)).toEqual(["toolUse", "stop"]);
  expect(assistants.every((m) => m.provider === "account-router")).toBe(true);
  expect(JSON.stringify(assistants.at(-1)?.content)).toContain(`SESSION_${session}_DONE`);
  const observation = messages.findLast((m) => m.customType === "account-router-live-observations")
    ?.details as LiveObservation;
  expect(observation.toolExecutions).toBe(1);
  expect(observation.continuationHasToolResult).toBe(true);
  expect(observation.requests.at(-1)?.status).toBe(200);
  expect(
    observation.requests.filter((r) => r.status === 200).every((r) => r.timing.contentEvents > 0),
  ).toBe(true);
  expect(String(stdout)).not.toContain("synthetic-continuity");
  return observation;
}

it("two native Pi processes both finish across quota rollovers and a pre-output 429", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pi-continuity-"));
  const attempts: Attempt[] = [];
  const reservations: number[] = [];
  const errors: string[] = [];
  const server = createServer(async (req, res) => {
    try {
      let body = "";
      for await (const chunk of req) body += String(chunk);
      if (req.headers.authorization !== "Bearer synthetic-continuity")
        throw new Error("Wrong fixture credential");
      const { session, complete, toolChoice } = payload(body);
      const state = decodeState(await readFile(ledger, "utf8"));
      if (state.leases.length !== 1) throw new Error("Concurrency overcommit");
      const reservedAt = state.groups[0]?.starts.at(-1);
      if (reservedAt === undefined) throw new Error("Missing reservation");
      reservations.push(reservedAt);
      if (!complete && toolChoice.includes("none"))
        throw new Error("Rejected attempt changed the tool instruction");
      if (attempts.length === 0) {
        attempts.push({ session, status: 429 });
        res.writeHead(429, { "Content-Type": "application/json", "Retry-After": "0.2" });
        res.end('{"error":{"message":"controlled temporary rate limit"}}');
        return;
      }
      attempts.push({ session, status: 200 });
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      res.end(completion(session, complete));
    } catch {
      errors.push("Fixture invariant failed");
      res.writeHead(500);
      res.end();
    }
  });
  let ledger = "";
  const children: Child[] = [];
  try {
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    const router = config(`http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`);
    ledger = await prepare(dir, router);
    const first = start("A", dir);
    children.push(first);
    // Two live sessions share the profile, as two open Pi instances do.
    await vi.waitFor(() => expect(attempts.length).toBeGreaterThanOrEqual(1), {
      interval: 25,
      timeout: 15000,
    });
    children.push(start("B", dir));
    const settled = await Promise.allSettled(children);
    expect(settled.map((r) => r.status)).toEqual(["fulfilled", "fulfilled"]);
    const observations = [
      expectCompletedRun(
        (settled[0] as PromiseFulfilledResult<{ stdout: unknown }>).value.stdout,
        "A",
      ),
      expectCompletedRun(
        (settled[1] as PromiseFulfilledResult<{ stdout: unknown }>).value.stdout,
        "B",
      ),
    ];
    // A rejected attempt produces no exposed content and no response hook in Pi's native adapter.
    expect(observations.map((o) => o.requests.length).sort()).toEqual([2, 3]);
    const retried = observations.find((o) => o.requests.length === 3);
    expect(retried?.requests[0]?.timing.contentEvents).toBe(0);
    expect(retried?.requests[0]?.status).toBeUndefined();
    expect(retried?.requests.slice(1).every((r) => r.status === 200)).toBe(true);
    expect(errors).toEqual([]);
    expect(attempts).toHaveLength(5);
    expect(attempts.filter((a) => a.status === 429)).toHaveLength(1);
    expect(
      attempts
        .filter((a) => a.status === 200)
        .map((a) => a.session)
        .sort(),
    ).toEqual(["A", "A", "B", "B"]);
    for (let i = 1; i < reservations.length; i++)
      expect((reservations[i] ?? 0) - (reservations[i - 1] ?? 0)).toBeGreaterThanOrEqual(WINDOW_MS);
    const final = decodeState(await readFile(ledger, "utf8"));
    expect(final.waiters).toEqual([]);
    expect(final.leases).toEqual([]);
  } finally {
    for (const child of children) child.child.kill();
    await Promise.allSettled(children);
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
    await rm(dir, { recursive: true, force: true });
  }
}, 60000);

it("killing a waiting native process leaves its peer's task intact", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pi-cancel-"));
  const attempts: Attempt[] = [];
  const errors: string[] = [];
  let release = () => {};
  const held = new Promise<void>((done) => {
    release = done;
  });
  const server = createServer(async (req, res) => {
    try {
      let body = "";
      for await (const chunk of req) body += String(chunk);
      if (req.headers.authorization !== "Bearer synthetic-continuity")
        throw new Error("Wrong fixture credential");
      const { session, complete } = payload(body);
      const state = decodeState(await readFile(ledger, "utf8"));
      if (state.leases.length !== 1) throw new Error("Concurrency overcommit");
      attempts.push({ session, status: 200 });
      if (session === "A" && !complete) await held;
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      res.end(completion(session, complete));
    } catch {
      errors.push("Fixture invariant failed");
      res.writeHead(500);
      res.end();
    }
  });
  let ledger = "";
  const children: Child[] = [];
  try {
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    const router = config(`http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`);
    ledger = await prepare(dir, router);
    const first = start("A", dir);
    children.push(first);
    await vi.waitFor(() => expect(attempts).toHaveLength(1), { interval: 25, timeout: 10000 });
    const peer = start("B", dir);
    children.push(peer);
    await vi.waitFor(
      async () =>
        expect(decodeState(await readFile(ledger, "utf8")).waiters.map((t) => t.pid)).toEqual([
          peer.child.pid,
        ]),
      { interval: 25, timeout: 10000 },
    );
    const leaseBefore = decodeState(await readFile(ledger, "utf8")).leases;
    peer.child.kill();
    await Promise.allSettled([peer]);
    release();
    const settled = await Promise.allSettled(children);
    expect(settled.map((r) => r.status)).toEqual(["fulfilled", "rejected"]);
    expect(attempts.map((a) => a.session)).toEqual(["A", "A"]);
    expect(leaseBefore.map((l) => l.accountId)).toEqual(["one"]);
    expectCompletedRun(
      (settled[0] as PromiseFulfilledResult<{ stdout: unknown }>).value.stdout,
      "A",
    );
    expect(errors).toEqual([]);
    const final = decodeState(await readFile(ledger, "utf8"));
    expect(final.waiters).toEqual([]);
    expect(final.leases).toEqual([]);
  } finally {
    release();
    for (const child of children) child.child.kill();
    await Promise.allSettled(children);
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
    await rm(dir, { recursive: true, force: true });
  }
}, 60000);
