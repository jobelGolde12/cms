# Authentication Audit

## Evidence From Actual Codebase

- Session cookie: `SESSION_COOKIE_NAME = "cms_session"` (`src/lib/constants.ts` line 267)
- Cookie options (`createSession` in `src/lib/auth.ts` lines 143–149): `httpOnly: true`, `sameSite: "lax"`, `secure: process.env.SESSION_COOKIE_SECURE === "true" || process.env.NODE_ENV === "production"`, `expires: expiresAt`, `path: "/"`
- Token generation (`createSession`, `src/lib/auth.ts` line 129): `randomBytes(32).toString("base64url")`
- Token storage (`src/db/schema.ts`, `sessions` table): `tokenHash` is SHA-256 (`hashToken()` in `src/lib/auth.ts` line 27); raw token never stored.
- Password hashing (`hashPassword`): `bcrypt.hash(plain, 10)` (`src/lib/auth.ts` line 19)
- Rate limiting (`rateLimit`, `src/lib/rate-limit.ts`): in-memory, per `addressKey` (IP + `"|login"`), max 10 attempts, 60-second window.
- Default credentials (`src/lib/default-credentials.ts`): resolved from environment variables (`DEFAULT_ADMIN_*`, `DEFAULT_LGU_*`, `DEFAULT_BARANGAY_*`). Credentials are server-only; `findDefaultCredential()` used by `performLogin()` as fallback when DB user not found.
- `getCurrentUser()` uses `cache()` from `react` (`src/lib/auth.ts` line 60) — per-request deduped.
- `requireUser()` redirects to `/login` (page-level guard in `(app)/layout.tsx`).
- `requirePermission()` redirects to `/dashboard?denied=...` (page-level guard for specific permissions).
- `getAuthorizedUser()` returns `null` instead of redirecting (used by server actions for error responses).
- No middleware-based auth gate (`src/app/middleware.ts` missing — confirmed by `ls src/app/` and `find src/app -name 'middleware*'` with no results).

## Potential Security Issues
- **No middleware-based session validation**: Every protected page must call `getCurrentUser()` individually. If a future developer forgets this call, the route becomes unprotected.
- **Rate limit store is in-memory**: Not shared across instances; horizontal scaling breaks rate limits.
- **No refresh token mechanism**: Sessions expire naturally (8 hours / 7 days). No sliding window or refresh flow.
- **No CSRF token mechanism**: Server actions rely on `sameSite: "lax"` cookie + server-side auth check. This is acceptable for this application's threat model but should be documented.
- **Default credentials fallback** (`performLogin` line 67–83): If a DB user is not found, the system tries default credentials. This is a development convenience but could be a security concern if the environment variables are misconfigured (e.g., default admin password set to a weak value). The code checks `findDefaultCredential(email)` and verifies hash; it does not allow arbitrary default accounts. This is safe as long as env variables are protected.

---

References: `src/lib/auth.ts`, `src/lib/constants.ts`, `src/lib/default-credentials.ts`, `src/lib/rate-limit.ts`, `src/app/(app)/layout.tsx`, `src/app/login/page.tsx`, `src/app/middleware.ts` (missing).
