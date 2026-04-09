# Feature Specification: Shell + app01 Daily Well-being

**Feature Branch**: `001-shell-app01-wellbeing`
**Created**: 2026-04-07
**Status**: Draft
**Input**: Shell auth module and app01 daily well-being micro app

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Secure Access via Shell (Priority: P1)

A user wants to access the beinge well-being app. Before they can use any features, they must log in through the shell's authentication screen. Once authenticated, the shell grants them access to app01 and keeps their session active.

**Why this priority**: Without authentication, no data can be associated with a specific person and the app cannot function. This is the prerequisite for all other stories.

**Independent Test**: Can be fully tested by opening the app URL without being logged in, completing the login flow, and verifying the Note screen appears. Delivers: "only I can see my data."

**Acceptance Scenarios**:

1. **Given** a visitor opens the app URL without being logged in, **When** the app loads, **Then** they see the login screen before any app01 content
2. **Given** a visitor on the login screen, **When** they provide valid credentials, **Then** they are taken directly to the Note screen inside app01
3. **Given** a logged-in user, **When** they choose "Logout" from the top menu, **Then** they are signed out and returned to the login screen
4. **Given** a person who has an account but is not registered for app01, **When** they log in, **Then** they are informed they do not have access to app01

---

### User Story 1b - Admin: User Management (Priority: P2)

An administrator wants to see who has access to the app and control that access. They open the Admin screen (accessible only to admin accounts) and see a list of all registered users. They can activate or deactivate any user and jump directly to the Clerk dashboard for deeper identity management.

**Why this priority**: Needed to operationally manage access without requiring direct database access or Clerk knowledge for every change.

**Independent Test**: Can be tested by logging in as an admin, deactivating a user, and confirming that user can no longer access app01 after their next login.

**Acceptance Scenarios**:

1. **Given** an admin user logs in, **When** they navigate to the Admin screen, **Then** they see a paginated list of all users with their name, email, and current active/inactive status
2. **Given** an admin viewing a user row, **When** they toggle the (de)activate button, **Then** the user's status is updated immediately and an inactive user is denied access to app01 on their next authenticated request
3. **Given** an admin on the Admin screen, **When** they click "Clerk Dashboard", **Then** they are taken to the Clerk management dashboard in a new tab
4. **Given** a non-admin user, **When** they attempt to access the Admin screen URL directly, **Then** they receive an access-denied response

---

### User Story 2 - Daily Well-being Note (Priority: P1)

A user wants to record how they felt yesterday. They open the app and are taken directly to the Note screen, which shows yesterday's date. They write a free-form note about their day and set a mood score from 1 to 5 using a vertical slider. The entry is saved for that date.

**Why this priority**: This is the primary data-capture action and the core value of the app. Without it there is nothing to review or reflect on.

**Independent Test**: Can be fully tested by logging in, typing a note, setting the slider, saving, and then re-opening the app to confirm the entry persists.

**Acceptance Scenarios**:

1. **Given** a logged-in user opens app01, **When** the Note screen loads, **Then** it shows yesterday's date and any previously saved note/score for that date
2. **Given** a user on the Note screen, **When** they type text and position the slider, **Then** the note and score are saved (automatically on change, or via an explicit save action)
3. **Given** a user who has not yet set a score for a date, **When** they open the Note screen for that date, **Then** the slider has no pre-selection (or a neutral mid-point default)
4. **Given** a user who already saved a note for yesterday, **When** they re-open the app, **Then** their previously saved note and score are pre-filled on the Note screen
5. **Given** a user logging in for the very first time, **When** the app loads, **Then** the onboarding modal is shown with heading "Welkom bij beinge", three body sentences, and an "Aan de slag →" button; after tapping the button they land on the Note screen with yesterday's date and empty fields; the modal does not appear on subsequent logins

---

### User Story 3 - Overview of Past Entries (Priority: P2)

A user wants to scan their history. The Overview screen shows all their past entries as a list — newest first — with each entry displaying its date, a colour-coded pictogram reflecting the mood score, and the first line of the note.

