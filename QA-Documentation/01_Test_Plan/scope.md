# Scope

## 1. Tested features

| Feature | Route(s) | Server code | AuthZ model |
|---|---|---|---|
| Authentication (login, MFA challenge, logout) | `/login`, `/login/mfa`, `/logout` | `src/actions/auth.ts`, `src/actions/mfa.ts`, `src/app/logout/route.ts` | public + session |
| Self-registration + admin approval | `/register`, `/users` | `src/actions/registration.ts` | public (pending only), `users.manage` for approval |
| Password recovery | `/forgot-password`, `/reset-password` | `src/actions/password-reset.ts`, `src/lib/password-reset.ts`, `src/lib/security/tokens.ts` | public, rate-limited |
| Dashboard analytics | `/dashboard` | `src/lib/dashboard-data.ts` | `dashboard.view` |
| Student registry (search/filter/sort/paginate) | `/students` | `src/lib/queries.ts` (`listStudents`, `studentFilters`), `src/lib/scope.ts` | `students.view` + section scope |
| Student create / edit / archive | `/students/new`, `/students/[id]/edit` | `src/actions/students.ts` | `students.create` / `students.update` + `canManageEnrollmentInSection` |
| Student profile (grades, attendance, behavior, assessments, interventions, health) | `/students/[id]` | `src/actions/records.ts`, `interventions.ts`, `health.ts` | per-domain permission + `canAccessStudent` |
| Enrollment management | `/students/[id]`, `/sections` | `src/actions/records.ts` (`saveEnrollment`), `sections.ts` | `enrollment.manage` + section scope |
| Grade encoding (section sheet) | `/grades` | `src/actions/grades.ts` | `grades.encode` + `grades.write` + `(section, subject)` assignment |
| Grade-submission monitoring | `/grades/monitoring` | `src/actions/grade-monitoring.ts` | `grades.monitor` / `academics.config` |
| Attendance | `/students/[id]` | `saveAttendance` | `attendance.write` + row scope |
| Behavior / Student development | `/development`, `/development/behavior` | `saveBehavior`, `src/actions/interventions.ts` | `behavior.*` + row scope + confidentiality filter |
| Guidance incidents (confidential) | `/guidance`, `/guidance/incidents/*` | `src/actions/guidance.ts` | `behavior.write` + guidance/admin tier + confidentiality |
| Health & clinical records | `/health` | `src/actions/health.ts` | `health.*` + row scope |
| Verification workflow | `/verification`, `/students/[id]` | `src/actions/students.ts` (`reviewVerification`), `src/lib/workflow.ts` | `verification.review` |
| Duplicate review | `/duplicates` | `src/actions/duplicates.ts` | `duplicates.review` |
| QR verification (issue/revoke/public scan) | `/qr`, `/verify`, `/verify/[token]`, `/verify/result` | `src/actions/qr.ts`, `src/lib/qr.ts` | `qr.verify` (issue/revoke), public (scan) |
| Reports & exports (PDF/XLSX/CSV) | `/reports`, `/reports/[type]`, `/api/reports/[type]` | `src/lib/reports/*`, route handler | `reports.export` + row scope |
| Official documents (SF10, report card, student card) | `/students/[id]/print/*`, `/api/form137/[id]`, `/api/report-card/[id]` | `src/lib/form137.ts`, `src/lib/report-card.ts` | `documents.print` + row scope + verified-only gate |
| Forecasting | `/performance`, `/api/forecasts` | `src/lib/forecasting/*` | `grades.view` |
| User management | `/users` | `src/actions/users.ts`, `registration.ts` | `users.view` / `users.manage` |
| Employees, 201 files, service credits | `/employees/**`, `/service-credits` | `src/actions/employees.ts`, `src/lib/employees.ts` | `employees.*`, `employee_201.*`, `service_credits.*` |
| Assignments / teaching loads | `/assignments` | `src/actions/assignments.ts`, `src/lib/teaching-loads.ts` | `academics.config` |
| Notifications | `/notifications` | `src/actions/notifications.ts` | session-owned rows |
| Audit logs | `/activity-logs` | `src/lib/audit.ts` | `audit_logs.view` |
| Settings (system preferences) | `/settings` | `src/actions/settings.ts`, `src/lib/system-settings.ts` | `settings.manage` |
| Account security / MFA | `/settings/mfa` | `src/actions/mfa.ts`, `src/lib/mfa.ts`, `src/lib/security/totp.ts` | session |
| AI assistance (optional) | panels on student/performance/guidance/dashboard | `src/actions/ai.ts`, `src/lib/ai/*` | per-domain permission + row scope + per-user rate limit |
| Privacy policy | `/privacy` | `src/lib/privacy-policy.ts` | public |
| Robots | `/robots.txt` | `src/app/robots.ts` | public |

