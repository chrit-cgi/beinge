import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { db } from '../../shared/db/client'
import { userAppAccess } from '../../shell/src/db/schema'
import { eq, and } from 'drizzle-orm'

const BASE = `http://localhost:${process.env.PORT ?? 3000}`

// In dev bypass mode all requests are treated as local-dev-user.
// Admin middleware in bypass mode passes through (treats as admin).

describe('Admin API', () => {
  beforeAll(async () => {
    await db.insert(userAppAccess).values({ userId: 'local-dev-user', appId: 'app01' }).onConflictDoNothing()
  })

  afterAll(async () => {
    await db.delete(userAppAccess).where(and(
      eq(userAppAccess.userId, 'local-dev-user'),
      eq(userAppAccess.appId, 'app01'),
    ))
  })

  it('GET /api/admin/users returns 200 with paginated user list', async () => {
    const res = await fetch(`${BASE}/api/admin/users`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.users)).toBe(true)
    expect(typeof body.total).toBe('number')
    expect(typeof body.page).toBe('number')
    expect(typeof body.limit).toBe('number')
  })

  it('PUT /api/admin/users/:userId/status deactivates user (removes access row)', async () => {
    // First ensure the target user has access
    await db.insert(userAppAccess).values({ userId: 'target-user-test', appId: 'app01' }).onConflictDoNothing()

    const res = await fetch(`${BASE}/api/admin/users/target-user-test/status`, {
      method: 'PUT',
      body: JSON.stringify({ active: false }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.userId).toBe('target-user-test')
    expect(body.active).toBe(false)

    // Verify row is gone
    const rows = await db.select().from(userAppAccess).where(
      and(eq(userAppAccess.userId, 'target-user-test'), eq(userAppAccess.appId, 'app01'))
    )
    expect(rows.length).toBe(0)
  })

  it('PUT /api/admin/users/:userId/status activates user (inserts access row)', async () => {
    const res = await fetch(`${BASE}/api/admin/users/target-user-test/status`, {
      method: 'PUT',
      body: JSON.stringify({ active: true }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.active).toBe(true)

    // Clean up
    await db.delete(userAppAccess).where(
      and(eq(userAppAccess.userId, 'target-user-test'), eq(userAppAccess.appId, 'app01'))
    )
  })

  it('GET /api/admin/clerk-dashboard-url returns 200 with url', async () => {
    const res = await fetch(`${BASE}/api/admin/clerk-dashboard-url`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(typeof body.url).toBe('string')
    expect(body.url).toContain('clerk')
  })
})