**Why this priority**: Provides continuity and context; users need to see their history to track patterns and revisit specific days.

**Independent Test**: Can be tested by creating at least three entries and verifying the Overview list shows them newest-first with correct pictogram colours.

**Acceptance Scenarios**:

1. **Given** a user with saved entries, **When** they open the Overview screen, **Then** they see all entries ordered newest-first, each showing a date, a coloured pictogram, and the first line of the note
2. **Given** an entry with score 5, **When** displayed in the Overview, **Then** its pictogram uses the colour associated with the highest score; score 1 uses the lowest-score colour
3. **Given** a user with no entries yet, **When** they open the Overview screen, **Then** they see a friendly empty-state message
4. **Given** a user viewing the Overview, **When** they tap an entry, **Then** they are taken to the Note screen pre-filled with that entry's date, note, and score

---

### User Story 4 - Insights into Well-being Trends (Priority: P2)

A user wants to understand their mood across the past week. The Insights screen shows a graph of their mood scores for the past 7 days and a short summary text describing the period.

**Why this priority**: Transforms raw data into meaningful reflection; this differentiates the app from a plain diary.

**Independent Test**: Can be tested with 7 or more days of data by verifying the graph plots each day's score correctly and a summary text is displayed.

**Acceptance Scenarios**:

1. **Given** a user with entries in the past 7 days, **When** they open the Insights screen, **Then** they see a graph showing scores across the 7-day window
2. **Given** days in the 7-day window where no entry exists, **When** shown on the graph, **Then** those days are visually indicated as missing (e.g., a gap or empty marker)
3. **Given** a user with fewer than 2 entries total, **When** they open the Insights screen, **Then** they see an encouraging message to add more entries before insights can be shown
4. **Given** the Insights screen, **When** it loads with sufficient data, **Then** a short summary text about the 7-day period is visible below the graph

---

### User Story 5 - User Settings & Export (Priority: P3)

A user wants to adjust their personal preferences or download their data. They access Settings or Export from the top menu.

**Why this priority**: Supports personalisation and data portability but does not block core functionality.

**Independent Test**: Can be tested by accessing Settings, changing a preference, and confirming it persists after logging out and back in. Export can be tested by selecting a date range and confirming a valid CSV and PDF download.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they tap the top menu button, **Then** they see exactly "Settings", "Export", and "Logout" as the menu options
2. **Given** a user on the Settings screen, **When** they change a preference, **Then** the change takes effect immediately and persists across sessions
3. **Given** a user who taps "Export" in the top menu, **When** they select a date range and a format (CSV or PDF), **Then** a file is downloaded containing the date, mood score, and full note for every entry in that range

---

### Edge Cases

- **First use**: On a user's very first login (no entries exist), a one-time onboarding message is shown; after dismissing it the user lands on the Note screen with yesterday's date and empty fields. The onboarding message is never shown again once dismissed.
- What if the user has no entries at all for the past 7 days when opening the Insights screen?
- Can a user navigate to the Note screen for a past date and edit it, or is history read-only?
- **Concurrent edits**: If two devices save a note for the same date near-simultaneously, last-write-wins — the most recent `UPSERT` silently overwrites the stored entry; no conflict warning is shown.
- Can the same shell account be registered for multiple micro apps at once?

## Clarifications

### Session 2026-04-08

- Q: What is the UI language? → A: Dutch only (v1); locale switching (Dutch/English) deferred to a future version.
- Q: What does the Note screen show on a user's very first use (no yesterday entry)? → A: A brief onboarding message is shown first, then the user lands on the Note screen with yesterday's date and empty fields.
- Q: How is the admin role assigned? → A: Via Clerk public metadata (`publicMetadata.role === "admin"`); set in the Clerk dashboard, read from the session token on every request.
- Q: Concurrent edit conflict resolution strategy? → A: Last-write-wins — the most recent UPSERT silently overwrites the stored entry.
- Q: Is GDPR right to erasure (account + data deletion) in scope for v1? → A: Yes — a "delete my account" action in Settings permanently deletes all entries and removes the user record.

