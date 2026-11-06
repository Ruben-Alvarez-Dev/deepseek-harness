import {
  type Api,
  type AssistantMessage,
  type AssistantMessageEvent,
  type AssistantMessageEventStream,
  createAssistantMessageEventStream,
  isContextOverflow,
  type Model,
  type ProviderStreams,
  type SimpleStreamOptions,
  type StreamOptions,
  type SystemMessage,
  type TranscriptContext,
} from "@earendil-works/pi-ai";
import { openAICompletionsApi } from "@earendil-works/pi-ai/compat";
import type { AccountRouter } from "../application/router.ts";
import { buildEpisode } from "../domain/episode.ts";
import { checkAbort, type Lease, RouterError } from "../domain/types.ts";
import type { CredentialResolver, EpisodeStorePort, ExtensionBus } from "../ports.ts";
import { resolveAccounts } from "./credentials.ts";
import {
  countInvalidToolCalls,
  sanitizeToolCalls,
  sanitizeTranscript,
  upstreamDiagnostic,
} from "./message-safety.ts";

export const MANAGED_AUTH = "account-router-managed-credentials";

type Terminal = Extract<AssistantMessageEvent, { type: "done" | "error" }>;
type Attempt = Terminal | { type: "resume" };
type RunResult = {
  attempt: Attempt;
  /** True when the failure is safe to retry before any output was exposed (no partial replay). */
  transient: boolean;
  exposed: boolean;
  /** Account ID that failed, for shadow exclusion. Undefined on success or non-transient failure. */
  failedAccountId?: string;
};

function errorMessage(
  model: Model<Api>,
  aborted: boolean,
  message: string,
  partial?: AssistantMessage,
): Terminal {
  const error: AssistantMessage = partial
    ? sanitizeToolCalls(partial)
    : {
        role: "assistant",
        api: model.api,
        provider: model.provider,
        model: model.id,
        timestamp: Date.now(),
        content: [],
        stopReason: "pending",
        usage: {
          input: 0,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 0,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        },
      };
  error.stopReason = aborted ? "aborted" : "error";
  error.errorMessage = message;
  delete error.diagnostics;
  return { type: "error", reason: error.stopReason, error };
}

function stripAuth<T extends string | null>(
  headers?: Record<string, T>,
): Record<string, T> | undefined {
  if (!headers) return undefined;
  return Object.fromEntries(
    Object.entries(headers).filter(
      ([key]) => !["authorization", "x-api-key", "api-key"].includes(key.toLowerCase()),
    ),
  );
}

function safeUpstreamError(
  message: AssistantMessage,
  model: Model<Api>,
  status: number | undefined,
  aborted: boolean,
): string {
  if (aborted || message.stopReason === "aborted") return "Account router request aborted.";
  // Do not reinterpret rate-limit/server failures as context overflow even if their body says so.
  if (
    (status === undefined || status === 400 || status === 413) &&
    isContextOverflow(message, model.contextWindow)
  )
    return "context_length_exceeded";
  if (status === 429) {
    // Distinguish transient rate limiting (cool down, resume) from permanent quota
    // exhaustion (disable the account: waiting will never help). Body is inspected
    // only via the fixed diagnostic vocabulary, never echoed verbatim.
    if (upstreamDiagnostic(message.errorMessage) === "account_quota_exhausted")
      return "Account quota exhausted; account disabled. Replenish the plan and use /router-enable.";
    return "429 rate limit: account quota group is cooling down.";
  }
  // Agnes rejects exhausted free keys with HTTP 400 "usage limits ... regain access", which
  // is a permanent condition until the reset date: classify and disable exactly like the
  // 429 exhaustion case so the next acquire rotates to another account instead of dying.
  if (status === 400 && upstreamDiagnostic(message.errorMessage) === "account_quota_exhausted")
    return "Account quota exhausted; account disabled. Replenish the plan and use /router-enable.";
  if (status === 401 || status === 403)
    return "Account authentication rejected; account disabled. Check credentials and use /router-enable.";
  if (status !== undefined && status >= 500)
    return `${status} service unavailable: quota group temporarily cooling down.`;
  // Classify known client failures, but never trust a provider body not to echo secrets.
  if (status !== undefined) {
    const detail = upstreamDiagnostic(message.errorMessage);
    return detail
      ? `Account router upstream HTTP ${status} request failed. Upstream: ${detail}`
      : `Account router upstream HTTP ${status} request failed.`;
  }
  return "Account router upstream network or stream error.";
}

