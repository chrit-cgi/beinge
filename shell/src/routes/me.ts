import { Hono } from 'hono'
import { eq, and, gt, sql } from 'drizzle-orm'
import { db } from '../../../shared/db/client'
import { userAppAccess } from '../db/schema'
import { entries } from '../../../app01/src/db/schema'
import { rateLimit } from '../middleware/rate-limit'
import { log } from '../../../shared/logging'

export const shellMeRouter = new Hono()

shellMeRouter.use('*', rateLimit({ limit: 60, windowMs: 60_000, key: 'shell-me' }))

shellMeRouter.get('/me', async (ctx) => {
  const auth = ctx.get('clerkAuth') as { userId: string; sessionClaims?: { publicMetadata?: { role?: string } } }
  const userId = auth.userId
  const isAdmin = (auth.sessionClaims?.publicMetadata as { role?: string } | undefined)?.role === 'admin'

  // Determine which apps this user has access to
  const accessRows = await db
    .select({ appId: userAppAccess.appId })
    .from(userAppAccess)
    .where(eq(userAppAccess.userId, userId))

  const apps = accessRows.map((r) => r.appId)

  // Check if user has any entries (for first-use onboarding decision)
  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(entries)
    .where(eq(entries.userId, userId))

  const hasEntries = Number(countRow?.count ?? 0) > 0

  log('info', 'shell_me', { userId, apps, hasEntries, isAdmin })

  return ctx.json({ userId, apps, hasEntries, isAdmin })
})
