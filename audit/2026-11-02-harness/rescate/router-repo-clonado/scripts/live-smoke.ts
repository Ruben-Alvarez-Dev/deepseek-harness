import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";

if (process.env.PI_ROUTER_LIVE !== "1") {
  process.stderr.write("Live smoke is opt-in: set PI_ROUTER_LIVE=1. No request was made.\n");
  process.exitCode = 1;
} else {
  try {
    const pending = promisify(execFile)(
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
        resolve("src/extension.ts"),
        "--model",
        "account-router/agnes-3.0-flash",
        "--thinking",
        "off",
        "--system-prompt",
        "You are an inert API compatibility probe. Never call tools.",
        "--mode",
        "json",
        "Respond with only ROUTER_OK.",
      ],
      {
        timeout: 180000,
        maxBuffer: 2 * 1024 * 1024,
        env: { ...process.env, PI_OFFLINE: "1", PI_SKIP_VERSION_CHECK: "1", PI_TELEMETRY: "0" },
      },
    );
    pending.child.stdin?.end();
    const { stdout } = await pending;
    const records = stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    const message = records
      .map((record) => (record.type === "message_end" ? record.message : undefined))
      .filter(
        (value): value is Record<string, unknown> =>
          !!value &&
          typeof value === "object" &&
          (value as Record<string, unknown>).role === "assistant",
      )
      .at(-1);
    if (message?.stopReason !== "stop") throw new Error("Live smoke did not finish successfully");
    const content = Array.isArray(message.content) ? message.content : [];
    const matched = content.some(
      (block) =>
        block.type === "text" && typeof block.text === "string" && block.text.includes("ROUTER_OK"),
    );
    if (!matched) throw new Error("Unexpected smoke output");
    const usage = message.usage as Record<string, unknown> | undefined;
    const tokenCount = (name: string) =>
      typeof usage?.[name] === "number" && Number.isFinite(usage[name]) ? usage[name] : undefined;
    process.stdout.write(
      `${JSON.stringify(
        {
          success: true,
          provider: message.provider,
          model: message.model,
          stopReason: message.stopReason,
          markerMatched: matched,
          usage: {
            input: tokenCount("input"),
            output: tokenCount("output"),
            totalTokens: tokenCount("totalTokens"),
          },
          note: "Real Pi extension call; no tools executed, no credentials printed, no global settings modified.",
        },
        null,
        2,
      )}\n`,
    );
  } catch {
    // Do not dump execFile errors: those contain captured child output and can expose unrelated data.
    process.stderr.write(
      "Live Pi router smoke failed; no raw provider/child output was printed.\n",
    );
    process.exitCode = 1;
  }
}
