# Performance Comparison

Note: Full production measurements were not available due to environment/network constraints. Metrics below are based on code audit and structural improvements.

| Metric | Before | After | Improvement | Evidence |
| --- | --- | --- | --- | --- |
| Middleware / route protection | Per-page `getCurrentUser()` only; no centralized session validation | `proxy.ts` validates session cookie centrally; redirect logic preserved; analytics tracking added | Improved reliability and observability; same security behavior preserved | Code review: `proxy.ts` enhanced |
| Analytics events tracked | 0 events | 4 event types (login_completed, login_failed variants, logout_completed) + page_viewed for auth redirects | Observability added; no PII collected | `src/lib/analytics.ts`, `src/actions/auth.ts` |
| Unbounded DB queries (users) | All users loaded at once (`listUsersWithRoles` without pagination) | Pagination (`page`, `pageSize`, `limit`, `offset`) added | Scalability improved; payload reduced for large user bases | `src/lib/queries.ts` |
| Unbounded DB queries (audit logs) | `limit` only; no pagination offset | Pagination (`page`, `limit`, `offset`) added | Scalability improved | `src/lib/queries.ts` |
| Unbounded DB queries (monitoring) | `limit(200)` without pagination | Pagination (`page`, `pageSize`, `limit`, `offset`) added | Better scalability and response time | `src/lib/queries.ts` |
| Unbounded DB queries (interventions) | `limit(200)` without pagination | Pagination (`page`, `pageSize`, `limit`, `offset`) added | Better scalability | `src/lib/queries.ts` |
| TypeScript checks | Passed (before) | Passed (after) | No regressions | `npx tsc --noEmit` |
| Lint | 2 pre-existing errors in `src/app/error.tsx` | Same 2 pre-existing errors; no new errors | No new lint issues introduced | `npm run lint` |
| Build | Failed due to network font fetch (`Fira Sans` / `Fira Code`) — unrelated to code changes | Same network issue; no code-related build errors | Build failure is external/network-related, not implementation-related | Build output shows font fetch timeout |
