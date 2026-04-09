# Pre-Tasks Requirements Quality Checklist: Shell + app01 Daily Well-being

**Purpose**: Author self-review — validate requirement quality across all domains before writing tasks. Tests whether requirements are complete, clear, consistent, and measurable — not whether the implementation works.
**Created**: 2026-04-08
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md) | [contracts/](../contracts/) | [data-model.md](../data-model.md)
**Depth**: Standard (~32 items) | **Audience**: Author, pre-`/speckit-tasks`

---

## API Contract Requirements Quality

- [ ] CHK001 — Are all FR-0xx functional requirements traceable to at least one API endpoint in the contracts? [Completeness, Traceability]
- [ ] CHK002 — Is the `GET /api/v1/entries?q=` search behaviour fully specified (case sensitivity, empty-query behaviour, no-match response)? [Clarity, `contracts/api-app01.md`]
- [ ] CHK003 — Is the `PUT /api/v1/entries/:date` behaviour defined for dates other than yesterday (e.g., today, or a date more than one year ago)? [Clarity, FR-022, `contracts/api-app01.md`]
- [ ] CHK004 — Are error responses defined for all parameter failure modes on `GET /api/v1/export` (missing params, invalid date format, `from` > `to`)? [Completeness, `contracts/api-app01.md`]
- [ ] CHK005 — Is the failure behaviour specified for `DELETE /api/v1/account` when the Clerk API call fails after the DB transaction has already committed? [Edge Case, `research.md §12`, `contracts/api-app01.md`]
- [ ] CHK006 — Is the `GET /api/admin/users` response defined for the case where a `user_id` stored in the DB no longer exists in Clerk (deleted externally)? [Edge Case, Gap, `contracts/api-shell.md`]
- [ ] CHK007 — Are the `from`/`to` date range validation rules on the export endpoint consistent with the future-date restriction on `PUT /api/v1/entries/:date`? [Consistency, `contracts/api-app01.md`]
- [ ] CHK008 — Is the insights endpoint response fully specified when `hasEnoughData` is `false` (shape, status code, summary field presence)? [Completeness, FR-040, `contracts/api-app01.md`]
- [ ] CHK009 — Is the `hasEntries` field on `GET /api/shell/me` defined for the edge case where the user previously had entries but deleted their account and re-registered? [Clarity, `contracts/api-shell.md`]
- [x] CHK010 — Are rate limiting or throttling requirements defined for any endpoint, particularly admin list and export? [Gap, Non-Functional] → Resolved: FR-070–075 added; global 60 req/min + per-endpoint limits on export, account deletion, insights, admin toggle.

---

## Security & GDPR Requirements Quality

- [ ] CHK011 — Is the maximum token staleness window specified for admin role checks — when does a Clerk `publicMetadata` change take effect for an already-authenticated admin? [Clarity, FR-006, `research.md §9`]
- [x] CHK012 — Are requirements defined for a deactivated user with an active session — does denial take effect immediately on every request, or only after their token expires? [Clarity, FR-008] → Resolved: FR-008 updated; access check runs on every request via `shell.user_app_access` query — no caching; revocation is effective at the deactivated user's next API call, independent of JWT expiry.
- [x] CHK013 — Are structured logging requirements specified for security-relevant events (failed auth attempts, admin status changes, account deletion)? [Gap, Constitution §IV] → Resolved: FR-080–082 added covering AVG/GDPR Art. 5(2), 17, 33; SOC 2 deferred (out of scope v1).
- [ ] CHK014 — Is the `CLERK_DEV_BYPASS` production safety constraint documented as a formal requirement (not only a research note), with the `NODE_ENV=production` guard explicitly stated? [Gap, `research.md §1`]
- [ ] CHK015 — Are data isolation requirements explicitly specified at the API middleware layer — not only at the DB level (FR-060)? [Completeness, FR-060]
- [x] CHK016 — Is the account deletion confirmation UX requirement specified with measurable criteria (what exact action the user must take to confirm intent before `DELETE /api/v1/account` is called)? [Clarity, FR-055] → Resolved: FR-055 updated; two-step modal pattern: tap "Verwijder mijn account" → modal opens with `settings.delete.confirm` warning text + destructive confirm button (`settings.delete.confirm_button`) + cancel (`settings.delete.cancel_button`); modal not dismissable by tapping outside; no typed confirmation required (mobile best practice).
- [ ] CHK017 — Are requirements defined for what PII fields are included in CSV and PDF exports — specifically whether name or email is included alongside date, score, and note? [Clarity, FR-053]
- [ ] CHK018 — Is the distinction between deactivation (admin toggle, FR-008) and account deletion (user self-service, FR-055) documented clearly enough to prevent confusion during implementation? [Clarity, Consistency, FR-008, FR-055]

