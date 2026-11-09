# RBAC Revision — 2026-11 (Guidance, Nurse, Sections, Employees, Official Print)

> **Implementation record**, not a plan. Everything below is implemented,
> type-checked (`tsc --noEmit`), linted, built (`next build`) and covered by
> the unit-test suite (206 tests passing, including `rbac-roles.test.ts`).
> It amends `security/role-permission-matrix.md` where the two disagree.

---

## 1. What changed (one line each)

| Area | Change |
|---|---|
| Guidance role | Confined to the Guidance Office domain — holds `students.view` + `behavior.view/write` only; grades, attendance, assessments, interventions, reports, performance and the Student Development module are all withdrawn |
| Nurse role | Health domain only; `reports.view` / `reports.generate` / `reports.export` / `documents.print` withdrawn |
| Student Development | `/development` is policy-gated via `canViewStudentDevelopment()` (server) and filtered in the sidebar; guidance-redirected to `/guidance` |
| Sections | New admin **Section Management** module (`/sections`) — create / edit / activate / deactivate with entity-backed dropdowns |
| Employees | Employee registry gets a **controlled Position vocabulary** and a conditional **Assigned Section** select for Advisers (FK to `sections`, never free text) |
| Official print | Student card, Report card (SF9-style) and Form 137 (SF10-style) print views + PDF APIs refuse to render for students whose `recordStatus` is not fully verified |

---

## 2. Final permission sets

```ts
// src/lib/permissions.ts — guidance
guidance: [
  "dashboard.view",
  "students.view",
  "guardians.view",
  "enrollment.view",
  "behavior.view",
  "behavior.write",
]

// src/lib/permissions.ts — nurse
nurse: [
  "dashboard.view",
  "students.view",
  "guardians.view",
  "enrollment.view",
  "health.view",
  "health.write",
]
```

Deliberate omissions (2026-11, least privilege):

- **guidance** does **not** hold `grades.*`, `attendance.*`, `assessments.*`,
  `interventions.*`, `reports.*`, `documents.print` — its workspace is the
  Guidance Office.
- **nurse** does **not** hold `reports.*` or `documents.print` — Reports is
  outside the health domain.
- Confidential incident visibility
  (`canViewConfidentialBehavior`) is unchanged: admin, school_admin,
  guidance only.
- `canViewStudentDevelopment(user)` (src/lib/scope.ts) returns `true` only for
  admin, school_admin, teacher (adviser) and literacy_coordinator — **false**
  for guidance, nurse, registrar, subject_teacher, records, admin_officer.

### Navigation matrix (sidebar, src/components/app-shell.tsx)

| Item | Admin | School Admin | Guidance | Nurse |
|---|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Students | ✓ | ✓ | view | view |
| Sections | ✓ | ✓ | ✗ | ✗ |
| Teacher Assignments | ✓ | ✓ | ✗ | ✗ |
| Grade Encoding | ✓ | ✓ (read-only) | ✗ | ✗ |
| Employees | ✓ | ✗ | ✗ | ✗ |
| Service Credits | ✓ | ✗ | ✗ | ✗ |
| Performance | ✓ | ✓ | ✗ | ✗ |
| Student Development | ✓ | ✓ | ✗ (server-redirect) | ✗ |
| Guidance Office | ✓ | ✗ | ✓ | ✗ |
| Health & Nutrition | ✓ | ✗ | ✗ | ✓ |
| Reports | ✓ | ✓ | ✗ | ✗ |
| Everything else (users, settings, logs…) | admin-only | ✗ | ✗ | ✗ |

Route + action enforcement mirrors this: `/segments` guarded by
`academics.config` (sections page, employees page, actions), `/reports` by
`reports.view` (nurse/guidance redirect), `/development` by
`canViewStudentDevelopment` (guidance redirect). The middleware
(`src/proxy.ts`) matcher covers `students, employees, sections, grades,
guidance, health, reports, development, performance, service-credits, …` so
unauthenticated visitors never reach a dashboard page.

> **Updated by revision C (2026-11-09):** Grade Encoding is now gated by the
> new `grades.encode` permission. School Admin may OPEN the module (to
> supervise the academic workflow) but never writes a grade — `grades.write`
> stays exclusive to the Subject Teacher role. The Registrar holds neither and
> is redirected away from `/grades` server-side. See
> `features/teacher-assignment-model-2026-11.md`.

