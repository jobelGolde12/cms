# Environment

- OS: Linux
- Runtime: Node 20+
- DB: Turso/libSQL (local.db file in dev)
- Variables (names only, no values): TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, SESSION_COOKIE_SECURE, NEXT_PUBLIC_APP_URL, DEFAULT_* credentials
- Build: `npm run build` succeeds
- Tests: `npm run test` 164 passed
- No secrets exposed in source
