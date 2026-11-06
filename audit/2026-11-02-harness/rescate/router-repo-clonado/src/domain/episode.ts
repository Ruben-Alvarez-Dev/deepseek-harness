/**
 * Episodic memory schema — lessons learned from deterministic verifier outcomes.
 *
 * Aligned with L5 research proposal: task_family, project_scope, failure_class,
 * deterministic_observation, receipt_refs, validated_fix, expiry, provenance.
 *
 * Privacy invariant: no field may contain credentials, headers, full tool outputs,
 * or any material that could identify an upstream account key.
 */

export type TaskFamily = "tool" | "build" | "refactor" | "prose" | "other";
/** Legacy alias for backwards compat. */
export type TaskClass = TaskFamily;
export type Verdict = "pass" | "fail";
/** Legacy alias for failure_class. */
export type FailureClass = Verdict;
export type VerifierId =
  | "verify-full"
  | "spec"
  | "typecheck"
  | "lint"
  | "schema"
  | "hash"
  | "custom"
  | "recovery"
  | "claim-gate";

/**
 * Provenance: where this episode came from.
 * - "shadow": produced by L3 adversarial shadow retry
 * - "verifier": produced by deterministic verifier (claim-gate, test pass/fail)
 * - "manual": injected by operator
 */
export type Provenance = "shadow" | "verifier" | "manual";

/**
 * Holdout category: episodes from different contexts must not contaminate each other.
 * - "development": episodes from normal agent work
 * - "test": episodes from test/verification runs (holdout: never injected into dev context)
 * - "evaluation": episodes from evaluation runs (holdout: never injected anywhere)
 */
export type HoldoutCategory = "development" | "test" | "evaluation";

export interface Episode {
  /** UUID v4. */
  id: string;
  /** L5: task_family — what kind of work this was. */
  taskFamily: TaskFamily;
  /** Legacy alias; prefer taskFamily. */
  taskClass?: TaskClass;
  /** L5: project_scope — which project/workspace this belongs to. */
  projectScope: string;
  /** L5: deterministic_observation — redacted context excerpt (≤300 tokens). */
  deterministicObservation: string;
  /** Legacy alias: context. */
  context?: string;
  /** L5: failure_class — what class of failure occurred (for fail episodes). */
  failureClass?: string;
  /** Legacy alias: verdict. */
  verdict?: Verdict;
  /** L5: receipt_refs — refs to claim-gate receipts / test IDs that produced the verdict. */
  receiptRefs: string[];
  /** L5: validated_fix — what was done to fix it (empty if no fix attempted). */
  validatedFix: string;
  /** Legacy alias: lesson. */
  lesson?: string;
  /** L5: provenance — who/what produced this episode. */
  provenance: Provenance;
  /** Legacy alias: shadowUsed. */
  shadowUsed?: 0 | 1;
  /**
   * Holdout category: which context this episode belongs to.
   * Derived from provenance when omitted: shadow/verifier → development,
   * manual stays development unless explicitly marked evaluation/test.
   */
  holdoutCategory: HoldoutCategory;
  /** L5: expiry epoch ms. Episodes past expiry are evicted on next read. 0 = no expiry. */
  expiry: number;
  /** Pool pressure (0.0–1.0) at capture time, for prioritisation. */
  accountPressure: number;
  /** Epoch ms when captured. */
  ts: number;
}

export interface EpisodeStoreState {
  version: 2;
  episodes: Episode[];
  /** Per-class retention caps (0 = unlimited). */
  caps: Partial<Record<TaskFamily, number>>;
  /** Global retention cap (0 = unlimited). */
  globalCap: number;
  /** Default TTL in ms for new episodes (0 = no expiry). */
  defaultTtlMs: number;
  /** Holdout categories that are excluded from retrieval. */
  holdoutCategories: HoldoutCategory[];
}

export const DEFAULT_CAPS: Required<EpisodeStoreState["caps"]> = {
  tool: 50,
  build: 50,
  refactor: 50,
  prose: 50,
  other: 50,
};
export const DEFAULT_GLOBAL_CAP = 500;
export const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const DEFAULT_HOLDOUT_CATEGORIES: HoldoutCategory[] = ["evaluation"];

export function emptyEpisodeState(): EpisodeStoreState {
  return {
    version: 2,
    episodes: [],
    caps: { ...DEFAULT_CAPS },
    globalCap: DEFAULT_GLOBAL_CAP,
    defaultTtlMs: DEFAULT_TTL_MS,
    holdoutCategories: [...DEFAULT_HOLDOUT_CATEGORIES],
  };
}

/** Normalise a lesson string for dedupe comparison: lower, trim, collapse whitespace. */
export function normaliseLesson(lesson: string): string {
  return lesson.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Redact known secret patterns from a string (defensive, not forensic). */
export function redactSecrets(text: string): string {
  let out = text.replace(
    /(?:agnes[_-]?ai|openai|anthropic|sk|pk)[-_]?[a-zA-Z0-9_-]{16,}/gi,
    "<redacted-key>",
  );
  out = out.replace(/[A-Za-z0-9+/]{40,}={0,3}/g, (m) => {
    if (m.includes("=") && m.length > 60) return "<redacted>";
    return m;
  });
  return out;
}

/** Check if an episode is expired. */
export function isExpired(ep: Episode, now: number): boolean {
  return ep.expiry > 0 && now >= ep.expiry;
}

/** Build an Episode from raw inputs, enforcing privacy and size bounds. */
export function buildEpisode(opts: {
  taskFamily: TaskFamily;
  projectScope: string;
  deterministicObservation: string;
  receiptRefs?: string[];
  validatedFix?: string;
  /** Deprecated: use failureClass instead. */
  failureClass?: string;
  /** Deprecated: use verdict instead. */
  verdict?: Verdict;
  /** Deprecated: use lesson instead. */
  lesson?: string;
  provenance: Provenance;
  holdoutCategory?: HoldoutCategory;
  expiry?: number;
  accountPressure?: number;
  ts?: number;
}): Episode {
  const now = opts.ts ?? Date.now();
  // Legacy field mapping for backwards compat
  const failureClass = opts.failureClass ?? (opts.verdict === "fail" ? "transient" : "none");
  const lesson = opts.lesson ?? opts.validatedFix ?? "";
  const receiptRefs = opts.receiptRefs ?? [];
  const expiry = opts.expiry ?? now + DEFAULT_TTL_MS;
  const pressure =
    typeof opts.accountPressure === "number" ? Math.max(0, Math.min(1, opts.accountPressure)) : 0;
  const holdoutCategory = opts.holdoutCategory ?? "development";
  return {
    id: crypto.randomUUID(),
    taskFamily: opts.taskFamily,
    taskClass: opts.taskFamily, // keep legacy alias
    projectScope: redactSecrets(opts.projectScope.slice(0, 200)),
    deterministicObservation: redactSecrets(opts.deterministicObservation.slice(0, 2400)),
    context: opts.deterministicObservation, // legacy alias
    failureClass,
    verdict: opts.verdict ?? (failureClass === "transient" ? "fail" : "pass"),
    receiptRefs,
    validatedFix: redactSecrets((opts.validatedFix ?? lesson).slice(0, 300)),
    lesson: redactSecrets(lesson.slice(0, 300)),
    provenance: opts.provenance,
    shadowUsed: opts.provenance === "shadow" ? 1 : 0,
    holdoutCategory,
    expiry,
    accountPressure: pressure,
    ts: now,
  };
}
