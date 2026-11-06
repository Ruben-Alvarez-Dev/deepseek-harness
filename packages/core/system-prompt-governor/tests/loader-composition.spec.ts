/** Real Loader composition: the mounted governor bounds MCP schemas in the assembled prompt. */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import * as systemPromptPlugin from '@deepseek-ai/dsh-system-prompt'
import * as governorPlugin from '@deepseek-ai/dsh-system-prompt-governor'
import * as sourcePlugin from './fixtures/source-tools.ts'
import type { ToolSchema } from '@deepseek-ai/dsh-llm'

let context: Context | undefined
let root: string | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

describe('prompt-governor real Loader composition', () => {
  it('compacts the mounted composition MCP schemas and leaves ordinary tools alone', async () => {
    root = await mkdtemp(join(tmpdir(), 'governor-loader-'))
    const fixture = await readFile(new URL('./fixtures/cordis.yml', import.meta.url), 'utf8')
    const configPath = join(root, 'cordis.yml')
    await writeFile(configPath, fixture)
    const ctx = context = new Context()
    ctx.baseUrl = pathToFileURL(root).href + '/'
    await ctx.plugin(Loader)
    ctx.loader.builtins.include = Include
    const modules = new Map<string, unknown>([
      ['@deepseek-ai/dsh-system-prompt', systemPromptPlugin],
      ['@deepseek-ai/dsh-system-prompt-governor', governorPlugin],
      ['./source-tools.ts', sourcePlugin],
    ])
    ctx.loader.internal = {
      version: 'v2',
      async import(specifier: string) {
        if (!modules.has(specifier)) throw new Error('Unexpected Loader import: ' + specifier)
        return modules.get(specifier)
      },
    } as unknown as NonNullable<typeof ctx.loader.internal>
    await ctx.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(configPath).href } })
    await ctx.loader.await()

    const tools = (await ctx.systemPrompt.assemble()).tools
    const mcp = tools.find((tool: ToolSchema) => tool.name === 'mcp__alpha__search')
    const bash = tools.find((tool: ToolSchema) => tool.name === 'bash')
    expect(tools.map(tool => tool.name).sort()).toEqual(['bash', 'mcp__alpha__search'])
    expect(mcp?.description).toBe('Search every indexed ...')
    const parameters = mcp?.parameters as {
      required?: unknown
      properties?: Record<string, { description?: unknown }>
    }
    expect(parameters.required).toEqual(['query'])
    expect(parameters.properties?.query?.description).toBeUndefined()
    expect(parameters.properties?.limit?.description).toBeUndefined()
    expect(bash).toEqual({
      name: 'bash',
      description: 'Run a command.',
      parameters: { type: 'object', properties: { command: { type: 'string', description: 'Command.' } } },
    })
  })
})
