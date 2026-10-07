# Test Plan

> STATUS: **PLAN**. Runner: Vitest (`vitest.config.ts`, `src/**/*.test.ts`).
> Existing suites (`src/lib/__tests__/`) are updated and extended; pure-function
> tests preferred (current suites hit no DB). Commands: `npm run lint`,
> `npm test`, `npm run build`.

## 1. Authentication (port + extend)

- [ ] login success (session created, cookie set, last_login updated, audited)
- [ ] logout destroys session row + cookie
- [ ] session expiry / inactive user rejected
- [ ] invalid login (wrong password) — rate limit triggers, failure audited
- [ ] disabled user cannot authenticate
- [ ] unknown role id rejected (`roleNameFromId` null ⇒ no access)

## 2. Authorization (matrix-driven — `role-permission-matrix.md`)

- [ ] admin, school admin, teacher, records, guidance: per-permission allow/deny table test
- [ ] `studentScope`: teacher sees only assigned sections; records/guidance domain limits
- [ ] actions without session fail closed (`getAuthorizedUser` null)
- [ ] pages redirect unauthorized roles to dashboard with `denied` param
- [ ] `/api/reports` rejects 401/403 (proxy + handler double-check)

## 3. Students

- [ ] create (student number generated, duplicate candidates flagged)
- [ ] view (profile aggregate correctness), edit, archive/restore
- [ ] search + filters + pagination (port `queries-filters.test.ts` patterns)
- [ ] duplicate detection scoring & pair-unique; no auto-merge anywhere

## 4. Enrollment

- [ ] create enrollment; one-per-year uniqueness enforced
- [ ] history preserved across years (no overwrite)
- [ ] transfer/withdraw transitions; invalid section/year combinations rejected

## 5. Grades

- [ ] encode + update; scale bounds from settings enforced
- [ ] subject average, general average calculations (unit tests with fixtures)
- [ ] historical performance queries (period ordering, zero-filled gaps)

## 6. Assessments (reading / literacy / numeracy)

- [ ] record + level validation against configured sets
- [ ] domain-scoped queries return only requested domain
- [ ] distribution/trend aggregations with empty datasets

## 7. Attendance

- [ ] record + unique(enrollment, date)
- [ ] rate calculation per configured definition
- [ ] trend queries; repeated-absence rule thresholds

## 8. Behavior

- [ ] record/update/resolve lifecycle
- [ ] permissions: records role blocked; teacher section-scoped
- [ ] repeat-concern rule computation

## 9. Interventions

- [ ] lifecycle transitions (planned→active→completed / discontinued)
- [ ] invalid transitions rejected server-side
- [ ] follow-ups; overdue computation

## 10. Analytics

- [ ] every documented metric's calculation (fixtures in, expected aggregates out)
- [ ] filters (school year, grade, section) applied
- [ ] empty datasets → zero-filled, no NaN
- [ ] monitoring-rules engine: each rule triggers/doesn't at boundary values

## 11. Reports

- [ ] per-type builder output shape (columns + typed rows)
- [ ] authorization per type × role
- [ ] empty report → valid zero-row output
- [ ] school-year filter applied

## 12. QR

- [ ] generate → resolve → revoke lifecycle
- [ ] expired/unknown handling (uniform responses)
- [ ] payload contains token only

## 13. Database / Migration

- [ ] backfill reconciliation counts (children→students etc.)
- [ ] unique-constraint enforcement (enrollment per year, attendance per date, grade triple)
- [ ] cascade behavior spot checks
- [ ] archive tables untouched by app code (grep gate)

## 14. UI / Acceptance

- [ ] manual QA checklist (`acceptance-tests.md`): all roles' journeys
- [ ] responsive checks (360/768/1024/1440) on critical pages
- [ ] a11y pass (focus, labels, chart descriptions)
- [ ] loading/empty/error states present on every major page

## Definition of Done (per phase)

`npm run lint` ✅ · `npm test` ✅ · `npm run build` ✅ · manual flow verified ·
docs updated · checkboxes in `master-migration-plan.md` ticked only for
completed work.
