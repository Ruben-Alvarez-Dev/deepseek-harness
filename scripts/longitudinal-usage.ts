/**
 * Longitudinal usage window over durable session logs.
 *
 * `@deepseek-ai/dsh-experimental-longitudinal-eval` owns the metrics and the
 * kill criteria but reads no host paths on purpose: the caller extracts one
 * sample per session. This tool is that caller. It reads
 * `<home>/sessions/<workspace>/<session>/session.v4.jsonl.zstd`, maps each log
 * to a `SessionUsageSample` (model requests, tool calls by name, `memory/injected`
 * events, UTC day of the session header), aggregates the selected window with
 * `summarizeUsage`, and applies the criteria the SOTA plan declares in P7:
 * passive memory is disabled without signal in the window, the skill router is
 * disabled when too few sessions load a skill.
 *
 * It measures; it never activates, disables, or edits a composition. Re-running
 * it after the 30-day window is the whole measurement: the calendar interval is
 * external to the package and to this tool.
 *
 * @example
 * ```sh
 * pnpm exec tsx scripts/longitudinal-usage.ts --from 2026-11-08
 * pnpm exec tsx scripts/longitudinal-usage.ts --preset sota --json
 * ```
 * @module scripts/longitudinal-usage
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { zstdDecompressSync } from 'node:zlib'
import {
  evaluateKillCriteria,
  summarizeUsage,
  type KillCriteria,
  type KillDecision,
  type SessionUsageSample,
  type UsageSummary,
} from '@deepseek-ai/dsh-experimental-longitudinal-eval'

/**
 * Criteria declared by the SOTA plan (P7) and used by the CH-047 baseline:
 * memory goes off without a single injection in the window; the skill router
 * goes off when fewer than half the sessions load a skill. Both wait for a
 * three-session sample before applying.
 */
export const KILL_CRITERIA: KillCriteria = {
  memory: { minInjections: 1, minSessions: 3 },
  skills: { minSessionRatio: 0.5, minSessions: 3 },
}

/** One session's facts as read from its durable log. */
export interface SessionFacts {
  /** Durable session id from the log header. */
  readonly id: string
  /** Session creation time, epoch milliseconds, from the log header. */
  readonly createdAt: number
  /** Agent preset recorded in the header, when the writer recorded one. */
  readonly agentPreset?: string
  /** Assistant messages that carry provider-reported `usage`: one per model request. */
  readonly requests: number
  /** Model-facing tool calls by name, from the assistant message content blocks. */
  readonly toolCalls: Readonly<Record<string, number>>
  /** `memory/injected` events: durable passive-memory injections. */
  readonly memoryInjections: number
  /** `tool/dispatch-gate` records, split by why the call was not allowed. */
  readonly dispatchGate: DispatchGateFacts
}

/** Dispatch-gate decisions recorded while the gate ran in `audit`. */
export interface DispatchGateFacts {
  /** Calls the (empty) allowlist did not admit, by exact requested tool name. */
  readonly unlisted: Readonly<Record<string, number>>
  /** Calls an explicit deny rule refused. */
  readonly explicitDeny: number
}

/** One session plus the workspace directory it was found under. */
export interface LocatedSession {
  /** Name of the workspace directory under `sessions/`. */
  readonly workspace: string
  /** Facts parsed from that session's log. */
  readonly facts: SessionFacts
}

/** One in-window session as reported to the caller. */
export interface WindowSession extends SessionUsageSample {
  /** Durable session id. */
  readonly id: string
  /** Workspace directory the session was found under. */
  readonly workspace: string
  /** Agent preset recorded in the header, when known. */
  readonly agentPreset?: string
}

/** Everything one measurement run reports. */
export interface WindowReport {
  /** The selected window and filters, echoed for reproducibility. */
  readonly window: {
    readonly from?: string
    readonly to?: string
    readonly preset?: string
    readonly workspace?: string
    readonly requireGate?: boolean
  }
  /** Aggregated usage over the window. */
  readonly usage: UsageSummary
  /**
   * Dispatch-gate decisions across the window. In `audit` mode the gate records
   * every call the allowlist omits and still executes it; deriving the
   * `enforce` allowlist means admitting exactly the tools listed under `unlisted`.
   */
  readonly dispatchGate: DispatchGateFacts
  /** One decision per evaluated kill criterion. */
  readonly decisions: readonly KillDecision[]
  /** Per-session samples that fed the summary, oldest first. */
  readonly sessions: readonly WindowSession[]
}

