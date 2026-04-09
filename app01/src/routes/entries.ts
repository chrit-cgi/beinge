import { Hono } from 'hono'
import { eq, and, desc, sql } from 'drizzle-orm'
import { db } from '../../../shared/db/client'
import { entries } from '../db/schema'
import { rateLimit } from '../../../shell/src/middleware/rate-limit'
import { log } from '../../../shared/logging'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const entriesRouter = new Hono()

entriesRouter.use('*', rateLimit({ limit: 60, windowMs: 60_000, key: 'entries' }))

// GET /api/v1/entries — all entries for user, newest first
entriesRouter.get('/', async (ctx) => {
  const { userId } = ctx.get('clerkAuth') as { userId: string }

  const rows = await db
    .select()
    .from(entries)
    .where(eq(entries.userId, userId))
    .orderBy(desc(entries.entryDate))

  log('info', 'entries_listed', { userId, count: rows.length })
  return ctx.json(rows.map(toDTO))
})

// GET /api/v1/entries/:date — single entry or 404
entriesRouter.get('/:date', async (ctx) => {
  const { userId } = ctx.get('clerkAuth') as { userId: string }
  const date = ctx.req.param('date')
  if (!DATE_RE.test(date)) return ctx.json({ error: 'Invalid date format — expected YYYY-MM-DD' }, 400)

  const [row] = await db
    .select()
    .from(entries)
    .where(and(eq(entries.userId, userId), eq(entries.entryDate, date)))
    .limit(1)

  if (!row) {
    log('info', 'entry_not_found', { userId, date })
    return ctx.json({ error: 'Not found' }, 404)
  }
  log('info', 'entry_fetched', { userId, date })
  return ctx.json(toDTO(row))
})

// PUT /api/v1/entries/:date — upsert entry
entriesRouter.put('/:date', async (ctx) => {
  const { userId } = ctx.get('clerkAuth') as { userId: string }
  const date = ctx.req.param('date')
  if (!DATE_RE.test(date)) return ctx.json({ error: 'Invalid date format — expected YYYY-MM-DD' }, 400)

  // Date must not be in the future (server UTC)
  const serverToday = new Date().toISOString().slice(0, 10)
  if (date > serverToday) {
    return ctx.json({ error: 'Cannot create entry for a future date' }, 422)
  }

  const body = await ctx.req.json().catch(() => ({}))
  const { moodScore, noteText } = body as { moodScore?: number | null; noteText?: string | null }

  // Validate moodScore
  if (moodScore !== undefined && moodScore !== null) {
    if (!Number.isInteger(moodScore) || moodScore < 1 || moodScore > 5) {
      return ctx.json({ error: 'moodScore must be an integer between 1 and 5' }, 400)
    }
  }

  // Validate noteText length
  if (noteText !== undefined && noteText !== null && noteText.length > 5000) {
    return ctx.json({ error: 'noteText must be 5000 characters or fewer' }, 400)
  }

  const now = new Date()

  const [row] = await db
    .insert(entries)
    .values({
      userId,
      entryDate: date,
      moodScore: moodScore ?? null,
      noteText: noteText ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [entries.userId, entries.entryDate],
      set: {
        ...(moodScore !== undefined ? { moodScore: moodScore ?? null } : {}),
        ...(noteText !== undefined ? { noteText: noteText ?? null } : {}),
        updatedAt: now,
      },
    })
    .returning()

  log('info', 'entry_saved', { userId, date })
  return ctx.json(toDTO(row))
})

function toDTO(row: typeof entries.$inferSelect) {
  return {
    date: row.entryDate,
    moodScore: row.moodScore ?? null,
    noteText: row.noteText ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
