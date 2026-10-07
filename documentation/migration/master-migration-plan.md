# Master Migration Plan — Records Management System with Profile and Performance Analytics of Sta. Magdalena National High School

> **AUTHORITATIVE ROADMAP.** STATUS: PLAN (nothing implemented).
> Another agent must be able to execute this without the original ERD.
> Rules: every task has a checkbox; check items only when actually completed;
> no task is "planned-complete". Actual paths are from the audited repo
> (see `documentation/migration/codebase-audit.md`).

Phases correspond to TODO.md §51. Work top-to-bottom; do not start a phase
before its dependencies are checked. UI tasks must preserve the approved design
(`src/app/globals.css` tokens, `src/components/ui/*`, layout in
`src/components/app-shell.tsx`).

---

## Phase 1 — Codebase Audit ✅ (done, planning mode)

- [x] Audit `package.json`, `next.config.ts`, `drizzle.config.ts`, `vitest.config.ts`, `tsconfig.json`
- [x] Audit `src/db/schema.ts` (24 tables) and `src/db/index.ts`
- [x] Audit routes (`src/app/**`), actions (`src/actions/*`), lib (`src/lib/*`)
- [x] Audit auth (`src/lib/auth.ts`), permissions (`src/lib/permissions.ts`), scope (`src/lib/scope.ts`), workflow (`src/lib/workflow.ts`)
- [x] Audit UI (`src/components/**`, `src/app/globals.css`) and loading/error states
- [x] Search old terminology across the repo (documented in `old-vs-new.md` + `codebase-audit.md` §5)
- [x] Inspect git state (branch `change-title`, uncommitted `TODO.md` only) — no resets, no overwrites

## Phase 2 — Requirements & Scope Migration

- [ ] Rewrite `README.md` for the school system (setup, env var *names*, scripts, roles)
- [ ] Update `src/lib/constants.ts`: replace `MUNICIPALITY` with `SCHOOL` profile; define `SCHOOL_NAME = "Sta. Magdalena National High School"`, new `ROLES`, grade levels, grading periods, attendance/behavior/assessment enums, new report types
- [ ] Remove `src/actions/register.ts` and `src/app/register/page.tsx` (accounts admin-provisioned); update `src/proxy.ts` matcher (drop `/register`)
- [ ] Remove `src/actions/get-barangays.ts` (replaced by sections/grade levels data actions)
- [ ] Update `src/lib/child-code.ts` → `student-number.ts`-style generator (keep `system_settings` prefix mechanism, new default prefix e.g. `SM`)
- [ ] Update package.json `name` to `records-management-system` (optional, cosmetic)
- [ ] Document removals in `documentation/migration/removed-features.md` and retainments in `retained-features.md`

## Phase 3 — Architecture Migration

- [ ] Define new role catalog in `src/lib/constants.ts` (admin, school_admin, teacher, records, guidance) + `ROLE_LABELS`
- [ ] Rewrite `src/lib/permissions.ts` `PERMISSIONS` + `ROLE_PERMISSIONS` to the new catalog (matrix: `documentation/security/role-permission-matrix.md`)
- [ ] Rewrite `src/lib/scope.ts`: `studentScope()` by role & section assignment; keep the pure-function testability pattern
- [ ] Rewrite `src/lib/auth.ts` `roleNameFromId` + `SessionUser` for new role IDs and assignment fields
- [ ] Update `src/components/app-shell.tsx` nav (`navLinks`, `NAV_SECTIONS`): Dashboard / Students / Performance / Student Development / Reports / Administration
- [ ] Update `src/components/sidebar-nav.tsx` (labels only — component logic stays)
- [ ] Update `src/lib/audit.ts` action-name vocabulary (`student.create`, `enrollment.create`, …) — append-only table unchanged
- [ ] Update `src/proxy.ts` matcher list for new route names

## Phase 4 — Database Migration (Turso + Drizzle)

Order matters; every step uses `npm run db:generate` + review + `npm run db:migrate`
(`drizzle/` is append-only). **No table is dropped in the first migration.**

