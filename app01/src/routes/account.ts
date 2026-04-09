import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../../../shared/db/client'
import { entries, userSettings } from '../db/schema'
import { userAppAccess } from '../../../shell/src/db/schema'
import { rateLimit } from '../../../shell/src/middleware/rate-limit'
import { log } from '../../../shared/logging'

export const accountRouter = new Hono()

accountRouter.use('*', rateLimit({ limit: 5, windowMs: 24 * 60 * 60_000, key: 'account-delete' }))

accountRouter.delete('/', async (ctx) => {
  const { userId } = ctx.get('clerkAuth') as { userId: string }

  let deletedEntries = 0
  let deletedSettings = 0
  let deletedAccess = 0

  // Single transaction: delete all user data (FR-063, research.md §12)
  await db.transaction(async (tx) => {
    const deletedEntryRows = await tx.delete(entries).where(eq(entries.userId, userId)).returning()
    deletedEntries = deletedEntryRows.length

    const deletedSettingsRows = await tx.delete(userSettings).where(eq(userSettings.userId, userId)).returning()
    deletedSettings = deletedSettingsRows.length

    const deletedAccessRows = await tx.delete(userAppAccess).where(eq(userAppAccess.userId, userId)).returning()
    deletedAccess = deletedAccessRows.length
  })

  // Emit FR-081 audit log — no personal content, only fact and scope
  log('info', 'account_deleted', {
    event: 'account_deleted',
    userId,
    deletedRows: {
      entries: deletedEntries,
      userSettings: deletedSettings,
      userAppAccess: deletedAccess,
    },
    timestamp: new Date().toISOString(),
  })

  // Attempt Clerk user deletion (step 4 — after DB transaction)
  // In dev bypass mode or without a real Clerk client this is a no-op
  if (process.env.CLERK_DEV_BYPASS !== 'true') {
    try {
      const { createClerkClient } = await import('@clerk/backend')
      const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
      await clerk.users.deleteUser(userId)
    } catch (err) {
      // DB data already deleted — log error for manual Clerk cleanup
      log('error', 'clerk_user_deletion_failed', { userId, error: String(err) })
    }
  }

  return new Response(null, { status: 204 })
})