---

## UX Requirements Quality

- [x] CHK019 — Is the onboarding modal content and copy specified (what text it displays, what action dismisses it, what makes it "brief")? [Completeness, FR-010a, Gap] → Resolved: FR-010b added; heading, 3 body sentences, single CTA "Aan de slag →", no dismiss-by-overlay; strings in ux-dna.md §10.
- [x] CHK020 — Are the five mood score colour values confirmed with final hex values, or are they still marked approximate in `ux-dna.md §2`? [Completeness, `ux-dna.md §2`] → Resolved: hex values confirmed in `ux-dna.md §2` — score 1 `#e05252`, 2 `#e8964d`, 3 `#c8c84a`, 4 `#5abf7a`, 5 `#3ab55a`; CSS vars `--mood-1` through `--mood-5`.
- [x] CHK021 — Are requirements defined for the export dialog UX (date range picker behaviour, format selector, submit/loading/error states, cancel action)? [Gap, FR-052, FR-054] → Resolved: FR-052a–e added; layout, defaults, all states, and dismiss behaviour fully specified; strings in ux-dna.md §10.
- [ ] CHK022 — Is an empty-state requirement defined for the Overview search bar when no entries match the query text? [Gap, FR-034]
- [x] CHK023 — Are Dutch UI copy requirements documented in a centralised location, or are they implicitly scattered across spec, ux-dna.md, and wireframes? [Completeness, Gap, Clarification §1] → Resolved: ux-dna.md §10 is now the single source of truth for all fixed Dutch strings.
- [ ] CHK024 — Are requirements defined for the Settings screen layout and visual structure beyond the enumerated settings (theme, reminder, delete account)? [Gap, FR-050, FR-051, FR-055]
- [ ] CHK025 — Are loading state requirements defined for all screens that depend on asynchronous API calls (Note, Overview, Insights, Settings, Admin)? [Coverage, `ux-dna.md §6`]
- [ ] CHK026 — Are requirements for the Admin screen's mobile layout consistent with the overall mobile-first layout specification in `ux-dna.md §1`? [Consistency, FR-007, `ux-dna.md §1`]

---

## Data Model Requirements Quality

- [x] CHK027 — Are index requirements defined to support substring search on `app01.entries.note_text` (FR-034) — does the current index in `data-model.md §Indexes` cover this query? [Gap, FR-034, `data-model.md §Indexes`] → Resolved: search is client-side in v1 (no index needed); `pg_trgm` GIN index prescribed as upgrade path if pagination is added.
- [ ] CHK028 — Is the `entry_date` timezone edge case specified — what date is stored when a user saves an entry near midnight and the server UTC date differs from the user's local device date? [Clarity, FR-011, `spec.md Assumptions`]
- [ ] CHK029 — Are cascade delete requirements complete and unambiguous — does the spec define that all three tables (`entries`, `user_settings`, `user_app_access`) are deleted in a single transaction? [Completeness, FR-063, `data-model.md`]
- [ ] CHK030 — Is the `updated_at` column behaviour defined for partial updates (e.g., mood score changed without altering note text)? [Clarity, `data-model.md §app01.entries`]
- [ ] CHK031 — Is the `reminder_time` nullability rule consistent between the data model (`NULLABLE` when disabled) and the API validation rule (`required when reminderEnabled is true`)? [Consistency, `data-model.md §user_settings`, `contracts/api-app01.md §Settings`]
- [ ] CHK032 — Are migration rollback requirements defined for destructive schema changes — is it sufficient that `data-model.md` states "manual SQL only", or does the spec need to formalise this as a constraint? [Completeness, `data-model.md §Migration Strategy`]

---

## Notes

- Mark items `[x]` when the requirement is confirmed clear and complete.
- Add inline comments for any item where a gap is found, then update the relevant spec/contract before proceeding to `/speckit-tasks`.
- Items CHK010, CHK013, CHK019, CHK021, CHK023 are the most likely to surface actionable gaps at this stage.
