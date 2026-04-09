import type { Context, MiddlewareHandler } from 'hono'
import { log } from '../../../shared/logging'

interface Bucket {
  count: number
  windowStart: number
}

interface RateLimitOptions {
  /** Maximum requests allowed within the window */
  limit: number
  /** Window duration in milliseconds */
  windowMs: number
  /** Optional bucket key suffix to isolate limits per endpoint */
  key?: string
}

// Store is module-level — one shared Map per server process (FR-075)
const store = new Map<string, Bucket>()

export function rateLimit(options: RateLimitOptions): MiddlewareHandler {
  const { limit, windowMs, key = 'global' } = options

  return async (ctx: Context, next) => {
    const auth = ctx.get('clerkAuth') as { userId?: string } | undefined
    const userId = auth?.userId ?? ctx.req.header('x-forwarded-for') ?? 'anonymous'
    const bucketKey = `${userId}:${key}`
    const now = Date.now()

    let bucket = store.get(bucketKey)
    if (!bucket || now - bucket.windowStart >= windowMs) {
      bucket = { count: 0, windowStart: now }
    }

    bucket.count++
    store.set(bucketKey, bucket)

    if (bucket.count > limit) {
      const retryAfter = Math.ceil((bucket.windowStart + windowMs - now) / 1000)
      log('warn', 'rate_limit_exceeded', { userId, key, count: bucket.count, limit })
      ctx.header('Retry-After', String(retryAfter))
      return ctx.json({ error: 'Too Many Requests' }, 429)
    }

    await next()
  }
}
