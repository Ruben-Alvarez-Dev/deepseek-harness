import { readFile } from "node:fs/promises";
import { type ExtensionAPI, getAgentDir } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { decodeState, statePath } from "../src/adapters/file-state-store.ts";
import { loadConfig } from "../src/config.ts";
import type { RequestObservation } from "./live-observation.ts";

/** Opt-in development observer, loaded explicitly by the live runner; not a package entrypoint. */
export default async function liveAccountProbe(pi: ExtensionAPI) {
  if (process.env.PI_ROUTER_LIVE !== "1") throw new Error("Live account observer requires opt-in.");
  const agentDir = getAgentDir();
  const config = await loadConfig(agentDir, process.env.PI_ACCOUNT_ROUTER_CONFIG);
  const path = statePath(agentDir, config);
  const toolMode = process.env.PI_ROUTER_LIVE_TOOL === "1";
  const requests: RequestObservation[] = [];
  let agentStarted = performance.now();
  let payloadStarted = 0;
  let payloads = 0;
  let toolExecutions = 0;
  let continuationHasToolResult = false;

  pi.on("before_agent_start", () => {
    agentStarted = performance.now();
  });
  pi.on("after_provider_response", (event) => {
    const current = requests.at(-1);
    if (current) {
      current.status = event.status;
      current.timing.headersMs = performance.now() - payloadStarted;
    }
  });
  pi.on("provider_stream_event", (event) => {
    const data = event.data as {
      choices?: {
        delta?: {
          content?: string;
          tool_calls?: { function?: { name?: string; arguments?: string } }[];
        };
      }[];
    } | null;
    const hasContent =
      Array.isArray(data?.choices) &&
      data.choices.some(
        ({ delta }) =>
          (typeof delta?.content === "string" && delta.content.length > 0) ||
          delta?.tool_calls?.some((call) => !!call.function?.name || !!call.function?.arguments),
      );
    const current = requests.at(-1);
    if (!current || !hasContent) return;
    const elapsed = performance.now() - payloadStarted;
    current.timing.firstContentMs ??= elapsed;
    current.timing.lastContentMs = elapsed;
    current.timing.contentEvents++;
  });
  pi.on("message_end", (event) => {
    if (event.message.role !== "assistant") return;
    const current = requests.at(-1);
    if (current) current.timing.completedMs = performance.now() - payloadStarted;
  });
  pi.on("before_provider_request", async (event) => {
    // The native payload hook runs after reservation, while its lease pins selection.
    // Pi's outer header hook can contain managed auth, not the selected account key.
    const state = decodeState(await readFile(path, "utf8"));
    const owned = state.leases.filter(
      (lease) =>
        lease.pid === process.pid &&
        config.accounts.some((a) => a.id === lease.accountId && a.quotaGroup === lease.groupId),
    );
    if (owned.length !== 1) throw new Error("Ambiguous live reservation; no request sent.");
    payloadStarted = performance.now();
    requests.push({
      accountId: owned[0]?.accountId ?? "unrecognized",
      timing: {
        contentEvents: 0,
        ...(payloads === 0 ? { agentPreparationMs: payloadStarted - agentStarted } : {}),
      },
    });
    const payload = event.payload as Record<string, unknown>;
    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    const toolFinished = messages.some(
      (message) =>
        message.role === "tool" && JSON.stringify(message.content).includes("AGNES_TOOL_OK"),
    );
    if (toolMode && toolFinished) continuationHasToolResult = true;
    payloads++;
    return {
      ...payload,
      max_tokens: process.env.PI_ROUTER_LIVE_BENCHMARK === "1" ? 256 : 128,
      ...(toolMode
        ? {
            tool_choice: toolFinished
              ? "none"
              : { type: "function", function: { name: "router_probe" } },
          }
        : {}),
    };
  });
  if (toolMode) {
    pi.registerTool({
      name: "router_probe",
      label: "Inert compatibility probe",
      description:
        "An inert verification probe returning AGNES_TOOL_OK. No network, filesystem or other side effects.",
      parameters: Type.Object({ value: Type.Literal("ok") }),
      async execute() {
        toolExecutions++;
        return { content: [{ type: "text", text: "AGNES_TOOL_OK" }], details: { inert: true } };
      },
    });
  }
  pi.on("agent_end", () => {
    pi.sendMessage(
      {
        customType: "account-router-live-observations",
        content: "Sanitized live compatibility observations",
        display: false,
        details: { requests, payloads, toolExecutions, continuationHasToolResult },
      },
      { triggerTurn: false },
    );
  });
}
