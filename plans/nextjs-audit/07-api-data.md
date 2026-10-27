# API & Data Review

## Route Handlers
- `/api/forecasts/route.ts`: forecasting endpoint. Must verify authorization and input validation.
- `/api/form137/[id]/route.ts` and `/api/report-card/[id]/route.ts`: PDF generation routes. Must verify:
  - Authorization: only users with `documents.print` (registrar) or relevant roles can access.
  - Input validation: `id` parameter must be validated (format, existence, ownership).
  - No data leakage: PDF should contain only the requested student's data.
- `/api/reports/[type]/route.ts`: report generation endpoint. Must verify authorization (`reports.view`, `reports.generate`, `reports.export`) and input validation (`type` must match allowed report types).

## Server Actions (`src/actions/`)
- `auth.ts`: login/logout actions. Must verify authorization (only unauthenticated for login, only authenticated for logout) and validation (email format, password presence).
- `students.ts`: student mutations (create, update, archive). Must verify authorization (`students.create`, `students.update`, `students.archive`) and validation (required fields, unique `studentNumber`, valid `birthDate`, `status` enum).
- `grades.ts`: grade mutations. Must verify authorization (`grades.write` is teacher-only) and validation (`grade` numeric range, `status` enum, enrollment/subject/grading period existence).
- `health.ts`, `duplicates.ts`, `employees.ts`, `interventions.ts`, `notifications.ts`, `qr.ts`, `records.ts`, `settings.ts`, `users.ts` — all need authorization and validation audits.
- `helpers.ts`: likely shared utility functions; inspect for safe reuse.

## Data Fetching Patterns
- `AppShell` performs async DB query (`unreadNotificationCount`). This is a server-side query within a Server Component; no internal HTTP request needed.
- Pages (`dashboard/page.tsx`, etc.) likely fetch data directly from DB or through `src/lib/` services. Must verify no unnecessary `fetch()` calls to internal APIs.
- `src/lib/dashboard-data.ts`, `src/lib/analytics.ts`, `src/lib/forecasting/*` provide server-side data processing.
- `src/lib/queries.ts` likely provides reusable query functions.

## Caching
- `cache()` used for `getCurrentUser()`. Safe for request-scoped deduplication.
- No `unstable_cache` or `revalidatePath` usage observed in files inspected.
- If mutations don't revalidate paths, stale data may persist after updates. Must audit mutations for cache invalidation.
- No `next.revalidate` or `fetch` with `cache: 'force-cache'` options observed.

## Database Queries
- Queries in `AppShell`: selects from `notifications` with count; efficient.
- Queries in pages: must verify pagination (`LIMIT`/`OFFSET`), column selection (`SELECT *` avoidance), and index usage.
- `drizzle-orm` relational queries (`with`, `relations`) may generate complex SQL; verify query performance with `EXPLAIN QUERY PLAN` (SQLite supports `.explain`).
- `N+1` risk: if pages iterate over students and fetch grades/enrollments individually, this creates multiple queries. Must verify relational query usage.

## Mutation Safety
- Every mutation (`actions/*.ts`) should:
  1. Verify authorization (`getAuthorizedUser()` or explicit role check).
  2. Validate input (`zod` schema or manual validation).
  3. Check resource ownership or scope (e.g., a teacher can only modify grades for their own sections).
  4. Handle errors gracefully (return errors, not throw unhandled exceptions).
  5. Log actions (`auditLogs`) where appropriate.
- `auditLogs` table exists; verify that important mutations insert audit records.

## Data Access Improvements (recommended)
- Audit all `route.ts` for authorization and validation.
- Audit all `actions/*.ts` for authorization, validation, ownership checks, and audit logging.
- Introduce pagination for all list queries.
- Verify relational queries to avoid `N+1` patterns.
- Add mutation invalidation (`revalidatePath`, `revalidateTag`) where needed.
