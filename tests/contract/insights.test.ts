import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { db } from '../../shared/db/client'
import { userAppAccess } from '../../shell/src/db/schema'
import { entries } from '../../app01/src/db/schema'
import { eq, and } from 'drizzle-orm'

const BASE = `http://localhost:${process.env.PORT ?? 3000}`

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

describe('GET /api/v1/insights', () => {
  beforeAll(async () => {
    await db.insert(userAppAccess).values({ userId: 'local-dev-user', appId: 'app01' }).onConflictDoNothing()
    await db.delete(entries).where(eq(entries.userId, 'local-dev-user'))
  })

  afterAll(async () => {
    await db.delete(entries).where(eq(entries.userId, 'local-dev-user'))
  })

  it('returns hasEnoughData:false when fewer than 2 entries', async () => {
    const res = await fetch(`${BASE}/api/v1/insights`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.hasEnoughData).toBe(false)
    expect(Array.isArray(body.days)).toBe(true)
    expect(body.days.length).toBe(7)
    expect(typeof body.summary).toBe('string')
  })

  it('returns hasEnoughData:true with 7-day window and null for missing days', async () => {
    // Insert entries for days 1, 3, 5 ago (leave 2, 4, 6, 7 as gaps)
    for (const [n, score] of [[1, 3], [3, 4], [5, 2]] as [number, number][]) {
      await fetch(`${BASE}/api/v1/entries/${daysAgo(n)}`, {
        method: 'PUT',
        body: JSON.stringify({ moodScore: score }),
      })
    }

    const res = await fetch(`${BASE}/api/v1/insights`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.hasEnoughData).toBe(true)
    expect(body.days.length).toBe(7)
    expect(typeof body.summary).toBe('string')
    expect(body.summary.length).toBeGreaterThan(0)

    // Days with no entry should have null moodScore
    const nullDays = body.days.filter((d: { moodScore: number | null }) => d.moodScore === null)
    expect(nullDays.length).toBeGreaterThan(0)

    await db.delete(entries).where(eq(entries.userId, 'local-dev-user'))
  })
})