---

## Requirements *(mandatory)*

### Functional Requirements

**Shell — Authentication & Access Control**

- **FR-001**: The system MUST require users to authenticate before any app01 content is accessible
- **FR-002**: The shell MUST support login and logout for all micro apps it hosts
- **FR-003**: The shell MUST manage access per micro app — a user registered for app01 MUST NOT automatically have access to any future micro app, and vice versa
- **FR-004**: The shell MUST maintain the authenticated session across all screen navigation within the app
- **FR-005**: The shell's authentication and session logic MUST be entirely separate from app01's logic; neither module may depend on the other's internals

**Shell — Admin**

- **FR-006**: The shell MUST expose an Admin screen accessible only to users whose Clerk session token contains `publicMetadata.role === "admin"`; any other authenticated user MUST receive an access-denied response; the role is set in the Clerk dashboard and requires no database record
- **FR-007**: The Admin screen MUST display a paginated list of all registered users showing at minimum: full name, email address, and current active/inactive status
- **FR-008**: Each user row MUST include a toggle that activates or deactivates that user; an inactive user MUST be denied access to all micro apps on their next authenticated request; the access check MUST be performed on every authenticated request by querying `shell.user_app_access` — no session-level caching of access state is permitted; revocation takes effect immediately from the deactivated user's next API call, independent of their active session or JWT expiry
- **FR-009**: The Admin screen MUST include a link that opens the Clerk management dashboard in a new browser tab

**app01 — Navigation & Layout**

- **FR-010**: app01 MUST open to the Note screen on every launch after authentication
- **FR-010a**: On a user's very first login (no entries exist), app01 MUST display a one-time onboarding modal before showing the Note screen; the modal MUST NOT appear again after it has been dismissed; dismissed state is persisted in `localStorage` under the key `beinge_onboarding_seen`
- **FR-010b**: The onboarding modal MUST contain exactly: heading "Welkom bij beinge"; body text consisting of three sentences — "Schrijf elke dag een korte notitie over hoe je je voelde.", "Geef je stemming een score van 1 tot 5 met de schuifregelaar.", "Alleen jij kunt jouw notities zien."; a single dismiss button labelled "Aan de slag →"; no secondary action, no steps, no carousel; tapping outside the modal MUST NOT dismiss it — only the button does
- **FR-011**: The Note screen MUST default to yesterday's date (relative to the user's local device date); entries are stored with a full UTC timestamp but displayed as human-readable Dutch text: "Gisteren" for yesterday, or "D MMM YYYY" (Dutch month abbreviation) for any earlier date
- **FR-012**: app01 MUST show a persistent top bar containing the app title "beinge" and a menu button
- **FR-013**: The top menu MUST offer exactly three options: "Settings", "Export", and "Logout"
- **FR-014**: app01 MUST show a persistent bottom navigation bar with exactly three items: "Note", "Overview", "Insights"
- **FR-015**: The bottom navigation button corresponding to the currently active screen MUST be visually highlighted

**app01 — Note Screen**

- **FR-020**: The Note screen MUST allow users to write free-form text about their well-being for the displayed date
- **FR-021**: The Note screen MUST include a vertical slider for selecting an overall mood score on a scale of 1 (lowest) to 5 (highest)
- **FR-022**: Note text and mood score MUST be saved per user per calendar date
- **FR-023**: When a user views the Note screen for a date that already has a saved entry, the saved note and score MUST be pre-filled
- **FR-024**: Users MUST be able to navigate from the Overview screen to the Note screen for any past date to view or edit that entry

**app01 — Overview Screen**

- **FR-030**: The Overview screen MUST display all of the user's saved entries as a flat list ordered newest-first, with no date-based grouping
- **FR-031**: Each list item MUST show: the entry date (formatted per FR-011 display rules), a pictogram coloured by the mood score, and the first line of the note text
- **FR-032**: The pictogram colour MUST visually distinguish all five score levels (1–5) using a consistent colour scale defined in the UX design assets
- **FR-033**: When no entries exist, the Overview MUST show a friendly empty-state message
- **FR-034**: The Overview screen MUST include a text search bar that filters the entry list in real time by note content; clearing the search restores the full list