---

## 3. Database changes

**One column added** (all else reuses existing entities — no new tables):

```sql
ALTER TABLE employees ADD COLUMN assigned_section_id TEXT REFERENCES sections(id) ON DELETE SET NULL;
CREATE INDEX employees_assigned_section_idx ON employees(assigned_section_id);
```

- Drizzle: `employees.assignedSectionId` in `src/db/schema.ts`, with the
  `employees → sections` drizzle relation (`assignedSection`).
- `employees.position` semantics changed: the column now holds a key from the
  controlled vocabulary
  (`EMPLOYEE_POSITIONS` in `src/lib/constants.ts`):
  `school_administrator | adviser | subject_teacher | adviser_subject_teacher |
  teacher | guidance_counselor | nurse | registrar | administrative_staff |
  other`. `adviser_subject_teacher` is the combined position: one personnel
  record carries both the Section assignment and the Login account / Grade
  Encoding Scope fields.
  Legacy pre-vocabulary strings remain readable — the form surfaces them via
  the `other` option until re-classified. Position (job title) stays separate
  from the system role (`users.roleId`).
- Seed (`scripts/seed.mts`) now writes vocabulary keys and assigns real
  seeded sections to the two demo advisers.

Enforcement on writes (`src/actions/employees.ts`):

- `assignedSectionId` is accepted **only** when position = `adviser`; every
  other position has it nulled.
- The id must exist in `sections` (and be active) — server re-validated even
  though the client dropdown is entity-fed.
- Duplicate active adviser assignment is blocked: one employee per section
  (sections.adviser_id and employees.assigned_section_id are kept in sync by
  the same action transaction).

---

## 4. Sections management (`/sections`, admin + school_admin)

- `src/actions/sections.ts` — `createSection`, `updateSection`,
  `setSectionActive` (+ FormData wrapper). Permission `academics.config`,
  Zod-validated, audit-logged (`CREATE/UPDATE/ACTIVATE/DEACTIVATE_SECTION`),
  `revalidatePath("/sections")` + dashboard.
- Every relationship field (school year, grade level, adviser) is a
  `<Select>` fed by `school_years`, `grade_levels`, active `users` — the
  server re-checks each id, so free text can never create an orphan.
- Duplicate guard relies on the existing
  `sections_sy_grade_name_uq` unique index; surfaced as a friendly message.
- Page: filters (search, grade level, status, school year), active/inactive
  badge, enrollment counts via one grouped query (no N+1), empty state,
  table skeleton (`loading.tsx`), pending-aware toggle via `SubmitButton`.

## 5. Employee management

- Form (`src/components/employees/employee-form.tsx`): Position is a
  controlled `<Select>` over `EMPLOYEE_POSITIONS`; choosing `other` reveals a
  required "specify" field; choosing `adviser` reveals "Assigned section"
  fed by `activeSectionOptions()` (`<grade level> — <name> (<SY>)`).
- Server validation in `src/actions/employees.ts` mirrors the client rules and
  is authoritative.
- Position `adviser_subject_teacher` ("Adviser + Subject Teacher") shows both
  the **Assigned section** field and the **Login account / Grade Encoding
  Scope** fields on one personnel record. The linked account may hold Subject
  Teacher as its primary or as an additional role.

## 5a. Teacher Assignments + dual role (2026-11-07)

- New Administrator page **`/assignments`** (`academics.config`): assign an
  adviser to a section, assign a subject teacher to a (section, subject) load,
  or both to the same account, with a per-school-year filter and a unified
  assignment table with explicit remove actions.
- Actions (`src/actions/assignments.ts`): `assignAdviser`, `clearAdviser`,
  `assignSubjectTeacher`, `removeSubjectTeacher`. Every call re-checks the
  permission, section/subject/account active state, and a teaching role on the
  account; an existing adviser or load is never silently overwritten.
- Assigning an adviser grants `role-teacher`; assigning a load grants
  `role-subject-teacher` (`ensureUserRole`) — the assignment, permission gate
  and `user_roles` union stay consistent.
