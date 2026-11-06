import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, it } from "vitest";

const exec = promisify(execFile);

const BASE_ARGS = ["-ne", "-ns", "-np", "-nc", "--no-mcp", "--offline", "--no-session"];

function run(args: string[], dir: string, timeout = 30000) {
  const child = exec("pi", args, {
    timeout,
    maxBuffer: 4 * 1024 * 1024,
    env: {
      ...process.env,
      PI_CODING_AGENT_DIR: dir,
      PI_ACCOUNT_ROUTER_CONFIG: "",
      PI_OFFLINE: "1",
      PI_SKIP_VERSION_CHECK: "1",
      PI_TELEMETRY: "0",
    },
  });
  child.child.stdin?.end();
  return child;
}

it("ordinary startup without --model routes through the router, never sending the placeholder", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pi-activation-"));
  const authorization: (string | undefined)[] = [];
  const server = createServer(async (req, res) => {
    authorization.push(req.headers.authorization);
    for await (const _chunk of req) void _chunk;
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    res.end(
      `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: "ACTIVATION_OK" }, finish_reason: "stop" }], usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 } })}\n\ndata: [DONE]\n\n`,
    );
  });
  try {
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    await writeFile(
      join(dir, "account-router.json"),
      JSON.stringify({
        version: 1,
        provider: {
          adapter: "openai-compatible",
          baseUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`,
          models: [{ id: "fixture", name: "Fixture", contextWindow: 32000, maxTokens: 4096 }],
        },
        accounts: [{ id: "one", quotaGroup: "shared", credential: { piProvider: "fixture" } }],
        quotaGroups: [
          { id: "shared", maxConcurrent: 1, limits: [{ requests: 10, windowMs: 60000 }] },
        ],
      }),
    );
    await writeFile(
      join(dir, "auth.json"),
      JSON.stringify({ fixture: { type: "api_key", key: "synthetic-activation" } }),
    );
    // Pi marks a native provider configured synchronously only when models.json declares it.
    await writeFile(
      join(dir, "models.json"),
      JSON.stringify({ providers: { "account-router": { apiKey: "managed-by-extension" } } }),
    );
    await writeFile(
      join(dir, "settings.json"),
      JSON.stringify({
        defaultProvider: "account-router",
        defaultModel: "fixture",
        retry: { enabled: false },
      }),
    );
    const { stdout } = await run(
      [
        ...BASE_ARGS,
        "-e",
        join(process.cwd(), "src/extension.ts"),
        "--no-tools",
        "--thinking",
        "off",
        "--mode",
        "json",
        "hi",
      ],
      dir,
    );
    const out = String(stdout);
    expect(out).toContain("ACTIVATION_OK");
    expect(out).not.toContain("No API key found");
    expect(out).not.toContain("managed-by-extension");
    expect(authorization).toEqual(["Bearer synthetic-activation"]);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
    await rm(dir, { recursive: true, force: true });
  }
}, 60000);

it("invalid explicit configuration fails closed and exposes no placeholder", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pi-activation-"));
  try {
    await writeFile(join(dir, "account-router.json"), "{ not json }");
    await writeFile(
      join(dir, "models.json"),
      JSON.stringify({ providers: { "account-router": { apiKey: "managed-by-extension" } } }),
    );
    const { stdout, stderr } = await run(
      [
        ...BASE_ARGS,
        "-e",
        join(process.cwd(), "src/extension.ts"),
        "--list-models",
        "account-router",
      ],
      dir,
    );
    const combined = String(stdout) + String(stderr);
    // Fails closed: no router models are offered and no placeholder leaks.
    expect(combined).not.toContain("managed-by-extension");
    expect(combined).toMatch(/No models available/i);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}, 60000);
