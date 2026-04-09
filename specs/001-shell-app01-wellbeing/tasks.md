# Tasks: Shell + app01 Daily Well-being

**Branch**: `001-shell-app01-wellbeing`
**Input**: Design documents from `specs/001-shell-app01-wellbeing/`
**Prerequisites**: plan.md ✓ | spec.md ✓ | research.md ✓ | data-model.md ✓ | contracts/ ✓

**Tests**: Test tasks are included — constitution Principle II is NON-NEGOTIABLE. Write each test task, confirm it **fails**, then implement.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[US1]** … **[US5]**: Which user story this task belongs to
- Exact file paths in every description

---

## Phase 1: Setup

**Purpose**: Create the project skeleton, configuration, and static assets so all subsequent tasks have a clear home.

- [X] T001 Create all directories from plan.md project structure: `shared/db/`, `shell/src/middleware/`, `shell/src/routes/`, `shell/src/db/`, `app01/src/routes/`, `app01/src/db/`, `public/components/`, `public/styles/`, `tests/contract/`, `tests/unit/`
- [X] T002 Create `package.json` with all dependencies: `hono`, `@hono/clerk-auth`, `@clerk/backend`, `lit`, `@clerk/clerk-js`, `drizzle-orm`, `postgres`, `pdfkit`; devDependencies: `drizzle-kit`, `@types/pdfkit`; scripts: `dev`, `start`, `db:migrate`, `db:generate`, `test`
- [X] T003 [P] Create `.env.example` with all required variables: `DATABASE_URL`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_DEV_BYPASS`, `NODE_ENV`, `PORT`
- [X] T004 [P] Create `drizzle.config.ts` pointing schema glob at `shell/src/db/schema.ts` and `app01/src/db/schema.ts`; output dir `drizzle/`
- [X] T005 [P] Create `Dockerfile`: `FROM oven/bun:1-alpine`, copy `package.json` + `bun.lockb`, `RUN bun install --frozen-lockfile --production`, copy source, `EXPOSE 3000`, `CMD ["bun", "run", "server.ts"]`
- [X] T006 [P] Create `public/styles/tokens.css`: all CSS custom properties from `ux-dna.md §2` — `--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-accent`, `--color-accent-fg`, `--color-border`, `--color-danger`; `html[data-theme="dark"]` overrides; mood score colour variables `--mood-1` through `--mood-5`
- [X] T007 [P] Create `public/styles/base.css`: CSS reset; typography scale from `ux-dna.md §3` (system font stack, base 16px, line-height 1.5); heading sizes (screen heading 28px/700, section label 11px/600 all-caps)
- [X] T008 [P] Create `public/styles/layout.css`: fixed top bar 56px; fixed bottom nav 60px; content area `calc(100dvh - 56px - 60px)` scrollable; no horizontal overflow; bottom nav 3 equally-spaced buttons with active/inactive states per `ux-dna.md §4`

**Checkpoint**: Project skeleton exists; `bun install` runs without errors

---

## Phase 2: Foundational

**Purpose**: Core infrastructure that MUST be complete before any user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T009 Create `shared/db/client.ts`: postgres.js pool (`max: 10`, `idle_timeout: 20`, `connect_timeout: 10`) from `DATABASE_URL`; export `db = drizzle(pool)`
- [X] T010 [P] Create `shell/src/db/schema.ts`: `shellSchema = pgSchema('shell')`; `userAppAccess` table — `id serial PK`, `user_id text NOT NULL`, `app_id text NOT NULL`, `granted_at timestamptz DEFAULT now()`; unique constraint `(user_id, app_id)` — matches `data-model.md`
- [X] T011 [P] Create `app01/src/db/schema.ts`: `app01Schema = pgSchema('app01')`; `entries` table — `id serial PK`, `user_id text NOT NULL`, `entry_date date NOT NULL`, `note_text text`, `mood_score smallint CHECK 1–5`, `created_at timestamptz`, `updated_at timestamptz`; unique `(user_id, entry_date)`; index `(user_id, entry_date DESC)`; `userSettings` table — `user_id text PK`, `theme text DEFAULT 'system'`, `reminder_enabled boolean DEFAULT false`, `reminder_time time`, `updated_at timestamptz` — matches `data-model.md`
- [X] T012 Create `shared/db/migrate.ts`: import `drizzle-kit/api`; run pending migrations from `drizzle/` directory; log `event=db_migration_complete migrations=N` on success; log + throw on failure
- [X] T013 Run `bunx drizzle-kit generate` to produce initial SQL migration in `drizzle/0001_initial.sql`; verify migration SQL creates both schemas and all tables
- [X] T014 Create `shared/logging.ts`: export `log(level, event, fields)` that writes a single-line JSON object `{ level, event, timestamp, ...fields }` to stdout; levels: `info`, `warn`, `error`
- [X] T015 [P] Create `shell/src/middleware/rate-limit.ts`: in-memory `Map<userId, { count, windowStart }>` per endpoint bucket; export factory `rateLimit({ limit, windowMs })` returning Hono middleware; on exceed: log `event=rate_limit_exceeded`; return `429` with `Retry-After` header (FR-070–075)
- [X] T016 Create `server.ts`: create Hono app; call `migrate()` before binding; serve `public/` as static files; mount routers (stubs for now — routes added per story); listen on `PORT` (default 3000); log `event=server_started port=…`
- [X] T017 Create `public/index.html`: HTML5 shell; `<link>` to all three CSS files; `<script type="module">` for `app.js`; `<script>` for Clerk JS SDK (CDN or ES module); placeholder mount points for each screen component; `data-theme="light"` on `<html>` default
- [X] T018 Create `public/app.js`: `apiFetch(path, options)` — calls `Clerk.session.getToken()`, injects `Authorization: Bearer` header; `navigate(screen, params)` — shows the requested screen component, hides others; on `Clerk.load()` call `GET /api/shell/me` and route to login or Note screen based on auth state

**Checkpoint**: `bun run dev` starts; `http://localhost:3000` serves index.html; DB migrates cleanly; `bun test` runs (no tests yet, exits 0)