/**
 * Detect a raw upstream error body leaking into a terminal message even after router
 * classification (observed once with a real Agnes 400: `400 {"type":"error",...}`).
 * Router messages are fixed strings; anything shaped like an HTTP status plus a JSON
 * payload, or a bare JSON error payload, is treated as an upstream body.
 */
export function isRawUpstreamBody(text: string | undefined): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (/^\d{3}\s*[: ]\s*[{[]/.test(trimmed)) return true;
  return /^[{[]/.test(trimmed) && /"error"/.test(trimmed) && /[}\]]\s*$/.test(trimmed);
}

/** Native bridge: fair acquisition and explicit pre-output 429 recovery, never partial replay. */
export class RoutedStreams implements ProviderStreams {
  private readonly stop = new AbortController();
  private readonly tasks = new Set<Promise<void>>();
  private touched = false;
  private cleanup?: Promise<void>;
  private shadowCount = 0;

  constructor(
    readonly router: AccountRouter,
    private readonly credentials: CredentialResolver,
    private readonly api: ProviderStreams = openAICompletionsApi(),
    private readonly episodeStore?: EpisodeStorePort,
    private readonly bus?: ExtensionBus,
  ) {}

  get closed(): boolean {
    return this.stop.signal.aborted;
  }

  /** Emit a terminal event, stripping any raw upstream body that slipped through. */
  private pushTerminal(
    output: AssistantMessageEventStream,
    attempt: Extract<AssistantMessageEvent, { type: "done" | "error" }>,
  ): void {
    if (attempt.type === "error" && isRawUpstreamBody(attempt.error.errorMessage)) {
      attempt = {
        ...attempt,
        error: { ...attempt.error, errorMessage: "Account router upstream request failed." },
      };
    }
    output.push(attempt);
    output.end();
  }

  stream(
    model: Model<Api>,
    context: TranscriptContext,
    options?: StreamOptions,
  ): AssistantMessageEventStream {
    return this.start(model, context, options, false);
  }

  streamSimple(
    model: Model<Api>,
    context: TranscriptContext,
    options?: SimpleStreamOptions,
  ): AssistantMessageEventStream {
    return this.start(model, context, options, true);
  }

  private start(
    model: Model<Api>,
    context: TranscriptContext,
    options: SimpleStreamOptions | undefined,
    simple: boolean,
  ): AssistantMessageEventStream {
    const output = createAssistantMessageEventStream();
    const signal = options?.signal
      ? AbortSignal.any([options.signal, this.stop.signal])
      : this.stop.signal;
    const task = this.complete(output, model, context, options, signal, simple);
    this.tasks.add(task);
    void task.then(() => this.tasks.delete(task));
    return output;
  }

  private async complete(
    output: AssistantMessageEventStream,
    model: Model<Api>,
    context: TranscriptContext,
    options: SimpleStreamOptions | undefined,
    signal: AbortSignal,
    simple: boolean,
  ): Promise<void> {
    let transientRetries = 0;
    let shadowed = false;
    for (;;) {
      const { attempt, transient, exposed } = await this.run(
        output,
        model,
        context,
        options,
        signal,
        simple,
      );
      if (attempt.type === "resume") continue;
      if (
        attempt.type === "error" &&
        transient &&
        !exposed &&
        !shadowed &&
        this.router.config.shadowEnabled &&
        transientRetries < this.router.config.maxTransientRetries
      ) {
        // L3 selective shadow: dispatch one regeneration on a different account
        // with the failure feedback. No loops, no partial replay.
        shadowed = true;
        const errorMsg = (attempt as Extract<Terminal, { type: "error" }>).error.errorMessage;
        const failedAcct = (attempt as { failedAccountId?: string }).failedAccountId;
        if (failedAcct && errorMsg) {
          const shadowResult = await this.shadowAttempt(
            output,
            model,
            context,
            options,
            signal,
            simple,
            failedAcct,
            errorMsg,
          );
          if (shadowResult.type !== "resume") {
            this.pushTerminal(output, shadowResult);
            return;
          }
        }
        // Fallback: normal transient retry
        transientRetries++;
        continue;
      }
      if (
        attempt.type === "error" &&
        transient &&
        !exposed &&
        transientRetries < this.router.config.maxTransientRetries
      ) {
        // Bounded transient retry (SOTA pool semantics): the attempt failed before
        // exposing anything, so a fresh request on another account (or the same one
        // after its group cooldown) is safe — no partial replay, no duplication.
        transientRetries++;
        continue;
      }
      this.pushTerminal(output, attempt);
      return;
    }
  }

  private async run(
    output: AssistantMessageEventStream,
    model: Model<Api>,
    context: TranscriptContext,
    options: SimpleStreamOptions | undefined,
    signal: AbortSignal,
    simple: boolean,
    excludeAccountId?: string,
  ): Promise<RunResult> {
    let exposed = false;
    let cleaned = true;
    let feedbackRecorded = false;
    let feedbackFailed = false;
    let lease: Lease | undefined;
    let partial: AssistantMessage | undefined;
    let terminal: Terminal | undefined;
    let status: number | undefined;
    let preliminary = false; // config/credential failures before any upstream request
    // Idle-timeout semantics (SOTA): requestTimeoutMs bounds the wait for the first
    // byte and the gap between stream events — never the total generation time.
    const idleMs =
      options?.timeoutMs && options.timeoutMs > 0
        ? options.timeoutMs
        : this.router.config.requestTimeoutMs;
    const timeout = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const armIdle = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => timeout.abort(), idleMs);
      timer.unref();
    };
    const abortTimers = () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
    };
    try {
      checkAbort(signal);
      if (
        model.api !== "openai-completions" ||
        !this.router.config.provider.models.some((m) => m.id === model.id)
      ) {
        preliminary = true;
        throw new RouterError("config", "Unsupported configured router model.");
      }
      if (options?.apiKey && options.apiKey !== MANAGED_AUTH) {
        preliminary = true;
        throw new RouterError(
          "credentials",
          "--api-key overrides are unsupported; configure an account credential reference instead.",
        );
      }
      const keys = await resolveAccounts(
        this.router.config.accounts,
        this.credentials,
        options?.env,
        signal,
      );
      this.touched = true;
      try {
        const available = new Set(keys.keys());
        if (excludeAccountId) available.delete(excludeAccountId);
        lease = await this.router.acquire(available, signal);
      } catch (error) {
        if (error instanceof RouterError && error.code === "credentials") preliminary = true;
        throw error;
      }
      checkAbort(signal);
      const key = keys.get(lease.accountId);
      if (!key) throw new RouterError("credentials", "Selected account has no credential.");
      const selected = lease;
      const fetchImpl = options?.fetch ?? globalThis.fetch;
      armIdle();
      const requestSignal = AbortSignal.any([signal, timeout.signal]);
      const nativeOptions: SimpleStreamOptions = {
        ...options,
        signal: requestSignal,
        apiKey: key,
        maxRetries: 0,
        timeoutMs: idleMs,
        headers: stripAuth(options?.headers),
        fetch: async (input, init) => {
          const response = await fetchImpl(input, init);
          status = response.status;
          if (
            response.status === 401 ||
            response.status === 403 ||
            response.status === 429 ||
            response.status >= 500
          ) {
            try {
              await this.router.feedback(
                selected,
                response.status,
                response.headers.get("retry-after"),
              );
              this.bus?.emit("account-router/http_feedback", {
                accountId: selected.accountId,
                status: response.status,
              });
              feedbackRecorded = true;
            } catch (error) {
              feedbackFailed = true;
              await response.body?.cancel().catch(() => undefined);
              throw error;
            }
          }
          return response;
        },
      };
      const dispatched = {
        ...model,
        baseUrl: this.router.config.provider.baseUrl,
        headers: stripAuth(model.headers),
      };
      const safeContext = { ...context, messages: sanitizeTranscript(context.messages) };
      const inner = simple
        ? this.api.streamSimple(dispatched, safeContext, nativeOptions)
        : this.api.stream(dispatched, safeContext, nativeOptions);
      for await (const event of inner) {
        if (event.type === "done") {
          terminal = event;
        } else if (event.type === "error") {
          partial = sanitizeToolCalls(event.error);
          terminal = errorMessage(
            model,
            signal.aborted || (event.reason === "aborted" && !timeout.signal.aborted),
            feedbackFailed
              ? "Account router feedback persistence failed; recovery stopped."
              : timeout.signal.aborted && !signal.aborted
                ? `Account router upstream idle timeout (no stream event for ${idleMs}ms).`
                : safeUpstreamError(event.error, model, status, signal.aborted),
            partial,
          );
        } else {
          exposed = true;
          armIdle();
          partial = event.partial;
          output.push(event);
        }
      }
      if (!terminal) throw new RouterError("terminal_event", "Missing terminal stream event");
      // S-2: never persist a finished turn that still carries an incomplete tool call.
      // Drop bad blocks and fail the turn cleanly; this does not change Pi's retry classification.
      // Only the clean content reaches terminal history; outgoing projection also repairs older turns.
      if (terminal.type === "done") {
        const dropped = countInvalidToolCalls(terminal.message.content);
        if (dropped > 0) {
          const clean = sanitizeToolCalls(terminal.message);
          terminal = errorMessage(
            model,
            false,
            `Account router discarded ${dropped} incomplete tool call(s); ` +
              "retry this turn. Invalid blocks were removed from the terminal message.",
            clean,
          );
        }
      }
    } catch (error) {
      const aborted = signal.aborted || (error instanceof RouterError && error.code === "aborted");
      const safe = aborted
        ? "Account router request aborted."
        : timeout.signal.aborted
          ? `Account router upstream idle timeout (no stream event for ${idleMs}ms).`
          : error instanceof RouterError
            ? error.message
            : "Account router upstream network or stream error.";
      terminal = errorMessage(model, aborted, safe, partial);
    } finally {
      abortTimers();
      if (lease) {
        try {
          await this.router.release(lease);
        } catch {
          cleaned = false;
          const completed = terminal?.type === "done" ? terminal.message : partial;
          terminal = errorMessage(
            model,
            signal.aborted,
            "Account router reservation cleanup failed; state remains conservative.",
            completed,
          );
        }
        // Record latency for EWMA tracking (L1) after release succeeds.
        if (cleaned && terminal?.type === "done") {
          const latencyMs = Date.now() - lease.startedAt;
          void this.router.recordLatency(lease.accountId, latencyMs).catch(() => undefined);
        }
      }
    }
    if (
      this.router.config.rateLimitRecovery === "wait" &&
      status === 429 &&
      feedbackRecorded &&
      terminal?.type === "error" &&
      !exposed &&
      cleaned &&
      !signal.aborted &&
      !timeout.signal.aborted &&
      terminal.error.errorMessage !==
        "Account quota exhausted; account disabled. Replenish the plan and use /router-enable."
    )
      return { attempt: { type: "resume" }, transient: false, exposed };
    // Permanent quota exhaustion: disable the selected account (like 401/403) instead of
    // cooling the group and waiting forever. The diagnostic is fixed, the body is not echoed.
    if (
      lease &&
      terminal?.type === "error" &&
      terminal.error.errorMessage ===
        "Account quota exhausted; account disabled. Replenish the plan and use /router-enable."
    ) {
      await this.router.feedback(lease, 401, null).catch(() => undefined);
    }
    const result =
      terminal ?? errorMessage(model, signal.aborted, "Account router stream failed.", partial);
    // Permanent quota exhaustion (429 or Agnes 400 "usage limits"): the account was already
    // disabled by feedback(401) above; classify as retryable so the next acquire skips it and
    // rotates to another account. The disabled account cannot be re-selected, so this is safe.
    const exhausted =
      result.type === "error" &&
      result.error.errorMessage ===
        "Account quota exhausted; account disabled. Replenish the plan and use /router-enable.";
    // Transient, safe-to-retry classification: the attempt failed BEFORE exposing any
    // output, so a fresh request (possibly on another account/group, after the cooldowns
    // already recorded above) cannot duplicate anything. 429 keeps its own wait/resume
    // semantics; context overflow and preliminary (config/credential) errors never retry.
    const transient =
      result.type === "error" &&
      !exposed &&
      cleaned &&
      !feedbackFailed &&
      !preliminary &&
      !signal.aborted &&
      status !== 429 &&
      (status !== 400 || exhausted) &&
      result.error.errorMessage !== "context_length_exceeded" &&
      result.error.errorMessage !== "Account router request aborted.";
    if (transient && !feedbackRecorded && lease && !exhausted) {
      // No HTTP status was recorded (network drop / early stream error / idle
      // connect timeout): cool the group so the next acquire rotates or waits
      // instead of hammering the same upstream.
      try {
        await this.router.feedback(lease, 0, null);
      } catch {
        // Conservative: without state we do not claim retry-safety.
        return { attempt: result, transient: false, exposed };
      }
    }
    return {
      attempt: result,
      transient,
      exposed,
      failedAccountId: transient ? lease?.accountId : undefined,
    };
  }

  private async shadowAttempt(
    output: AssistantMessageEventStream,
    model: Model<Api>,
    context: TranscriptContext,
    options: SimpleStreamOptions | undefined,
    signal: AbortSignal,
    simple: boolean,
    failedAccountId: string,
    errorMessage: string,
  ): Promise<Attempt> {
    this.shadowCount++;
    try {
      // Append failure feedback as a system message so the shadow regeneration
      // knows what went wrong (ReST P13 pattern).
      const shadowContext: TranscriptContext = {
        ...context,
        messages: [
          ...context.messages,
          {
            role: "system",
            content: `Previous attempt failed: ${errorMessage}. Retry with this constraint.`,
          } as SystemMessage,
        ],
      };
      const result = await this.run(
        output,
        model,
        shadowContext,
        options,
        signal,
        simple,
        failedAccountId,
      );
      if (result.attempt.type === "resume") return result.attempt;
      // Capture successful shadow as episode for learning
      if (this.episodeStore && result.attempt.type === "done") {
        const episode = buildEpisode({
          taskFamily: "tool",
          projectScope: "account-router",
          deterministicObservation: errorMessage.slice(0, 200),
          receiptRefs: [],
          validatedFix: "Retry after transient error succeeded",
          provenance: "shadow",
          holdoutCategory: "development",
          accountPressure: 0.5,
        });
        await this.episodeStore.capture(episode);
        this.bus?.emit("account-router/episode_captured", {
          taskFamily: episode.taskFamily,
          provenance: episode.provenance,
        });
      }
      return result.attempt;
    } finally {
      this.shadowCount--;
    }
  }

  getShadowing(): number {
    return this.shadowCount;
  }

  shutdown(): Promise<void> {
    if (!this.cleanup) {
      this.stop.abort();
      this.cleanup = (async () => {
        await Promise.all([...this.tasks]);
        if (this.touched) await this.router.shutdown();
      })();
    }
    return this.cleanup;
  }
}
