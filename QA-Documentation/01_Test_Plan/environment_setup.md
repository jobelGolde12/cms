# Environment Setup

## 1. Operating environment

| Item | Value |
|---|---|
| OS | Linux |
| Node.js | v22.23.1 |
| npm | 10.9.8 |
| Package manager | npm (both `package-lock.json` and `pnpm-lock.yaml` are present in the repo — see finding BUG-003) |
| Shell | bash |
| Working directory | project root |

## 2. Dependency installation

```bash
npm install            # already provisioned in this environment
npm install next@16.4.6 eslint-config-next@16.4.6 zod@4.6.6   # security remediation (this audit)
npm audit fix          # transitive advisories (this audit)
```

Post-remediation state: `npm install` completes cleanly; `node_modules` is consistent with
`package-lock.json`.

## 3. Development server

```bash
npm run dev     # NODE_OPTIONS="--max-old-space-size=4096 --dns-result-order=ipv4first" next dev
```

Observed output:

```
▲ Next.js 16.3.5 (Turbopack)   ← before the Next.js upgrade performed in this audit
- Local: http://localhost:3000
- Environments: .env.local, .env
✓ Ready in 612ms
```

The server started with no runtime errors and served `/login` with HTTP 200.

## 4. Production build

```bash
npm run build   # next build --webpack
```

Observed after the upgrade to Next.js 16.4.6 (final state):

```
▲ Next.js 16.4.6 (webpack)
✓ Compiled successfully in 36.4s
  Running TypeScript ... Finished TypeScript in 25.4s
✓ Generating static pages using 3 workers (40/40) in 2.2s
```

Exit code 0; no compiler warnings; no TypeScript errors (`ignoreBuildErrors: false`).

## 5. Quality commands

| Command | Purpose | Result in this audit |
|---|---|---|
| `npx tsc --noEmit` | strict type check | PASS (no output) |
| `npx eslint` | lint | PASS (no output) |
| `npx vitest run` | unit + integration tests | PASS — 36 files / 413 tests |
| `npm audit --omit=dev` | production dependency risk | 2 moderate (uuid via exceljs) |

## 6. Database setup

* Engine: Turso / libSQL (SQLite dialect). Local development may use `file:./local.db`; the
  configured deployment uses the URL in the environment file (value not read or disclosed).
* Schema: `src/db/schema.ts`; migrations: `drizzle/`; client: `src/db/index.ts`.
* Scripts: `npm run db:generate`, `npm run db:migrate`, `npm run db:push`, `npm run seed`.
* **This audit did not mutate the configured database.** All write-path verification used
  throwaway SQLite files created by the integration tests under `.tmp-integration/`.
* One read-only query was executed against the configured database to confirm
  `system_settings.maintenance_mode = false` (so the newly implemented maintenance gate cannot
  lock out users on deploy). Returned 7 setting rows; no values beyond the setting keys/values
  listed in `06_Implementation/implementation_log.md` were read.

## 7. External services

| Service | Variables (names only) | Status in this environment |
|---|---|---|
| Turso / libSQL | `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, legacy `LIBSQL_URL`, `LIBSQL_AUTH_TOKEN` | Configured (value not read) |
| Mailgun (password-reset mail) | `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM_EMAIL` | Not exercised — **BLOCKED** |
| AI provider (optional) | `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL`, `AI_ENABLED`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` | Not configured — AI paths return the "not configured" message |
| Cookie security | `SESSION_COOKIE_SECURE` | Names only; recommended `true` in HTTPS production |
| Encryption at rest | `ENCRYPTION_KEY` | Referenced by `src/lib/security/encryption.ts`; a development fallback exists and warns when used |
| Public base URL | `NEXT_PUBLIC_APP_URL` | Used for metadata and QR links |

`.env`, `.env.local` and every other environment file were **not read** during this audit. Variable
names were derived from `process.env.*` references in source and from the project README.

## 8. Tooling intentionally not used

* Docker (none in the repo).
* Remote migration/drift commands (destructive risk against the configured database).
* Browser automation for authenticated flows (no credentials available).