---

## Phase 3: User Story 1 — Secure Access via Shell (Priority: P1) 🎯 MVP

**Goal**: Any visitor must authenticate before seeing app content; authenticated users without app01 access are turned away; logout returns to login screen.

**Independent Test**: Open app URL without login → see Clerk login. Log in with valid credentials → reach Note screen. Log out → back to login. Log in with account not in `user_app_access` → see access-denied message.

### Tests (write first — confirm FAIL before implementing)

- [X] T019 [P] Write failing contract tests in `tests/contract/shell-me.test.ts`: `GET /api/shell/me` with no token → 401; with valid token but no `user_app_access` row → 403; with valid token + access row → 200 `{ userId, apps: ['app01'], hasEntries: false }`

### Implementation

- [X] T020 [P] [US1] Implement `shell/src/middleware/auth.ts`: `clerkMiddleware()` for JWT verification; follow with `accessMiddleware` that queries `shell.user_app_access` for `(userId, 'app01')`; on 401 emit `log('warn', 'access_denied', { reason: 'invalid_token', path })`; on 403 emit `log('warn', 'access_denied', { userId, reason: 'no_app_access', path })` (FR-080)
- [X] T021 [P] [US1] Implement `shell/src/routes/me.ts`: `GET /api/shell/me` — return `{ userId, apps: ['app01'], hasEntries }` where `hasEntries` = COUNT of `app01.entries` for userId > 0; apply global rate limit
- [X] T022 [US1] Mount shell auth middleware and `/api/shell` router in `server.ts`
- [X] T023 [US1] Update `public/app.js`: on `Clerk.load()`, call `GET /api/shell/me`; if 401 → show Clerk `<SignIn>` component; if 403 → show access-denied message ("Je hebt geen toegang tot deze app."); if 200 → `navigate('note')` ; implement logout: `Clerk.signOut()` then reload
- [X] T024 [US1] Update `public/index.html`: add Clerk `<SignIn>` component mount point; add top bar HTML (hamburger `≡` button, "beinge" title, empty right side); add side-drawer menu HTML (Settings / Exporteren / Uitloggen items — hidden by default); wire hamburger + close button in `app.js`
- [X] T025 [US1] Run `bun test tests/contract/shell-me.test.ts` — confirm all tests pass

