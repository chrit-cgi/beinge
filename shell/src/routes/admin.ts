import { Hono } from 'hono'
import { eq, and, sql } from 'drizzle-orm'
import { db } from '../../../shared/db/client'
import { userAppAccess } from '../db/schema'
import { rateLimit } from '../middleware/rate-limit'
import { log } from '../../../shared/logging'

export const adminRouter = new Hono()

// GET /api/admin/users — paginated list of all registered users
adminRouter.get('/users', rateLimit({ limit: 60, windowMs: 60_000, key: 'admin-users' }), async (ctx) => {
  const page = Math.max(1, Number(ctx.req.query('page') ?? 1))
  const limit = Math.min(100, Math.max(1, Number(ctx.req.query('limit') ?? 25)))
  const q = ctx.req.query('q')?.toLowerCase()
  const offset = (page - 1) * limit

  // Get all rows for app01 access
  const allRows = await db
    .select()
    .from(userAppAccess)
    .where(eq(userAppAccess.appId, 'app01'))

  // In dev bypass mode we cannot call Clerk — return simplified user objects
  // In production this would call clerkClient.users.getUser(userId) per row
  let users = allRows.map((row) => ({
    userId: row.userId,
    name: row.userId === 'local-dev-user' ? 'Dev User' : row.userId,
    email: row.userId === 'local-dev-user' ? 'dev@localhost' : `${row.userId}@unknown`,
    active: true,
    grantedAt: row.grantedAt,
  }))

  if (q) {
    users = users.filter((u) =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    )
  }

  const total = users.length
  const paginated = users.slice(offset, offset + limit)

  log('info', 'admin_users_listed', { adminUserId: ctx.get('clerkAuth')?.userId, total, page, limit })
  return ctx.json({ users: paginated, total, page, limit })
})

// PUT /api/admin/users/:userId/status — activate or deactivate
adminRouter.put(
  '/users/:userId/status',
  rateLimit({ limit: 20, windowMs: 60_000, key: 'admin-status' }),
  async (ctx) => {
    const auth = ctx.get('clerkAuth') as { userId: string }
    const targetUserId = ctx.req.param('userId')
    const body = await ctx.req.json().catch(() => ({})) as { active?: boolean }

    if (typeof body.active !== 'boolean') {
      return ctx.json({ error: 'active must be a boolean' }, 400)
    }

    if (body.active) {
      await db
        .insert(userAppAccess)
        .values({ userId: targetUserId, appId: 'app01' })
        .onConflictDoNothing()
    } else {
      await db
        .delete(userAppAccess)
        .where(and(eq(userAppAccess.userId, targetUserId), eq(userAppAccess.appId, 'app01')))
    }

    log('info', 'user_status_changed', {
      event: 'user_status_changed',
      adminUserId: auth.userId,
      targetUserId,
      active: body.active,
      timestamp: new Date().toISOString(),
    })

    return ctx.json({ userId: targetUserId, active: body.active })
  }
)

// GET /api/admin/clerk-dashboard-url
adminRouter.get('/clerk-dashboard-url', (ctx) => {
  return ctx.json({ url: 'https://dashboard.clerk.com' })
})
