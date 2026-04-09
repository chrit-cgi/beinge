import { describe, it, expect } from 'bun:test'
import { toCSV } from '../../app01/src/export-csv'

describe('toCSV', () => {
  it('includes header row', () => {
    const result = toCSV([])
    expect(result.startsWith('date,score,note')).toBe(true)
  })

  it('produces one row per entry', () => {
    const result = toCSV([
      { date: '2026-01-01', moodScore: 3, noteText: 'Good day' },
      { date: '2026-01-02', moodScore: 4, noteText: 'Better' },
    ])
    const lines = result.trim().split('\n')
    expect(lines.length).toBe(3) // header + 2 entries
  })

  it('uses empty string for null moodScore', () => {
    const result = toCSV([{ date: '2026-01-01', moodScore: null, noteText: 'No score' }])
    expect(result).toContain('2026-01-01,,')
  })

  it('double-quotes noteText containing commas', () => {
    const result = toCSV([{ date: '2026-01-01', moodScore: 3, noteText: 'Lunch, good' }])
    expect(result).toContain('"Lunch, good"')
  })

  it('double-quotes noteText containing newlines', () => {
    const result = toCSV([{ date: '2026-01-01', moodScore: 3, noteText: 'Line1\nLine2' }])
    expect(result).toContain('"Line1\nLine2"')
  })

  it('escapes internal double-quotes by doubling them', () => {
    const result = toCSV([{ date: '2026-01-01', moodScore: 3, noteText: 'He said "hi"' }])
    expect(result).toContain('"He said ""hi"""')
  })

  it('handles empty noteText', () => {
    const result = toCSV([{ date: '2026-01-01', moodScore: 2, noteText: null }])
    const lines = result.trim().split('\n')
    expect(lines[1]).toBe('2026-01-01,2,')
  })
})
