import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { db } from '../../shared/db/client'
import { userAppAccess } from '../../shell/src/db/schema'
import { entries } from '../../app01/src/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Contract tests for GET /api/v1/export
 * Requires: running server + PostgreSQL with beinge DB + both schemas
 * Uses CLERK_DEV_BYPASS=true mode
 */

const BASE = `http://localhost:${process.env.PORT ?? 3000}`

describe('Export API', () => {
  beforeAll(async () => {
    await db.insert(userAppAccess).values({ userId: 'local-dev-user', appId: 'app01' }).onConflictDoNothing()
    await db.delete(entries).where(eq(entries.userId, 'local-dev-user'))
    // Insert two entries within the test range
    await fetch(`${BASE}/api/v1/entries/2026-01-10`, {
      method: 'PUT',
      body: JSON.stringify({ moodScore: 4, noteText: 'First entry' }),
    })
    await fetch(`${BASE}/api/v1/entries/2026-01-11`, {
      method: 'PUT',
      body: JSON.stringify({ moodScore: 2, noteText: 'Second entry' }),
    })
  })

  afterAll(async () => {
    await db.delete(entries).where(eq(entries.userId, 'local-dev-user'))
  })

  it('GET ?from&to&format=csv returns 200 CSV with Content-Disposition', async () => {
    const res = await fetch(`${BASE}/api/v1/export?from=2026-01-10&to=2026-01-11&format=csv`)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/csv')
    expect(res.headers.get('Content-Disposition')).toContain('attachment')
    expect(res.headers.get('Content-Disposition')).toContain('.csv')
    const text = await res.text()
    expect(text).toContain('date,score,note')
    expect(text).toContain('2026-01-10')
    expect(text).toContain('2026-01-11')
  })

  it('GET ?from&to&format=pdf returns 200 PDF with Content-Disposition', async () => {
    const res = await fetch(`${BASE}/api/v1/export?from=2026-01-10&to=2026-01-11&format=pdf`)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('application/pdf')
    expect(res.headers.get('Content-Disposition')).toContain('attachment')
    expect(res.headers.get('Content-Disposition')).toContain('.pdf')
    const buf = await res.arrayBuffer()
    // PDF magic bytes: %PDF
    expect(new Uint8Array(buf).slice(0, 4)).toEqual(new Uint8Array([0x25, 0x50, 0x44, 0x46]))
  })

  it('GET with missing params returns 400', async () => {
    const res = await fetch(`${BASE}/api/v1/export?from=2026-01-10&format=csv`)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('GET with from > to returns 400', async () => {
    const res = await fetch(`${BASE}/api/v1/export?from=2026-01-15&to=2026-01-10&format=csv`)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('GET with invalid format returns 400', async () => {
    const res = await fetch(`${BASE}/api/v1/export?from=2026-01-10&to=2026-01-11&format=xlsx`)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('GET with invalid date format returns 400', async () => {
    const res = await fetch(`${BASE}/api/v1/export?from=10-01-2026&to=2026-01-11&format=csv`)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('GET with range outside entries returns 200 empty CSV', async () => {
    const res = await fetch(`${BASE}/api/v1/export?from=2025-01-01&to=2025-01-31&format=csv`)
    expect(res.status).toBe(200)
    const text = await res.text()
    // Header row only, no data rows
    expect(text.trim()).toBe('date,score,note')
  })
})
