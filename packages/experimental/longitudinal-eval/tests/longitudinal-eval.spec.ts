/** Metrics, usage summary, and kill-criteria decisions with hand-computed expectations. */

import { describe, expect, it } from 'vitest'
import {
  evaluateKillCriteria,
  ndcgAtK,
  recallAtK,
  summarizeUsage,
  type SessionUsageSample,
} from '@deepseek-ai/dsh-experimental-longitudinal-eval'

describe('retrieval metrics', () => {
  it('computes recall@k against the min(relevant, k) denominator', () => {
    expect(recallAtK(['a', 'b', 'c'], new Set(['b']), 2)).toBe(1)
    expect(recallAtK(['x', 'a', 'b'], new Set(['a', 'b']), 3)).toBe(1)
    expect(recallAtK(['x', 'y'], new Set(['a', 'b']), 1)).toBe(0)
    expect(recallAtK(['a'], new Set(['a', 'b']), 1)).toBe(1)
    expect(recallAtK(['a'], new Set(), 2)).toBe(0)
  })

  it('computes nDCG@k with graded gain and an ideal ordering', () => {
    expect(ndcgAtK({ ranked: ['a', 'b', 'c'], relevance: { a: 3, b: 2, c: 1 } }, 3)).toBe(1)
    expect(ndcgAtK({ ranked: ['b', 'a'], relevance: { a: 3, b: 2 } }, 2)).toBeCloseTo(0.834, 3)
    expect(ndcgAtK({ ranked: ['a'], relevance: { a: 1 } }, 5)).toBe(1)
    expect(ndcgAtK({ ranked: ['x'], relevance: {} }, 3)).toBe(0)
  })

  it('rejects an invalid cutoff', () => {
    expect(() => recallAtK([], new Set(), 0)).toThrow('positive integer')
    expect(() => ndcgAtK({ ranked: [], relevance: {} }, 1.5)).toThrow('positive integer')
  })
})

const SAMPLES: readonly SessionUsageSample[] = [
  { requests: 2, toolCalls: { skill: 1 }, memoryInjections: 0, day: '2026-11-01' },
  { requests: 3, toolCalls: { bash: 2 }, memoryInjections: 0, day: '2026-11-01' },
  { requests: 1, toolCalls: {}, memoryInjections: 2, day: '2026-11-02' },
]

describe('usage summary', () => {
  it('aggregates sessions, requests, tool calls, injections and days', () => {
    expect(summarizeUsage(SAMPLES)).toEqual({
      sessions: 3,
      requests: 6,
      toolCalls: { skill: 1, bash: 2 },
      sessionsWithSkill: 1,
      memoryInjections: 2,
      activeDays: 2,
    })
  })

  it('handles an empty window', () => {
    expect(summarizeUsage([])).toEqual({
      sessions: 0,
      requests: 0,
      toolCalls: {},
      sessionsWithSkill: 0,
      memoryInjections: 0,
      activeDays: 0,
    })
  })
})

describe('kill criteria', () => {
  const empty = summarizeUsage([{ requests: 1, toolCalls: {}, memoryInjections: 0, day: '2026-11-01' }])

  it('keeps memory when the window is below its session minimum', () => {
    const [decision] = evaluateKillCriteria(empty, { memory: { minInjections: 1, minSessions: 3 } })
    expect(decision?.decision).toBe('keep')
    expect(decision?.reason).toContain('below the 3-session minimum')
  })

  it('disables memory when the window has too few injections', () => {
    const summary = summarizeUsage([...SAMPLES, ...SAMPLES])
    const [decision] = evaluateKillCriteria(summary, { memory: { minInjections: 1, minSessions: 6 } })
    expect(decision?.decision).toBe('keep')
    const emptySummary = summarizeUsage([...SAMPLES].map(sample => ({ ...sample, memoryInjections: 0 })))
    const [disabled] = evaluateKillCriteria(emptySummary, { memory: { minInjections: 1, minSessions: 3 } })
    expect(disabled?.decision).toBe('disable')
  })

  it('evaluates the skill-session ratio once the session minimum is met', () => {
    const [keep] = evaluateKillCriteria(summarizeUsage(SAMPLES), { skills: { minSessionRatio: 0.3, minSessions: 3 } })
    expect(keep?.decision).toBe('keep')
    const [disable] = evaluateKillCriteria(summarizeUsage(SAMPLES), { skills: { minSessionRatio: 0.5, minSessions: 3 } })
    expect(disable?.decision).toBe('disable')
  })

  it('returns no decisions when no criterion is configured', () => {
    expect(evaluateKillCriteria(summarizeUsage(SAMPLES), {})).toEqual([])
  })
})
