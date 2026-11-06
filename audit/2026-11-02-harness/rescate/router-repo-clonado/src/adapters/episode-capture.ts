import { buildEpisode, type TaskFamily, type Verdict, type VerifierId } from "../domain/episode.ts";
import type { EpisodeStorePort } from "../ports.ts";

/**
 * Hooks into the L3 adversarial verifier pipeline to capture episodes on
 * deterministic verdicts. Call this after every shadow-step evaluation.
 *
 * When no verifier ran (or the verdict was inconclusive), call with
 * `verdict: undefined` and nothing is captured.
 */
export function makeEpisodeCapture(store: EpisodeStorePort) {
  return async function captureEpisode(opts: {
    taskFamily: TaskFamily;
    projectScope: string;
    deterministicObservation: string;
    /** undefined = no verdict (skip capture). */
    verdict?: Verdict;
    verifier: VerifierId;
    validatedFix?: string;
    /** Single actionable lesson (legacy: lesson). */
    lesson?: string;
    receiptRefs?: string[];
    provenance?: "shadow" | "verifier" | "manual";
    holdoutCategory?: "development" | "test" | "evaluation";
    expiry?: number;
    accountPressure: number;
  }): Promise<void> {
    if (opts.verdict === undefined) return;
    const episode = buildEpisode({
      taskFamily: opts.taskFamily,
      projectScope: opts.projectScope,
      deterministicObservation: opts.deterministicObservation,
      receiptRefs: opts.receiptRefs ?? [],
      validatedFix: opts.validatedFix ?? opts.lesson ?? "",
      lesson: opts.lesson,
      provenance: opts.provenance ?? "verifier",
      holdoutCategory: opts.holdoutCategory,
      expiry: opts.expiry,
      accountPressure: opts.accountPressure,
    });
    await store.capture(episode);
  };
}

/**
 * Extracts a human-readable lesson from a failed step.
 * Implemented as a simple heuristic; replace with L3 output when available.
 */
export function inferLesson(opts: {
  attemptSummary: string;
  context: string;
  failureReason?: string;
}): string {
  const parts = [opts.attemptSummary];
  if (opts.failureReason) parts.push(`failure: ${opts.failureReason}`);
  return parts.join(". ").slice(0, 300);
}
