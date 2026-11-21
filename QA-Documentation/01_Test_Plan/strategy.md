# Test Strategy

**Project:** Sta. Magdalena Records Management System (`child-mapping-system`)
**Audit date:** 2026-11-15
**Auditor role:** QA / Security / Performance / Accessibility / Technical Writing / Implementation

---

## 1. Objective

Take the application from discovery through implementation and verification:

```
Discover → Understand → Analyze → Test → Audit → Document → Remediate → Retest → Regress → Verify
```

Documentation is treated as an **implementation plan**: every confirmed, in-scope, safely fixable
defect discovered during the audit was implemented and retested in this same cycle.

---

## 2. Technology stack under test

| Layer | Technology |
|---|---|
| Framework | Next.js 16.4.6 (App Router, React Server Components, Server Actions, Proxy/middleware) |
| UI | React 19.2.8, Tailwind CSS 4, lucide-react, Recharts, Framer Motion |
| Language | TypeScript 5 (strict, `ignoreBuildErrors: false`) |
| Backend | Next.js Server Actions (`src/actions/*`), Route Handlers (`src/app/api/**`) |
| Database | Turso / libSQL (SQLite dialect) via Drizzle ORM 0.45 + Drizzle Kit |
| Auth | DB-backed sessions (`sms_session` cookie, SHA-256 token hash), bcryptjs (cost 10), TOTP MFA |
| Validation | Zod 4 (server-side), React Hook Form (client-side) |
| Reports | `@react-pdf/renderer` (PDF), `exceljs` (XLSX), hand-rolled RFC 4180 CSV |
| Test runner | Vitest 3.2.7 (unit + integration against a throwaway SQLite file) |
| Lint | ESLint 9 with `eslint-config-next` |

## 3. Method

### 3.1 Static analysis (primary)

* Full read of `src/actions/**` (every server action), `src/lib/**` (auth, permissions, scope,
  workflow, queries, reports, encryption, rate-limit, AI provider) and `src/app/api/**`.
* Route-by-route guard inventory (`getCurrentUser` / `requirePermission` / `hasUserPermission` /
  `canAccessStudent`) for every `page.tsx`.
* Authorization matrix cross-check: `src/lib/permissions.ts` ↔ `src/lib/scope.ts` ↔ each action.
* Search for dangerous constructs: `any`, `@ts-ignore`, raw SQL string interpolation,
  `dangerouslySetInnerHTML`, `eval`, unvalidated `FormData`, unbounded queries, N+1 loops.

### 3.2 Dynamic analysis

* Production build (`npm run build`) and development server (`npm run dev`) on port 3000.
* HTTP probing with `curl`: status codes, redirects, security headers, unauthenticated access to
  protected pages and API routes, 404 handling, public QR verification pages.
* Database inspection (read-only) of `system_settings` to confirm defaults before enabling the
  maintenance-mode gate.

### 3.3 Test execution

* Existing suite: `npx vitest run` (36 files).
* New regression tests added for each authorization fix and for the export sanitizer.
* `npx tsc --noEmit` and `npx eslint` as compile/quality gates.
* `npm audit --omit=dev` against the live advisory database for dependency risk.

### 3.4 Security methodology (OWASP Top 10 mapping)

| OWASP | Approach in this audit |
|---|---|
| A01 Broken Access Control | Action-by-action permission **and** row-ownership review; IDOR attempts modeled against `saveBehavior`, `saveGrade`, guidance incident actions |
| A02 Cryptographic Failures | Session token hashing, bcrypt cost, AES-256-GCM at rest, cookie flags |
| A03 Injection | Drizzle parameterization review, raw `sql` template review, CSV/XLSX formula injection |
| A04 Insecure Design | Workflow gates (draft → verified → printable), duplicate review, section scope |
| A05 Security Misconfiguration | Response headers, `X-Powered-By`, CSP, error-message disclosure |
| A06 Vulnerable Components | `npm audit` (prod + full), Next.js/Zod advisory remediation |
| A07 Auth Failures | Login rate limiting, generic errors, MFA challenge, session revocation |
| A08 Integrity Failures | Export sanitization, dependency upgrade integrity |
| A09 Logging Failures | `audit_logs` coverage review for sensitive mutations |
| A10 SSRF | Review of outbound requests (AI provider base URL, email provider) |

### 3.5 Performance methodology

* Production build output (route table, bundle observations, warnings).
* Manual review for N+1 query loops, sequential awaits that could be parallel, unbounded result
  sets, missing pagination, oversized client components.
* No synthetic load testing was performed (single-instance school deployment); findings are
  code-evidence based, and no speedup is claimed without measurement.

### 3.6 Accessibility methodology

* Static review of semantic HTML, labels, ARIA, focus management, keyboard paths, alt text,
  reduced-motion/print styles, and touch-target sizing in shared primitives and the app shell.
* No automated axe/Lighthouse run was executed in this environment; findings are code-based and
  marked accordingly.

## 4. Priorities

1. Security (authorization, injection, secrets, dependency CVEs)
2. Data integrity
3. Broken functionality
4. Reliability
5. Performance
6. Accessibility
7. Maintainability / cleanup

## 5. Evidence rules

* Every finding cites `file:line` and the code path that proves it.
* Statuses: `CONFIRMED`, `LIKELY`, `POTENTIAL`, `INFORMATIONAL`.
* Test statuses: `PASS`, `FAIL`, `BLOCKED`, `NOT TESTED`, `NOT APPLICABLE`.
* Nothing is reported as passing unless it was executed in this session.

## 6. Limitations

* No interactive browser session was driven for authenticated flows: signing in requires real
  credentials that are not available to the auditor, and the production cookie is `secure`
  (HTTPS-only). Authenticated behaviour was therefore verified through the server-action
  integration tests (real SQLite database, real session rows, real permission checks) rather than
  through clicking the UI.
* No penetration-test tooling (ZAP/Burp) was run; the audit is code- and request-level.
* Turso production data was never mutated. All write-path tests use throwaway database files under
  `.tmp-integration/`.
* Lighthouse/axe automated scoring was not available (BLOCKED).
