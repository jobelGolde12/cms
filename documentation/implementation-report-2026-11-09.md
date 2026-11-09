# Implementation Report — 2026-11-09

**Records Management System with Profile and Performance Analytics**
Sta. Magdalena National High School

Covers the six-part change request completed on 8–9 November 2026: dummy data
removal, Registrar lockout from Grade Encoding, TERM 1–3 grading periods,
Literacy Coordinator assessment entry, the Adviser + Subject Teacher
combination, and assignment-based grade encoding with an administrator UI.

---

## 1. Summary

| # | Requirement | Status | Where |
|---|---|---|---|
| 1 | Remove the dummy data from Turso and make it impossible to recreate | ✅ Done | `documentation/demo-data-removal-2026-11-08.md` |
| 2 | Lock the Registrar out of Grade Encoding (nav **and** server) | ✅ Done | `documentation/features/teacher-assignment-model-2026-11.md` |
| 3 | Switch Quarter 1–4 → TERM 1–3 | ✅ Done | `documentation/features/grading-periods-terms-2026-11.md` |
| 4 | Let the Literacy Coordinator add/edit Phil-IRI, Literacy and Numeracy | ✅ Done | `documentation/features/literacy-coordinator-assessments-2026-11.md` |
| 5 | One teacher = one account holding both Adviser and Subject Teacher | ✅ Done | `documentation/features/teacher-assignment-model-2026-11.md` |
| 6 | Grade encoding authorised by assignment, not by role | ✅ Done | `documentation/features/teacher-assignment-model-2026-11.md` |

**Verification:** `npm run lint` ✅ · `npx tsc --noEmit` ✅ · `npm test`
26 files / 322 tests ✅ · `npm run build` ✅ (all routes compiled) ·
Turso `cms` audit ✅ (`foreign_key_check` empty, `integrity_check` = ok).

---

## 2. What was delivered

### 2.1 Dummy data removed — and it cannot come back

**Database (Turso `cms`).** After a verified `turso db export`, 25 seed
students, 3 QA students, 31 orphaned guardians, 12 seeded sections, 3 QA
sections, 10 seeded employees, 1 QA employee and 6 QA accounts were deleted,
together with every dependent row and six legacy `*_backup_*` tables. The
real administrator (`user-admin` / Mariel Anonuevo), the nine other
`@deped.gov.ph` accounts, the real employee `EMP-2026-000011`, the real
section `sec-12-hestia`, the audit trail and all reference data were kept.

**Seed scripts rewritten.** `scripts/seed.mts` and
`scripts/seed-remote-reference.mts` are now thin wrappers around a shared
implementation (`scripts/lib/reference-seed.ts`) that creates **reference data
only**:

* roles, permissions and the role↔permission matrix (synced from the code),
* the school year, grade levels, the subject catalog,
* the three grading periods,
* behaviour categories and the system-settings keys,
* accounts from the `DEFAULT_*` environment variables — **create-only**.

The old scripts generated ~48 fictional students with guardians, enrolments,
grades, attendance, assessments, health, behaviour and intervention records, a
fictional plantilla of ten employees, twelve demo sections and the demo
teaching assignments — and wiped the previous run first. **None of that
generation remains.**

**New safety properties.**

| Property | Implementation |
|---|---|
| The seed never deletes | no `DELETE` of domain rows anywhere in the seed |
| The seed never overwrites an account | existing e-mail → skipped; a taken account id → skipped with a warning (this is what protects `user-admin`) |
| No credential is invented | an account needs BOTH `DEFAULT_<ROLE>_EMAIL` and `DEFAULT_<ROLE>_PASSWORD_HASH` |
| School-adjusted settings survive | `system_settings` is insert-only, so `assessment_levels` is never overwritten |
| Retired identifiers are refused | `src/lib/retired-demo.ts` → `assertNotRetiredDemoIdentifier()` |
| QA scripts need an opt-in | `scripts/lib/remote-guard.mts` → `ALLOW_QA_FIXTURES=1` / `ALLOW_QA_USER=1` before writing to a remote database |