- [ ] Add `school_years` (id, year `YYYY-YYYY` unique, start/end dates, is_current, timestamps)
- [ ] Add `grade_levels` (id, name, order_index, timestamps) — seeded Grade 7…10 (+11/12 configurable)
- [ ] Add `sections` (id, school_year_id FK, grade_level_id FK, name, adviser_id FK→users nullable, unique(school_year_id, grade_level_id, name), timestamps)
- [ ] Add `guardians` (id, first/middle/last name, relationship, contact, timestamps)
- [ ] Add `student_guardians` (student_id FK, guardian_id FK, is_primary, PK pair)
- [ ] Add `students` (id, student_number unique, names, suffix, birth_date, sex, contact info, status, created_by, timestamps) — **do not drop `children` yet**
- [ ] Add `student_enrollments` (id, student_id FK, school_year_id FK, grade_level_id FK, section_id FK, status, unique(student_id, school_year_id), timestamps) — history preserved
- [ ] Add `subjects` (id, code unique, name, description, timestamps)
- [ ] Add `grading_periods` (id, school_year_id FK, name, order_index, start/end dates, is_current)
- [ ] Add `student_grades` (id, enrollment_id FK, subject_id FK, grading_period_id FK, grade numeric, remarks, unique(enrollment_id, subject_id, grading_period_id), timestamps)
- [ ] Add `attendance_records` (id, enrollment_id FK, date, status present/absent_excused/absent_unexcused/late, recorded_by FK, remarks, unique(enrollment_id, date), timestamps)
- [ ] Add `behavior_categories` (id, name unique, kind positive/concern, timestamps)
- [ ] Add `behavior_records` (id, student_id FK, category_id FK, date, description, severity, recorded_by FK, follow_up, status, timestamps)
- [ ] Add `assessments` (id, student_id FK, domain reading/literacy/numeracy, assessment_type, date, level, score, assessor_id FK, notes, timestamps)
- [ ] Migrate data `children` → `students`; `child_education` → `student_enrollments` (map school_year text → `school_years` row; grade level → nearest level; write decisions into migration notes)
- [ ] Re-seed `roles`/`permissions`/`role_permissions` per new catalog; update `scripts/seed.mts` for school demo data (clearly fictional)
- [ ] **After** cutover verification: produce archive migration (rename obsolete tables `children` → `_archived_children` etc., or export + drop) with rollback notes — see `documentation/database/migration.md`

## Phase 5 — ERD Migration

- [ ] Rewrite `documentation/database/ERD.md` for the new schema (Mermaid)
- [ ] Update `documentation/database/SCHEMA.md` (or replace with the new data dictionary)
- [ ] Document every relationship (cardinality, FK, cascade, historical implications) — checklist in `documentation/database/relationships.md`

## Phase 6 — Authentication & Roles

- [ ] Update role IDs used in `src/lib/auth.ts` (`roleNameFromId`), `src/lib/schemas.ts` `userFormSchema.roleId` enum, `src/actions/users.ts`
- [ ] Update `src/app/(app)/users/page.tsx` role labels/columns (drop Barangay column → Section/Assignment)
- [ ] Ensure every server action still calls `getAuthorizedUser(permission)` first (`src/actions/*.ts`)
- [ ] Verify login rate-limit + audit + last-admin guard still intact after refactor
- [ ] Update `scripts/seed.mts` default-user roles from env (`DEFAULT_*` names unchanged)

## Phase 7 — Student Records

- [ ] Create `src/actions/students.ts` (create/update/archive/search) modeled on `src/actions/children.ts` (transactional, audited, Zod-validated)
- [ ] Create `src/lib/schemas.ts` additions: `studentFormSchema`, `studentQuerySchema` (pagination + filters)
- [ ] Create `src/lib/queries.ts` additions: `listStudents`, `getStudentProfile`, `getStudentGuardians` (server-side pagination; no full-table loads)
- [ ] Create duplicate detection for students (name + birth date + sex + student number) reusing `src/lib/duplicates.ts` scoring approach; human review only
- [ ] Build `src/app/(app)/students/page.tsx` registry (reuse `src/components/registry/registry-ui.tsx` patterns; KPI chips, filters, table, pagination)
- [ ] Build `src/app/(app)/students/new/page.tsx` and `[id]/edit/page.tsx` with a new `src/components/student-form.tsx` (mirror `child-form.tsx` structure & styling)
- [ ] Build `src/app/(app)/students/[id]/page.tsx` profile (IA per TODO §25: Overview, Personal, Enrollment, Academic, Attendance, Behavior, Reading, Literacy, Numeracy, Interventions, Achievements, Activity History)
- [ ] Add guardians management (sub-form + `src/actions/students.ts` actions), access-controlled
- [ ] Loading (reuse `src/components/loading/skeletons.tsx`), empty, error states for each new page
- [ ] Update `src/lib/__tests__/` scope/schema tests for students

## Phase 8 — Enrollment

- [ ] Create `src/actions/enrollment.ts` (enroll, update status, transfer) — creates NEW row per school year; never overwrites history
- [ ] Create sections/grade levels management (admin): `src/app/(app)/settings` extension or `/administration/sections` page + actions
- [ ] Enrollment analytics queries (by grade, by section, trend across years) in `src/lib/queries.ts`
- [ ] Enrollment UI in student profile (`Enrollment` tab) + section-aware filters in registry
- [ ] Tests: enrollment creation, history immutability, transfers

