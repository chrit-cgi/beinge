import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { createMiddleware } from 'hono/factory'
import { eq, and } from 'drizzle-orm'
import { db } from '../../../shared/db/client'
import { userAppAccess } from '../db/schema'
import { log } from '../../../shared/logging'

/**
 * Clerk JWT verification middleware.
 * In CLERK_DEV_BYPASS=true mode (non-production only) injects a hardcoded
 * dev user instead of verifying a Clerk token.
 */
export const clerkAuth = clerkMiddleware()

/**
 * App01 access guard — must run after clerkAuth (or dev bypass).
 * Queries shell.user_app_access for (userId, 'app01') on every request.
 * Emits FR-080 audit log on 401/403.
 */
export const app01AccessMiddleware = createMiddleware(async (ctx, next) => {
  const path = ctx.req.path

  // Dev bypass: skip JWT verification, inject hardcoded userId (non-production only)
  let userId: string
  if (process.env.CLERK_DEV_BYPASS === 'true') {
    if (process.env.NODE_ENV === 'production') {
      log('error', 'dev_bypass_in_production_blocked', { path })
      return ctx.json({ error: 'Unauthorized' }, 401)
    }
    userId = 'local-dev-user'
  } else {
    const auth = getAuth(ctx)
    if (!auth?.userId) {
      log('warn', 'access_denied', { reason: 'invalid_token', path })
      return ctx.json({ error: 'Unauthorized' }, 401)
    }
    userId = auth.userId
  }

  // Check app01 access on every request — no caching (FR-008)
  const [row] = await db
    .select()
    .from(userAppAccess)
    .where(and(eq(userAppAccess.userId, userId), eq(userAppAccess.appId, 'app01')))
    .limit(1)

  if (!row) {
    log('warn', 'access_denied', { userId, reason: 'no_app_access', path })
    return ctx.json({ error: 'No app access' }, 403)
  }

  ctx.set('clerkAuth', { userId, sessionId: 'dev-session' })
  await next()
})
