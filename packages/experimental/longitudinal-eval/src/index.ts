/**
 * Pure measurement helpers for the longitudinal memory/skill evaluation:
 * retrieval metrics, session-usage aggregation, and kill-criteria decisions.
 *
 * @module @deepseek-ai/dsh-experimental-longitudinal-eval
 */

/** One ranked retrieval sample with graded relevance (0 = not relevant). */
export interface RankedSample {
  /** Retrieved names, best first. */
  readonly ranked: readonly string[]
  /** Graded relevance per name; absent means 0. */
  readonly relevance: Readonly<Record<string, number>>
}

/** Aggregated usage over one measurement window. */
export interface UsageSummary {
  /** Number of sessions in the window. */
  readonly sessions: number
  /** Total model requests across sessions. */
  readonly requests: number
  /** Tool-call counts by tool name. */
  readonly toolCalls: Readonly<Record<string, number>>
  /** Sessions that called the skill loader at least once. */
  readonly sessionsWithSkill: number
  /** `memory/injected` events across sessions. */
  readonly memoryInjections: number
  /** Distinct UTC days with at least one session in the window. */
  readonly activeDays: number
}

/** One session's usage facts, extracted by the caller from its log. */
export interface SessionUsageSample {
  /** Model requests in the session. */
  readonly requests: number
  /** Tool calls by name in the session. */
  readonly toolCalls: Readonly<Record<string, number>>
  /** `memory/injected` events in the session. */
  readonly memoryInjections: number
  /** UTC day (`YYYY-MM-DD`) the session started, for active-day counting. */
  readonly day?: string
}

/** Deployment-owned longitudinal kill criteria. */
export interface KillCriteria {
  /** Disable passive memory when the window has fewer injections than this. */
  readonly memory?: {
    /** Minimum injections across the window to keep the feature. */
    readonly minInjections: number
    /** Sessions the window must cover before the criterion applies. */
    readonly minSessions: number
  }
  /** Disable the skill router when too few sessions load a skill. */
  readonly skills?: {
    /** Minimum ratio of sessions that load at least one skill. */
    readonly minSessionRatio: number
    /** Sessions the window must cover before the criterion applies. */
    readonly minSessions: number
  }
}

/** Outcome of one kill criterion. */
export interface KillDecision {
  /** Criterion identifier (`memory` or `skills`). */
  readonly criterion: 'memory' | 'skills'
  /** Whether the measured window keeps or disables the feature. */
  readonly decision: 'keep' | 'disable'
  /** Measured values and the threshold they were compared with. */
  readonly reason: string
}

/**
 * Recall@k with binary relevance (grade >= 1 counted).
 * @param ranked - retrieved names, best first.
 * @param relevant - expected names.
 * @param k - cutoff; positive integer.
 * @returns hits divided by min(relevant size, k); 0 when k or the relevant set is empty.
 */
export function recallAtK(ranked: readonly string[], relevant: ReadonlySet<string>, k: number): number {
  assertK(k)
  if (relevant.size === 0) return 0
  const hits = ranked.slice(0, k).filter(name => relevant.has(name)).length
  return hits / Math.min(relevant.size, k)
}

/**
 * nDCG@k with graded relevance, gain = 2^grade - 1.
 * @param sample - ranked names and graded relevance.
 * @param k - cutoff; positive integer.
 * @returns DCG divided by the ideal DCG over the graded labels; 0 when nothing is relevant.
 */
export function ndcgAtK(sample: RankedSample, k: number): number {
  assertK(k)
  const gain = (name: string): number => 2 ** (sample.relevance[name] ?? 0) - 1
  const dcg = sample.ranked.slice(0, k)
    .reduce((total, name, index) => total + gain(name) / Math.log2(index + 2), 0)
  const ideal = Object.values(sample.relevance)
    .filter(grade => grade > 0)
    .sort((left, right) => right - left)
    .slice(0, k)
  const idcg = ideal.reduce((total, grade, index) => total + (2 ** grade - 1) / Math.log2(index + 2), 0)
  return idcg === 0 ? 0 : dcg / idcg
}

/**
 * Aggregate per-session usage into one window summary.
 * @param sessions - usage samples extracted from logs.
 * @returns aggregated counts and distinct active days.
 */
export function summarizeUsage(sessions: readonly SessionUsageSample[]): UsageSummary {
  const toolCalls: Record<string, number> = {}
  const days = new Set<string>()
  let requests = 0
  let sessionsWithSkill = 0
  let memoryInjections = 0
  for (const session of sessions) {
    requests += session.requests
    memoryInjections += session.memoryInjections
    if ((session.toolCalls['skill'] ?? 0) > 0) sessionsWithSkill += 1
    for (const [name, count] of Object.entries(session.toolCalls)) {
      toolCalls[name] = (toolCalls[name] ?? 0) + count
    }
    if (session.day !== undefined) days.add(session.day)
  }
  return {
    sessions: sessions.length,
    requests,
    toolCalls,
    sessionsWithSkill,
    memoryInjections,
    activeDays: days.size,
  }
}

/**
 * Apply the declared kill criteria to one measured window.
 * @param summary - aggregated usage.
 * @param criteria - thresholds; an omitted group is not evaluated.
 * @returns one decision per evaluated criterion.
 */
export function evaluateKillCriteria(summary: UsageSummary, criteria: KillCriteria): KillDecision[] {
  const decisions: KillDecision[] = []
  if (criteria.memory !== undefined) {
    const { minInjections, minSessions } = criteria.memory
    if (summary.sessions < minSessions) {
      decisions.push({
        criterion: 'memory',
        decision: 'keep',
        reason: `window has ${summary.sessions} sessions, below the ${minSessions}-session minimum`,
      })
    } else if (summary.memoryInjections < minInjections) {
      decisions.push({
        criterion: 'memory',
        decision: 'disable',
        reason: `${summary.memoryInjections} injections in ${summary.sessions} sessions, below the ${minInjections} minimum`,
      })
    } else {
      decisions.push({
        criterion: 'memory',
        decision: 'keep',
        reason: `${summary.memoryInjections} injections in ${summary.sessions} sessions meet the ${minInjections} minimum`,
      })
    }
  }
  if (criteria.skills !== undefined) {
    const { minSessionRatio, minSessions } = criteria.skills
    const ratio = summary.sessions === 0 ? 0 : summary.sessionsWithSkill / summary.sessions
    if (summary.sessions < minSessions) {
      decisions.push({
        criterion: 'skills',
        decision: 'keep',
        reason: `window has ${summary.sessions} sessions, below the ${minSessions}-session minimum`,
      })
    } else if (ratio < minSessionRatio) {
      decisions.push({
        criterion: 'skills',
        decision: 'disable',
        reason: `${summary.sessionsWithSkill}/${summary.sessions} sessions loaded a skill (${ratio.toFixed(2)}), below ${minSessionRatio}`,
      })
    } else {
      decisions.push({
        criterion: 'skills',
        decision: 'keep',
        reason: `${summary.sessionsWithSkill}/${summary.sessions} sessions loaded a skill (${ratio.toFixed(2)}) meet ${minSessionRatio}`,
      })
    }
  }
  return decisions
}

function assertK(k: number): void {
  if (!Number.isSafeInteger(k) || k < 1) throw new Error(`longitudinal-eval: k must be a positive integer, got ${String(k)}`)
}
