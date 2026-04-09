import { pgSchema, serial, text, timestamp, unique } from 'drizzle-orm/pg-core'

export const shellSchema = pgSchema('shell')

export const userAppAccess = shellSchema.table('user_app_access', {
  id:        serial('id').primaryKey(),
  userId:    text('user_id').notNull(),
  appId:     text('app_id').notNull(),
  grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqUserApp: unique().on(t.userId, t.appId),
}))
