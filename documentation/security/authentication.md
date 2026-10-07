# Authentication — School System

> STATUS: **PLAN**. Existing mechanics are retained (audit: `src/lib/auth.ts`).

## Retained Design

- **Login:** email + password (bcrypt cost 10), Zod-validated (`loginSchema`), rate-limited (`src/lib/rate-limit.ts`), failures audited + `trackEvent("login_failed")`.
- **Sessions:** DB-backed (`sessions` table), opaque 32-byte token in the
  `cms_session` cookie — **only the SHA-256 hash is stored**. httpOnly,
  sameSite=lax, secure when `SESSION_COOKIE_SECURE=true` or production.
  TTL 8h (matches UI claim; configurable constant).
- **Guards:** `requireUser()` (pages), `requirePermission()` (pages, redirects
  to `/dashboard?denied=…`), `getAuthorizedUser()` (actions return errors, no redirect).
- **Route gate:** `src/proxy.ts` — unauthenticated → `/login`; authenticated on
  `/login|/register` → `/dashboard`; `/api/reports/*` pre-checks permission.
- **Last-admin guard:** `countOtherActiveAdmins()` prevents demoting/deactivating the final admin.
- **Default dev accounts:** resolved from `DEFAULT_*` env vars by *name only*
  (values never read/committed per security policy).

## Changes Required

| Change | Where |
|---|---|
| Role id mapping: `role-admin`, `role-school-admin`, `role-teacher`, `role-records`, `role-guidance` | `roleNameFromId()` in `src/lib/auth.ts`; `userFormSchema.roleId` enum in `src/lib/schemas.ts`; `src/actions/users.ts` |
| `SessionUser` gains assignment fields (section ids for teachers) | `src/lib/auth.ts` + scope helper |
| Remove self-registration | delete `src/app/register/page.tsx`, `src/actions/register.ts`; update `src/proxy.ts` matcher |
| Settings pages relabeled | `src/app/(app)/settings/page.tsx` |

## Non-Goals

- No OAuth/SSO requirement (not in TODO.md scope).
- No change to cookie names or session table schema.
