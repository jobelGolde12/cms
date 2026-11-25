# Test Strategy

Audit date: 2026-11-25
Repository: `child-mapping-system` (Records Management System — Sta. Magdalena NHS)
Branch: `feature/grade-7-10-only`

## Objective

Take the application from discovery through documentation, remediation, retesting, regression testing and a final production-readiness verdict. The primary requested UI scope was the welcome-page navbar; the mandate also required auditing and fixing other confirmed, in-scope defects.

## Technology stack

| Area | Technology |
|---|---|
| Framework | Next.js 16.4.6 (App Router, Proxy/middleware) |
| UI | React 19.2.8, TypeScript 5, Tailwind CSS 4 |
| Data | Drizzle ORM 0.45.2, `@libsql/client` (Turso / libSQL) |
| Auth | Custom sessions (httpOnly cookie), bcryptjs, role-based access control |
| Validation | Zod 4 |
| Tests | Vitest 3.2.7 (40 files, 464 tests) |
| Charts / export | Recharts, ExcelJS, @react-pdf/renderer, QR libraries |

## Methodology

1. **Static inspection** — routes, layouts, proxy/middleware, server actions, DB schema, auth/session code, headers and dependency manifests.
2. **Targeted browser testing** — welcome page and navbar at 320, 390, 768, 1024 and 1440 px; drawer open/close, keyboard Tab cycling, Escape, focus restoration, anchor navigation, horizontal-overflow measurement (via `agent-browser` + Chrome CDP).
3. **Automated verification** — `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm audit --omit=dev`.
4. **Manual code review** for OWASP-style risks (access control, injection, headers, secrets, dependency risk).
5. **Remediation** of confirmed issues followed by focused retest and full regression suite.

## Test levels and priorities

| Level | Applied to | Priority |
|---|---|---|
| Unit / integration (Vitest) | AI actions, auth, students, grades, permissions, filters | High |
| Static analysis | TypeScript, ESLint | High |
| Production build | All routes | High |
| Browser UI | Welcome page and navbar (requested scope) | High |
| Security review | Access control, injection, headers, secrets, dependencies | High |
| Full application E2E | Authenticated role workflows | Blocked (no test credentials supplied) |

## Security methodology

- OWASP Top 10 oriented review of access control, cryptographic handling, injection, misconfiguration, authentication, logging and SSRF surfaces.
- Verified that the proxy/middleware auth gate and server actions re-check permissions (UI hiding is not treated as enforcement).
- `npm audit --omit=dev` for dependency intelligence; no vulnerability claimed without advisory evidence.
- `.env`, `.env.local` and all secret files were **never read**. Only variable names from `.env.example` are documented.

## Performance methodology

- Production build success, compile duration and route rendering strategy.
- Static vs dynamic route classification from the build output.
- Source review for N+1 patterns, unbounded queries and unnecessary client components.
- No synthetic load-test claim is made; no benchmark of an external Turso database was run.

## Accessibility methodology

Manual WCAG 2.2 AA-oriented review using the accessibility tree, keyboard interaction, focus management, touch-target sizing, semantic landmarks/headings, form labelling in the inspected scope and colour-contrast calculation for changed text. No automated axe scan was run (not installed).

## Limitations

- Remote Turso production data was not modified or load-tested; tests use throwaway file databases.
- Mailgun/AI provider calls were mocked or not exercised; email delivery and real model responses are unverified.
- Authenticated end-to-end browser flows could not be run because no usable test account credentials were provided (documented as BLOCKED).
- Browser findings are point-in-time evidence from a development server unless stated otherwise.
