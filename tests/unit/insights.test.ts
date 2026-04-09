import { describe, it, expect } from 'bun:test'
import { generateSummary } from '../../app01/src/insights'

function day(date: string, moodScore: number | null) {
  return { date, moodScore }
}

const SEVEN_DAYS = [
  day('2026-04-01', null),
  day('2026-04-02', null),
  day('2026-04-03', null),
  day('2026-04-04', null),
  day('2026-04-05', null),
  day('2026-04-06', null),
  day('2026-04-07', null),
]

describe('generateSummary', () => {
  it('returns insufficient-data message when fewer than 2 non-null scores', () => {
    const result = generateSummary(SEVEN_DAYS)
    expect(result).toContain('meer notities')
  })

  it('returns insufficient-data message when only 1 score', () => {
    const days = [...SEVEN_DAYS]
    days[3] = day('2026-04-04', 3)
    const result = generateSummary(days)
    expect(result).toContain('meer notities')
  })

  it('returns improving trend for rising scores', () => {
    const days = [
      day('2026-04-01', 2),
      day('2026-04-02', 2),
      day('2026-04-03', 3),
      day('2026-04-04', 4),
      day('2026-04-05', 5),
      day('2026-04-06', null),
      day('2026-04-07', null),
    ]
    const result = generateSummary(days)
    expect(result.length).toBeGreaterThan(0)
    // Should contain a positive trend indicator
    expect(result).toMatch(/verbeterd|gestegen|stijg/i)
  })

  it('returns stable/steady trend for equal scores', () => {
    const days = SEVEN_DAYS.map((d, i) => day(d.date, 3))
    const result = generateSummary(days)
    expect(result).toMatch(/stabiel|consistent/i)
  })

  it('returns declining trend for falling scores', () => {
    const days = [
      day('2026-04-01', 5),
      day('2026-04-02', 4),
      day('2026-04-03', 3),
      day('2026-04-04', 2),
      day('2026-04-05', 1),
      day('2026-04-06', null),
      day('2026-04-07', null),
    ]
    const result = generateSummary(days)
    expect(result).toMatch(/gedaald|daald|lager/i)
  })

  it('returns mixed trend for high-variance scores', () => {
    const days = [
      day('2026-04-01', 2),
      day('2026-04-02', 5),
      day('2026-04-03', 1),
      day('2026-04-04', 5),
      day('2026-04-05', 2),
      day('2026-04-06', null),
      day('2026-04-07', null),
    ]
    const result = generateSummary(days)
    expect(result).toMatch(/wisselend|gemengd/i)
  })

  it('always returns a non-empty string', () => {
    const result = generateSummary(SEVEN_DAYS)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})
