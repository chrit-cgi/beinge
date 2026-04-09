# Implementation Plan: Shell + app01 Daily Well-being

**Branch**: `001-shell-app01-wellbeing` | **Date**: 2026-04-08 | **Spec**: `specs/001-shell-app01-wellbeing/spec.md`
**Input**: Feature specification from `specs/001-shell-app01-wellbeing/spec.md`

## Summary

Build the beinge shell (Clerk authentication + access control + admin) and app01 (daily well-being note, overview, insights, settings, export, account deletion) as a single Hono server deployed on Sliplane. The frontend is plain HTML/CSS/JS with Lit web components for the interactive screens. All data lives in PostgreSQL (two schemas: `shell`, `app01`). UI language is Dutch throughout.

## Technical Context

**Language/Version**: Bun 1.x — TypeScript source files run directly, no build step
**Primary Dependencies**: Hono 4.x, `@hono/clerk-auth`, `@clerk/backend`, Lit 3.x, `@clerk/clerk-js`, `drizzle-orm`, `postgres` (postgres.js), `pdfkit` (PDF export — approved new dependency)
**Storage**: PostgreSQL 16 (Sliplane managed); two schemas: `shell`, `app01`; Drizzle ORM for schema + migrations
**Testing**: Bun's built-in test runner (`bun test`); contract tests + unit tests; real DB required (no mocks — per constitution)
**Target Platform**: Linux container on Sliplane.io; consumed via mobile web browser (portrait, ~390 px)
**Project Type**: Web service + web application (single container; Hono serves both API routes and static frontend)
**Performance Goals**: SC-001 auth < 30 s; SC-002 note capture < 60 s; SC-003 overview list < 2 s (≤ 365 entries); SC-004 insights graph < 2 s
**Constraints**: Single Sliplane container; no offline capability; Dutch UI (v1); no framework-level abstractions (no bundler, no JSX, no transpiler)
**Scale/Scope**: ~100 initial users; up to 365 entries/user/year; single micro app (app01) in v1

## Constitution Check

*Verified at Phase 0 start. Re-verified after Phase 1 design.*

| Principle | Status | Evidence |
|---|---|---|
| I. Specification-First | ✅ PASS | `spec.md` written and clarified; all FRs traceable to user stories; no implementation started |
| II. Test-First | ✅ PASS (enforced in tasks) | Tasks must write failing tests before each implementation task; contract tests cover all public API endpoints |
| III. Simplicity & YAGNI | ✅ PASS | No framework abstractions; Lit only for interactive components; `pdfkit` approved with justification; no speculative features |
| IV. Observability | ✅ PASS (enforced in tasks) | Every Hono route and middleware must log structured JSON at entry/exit; error paths log full context |
| V. Versioning | ✅ PASS | API versioned at `/api/v1`; contracts document breaking-change policy; Semantic Versioning declared |

**Post-Phase-1 re-check**: All principles remain satisfied. No violations to justify in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```
specs/001-shell-app01-wellbeing/
├── plan.md              ← this file
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-shell.md
│   └── api-app01.md
├── checklists/
│   └── requirements.md
├── wireframes/
│   └── app01/
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```
server.ts                          # Hono app entry; mounts all routers; starts after migrations
Dockerfile
.env.example
package.json
drizzle.config.ts

drizzle/                           # Generated SQL migrations (drizzle-kit generate)
  0001_initial.sql

shared/
  db/
    client.ts                      # postgres.js pool + drizzle instance
    migrate.ts                     # Migration runner (called at container start)

shell/
  src/
    middleware/
      auth.ts                      # clerkMiddleware + user_app_access check
      admin.ts                     # publicMetadata.role === "admin" guard
    routes/
      me.ts                        # GET /api/shell/me
      admin.ts                     # GET /api/admin/users, PUT /api/admin/users/:id/status
    db/
      schema.ts                    # shell.user_app_access Drizzle schema

app01/
  src/
    routes/
      entries.ts                   # GET /api/v1/entries, GET+PUT /api/v1/entries/:date
      insights.ts                  # GET /api/v1/insights
      settings.ts                  # GET+PUT /api/v1/settings
      export.ts                    # GET /api/v1/export?from&to&format
      account.ts                   # DELETE /api/v1/account
    db/
      schema.ts                    # app01.entries, app01.user_settings Drizzle schemas
    insights.ts                    # Rule-based summary pure function
    export-csv.ts                  # CSV serialisation
    export-pdf.ts                  # PDF serialisation (pdfkit)

public/
  index.html                       # Single-page app shell; loads Clerk JS + components
  app.js                           # apiFetch wrapper; navigation controller
  components/
    note-screen.js                 # <note-screen> Lit component
    overview-screen.js             # <overview-screen> Lit component
    insights-screen.js             # <insights-screen> Lit component
    settings-screen.js             # <settings-screen> Lit component
    onboarding-modal.js            # <onboarding-modal> Lit — first-use only
    export-dialog.js               # <export-dialog> Lit — date range + format picker
    admin-screen.js                # <admin-screen> Lit — admin only
  styles/
    tokens.css                     # CSS custom properties (--color-*, typography scale)
    base.css                       # Reset, typography
    layout.css                     # Top bar, bottom nav, content area

tests/
  contract/
    shell-me.test.ts               # GET /api/shell/me
    entries.test.ts                # GET+PUT /api/v1/entries
    insights.test.ts               # GET /api/v1/insights
    settings.test.ts               # GET+PUT /api/v1/settings
    export.test.ts                 # GET /api/v1/export (CSV + PDF)
    account.test.ts                # DELETE /api/v1/account
    admin.test.ts                  # GET+PUT /api/admin/users
  unit/
    insights.test.ts               # Rule-based summary function
    export-csv.test.ts             # CSV formatting edge cases
```

**Structure Decision**: Single-repo monolith with logical separation via `shell/` and `app01/` directories. `shared/` holds only the DB client (the one true shared concern). The frontend lives under `public/` and is served as static files by Hono. This is the simplest layout that satisfies FR-005 (shell and app01 internals do not depend on each other).
