import { createMiddleware } from 'hono/factory'
import { log } from '../../../shared/logging'

/**
 * Admin role guard — must run after clerkAuth + app01AccessMiddleware.
 * Checks publicMetadata.role === 'admin' from the Clerk session token.
 * Emits FR-080 audit log on 403.
 */
export const adminMiddleware = createMiddleware(async (ctx, next) => {
  const auth = ctx.get('clerkAuth') as {
    userId?: string
    sessionClaims?: { publicMetadata?: { role?: string } }
  } | undefined

  const role = (auth?.sessionClaims?.publicMetadata as { role?: string } | undefined)?.role

  // Dev bypass mode — treat as admin for local testing
  if (process.env.CLERK_DEV_BYPASS === 'true' && process.env.NODE_ENV !== 'production') {
    await next()
    return
  }

  if (role !== 'admin') {
    log('warn', 'access_denied', {
      userId: auth?.userId,
      reason: 'insufficient_role',
      path: ctx.req.path,
    })
    return ctx.json({ error: 'Forbidden' }, 403)
  }

  await next()
})