### 2.2 The Registrar is locked out of Grade Encoding

A new permission `grades.encode` is the **module gate**:

| Layer | Permission | Registrar |
|---|---|---|
| Open `/grades` | `grades.encode` | ✗ |
| Write a grade | `grades.write` | ✗ |
| Read a student's grades | `grades.view` | ✓ (unchanged) |

* The sidebar entry is hidden (`src/components/app-shell.tsx`).
* A manually typed `/grades` URL is **redirected server-side**
  (`src/app/(app)/grades/page.tsx`).
* The grade actions re-check `grades.write` and the teaching assignment.
* The stored permission matrix was re-synced: `grades.encode` exists for
  admin, school_admin, records and subject_teacher — **never** for registrar.

The Registrar keeps `grades.view` and `documents.print` (Student Card, Form
137) — it is a legitimate reader of academic records.

### 2.3 Three grading periods

`TERM 1`, `TERM 2`, `TERM 3` — no `TERM 4`, no quarters anywhere.

* Migration `drizzle/0013_grading_periods_terms.sql` renames in place with a
  unique-index guard, deletes the fourth period **only** when nothing
  references it, and purges the derived forecast rows that carried the old
  `·Q<n>` label.
* `src/lib/constants.ts` → `GRADING_PERIOD_NAMES = ["TERM 1","TERM 2","TERM 3"]`.
* Forecasting is term-based end to end (`time-series.ts`, `arima.ts`,
  `service.ts`, `storage.ts`): three completed periods minimum, a horizon of
  three, cache key `"{schoolYear}·TERM {n}"`.
* Form 137 renders three term columns (`form137.ts`, `form137-pdf.tsx`, the
  print page) with the six-column layout `["30%","10%","10%","10%","10%","30%"]`.

### 2.4 The Literacy Coordinator can add and edit assessments

The root cause was **not** a permission problem — `saveAssessment` existed and
was guarded, but **no screen called it**. The panel was read-only.

