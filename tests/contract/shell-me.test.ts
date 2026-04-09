import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { db } from '../../shared/db/client'
import { userAppAccess } from '../../shell/src/db/schema'
import { eq, and } from 'drizzle-orm'

/**
 * Contract tests for GET /api/shell/me
 * Requires: running PostgreSQL with beinge DB + both schemas
 * Uses CLERK_DEV_BYPASS=true mode to avoid real Clerk tokens
 */

const BASE = `http://localhost:${process.env.PORT ?? 3000}`

// Test user IDs
const USER_WITH_ACCESS = 'test-user-with-access'
const USER_WITHOUT_ACCESS = 'test-user-no-access'

// We use the dev bypass mode: any request is treated as local-dev-user.
// For multi-user testing we stub userId via a test header (handled in test server).
// In bypass mode all requests map to 'local-dev-user', so we test the three cases
// by controlling DB state around that user.

describe('GET /api/shell/me', () => {
  beforeAll(async () => {
    // Ensure test user has access
    await db
      .insert(userAppAccess)
      .values({ userId: 'local-dev-user', appId: 'app01' })
      .onConflictDoNothing()
  })

  afterAll(async () => {
    await db
      .delete(userAppAccess)
      .where(and(eq(userAppAccess.userId, 'local-dev-user'), eq(userAppAccess.appId, 'app01')))
  })

  it('returns 200 with userId, apps, and hasEntries when authenticated with access', async () => {
    const res = await fetch(`${BASE}/api/shell/me`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.userId).toBe('local-dev-user')
    expect(body.apps).toContain('app01')
    expect(typeof body.hasEntries).toBe('boolean')
  })

  it('returns 403 when user has no app01 access row', async () => {
    // Temporarily remove access
    await db
      .delete(userAppAccess)
      .where(and(eq(userAppAccess.userId, 'local-dev-user'), eq(userAppAccess.appId, 'app01')))

    const res = await fetch(`${BASE}/api/shell/me`)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBeDefined()

    // Restore access for subsequent tests
    await db
      .insert(userAppAccess)
      .values({ userId: 'local-dev-user', appId: 'app01' })
      .onConflictDoNothing()
  })
})