**Checkpoint**: Auth flow works end-to-end — login, access denial, logout all function correctly

---

## Phase 4: User Story 2 — Daily Well-being Note (Priority: P1) 🎯 MVP

**Goal**: Authenticated users can write a note and set a mood score for yesterday; entry persists across sessions; first-time users see the onboarding modal.

**Independent Test**: Log in → (first time) see onboarding modal → dismiss → Note screen with yesterday's date, empty fields. Type a note, set slider to 3, save. Reload app → same note and score pre-filled.

### Tests (write first — confirm FAIL before implementing)

- [X] T026 [P] Write failing contract tests in `tests/contract/entries.test.ts`: `GET /api/v1/entries/2026-04-07` with no entry → 404; `PUT /api/v1/entries/2026-04-07` `{ moodScore: 3, noteText: "test" }` → 200 with entry object; re-`GET` same date → 200 with saved values; `PUT` with future date → 422; `PUT` with `moodScore: 6` → 400; upsert overwrites (last-write-wins)

### Implementation

- [X] T027 [P] [US2] Implement `app01/src/routes/entries.ts`: `GET /api/v1/entries/:date` — return entry or 404; `PUT /api/v1/entries/:date` — validate date not future (server UTC), validate moodScore 1–5, upsert `(userId, entryDate)`, return updated entry; apply global rate limit FR-070; log `event=entry_saved userId date` at info level
- [X] T028 [US2] Mount app01 entry routes in `server.ts` under `/api/v1` behind shell auth middleware
- [X] T029 [P] [US2] Create `public/components/onboarding-modal.js`: `<onboarding-modal>` LitElement; renders heading "Welkom bij beinge", three body sentences, "Aan de slag →" button; tapping button fires `CustomEvent('dismissed')` and sets `localStorage.setItem('beinge_onboarding_seen', '1')`; backdrop click does NOT dismiss (FR-010b); shown only when `hasEntries === false` and `!localStorage.getItem('beinge_onboarding_seen')`
- [X] T030 [P] [US2] Create `public/components/note-screen.js`: `<note-screen date="">` LitElement; on `date` property set: call `GET /api/v1/entries/:date` and pre-fill textarea + slider; show date as "Gisteren" when date === yesterday else "D MMM YYYY" Dutch format (FR-011); textarea (fills left ~70% of content area); vertical mood slider right ~30%, range 1–5, no default when entry has null score; "Opslaan" button → `PUT /api/v1/entries/:date`; button label → "Opgeslagen ✓" for 2 s on success; show `error.generic` string on API error
- [X] T031 [US2] Wire Note screen and onboarding modal in `public/app.js`: after successful `GET /api/shell/me`, check `hasEntries`; if first use show `<onboarding-modal>` then on `dismissed` event `navigate('note', { date: yesterday })`; else `navigate('note', { date: yesterday })` directly; yesterday = local device date minus 1 day
- [X] T032 [US2] Run `bun test tests/contract/entries.test.ts` — confirm all tests pass

**Checkpoint**: Full MVP working — auth + note capture + onboarding; SC-001 and SC-002 targets met

---

## Phase 5: User Story 1b — Admin: User Management (Priority: P2)

**Goal**: Admin users can view all registered users, activate/deactivate them, and open the Clerk dashboard.

**Independent Test**: Log in as admin → navigate to `/admin` → see paginated user list. Toggle a user inactive → that user receives 403 on next request. Non-admin navigating to `/admin` → 403.

### Tests (write first — confirm FAIL before implementing)

- [X] T033 [P] Write failing contract tests in `tests/contract/admin.test.ts`: non-admin JWT → `GET /api/admin/users` returns 403; admin JWT → 200 with `{ users, total, page, limit }`; `PUT /api/admin/users/:id/status` `{ active: false }` → 200; subsequent `GET /api/shell/me` for that user → 403

### Implementation

