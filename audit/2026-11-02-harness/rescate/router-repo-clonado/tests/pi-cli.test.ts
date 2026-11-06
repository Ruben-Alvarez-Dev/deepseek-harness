import { execFile, spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type RequestListener } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { DefaultResourceLoader, SettingsManager } from "@earendil-works/pi-coding-agent";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LiveObservation } from "../scripts/live-observation.ts";

const exec = promisify(execFile);
const directories: string[] = [];
const closers: (() => Promise<void>)[] = [];
afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(closers.splice(0).map((close) => close()));
  await Promise.all(directories.splice(0).map((p) => rm(p, { recursive: true, force: true })));
});
async function agentDir() {
  const dir = await mkdtemp(join(tmpdir(), "pi-router-cli-test-"));
  directories.push(dir);
  await writeFile(
    join(dir, "auth.json"),
    JSON.stringify({ "agnes-ai": { type: "api_key", key: "synthetic-cli-key" } }),
    { mode: 0o600 },
  );
  await writeFile(
    join(dir, "settings.json"),
    JSON.stringify({ retry: { enabled: false }, enableInstallTelemetry: false }),
  );
  return dir;
}
async function fixtureEndpoint(handler: RequestListener) {
  const server = createServer(handler);
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  closers.push(
    () =>
      new Promise<void>((done) => {
        server.closeAllConnections();
        server.close(() => done());
      }),
  );
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
}