/** Command-line request after defaults are applied. */
export interface MeasureOptions {
  /** DSH home holding `sessions/`; defaults to `$DSH_HOME` or `~/.dsh`. */
  readonly home: string
  /** Inclusive first UTC day (`YYYY-MM-DD`). */
  readonly from?: string
  /** Inclusive last UTC day (`YYYY-MM-DD`). */
  readonly to?: string
  /** Keep only sessions whose header records this agent preset. */
  readonly preset?: string
  /** Keep only workspace directories whose name contains this text. */
  readonly workspace?: string
  /**
   * Keep only sessions that recorded at least one `tool/dispatch-gate` decision.
   * That event is the observable footprint of the F4 `sota` preset (it mounts the
   * gate in `audit` with an empty allowlist); the hand-rolled `sota` preset that
   * shares the same `agentPreset` id records none, so this filter keeps the
   * measurement on the audited product.
   */
  readonly requireGate?: boolean
}

/** One parsed command line. */
export interface ParsedOptions {
  readonly options: MeasureOptions
  readonly json: boolean
  readonly help: boolean
}

/** UTC day (`YYYY-MM-DD`) of one epoch-millisecond instant. */
export function utcDay(time: number): string {
  return new Date(time).toISOString().slice(0, 10)
}

/**
 * Map one decompressed session log to its usage facts.
 * @param source - UTF-8 JSONL contents of `session.v4.jsonl.zstd`.
 * @returns the session's header identity plus its usage counters.
 * @throws when the log has no session header or a line is not JSON.
 */
export function parseSessionLog(source: string): SessionFacts {
  const lines = source.split('\n').filter(line => line.trim() !== '')
  if (lines.length === 0) throw new Error('session log is empty')
  const header = JSON.parse(lines[0] as string) as {
    type?: unknown
    id?: unknown
    createdAt?: unknown
    agentPreset?: unknown
  }
  if (header.type !== 'session' || typeof header.id !== 'string' || typeof header.createdAt !== 'number') {
    throw new Error('session log must start with a session header carrying id and createdAt')
  }
  const toolCalls: Record<string, number> = {}
  const unlisted: Record<string, number> = {}
  let explicitDeny = 0
  let requests = 0
  let memoryInjections = 0
  for (const line of lines.slice(1)) {
    const event = JSON.parse(line) as {
      type?: unknown
      data?: { usage?: unknown; message?: { content?: unknown }; name?: unknown; decision?: unknown }
    }
    if (event.type === 'memory/injected') {
      memoryInjections += 1
      continue
    }
    if (event.type === 'tool/dispatch-gate') {
      if (event.data?.decision === 'explicit-deny') explicitDeny += 1
      else if (typeof event.data?.name === 'string') unlisted[event.data.name] = (unlisted[event.data.name] ?? 0) + 1
      continue
    }
    if (event.type !== 'assistant/message' || event.data?.usage === undefined) continue
    requests += 1
    const content = event.data.message?.content
    if (!Array.isArray(content)) continue
    for (const block of content as { type?: unknown; name?: unknown }[]) {
      if (block.type !== 'tool-call' || typeof block.name !== 'string') continue
      toolCalls[block.name] = (toolCalls[block.name] ?? 0) + 1
    }
  }
  return {
    id: header.id,
    createdAt: header.createdAt,
    ...(typeof header.agentPreset === 'string' ? { agentPreset: header.agentPreset } : {}),
    requests,
    toolCalls,
    memoryInjections,
    dispatchGate: { unlisted, explicitDeny },
  }
}

/**
 * Read the usage facts of every durable session log under one DSH home.
 *
 * Directory entries are resolved with `stat`, so a workspace or session that is
 * a symlink (a fixture home, a redirected store) is read like a real directory.
 * @param home - DSH home directory holding `sessions/`.
 * @returns facts plus their workspace per readable session, in directory order.
 * @throws when the home has no `sessions/` directory.
 */
