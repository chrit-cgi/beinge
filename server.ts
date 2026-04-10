import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { runMigrations } from './shared/db/migrate'
import { log } from './shared/logging'
import { clerkAuth, app01AccessMiddleware } from './shell/src/middleware/auth'
import { adminMiddleware } from './shell/src/middleware/admin'
import { shellMeRouter } from './shell/src/routes/me'
import { entriesRouter } from './app01/src/routes/entries'
import { insightsRouter } from './app01/src/routes/insights'
import { settingsRouter } from './app01/src/routes/settings'
import { exportRouter } from './app01/src/routes/export'
import { accountRouter } from './app01/src/routes/account'
import { adminRouter } from './shell/src/routes/admin'

// Run migrations before binding to port
log('info', 'db_url_debug', { url: (process.env.DATABASE_URL ?? 'NOT SET').replace(/:([^:@]+)@/, ':***@') })
await runMigrations()

const app = new Hono()

// ── Security headers ──────────────────────────────────────────
app.use('*', async (ctx, next) => {
  await next()
  ctx.header('X-Content-Type-Options', 'nosniff')
  ctx.header('X-Frame-Options', 'DENY')
  ctx.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  ctx.header(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' https://cdn.jsdelivr.net https://*.clerk.accounts.dev https://*.clerk.dev",
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "connect-src 'self' https://clerk.accounts.dev https://*.clerk.accounts.dev https://*.clerk.dev",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "frame-ancestors 'none'",
    ].join('; ')
  )
})

// ── Global error handler ──────────────────────────────────────
app.onError((err, ctx) => {
  log('error', 'unhandled_error', {
    method: ctx.req.method,
    path: new URL(ctx.req.url).pathname,
    error: err.message,
    stack: err.stack,
  })
  return ctx.json({ error: 'Internal Server Error' }, 500)
})

// ── Static files ──────────────────────────────────────────────
app.use('/styles/*', serveStatic({ root: './public' }))
app.use('/components/*', serveStatic({ root: './public' }))
app.use('/app.js', serveStatic({ root: './public' }))


// ── Auth middleware on all API routes ────────────────────────
// In dev bypass mode, skip Clerk JWT verification entirely (no valid key available)
if (process.env.CLERK_DEV_BYPASS !== 'true') {
  app.use('/api/*', clerkAuth)
}
app.use('/api/*', app01AccessMiddleware)

// ── Shell API ─────────────────────────────────────────────────
app.route('/api/shell', shellMeRouter)

// ── Admin API ─────────────────────────────────────────────────
app.use('/api/admin/*', adminMiddleware)
app.route('/api/admin', adminRouter)

// ── app01 API ─────────────────────────────────────────────────
app.route('/api/v1/entries', entriesRouter)
app.route('/api/v1/insights', insightsRouter)
app.route('/api/v1/settings', settingsRouter)
app.route('/api/v1/export', exportRouter)
app.route('/api/v1/account', accountRouter)

// ── SPA fallback — serve index.html with runtime config injected ─
app.use('*', async (ctx) => {
  const html = await Bun.file('./public/index.html').text()
  const devBypass = process.env.CLERK_DEV_BYPASS === 'true' && process.env.NODE_ENV !== 'production'
  const clerkKey = process.env.CLERK_PUBLISHABLE_KEY ?? ''
  const injected = html
    .replace(
      '<meta name="clerk-publishable-key" content="" />',
      `<meta name="clerk-publishable-key" content="${clerkKey}" />\n  <meta name="dev-bypass" content="${devBypass}" />`
    )
  return ctx.html(injected)
})

const port = Number(process.env.PORT ?? 3000)
log('info', 'server_started', { port })

export default {
  port,
  fetch: app.fetch,
}
