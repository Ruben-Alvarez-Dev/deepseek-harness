/**
 * Router quality gate: recall@8 and nDCG@8 over the labeled corpus, compared
 * with a plain token-overlap baseline. This is an internal retrieval gate on a
 * synthetic corpus, not a universal quality claim.
 */

import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { ToolSchema } from '@deepseek-ai/dsh-llm'
import type { SkillSummary } from '@deepseek-ai/dsh-skill'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { SkillMcpRouter } from '@deepseek-ai/dsh-skill-mcp-router'
import { CORPUS, QUERIES, type CorpusEntry } from './fixtures/corpus.ts'

const K = 8
const RECALL_TARGET = 0.9
const NDCG_TARGET = 0.8

let context: Context | undefined
afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
})

function asSkill(entry: CorpusEntry): SkillSummary {
  return {
    name: entry.name,
    description: entry.description,
    invocation: { modelInvocable: true, userInvocable: true },
    source: 'runtime',
    provider: 'runtime',
  }
}

function asTool(entry: CorpusEntry): ToolSchema {
  return { name: entry.name, description: entry.description, parameters: { type: 'object', properties: {} } }
}

function tokenize(value: string): string[] {
  return [...new Set(value.toLowerCase().matchAll(/[\p{L}\p{N}]{2,}/gu))].map(match => match[0])
}

function lexicalRank(query: string): string[] {
  const queryTerms = tokenize(query)
  return CORPUS
    .map((entry) => {
      const entryTerms = new Set(tokenize(`${entry.name} ${entry.description}`))
      return { name: entry.name, score: queryTerms.filter(term => entryTerms.has(term)).length }
    })
    .filter(entry => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
    .slice(0, K)
    .map(entry => entry.name)
}

function relevantNames(entry: typeof QUERIES[number]): Set<string> {
  return new Set(Object.entries(entry.relevance).filter(([, grade]) => grade >= 2).map(([name]) => name))
}

function recall(ranked: readonly string[], relevant: Set<string>): number {
  const hits = ranked.filter(name => relevant.has(name)).length
  return hits / Math.min(relevant.size, K)
}

function ndcg(ranked: readonly string[], entry: typeof QUERIES[number]): number {
  const gain = (name: string): number => {
    const grade = entry.relevance[name] ?? 0
    return 2 ** grade - 1
  }
  const dcg = ranked.reduce((total, name, index) => total + gain(name) / Math.log2(index + 2), 0)
  const ideal = Object.values(entry.relevance).sort((left, right) => right - left).slice(0, K)
  const idcg = ideal.reduce((total, grade, index) => total + (2 ** grade - 1) / Math.log2(index + 2), 0)
  return idcg === 0 ? 0 : dcg / idcg
}

function average(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length
}

describe('skill-mcp-router quality gate', () => {
  it('meets recall@8 >= 0.90 and nDCG@8 >= 0.80 and beats the lexical baseline', async () => {
    const ctx = context = new Context()
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(SkillMcpRouter)
    const router = ctx.skillRouter
    await router.indexSkills(CORPUS.filter(entry => entry.kind === 'skill').map(asSkill))
    await router.indexTools(CORPUS.filter(entry => entry.kind === 'tool').map(asTool))

    const routerRecall: number[] = []
    const routerNdcg: number[] = []
    const baselineRecall: number[] = []
    const baselineNdcg: number[] = []
    for (const entry of QUERIES) {
      const relevant = relevantNames(entry)
      const ranked = (await router.search(entry.query, { limit: K })).map(hit => hit.name)
      routerRecall.push(recall(ranked, relevant))
      routerNdcg.push(ndcg(ranked, entry))
      const baseline = lexicalRank(entry.query)
      baselineRecall.push(recall(baseline, relevant))
      baselineNdcg.push(ndcg(baseline, entry))
    }

    expect(QUERIES.length).toBeGreaterThanOrEqual(50)
    expect(CORPUS.length).toBeGreaterThan(0)
    expect(average(routerRecall)).toBeGreaterThanOrEqual(RECALL_TARGET)
    expect(average(routerNdcg)).toBeGreaterThanOrEqual(NDCG_TARGET)
    expect(average(routerRecall)).toBeGreaterThanOrEqual(average(baselineRecall))
    expect(average(routerNdcg)).toBeGreaterThanOrEqual(average(baselineNdcg))
  })
})
