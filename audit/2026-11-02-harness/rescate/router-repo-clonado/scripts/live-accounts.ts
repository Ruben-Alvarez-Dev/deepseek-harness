import { execFile } from "node:child_process";
import { readFile, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { statePath } from "../src/adapters/file-state-store.ts";
import { loadConfig } from "../src/config.ts";
import type { LiveObservation } from "./live-observation.ts";

type Result = LiveObservation & {
  cliWallMs: number;
  stopReason?: string;
  mode: "text" | "tool";
  success: boolean;
  usage: { input?: number; output?: number; totalTokens?: number }[];
};
const exec = promisify(execFile);

async function main() {
  if (process.env.PI_ROUTER_LIVE !== "1")
    throw new Error("Live account verification requires PI_ROUTER_LIVE=1; no requests made.");
  const agentDir = getAgentDir();
  const config = await loadConfig(agentDir, process.env.PI_ACCOUNT_ROUTER_CONFIG);
  if (
    config.provider.adapter !== "agnes" ||
    config.accounts.length !== 4 ||
    config.accounts.some((a) => !a.enabled || a.quotaGroup !== `${a.id}-pool`)
  )
    throw new Error("Expected the enrolled four-account profile with one measured pool per key.");
  if (
    config.quotaGroups.length !== config.accounts.length ||
    config.quotaGroups.some(
      (g) =>
        g.maxConcurrent !== 1 ||
        g.limits.length !== 1 ||
        g.limits[0]?.requests !== 10 ||
        g.limits[0]?.windowMs !== 60000,
    )
  )
    throw new Error("Live verification refuses to override the measured per-key 10 RPM limit.");
  const state = JSON.parse(await readFile(statePath(agentDir, config), "utf8")) as {
    lastAccountId: string | null;
    disabledAccountIds: string[];
  };
  if (state.disabledAccountIds.some((id) => config.accounts.some((a) => a.id === id)))
    throw new Error("A configured account is auth-disabled; no automatic recovery or replay.");
  const benchmark =
    process.argv.includes("--benchmark") || process.env.PI_ROUTER_LIVE_BENCHMARK === "1";
  const sequence = Array.from({ length: 48 }, (_, i) => String(i + 1)).join(" ");
  const cursor = config.accounts.findIndex((a) => a.id === state.lastAccountId);
  const expected = Array.from(
    { length: benchmark ? 4 : 6 },
    (_, i) => config.accounts[(cursor + i + 1) % config.accounts.length]?.id,
  );
  const results: Result[] = [];
  let previousStart = 0;
  for (let i = 0; i < (benchmark ? 4 : 5); i++) {
    const wait = Math.max(0, previousStart + 7000 - Date.now());
    if (wait) await new Promise<void>((done) => setTimeout(done, wait));
    previousStart = Date.now();
    const mode = i === 4 ? "tool" : "text";
    const cliStarted = performance.now();
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
        "--model",
        "account-router/agnes-3.0-flash",
        "--thinking",
        "off",
        ...(mode === "tool" ? ["--tools", "router_probe"] : ["--no-tools"]),
        "--system-prompt",
        "You are an inert API compatibility probe. Follow the short verification instruction exactly.",
        "--mode",
        "json",
        mode === "tool"
          ? "Call router_probe once with value ok. After receiving AGNES_TOOL_OK, respond only ROUTER_TOOL_OK."
          : benchmark
            ? "Output only integers 1 through 48 inclusive, in ascending order, separated by single spaces. No explanation, punctuation or formatting."
            : "Respond with only ROUTER_OK.",
      ],
      {
        timeout: 180000,
        maxBuffer: 2 * 1024 * 1024,
        env: {
          ...process.env,
          PI_ROUTER_LIVE_TOOL: mode === "tool" ? "1" : "0",
          PI_ROUTER_LIVE_BENCHMARK: benchmark ? "1" : "0",
          PI_OFFLINE: "1",
          PI_SKIP_VERSION_CHECK: "1",
          PI_TELEMETRY: "0",
        },
      },
    );
    child.child.stdin?.end();
    const { stdout } = await child;
    const cliWallMs = performance.now() - cliStarted;
    const records = stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    const messages = records
      .map((r) => r.message)
      .filter((m): m is Record<string, unknown> => !!m && typeof m === "object");
    const observation = messages.findLast(
      (m) => m.customType === "account-router-live-observations",
    )?.details as LiveObservation | undefined;
    const assistants = messages.filter((m) => m.role === "assistant");
    // message_end prevents counting message_start twice.
    const ended = records
      .filter((r) => r.type === "message_end")
      .map((r) => r.message as Record<string, unknown>)
      .filter((m) => m.role === "assistant");
    const final = ended.at(-1) ?? assistants.at(-1);
    const marker = mode === "tool" ? "ROUTER_TOOL_OK" : "ROUTER_OK";
    const content = Array.isArray(final?.content) ? final.content : [];
    const success =
      final?.stopReason === "stop" &&
      content.some(
        (b) =>
          b.type === "text" &&
          typeof b.text === "string" &&
          (benchmark
            ? b.text.trim().split(/\s+/).join(" ") === sequence
            : b.text.trim() === marker),
      );
    if (!observation)
      throw new Error("Native CLI did not expose safe observer evidence; no replay.");
    const usage = ended.map((m) => {
      const u = m.usage as Record<string, unknown> | undefined;
      const number = (key: string) =>
        typeof u?.[key] === "number" && Number.isFinite(u[key]) ? (u[key] as number) : undefined;
      return {
        input: number("input"),
        output: number("output"),
        totalTokens: number("totalTokens"),
      };
    });
    results.push({
      ...observation,
      cliWallMs,
      stopReason: typeof final?.stopReason === "string" ? final.stopReason : undefined,
      mode,
      success,
      usage,
    });
    process.stdout.write(`${JSON.stringify(results.at(-1))}\n`);
    const seen = results.flatMap((r) => r.requests);
    if (
      !success ||
      observation.requests.some((r) => r.status !== 200) ||
      seen.some((r, index) => r.accountId !== expected[index]) ||
      observation.requests.length !== (mode === "tool" ? 2 : 1) ||
      (mode === "tool" &&
        (observation.toolExecutions !== 1 || !observation.continuationHasToolResult))
    )
      throw new Error(
        "Live verification failed; stopped without replay or another credential bypass.",
      );
  }
  const report = {
    verifiedAt: new Date().toISOString(),
    benchmark,
    model: "agnes-3.0-flash",
    independentQuotasVerified: false,
    sharedAggregateRPM: null,
    perKeyRpm: 10,
    distinctAccountsObserved: new Set(
      results.flatMap((r) => r.requests.map((request) => request.accountId)),
    ).size,
    results,
  };
  const path = join(
    agentDir,
    benchmark ? "account-router-performance.json" : "account-router-accounts-verification.json",
  );
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600, flag: "wx" });
  await rename(temporary, path);
  process.stdout.write(
    `${JSON.stringify({ success: true, distinctAccountsObserved: report.distinctAccountsObserved, inferenceRequests: results.flatMap((r) => r.requests).length, evidencePath: path })}\n`,
  );
}
main().catch(() => {
  // execFile errors retain raw child output; never inspect or dump them here.
  process.stderr.write(
    "Live account verification stopped. No raw provider/credential/child diagnostics printed.\n",
  );
  process.exitCode = 1;
});