## Phase 9 — Academic Records

- [ ] Subjects & grading periods CRUD (admin, settings area) + actions + Zod schemas
- [ ] `src/actions/grades.ts` (encode per enrollment+subject+period; teacher scoped to assigned sections)
- [ ] Grade computation helpers (subject average, general average) — pure functions in `src/lib/` + unit tests; thresholds configurable via system settings, **documented placeholders** (no invented DepEd standard)
- [ ] `/performance/academic` page (grade-level/section/subject views, trends) + profile Academic tab
- [ ] Authorization tests: teacher cannot edit other sections' grades

## Phase 10 — Attendance

- [ ] `src/actions/attendance.ts` (record daily status; unique(enrollment, date))
- [ ] `/performance/attendance` page (section daily entry for teachers; analytics for admins)
- [ ] Attendance analytics (rate, absence/late counts, monthly/quarterly trends, repeated absences) — server-side aggregation in `src/lib/queries.ts`
- [ ] Profile Attendance tab (history + personal rates)
- [ ] Tests: recording, rate calculation, trend queries

## Phase 11 — Behavior

- [ ] Seed default `behavior_categories` (positive + concern kinds) — editable by admin
- [ ] `src/actions/behavior.ts` (record/update; `behavior.view/create/update` permissions; guidance & teacher scoped)
- [ ] `/development/behavior` page + profile Behavior tab; neutral wording throughout (no stigmatizing labels)
- [ ] Permission tests: behavior data hidden from roles without permission

## Phase 12 — Reading

- [ ] `src/actions/assessments.ts` (record reading assessments; configurable levels via settings)
- [ ] `/performance/reading` page + profile Reading tab
- [ ] Analytics: proficiency distribution, trend, grade-level comparison, students needing support (documented rule)
- [ ] Tests: recording + distribution queries

## Phase 13 — Literacy

- [ ] Documented decision (see `documentation/features/literacy.md`): literacy = broader domain **sharing the `assessments` table** (`domain='literacy'`) — no duplicate schema
- [ ] `/performance/literacy` page + profile tab (reuses assessment components/queries parameterized by domain)
- [ ] Analytics mirroring reading
- [ ] Tests

## Phase 14 — Numeracy

- [ ] `assessments` domain `'numeracy'` (TODO §23: "humiracy" interpreted as numeracy — documented in glossary; investigate with school before final labels)
- [ ] `/performance/numeracy` page + profile tab
- [ ] Skill-area analytics (skill_area field on assessments)
- [ ] Tests

## Phase 15 — Interventions

- [ ] Rework `src/actions/interventions.ts` to student-scoped model (statuses: planned/active/completed/discontinued; outcome + follow-ups)
- [ ] `/development/interventions` page (was `/monitoring/interventions`)
- [ ] Intervention analytics (active/completed/outcomes/students needing follow-up)
- [ ] Tests: lifecycle transitions, permissions

## Phase 16 — Analytics

- [ ] Create `src/lib/analytics-queries.ts` (server-side aggregation; indexed; no N+1) for: enrollment, academic, attendance, behavior, reading/literacy/numeracy, interventions, "needs monitoring" indicators
- [ ] Document every metric per TODO §55 template (source, calculation, filters, permissions, chart type, empty/error/loading, privacy) in `documentation/features/analytics.md`
- [ ] "Requires Attention" indicator engine: configurable thresholds stored in `system_settings`; neutral labels; rules documented — never a diagnosis
- [ ] Dashboard rewrite `src/app/(app)/dashboard/page.tsx` + `src/lib/dashboard-data.ts`: school KPIs + charts (enrollment by grade, performance by subject, attendance trend, reading/literacy/numeracy distributions, intervention status)
- [ ] Reuse `src/components/dashboard/primitives.tsx` & `distribution-bar.tsx` (design preservation)
- [ ] Loading/empty/error states; `trackEvent` unaffected

## Phase 17 — Reports

- [ ] Rewrite `src/lib/constants.ts` REPORT_TYPES (student master list, enrollment, grade, subject performance, attendance, behavior, reading, literacy, numeracy, intervention, profile, needs-monitoring, grade-level/section performance, school-year comparison)
- [ ] Rewrite `src/lib/reports/report-data.ts` builders (school-scope, school-year filter); update `MUNI_HEADER` → school header
- [ ] Update `/reports` page cards + `/api/reports/[type]` (auth, audit, metadata unchanged in mechanism)
- [ ] Every report: authorization + filters + school-year selection + empty state + error handling + privacy review
- [ ] Tests: builder output shape, empty datasets, permission gating

