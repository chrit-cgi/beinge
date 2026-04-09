import { Hono } from 'hono'
import { eq, and, gte, lte } from 'drizzle-orm'
import { db } from '../../../shared/db/client'
import { entries } from '../db/schema'
import { generateSummary } from '../insights'
import { rateLimit } from '../../../shell/src/middleware/rate-limit'
import { log } from '../../../shared/logging'

export const insightsRouter = new Hono()

insightsRouter.use('*', rateLimit({ limit: 30, windowMs: 60_000, key: 'insights' }))

insightsRouter.get('/', async (ctx) => {
  const { userId } = ctx.get('clerkAuth') as { userId: string }

  // Build 7-day window: [6 days ago … yesterday] in server UTC
  const today = new Date()
  const days: { date: string; moodScore: number | null }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i - 1) // offset by 1 so we end at yesterday
    days.push({ date: d.toISOString().slice(0, 10), moodScore: null })
  }

  const fromDate = days[0].date
  const toDate = days[days.length - 1].date

  const rows = await db
    .select({ entryDate: entries.entryDate, moodScore: entries.moodScore })
    .from(entries)
    .where(and(
      eq(entries.userId, userId),
      gte(entries.entryDate, fromDate),
      lte(entries.entryDate, toDate),
    ))

  // Fill in actual scores
  const byDate = new Map(rows.map((r) => [r.entryDate, r.moodScore ?? null]))
  for (const day of days) {
    if (byDate.has(day.date)) {
      day.moodScore = byDate.get(day.date)!
    }
  }

  const nonNullCount = days.filter((d) => d.moodScore !== null).length
  const hasEnoughData = nonNullCount >= 2
  const summary = generateSummary(days)

  log('info', 'insights_fetched', { userId, hasEnoughData })

  return ctx.json({ days, summary, hasEnoughData })
})
