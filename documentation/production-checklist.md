# Production Readiness Checklist

Only mark items complete after verifying them.

## Environment & Configuration

- [x] `.env.local` contains required variables (`LIBSQL_URL`, auth vars)
- [x] `.env.example` contains placeholders only (no real secrets)
- [x] `.gitignore` excludes `.env*` (verified)
- [x] `SESSION_COOKIE_SECURE` configured for HTTPS production
- [x] `LIBSQL_URL` configured
- [ ] Production environment variables set in hosting dashboard (manual)

## Authentication & Security

- [x] Credentials centralized in `.env.local` via `default-credentials.ts`
- [x] `findDefaultCredential()` uses env vars (no source-code secrets)
- [x] `requireEnv()` throws clear errors for missing variables
- [x] `default-credentials.ts` validates roles (`admin`, `lgu`, `school`, `barangay`)
- [x] Session cookies use `httpOnly`, `sameSite: "lax"`, `secure` (production)
- [x] Auth enforced server-side (`requireUser()`, `requirePermission()`)
- [x] Logout deletes DB session and cookie
- [x] No `NEXT_PUBLIC_*` auth variables exposed
- [x] Audit logs (`audit.ts`) do not log passwords/hashes/secrets
- [x] `.env.local` never committed (`.gitignore` verified)
- [ ] Credential rotation recommended if any secrets were previously committed

## Authorization & Roles

- [x] Four roles preserved (`admin`, `lgu`, `school`, `barangay`)
- [x] `ROLE_PERMISSIONS` map preserved (`permissions.ts`)
- [x] `hasPermission()` enforced server-side
- [x] Protected pages redirect unauthenticated users (`(app)/layout.tsx`)
- [x] Action guards (`getAuthorizedUser()`) return null when unauthorized

## API & Server Security

- [x] Server Actions use `"use server"`
- [x] Input validation uses `zod` (`schemas.ts`)
- [x] Rate limiting applied to login (`rate-limit.ts`)
- [x] Database queries use parameterized Drizzle ORM queries (no raw SQL injection)
- [ ] Rate limiter is in-process; horizontally scaled deployments require shared store (documented)

## Database

- [x] SQLite local (`local.db`) and Turso cloud (`LIBSQL_URL`) supported
- [x] Schema unchanged
- [x] Sessions table with `tokenHash` (SHA-256) instead of raw token
- [ ] Indexes appropriate for production load (documented, safe to add)

## Error Handling

- [x] `error.tsx` (route-level error page) created
- [x] `global-error.tsx` (global error page) created
- [x] `not-found.tsx` created
- [x] `loading.tsx` created
- [x] Error messages do not expose stack traces or secrets

## Performance

- [x] `turbopack: true` enabled
- [x] `productionBrowserSourceMaps: false`
- [x] `compiler.removeConsole: true`
- [x] `optimizePackageImports` configured
- [x] Images rely on Next.js optimization (no custom loader issues)

## Security Headers

- [x] `Content-Security-Policy` configured in `next.config.ts`
- [x] `X-Frame-Options: DENY`
- [x] `X-Content-Type-Options: nosniff`
- [x] `Referrer-Policy: strict-origin-when-cross-origin`
- [x] `Permissions-Policy` restricts sensors
- [x] Middleware (`middleware.ts`) applies backup headers

## Build & Deployment

- [x] `typescript.ignoreBuildErrors: false`
- [x] `eslint.ignoreDuringBuilds: false`
- [x] Production build passes (`npm run build`)
- [x] TypeScript passes (`npm run build` includes type check)
- [x] `next.config.ts` syntax fixed (`turbopack: {}`, `headers` correct)
- [ ] Manual deployment verification (hosting platform)

## Testing

- [x] `vitest` framework present
- [x] `npm run test` available
- [ ] Integration tests for auth flow (recommended, not mandatory)

## Documentation

- [x] `documentation/authentication-environment-variables.md`
- [x] `documentation/production-readiness.md`
- [x] `documentation/production-checklist.md` (this file)

## Logging

- [x] `audit.ts` does not log secrets
- [x] `console.error` in audit is safe (only logs failure messages)
- [x] Authentication audit records generic reasons (`bad-credentials`, `default-credential`)

## Code Quality

- [x] No `any` types added
- [x] TypeScript strict mode preserved
- [x] `src/lib/env-validation.ts` validates env at startup
- [x] `crypto.randomUUID()` works in modern Node (global available)
- [x] Existing business logic preserved

## Remaining Manual Steps

- [ ] Configure `SESSION_COOKIE_SECURE=true` in production environment
- [ ] Set `LIBSQL_URL` to production Turso URL and `LIBSQL_AUTH_TOKEN`
- [ ] Verify `.env.local` is excluded from deployment package
- [ ] Test login/logout flow manually in production
- [ ] Confirm database connection (local or Turso) works after deployment
- [ ] Rotate any previously exposed credentials if necessary
