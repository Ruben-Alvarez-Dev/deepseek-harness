import { dirname } from "node:path";
import { createProvider, type Provider, type ProviderStreams } from "@earendil-works/pi-ai";
import {
  type ExtensionAPI,
  type ExtensionContext,
  getAgentDir,
} from "@earendil-works/pi-coding-agent";
import { PiCredentialResolver, resolveAccounts } from "./adapters/credentials.ts";
import { makeEpisodeCapture } from "./adapters/episode-capture.ts";
import { buildRetrievalSection } from "./adapters/episode-retriever.ts";
import { createEpisodeStore, episodeStatePath } from "./adapters/episode-store.ts";
import { FileStateStore, statePath } from "./adapters/file-state-store.ts";
import { type Unwatch, watchDirectoryEvents } from "./adapters/file-watcher.ts";
import { footerLabel } from "./adapters/footer-label.ts";
import { sanitizeTranscript } from "./adapters/message-safety.ts";
import { PROVIDER_ID, routerModels } from "./adapters/models.ts";
import { MANAGED_AUTH, RoutedStreams } from "./adapters/routed-streams.ts";
import { systemClock } from "./adapters/system-clock.ts";
import { AccountRouter } from "./application/router.ts";
import { loadConfig, parseConfig } from "./config.ts";
import { type RouterConfig, RouterError } from "./domain/types.ts";
import type {
  Clock,
  CredentialEnvironment,
  CredentialResolver,
  EpisodeStorePort,
  ExtensionBus,
  StateStore,
} from "./ports.ts";

type PiRegistration = Pick<
  ExtensionAPI,
  "registerProvider" | "registerCommand" | "on" | "sendMessage"
>;

/** Injection points for SDK hosts/tests; the default export follows ordinary Pi discovery. */
export interface ExtensionOptions {
  agentDir?: string;
  configPath?: string;
  config?: RouterConfig;
  credentials?: CredentialResolver;
  store?: StateStore;
  clock?: Clock;
  transport?: ProviderStreams;
  /** Directory watcher used to react to sibling-process state writes (tests inject a fake). */
  watchDirectory?: (directory: string, onData: () => void) => Unwatch;
  /** Pre-built episode store (tests inject a fake, or the harness injects its own memory piece). */
  episodeStore?: EpisodeStorePort;
  /** Optional extension bus (Pi `pi.events`). When provided, router events are shared with other pieces. */
  bus?: ExtensionBus;
  /** Whether episodic memory reuse is enabled for this run. */
  episodeMemoryEnabled?: boolean;
}