**app01 — Insights Screen**

- **FR-040**: The Insights screen MUST display a graph of the user's mood scores for the most recent 7 calendar days
- **FR-041**: Days within the 7-day window that have no saved entry MUST be visually indicated on the graph
- **FR-042**: The Insights screen MUST display a short summary text describing the user's well-being trend for the 7-day period
- **FR-043**: The summary text MUST be automatically generated by the system based solely on the user's mood scores for the 7-day period (rule-based; no AI or external model required); example outputs: "Your mood trended upward this week" or "A steady week — scores were consistent"

**app01 — Settings Screen**

- **FR-050**: The Settings screen MUST allow the user to toggle between light and dark display themes
- **FR-051**: The Settings screen MUST allow the user to opt in or out of a daily reminder to log their well-being (the reminder delivery channel — push notification or email — is determined at planning stage)
- **FR-055**: The Settings screen MUST include a "Verwijder mijn account" (delete my account) action that, upon confirmation, permanently deletes all of the user's entries and removes their user record; the action MUST use a two-step confirmation: tapping the action button opens a modal dialog showing the warning copy from `settings.delete.confirm`; the modal MUST contain exactly two actions — a destructive confirm button (`settings.delete.confirm_button`) that triggers `DELETE /api/v1/account`, and a cancel button (`settings.delete.cancel_button`) that closes the modal without action; the modal MUST NOT be dismissable by tapping outside it; no typed text confirmation is required (mobile UX best practice)

**app01 — Export (top menu action)**

- **FR-052**: Tapping "Exporteren" in the top menu MUST open a modal dialog; the menu MUST close before the dialog opens
- **FR-052a**: The export dialog MUST contain: a "Van" date input and a "Tot" date input (both native `<input type="date">`); an "Alles" quick-preset button that sets Van to the user's oldest entry date and Tot to yesterday; a format selector (CSV default, PDF alternative); a "Downloaden" primary button; an "Annuleren" dismiss button; and a × close button in the dialog header
- **FR-052b**: Default values on open: Van = date of the user's oldest entry; Tot = yesterday; format = CSV
- **FR-052c**: The "Downloaden" button MUST be disabled when: Van is after Tot (show inline error "De startdatum moet voor de einddatum liggen."); or the selected range contains zero entries (show inline warning "Geen notities in deze periode.")
- **FR-052d**: While the export is generating, the button label MUST change to "Bezig met exporteren..." and the date inputs MUST be locked; on success the dialog closes and the browser download triggers automatically; on error an inline error message is shown and the inputs are re-enabled
- **FR-052e**: The dialog MAY be dismissed by tapping ×, tapping "Annuleren", or tapping outside the modal
- **FR-053**: The exported file MUST include the full date, mood score (1–5), and full note text for every entry in the selected range
- **FR-054**: The user MUST be able to choose the export format: CSV or PDF

**Data**

- **FR-060**: All entry data (notes and scores) MUST be stored per user; one user MUST NOT be able to access another user's data
- **FR-061**: The data store for app01 MUST be logically separate from any future micro app's data store; adding a new micro app MUST NOT require changes to app01's data
- **FR-062**: All entry data MUST persist across sessions and devices for the same authenticated user
- **FR-063**: When a user deletes their account, ALL of their entries MUST be permanently deleted in the same operation; no orphaned data may remain after deletion

**Non-Functional — Rate Limiting**

- **FR-070**: All authenticated API endpoints MUST enforce a global per-user limit of 60 requests per minute; exceeding this limit MUST return `429 Too Many Requests` with a `Retry-After` header
- **FR-071**: `GET /api/v1/export` MUST be limited to 10 requests per user per hour
- **FR-072**: `DELETE /api/v1/account` MUST be limited to 5 requests per user per day
- **FR-073**: `GET /api/v1/insights` MUST be limited to 30 requests per user per minute
- **FR-074**: `PUT /api/admin/users/:userId/status` MUST be limited to 20 requests per admin user per minute
- **FR-075**: Rate limiting MUST be implemented as per-user in-memory state within the single server process; no external store (e.g., Redis) is required for v1

