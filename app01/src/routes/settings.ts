import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../../../shared/db/client'
import { userSettings } from '../db/schema'
import { rateLimit } from '../../../shell/src/middleware/rate-limit'
import { log } from '../../../shared/logging'

export const settingsRouter = new Hono()

settingsRouter.use('*', rateLimit({ limit: 60, windowMs: 60_000, key: 'settings' }))

const VALID_THEMES = ['light', 'dark', 'system']

settingsRouter.get('/', async (ctx) => {
  const { userId } = ctx.get('clerkAuth') as { userId: string }

  // Upsert defaults on first access
  await db
    .insert(userSettings)
    .values({ userId })
    .onConflictDoNothing()

  const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1)
  log('info', 'settings_fetched', { userId })
  return ctx.json(toDTO(row))
})

settingsRouter.put('/', async (ctx) => {
  const { userId } = ctx.get('clerkAuth') as { userId: string }
  const body = await ctx.req.json().catch(() => ({})) as Record<string, unknown>

  // Validate theme
  if (body.theme !== undefined && !VALID_THEMES.includes(body.theme as string)) {
    return ctx.json({ error: `theme must be one of: ${VALID_THEMES.join(', ')}` }, 400)
  }

  // Validate reminderTime required when reminderEnabled is true
  if (body.reminderEnabled === true) {
    const time = body.reminderTime
    if (!time || !/^\d{2}:\d{2}$/.test(time as string)) {
      return ctx.json({ error: 'reminderTime is required and must be HH:MM when reminderEnabled is true' }, 400)
    }
  }

  // Ensure row exists
  await db.insert(userSettings).values({ userId }).onConflictDoNothing()

  const updates: Partial<typeof userSettings.$inferInsert> = {
    updatedAt: new Date(),
  }
  if (body.theme !== undefined) updates.theme = body.theme as string
  if (body.reminderEnabled !== undefined) updates.reminderEnabled = body.reminderEnabled as boolean
  if (body.reminderTime !== undefined) updates.reminderTime = (body.reminderTime as string | null)

  const [row] = await db
    .update(userSettings)
    .set(updates)
    .where(eq(userSettings.userId, userId))
    .returning()

  log('info', 'settings_updated', { userId, fields: Object.keys(updates).filter((k) => k !== 'updatedAt') })
  return ctx.json(toDTO(row))
})

function toDTO(row: typeof userSettings.$inferSelect) {
  return {
    theme: row.theme,
    reminderEnabled: row.reminderEnabled,
    reminderTime: row.reminderTime ?? null,
  }
}
