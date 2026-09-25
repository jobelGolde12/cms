# Production Readiness — Municipal Child Mapping System

## Project Overview

- **Name**: `child-mapping-system`
- **Framework**: Next.js 16.3.5 (App Router)
- **React**: 19.2.8
- **TypeScript**: 5.x (`strict: true`)
- **Database**: SQLite (`local.db`) via Drizzle ORM / Turso (`libsql://`)
- **Package Manager**: pnpm / npm (lock files present)
- **Deployment Target**: Self-hosted / Vercel / any Node-compatible platform

## Key Architecture

- **Server Components** used for data-heavy pages (`dashboard`, `children/*`, etc.).
- **Client Components** limited to interactive UI (`login/page.tsx`, `app-shell`, navigation).
- **Server Actions** handle form mutations (`actions/auth.ts`, `actions/children.ts`, etc.).
- **Authentication**: Server-side session cookies (`cms_session`) backed by a `sessions` table. Default accounts configured via `.env.local`.
- **Authorization**: Role-based (`admin`, `lgu`, `school`, `barangay`) enforced server-side in `requirePermission()` and action guards.

## Production Configuration

### Environment Variables (`.env.local` / hosting environment)

| Variable | Required | Description |
|---|---|---|
| `LIBSQL_URL` | Yes | Database URL (`file:./local.db` or `libsql://...`) |
| `LIBSQL_AUTH_TOKEN` | No | Turso auth token |
| `SESSION_COOKIE_SECURE` | Recommended (`true` in prod) | Enables Secure cookie flag |
| `DEFAULT_ADMIN_*` | Dev only | Default admin account (email, hash, name, role) |
| `DEFAULT_LGU_*` | Dev only | Default LGU account |
| `DEFAULT_SCHOOL_*` | Dev only | Default school account |
| `DEFAULT_BARANGAY_*` | Dev only | Default barangay account |

Never put real secrets in `.env.example`. Never use `NEXT_PUBLIC_*` for authentication variables.

### Build Scripts

```bash
npm run build   # Production build (TypeScript + ESLint enforced, no suppression)
npm run dev     # Development server
npm run test    # Vitest test suite
npm run lint    # ESLint
npm run seed    # Populate database with fictional data
```

### Security Headers (configured in `next.config.ts`)

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (restricts geolocation, microphone, camera)
- `Content-Security-Policy` (restrictive default with `self` sources)

### Middleware (`middleware.ts`)

Applies security headers to all routes. Does not enforce authentication (route-level guards handle that).

## Authentication & Authorization

- **Login flow**: `actions/auth.ts` validates against DB users first, then falls back to `findDefaultCredential()` (env-based) for development accounts.
- **Session**: `createSession()` creates a DB session and sets an `httpOnly`, `sameSite: lax`, `secure` (in production) cookie (`cms_session`).
- **Logout**: `destroySession()` deletes the cookie and DB session row.
- **Protected routes**: `(app)` layout (`src/app/(app)/layout.tsx`) redirects unauthenticated users to `/login`.
- **Role checks**: Enforced server-side (`requirePermission()`, `getAuthorizedUser()`).

## Database

- Schema: `src/db/schema.ts`
- ORM: Drizzle ORM (`drizzle-orm/libsql`)
- Local file DB: `local.db` (ignored by `.gitignore`)
- Indexes: Basic unique indexes on `email` (users), `name` (barangays/schools), validation statuses.

## Performance & Optimization

- `productionBrowserSourceMaps: false`
- `compiler.removeConsole: true` (strips `console` in production)
- Image optimization relies on Next.js defaults (`public/images/` excluded from watch).
- Turbopack enabled for faster builds.

## Deployment Requirements

- Node.js 20+
- HTTPS (for `SESSION_COOKIE_SECURE=true`)
- Environment variables configured securely (no `.env.local` committed)
- Database accessible (local file or Turso URL)

## Testing

- `vitest` configured (`npm run test`).
- No automated tests for auth flow currently; manual verification required.

## Known Limitations

- Rate limiting is in-process memory-based (`rate-limit.ts`); horizontally scaled deployments need a shared store.
- No automated integration tests.
- CSP is configured but may need relaxation if third-party scripts/images are added.

## Files Modified / Added (Production Hardening)

- `next.config.ts` — removed build suppression, added security headers, fixed TypeScript config.
- `middleware.ts` — added security header middleware.
- `src/app/error.tsx`, `global-error.tsx`, `not-found.tsx`, `loading.tsx` — production error pages.
- `src/lib/env-validation.ts` — startup environment validation.
- `src/db/index.ts` — integrated env validation.
- `.env.local` — added `LIBSQL_URL`, `SESSION_COOKIE_SECURE` placeholders plus existing auth variables.
- `documentation/authentication-environment-variables.md` — auth docs preserved.
- `documentation/production-readiness.md` — this file.
