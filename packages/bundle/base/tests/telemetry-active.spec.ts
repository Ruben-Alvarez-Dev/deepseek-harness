/**
 * The base composition with telemetry ACTIVE — the flank the process-boot
 * battery does not cover (MINOR-6 of the CH-050 audit, §6 of
 * `10-AUDITORIA-CH050.md`).
 *
 * Every process boot in the repository sets `DSH_TELEMETRY_DISABLED=1`, which
 * patches the `session-telemetry-otel` row to `disabled: true`. That made
 * MAJOR-4 invisible: the redaction row had received the backend's config, the
 * backend was left unconfigured, and the whole suite stayed green while a real
 * deployment booted without a telemetry backend. This spec pins the flank
 * without network egress: it parses the shipped patch the way the Loader does,
 * evaluates its `!!js` expressions, mounts both rows' plugins from that
 * evaluated config, and asserts each row owns exactly what its plugin declares.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import * as yaml from 'js-yaml'
import { entryListSchema } from '@deepseek-ai/cordis-plugin-include'
import { interpolate } from '@deepseek-ai/cordis-plugin-loader'
import { Context } from '@deepseek-ai/cordis'
import SessionStore from '@deepseek-ai/dsh-session'
import OpenTelemetrySessionBackend, { type Config as TelemetryConfig } from '@deepseek-ai/dsh-session-telemetry-otel'
import * as telemetryRedaction from '@deepseek-ai/dsh-telemetry-redaction'

/** The shipped base layer, sibling of this test directory. */
const PATCH = fileURLToPath(new URL('../cordis.patch.yml', import.meta.url))

/** The OTLP endpoint the shipped row names when its env override is unset. */
const SHIPPED_OTLP_URL = 'https://harness-telemetry.deepseeksvc.com/v1/logs'

/** A loopback endpoint nothing listens on: hermetic, yet a valid URL. */
const HERMETIC_OTLP_URL = 'http://127.0.0.1:9/v1/logs'

/** One Loader entry of the base layer. */
interface Row {
  id?: string
  config?: unknown
  disabled?: unknown
}

/** Parse the patch list the way the Loader does, with `!!js` preserved as data. */
function baseRows(): Row[] {
  const parsed = yaml.load(readFileSync(PATCH, 'utf8'), { schema: entryListSchema })
  if (!Array.isArray(parsed)) throw new TypeError('the base patch must parse to a patch list')
  return parsed.flatMap((patch): Row[] => typeof patch === 'object' && patch !== null
    ? ((patch as { insert?: Row[] }).insert ?? [])
    : [])
}

/** Read one row, failing loudly when the layer stops mounting it. */
function row(id: string): Row {
  const found = baseRows().find(candidate => candidate.id === id)
  if (found === undefined) throw new Error(`the base patch must mount ${id}`)
  return found
}

/** Evaluate one row's config exactly as the Loader would, against a scoped `process.env`. */
function configFor(entry: Row, env: Record<string, string>): TelemetryConfig {
  return interpolate({ process: { env } }, entry.config) as TelemetryConfig
}

describe('dsh-base telemetry rows with telemetry active', () => {
  it('gives the OTel backend its own config and the redaction row none', () => {
    const backend = row('session-telemetry-otel')
    const redaction = row('session-telemetry-redaction')
    // MAJOR-4's root cause: a row inserted between `name:` and `config:`.
    expect(backend.config).toBeDefined()
    expect(redaction.config).toBeUndefined()
    // Neither row is hard-disabled in the layer; the switch is a boot patch.
    expect(backend.disabled).toBeUndefined()
    expect(redaction.disabled).toBeUndefined()
  })

  it('evaluates the shipped defaults a deployment boots with', () => {
    const config = configFor(row('session-telemetry-otel'), {})
    expect(config.mode).toBe('FEEDBACK_ONLY')
    expect(config.shutdownTimeoutMillis).toBe(3000)
    expect(config.exporter?.url).toBe(SHIPPED_OTLP_URL)
    expect(config.exporter).toMatchObject({ compression: 'gzip', timeoutMillis: 1000 })
    expect(config.processor).toEqual({
      scheduledDelayMillis: 10_000,
      maxQueueSize: 2048,
      maxExportBatchSize: 2048,
      exportTimeoutMillis: 1500,
    })
  })

  it('keeps the telemetry switches live', () => {
    // MAJOR-4's observable symptom was that DSH_TELEMETRY_MODE stopped applying
    // once the config had been handed to a plugin that ignores it.
    expect(configFor(row('session-telemetry-otel'), { DSH_TELEMETRY_MODE: 'DISABLED' }).mode).toBe('DISABLED')
    expect(configFor(row('session-telemetry-otel'), { DSH_TELEMETRY_OTLP_URL: HERMETIC_OTLP_URL }).exporter?.url)
      .toBe(HERMETIC_OTLP_URL)
  })

  it('mounts the backend from that config', async () => {
    // The exporter object is constructed but never connects: no record is
    // captured here, and the URL has nothing listening on it.
    const config = configFor(row('session-telemetry-otel'), { DSH_TELEMETRY_OTLP_URL: HERMETIC_OTLP_URL })
    const ctx = new Context()
    try {
      await ctx.plugin(SessionStore)
      await ctx.plugin(OpenTelemetrySessionBackend, config)
      expect(ctx.sessionTelemetry).toBeDefined()
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('redacts through the shipped row', async () => {
    const ctx = new Context()
    try {
      await ctx.plugin(telemetryRedaction)
      const input = {
        channel: 'ledger' as const,
        time: 1,
        severity: 'info' as const,
        attributes: { 'session.id': 'composition' },
        body: { text: 'key sk-abcdefghijklmnop1234' },
      }
      const output = ctx.waterfall('session-telemetry/record', input, () => input) as typeof input
      expect(JSON.stringify(output)).not.toContain('sk-abcdefghijklmnop1234')
    } finally {
      await ctx.fiber.dispose()
    }
  })
})