- [X] T034 [P] [US1B] Implement `shell/src/middleware/admin.ts`: reads `ctx.get('clerkAuth').sessionClaims.publicMetadata.role`; if not `"admin"` → log `event=access_denied reason=insufficient_role` and return 403 (FR-080)
- [X] T035 [P] [US1B] Implement `shell/src/routes/admin.ts`: `GET /api/admin/users` — paginate `userAppAccess` rows for app01, fetch name + email from Clerk per userId, return `{ users, total, page, limit }`; `PUT /api/admin/users/:userId/status` — `active: true` inserts `userAppAccess` row, `active: false` deletes it; emit FR-082 audit log `event=user_status_changed`; `GET /api/admin/clerk-dashboard-url` → `{ url: 'https://dashboard.clerk.com' }`; apply rate limit FR-074 on status endpoint
- [X] T036 [US1B] Mount `/api/admin` router in `server.ts` behind both auth middleware + admin middleware
- [X] T037 [P] [US1B] Create `public/components/admin-screen.js`: `<admin-screen>` LitElement; stats row (total users, active count); full-width search input (client-side filter on loaded users); user list cards per `ux-dna.md §5` (avatar initials circle, name, email, Active/Inactive pill, toggle switch); toggle calls `PUT /api/admin/users/:id/status`; "Clerk Dashboard" link opens `href` from `GET /api/admin/clerk-dashboard-url` in new tab; `<` `>` pagination; admin-only bottom nav (Users | Instellingen)
- [X] T038 [US1B] Wire admin screen in `public/app.js`: after `/api/shell/me`, check `publicMetadata.role === 'admin'`; if admin, show admin bottom nav and `navigate('admin')` when admin nav item tapped; non-admins never see the admin component
- [X] T039 [US1B] Run `bun test tests/contract/admin.test.ts` — confirm all tests pass

**Checkpoint**: Admin user management fully functional; deactivation enforced on next request

---

## Phase 6: User Story 3 — Overview of Past Entries (Priority: P2)

**Goal**: Users see all their entries newest-first with mood pictograms; can search by note content; tap an entry to edit it.

**Independent Test**: Create 3+ entries with different scores. Open Overview → newest entry appears first. Each card shows correct mood colour circle. Type a search term → list filters instantly. Tap an entry → Note screen opens pre-filled.

### Tests (write first — confirm FAIL before implementing)

- [X] T040 [P] Write failing contract tests appended to `tests/contract/entries.test.ts`: `GET /api/v1/entries` → 200 array newest-first; with 0 entries → empty array `[]`; `q` param is ignored server-side (returns all entries regardless)

### Implementation

- [X] T041 [P] [US3] Extend `app01/src/routes/entries.ts`: add `GET /api/v1/entries` — query all entries for userId ordered by `entry_date DESC`; `q` param accepted but ignored (client-side filtering per research §search); apply global rate limit
- [X] T042 [US3] Create `public/components/overview-screen.js`: `<overview-screen>` LitElement; on connect call `GET /api/v1/entries` and cache full list; search input filters `this._entries` in memory on `input` event (case-insensitive substring on `noteText`); render flat list of entry cards per `ux-dna.md §5` — date (formatted per FR-011 Dutch rules), mood circle `32×32 px` coloured by `--mood-N` CSS var, first line of note, edit pencil icon; tap card → fire `CustomEvent('open-entry', { date })`; empty-state message when no entries; no-results message when search yields 0 matches (strings from `ux-dna.md §10`)
- [X] T043 [US3] Wire `open-entry` event in `public/app.js` → `navigate('note', { date })` passing the selected entry date
- [X] T044 [US3] Run `bun test tests/contract/entries.test.ts` — confirm all tests (T026 + T040) pass

**Checkpoint**: Overview shows full history with search and entry navigation working

---

## Phase 7: User Story 4 — Insights into Well-being Trends (Priority: P2)

**Goal**: Users see a 7-day mood graph with gaps for missing days and a generated Dutch summary text.

**Independent Test**: Create entries for at least 5 of the last 7 days. Open Insights → graph shows 7 day slots with correct scores and gaps. Summary text reflects the trend. With < 2 entries total → encouragement message shown instead.

### Tests (write first — confirm FAIL before implementing)

