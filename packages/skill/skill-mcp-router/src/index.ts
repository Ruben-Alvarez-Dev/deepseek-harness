/**
 * Zero-embedding router over skill and MCP-tool metadata.
 *
 * The service keeps an in-memory SQLite FTS5 index (`node:sqlite`) of skill
 * names/descriptions and visible MCP tool schemas, and answers ranked queries
 * for the current task. Ranking is BM25 over FTS5 tokens: no embeddings, no
 * model calls, and no hidden capability — consumers decide what to surface.
 *
 * @module @deepseek-ai/dsh-skill-mcp-router
 */

import { createHash } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import { Context, Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-agent'
import type { ToolSchema } from '@deepseek-ai/dsh-llm'
import type { SkillSummary } from '@deepseek-ai/dsh-skill'
import type {} from '@deepseek-ai/dsh-system-prompt'

export const name = 'skill-mcp-router'

/** Indexed entry family. */
export type RouterEntryKind = 'skill' | 'tool'

/** Deployment-owned router configuration. */
export interface Config {
  /** SQLite database path; defaults to an in-memory index. */
  path?: string
}

/** Validate and default the router configuration. */
export const Config: z<Config> = z.object({
  path: z.string().default(':memory:'),
})

/** One ranked entry returned by {@link SkillMcpRouter.search}. */
export interface RankedEntry {
  /** Indexed family the entry belongs to. */
  readonly kind: RouterEntryKind
  /** Skill name or MCP tool name. */
  readonly name: string
  /** Higher is more relevant (negated FTS5 bm25). */
  readonly score: number
}

/** Optional filters for one ranked query. */
export interface SearchOptions {
  /** Restrict results to one family. */
  readonly kind?: RouterEntryKind
  /** Maximum returned entries; positive integer, defaults to 8. */
  readonly limit?: number
}

/** Resolved router configuration. */
interface ResolvedConfig {
  readonly path: string
}

const DEFAULT_LIMIT = 8
const MAX_LIMIT = 100
const MAX_QUERY_TERMS = 16

interface RouterRow {
  readonly kind: RouterEntryKind
  readonly name: string
  readonly body: string
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    skillRouter: SkillMcpRouter
  }
}

/** FTS5-backed zero-embedding router for skills and MCP tool metadata. */
export class SkillMcpRouter extends Service {
  static inject = ['tools']

  static Config: z<Config> = z.object({
    path: z.string().default(':memory:'),
  })

  /** Resolved immutable configuration. */
  readonly config: ResolvedConfig

  private database: DatabaseSync | undefined
  private opening: Promise<DatabaseSync> | undefined
  private readonly digests = new Map<RouterEntryKind, string>()
  private closed = false

  constructor(ctx: Context, config: Config = {}) {
    super(ctx, 'skillRouter')
    const path = config.path ?? ':memory:'
    if (typeof path !== 'string' || path.length === 0) {
      throw new Error('skill-mcp-router: path must be a non-empty string')
    }
    this.config = { path }
    ctx.effect(() => async () => this.close(), 'skillRouter.close')
    // Refresh the tool partition before each assembly so the index reflects the
    // agent's visible MCP tools; consumers of the skill partition index on
    // demand from their own snapshot.
    ctx.on('system-prompt/assemble', async (_assembly, context, next) => {
      const assembly = await next()
      // The final assembly is the authoritative model-visible tool set for this
      // request, including prompt-level providers the tool registry never sees.
      if (context.agent !== undefined) await this.indexTools(assembly.tools)
      return assembly
    }, { prepend: true })
  }

  /**
   * Index the model-invocable skill catalog summary.
   * @param skills - summaries from `ctx.skills.snapshot()`.
   * @returns completion once the partition is current.
   */
  async indexSkills(skills: readonly SkillSummary[]): Promise<void> {
    await this.rebuild('skill', skills.map(skill => ({
      kind: 'skill',
      name: skill.name,
      body: [skill.name.replaceAll('-', ' '), skill.description, skill.whenToUse ?? ''].join(' '),
    })))
  }

