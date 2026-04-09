# Quickstart: Shell + app01 Daily Well-being

**Branch**: `001-shell-app01-wellbeing` | **Date**: 2026-04-08

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Bun | 1.x | `curl -fsSL https://bun.sh/install \| bash` |
| PostgreSQL | 16 | `sudo apt install postgresql` (Chromebook/Linux) |
| Git | any | pre-installed on most systems |

---

## 1. Clone and install

```bash
git clone <repo-url> beinge
cd beinge
bun install
```

---

## 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Database (local dev)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/beinge

# Clerk (get from https://dashboard.clerk.com → your app → API Keys)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Local dev bypass — set to true on Chromebook when Clerk redirect is broken
CLERK_DEV_BYPASS=false

# Runtime
NODE_ENV=development
PORT=3000
```

---

## 3. Set up local PostgreSQL

```bash
# Create database and schemas
sudo -u postgres psql <<'SQL'
  CREATE DATABASE beinge;
  \c beinge
  CREATE SCHEMA shell;
  CREATE SCHEMA app01;
  GRANT ALL ON SCHEMA shell, app01 TO postgres;
SQL
```

Run migrations:

```bash
bun run db:migrate
```

This runs `shared/db/migrate.ts` which applies all pending Drizzle migrations.

To regenerate migrations after schema changes:

```bash
bunx drizzle-kit generate
```

---

## 4. Start the development server

```bash
bun run dev
```

Hono listens on `http://localhost:3000`. File changes reload automatically (Bun's `--watch` flag).

---

## 5. Chromebook: Clerk bypass mode

If Clerk's sign-in redirect doesn't work on your Chromebook local setup:

```env
CLERK_DEV_BYPASS=true
```

With this set:
- Opening `http://localhost:3000` shows a minimal login form (no Clerk)
- Submitting any username logs you in as `local-dev-user`
- All app01 features work normally

**This mode is disabled when `NODE_ENV=production` regardless of the env var.**

---

## 6. Grant a user access to app01

After signing in via Clerk (or using the bypass), grant yourself app01 access:

```bash
bun run db:seed-access --userId <your-clerk-user-id> --app app01
```

Or directly via SQL:

```sql
INSERT INTO shell.user_app_access (user_id, app_id)
VALUES ('user_yourclerkid', 'app01');
```

---

## 7. Run tests

```bash
bun test
```

Tests require a running PostgreSQL instance with the `beinge` database and both schemas present. No mocks — tests hit the real database.

---

## 8. Deploy to Sliplane

1. Push to `main` branch (or the branch configured in Sliplane).
2. Sliplane builds the `Dockerfile` and deploys.
3. Set environment variables in Sliplane dashboard:
   - `DATABASE_URL` — Sliplane's PostgreSQL connection string
   - `CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `NODE_ENV=production`

Migrations run automatically at container start.

---

## Useful scripts

| Script | Command | Description |
|--------|---------|-------------|
| Dev server | `bun run dev` | Start with file watching |
| Production | `bun run server.ts` | Start without watch |
| Migrate | `bun run db:migrate` | Apply pending migrations |
| Generate migrations | `bunx drizzle-kit generate` | After schema changes |
| Tests | `bun test` | Run all tests |
| Seed access | `bun run db:seed-access` | Grant app access (dev only) |
