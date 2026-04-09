export interface InsightDay {
  date: string
  moodScore: number | null
}

/**
 * Pure function: takes 7-day window, returns a Dutch summary string.
 * Rules:
 *   - < 2 non-null scores → insufficient data message
 *   - Compute trend via first/last non-null scores + average
 *   - High variance (stddev ≥ 1.2) → mixed
 *   - Rising trend (last > first by ≥ 1) → improving
 *   - Falling trend (last < first by ≥ 1) → declining
 *   - Otherwise → stable
 */
export function generateSummary(days: InsightDay[]): string {
  const scored = days.filter((d) => d.moodScore !== null) as { date: string; moodScore: number }[]

  if (scored.length < 2) {
    return 'Voeg meer notities toe voor inzichten in je stemmingspatroon.'
  }

  const scores = scored.map((d) => d.moodScore)
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  const variance = scores.reduce((sum, s) => sum + (s - avg) ** 2, 0) / scores.length
  const stddev = Math.sqrt(variance)

  const first = scores[0]
  const last = scores[scores.length - 1]
  const delta = last - first

  // Clear directional trend takes priority over variance
  if (delta >= 2) {
    return 'Je stemming is deze week verbeterd — de scores zijn gestegen.'
  }
  if (delta <= -2) {
    return 'Je stemming is deze week gedaald.'
  }
  // High variance without clear direction = mixed
  if (stddev >= 1.2) {
    return 'Een wisselende week met uiteenlopende stemmingen.'
  }
  if (delta >= 1) {
    return 'Je stemming is licht verbeterd deze week.'
  }
  if (delta <= -1) {
    return 'Je stemming is licht gedaald deze week.'
  }
  return 'Een stabiele week — je scores waren consistent.'
}
