# Research: Shell + app01 Daily Well-being

**Branch**: `001-shell-app01-wellbeing` | **Date**: 2026-04-08

All technology choices are pre-determined by the constitution. This document records integration patterns, version-specific decisions, and local-dev constraints.

---

## 1. Clerk + Hono Integration

**Decision**: Use `@hono/clerk-auth` middleware for JWT verification on protected routes. Use `@clerk/clerk-js` browser SDK on the frontend to obtain the session token and inject it as `Authorization: Bearer <token>` on every `fetch` call.

**Pattern**:

```
Browser                       Hono Server
  |                               |
  | load page                     |
  |------------------------------>|
  |     index.html                |
  |<------------------------------|
  |                               |
  | Clerk.load() → session        |
  | session.getToken() → JWT      |
  |                               |
  | GET /api/v1/entries           |
  | Authorization: Bearer <JWT>   |
  |------------------------------>|
  |       clerkMiddleware()        |
  |       verifies JWT            |
  |       ctx.get('clerkAuth')    |
  |       → { userId }           |
  |                               |
  |     JSON response             |
  |<------------------------------|
```

**Rationale**: `@hono/clerk-auth` is the official Clerk middleware for Hono. It calls `@clerk/backend` internally to verify JWTs without a network round-trip (uses Clerk's JWKS public keys). This is faster and simpler than a session-cookie approach.

**Alternatives considered**:
- Custom JWT verification with `jose` — more code, no benefit over the official package.
- Clerk session cookies — requires CORS configuration and a specific backend SDK mode; more complex than stateless JWT.

**Local dev bypass**: When `CLERK_DEV_BYPASS=true`, the shell middleware skips Clerk verification and injects a hardcoded test user ID (`local-dev-user`). This is guarded by a check that `NODE_ENV !== 'production'` so it can never activate in deployment.

---

## 2. Drizzle ORM + Bun + PostgreSQL Connection Pooling

**Decision**: Use `drizzle-orm` with the `postgres` (postgres.js) driver. postgres.js handles connection pooling natively (configurable `max` connections). This is the recommended pairing for Bun because postgres.js uses TCP directly (no native bindings) and works without native module compilation.

**Connection pool config** (in `shared/db/client.ts`):

```ts
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'

const pool = postgres(process.env.DATABASE_URL!, {
  max: 10,          // max concurrent connections
  idle_timeout: 20, // seconds before idle connection is closed
  connect_timeout: 10,
})

export const db = drizzle(pool)
```

**Migrations**: `drizzle-kit` generates SQL migration files (`drizzle/` directory). The migration runner (`shared/db/migrate.ts`) is called once at container start before `server.ts` binds to the port.

**Rationale**: postgres.js is the only PostgreSQL client with proven Bun compatibility and built-in pooling. `pg` (node-postgres) requires native bindings that complicate Bun on Chromebook. `drizzle-kit` keeps migrations in source control alongside schema definitions.

**Alternatives considered**:
- `pg` (node-postgres) — native bindings, Bun compatibility inconsistent on ARM Chromebooks.
- Prisma — too heavy; own migration system conflicts with YAGNI principle; overkill for this schema size.

---

## 3. Lit Web Components + Clerk JS SDK

**Decision**: Each of the four app01 screens is a `LitElement` custom element (e.g., `<note-screen>`, `<overview-screen>`). The `public/index.html` imports these as ES modules. Navigation is handled by showing/hiding elements (no client-side router needed at this scale). Clerk JS is loaded via its CDN script tag or as an ES module import.

**JWT injection pattern**:

```ts
// shared fetch wrapper (public/app.js)
async function apiFetch(path, options = {}) {
  const token = await window.Clerk.session.getToken()
  return fetch(path, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
}
```

Each Lit component calls `apiFetch` instead of `fetch` directly.

**Rationale**: Lit provides reactive properties and scoped CSS with near-zero runtime overhead. The slider, graph, and navigation state all benefit from Lit's property-change lifecycle. Plain JS would require manual `querySelectorAll` + event listeners for the same result.

**Alternatives considered**:
- React/Vue — contradicts constitution (no framework-level abstractions without explicit approval).
- Plain JS with `<template>` cloning — viable for static lists (Overview) but becomes fragile for the interactive Note screen (slider + auto-save) and Insights (chart + reactive summary text).

---

## 4. Mobile-First Frontend Approach

**Decision**: CSS custom properties for theming (light/dark). `100dvh` for full-screen layout on mobile. Bottom navigation bar is `position: fixed; bottom: 0`. Vertical slider uses `<input type="range" orient="vertical">` or a CSS-rotated range input with `writing-mode: vertical-lr` for cross-browser support.

**Dark/light theme**: A `data-theme` attribute on `<html>` toggles CSS custom property sets. The active theme is persisted in `user_settings` and applied on load before first render to avoid flash.

**Mood score colour scale** (5 levels, pending confirmation from ux-dna.md):
Specific colours deferred to ux-dna.md. The data model stores score 1–5 as an integer; the colour mapping is pure CSS/JS with no server involvement.

---

## 5. Rule-Based Insights Summary

**Decision**: A pure function in `app01/src/insights.ts` receives an array of `{ date, score }` objects for 7 days and returns a string summary. Logic covers: trend direction (improving/declining/flat), average score band (low/medium/high), consistency (variance).

**Example outputs**:
- "Your mood has been improving — scores rose from 2 to 4 over the week."
- "A steady week — scores stayed close to 3 throughout."
- "A mixed week with some low points mid-period."
- "Only a few entries this week — keep logging for better insights."

**Rationale**: No AI/LLM dependency (FR-043 answer A). The function is deterministic and fully unit-testable. The spec only requires a "short summary text about this period" based on scores.

---

## 6. Local Dev on Chromebook

**Decision**: Two modes:

| Mode | When | Clerk | DB |
|------|------|-------|----|
| `CLERK_DEV_BYPASS=true` | Chromebook local | Skipped; hardcoded user | Local PostgreSQL via `bun run db:setup` |
| `CLERK_DEV_BYPASS=false` | Staging / Sliplane | Full Clerk JWT flow | Sliplane PostgreSQL |

PostgreSQL on Chromebook: install via `sudo apt install postgresql` in the Linux container (Crostini). Bun runs natively on Linux ARM/x86.

If local Chromebook dev becomes too fragile, the fallback is: push to GitHub → Sliplane auto-deploy → test on the live URL. The Dockerfile is therefore the primary dev environment artefact.

---

## 7. Sliplane Deployment

**Decision**: Single `Dockerfile` at repo root.

```dockerfile
FROM oven/bun:1-alpine
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production
COPY . .
RUN bun run db:migrate   # runs drizzle migration on startup
EXPOSE 3000
CMD ["bun", "run", "server.ts"]
```

Environment variables injected by Sliplane (never in source):
- `DATABASE_URL` — Sliplane PostgreSQL connection string
- `CLERK_SECRET_KEY` — Clerk backend secret
- `CLERK_PUBLISHABLE_KEY` — Clerk frontend publishable key
- `NODE_ENV=production`

**Rationale**: `oven/bun:1-alpine` is the official Bun Docker image. Alpine minimises image size. Running migrations at container start ensures schema is always current on deploy.

---

## 8. Data Export (FR-052)

**Decision**: `GET /api/v1/export` streams a CSV response. The Hono route sets `Content-Type: text/csv` and `Content-Disposition: attachment; filename="beinge-export.csv"`. No additional library needed — Bun's `ReadableStream` + plain string formatting is sufficient for CSV at this data volume.

**Format**: `date,score,note` — one row per entry, UTF-8, RFC 4180 compliant (notes with commas/newlines are double-quote escaped).

**Date range**: The export endpoint accepts optional `from` and `to` query params (ISO date strings). If omitted, all entries are exported.

**PDF format**: A new dependency (`pdfkit`) is required for server-side PDF generation. `pdfkit` has no native bindings and is confirmed Bun-compatible. It produces a proper binary PDF download. Approved as a new runtime dependency for this feature (YAGNI exception: no viable no-dependency alternative produces a real PDF file download). CSV and PDF share the same data query; only the serialisation step differs.

---

## 9. Admin Role Verification

**Decision**: The shell reads `publicMetadata.role` from the Clerk session token. When `role === "admin"`, the admin middleware passes the request through; otherwise `403`. The Clerk SDK exposes this via `ctx.get('clerkAuth').sessionClaims.publicMetadata`.

**Pattern**:
```ts
// shell/src/middleware/admin.ts
export const adminMiddleware = createMiddleware(async (ctx, next) => {
  const auth = ctx.get('clerkAuth')
  const meta = auth?.sessionClaims?.publicMetadata as { role?: string } | undefined
  if (meta?.role !== 'admin') {
    return ctx.json({ error: 'Forbidden' }, 403)
  }
  await next()
})
```

**Rationale**: Keeps all identity/role state in Clerk — no extra DB table, no deployment config to maintain. Role changes take effect on the user's next token refresh (~1 min).

**Alternatives considered**:
- DB flag on `shell.user_app_access` — extra table column, out-of-sync risk if Clerk user deleted.
- Env var whitelist — brittle; requires redeploy to change.

---

## 10. First-Use Onboarding

**Decision**: The frontend checks `hasEntries: boolean` from `GET /api/shell/me` on load. If `false`, a `<onboarding-modal>` Lit component is rendered before the Note screen. The modal is dismissed by the user; a `localStorage` flag (`beinge_onboarding_seen`) prevents it from appearing again. No server state needed for the dismissed flag.

**Rationale**: `localStorage` is sufficient — the modal is cosmetic UX, not a security or data gate. No new API endpoint needed.

---

## 11. Concurrent Edit Strategy

**Decision**: Last-write-wins via PostgreSQL `INSERT … ON CONFLICT DO UPDATE`. No optimistic locking, no version counter. The `updated_at` column records the winning write's timestamp.

**Rationale**: Users are always online (v1 assumption). True simultaneous multi-device edits for the same calendar date are rare. The complexity cost of conflict detection exceeds its benefit at this scale.

---

## 12. Account Deletion (GDPR Right to Erasure)

**Decision**: `DELETE /api/v1/account` runs a single PostgreSQL transaction that deletes all `app01.entries` rows, the `app01.user_settings` row, and the `shell.user_app_access` row(s) for the user. After DB deletion the Clerk user record is deleted via the Clerk Backend API (`clerkClient.users.deleteUser(userId)`). The response is `204 No Content`; the frontend signs the user out and redirects to the login screen.

**Pattern**:
```ts
await db.transaction(async (tx) => {
  await tx.delete(entries).where(eq(entries.userId, userId))
  await tx.delete(userSettings).where(eq(userSettings.userId, userId))
  await tx.delete(userAppAccess).where(eq(userAppAccess.userId, userId))
})
await clerkClient.users.deleteUser(userId)
```

**Rationale**: DB and Clerk deletion are sequenced: DB first (recoverable if Clerk call fails), Clerk second. If the Clerk call fails after DB deletion, an admin can manually clean up in the Clerk dashboard. No orphaned app data remains.

**Alternatives considered**:
- Soft-delete (mark as deleted) — adds complexity; GDPR requires actual erasure, not just a flag.