- [X] T045 [P] Write failing unit tests in `tests/unit/insights.test.ts`: trending up (scores 2,2,3,4,5) → summary contains "verbeterd" or "gestegen"; steady (all 3s) → summary contains "stabiel"; mixed (2,5,1,5,2) → summary contains "wisselend"; single entry → summary contains "meer notities"
- [X] T046 [P] Write failing contract tests in `tests/contract/insights.test.ts`: with 2+ entries in last 7 days → 200 `{ days: [7 items], summary: string, hasEnoughData: true }`; null for missing days; with 0 entries → `hasEnoughData: false`

### Implementation

- [X] T047 [P] [US4] Implement `app01/src/insights.ts`: pure function `generateInsights(days: { date: string, moodScore: number | null }[])`: compute average, trend (linear regression or simple first-vs-last delta), variance; return Dutch string per FR-043 — "Je stemming is deze week verbeterd." / "Een stabiele week — je scores waren consistent." / "Een wisselende week." / "Voeg meer notities toe voor inzichten in je stemmingspatroon."
- [X] T048 [P] [US4] Implement `app01/src/routes/insights.ts`: query `app01.entries` for userId in last 7 calendar days (yesterday through 6 days ago, server UTC); fill all 7 slots (null for missing); call `generateInsights()`; return `{ days, summary, hasEnoughData }`; apply rate limit FR-073; log `event=insights_fetched userId hasEnoughData`
- [X] T049 [US4] Mount insights route in `server.ts`
- [X] T050 [US4] Create `public/components/insights-screen.js`: `<insights-screen>` LitElement; call `GET /api/v1/insights`; when `hasEnoughData: false` show `insights.insufficient_data` string; otherwise render "Stemmingsverloop" heading, 7-column SVG or CSS-grid line graph — plot score dots, connect with line, show gap (no dot, no line) for null days, label x-axis with day abbreviation, y-axis 1–5; summary text paragraph below graph; skeleton shimmer while loading (ux-dna.md §6)
- [X] T051 [US4] Run `bun test tests/unit/insights.test.ts tests/contract/insights.test.ts` — confirm all tests pass

**Checkpoint**: Insights screen renders 7-day graph and Dutch summary; insufficient-data path shown correctly

---

## Phase 8: User Story 5 — Settings & Export (Priority: P3)

**Goal**: Users can toggle theme, configure reminders, export entries as CSV or PDF for a date range, and permanently delete their account.

**Independent Test**: Open Settings → toggle dark theme → app switches immediately; reload → theme persists. Open Export dialog → set date range to last 30 days → download CSV → open file → correct headers and data rows. Tap "Verwijder mijn account" → confirm → all data gone, redirected to login.

### Tests (write first — confirm FAIL before implementing)

- [X] T052 [P] Write failing contract tests in `tests/contract/settings.test.ts`: `GET /api/v1/settings` with no row → 200 with defaults `{ theme:'system', reminderEnabled:false, reminderTime:null }`; `PUT` `{ theme:'dark' }` → 200 updated; `PUT` `{ reminderEnabled:true }` without `reminderTime` → 400
- [X] T053 [P] Write failing unit tests in `tests/unit/export-csv.test.ts`: note with comma → value double-quoted; note with newline → value double-quoted; null moodScore → empty string in score column; header row always present
- [X] T054 [P] Write failing contract tests in `tests/contract/export.test.ts`: `GET /api/v1/export?from=2026-01-01&to=2026-04-07&format=csv` → 200 CSV with `Content-Disposition`; `format=pdf` → 200 PDF; missing params → 400; `from` > `to` → 400
- [X] T055 [P] Write failing contract tests in `tests/contract/account.test.ts`: `DELETE /api/v1/account` → 204; subsequent `GET /api/v1/entries` with same userId → 200 `[]` (no rows); subsequent `GET /api/shell/me` with same userId → 403

### Implementation

