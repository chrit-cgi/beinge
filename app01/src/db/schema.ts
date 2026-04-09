import { pgSchema, serial, text, date, smallint, boolean, time, timestamp, unique, check, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const app01Schema = pgSchema('app01')

export const entries = app01Schema.table('entries', {
  id:        serial('id').primaryKey(),
  userId:    text('user_id').notNull(),
  entryDate: date('entry_date').notNull(),
  noteText:  text('note_text'),
  moodScore: smallint('mood_score'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqUserDate:   unique().on(t.userId, t.entryDate),
  checkMoodScore: check('mood_score_range', sql`${t.moodScore} BETWEEN 1 AND 5`),
  idxUserDate:    index('entries_user_date_idx').on(t.userId, t.entryDate),
}))

export const userSettings = app01Schema.table('user_settings', {
  userId:          text('user_id').primaryKey(),
  theme:           text('theme').notNull().default('system'),
  reminderEnabled: boolean('reminder_enabled').notNull().default(false),
  reminderTime:    time('reminder_time'),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
