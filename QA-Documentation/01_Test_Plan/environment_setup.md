# Environment Setup

## Operating environment

| Item | Value |
|---|---|
| OS | Linux |
| Node.js | v22.23.1 |
| npm | 10.9.8 |
| Browser automation | `agent-browser` (Chrome via CDP) |
| Shell | bash |

## Package manager and dependency installation

- Lockfiles present: `package-lock.json` and `pnpm-lock.yaml`; project scripts use npm conventions.
- Dependencies were already installed; `npm install` was not required to run the verification commands.
- Commands used: `npm run dev`, `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm audit --omit=dev`.

## Development server

```bash
npm run dev
```

- Next.js 16.4.6 (Turbopack), ready in ~1.6 s.
- Local URL: `http://localhost:3000`.
- Console shows a development-only React message: `eval() is not supported ... React requires eval() in development mode`. This is caused by the strict CSP `script-src 'self' 'unsafe-inline'` and does **not** affect the production build (production React does not use `eval`). Not a production defect.
- No startup crash; no missing-service failure observed.

## Build process

```bash
npm run build
```

- Final result: success, compiled in 13.9 s, all routes generated, `/welcome` prerendered as static content.
- TypeScript build errors are not ignored (`ignoreBuildErrors: false`).

## Database

- libSQL/Turso via `@libsql/client` and Drizzle ORM.
- Integration tests create disposable `.tmp-integration/*.db` files and migrate them from `./drizzle`.
- No production database was read or modified during this audit beyond application startup reading configured data.

## External services

| Service | Variable names (values never read) | Test status |
|---|---|---|
| Turso/libSQL | `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Local test DBs only |
| Session config | `SESSION_COOKIE_SECURE`, `NEXT_PUBLIC_APP_URL`, `ENCRYPTION_KEY` | Reviewed by name |
| Mailgun | `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM_EMAIL`, `MAILGUN_FROM_NAME`, `MAILGUN_REGION` | BLOCKED |
| Seed/admin accounts | `DEFAULT_*_EMAIL`, `DEFAULT_*_PASSWORD_HASH`, `DEFAULT_*_ROLE` etc. | Names only |

## Environment variable names from `.env.example`

`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `SESSION_COOKIE_SECURE`, `NEXT_PUBLIC_APP_URL`, `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD_HASH`, `DEFAULT_ADMIN_FIRST_NAME`, `DEFAULT_ADMIN_LAST_NAME`, `DEFAULT_ADMIN_ROLE`, `DEFAULT_LGU_*`, `DEFAULT_BARANGAY_*`, `DEFAULT_SCHOOL_ADMIN_*`, `ENCRYPTION_KEY`, `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM_EMAIL`, `MAILGUN_FROM_NAME`, `MAILGUN_REGION`.

No secret values were read, printed or written into this documentation.
