import { describe, it, expect, beforeAll } from 'bun:test'
import { db } from '../../shared/db/client'
import { userAppAccess } from '../../shell/src/db/schema'
import { entries, userSettings } from '../../app01/src/db/schema'
import { eq } from 'drizzle-orm'

const BASE = `http://localhost:${process.env.PORT ?? 3000}`

describe('DELETE /api/v1/account', () => {
  beforeAll(async () => {
    // Set up a full user state
    await db.insert(userAppAccess).values({ userId: 'local-dev-user', appId: 'app01' }).onConflictDoNothing()
    await db.delete(entries).where(eq(entries.userId, 'local-dev-user'))
    // Add some entries and settings to verify deletion
    await fetch(`${BASE}/api/v1/entries/2026-01-05`, {
      method: 'PUT',
      body: JSON.stringify({ moodScore: 3, noteText: 'Test entry' }),
    })
    await fetch(`${BASE}/api/v1/settings`, {
      method: 'PUT',
      body: JSON.stringify({ theme: 'dark' }),
    })
  })

  it('returns 204 and removes all user data', async () => {
    const res = await fetch(`${BASE}/api/v1/account`, { method: 'DELETE' })
    expect(res.status).toBe(204)

    // Verify entries deleted
    const entryRows = await db.select().from(entries).where(eq(entries.userId, 'local-dev-user'))
    expect(entryRows.length).toBe(0)

    // Verify settings deleted
    const settingsRows = await db.select().from(userSettings).where(eq(userSettings.userId, 'local-dev-user'))
    expect(settingsRows.length).toBe(0)

    // Verify access revoked
    const accessRows = await db.select().from(userAppAccess).where(eq(userAppAccess.userId, 'local-dev-user'))
    expect(accessRows.length).toBe(0)
  })
})
