# Data Model: Shell + app01 Daily Well-being

**Branch**: `001-shell-app01-wellbeing` | **Date**: 2026-04-08

Two PostgreSQL schemas keep shell and app01 data strictly separate (FR-061). User identity is owned by Clerk; the `user_id` stored here is Clerk's opaque user ID string (e.g., `user_2abc123`).

---

## Schema: `shell`

### Table: `shell.user_app_access`

Tracks which Clerk users are authorised to access which micro apps (FR-003).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `serial` | PK | Internal row ID |
| `user_id` | `text` | NOT NULL | Clerk user ID |
| `app_id` | `text` | NOT NULL | e.g., `'app01'` |
| `granted_at` | `timestamptz` | NOT NULL, DEFAULT now() | When access was granted |

**Unique constraint**: `(user_id, app_id)` — a user has at most one access record per app.

**Access check**: On every protected request, shell middleware queries this table after verifying the JWT. If no matching row exists the request is rejected with `403`.

**Drizzle schema** (`shell/src/db/schema.ts`):

```ts
import { pgTable, pgSchema, serial, text, timestamp, unique } from 'drizzle-orm/pg-core'

export const shellSchema = pgSchema('shell')

export const userAppAccess = shellSchema.table('user_app_access', {
  id:        serial('id').primaryKey(),
  userId:    text('user_id').notNull(),
  appId:     text('app_id').notNull(),
  grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqUserApp: unique().on(t.userId, t.appId),
}))
```

---

## Schema: `app01`

### Table: `app01.entries`

One well-being entry per user per calendar date (FR-022, FR-060).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `serial` | PK | Internal row ID |
| `user_id` | `text` | NOT NULL | Clerk user ID |
| `entry_date` | `date` | NOT NULL | Calendar date (YYYY-MM-DD); no time component |
| `note_text` | `text` | NULLABLE | Free-form well-being note; may be empty |
| `mood_score` | `smallint` | NULLABLE, CHECK (1–5) | Overall mood score; nullable until set |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Updated on every save |

**Unique constraint**: `(user_id, entry_date)` — one entry per user per day (assumption from spec).

**State transitions**:
- A PUT to `/api/v1/entries/:date` upserts: inserts if not exists, updates if exists.
- Both `note_text` and `mood_score` may be updated independently; neither field forces the other to be set.

**Drizzle schema** (`app01/src/db/schema.ts`):

```ts
import { pgSchema, serial, text, date, smallint, timestamp, unique, check, sql } from 'drizzle-orm/pg-core'

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
  uniqUserDate:    unique().on(t.userId, t.entryDate),
  checkMoodScore:  check('mood_score_range', sql`${t.moodScore} BETWEEN 1 AND 5`),
}))
```

---

### Table: `app01.user_settings`

One settings row per user (FR-050, FR-051, FR-052).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `user_id` | `text` | PK | Clerk user ID — one row per user |
| `theme` | `text` | NOT NULL, DEFAULT `'system'` | `'light'`, `'dark'`, or `'system'` |
| `reminder_enabled` | `boolean` | NOT NULL, DEFAULT `false` | Daily reminder opt-in |
| `reminder_time` | `time` | NULLABLE | Local time for reminder (e.g., `20:00`); NULL when disabled |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | |

**Upsert**: Settings are created on first access with defaults; subsequent PUT calls update the row.

**Drizzle schema** (`app01/src/db/schema.ts`):

```ts
export const userSettings = app01Schema.table('user_settings', {
  userId:          text('user_id').primaryKey(),
  theme:           text('theme').notNull().default('system'),
  reminderEnabled: boolean('reminder_enabled').notNull().default(false),
  reminderTime:    time('reminder_time'),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
```

---

## Entity Relationships

```
Clerk (external)
  └── user_id (string)
        ├── shell.user_app_access  (1 user : N apps)
        ├── app01.entries          (1 user : N entries, 1 per date)
        └── app01.user_settings    (1 user : 1 settings row)
```

No foreign keys reference Clerk — Clerk IDs are trusted after JWT verification.

**Account deletion** (FR-055, FR-063): `DELETE /api/v1/account` removes rows in this order within a single transaction: `app01.entries` → `app01.user_settings` → `shell.user_app_access`. After the transaction commits, the Clerk user record is deleted via the Clerk Backend API. This satisfies GDPR right to erasure. See research.md §12 for the full pattern.

---

## Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| `app01.entries` | `(user_id, entry_date DESC)` | Overview list (newest first); Insights 7-day query |
| `shell.user_app_access` | `(user_id, app_id)` | Access check on every request (covered by unique constraint) |

**Note text search (FR-034)**: No index on `note_text` in v1. Search is performed client-side: the Overview screen loads all entries once via `GET /api/v1/entries` and the Lit component filters the in-memory array on each keystroke. At ≤ 365 entries per user this is instant and requires no extra network round-trip.

**Future scale trigger**: If the Overview introduces pagination (entries per user exceeds ~500), client-side filtering breaks. At that point add `pg_trgm` GIN index: `CREATE INDEX ON app01.entries USING GIN (note_text gin_trgm_ops)` and move filtering to `WHERE note_text ILIKE '%q%'` server-side.

---

## Migration Strategy

- Migrations live in `drizzle/` (generated by `bunx drizzle-kit generate`).
- Applied at container startup via `shared/db/migrate.ts` before the Hono server binds.
- Rollback: manual SQL (Drizzle does not provide automatic rollbacks); destructive changes require a new migration, not a rollback.
- Schema changes that drop columns or rename tables MUST increment the API version (constitution Principle V).