## 2. Tested routes (HTTP)

All 44 page routes and 4 API route handlers listed by the production build were probed for
unauthenticated behaviour (status code, redirect target, JSON error shape) — see
`02_Functional_Testing/execution_results.md`.

## 3. Tested APIs

| Endpoint | Methods | Checks performed |
|---|---|---|
| `/api/reports/[type]` | GET | 401 unauthenticated, 403 for roles without `reports.export` (proxy pre-check + handler re-check), 400 for unknown type/format, export sanitization |
| `/api/form137/[id]` | GET | 401 unauth, `documents.print` + `canAccessStudent`, verified-only (409), `Cache-Control: private, no-store` |
| `/api/report-card/[id]` | GET | same as Form 137 |
| `/api/forecasts` | GET | 401 unauth, `grades.view`, scope param validation, no internal error disclosure |
| `/logout` | GET | session row deletion + cookie clear |

## 4. Tested database interactions

* Every Drizzle `select`/`insert`/`update`/`delete` in `src/actions/**` and `src/lib/**` was read for
  parameterization, ownership predicates, scope predicates, transaction use and pagination.
* Integration tests execute the real schema (migrated from `drizzle/`) against throwaway SQLite
  files: `.tmp-integration/actions-test.db`, `.tmp-integration/records-authz.db`.
* Read-only inspection of the configured database (`system_settings`) to confirm
  `maintenance_mode = false` before shipping the new maintenance gate.

## 5. Authentication & authorization coverage

* Unauthenticated → protected page: redirect to `/login` (307) — verified by HTTP.
* Unauthenticated → API: JSON `401` — verified by HTTP.
* Signed-in user without permission → `403` / redirect with `denied` parameter.
* Signed-in user, wrong row → ownership/scope checks (exercised in integration tests for
  `saveBehavior`, `saveGrade`, guidance incidents, and covered by existing tests for scope/grade
  scope/RBAC).
* Gallery of roles: `admin`, `school_admin`, `subject_teacher`, `teacher`, `records`, `guidance`,
  `nurse`, `registrar`, `literacy_coordinator`, `admin_officer` — matrix reviewed in
  `src/lib/permissions.ts` and `documentation/security/role-permission-matrix.md`.

## 6. Out of scope

* Email delivery through Mailgun (no provider credentials in this environment) — **BLOCKED**.
* AI provider calls (no `AI_API_KEY`) — **BLOCKED**; the disabled path was reviewed and the
  "not configured" result is user-safe.
* Turso remote migrations/drift (`npm run db:drift` needs remote credentials and is destructive to
  schema state) — **NOT TESTED**.
* Load/throughput testing and Lighthouse scoring — **NOT TESTED**.
* Multi-instance rate limiting behaviour (the limiter is explicitly in-process) — documented
  limitation, not tested.

## 7. Blocked areas

| Area | Reason |
|---|---|
| Authenticated browser walkthrough | No test credentials available to the auditor; production cookie is HTTPS-only |
| Mailgun email send | `MAILGUN_API_KEY` / `MAILGUN_DOMAIN` not available |
| AI features | `AI_API_KEY` not available |
| axe / Lighthouse automated a11y score | Tooling/renderer unavailable in this environment |
