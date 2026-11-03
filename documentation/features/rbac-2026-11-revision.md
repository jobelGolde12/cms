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
| Grade Encoding | ✓ | ✗ | ✗ | ✗ |
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
  `school_administrator | adviser | subject_teacher | teacher |
  guidance_counselor | nurse | registrar | administrative_staff | other`.
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
- Adviser "one section" rule is enforced in the employee action; the reverse
  direction (sections.adviser_id) is a normal reference — keep assigning the
  same adviser from one place to avoid confusion.
- Position vocabulary is code-managed (`constants.ts`). If the school wants
  self-service positions, move it to a table — the FK pattern already exists.
