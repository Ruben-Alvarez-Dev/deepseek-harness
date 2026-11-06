/** Test composition source: one allowlisted tool and one gated-out tool. */

import type { Context } from '@deepseek-ai/cordis'
import { defineContentToolFixture } from '@deepseek-ai/dsh-tools'

export const name = 'dispatch-gate-test-source-tools'

/** Register the tools the composition gate filters. */
export function apply(ctx: Context): void {
  ctx.inject(['tools'], (inner) => {
    inner.tools.register(defineContentToolFixture({
      name: 'safe', description: 'Allowed by the policy', parameters: {},
      async execute() { return [{ type: 'text' as const, text: 'safe ran' }] },
    }))
    inner.tools.register(defineContentToolFixture({
      name: 'danger', description: 'Not in the allowlist', parameters: {},
      async execute() { return [{ type: 'text' as const, text: 'danger ran' }] },
    }))
  })
}
