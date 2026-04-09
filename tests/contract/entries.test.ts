import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { db } from '../../shared/db/client'
import { userAppAccess } from '../../shell/src/db/schema'
import { entries } from '../../app01/src/db/schema'
import { eq, and } from 'drizzle-orm'

const BASE = `http://localhost:${process.env.PORT ?? 3000}`
const YESTERDAY = (() => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
})()
const PAST_DATE = '2026-01-15'
const FUTURE_DATE = (() => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
})()

describe('Entries API', () => {
  beforeAll(async () => {
    await db.insert(userAppAccess).values({ userId: 'local-dev-user', appId: 'app01' }).onConflictDoNothing()
    // Clean any leftover test entries
    await db.delete(entries).where(eq(entries.userId, 'local-dev-user'))
  })

  afterAll(async () => {
    await db.delete(entries).where(eq(entries.userId, 'local-dev-user'))
  })

  describe('GET /api/v1/entries', () => {
    it('returns 200 empty array when no entries', async () => {
      const res = await fetch(`${BASE}/api/v1/entries`)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBe(0)
    })

    it('returns all entries newest-first after creating multiple', async () => {
      await fetch(`${BASE}/api/v1/entries/2026-01-10`, {
        method: 'PUT',
        body: JSON.stringify({ moodScore: 3, noteText: 'Day one' }),
      })
      await fetch(`${BASE}/api/v1/entries/2026-01-12`, {
        method: 'PUT',
        body: JSON.stringify({ moodScore: 4, noteText: 'Day two' }),
      })

      const res = await fetch(`${BASE}/api/v1/entries`)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.length).toBe(2)
      // Newest first
      expect(body[0].date).toBe('2026-01-12')
      expect(body[1].date).toBe('2026-01-10')

      // Clean up
      await db.delete(entries).where(eq(entries.userId, 'local-dev-user'))
    })
  })

  describe('GET /api/v1/entries/:date', () => {
    it('returns 404 when no entry for that date', async () => {
      const res = await fetch(`${BASE}/api/v1/entries/${PAST_DATE}`)
      expect(res.status).toBe(404)
    })

    it('returns 200 with entry after it is created', async () => {
      await fetch(`${BASE}/api/v1/entries/${PAST_DATE}`, {
        method: 'PUT',
        body: JSON.stringify({ moodScore: 4, noteText: 'Felt good' }),
      })
      const res = await fetch(`${BASE}/api/v1/entries/${PAST_DATE}`)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.date).toBe(PAST_DATE)
      expect(body.moodScore).toBe(4)
      expect(body.noteText).toBe('Felt good')

      await db.delete(entries).where(eq(entries.userId, 'local-dev-user'))
    })
  })

  describe('PUT /api/v1/entries/:date', () => {
    it('creates entry and returns 200 with entry object', async () => {
      const res = await fetch(`${BASE}/api/v1/entries/${PAST_DATE}`, {
        method: 'PUT',
        body: JSON.stringify({ moodScore: 3, noteText: 'Tired but productive.' }),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.date).toBe(PAST_DATE)
      expect(body.moodScore).toBe(3)
      expect(body.noteText).toBe('Tired but productive.')
    })

    it('upserts (last-write-wins) on same date', async () => {
      const res = await fetch(`${BASE}/api/v1/entries/${PAST_DATE}`, {
        method: 'PUT',
        body: JSON.stringify({ moodScore: 5, noteText: 'Updated note' }),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.moodScore).toBe(5)
      expect(body.noteText).toBe('Updated note')

      await db.delete(entries).where(eq(entries.userId, 'local-dev-user'))
    })

    it('returns 400 when moodScore is out of range', async () => {
      const res = await fetch(`${BASE}/api/v1/entries/${PAST_DATE}`, {
        method: 'PUT',
        body: JSON.stringify({ moodScore: 6 }),
      })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBeDefined()
    })

    it('returns 400 when moodScore is below 1', async () => {
      const res = await fetch(`${BASE}/api/v1/entries/${PAST_DATE}`, {
        method: 'PUT',
        body: JSON.stringify({ moodScore: 0 }),
      })
      expect(res.status).toBe(400)
    })

    it('returns 422 when date is in the future', async () => {
      const res = await fetch(`${BASE}/api/v1/entries/${FUTURE_DATE}`, {
        method: 'PUT',
        body: JSON.stringify({ moodScore: 3 }),
      })
      expect(res.status).toBe(422)
      const body = await res.json()
      expect(body.error).toBeDefined()
    })

    it('accepts null moodScore and null noteText', async () => {
      const res = await fetch(`${BASE}/api/v1/entries/${PAST_DATE}`, {
        method: 'PUT',
        body: JSON.stringify({ moodScore: null, noteText: null }),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.moodScore).toBeNull()
      expect(body.noteText).toBeNull()

      await db.delete(entries).where(eq(entries.userId, 'local-dev-user'))
    })
  })
})