- [X] T056 [P] [US5] Implement `app01/src/routes/settings.ts`: `GET /api/v1/settings` — upsert default row on first call, return settings; `PUT /api/v1/settings` — validate theme enum, validate reminderTime required when reminderEnabled true, update row, return updated settings
- [X] T057 [P] [US5] Implement `app01/src/export-csv.ts`: `toCSV(entries)` — RFC 4180, header `date,score,note`, escape values with double-quotes when they contain commas or newlines, empty string for null score
- [X] T058 [P] [US5] Implement `app01/src/export-pdf.ts`: `toPDF(entries)` — pdfkit document; for each entry: date as bold heading, "Stemming: N/5" line, note text paragraph; return `Buffer`
- [X] T059 [US5] Implement `app01/src/routes/export.ts`: validate `from`, `to`, `format` params; query entries in date range; stream CSV via `toCSV()` or PDF via `toPDF()`; set correct Content-Type and Content-Disposition headers; emit FR-082 audit log `event=data_exported`; apply rate limit FR-071
- [X] T060 [US5] Implement `app01/src/routes/account.ts`: DB transaction — delete `app01.entries`, delete `app01.user_settings`, delete `shell.user_app_access` for userId; call `clerkClient.users.deleteUser(userId)` after commit; emit FR-081 audit log `event=account_deleted { deletedRows }`; apply rate limit FR-072; return 204
- [X] T061 [US5] Mount settings, export, account routes in `server.ts`
- [X] T062 [P] [US5] Create `public/components/settings-screen.js`: `<settings-screen>` LitElement; on connect `GET /api/v1/settings`; theme toggle — three-way (Licht / Donker / Systeem) → `PUT /api/v1/settings` → set `html[data-theme]`; reminder toggle + time input → `PUT /api/v1/settings`; "Verwijder mijn account" danger button → show inline confirmation dialog with `settings.delete.confirm` string, "Ja, verwijder alles" / "Annuleren" buttons → on confirm call `DELETE /api/v1/account` → `Clerk.signOut()` + reload
- [X] T063 [P] [US5] Create `public/components/export-dialog.js`: `<export-dialog>` LitElement; Van/Tot `<input type="date">` defaulting to oldest-entry-date / yesterday; "Alles" preset button; CSV/PDF segmented control (CSV default); "Downloaden" button disabled when `from > to` or 0 entries in range (check from loaded entry list); on submit: call `GET /api/v1/export?from&to&format` via `apiFetch`; on response create object URL + trigger `<a download>` click; loading state during fetch; inline error on failure; dismiss on ×, Annuleren, or backdrop click (FR-052a–e)
- [X] T064 [US5] Wire Settings and Export in `public/app.js`: tapping "Instellingen" in menu → close drawer, `navigate('settings')`; tapping "Exporteren" in menu → close drawer, open `<export-dialog>` overlay
- [X] T065 [US5] Apply theme on load in `public/app.js`: after `GET /api/v1/settings`, set `document.documentElement.dataset.theme` before first render to avoid flash
- [X] T066 [US5] Run `bun test tests/contract/settings.test.ts tests/unit/export-csv.test.ts tests/contract/export.test.ts tests/contract/account.test.ts` — confirm all tests pass

**Checkpoint**: Theme toggles and persists; CSV and PDF download correctly; account deletion wipes all data

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Audit, accessibility, deployment validation, and final checklist sign-off.

- [X] T067 [P] Add Dutch month abbreviation formatter to `public/app.js`: `formatEntryDate(dateStr)` → "Gisteren" when date = yesterday local, else `"D MMM YYYY"` with Dutch month abbreviations (jan, feb, mrt, apr, mei, jun, jul, aug, sep, okt, nov, dec); used in `<note-screen>` and `<overview-screen>`
- [X] T068 [P] Audit all Hono route handlers and middleware: confirm each emits a structured log on entry (info) and on error (error with full context) per constitution Principle IV; add any missing `log()` calls
- [X] T069 [P] Verify all FR-080–082 audit log events are emitted with the exact JSON shapes from `contracts/api-shell.md` and `contracts/api-app01.md`; spot-check with `bun run dev` + curl
- [X] T070 [P] Add `aria-label` attributes to all icon-only buttons (hamburger, ×, edit pencil, nav icons) and mood slider `aria-label="Stemming: [waarde] van de 5"` per `ux-dna.md §8`
- [X] T071 [P] Confirm all 429 responses include `Retry-After` header; add missing header to any rate-limit middleware response (FR-070–075)
- [X] T072 Run full test suite `bun test` — confirm all contract and unit tests pass with zero failures
- [X] T073 Run `quickstart.md` end-to-end on local environment: `bun install` → configure `.env` → `bun run db:migrate` → `bun run dev` → walk through all steps; fix any discrepancy between quickstart and actual behaviour
- [X] T074 [P] Build and smoke-test `Dockerfile`: `docker build -t beinge .` → `docker run -p 3000:3000 --env-file .env beinge` → confirm server starts, migrations run, `/` returns 200
- [X] T075 Review `specs/001-shell-app01-wellbeing/checklists/pre-tasks.md` — confirm all remaining open items are resolved or explicitly deferred; update checklist accordingly