export function readSessions(home: string): LocatedSession[] {
  const root = join(home, 'sessions')
  if (!existsSync(root)) throw new Error(`${root} is not a sessions directory`)
  const located: LocatedSession[] = []
  for (const workspace of subdirectories(root)) {
    const workspaceRoot = join(root, workspace)
    for (const session of subdirectories(workspaceRoot)) {
      const log = join(workspaceRoot, session, 'session.v4.jsonl.zstd')
      if (!existsSync(log)) continue
      located.push({
        workspace,
        facts: parseSessionLog(zstdDecompressSync(readFileSync(log)).toString('utf8')),
      })
    }
  }
  return located
}

/**
 * Directory names under one path, following symlinks and skipping broken links.
 * @param path - directory to list.
 * @returns the names that resolve to directories.
 */
function subdirectories(path: string): string[] {
  const names: string[] = []
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (!existsSync(join(path, entry.name))) continue
    if (statSync(join(path, entry.name)).isDirectory()) names.push(entry.name)
  }
  return names
}

/** Total dispatch-gate decisions recorded in one session. */
function gateDecisions(facts: DispatchGateFacts): number {
  return facts.explicitDeny + Object.values(facts.unlisted).reduce((total, count) => total + count, 0)
}

/** Whether one session falls inside the requested window and filters. */
function inWindow(located: LocatedSession, options: MeasureOptions): boolean {
  if (options.workspace !== undefined && !located.workspace.includes(options.workspace)) return false
  if (options.requireGate === true && gateDecisions(located.facts.dispatchGate) === 0) return false
  if (options.preset !== undefined && located.facts.agentPreset !== options.preset) return false
  const day = utcDay(located.facts.createdAt)
  if (options.from !== undefined && day < options.from) return false
  if (options.to !== undefined && day > options.to) return false
  return true
}

/**
 * Measure one window over the durable session logs of a DSH home.
 * @param options - home, inclusive UTC day bounds, and optional preset/workspace filters.
 * @returns the aggregated window, its kill-criteria decisions, and its sessions.
 */
export function measureWindow(options: MeasureOptions): WindowReport {
  const located = readSessions(options.home).filter(session => inWindow(session, options))
  const sessions: WindowSession[] = located
    .map(({ workspace, facts }) => ({
      id: facts.id,
      workspace,
      ...(facts.agentPreset === undefined ? {} : { agentPreset: facts.agentPreset }),
      day: utcDay(facts.createdAt),
      requests: facts.requests,
      toolCalls: facts.toolCalls,
      memoryInjections: facts.memoryInjections,
    }))
    .sort((left, right) => left.day.localeCompare(right.day) || left.id.localeCompare(right.id))
  const usage = summarizeUsage(sessions)
  const unlisted: Record<string, number> = {}
  let explicitDeny = 0
  for (const { facts } of located) {
    explicitDeny += facts.dispatchGate.explicitDeny
    for (const [name, count] of Object.entries(facts.dispatchGate.unlisted)) {
      unlisted[name] = (unlisted[name] ?? 0) + count
    }
  }
  return {
    window: {
      ...(options.from === undefined ? {} : { from: options.from }),
      ...(options.to === undefined ? {} : { to: options.to }),
      ...(options.preset === undefined ? {} : { preset: options.preset }),
      ...(options.workspace === undefined ? {} : { workspace: options.workspace }),
      ...(options.requireGate === undefined ? {} : { requireGate: options.requireGate }),
    },
    usage,
    dispatchGate: { unlisted, explicitDeny },
    decisions: evaluateKillCriteria(usage, KILL_CRITERIA),
    sessions,
  }
}

/**
 * Render one report for a terminal, one fact per line.
 * @param report - a measured window.
 * @returns the human-readable rendering, newline terminated.
 */