Now: a **configurable, domain-aware** level list (from
`system_settings.assessment_levels`), an **Add assessment** button, a
per-record **Edit** button, a reset guard that prevents data loss, and a
**corrected ownership check** on the edit path (a crafted request can no
longer rewrite another student's assessment). Invalid submissions return a
readable message instead of failing silently.

### 2.5 One teacher, two roles, one account

* New table `user_roles` (migration `0012_user_roles_multi_role.sql`).
  `users.role_id` stays the primary role; `user_roles` carries the additional
  roles.
* `SessionUser.roles` exposes every role; `hasUserPermission(user.roles, …)`
  resolves the **union**.
* `src/lib/scope.ts` was rewritten: `studentScope()`, `userSectionScope()` and
  `canAccessStudent()` union the advisory sections with the subject-teacher
  sections.
* The User Management form grants the extra roles; the Teacher Assignments
  screen grants them automatically (`ensureUserRole`). No second employee
  record is ever created.

### 2.6 Grade encoding is assignment-based

```
grades.encode (may open the module)
      +
grades.write  (may write a value)
      +
section_subject_teachers row for the exact (section, subject)
```

`getGradeWriter()` checks the permission; `canWriteGradesInSection()` checks
the row. Being the adviser is not enough, and holding the role without a load
is not enough either. `groupAssignmentsBySection()` groups **only** the
teaching loads — an advisory section no longer grants "all subjects".

### 2.7 The administrator assignment UI

`/assignments` (`academics.config`):

* **Filters** — school year **and grade level** (plain GET parameters, so the
  view is shareable and works without JavaScript).
* **Two forms** with explicit *Assignment type* badges — *Assign an adviser*
  (grade level → section → teacher) and *Assign a subject teacher*
  (grade level → section → subject → teacher).
* **One table** listing both kinds of assignment, with a per-row **Remove**
  control.
* **No silent overwrite** — an existing adviser or an existing (section,
  subject) load is never replaced silently; the administrator must remove
  first. The rule lives in pure, unit-tested helpers
  (`src/lib/assignment-rules.ts`).
* The server re-checks the permission, the active state of every entity, the
  teaching role and every invariant, and writes an audit entry.

---

## 3. Files changed

### 3.1 New

| File | Purpose |
|---|---|
| `src/lib/retired-demo.ts` | the deny-list of retired demo identifiers + the insert guard |
| `src/lib/__tests__/retired-demo.test.ts` | 7 tests for the guard |
| `scripts/lib/reference-seed.ts` | the shared reference-data seed |
| `scripts/lib/remote-guard.ts` | the remote opt-in guard for the QA scripts |
| `documentation/demo-data-removal-2026-11-08.md` | the removal record + rollback |
| `documentation/features/teacher-assignment-model-2026-11.md` | revision C |
| `documentation/features/grading-periods-terms-2026-11.md` | the term migration |
| `documentation/features/literacy-coordinator-assessments-2026-11.md` | the assessment UI |
| `documentation/implementation-report-2026-11-09.md` | this report |

### 3.2 Modified (this session)

| Area | Files |
|---|---|
| Seed scripts | `scripts/seed.mts`, `scripts/seed-remote-reference.mts`, `scripts/qa-feature-fixtures.mts`, `scripts/rbac-qa-setup.mts`, `scripts/qa-user.mts` |
| Union-aware guards | 36 files across `src/app/(app)/*`, `src/app/api/*`, `src/actions/ai.ts`, `src/components/*` — **59** call sites |
| Middleware | `src/proxy.ts` — loads the additional roles before the optimistic check |
| Assignments UI | `src/app/(app)/assignments/page.tsx`, `src/components/assignments/assignment-manager.tsx` |
| Welcome hero | `src/components/welcome/WelcomeHero.tsx` — restored the missing `heroImage` import (the file was left mid-edit and did not compile) |
| Documentation | `documentation/README.md`, `documentation/security/role-permission-matrix.md`, `documentation/features/rbac-2026-11-revision.md` |

### 3.3 Migrations applied

| Migration | Content |
|---|---|
| `drizzle/0012_user_roles_multi_role.sql` | the `user_roles` table + indexes |
| `drizzle/0013_grading_periods_terms.sql` | the guarded Quarter → TERM rename, the retired fourth period, the forecast cache purge |

Both are applied to Turso (`__drizzle_migrations` = 14 rows).

---

## 4. Verification evidence

### 4.1 Tooling

| Command | Result |
|---|---|
| `npm run lint` | ✅ 0 errors, 0 warnings |
| `npx tsc --noEmit` | ✅ exit 0 |
| `npm test` | ✅ **26 files / 322 tests** passing |
| `npm run build` | ✅ exit 0 — 48 routes compiled, 34 static pages generated |

### 4.2 Turso `cms` — final audit (2026-11-09)

| Check | Result |
|---|---|
| `PRAGMA foreign_key_check` | no rows |
| `PRAGMA integrity_check` | `ok` |
| `students` / `student_enrollments` / `student_grades` / `assessments` / `attendance_records` / `behavior_records` / `health_records` / `clinical_records` / `interventions` / `guardians` / `student_guardians` | 0 / 0 / 0 / 0 / 0 / 0 / 0 / 0 / 0 / 0 / 0 |
| `employees` | 1 — `EMP-2026-000011` (Alu Gotis, archived) — real |
| `employee_201_records` / `service_credit_transactions` | 0 / 0 |
| `sections` | 1 — `sec-12-hestia` (inactive) — real |
| `section_subject_teachers` | 0 — no teaching load assigned yet |
| `users` / `user_roles` | 10 / 10 — every account has its role row |
| `sessions` / `notifications` | 5 / 9 — real users only |
| `audit_logs` | 510 — retained |
| `roles` / `permissions` / `role_permissions` | 12 / 43 / 157 |
| `grading_periods` | 3 — TERM 1 (current), TERM 2, TERM 3 |
| `subjects` / `grade_levels` / `school_years` | 8 / 5 / 1 |
| `system_settings` | 7 (including `assessment_levels`) |
| Grading periods containing "Quarter" | 0 |
| Forecast rows with the old `·Q` label | 0 |
| `*_backup_*` tables | 0 |
| `grades.encode` holders | admin, school_admin, records, subject_teacher — **not** registrar, **not** adviser |
| `grades.write` holders | subject_teacher only |
| Retired demo identifiers present | 0 (the only `admin@gmail.com` row is the live `user-admin` account) |

### 4.3 Backup

```
database-backups/cleanup-2026-11-08/cms-pre-cleanup-2026-11-08.sql   (1.73 MB)
```

Taken **before** the first destructive statement and read back to confirm it
contained the data (28 students / 16 users at that point). The directory is
git-ignored.

---

## 5. Notes, assumptions and limitations

1. **The school has no students yet.** The database is empty of student data
   by design — the demo rows were the only students. Sections, students,
   employees and teaching assignments are now created through the application.
2. **`section_subject_teachers` is empty**, so nobody can encode a grade until
   an administrator assigns the teaching loads on `/assignments`. This is the
   intended behaviour of the assignment-based model.
3. **`admin@gmail.com` is on the retired-demo deny-list** because it was the
   seeded demo administrator — and it is also the address of the live
   `user-admin` account. The deny-list only stops a *seed* from provisioning
   that address; it never touches an existing account, and the seed is
   create-only.
4. **The `.env` `DEFAULT_ADMIN_*` variables point at a different address**
   (`admin@stamagdalena.gov.ph`) whose account id `user-admin` is already
   taken by the live administrator. The seed therefore **skips** it with a
   warning rather than overwriting the real account. Provisioning that
   account (if it is wanted) must be done from **User Management**, which
   creates a fresh UUID.
5. **The `permissions` table still holds 13 legacy rows** (`children.*`,
   `monitoring.*`, `validation.*`, `users.create/disable/update`,
   `interventions.create/update`) that no longer exist in the code map. They
   are inert — nothing reads the table at runtime, the code map is the source
   of truth — and they were left untouched rather than deleted, because
   deleting a referenced row would cascade into `role_permissions`.
6. **`role-barangay` and `role-lgu`** remain in the `roles` table. No account
   holds them and no code references them; they were left in place rather than
   dropped.
7. **Legacy `*_backup_*` tables were dropped** rather than archived — their
   contents were demo data and the pre-cleanup export preserves the full
   state.
8. **The forecast cache was purged** for the old `·Q<n>` labels. The surviving
   forecast row is a cached failure marker; the next forecast run rebuilds it
   with the `·TERM <n>` label.

---

## 6. How to verify by hand

1. `npm run seed:reference` → prints the reference summary; the row counts of
   `students`, `sections` and `users` do not change.
2. Sign in as the Registrar → the sidebar has **no** "Grade Encoding" entry;
   `/grades` redirects to the dashboard.
3. Sign in as an Adviser who is also assigned a subject → the sidebar shows
   **Grade Encoding**, and the subject dropdown lists only that section's
   assigned subjects.
4. Sign in as the Literacy Coordinator → open a student → **Student
   Development** → add a Phil-IRI assessment, then edit it.
5. As the School Administrator → **Teacher Assignments** → pick a grade level
   → assign an adviser and a subject-teacher load to the same account → the
   account's role badge reads "Adviser + Subject Teacher".
6. Assigning a load that already exists is refused with a message asking for a
   removal first — nothing is overwritten silently.
