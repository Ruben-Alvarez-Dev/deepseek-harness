/** Test composition source: one MCP tool and one ordinary tool schema. */

import type { Context } from '@deepseek-ai/cordis'

export const name = 'governor-test-source-tools'

/** Register the tool-schema provider the governor transforms. */
export function apply(ctx: Context): void {
  ctx.inject(['systemPrompt'], (inner) => {
    inner.systemPrompt.tools(() => ({
      schemas: [
        {
          name: 'mcp__alpha__search',
          description: 'Search every indexed document with a deliberately long description.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query text.' },
              limit: { type: 'number', description: 'Maximum results.' },
            },
            required: ['query'],
          },
        },
        {
          name: 'bash',
          description: 'Run a command.',
          parameters: { type: 'object', properties: { command: { type: 'string', description: 'Command.' } } },
        },
      ],
    }))
  })
}