export function renderReport(report: WindowReport): string {
  const { window, usage, decisions, sessions, dispatchGate } = report
  const toolCalls = Object.entries(usage.toolCalls)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, count]) => `${name} ${count}`)
    .join(' · ') || 'none'
  const gate = Object.entries(dispatchGate.unlisted)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, count]) => `${name} ${count}`)
    .join(' · ') || 'none'
  const lines = [
    `window ${window.from ?? 'open'}..${window.to ?? 'open'} (UTC days, inclusive)`
      + ` · preset ${window.preset ?? 'any'} · workspace ${window.workspace ?? 'any'}`
      + (window.requireGate === true ? ' · gate-mounted sessions only' : ''),
    `sessions ${usage.sessions} · requests ${usage.requests} · active days ${usage.activeDays}`
      + ` · memory injections ${usage.memoryInjections} · sessions with a skill ${usage.sessionsWithSkill}`,
    `tool calls ${toolCalls}`,
    `dispatch gate in audit · unlisted ${gate} · explicit deny ${dispatchGate.explicitDeny}`,
    ...decisions.map(decision => `decision ${decision.criterion}: ${decision.decision} — ${decision.reason}`),
    ...sessions.map(session =>
      `session ${session.id} preset ${session.agentPreset ?? 'unknown'} day ${session.day ?? 'unknown'}`
      + ` requests ${session.requests} skill ${session.toolCalls['skill'] ?? 0}`
      + ` memory ${session.memoryInjections}`),
  ]
  return `${lines.join('\n')}\n`
}

/** The launcher's own help text. */
export const HELP = `
Measure one longitudinal usage window over durable DSH session logs.

Usage: longitudinal-usage [options]

Options:
  --home <dir>        DSH home holding sessions/ (default: $DSH_HOME or ~/.dsh)
  --from <YYYY-MM-DD> first UTC day of the window, inclusive
  --to <YYYY-MM-DD>   last UTC day of the window, inclusive
  --preset <id>       only sessions whose header records this agent preset
  --workspace <text>  only workspace directories containing this text
  --require-gate      only sessions that recorded a dispatch-gate decision
                      (proof the F4 sota preset mounted; the hand-rolled sota
                      preset shares the id and records none)
  --json              print the report as JSON instead of a table
  -h, --help          print this help
`

/**
 * Parse one command line into a measurement request.
 * @param args - arguments after the script path.
 * @returns the request, whether to print JSON, and whether help was asked.
 * @throws when an option value is malformed or the day bounds are inverted.
 */
export function parseOptions(args: string[]): ParsedOptions {
  const parsed = parseArgs({
    args,
    allowPositionals: false,
    options: {
      home: { type: 'string' },
      from: { type: 'string' },
      to: { type: 'string' },
      preset: { type: 'string' },
      workspace: { type: 'string' },
      'require-gate': { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  })
  const options: MeasureOptions = {
    home: parsed.values.home ?? process.env.DSH_HOME ?? join(homedir(), '.dsh'),
    ...(parsed.values.from === undefined ? {} : { from: parsed.values.from }),
    ...(parsed.values.to === undefined ? {} : { to: parsed.values.to }),
    ...(parsed.values.preset === undefined ? {} : { preset: parsed.values.preset }),
    ...(parsed.values.workspace === undefined ? {} : { workspace: parsed.values.workspace }),
    ...(parsed.values['require-gate'] ? { requireGate: true } : {}),
  }
  for (const [name, value] of [['from', options.from], ['to', options.to]] as const) {
    if (value !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new Error(`--${name} must be a YYYY-MM-DD day, got ${JSON.stringify(value)}`)
    }
  }
  if (options.from !== undefined && options.to !== undefined && options.from > options.to) {
    throw new Error(`--from ${options.from} is after --to ${options.to}`)
  }
  return { options, json: parsed.values.json, help: parsed.values.help }
}

const entryPath = process.argv[1]
if (entryPath !== undefined && resolve(entryPath) === fileURLToPath(import.meta.url)) {
  try {
    const invocation = parseOptions(process.argv.slice(2))
    if (invocation.help) {
      process.stdout.write(HELP.trimStart())
    } else {
      const report = measureWindow(invocation.options)
      process.stdout.write(invocation.json ? `${JSON.stringify(report, null, 2)}\n` : renderReport(report))
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`longitudinal-usage: ${message}\n`)
    process.exitCode = 1
  }
}
