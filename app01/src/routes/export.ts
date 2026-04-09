import { Hono } from 'hono'
import { eq, and, gte, lte } from 'drizzle-orm'
import { db } from '../../../shared/db/client'
import { entries } from '../db/schema'
import { toCSV } from '../export-csv'
import { toPDF } from '../export-pdf'
import { rateLimit } from '../../../shell/src/middleware/rate-limit'
import { log } from '../../../shared/logging'

export const exportRouter = new Hono()

exportRouter.use('*', rateLimit({ limit: 10, windowMs: 60 * 60_000, key: 'export' }))

exportRouter.get('/', async (ctx) => {
  const { userId } = ctx.get('clerkAuth') as { userId: string }
  const from = ctx.req.query('from')
  const to = ctx.req.query('to')
  const format = ctx.req.query('format')

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
  if (!from || !to || !format) {
    return ctx.json({ error: 'Missing required query params: from, to, format' }, 400)
  }
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return ctx.json({ error: 'from and to must be YYYY-MM-DD' }, 400)
  }
  if (!['csv', 'pdf'].includes(format)) {
    return ctx.json({ error: 'format must be csv or pdf' }, 400)
  }
  if (from > to) {
    return ctx.json({ error: 'from must not be after to' }, 400)
  }

  const rows = await db
    .select()
    .from(entries)
    .where(and(
      eq(entries.userId, userId),
      gte(entries.entryDate, from),
      lte(entries.entryDate, to),
    ))
    .orderBy(entries.entryDate)

  const exportEntries = rows.map((r) => ({
    date: r.entryDate,
    moodScore: r.moodScore ?? null,
    noteText: r.noteText ?? null,
  }))

  log('info', 'data_exported', {
    event: 'data_exported',
    userId,
    from,
    to,
    format,
    timestamp: new Date().toISOString(),
  })

  const filename = `beinge-export-${from}-${to}.${format}`

  if (format === 'csv') {
    const csv = toCSV(exportEntries)
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  // PDF
  const pdfBuffer = await toPDF(exportEntries)
  return new Response(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
})