## Phase 18 — QR Verification

- [ ] Update `src/lib/qr.ts` & `src/actions/qr.ts` to student scoping; payload stays an opaque token
- [ ] Decide & document public `/verify` retention (recommended: keep token → server validation → limited info; remove municipal wording)
- [ ] Update `/qr` page and profile QR section
- [ ] Security review + documentation `documentation/features/qr-verification.md`

## Phase 19 — UI / Page Migration

- [ ] Execute the route table in `documentation/ui/page-migration.md` (rename/rebuild pages per Phase 7–15)
- [ ] Rewrite copy in `src/components/welcome/*` and `src/app/(app)/**/page.tsx` (old→new terminology map in `documentation/project/glossary.md`)
- [ ] Replace `MUNICIPALITY` references in `src/components/app-shell.tsx` (title block, footer, search placeholder)
- [ ] Update `src/app/layout.tsx` metadata (title/description) to the official title
- [ ] Verify every page: loading, empty, error states; responsive behavior (tables → mobile strategy per `documentation/ui/ux-guidelines.md`)
- [ ] Accessibility pass: labels, table semantics, chart descriptions, focus order
- [ ] Design-preservation review against `src/app/globals.css` tokens (no new gradients/glassmorphism/random icons)

## Phase 20 — Security

- [ ] Authorization coverage audit: every page/action/route re-checks role & scope server-side
- [ ] Sensitive-data audit: guardian, behavior, assessment notes, disability-adjacent notes — access-controlled; API responses minimized
- [ ] Audit-log coverage per TODO §46 (login/logout, student CRUD, enrollment, grades, attendance, behavior, assessments, interventions, reports, users, roles, settings)
- [ ] Verify Zod validation on every mutation; parameterized queries only (Drizzle)
- [ ] Review `next.config.ts` headers; keep CSP; confirm no secrets client-side
- [ ] Update `documentation/security/*`

## Phase 21 — Performance

- [ ] Indexes per `documentation/database/indexing.md`; `EXPLAIN QUERY PLAN` spot checks
- [ ] Pagination everywhere (registry, queues, logs) — extend existing `ALLOWED_PAGE_SIZES` pattern
- [ ] Server-side aggregation for analytics (no JS-side dataset joins)
- [ ] Parallel `Promise.all` data loading (existing pattern) preserved
- [ ] Verify dashboard/report render times acceptable with seeded demo volume

## Phase 22 — Testing

- [ ] Update existing suites (`src/lib/__tests__/`) for renamed domain (scope, workflow, schemas, queries-filters, utils)
- [ ] New suites: students/enrollment/grades/attendance/behavior/assessments/interventions logic; analytics calculations; report builders
- [ ] Authorization tests per role (matrix-driven)
- [ ] `npm run lint` + `npm test` + `npm run build` green
- [ ] Manual QA checklist in `documentation/testing/acceptance-tests.md`

## Phase 23 — Documentation

- [ ] Finalize `documentation/` tree (project, migration, database, features, security, ui, testing)
- [ ] Rewrite `README.md`; keep `documentation/database/*` in sync with final schema
- [ ] ERD final (Mermaid) + data dictionary complete
- [ ] Update `IMPLEMENTATION_PROGRESS.md` as phases complete

## Phase 24 — Final Audit

- [ ] Checklist in TODO.md §62 verified item-by-item (scope, database, UI, analytics, security, testing, documentation)
- [ ] Old-term grep (child/barangay/municipal/LGU/OSY/ECCD) returns only intentional hits (tests/archived docs)
- [ ] Design-preservation review: same visual identity confirmed
- [ ] No hardcoded production statistics anywhere
- [ ] `.env` untouched; only names documented in `.env.example`/README
- [ ] Rollback plan validated (archived tables restorable)

---

## Execution Notes for the Implementing Agent

1. **Migrations:** append-only; generate → review SQL → apply. Never edit applied migrations.
2. **Rename discipline:** `children`→`students` is a *migration with data copy*, not a blind rename (TODO §64).
3. **Design:** reuse `ui/*` primitives; match `text-[13px]`, `rounded-md`, `border-brand-200`, `bg-white shadow-xs` card patterns.
4. **Authorization:** copy the two-layer pattern (proxy gate + `requirePermission` + scope in queries).
5. **Every metric from the DB.** No fake production numbers; seed data fictional & labeled.
6. **Do not mark checkboxes** for work not actually completed in the repo.