  /**
   * Index the visible MCP tool schemas; non-MCP tools are ignored.
   * @param tools - model-visible tool schemas for one agent scope.
   * @returns completion once the partition is current.
   */
  async indexTools(tools: readonly ToolSchema[]): Promise<void> {
    await this.rebuild('tool', tools
      .filter(tool => tool.name.startsWith('mcp__'))
      .map(tool => ({
        kind: 'tool',
        name: tool.name,
        body: [tool.name.replaceAll('__', ' ').replaceAll('_', ' '), tool.description].join(' '),
      })))
  }

  /**
   * Rank indexed entries for one task query.
   * @param query - natural-language task or keywords.
   * @param options - optional family filter and result limit.
   * @returns ranked entries, most relevant first; empty for a query with no terms.
   */
  async search(query: string, options: SearchOptions = {}): Promise<RankedEntry[]> {
    const terms = tokenizeRouterQuery(query)
    if (terms.length === 0) return []
    const limit = options.limit ?? DEFAULT_LIMIT
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      throw new Error(`skill-mcp-router: limit must be an integer between 1 and ${MAX_LIMIT}`)
    }
    const match = terms.map(term => `"${term.replaceAll('"', '""')}"`).join(' OR ')
    const db = await this.ensureDatabase()
    const sql = options.kind === undefined
      ? 'SELECT kind, name, bm25(entries) AS rank FROM entries WHERE entries MATCH ? ORDER BY rank LIMIT ?'
      : 'SELECT kind, name, bm25(entries) AS rank FROM entries WHERE entries MATCH ? AND kind = ? ORDER BY rank LIMIT ?'
    const rows = options.kind === undefined
      ? db.prepare(sql).all(match, limit)
      : db.prepare(sql).all(match, options.kind, limit)
    return (rows as Array<{ kind: RouterEntryKind; name: string; rank: number }>).map(row => ({
      kind: row.kind,
      name: row.name,
      score: -row.rank,
    }))
  }

  /** Close the index; the service is unusable afterwards. */
  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    const opening = this.opening
    this.opening = undefined
    if (opening !== undefined) {
      try {
        const db = await opening
        db.close()
        return
      } catch {
        // A database that never opened has nothing to close.
        return
      }
    }
    this.database?.close()
    this.database = undefined
    this.digests.clear()
  }

  private async rebuild(kind: RouterEntryKind, rows: readonly RouterRow[]): Promise<void> {
    const digest = createHash('sha256').update(JSON.stringify(rows)).digest('hex')
    if (this.digests.get(kind) === digest) return
    const db = await this.ensureDatabase()
    db.exec('BEGIN')
    try {
      db.prepare('DELETE FROM entries WHERE kind = ?').run(kind)
      const insert = db.prepare('INSERT INTO entries(kind, name, body) VALUES (?, ?, ?)')
      for (const row of rows) insert.run(row.kind, row.name, row.body)
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
    this.digests.set(kind, digest)
  }

  private async ensureDatabase(): Promise<DatabaseSync> {
    if (this.closed) throw new Error('skill-mcp-router: service is closed')
    if (this.database !== undefined) return this.database
    this.opening ??= (async () => {
      const { DatabaseSync } = await import('node:sqlite')
      const db = new DatabaseSync(this.config.path)
      db.exec("CREATE VIRTUAL TABLE IF NOT EXISTS entries USING fts5(kind UNINDEXED, name, body, tokenize='porter unicode61')")
      this.database = db
      return db
    })()
    return this.opening
  }
}

/**
 * Canonical query terms: lowercased letter/digit runs of at least two
 * characters, deduplicated and capped so one query cannot explode into a
 * giant MATCH expression.
 * @param query - raw query text.
 * @returns usable terms in first-seen order.
 */
export function tokenizeRouterQuery(query: string): string[] {
  const terms: string[] = []
  for (const match of query.toLowerCase().matchAll(/[\p{L}\p{N}]{2,}/gu)) {
    const term = match[0]
    if (!terms.includes(term)) terms.push(term)
    if (terms.length >= MAX_QUERY_TERMS) break
  }
  return terms
}

export default SkillMcpRouter
