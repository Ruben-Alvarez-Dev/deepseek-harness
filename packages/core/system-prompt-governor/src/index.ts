/**
 * Outbound prompt governor: bounds the MCP tool-schema surface inside the
 * `system-prompt/assemble` waterfall.
 *
 * The assembly this plugin returns is the one the agent loop writes into
 * `request/header`, so the governed schemas stay reconstructable from the
 * session log (model-visible ⟺ logged).
 *
 * @module @deepseek-ai/dsh-system-prompt-governor
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { boundDescription, type ToolSchema } from '@deepseek-ai/dsh-llm'
import { estimateToolSchemasTokens } from '@deepseek-ai/dsh-token-meter'
import type { PromptAssembly } from '@deepseek-ai/dsh-system-prompt'

/** Plugin name used by Cordis compositions. */
export const name = 'prompt-governor'

const DEFAULT_MCP_SCHEMA_TOKEN_BUDGET = 3000
const DEFAULT_MCP_TOOL_DESCRIPTION_MAX_LENGTH = 120
const MCP_TOOL_PREFIX = 'mcp__'

/** Deployment-varying limits for the outbound prompt governor. */
export interface Config {
  /**
   * Token budget for the schema surface of all MCP tools combined. Tools
   * beyond the budget keep their name, required arguments, and exact parameter
   * structure; only parameter descriptions/examples and long tool
   * descriptions are dropped, so every tool remains callable.
   */
  mcpSchemaTokenBudget?: number
  /** Maximum tool description length for governed MCP tools; minimum 3. */
  mcpToolDescriptionMaxLength?: number
}

/** Validate and default the outbound prompt governor configuration. */
export const Config: z<Config> = z.object({
  mcpSchemaTokenBudget: z.number().default(DEFAULT_MCP_SCHEMA_TOKEN_BUDGET),
  mcpToolDescriptionMaxLength: z.number().default(DEFAULT_MCP_TOOL_DESCRIPTION_MAX_LENGTH),
})

/** Validated limits one governance pass uses. */
export interface GovernorLimits {
  readonly mcpSchemaTokenBudget: number
  readonly mcpToolDescriptionMaxLength: number
}

/**
 * Register the governor on the assembly waterfall.
 * @param ctx - the plugin context whose scope owns the listener.
 * @param config - optional validated limits.
 */
export function apply(ctx: Context, config: Config = {}): void {
  const mcpSchemaTokenBudget = config.mcpSchemaTokenBudget ?? DEFAULT_MCP_SCHEMA_TOKEN_BUDGET
  const mcpToolDescriptionMaxLength = config.mcpToolDescriptionMaxLength
    ?? DEFAULT_MCP_TOOL_DESCRIPTION_MAX_LENGTH
  assertPositiveInteger('mcpSchemaTokenBudget', mcpSchemaTokenBudget)
  assertPositiveInteger('mcpToolDescriptionMaxLength', mcpToolDescriptionMaxLength, 3)
  const limits: GovernorLimits = { mcpSchemaTokenBudget, mcpToolDescriptionMaxLength }
  ctx.on('system-prompt/assemble', async (_assembly, _context, next) => governPromptTools(await next(), limits))
}

/**
 * Bound the MCP tool-schema surface of one assembled prompt.
 *
 * MCP tools are kept in canonical order; the prefix that fits the budget keeps
 * its full schema and every later MCP tool is compacted. Non-MCP tools are
 * never changed. The result is deterministic for identical input and budgets.
 * @param assembly - assembly returned by downstream listeners.
 * @param limits - validated token budget and description length.
 * @returns the same assembly when nothing needs governance, else a copy with
 *   compacted MCP tool schemas.
 */
export function governPromptTools(assembly: PromptAssembly, limits: GovernorLimits): PromptAssembly {
  const mcpTools = assembly.tools.filter(tool => tool.name.startsWith(MCP_TOOL_PREFIX))
  if (mcpTools.length === 0) return assembly
  if (estimateToolSchemasTokens(mcpTools) <= limits.mcpSchemaTokenBudget) return assembly
  const governed = new Set<string>()
  let spent = 0
  for (const tool of mcpTools) {
    const tokens = estimateToolSchemasTokens([tool])
    if (spent + tokens <= limits.mcpSchemaTokenBudget) {
      spent += tokens
      continue
    }
    governed.add(tool.name)
  }
  if (governed.size === 0) return assembly
  return {
    ...assembly,
    tools: assembly.tools.map(tool => governed.has(tool.name)
      ? compactTool(tool, limits.mcpToolDescriptionMaxLength)
      : tool),
  }
}

/**
 * Drop the model-facing hints of one MCP tool while keeping its callable
 * structure: names, types, required lists, enums, defaults, and nesting stay.
 * @param tool - tool schema to compact.
 * @param descriptionMaxLength - tool description cap; minimum 3.
 * @returns a new schema; the input is not mutated.
 */
function compactTool(tool: ToolSchema, descriptionMaxLength: number): ToolSchema {
  return {
    name: tool.name,
    description: boundDescription(tool.description, descriptionMaxLength),
    parameters: stripSchemaHints(tool.parameters) as Record<string, unknown>,
  }
}

/** Recursively remove documentation-only JSON Schema keys. */
function stripSchemaHints(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripSchemaHints)
  if (value === null || typeof value !== 'object') return value
  const result: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key === 'description' || key === 'examples' || key === '$comment') continue
    result[key] = stripSchemaHints(child)
  }
  return result
}

function assertPositiveInteger(name: string, value: number, minimum = 1): void {
  if (!Number.isInteger(value) || value < minimum) {
    throw new Error(`prompt-governor: ${name} must be an integer greater than or equal to ${minimum}`)
  }
}