**Checkpoint**: All tests green; Dockerfile builds and boots; pre-tasks checklist fully signed off

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately; all T001–T008 can run in parallel after T001
- **Phase 2 (Foundational)**: Depends on Phase 1; T009 before T012; T010+T011 before T013; T013 before T016; T016+T017+T018 can overlap
- **Phase 3 (US1)**: Depends on Phase 2 complete — BLOCKS all user story phases
- **Phase 4 (US2)**: Depends on Phase 3 (auth middleware must exist); T027 before T028
- **Phase 5 (US1B)**: Depends on Phase 2; can run in parallel with Phase 4 (different files)
- **Phase 6 (US3)**: Depends on Phase 4 (entries route must exist)
- **Phase 7 (US4)**: Depends on Phase 2; can run in parallel with Phase 6
- **Phase 8 (US5)**: Depends on Phase 2; can start after Phase 3; independent of Phase 4–7
- **Phase 9 (Polish)**: Depends on all desired phases complete

### Within Each Phase

1. Write test task → run `bun test` → **confirm FAIL**
2. Implement until test passes
3. Run full `bun test` — confirm no regressions before moving on

### Parallel Opportunities (single developer)

```
Phase 1:  T001 → then T002–T008 all in parallel
Phase 2:  T009, T010, T011 in parallel → T012, T013 → T014, T015, T016 in parallel → T017, T018
Phase 3:  T019 (test) → T020, T021 in parallel (implement) → T022 → T023, T024 in parallel → T025
Phase 4:  T026 (test) → T027 (implement) → T028 → T029, T030 in parallel → T031 → T032
Phase 5:  T033 (test) → T034, T035 in parallel → T036 → T037, T038 in parallel → T039
Phase 6:  T040 (test) → T041 → T042 → T043 → T044
Phase 7:  T045, T046 in parallel (tests) → T047, T048 in parallel → T049 → T050 → T051
Phase 8:  T052–T055 all in parallel (tests) → T056–T060 in parallel → T061 → T062, T063 in parallel → T064, T065 → T066
Phase 9:  T067–T071 all in parallel → T072 → T073, T074 in parallel → T075
```

---

## Implementation Strategy

### MVP Scope (Phase 1 + 2 + 3 + 4)

1. Phase 1: Setup
2. Phase 2: Foundational
3. Phase 3: US1 — Auth (login, logout, access denial)
4. Phase 4: US2 — Note screen (write note, set score, save, onboarding modal)
5. **STOP and VALIDATE**: A real user can sign in and log their first entry

### Full Delivery Order

| Phase | Story | Value Delivered |
|---|---|---|
| 1–2 | — | Project boots, DB migrates |
| 3 | US1 | Secure login/logout |
| 4 | US2 | Core data capture (MVP) |
| 5 | US1B | Admin operations |
| 6 | US3 | History browsing + search |
| 7 | US4 | Mood trend insights |
| 8 | US5 | Settings, export, account deletion |
| 9 | — | Production-ready |

---

## Notes

- `[P]` = different files, no shared in-progress dependencies — safe to run in parallel
- Constitution Principle II is NON-NEGOTIABLE: every test task must run and **fail** before its paired implementation tasks
- Commit after each phase checkpoint or logical group
- `bun test` must pass with zero failures before starting the next phase
- All user-facing strings must use the Dutch values from `ux-dna.md §10`; never hardcode English in components
