import { execFile } from "node:child_process";
import { access, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { expect, it } from "vitest";

const exec = promisify(execFile);

it("ships a standard source package and dispatches with host peers absent from its node_modules", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pi-router-pack-test-"));
  const server = createServer(async (req, res) => {
    for await (const _chunk of req) {
      /* native request is intentionally not logged */
    }
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    res.end(
      'data: {"choices":[{"index":0,"delta":{"content":"PI_PACKED_OK"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
    );
  });
  try {
    const { stdout } = await exec("npm", [
      "pack",
      "--ignore-scripts",
      "--json",
      "--pack-destination",
      dir,
    ]);
    const packed = JSON.parse(stdout)[0];
    const files = packed.files.map((file: { path: string }) => file.path) as string[];
    expect(files).toContain("src/extension.ts");
    expect(
      files.some((file) => /auth\.json|\.env$|node_modules|account-router-state|\.pi\//.test(file)),
    ).toBe(false);
    await exec("tar", ["-xzf", join(dir, packed.filename), "-C", dir]);
    const root = join(dir, "package");
    const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
    expect(pkg.pi.extensions).toEqual(["./src/extension.ts"]);
    expect(pkg.dependencies["@earendil-works/pi-ai"]).toBeUndefined();
    // Reproduce Pi's dependency installation without network or installing host peers.
    const require = createRequire(import.meta.url);
    const runtimeRequire = createRequire(require.resolve("proper-lockfile"));
    await mkdir(join(root, "node_modules"));
    for (const dependency of ["proper-lockfile", "graceful-fs", "retry", "signal-exit", "zod"]) {
      const source = dirname(runtimeRequire.resolve(`${dependency}/package.json`));
      await cp(source, join(root, "node_modules", dependency), { recursive: true });
    }
    await expect(access(join(root, "node_modules", "@earendil-works", "pi-ai"))).rejects.toThrow();
    const agentDir = join(dir, "agent");
    await mkdir(agentDir);
    await writeFile(
      join(agentDir, "auth.json"),
      JSON.stringify({ fixture: { type: "api_key", key: "synthetic-production-key" } }),
    );
    await writeFile(join(agentDir, "settings.json"), JSON.stringify({ retry: { enabled: false } }));
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    await writeFile(
      join(agentDir, "account-router.json"),
      JSON.stringify({
        version: 1,
        provider: {
          adapter: "openai-compatible",
          baseUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`,
          models: [{ id: "fixture", name: "Fixture", contextWindow: 32000, maxTokens: 4096 }],
        },
        accounts: [{ id: "fixture", quotaGroup: "fixture", credential: { piProvider: "fixture" } }],
        quotaGroups: [{ id: "fixture", limits: [{ requests: 10, windowMs: 60000 }] }],
      }),
    );
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
        "--no-tools",
        "-e",
        root,
        "--model",
        "account-router/fixture",
        "--thinking",
        "off",
        "--system-prompt",
        "Compatibility probe.",
        "--mode",
        "json",
        "Return PI_PACKED_OK",
      ],
      {
        cwd: root,
        timeout: 30000,
        env: {
          ...process.env,
          NODE_PATH: "",
          PI_ACCOUNT_ROUTER_CONFIG: "",
          PI_CODING_AGENT_DIR: agentDir,
          PI_OFFLINE: "1",
          PI_SKIP_VERSION_CHECK: "1",
          PI_TELEMETRY: "0",
        },
      },
    );
    child.child.stdin?.end();
    const result = await child;
    const records = result.stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(
      records.some(
        (record) =>
          record.type === "message_end" && JSON.stringify(record.message).includes("PI_PACKED_OK"),
      ),
    ).toBe(true);
    expect(result.stdout).not.toContain("synthetic-production-key");
    expect(result.stderr).not.toMatch(/Failed to load|Cannot find module|Extension.*error/i);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
    await rm(dir, { recursive: true, force: true });
  }
}, 45000);
