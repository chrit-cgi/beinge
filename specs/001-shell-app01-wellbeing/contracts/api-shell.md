# API Contract: Shell

**Branch**: `001-shell-app01-wellbeing` | **Date**: 2026-04-08

The shell does not expose a REST API of its own. It provides:

**Rate limiting**: Global 60 req/min per user applies to all shell endpoints (FR-070). Admin status toggle has an additional stricter limit noted below.
1. **Hono middleware** consumed internally by app01 routes
2. **Static HTML** for the login/logout redirect flow (handled by Clerk)
3. **One utility endpoint** for the frontend to confirm auth state

All shell-protected routes require a valid `Authorization: Bearer <clerk-jwt>` header.

---

## Middleware Contract

Every app01 route handler can rely on the following being set by shell middleware before the handler runs:

```ts
// Available in every protected Hono handler via:
const auth = ctx.get('clerkAuth')
// auth.userId: string   — Clerk user ID
// auth.sessionId: string — Clerk session ID
```

If the JWT is missing, expired, or invalid → `401 Unauthorized`.
If the user has no `shell.user_app_access` row for `app01` → `403 Forbidden`.

Both cases MUST emit an audit log entry (FR-080):
```json
{
  "event": "access_denied",
  "userId": "user_2abc123",
  "path": "/api/v1/entries",
  "reason": "no_app_access",
  "timestamp": "2026-04-08T14:00:00Z"
}
```
`userId` is omitted when the JWT is missing or unverifiable. `reason` values: `"invalid_token"`, `"no_app_access"`, `"insufficient_role"`.

---

## Endpoint: GET /api/shell/me

Returns the current user's identity and app access. Used by the frontend on load to decide which screens to show.

**Auth**: Required

**Response 200**:
```json
{
  "userId": "user_2abc123",
  "apps": ["app01"],
  "hasEntries": false
}
```

`hasEntries`: `true` if the user has at least one entry in `app01.entries`; used by the frontend to decide whether to show the first-use onboarding modal (FR-010a).

**Response 401**: JWT missing or invalid.

```json
{ "error": "Unauthorized" }
```

**Response 403**: Authenticated but no access to any app.

```json
{ "error": "No app access" }
```

---

---

## Admin Endpoints

All `/api/admin/*` routes require **both** the standard Clerk JWT middleware **and** the admin middleware, which checks `sessionClaims.publicMetadata.role === "admin"`. Any authenticated non-admin user receives `403`.

### GET /api/admin/users

Returns a paginated list of all users registered in beinge (FR-007).

**Query params**:

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number (1-based) |
| `limit` | integer | `25` | Results per page (max 100) |
| `q` | string | — | Optional name/email substring filter |

**Response 200**:
```json
{
  "users": [
    {
      "userId": "user_2abc123",
      "name": "Elena Hartley",
      "email": "elena@example.com",
      "active": true,
      "grantedAt": "2026-04-01T10:00:00Z"
    }
  ],
  "total": 28,
  "page": 1,
  "limit": 25
}
```

`active` is derived from the presence of a `shell.user_app_access` row for `app01`. Name and email are fetched from Clerk via `clerkClient.users.getUser(userId)`.

---

### PUT /api/admin/users/:userId/status

Activates or deactivates a user's access to app01 (FR-008).

**Rate limit**: 20 req/min per admin user (FR-074).

**Path param**: `userId` — Clerk user ID

**Request body**:
```json
{ "active": false }
```

**Behaviour**:
- `active: true` — inserts a `shell.user_app_access` row `(userId, 'app01')` if not present
- `active: false` — deletes the `shell.user_app_access` row for `(userId, 'app01')`

The change takes effect on the user's next authenticated request (next API call checks the access table).

**Response 200**:
```json
{ "userId": "user_2abc123", "active": false }
```

**Audit log emitted** (FR-082):
```json
{
  "event": "user_status_changed",
  "adminUserId": "user_admin123",
  "targetUserId": "user_2abc123",
  "active": false,
  "timestamp": "2026-04-08T14:00:00Z"
}
```

**Response 404**: User not found in Clerk.
```json
{ "error": "User not found" }
```

---

### GET /api/admin/clerk-dashboard-url

Returns the URL to the Clerk management dashboard (FR-009). The frontend opens this in a new tab.

**Response 200**:
```json
{ "url": "https://dashboard.clerk.com" }
```

---

## Login / Logout Flow

Login and logout are handled entirely by Clerk's hosted UI. The shell provides:

- `/login` — redirects to Clerk's sign-in page (or the Clerk `<SignIn>` component embedded in `index.html` when `CLERK_DEV_BYPASS=false`)
- `/logout` — calls `Clerk.signOut()` on the client; server receives no request

In `CLERK_DEV_BYPASS=true` mode:
- `/login` serves a minimal HTML form that sets a cookie `dev_session=local-dev-user`
- The middleware reads this cookie instead of verifying a JWT
- This mode MUST NOT be enabled when `NODE_ENV=production`
