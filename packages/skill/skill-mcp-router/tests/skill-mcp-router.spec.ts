/** Zero-embedding router: indexing, ranking, filtering, lifecycle, and assembly refresh. */

import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { ToolSchema } from '@deepseek-ai/dsh-llm'
import type { SkillSummary } from '@deepseek-ai/dsh-skill'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { SkillMcpRouter, tokenizeRouterQuery } from '@deepseek-ai/dsh-skill-mcp-router'

let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
})

function skill(name: string, description: string, whenToUse?: string): SkillSummary {
  return {
    name,
    description,
    ...whenToUse === undefined ? {} : { whenToUse },
    invocation: { modelInvocable: true, userInvocable: true },
    source: 'runtime',
    provider: 'runtime',
  }
}

function mcpTool(name: string, description: string): ToolSchema {
  return { name, description, parameters: { type: 'object', properties: {} } }
}

async function setup(): Promise<{ ctx: Context; router: SkillMcpRouter }> {
  const ctx = context = new Context()
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(SkillMcpRouter)
  return { ctx, router: ctx.skillRouter }
}

describe('skill-mcp-router indexing and ranking', () => {
  it('ranks skills by the task query', async () => {
    const { router } = await setup()
    await router.indexSkills([
      skill('deploy-pipeline', 'Deploy services to production with rollbacks'),
      skill('data-report', 'Build dashboards and reports from datasets'),
      skill('git-commit', 'Create clean git commits'),
    ])
    const hits = await router.search('rollback production deployment')
    expect(hits[0]).toMatchObject({ kind: 'skill', name: 'deploy-pipeline' })
    expect(hits.map(hit => hit.name)).not.toContain('git-commit')
  })

  it('ranks MCP tools and ignores non-MCP schemas', async () => {
    const { router } = await setup()
    await router.indexTools([
      mcpTool('mcp__git__push', 'Push commits to a remote branch'),
      mcpTool('mcp__db__query', 'Run SQL queries against the database'),
      { name: 'bash', description: 'Run a shell command', parameters: { type: 'object', properties: {} } },
    ])
    const hits = await router.search('push commits remote')
    expect(hits).toEqual([{ kind: 'tool', name: 'mcp__git__push', score: expect.any(Number) as unknown as number }])
  })

  it('filters by family and honors the limit', async () => {
    const { router } = await setup()
    await router.indexSkills([skill('deploy-pipeline', 'Deploy services'), skill('deploy-mobile', 'Deploy mobile apps')])
    await router.indexTools([mcpTool('mcp__deploy__release', 'Deploy a release')])
    const skillsOnly = await router.search('deploy', { kind: 'skill' })
    expect(skillsOnly.every(hit => hit.kind === 'skill')).toBe(true)
    await expect(router.search('deploy', { limit: 1 })).resolves.toHaveLength(1)
  })

  it('matches accent-insensitive terms through unicode61', async () => {
    const { router } = await setup()
    await router.indexSkills([skill('diseno-interfaz', 'Diseño de interfaz de usuario')])
    const hits = await router.search('diseno interfaz')
    expect(hits.map(hit => hit.name)).toContain('diseno-interfaz')
  })

  it('returns no entries for a query with no usable terms and never throws on punctuation', async () => {
    const { router } = await setup()
    await router.indexSkills([skill('deploy-pipeline', 'Deploy services')])
    await expect(router.search('   ')).resolves.toEqual([])
    await expect(router.search('" OR 1=1; --')).resolves.toEqual([])
  })

  it('is deterministic across identical queries and idempotent across reindexing', async () => {
    const { router } = await setup()
    const skills = [skill('deploy-pipeline', 'Deploy services'), skill('data-report', 'Build reports')]
    await router.indexSkills(skills)
    const first = await router.search('deploy')
    const second = await router.search('deploy')
    expect(second).toEqual(first)
    await router.indexSkills(skills)
    await expect(router.search('deploy')).resolves.toEqual(first)
  })

  it('refreshes the tool partition from the assembly waterfall', async () => {
    const { ctx, router } = await setup()
    ctx.systemPrompt.tools(() => ({
      schemas: [mcpTool('mcp__deploy__release', 'Deploy a release to the cluster')],
    }))
    const agent = {} as unknown as Agent
    await ctx.systemPrompt.assemble({ agent })
    const hits = await router.search('release cluster')
    expect(hits.map(hit => hit.name)).toContain('mcp__deploy__release')
  })

  it('rejects searches after close and validates configuration', async () => {
    const { router } = await setup()
    await router.close()
    await expect(router.search('deploy')).rejects.toThrow('closed')
    const fresh = new Context()
    try {
      expect(() => new SkillMcpRouter(fresh, { path: '' })).toThrow('path')
    } finally {
      await fresh.fiber.dispose()
    }
  })

  it('tokenizes, deduplicates, and caps terms', () => {
    expect(tokenizeRouterQuery('Deploy  deploy PIPELINE')).toEqual(['deploy', 'pipeline'])
    expect(tokenizeRouterQuery('x y')).toEqual([])
    expect(tokenizeRouterQuery(Array.from({ length: 20 }, (_, index) => `term${index}`).join(' '))).toHaveLength(16)
  })
})