async function cli(dir: string, args: string[]) {
  const pending = exec(
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
      ...args,
    ],
    {
      cwd: process.cwd(),
      timeout: 30000,
      maxBuffer: 2 * 1024 * 1024,
      env: {
        ...process.env,
        PI_ACCOUNT_ROUTER_CONFIG: "",
        PI_CODING_AGENT_DIR: dir,
        PI_OFFLINE: "1",
        PI_SKIP_VERSION_CHECK: "1",
        PI_TELEMETRY: "0",
      },
    },
  );
  pending.child.stdin?.end();
  return pending;
}
function jsonLines(stdout: string): Record<string, unknown>[] {
  return stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe("actual Pi CLI extension compatibility", () => {
  it("loads through the standard extension loader and lists native router models without state/network", async () => {
    const dir = await agentDir();
    const { stdout, stderr } = await cli(dir, ["--list-models", "account-router"]);
    expect(stdout).toContain("account-router");
    expect(stdout).toContain("agnes-3.0-flash");
    expect(stderr).not.toMatch(/Failed to load|Extension.*error/i);
    await expect(access(join(dir, "account-router-state"))).rejects.toThrow();
  });

  it("loads as an ordinary directory Pi package", async () => {
    const dir = await agentDir();
    const { stdout, stderr } = await exec(
      "pi",
      ["-ne", "--offline", "-e", resolve("."), "--list-models", "account-router"],
      {
        timeout: 30000,
        env: {
          ...process.env,
          PI_ACCOUNT_ROUTER_CONFIG: "",
          PI_CODING_AGENT_DIR: dir,
          PI_OFFLINE: "1",
          PI_SKIP_VERSION_CHECK: "1",
          PI_TELEMETRY: "0",
        },
      },
    );
    expect(stdout).toContain("agnes-3.0-flash");
    expect(stderr).not.toMatch(/Failed to load|Extension.*error/i);
  });

  it("runs headless status through Pi protocol messages without contacting a model", async () => {
    const dir = await agentDir();
    const { stdout, stderr } = await cli(dir, [
      "--model",
      "account-router/agnes-3.0-flash",
      "--mode",
      "json",
      "/router-status",
    ]);
    const records = jsonLines(stdout);
    expect(records.length).toBeGreaterThan(0);
    expect(stdout).toContain("Account router");
    expect(stdout).not.toContain("synthetic-cli-key");
    expect(stderr).not.toMatch(/Failed to load|Extension.*error/i);
  });

  it("executes a real Pi tool loop and rotates credentials for its continuation", async () => {
    const dir = await agentDir();
    const fixturePath = join(dir, "fixture.txt");
    await writeFile(fixturePath, "TOOL_CONTEXT_OK");
    await writeFile(
      join(dir, "auth.json"),
      JSON.stringify({
        "agnes-ai": { type: "api_key", key: "synthetic-cli-key" },
        "agnes-other": { type: "api_key", key: "synthetic-cli-other" },
      }),
      { mode: 0o600 },
    );
    let requests = 0;
    const authorizations: (string | undefined)[] = [];
    let continuationContainsResult = false;
    const baseUrl = await fixtureEndpoint(async (req, res) => {
      let body = "";
      for await (const chunk of req) body += String(chunk);
      requests++;
      authorizations.push(req.headers.authorization);
      if (requests === 2) continuationContainsResult = body.includes("TOOL_CONTEXT_OK");
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      const delta =
        requests === 1
          ? {
              tool_calls: [
                {
                  index: 0,
                  id: "call_read",
                  type: "function",
                  function: { name: "read", arguments: JSON.stringify({ path: fixturePath }) },
                },
              ],
            }
          : { content: "PI_EXTENSION_OK" };
      const event = {
        id: "cli",
        model: "fixture",
        choices: [{ index: 0, delta, finish_reason: requests === 1 ? "tool_calls" : "stop" }],
        usage: { prompt_tokens: 12, completion_tokens: 3, total_tokens: 15 },
      };
      res.end(`data: ${JSON.stringify(event)}\n\ndata: [DONE]\n\n`);
    });
    const example = JSON.parse(await readFile("examples/openai-compatible.json", "utf8"));
    example.provider.baseUrl = baseUrl;
    example.accounts[0].credential = { piProvider: "agnes-ai" };
    example.accounts.push({
      id: "other",
      quotaGroup: "local-server",
      credential: { piProvider: "agnes-other" },
    });
    await writeFile(join(dir, "account-router.json"), JSON.stringify(example));
    const { stdout, stderr } = await cli(dir, [
      "--model",
      "account-router/local-model",
      "--thinking",
      "off",
      "--tools",
      "read",
      "--system-prompt",
      "Compatibility fixture. Only read the requested fixture file.",
      "--mode",
      "json",
      "Return PI_EXTENSION_OK",
    ]);
    expect(jsonLines(stdout).length).toBeGreaterThan(0);
    expect(stdout).toContain("PI_EXTENSION_OK");
    expect(stdout).not.toContain("synthetic-cli-key");
    expect(requests).toBe(2);
    expect(continuationContainsResult).toBe(true);
    expect(authorizations).toEqual(["Bearer synthetic-cli-key", "Bearer synthetic-cli-other"]);
    expect(stderr).not.toMatch(/Failed to load|Extension.*error/i);
  });

  it("does not execute or retain an incomplete tool call in a real Pi turn", async () => {
    const dir = await agentDir();
    let calls = 0;
    const baseUrl = await fixtureEndpoint(async (req, res) => {
      for await (const _chunk of req) {
        /* consume without logging */
      }
      calls++;
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
                  function: { name: "", arguments: '{"path":"/should-not-run"}' },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
      };
      res.end(`data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`);
    });
    const example = JSON.parse(await readFile("examples/openai-compatible.json", "utf8"));
    example.provider.baseUrl = baseUrl;
    example.accounts[0].credential = { piProvider: "agnes-ai" };
    await writeFile(join(dir, "account-router.json"), JSON.stringify(example));
    const result = await cli(dir, [
      "--model",
      "account-router/local-model",
      "--thinking",
      "off",
      "--tools",
      "read",
      "--mode",
      "json",
      "Fixture incomplete call",
    ]).catch((error: { stdout: string; stderr: string }) => error);
    const records = jsonLines(result.stdout);
    expect(calls).toBe(1);
    expect(records.filter((r) => r.type === "tool_execution_start")).toEqual([]);
    const endings = records.filter((r) => r.type === "message_end");
    const final = endings.at(-1)?.message as {
      content: unknown[];
      stopReason: string;
      errorMessage: string;
    };
    expect(final.stopReason).toBe("error");
    expect(final.content).toEqual([]);
    expect(final.errorMessage).toContain("incomplete tool call");
    expect(result.stdout).not.toContain("synthetic-cli-key");
  });

  it("reports status through the actual Pi RPC notification protocol without model dispatch", async () => {
    const dir = await agentDir();
    let requests = 0;
    const baseUrl = await fixtureEndpoint((_req, res) => {
      requests++;
      res.writeHead(500);
      res.end();
    });
    const example = JSON.parse(await readFile("examples/openai-compatible.json", "utf8"));
    example.provider.baseUrl = baseUrl;
    example.accounts[0].credential = { piProvider: "agnes-ai" };
    await writeFile(join(dir, "account-router.json"), JSON.stringify(example));
    const child = spawn(
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
        "--model",
        "account-router/local-model",
        "--mode",
        "rpc",
      ],
      {
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          PI_ACCOUNT_ROUTER_CONFIG: "",
          PI_CODING_AGENT_DIR: dir,
          PI_OFFLINE: "1",
          PI_SKIP_VERSION_CHECK: "1",
          PI_TELEMETRY: "0",
        },
      },
    );
    const records: Record<string, unknown>[] = [];
    let pending = "";
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    try {
      await new Promise<void>((done, reject) => {
        const timer = setTimeout(() => reject(new Error("RPC fixture timed out")), 10000);
        child.on("error", (error) => {
          clearTimeout(timer);
          reject(error);
        });
        child.stdout.on("data", (chunk) => {
          pending += String(chunk);
          let newline = pending.indexOf("\n");
          while (newline >= 0) {
            const line = pending.slice(0, newline);
            pending = pending.slice(newline + 1);
            try {
              if (line.trim()) records.push(JSON.parse(line) as Record<string, unknown>);
            } catch {
              clearTimeout(timer);
              reject(new Error("Non-JSON output in RPC fixture"));
            }
            newline = pending.indexOf("\n");
          }
          if (
            records.some((r) => r.type === "extension_ui_request" && r.method === "notify") &&
            records.some((r) => r.id === "status" && r.success === true)
          ) {
            clearTimeout(timer);
            done();
          }
        });
        child.stdin.write(
          `${JSON.stringify({ id: "status", type: "prompt", message: "/router-status" })}\n`,
        );
      });
      expect(records).toContainEqual(
        expect.objectContaining({
          type: "extension_ui_request",
          method: "notify",
          message: expect.stringContaining("Account router"),
        }),
      );
      expect(requests).toBe(0);
      expect(JSON.stringify(records)).not.toContain("synthetic-cli-key");
      expect(stderr).not.toMatch(/Failed to load|Extension.*error/i);
    } finally {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGTERM");
        await new Promise<void>((done) => child.once("close", () => done()));
      }
    }
  });

  it("validates the opt-in live observer and inert tool using real Pi with a local endpoint", async () => {
    vi.stubEnv("PI_ROUTER_LIVE", "1");
    vi.stubEnv("PI_ROUTER_LIVE_TOOL", "1");
    const dir = await agentDir();
    let calls = 0;
    const baseUrl = await fixtureEndpoint(async (req, res) => {
      for await (const _chunk of req) {
        /* no payload/header logging */
      }
      calls++;
      const delta =
        calls === 1
          ? {
              tool_calls: [
                {
                  index: 0,
                  id: "call_probe",
                  type: "function",
                  function: { name: "router_probe", arguments: JSON.stringify({ value: "ok" }) },
                },
              ],
            }
          : { content: "ROUTER_TOOL_OK" };
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      res.end(
        `data: ${JSON.stringify({ choices: [{ index: 0, delta, finish_reason: calls === 1 ? "tool_calls" : "stop" }] })}\n\ndata: [DONE]\n\n`,
      );
    });
    const example = JSON.parse(await readFile("examples/openai-compatible.json", "utf8"));
    example.provider.baseUrl = baseUrl;
    example.accounts[0].credential = { piProvider: "agnes-ai" };
    await writeFile(join(dir, "account-router.json"), JSON.stringify(example));
    const { stdout } = await cli(dir, [
      "-e",
      resolve("scripts/live-account-probe.extension.ts"),
      "--model",
      "account-router/local-model",
      "--tools",
      "router_probe",
      "--thinking",
      "off",
      "--system-prompt",
      "Inert probe.",
      "--mode",
      "json",
      "Call router_probe then return ROUTER_TOOL_OK",
    ]);
    const messages = jsonLines(stdout).map((r) => r.message as Record<string, unknown> | undefined);
    const observed = messages.findLast((m) => m?.customType === "account-router-live-observations");
    expect(observed?.details).toMatchObject({
      requests: [
        { accountId: "local", status: 200 },
        { accountId: "local", status: 200 },
      ],
      payloads: 2,
      toolExecutions: 1,
      continuationHasToolResult: true,
    });
    if (!observed) throw new Error("Missing live observer fixture output");
    const timing = (observed.details as LiveObservation).requests.map((r) => r.timing);
    for (const item of timing) {
      expect(item.headersMs).toBeGreaterThanOrEqual(0);
      expect(item.firstContentMs).toBeGreaterThanOrEqual(item.headersMs ?? 0);
      expect(item.completedMs).toBeGreaterThanOrEqual(item.firstContentMs ?? 0);
      expect(item.contentEvents).toBeGreaterThan(0);
    }
    expect(timing[0]?.agentPreparationMs).toBeGreaterThanOrEqual(0);
    expect(timing[1]?.agentPreparationMs).toBeUndefined();
    expect(calls).toBe(2);
    expect(stdout).not.toContain("synthetic-cli-key");
  });

  it("rejects bad explicit configuration safely in the real loader", async () => {
    const dir = await agentDir();
    const path = join(dir, "bad.json");
    await writeFile(path, JSON.stringify({ apiKey: "NEVER_ECHO" }));
    vi.stubEnv("PI_ACCOUNT_ROUTER_CONFIG", path);
    vi.stubEnv("PI_CODING_AGENT_DIR", dir);
    const loader = new DefaultResourceLoader({
      cwd: process.cwd(),
      agentDir: dir,
      settingsManager: SettingsManager.inMemory(),
      noExtensions: true,
      additionalExtensionPaths: [resolve("src/extension.ts")],
    });
    await loader.reload();
    const errors = loader.getExtensions().errors;
    expect(errors).toHaveLength(1);
    expect(errors[0]?.error).toContain("Invalid account-router configuration");
    expect(errors[0]?.error).not.toContain("NEVER_ECHO");
  });
});