**Non-Functional — Audit Logging (AVG/GDPR compliance)**

- **FR-080**: Every authentication failure and access-denied response MUST emit a structured JSON log entry containing: `event`, `userId` (if determinable from the token), `path`, `reason`, and `timestamp`; this satisfies AVG Art. 33 breach-detection obligations
- **FR-081**: Account deletion MUST emit a structured JSON log entry containing: `event="account_deleted"`, `userId`, `timestamp`, and the count of rows deleted per table; the log entry MUST NOT contain note text, mood scores, or any other personal content — only the fact and scope of deletion; this satisfies AVG Art. 17 accountability
- **FR-082**: Data export events (`GET /api/v1/export`) and admin status-change events (`PUT /api/admin/users/:userId/status`) MUST each emit a structured JSON log entry; export logs MUST include `userId`, `from`, `to`, `format`, and `timestamp`; admin logs MUST include `adminUserId`, `targetUserId`, `active` (new value), and `timestamp`; this satisfies AVG Art. 5(2) accountability for privileged and data-portability actions

### Key Entities

- **User**: An authenticated individual; identity and credentials are managed externally by the shell's authentication service; referenced within app01 only by a unique identifier
- **Admin**: A user with `publicMetadata.role === "admin"` set in Clerk; can view and (de)activate other users via the Admin screen; the role is managed exclusively in the Clerk dashboard
- **Entry**: A user's well-being record for a specific calendar date; contains the date (stored as full UTC timestamp), free-form text note, and mood score (integer 1–5); at most one entry exists per user per calendar date
- **Shell Session**: The active authenticated context that bridges the user's external identity into app01 and enforces access control

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user can authenticate and reach the Note screen in under 30 seconds from first opening the app
- **SC-002**: A returning user can open the app, write a note, set a mood score, and save — in under 60 seconds
- **SC-003**: The Overview list loads and is scrollable within 2 seconds for users with up to 365 entries
- **SC-004**: The Insights graph renders within 2 seconds of opening the Insights screen
- **SC-005**: 100% of a user's entries are accessible only to that authenticated user and to no other user
- **SC-006**: Notes and scores survive a browser refresh, device change, and re-login without any data loss
- **SC-007**: All four screens are fully usable on a standard mobile screen in portrait orientation without horizontal scrolling

## Assumptions

- Users are always online; offline data capture is out of scope for v1
- Each user has at most one account, managed by the shell's external authentication service; account creation/registration is handled by that service, not by app01
- Each user may have at most one entry per calendar date; multiple entries for the same day are not required
- The Note screen's "yesterday" date is determined by the user's local device clock; no special time-zone handling is required for v1
- Users can tap any entry in the Overview to view and edit it; editing past entries is in scope
- The colour scale for mood pictograms (scores 1–5) is defined in the UX design assets and not further specified here
- The UX design assets (wireframes, colour palette, typography, interaction patterns) will be provided separately and stored under `specs/ux-dna.md` and the wireframes directory; the specification does not prescribe visual design details
- Dark and light visual themes are both supported; the user can toggle between them in Settings (FR-050)
- The shell and app01 are deployed as a single web application; the separation is a logical/code boundary, not a separate URL or deployment unit
- A second micro app may be added in the future using the same shell, but that is out of scope for this specification
- The UI language is Dutch in v1; all user-facing strings, labels, and date formatting MUST be in Dutch; locale switching (Dutch/English) is explicitly deferred to a future version
- Overview note-text search (FR-034) is implemented client-side in v1; the server returns all entries and the frontend filters in memory; this is sufficient at ≤ 365 entries per user and requires no additional database index; server-side search with a `pg_trgm` index is the prescribed upgrade path if pagination is introduced
- Where wireframe files (PNG) conflict with this specification, the specification takes precedence; wireframes are illustrative and may not reflect final decisions captured here
