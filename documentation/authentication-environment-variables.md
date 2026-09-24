# Authentication Environment Variables — Documentation

## Purpose

This project uses server-only environment variables to configure the default hard-coded authentication accounts. Previously these accounts were embedded directly in `src/lib/default-credentials.ts`. They have been centralized into environment variables so the same source code can work across different deployment environments without exposing credentials in the repository.

## Supported Roles

The application implements the following role-based access control roles, derived from `src/lib/constants.ts` and `src/lib/permissions.ts`:

- `admin` — System Administrator (full permissions)
- `lgu` — LGU User
- `school` — School User
- `barangay` — Barangay User

These roles must not be renamed, removed, or merged. The environment variables reference these exact role values (`DEFAULT_ADMIN_ROLE=admin`, etc.).

## Required Environment Variables

The authentication variables are configured per default user. They are read server-side by `src/lib/default-credentials.ts`. Each user requires these variables (prefixed by account type):

- `<PREFIX>_EMAIL` — Account email address.
- `<PREFIX>_PASSWORD_HASH` — Bcrypt hash of the account password (used by `verifyPassword`).
- `<PREFIX>_FIRST_NAME` — First name.
- `<PREFIX>_LAST_NAME` — Last name.
- `<PREFIX>_ROLE` — Must match one of: `admin`, `lgu`, `school`, `barangay`.
- `<PREFIX>_SCHOOL_ID` — Optional school reference (empty by default).
- `<PREFIX>_BARANGAY_ID` — Optional barangay reference (empty by default).

Prefixes used:

- `DEFAULT_ADMIN`
- `DEFAULT_LGU`
- `DEFAULT_SCHOOL`
- `DEFAULT_BARANGAY`

## Where Credentials Are Configured

- `.env.local` — Local development secrets (contains actual values, never committed).
- `.env.example` — Placeholder names for developers to copy (contains no real credentials).
- Hosting environment — Production deployments should set the same variable names in their environment configuration dashboard or secrets manager.

## Local Development Setup

1. Copy `.env.example` to `.env.local` (or create `.env.local` manually).
2. Fill in the placeholder variables for the default accounts you need. At minimum, the accounts used by the application (`DEFAULT_ADMIN`, `DEFAULT_LGU`, `DEFAULT_SCHOOL`, `DEFAULT_BARANGAY`) should be configured with valid values so login continues to work.
3. Ensure `.env.local` exists and is excluded from version control (see `.gitignore`).
4. Restart the development server (`npm run dev`) after changing `.env.local`.

## `.env.example` Usage

- `.env.example` provides the variable names and descriptions only.
- It must never contain real passwords, hashes, secrets, tokens, or actual account details.
- Use it as a template when setting up a new environment.

## Files That Must Never Be Committed

The following files contain or may contain sensitive authentication data and must never be committed:

- `.env.local`
- `.env`
- `.env.*.local`
- `.env.*` (except `.env.example`, which is safe to commit because it only holds placeholders)

The `.gitignore` already excludes `.env*`.

## Authentication Flow

1. The user submits an email and password via the login form (`src/app/login/page.tsx`).
2. The server action (`src/actions/auth.ts`) checks the database users table first (`users.email`).
3. If no database user is found, it falls back to `findDefaultCredential(email)` in `src/lib/default-credentials.ts`.
4. The fallback compares the submitted password against `defaultUser.passwordHash` using `verifyPassword` (bcrypt compare).
5. If valid, a session cookie (`cms_session`) is created server-side (`src/lib/auth.ts`) and the user is redirected to `/dashboard`.
6. The default accounts are not inserted into the database; they exist only in memory via the environment variables.

## Security Considerations

- **Server-only variables**: The authentication variables must never be exposed to the browser. Do not prefix them with `NEXT_PUBLIC_`. They are only accessed in server-side code (`src/lib/default-credentials.ts`, `src/actions/auth.ts`).
- **No plaintext logging**: The application does not log usernames, passwords, secrets, or authentication tokens. Audit logs (`src/lib/audit.ts`) record the email and a generic reason (`default-credential`) but never the password or hash.
- **No client-side placement**: Credentials are never placed into client-side JavaScript (`page.tsx`, `components/`).
- **Role validation**: `default-credentials.ts` validates that `DEFAULT_*_ROLE` matches one of the allowed roles (`admin`, `lgu`, `school`, `barangay`). If an invalid role is configured, the server throws a clear error at startup rather than failing silently.
- **Missing configuration error**: If any required variable is missing or empty, `requireEnv` throws an explicit server-side error that mentions the missing variable name without revealing its value.
- **Secure cookie flags**: The session cookie (`SESSION_COOKIE_NAME`, configured in `src/lib/constants.ts`) uses `httpOnly`, `sameSite: "lax"`, and `secure` based on `SESSION_COOKIE_SECURE` / `NODE_ENV`. These settings are independent of the default credential variables but must remain intact.

## Modified Files / Components / Routes

- `src/lib/default-credentials.ts` — Replaced hard-coded array with environment variable construction and validation (`requireEnv`, `optionalEnv`, `buildCredential`).
- `.env.local` — Created with the same account configurations previously embedded in source.
- `.env.example` — Added placeholder sections for all required default account variables.
- `documentation/authentication-environment-variables.md` — This file.

Unchanged (preserved behavior):

- `src/lib/auth.ts`
- `src/actions/auth.ts`
- `src/app/login/page.tsx`
- `src/lib/constants.ts`
- `src/lib/permissions.ts`
- `src/db/schema.ts`
- `.gitignore` (already excluded `.env*`)

## Assumptions Discovered from Existing Codebase

- The authentication system supports exactly four roles (`admin`, `lgu`, `school`, `barangay`) as defined in `src/lib/constants.ts`.
- Default accounts are development-only and are not persisted to the `users` table. They are resolved at request time via `findDefaultCredential`.
- All four default accounts share the same bcrypt password hash (`$2b$10$...`) in the original source. The `.env.local` preserves this same hash value.
- The project uses `drizzle-orm` with SQLite (`local.db`) and `next/headers` for cookie management.
- The application expects `.env.local` to be present for local development, and `.env.example` serves as a template without secrets.
- No `NEXT_PUBLIC_*` variables are used for authentication configuration, ensuring server-only access.

## Developer Action Required

After pulling these changes, developers must ensure `.env.local` exists and contains valid values for the default accounts they use. Without them, the server will throw a clear error (`Missing required authentication environment variable: ...`) at startup / login time.