export async function registerAccountRouter(
  pi: PiRegistration,
  options: ExtensionOptions = {},
): Promise<Provider<"openai-completions">> {
  const agentDir = options.agentDir ?? getAgentDir();
  const config = options.config
    ? parseConfig(options.config)
    : await loadConfig(agentDir, options.configPath ?? process.env.PI_ACCOUNT_ROUTER_CONFIG);
  const credentials = options.credentials ?? new PiCredentialResolver(agentDir);
  const clock = options.clock ?? systemClock;
  const store = options.store ?? new FileStateStore(statePath(agentDir, config), clock);
  const episodeStore =
    options.episodeStore ?? createEpisodeStore(episodeStatePath(agentDir), clock);
  const bus = options.bus;
  let episodeMemoryEnabled = options.episodeMemoryEnabled ?? false;
  const makeRuntime = () =>
    new RoutedStreams(
      new AccountRouter(config, store, clock),
      credentials,
      options.transport,
      episodeStore,
      bus,
    );
  let runtime = makeRuntime();
  const models = routerModels(config);
  let footerCtx: ExtensionContext | undefined;
  let lastLabel: string | undefined;
  let refreshing = false;
  let refreshAgain = false;
  let boundary: ReturnType<typeof setTimeout> | undefined;
  let detachFooter: Unwatch[] = [];
  const available = async (env?: CredentialEnvironment, signal?: AbortSignal) =>
    new Set((await resolveAccounts(config.accounts, credentials, env, signal)).keys());
  const provider = createProvider<"openai-completions">({
    id: PROVIDER_ID,
    name: "Account Router",
    baseUrl: config.provider.baseUrl,
    models,
    auth: {
      apiKey: {
        name: "Configured account credential references",
        async check({ ctx, signal }) {
          // Isolate lookup failures from Pi's availability pass. Returning undefined reports unavailable;
          // synchronous startup configuration is provided separately through models.json.
          try {
            return (await available((name) => ctx.env(name), signal)).size
              ? { source: "Account pool", type: "api_key" }
              : undefined;
          } catch {
            return undefined;
          }
        },
        async resolve({ ctx, signal }) {
          return (await available((name) => ctx.env(name), signal)).size
            ? { source: "Account pool", auth: { apiKey: MANAGED_AUTH } }
            : undefined;
        },
      },
    },
    api: {
      stream: (model, context, opts) => runtime.stream(model, context, opts),
      streamSimple: (model, context, opts) => runtime.streamSimple(model, context, opts),
    },
  });
  pi.registerProvider(provider);
  // Switching providers must not replay malformed calls from an older session.
  // Transform only the request projection; never rewrite the user's JSONL history.
  pi.on("context", (event) => ({ messages: sanitizeTranscript(event.messages) }));

  const notify = (ctx: ExtensionContext, text: string, error = false) => {
    if (ctx.hasUI) ctx.ui.notify(text, error ? "error" : "info");
    else
      pi.sendMessage(
        { customType: "account-router-status", content: text, display: true, details: { error } },
        { triggerTurn: false },
      );
  };
  const guarded = async (ctx: ExtensionContext, run: () => Promise<void>) => {
    try {
      await run();
    } catch (error) {
      notify(
        ctx,
        error instanceof RouterError ? error.message : "Account router operation failed.",
        true,
      );
    }
  };
  const show = (ctx: ExtensionContext, text: string | undefined) => {
    if (text === lastLabel) return; // no-op renders are skipped entirely
    lastLabel = text;
    ctx.ui.setStatus(PROVIDER_ID, text);
  };
  const clearBoundary = () => {
    if (boundary !== undefined) clearTimeout(boundary);
    boundary = undefined;
  };
  /**
   * Event-driven footer: runs on own state commits, sibling-process state writes, model/session
   * events and exactly once at the next instant a value changes by itself (cooldown end or a
   * window slot freeing). There is no periodic polling.
   */
  const refreshFooter = async (): Promise<void> => {
    if (refreshing) {
      refreshAgain = true;
      return;
    }
    refreshing = true;
    try {
      do {
        refreshAgain = false;
        clearBoundary();
        const ctx = footerCtx;
        if (!ctx?.hasUI) return;
        if (ctx.model?.provider !== PROVIDER_ID) {
          show(ctx, undefined);
          continue;
        }
        const base = { total: config.accounts.length, model: ctx.model?.id ?? "" };
        try {
          const status = await runtime.router.status(await available());
          const activeId = status.active?.accountId;
          const activeGroupId = config.accounts.find((a) => a.id === activeId)?.quotaGroup;
          const cooling = status.groups.map((g) => g.cooldownMs).filter((ms) => ms > 0);
          show(
            ctx,
            footerLabel({
              ...base,
              index:
                activeId === undefined
                  ? undefined
                  : config.accounts.findIndex((a) => a.id === activeId) + 1,
              usage: status.active?.usage ?? 1,
              waiting: status.waiting,
              cooldownMs:
                activeId === undefined
                  ? cooling.length
                    ? Math.min(...cooling)
                    : 0
                  : (status.groups.find((g) => g.id === activeGroupId)?.cooldownMs ?? 0),
              disabled: status.accounts.filter((a) => a.disabled).length,
              shadowing: runtime.getShadowing(),
            }).text,
          );
          if (status.nextChangeInMs !== undefined) {
            boundary = setTimeout(() => void refreshFooter(), Math.max(1, status.nextChangeInMs));
            boundary.unref?.();
          }
        } catch {
          // Footer must never fail a session: show the label in the exhausted colour.
          show(
            ctx,
            footerLabel({
              ...base,
              usage: 1,
              waiting: 0,
              cooldownMs: 0,
              disabled: 0,
              shadowing: runtime.getShadowing(),
            }).text,
          );
        }
      } while (refreshAgain);
    } finally {
      refreshing = false;
    }
  };
  const detachAll = () => {
    for (const off of detachFooter) off();
    detachFooter = [];
    clearBoundary();
  };
  const attachFooter = () => {
    detachAll();
    const offStore = store.onChange?.(() => void refreshFooter());
    if (offStore) detachFooter.push(offStore);
    // Sibling Pi processes write the same state file: react to their commits too.
    const watchDir = options.watchDirectory ?? watchDirectoryEvents;
    if (store instanceof FileStateStore || options.watchDirectory)
      detachFooter.push(watchDir(dirname(statePath(agentDir, config)), () => void refreshFooter()));
  };

  pi.registerCommand("router-status", {
    description: "Show safe account pool quotas, cooldowns and concurrency",
    handler: async (_args, ctx) =>
      guarded(ctx, async () => {
        const status = await runtime.router.status(await available());
        const accounts = status.accounts.map(
          (a) =>
            `${a.id}: ${a.disabled ? "auth-disabled" : a.ready ? "configured" : "unavailable"}, group=${a.quotaGroup}, in-flight=${a.inFlight}`,
        );
        const groups = status.groups.map(
          (g) =>
            `${g.id}: in-flight=${g.inFlight}/${g.maxConcurrent}, cooldown=${Math.ceil(g.cooldownMs / 1000)}s, next=${Math.ceil(g.waitMs / 1000)}s; ${g.windows.map((w) => `${w.remaining}/${w.requests} remaining per ${w.windowMs}ms rolling`).join(", ")}`,
        );
        notify(
          ctx,
          [
            "Account router",
            `Waiting: ${status.waiting} total, ${status.ownWaiting} in this instance; capacity resumes automatically.`,
            ...accounts,
            ...groups,
          ].join("\n"),
        );
      }),
  });
  pi.registerCommand("router-enable", {
    description: "Re-enable a configured account after credential repair; usage is preserved",
    getArgumentCompletions: (prefix) =>
      config.accounts
        .filter((a) => a.id.startsWith(prefix))
        .map((a) => ({ value: a.id, label: a.id })),
    handler: async (args, ctx) =>
      guarded(ctx, async () => {
        await runtime.router.enable(args.trim());
        notify(
          ctx,
          "Account authentication disable flag cleared; quota history and cooldown preserved.",
        );
      }),
  });
  pi.registerCommand("router-memory", {
    description: "Toggle episodic memory reuse (on|off) and show current store status",
    handler: async (args, ctx) =>
      guarded(ctx, async () => {
        const arg = args.trim().toLowerCase();
        if (arg === "on" || arg === "off") {
          episodeMemoryEnabled = arg === "on";
          notify(ctx, `Episodic memory reuse ${episodeMemoryEnabled ? "enabled" : "disabled"}.`);
        }
        const counts = await episodeStore.countByFamily();
        const lines = Object.entries(counts).map(([cls, n]) => `  ${cls}: ${n}`);
        notify(
          ctx,
          `Episodic memory: ${episodeMemoryEnabled ? "ON" : "OFF"} — ${lines.join(", ") || "empty"}`,
        );
      }),
  });
  pi.on("before_agent_start", async (event, _ctx) => {
    if (!episodeMemoryEnabled || _ctx.model?.provider !== PROVIDER_ID) return;
    try {
      const result = await buildRetrievalSection(episodeStore, {
        taskFamily: "other", // default; L3 will specialise per-step
        query: event.prompt,
        k: 3,
        enabled: true,
      });
      if (result.section && event.systemPromptOptions) {
        // Append to the existing sections map without replacing the whole prompt.
        const existing = event.systemPromptOptions.sections ?? {};
        event.systemPromptOptions.sections = {
          ...existing,
          experience: (existing.experience ?? "") + result.section,
        };
      }
    } catch {
      // Never let memory retrieval fail a session.
    }
  });
  pi.on("session_start", async (_event, ctx) => {
    // Some SDK hosts retain registrations across session replacement; re-open only after cleanup.
    if (runtime.closed) runtime = makeRuntime();
    footerCtx = ctx;
    lastLabel = undefined;
    if (ctx.hasUI) attachFooter();
    await refreshFooter();
  });
  pi.on("model_select", async (_event, ctx) => {
    footerCtx = ctx;
    await refreshFooter();
  });
  pi.on("session_shutdown", async (_event, ctx) => {
    detachAll();
    footerCtx = undefined;
    await runtime.shutdown();
    lastLabel = undefined;
    if (ctx.hasUI) ctx.ui.setStatus(PROVIDER_ID, undefined);
  });
  return provider;
}

/** Standard Pi extension factory: config read and registration only, no factory-time networking. */
export default async function accountRouterExtension(pi: ExtensionAPI): Promise<void> {
  await registerAccountRouter(pi, { bus: pi.events });
}

/** Re-export for tests and consumers that need the capture helper. */
export { buildRetrievalSection, createEpisodeStore, episodeStatePath, makeEpisodeCapture };

import type { EpisodeStore } from "./adapters/episode-store.ts";

/** Re-export the concrete type for tests that build stores directly. */
export type { EpisodeStore };
