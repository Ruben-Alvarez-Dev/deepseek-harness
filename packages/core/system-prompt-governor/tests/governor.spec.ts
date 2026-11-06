import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { ToolSchema } from '@deepseek-ai/dsh-llm'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import { estimateToolSchemasTokens } from '@deepseek-ai/dsh-token-meter'
import * as promptGovernor from '@deepseek-ai/dsh-system-prompt-governor'

function mcpTool(name: string, description: string): ToolSchema {
  return {
    name,
    description,
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query.' },
        options: {
          type: 'object',
          description: 'Search options.',
          properties: { limit: { type: 'number', description: 'Maximum results.' } },
          required: ['limit'],
        },
      },
      required: ['query'],
    },
  }
}

async function assemble(schemas: ToolSchema[], config?: promptGovernor.Config): Promise<ToolSchema[]> {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(promptGovernor, config)
  ctx.systemPrompt.tools(() => ({ schemas }))
  return (await ctx.systemPrompt.assemble()).tools
}

describe('prompt-governor', () => {
  it('leaves assemblies without MCP tools untouched', async () => {
    const schemas: ToolSchema[] = [
      { name: 'bash', description: 'Run a command.', parameters: { type: 'object', properties: {} } },
    ]
    await expect(assemble(schemas)).resolves.toEqual(schemas)
  })

  it('leaves MCP schemas untouched while they fit the budget', async () => {
    const schemas = [mcpTool('mcp__alpha__search', 'Search everything with a long and detailed description.')]
    const budget = estimateToolSchemasTokens(schemas) + 1
    await expect(assemble(schemas, { mcpSchemaTokenBudget: budget })).resolves.toEqual(schemas)
  })

  it('compacts the MCP tools beyond the budget and keeps them callable', async () => {
    const first = mcpTool('mcp__alpha__search', 'Search everything with a long and detailed description.')
    const second = mcpTool('mcp__beta__lookup', 'Look things up with another long and detailed description.')
    const budget = estimateToolSchemasTokens([first])
    const tools = await assemble([first, second], {
      mcpSchemaTokenBudget: budget,
      mcpToolDescriptionMaxLength: 20,
    })
    const governedFirst = tools.find(tool => tool.name === 'mcp__alpha__search')
    const governedSecond = tools.find(tool => tool.name === 'mcp__beta__lookup')
    expect(governedFirst).toEqual(first)
    expect(governedSecond?.description).toBe('Look things up wi...')
    const parameters = governedSecond?.parameters as {
      required?: unknown
      properties?: Record<string, { description?: unknown; required?: unknown; properties?: Record<string, { description?: unknown }> }>
    }
    expect(parameters.required).toEqual(['query'])
    expect(parameters.properties?.query?.description).toBeUndefined()
    const options = parameters.properties?.options
    expect(options?.description).toBeUndefined()
    expect(options?.required).toEqual(['limit'])
    expect(options?.properties?.limit?.description).toBeUndefined()
  })

  it('never compacts non-MCP tools, even when the budget is tiny', async () => {
    const bash: ToolSchema = {
      name: 'bash',
      description: 'Run a command with a very long description that would be truncated if governed.',
      parameters: { type: 'object', properties: { command: { type: 'string', description: 'The command.' } } },
    }
    const tools = await assemble([bash, mcpTool('mcp__alpha__search', 'Search.')], { mcpSchemaTokenBudget: 1 })
    expect(tools.find(tool => tool.name === 'bash')).toEqual(bash)
    expect(tools.find(tool => tool.name === 'mcp__alpha__search')?.description).toBe('Search.')
  })

  it('is deterministic for the same assembly and limits', async () => {
    const schemas = [
      mcpTool('mcp__alpha__search', 'Search everything with a long and detailed description.'),
      mcpTool('mcp__beta__lookup', 'Look things up with another long and detailed description.'),
    ]
    const budget = estimateToolSchemasTokens([schemas[0] as ToolSchema])
    const first = await assemble(schemas, { mcpSchemaTokenBudget: budget, mcpToolDescriptionMaxLength: 24 })
    const second = await assemble(schemas, { mcpSchemaTokenBudget: budget, mcpToolDescriptionMaxLength: 24 })
    expect(first).toEqual(second)
  })

  it('rejects non-positive budgets at load time', async () => {
    const ctx = new Context()
    await expect(ctx.plugin(promptGovernor, { mcpSchemaTokenBudget: 0 })).rejects.toThrow('mcpSchemaTokenBudget')
  })
})
