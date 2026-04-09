import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { db } from '../../shared/db/client'
import { userAppAccess } from '../../shell/src/db/schema'
import { userSettings } from '../../app01/src/db/schema'
import { eq, and } from 'drizzle-orm'

const BASE = `http://localhost:${process.env.PORT ?? 3000}`

describe('Settings API', () => {
  beforeAll(async () => {
    await db.insert(userAppAccess).values({ userId: 'local-dev-user', appId: 'app01' }).onConflictDoNothing()
    await db.delete(userSettings).where(eq(userSettings.userId, 'local-dev-user'))
  })

  afterAll(async () => {
    await db.delete(userSettings).where(eq(userSettings.userId, 'local-dev-user'))
  })

  it('GET /api/v1/settings returns defaults on first access', async () => {
    const res = await fetch(`${BASE}/api/v1/settings`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.theme).toBe('system')
    expect(body.reminderEnabled).toBe(false)
    expect(body.reminderTime).toBeNull()
  })

  it('PUT /api/v1/settings updates theme', async () => {
    const res = await fetch(`${BASE}/api/v1/settings`, {
      method: 'PUT',
      body: JSON.stringify({ theme: 'dark' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.theme).toBe('dark')
  })

  it('GET /api/v1/settings returns updated theme', async () => {
    const res = await fetch(`${BASE}/api/v1/settings`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.theme).toBe('dark')
  })

  it('PUT returns 400 when reminderEnabled:true without reminderTime', async () => {
    const res = await fetch(`${BASE}/api/v1/settings`, {
      method: 'PUT',
      body: JSON.stringify({ reminderEnabled: true }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('PUT returns 400 for invalid theme value', async () => {
    const res = await fetch(`${BASE}/api/v1/settings`, {
      method: 'PUT',
      body: JSON.stringify({ theme: 'rainbow' }),
    })
    expect(res.status).toBe(400)
  })

  it('PUT accepts reminderEnabled:true with valid reminderTime', async () => {
    const res = await fetch(`${BASE}/api/v1/settings`, {
      method: 'PUT',
      body: JSON.stringify({ reminderEnabled: true, reminderTime: '20:00' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reminderEnabled).toBe(true)
  })
})
