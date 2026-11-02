# Database Connectivity & Loading UX Audit — 2026-11

Full pre-production audit of the Sta. Magdalena NHS Records Management System:
database connectivity, form/field correctness, CRUD, authorization, validation,
error handling, loading/skeleton UX, and empty/error states.

Method: read-only inspection of all `src/app` pages, `src/actions` server
actions, `src/lib` data access, direct structure-only inspection of the **live
Turso database** (`scripts/tmp/turso-audit.mjs`, prints no credentials), grep
sweeps for mock/hardcoded data, and the existing Vitest suite (201 tests,
all passing at audit start).

---

## 1. Database audit (live Turso, structure-only)

| Check | Result | Status |
|---|---|---|
| Turso reachability + remote `libsql://` URL | Confirmed via env at runtime | PASS |
| Tables in schema.ts ↔ Turso | All app tables present (35 app + 10 legacy backup + migrations) | PASS |
| `health_records.height_for_age` column | Present (migration 0008 applied) | PASS |
| `students.lrn`, `students.birth_place` | Present | PASS |
| `users.barangay_id` legacy drift | Removed (2026-11 rebuild migration, 0 FK violations) | PASS |
| Orphans: health/clinical/behavior/assessments/interventions → students | 0 | PASS |
| Orphans: enrollments → students, grades → enrollments | 0 | PASS |
| Enrollment school-year vs section school-year mismatch | 0 | PASS |
| FKs, unique constraints, timestamps in Turso | Match Drizzle schema | PASS |
| `drizzle-kit push` remaining "drift" | Only deliberately-retained legacy backup tables (`children`, `schools`, `barangays`, `child_*`) — must never be force-dropped | WARNING (documented) |

Types, dates and booleans match (`integer` timestamp/boolean modes, `real`
grades/credits, ISO `text` dates). No missing indexes were identified for the
query paths exercised in `src/lib/queries.ts`.

## 2. Page → database connectivity (server-rendered pages)

| Page | Data source | Authorization | Empty state | Status |
|---|---|---|---|---|
| `/students` registry | `listStudents` (+stats, counts, guidance roster) | `students.view` + `userSectionScope` row scope | TableEmptyState | PASS |
| `/students/[id]` profile | `src/lib/queries.ts` joins | scope-checked | PASS | |
| `/users` | `listUsersWithRoles` | `users.view` | TableEmptyState | PASS |
| `/activity-logs` | `listAuditLogs` paginated | `audit_logs.view` | TableEmptyState | PASS |
| `/verification` | `verificationQueue`/`Stats` | `verification.review` | EmptyState | PASS (search = full page reload — NEEDS FIX) |
| `/duplicates` | queries.ts duplicates | `duplicates.view` + review perm | EmptyState | PASS (buttons no pending — NEEDS FIX) |
| `/guidance` | `listGuidanceIncidents` + confidential filter | `behavior.view` + `canViewConfidentialBehavior` | TableEmptyState | PASS (filters full reload — NEEDS FIX) |
| `/health`, `/grades`, `/performance`, `/development`, `/duplicates`, `/service-credits`, `/reports`, `/dashboard` | dedicated lib modules | role-scoped | skeletons exist | PASS |
| `/qr` | fresh drizzle query, tokens never exposed | `qr.verify` (school-wide roles only) | TableEmptyState | PASS |
| `/notifications` | `recentNotifications(user.id)` | per-user rows | EmptyState | PASS (button no pending — NEEDS FIX) |
| Employees / 201 / service credits | employee-scoped queries | `employees.*` / admin_officer only | EmptyState | PASS |
| Mock/static/hardcoded data in production pages | grep sweep: none (report/exports read DB only) | — | — | PASS |

## 3. Forms, field paths & validation

- All CRUD forms use `react-hook-form` + `@hookform/resolvers` + **Zod**
  schemas shared client/server (`src/lib/schemas.ts`), incl. PH phone
  validation, LRN 12-digit rule, birth-date window, contingent guardian rules.
- Every form traced: `students` (create/edit + enrollment + guardians),
  employees, employee 201, service credits, grades (draft/submit workflow with
  server-side verification), guidance incidents, health/nutrition, clinical,
  assessments, verification review, duplicate resolution, QR, settings,
  password/profile. Field → form state → action → Drizzle column mapping is
  consistent (snake_case columns; Drizzle `mode: "timestamp"|"boolean"`).
- Duplicate-submission prevention: forms driven by `useActionState` are
  disabled while pending. **NEEDS FIX:** server-component
  `<form action={serverAction}>` + plain `<Button type="submit">` on
  verification queue (approve/return/reject), notifications (mark all read),
  duplicates (confirm/not-duplicate/dismiss), employees (archive/restore),
  settings system-preferences — no pending/disabled state.

## 4. Server actions & error handling

- Every action guards with `getAuthorizedUser(permission)` → returns typed
  `ActionState` errors; revalidates paths on success; never exposes SQL/stack.
- Errors are caught and mapped to safe messages. PASS.
- Missing awaits / race conditions / wrong WHERE clauses: none found in the
  actions read (`students.ts`, `health.ts`, `grades.ts`, `employees.ts`,
  `guidance.ts`, `users.ts`, `settings.ts`, `notifications.ts`, `qr.ts`,
  `records.ts`, `interventions.ts`, `duplicates.ts`).

## 5. Loading-state UX findings (implementation targets)

| # | Finding | Severity | Fix |
|---|---|---|---|
| L1 | No `loading.tsx` for `/students` registry | HIGH | Add route skeleton (reuse `RegistryPageSkeleton` pattern) |
| L2 | No `loading.tsx` for `/users`, `/activity-logs`, `/guidance` | MED | Add route skeletons (table rows) |
| L3 | Search/filter GET forms trigger full document reloads (registry, verification, guidance, service-credits) | MED (explicit requirement: search must not full-reload) | `ClientNavForm` client wrapper → `router.push` in transition |
| L4 | No pending state on server-action form buttons (verification ×3, notifications, duplicates ×3, employees archive/restore, settings save) | MED | Reusable `SubmitButton` (`useFormStatus`): disabled + spinner + context labels ("Reviewing…", "Deleting…", "Saving…") |
| L5 | Dashboards already use skeletons (`DashboardPageSkeleton`, `RegistryPageSkeleton`, per-route skeletons) — no fake numbers | OK | — |
| L6 | `prefers-reduced-motion` handled globally; no artificial delays (`setTimeout` uses are copy-reset, flicker-guard, count-up) | OK | — |
| L7 | Empty vs loading separation already correct (`EmptyState`, `TableEmptyState`) | OK | — |
| L8 | `/qr` route has no loading.tsx (fast query — acceptable, listed NOT APPLICABLE after review) | LOW | — |

## 6. Implementation plan (executed in this pass)

- Phase 1 — Loading/skeleton coverage: L1, L2.
- Phase 2 — No-reload search/filter: L3 (`ClientNavForm`).
- Phase 3 — Pending-state buttons: L4 (`SubmitButton`), duplicate-prevention.
- Phase 4 — Re-run: vitest, tsc, eslint, build; regression-verify changed pages.

## 7. Not changed (deliberately)

- RBAC matrix, grade workflow, schema (no drift found), visual design, and the
  retained legacy Turso backup tables (data-bearing; removal is a separate
  planned migration).
