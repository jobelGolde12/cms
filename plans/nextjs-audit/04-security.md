# Security Review

## Secrets / Environment Variables
- `.env` and `.env.local` exist; `.env.local` is in `.gitignore` (verified via `.gitignore`). `.env` may be tracked; must verify.
- `env-validation.ts` validates `LIBSQL_URL` and optionally default admin credentials at module load time. Good practice.
- `SESSION_COOKIE_SECURE` is validated in production mode.
- No `NEXT_PUBLIC_` secrets observed in `.env.example` (only `NEXT_PUBLIC_APP_URL`).
- No hardcoded secrets found in source files inspected (`auth.ts`, `constants.ts`, `permissions.ts`).

## Authentication
- Custom session-based auth with `bcryptjs` (strong hashing, cost factor 10).
- Token stored as SHA-256 hash in DB; raw cookie token never stored. Good.
- Session cookie uses `httpOnly`, `sameSite="lax"`, `secure` flag (conditional on `SESSION_COOKIE_SECURE`).
- Session expiration is enforced via DB `expiresAt` column and cookie `expires`.
- No refresh token mechanism; session expires after 8 hours (`SESSION_TTL_MS`). Acceptable for this application.
- `getCurrentUser()` uses `cache()` but does not set a `revalidate` time; cache lifetime is tied to request lifecycle, which is safe.

## Authorization
- Page-level authorization uses `requirePermission()` / `getAuthorizedUser()`.
- `AppShell` filters navigation links by permission (`hasPermission()`), but this is cosmetic; server-side authorization must still enforce access.
- Database actions (`src/actions/`) need independent authorization checks; must inspect each action to confirm.
- `roleNameFromId()` maps DB role IDs to application roles; unknown roles return `null`, which denies access. Good defense-in-depth.

## Content Security Policy (CSP)
- `next.config.ts` defines CSP:
  `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';`
- **Critical issue**: `script-src 'unsafe-inline' 'unsafe-eval'` weakens CSP significantly. This allows XSS via inline scripts. Next.js apps often require `'unsafe-inline'` for hydration scripts, but `'unsafe-eval'` is rarely necessary unless using `eval()` or similar. Should investigate whether `'unsafe-eval'` is actually required.
- `style-src 'unsafe-inline'` is common with Tailwind and dynamic styles, but should be minimized.
- No `nonce` or `hash` based CSP observed; modern approach uses `nonce` for inline scripts if needed.

## Security Headers
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (restricts geolocation, microphone, camera) are all correct.
- `frame-ancestors 'none'` prevents clickjacking. Good.

## Route Handlers / API Security
- `/api/reports/[type]/route.ts` and other handlers need authorization checks; must inspect.
- `/api/forecasts/route.ts` may expose forecasting data; verify access control.
- PDF routes (`form137`, `report-card`) may contain sensitive student data; verify authorization and that URLs are not guessable (they use student IDs, which could be enumerated; authorization is the primary defense).

## Input Validation
- No centralized validation schema observed. Each form/action likely uses `zod` independently.
- `zod` is available as dependency; must verify it is actually used in all forms and actions.
- Route parameters (`[id]`) should be validated (e.g., UUID format or integer check) before database access.

## SQL Injection
- `drizzle-orm` uses parameterized queries by default; SQL injection risk is low.
- Raw SQL (`sql` tag) is used in schema definitions for default timestamps (`sql`(unixepoch())`); safe.
- Custom queries in `src/lib/queries.ts` should be audited for raw SQL usage.

## File Upload / Path Traversal
- No file upload endpoints observed in routes; `uploads` directory mentioned in `.gitignore` and `next.config.ts` ignore list, but not in route handlers.
- `employee_201_records` has `fileReference` (storage reference, not actual file upload); verify file storage mechanism.

## XSS Risks
- `next.config.ts` CSP is weak regarding inline scripts.
- Components rendering user content (student names, descriptions) must escape HTML properly; React JSX does this by default.
- `dangerouslySetInnerHTML` usage must be audited; none observed in files read.

## Sensitive Data Exposure
- Database queries in `AppShell` select limited columns (`id`, `email`, `firstName`, `lastName`, `roleId`, `isActive`). Good.
- `studentGrades` and `behaviorRecords` contain sensitive data; check that responses are scoped to the requesting user.
- `auditLogs` contain old/new values (`oldValuesJson`, `newValuesJson`); verify that logs do not expose passwords or secrets.

## Dependency Security
- `npm audit` or equivalent should be run to check for vulnerabilities in `next`, `react`, `drizzle-orm`, `bcryptjs`, etc.
- `sharp` and `@react-pdf/renderer` have had vulnerabilities in the past; check versions.

## Security Improvements (recommended)
- Strengthen CSP: remove `'unsafe-eval'` unless strictly required; consider using `nonce` for inline scripts.
- Audit all `route.ts` handlers for authorization and input validation.
- Ensure mutation actions (`actions/*.ts`) check authorization before DB mutation.
- Verify no `dangerouslySetInnerHTML` usage in component files.
- Add rate limiting for login attempts (`rate-limit.ts` exists; verify it is applied).
