# Authentication Audit & Implementation Report

## Authentication Audit

### Login
- Login form (`src/app/login/page.tsx`) uses `useActionState` with server action `login()`.
- `rememberMe` checkbox existed but had no `name` attribute; value never reached server.
- Session TTL (`SESSION_TTL_MS`) was set to 7 days, conflicting with UI claim of "8h Auto-Revoke".
- No redirect for already-authenticated users visiting `/login`.
- `performLogin` had server-side rate limiting, audit logging, generic error messages (safe), and default-credential fallback.

### Registration
- Registration form (`src/app/register/page.tsx`) uses `useActionState` with `registerUser()`.
- `agreed` privacy checkbox relied solely on HTML `required` and client-side disabled logic; no server-side enforcement.
- `registerUser()` did not handle DB-level unique constraint violation (race condition).
- No session created after registration (existing behavior preserved).

### Authentication Architecture
- Session management (`src/lib/auth.ts`) uses `bcryptjs` (secure), SHA-256 token hashing, DB-backed sessions, cookie with `httpOnly`, `sameSite: "lax"`, and conditional `secure` flag.
- Protected routes rely solely on `(app)/layout.tsx` (`getCurrentUser()` redirect) and `proxy.ts` (`cookie` presence check); no middleware existed for `/login` or `/register` redirect behavior.
- `proxy.ts` (existing middleware/proxy mechanism) did not redirect authenticated users away from auth pages.

## Changes Made

| File | Change |
|------|--------|
| `src/lib/auth.ts` | `createSession()` accepts optional `ttlMs` for session duration override. |
| `src/lib/constants.ts` | `SESSION_TTL_MS` changed from 7 days (`604800000`) to 8 hours (`28800000`) to match UI claim. |
| `src/actions/auth.ts` | `performLogin` reads `rememberMe` from form data; passes `ttlMs` override (`REMEMBER_ME_TTL_MS` = 7 days when checked). `logout()` wraps `destroySession()` in try/catch for reliability. |
| `src/app/login/page.tsx` | Added `name="rememberMe"` to checkbox input (visual design unchanged). |
| `src/actions/register.ts` | Added server-side `agreed` validation; wrapped `db.insert` in try/catch to handle `users_email_uq` race conditions safely. |
| `src/proxy.ts` | Expanded to handle both auth-page redirects (`/login`, `/register` for authenticated users) and protected-route redirects (`/dashboard/*`, etc. for unauthenticated users), with DB session validation where appropriate. Removed conflicting separate `middleware.ts`. |

## Security Improvements

- `rememberMe` checkbox now actually affects session cookie expiration (8h default, 7d when remembered), fixing a functional security gap.
- `logout()` handles DB failures gracefully without exposing errors.
- `registerUser()` enforces privacy agreement server-side (prevents bypass of `agreed` checkbox).
- `registerUser()` catches DB-level unique constraint violations safely (prevents unhandled exception leakage).
- `proxy.ts` redirects authenticated users away from `/login` and `/register`, reducing accidental form submission and improving session hygiene.
- `proxy.ts` validates session expiration against DB on protected routes (not just cookie presence).
- No raw passwords, hashes, or secrets exposed in any response, error message, or log.

## Validation Improvements

- Client validation preserved (HTML `required`, `type="email"`, `noValidate` kept).
- Server validation preserved (`loginSchema`, `registerSchema` with zod).
- New server-side `agreed` check added for registration.
- Rate limiting preserved (`rateLimit`).
- Audit logging preserved (`logAudit`).

## Error Handling Improvements

- `performLogin` keeps generic error message (`"Invalid email or password."`) to avoid user enumeration.
- `registerUser` returns safe messages for duplicate accounts (`"This email is already registered."`) and DB errors (`"Something went wrong during registration. Please try again."`).
- `logout()` logs DB errors securely (`console.error`) without leaking to user.

## Testing Performed

- `npm run lint`: passes (only unrelated worktree warnings).
- `npx tsc --noEmit`: passes (zero TypeScript errors).
- `npm run build`: passes successfully.
- Manual verification of file changes: no `.env` or `.env.local` modified; no new dependencies installed; no database schema or migration modified.

## Database Confirmation

> Database schema was not modified. No tables added, removed, or renamed. No columns added, removed, or renamed. No indexes changed. No migrations created. Only application logic interacting with existing `users`, `sessions`, `barangays`, and `roles` tables was improved.

## UI Confirmation

> Existing Login and Register visual design was preserved. No layout, color, typography, spacing, button, input, card, background, icon, logo, illustration, form positioning, responsive layout, navigation, page structure, visual hierarchy, animation, theme, or branding changes were made. The only visible-functional change to the login form is the `name="rememberMe"` attribute on the existing checkbox input, which has zero visual impact.

## Remaining Recommendations (Intentionally Not Implemented)

- Schema-level session duration customization (would require DB column change — out of scope).
- CSRF token mechanism for server actions (Next.js server actions have built-in action-ID protection; full CSRF tokens would be a larger architectural addition).
- Middleware-level authorization (permission checks) rather than layout-level — this would be a broader architectural change beyond authentication page improvements.
- Password strength meter UI on registration (would change the UI/design, which is prohibited).
- Email verification flow after registration (requires new infrastructure/architecture and product decisions).