- Adviser and Subject Teacher are **not mutually exclusive**: one account, one
  personnel record, two independent assignments. Grade encoding remains
  assignment-based (`canWriteGradesInSection`) and applies to every role the
  account holds via `hasUserPermission`.
- The adviser assignment keeps `sections.adviser_id` and the linked employee's
  `assigned_section_id` in step in the same action. Invariants are pure and
  unit-tested in `src/lib/assignment-rules.ts` +
  `src/lib/__tests__/assignments.test.ts`.

## 5b. Revision C — assignment-based grade encoding, multi-role accounts, Registrar lockout (2026-11-09)

Recorded in full in **`features/teacher-assignment-model-2026-11.md`**. Summary:

- **New permission `grades.encode`** — the module gate for `/grades`. Granted to
  admin, school_admin, records and subject_teacher. The **Registrar holds
  neither `grades.encode` nor `grades.write`**: the sidebar entry is gone and a
  manually typed `/grades` URL is redirected server-side.
- **Grade writing is authorisation-based, not role-based** —
  `getGradeWriter()` checks `grades.write` (Subject Teacher role only), and
  every action additionally requires a matching `section_subject_teachers` row
  for the exact (section, subject) pair. An adviser is not sufficient; the role
  without a load is not sufficient.
- **Multi-role accounts** — `users.role_id` stays the primary role; the new
  `user_roles` table (migration `0012_user_roles_multi_role.sql`) carries the
  additional roles. The effective permission set is the union over the roles
  (`hasUserPermission`), so one teacher can be Adviser **and** Subject Teacher
  on a single account, with a single personnel record.
- **Every page guard was made union-aware** — all 59
  `hasPermission(user.role, …)` call sites now use
  `hasUserPermission(user.roles, …)`, and `src/proxy.ts` loads the additional
  roles before its optimistic check, so the UI and the backend always agree.
- **Grade periods are now TERM 1 / TERM 2 / TERM 3** — see
  `features/grading-periods-terms-2026-11.md`.
- **The demo data is gone and cannot come back** — see
  `../demo-data-removal-2026-11-08.md`.
- **The Literacy Coordinator can finally add and edit assessments** — see
  `features/literacy-coordinator-assessments-2026-11.md`.

## 6. Official print gating (draft-safety)
- `src/lib/workflow.ts` → `OFFICIAL_PRINT_RECORD_STATUSES` — only fully
  verified records may be printed as official documents.
- Three print server components and both PDF API routes
  (`/api/report-card/[id]`, `/api/form137/[id]`) check
  `canPrintOfficial(student)` + route permission **before** touching data and
  render/return a friendly "not yet verified" state
  (`src/components/students/print-blocked.tsx`) instead of partial official
  output. Drafts/pending records remain fully visible on screen; they lose
  only official **print** eligibility until verification approves them.
- Data shapes (`ReportCardData`, `Form137Data`) now carry `recordStatus` so
  templates and tests can assert the gate.

---

## 7. Tests

- `src/lib/__tests__/rbac-roles.test.ts` — updated matrix:
  guidance confined (no academic/report/development permissions, no
  Student Development scope guard), nurse no Reports, school admin drafts,
  academics.config isolation.
- `src/lib/__tests__/employees.test.ts`, `report-card-pdf.test.ts`,
  `form137-pdf.test.ts` — fixtures/types updated for `recordStatus`.
- Suite result: **19 files / 206 tests passing.**

## Verification run (2026-11-03)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ exit 0 |
| `npx vitest run` | ✅ 206 passed |
| `npm run lint` | ✅ 0 errors (14 pre-existing warnings in scratch scripts) |
| `npm run build` | ✅ exit 0 (all routes compiled) |

## Known limitations / next steps

- `scripts/tmp/*` and `.tmp-qa/` scratch probes carry pre-existing
  unused-import warnings (non-blocking). Candidate for deletion before
  production.
- Adviser "one section" rule is enforced in both the employee action and the
  assignments action; `/assignments` keeps `sections.adviser_id` and the linked
  employee's `assigned_section_id` in sync, so use that page as the single
  place to change advisers.
- Position vocabulary is code-managed (`constants.ts`). If the school wants
  self-service positions, move it to a table — the FK pattern already exists.
