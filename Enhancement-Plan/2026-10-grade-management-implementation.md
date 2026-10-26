# Grade Management & Section-Based Reporting — Implementation Record

**Date:** 2026-10-25 · Companion to `2026-10-grade-management-enhancement-plan.md`

---

## 1. What was changed

### Database (`drizzle/0006_wooden_william_stryker.sql`, applied to Turso)
- New table **`grade_submissions`** — immutable submission ledger per
  (school year, section, subject, grading period) with submitter, timestamps,
  reopen fields, entry/roster counts and a JSON warnings snapshot.
  Indexes: context `(section, subject, period)`, school year, submit time, submitter.
- **`student_grades`** gains a lifecycle: `status` (`'draft'` | `'submitted'`,
  default `'draft'`), `submitted_at`, `submission_id`. The migration is purely
  additive — all 384 existing grade rows are preserved and default to drafts.
- Verified live after `npx drizzle-kit migrate` against the Turso database.

### Server layer
- **`src/lib/grades.ts`** — teacher grade-scope resolution (adviser sections
  only), grade-sheet fetching (enrollment-anchored roster join, so moving
  students keep their academic context), submission status lookup, and
  submit/reopen database transactions with status flips.
- **`src/lib/grade-validation.ts`** — pure, dependency-free validator: missing
  grades, out-of-scale values (60–100), NaN, duplicates, and entries for
  students not on the section roster. Shared by server actions AND client UI.
- **`src/actions/grades.ts`** — server actions `saveGradeDraft`,
  `submitGradeSheet`, `reopenGradeSheet` (all `"use server"`):
  - authentication + `grades.view` + `grades.write` + **role === "teacher"**
    double-check (permissions alone are not trusted — the teacher-only rule is
    enforced twice, so an accidental permission grant can never open encoding);
  - adviser-of-section enforcement (row-level, per action);
  - payload validated with Zod; grade values re-validated server-side (60–100);
  - roster-integrity gate (every payload student must be actively enrolled in
    that section — wrong student/section combinations are rejected);
  - SAME enrollment/academic-context invariant: the sheet's rows are keyed by
    the section's own enrollment ids, so wrong school year / subject / period
    references cannot be smuggled in;
  - submission requires zero validation issues (missing/invalid/duplicates);
  - submitted sheets lock; reopening flips rows back to `draft` and appends a
    ledger row; every action logs an audit entry (`GRADE_DRAFT_SAVE`,
    `GRADE_SHEET_SUBMIT`, `GRADE_SHEET_REOPEN`) with counts only — no student data.
- All writes run in a `db.transaction` (no partial saves).

### UI — Grade Encoding (`/grades`)
- Server component page gated by `grades.view`; teachers see only their
  advisory sections, read-only roles see every active section sheet.
- **`grade-sheet-filters.tsx`** — cascading School Year → Grade Level → Section →
  Subject → Grading Period selector; URL-param driven (`?sy&level&section&subject&period`)
  so every change is a fresh server render with correct DB state (survives
  refresh, logout/login, and bookmarking).
- Persistent **sheet-context stamp** (SY, grade level, section, subject, period
  chips + submission state and submitter) so the user never wonders which
  context they are editing.
- **`grade-sheet.tsx`** — spreadsheet-style data-entry grid: student name,
  numeric grades in one per-student row, instant client-side validation
  (60–100 range) with per-row error highlighting, missing-grade indicators,
  dirty-rows banner with unsaved-changes warning on reload/navigation, Save
  Draft (persists and survives refresh), Submit (blocked with an actionable
  issue list until complete and valid), Reopen for submitted sheets, Remove
  garbage-collects empty unsubmitted rows. Keyboard-friendly: Enter/Arrow
  moves down the column automatically.
- Empty states: teachers without an advisory section see explicit guidance
  ("ask the administrator to assign you as adviser…"); loading route has a
  dedicated `loading.tsx` skeleton.

### Student profile page
- Grade list now shows **Final / Draft** status badges and `—` for
  not-yet-graded subjects; members with `grades.write` get an "Encode grades"
  link into the new workflow.

### Reports (section-based)
- New reusable server-rendered **filter form** (`report-filters.tsx`):
  School Year → Grade Level → Section → Subject → Grading Period, applied as
  GET params. Filters are pushed into the SQL in `report-data.ts` (sections and
  enrollments are joined by section, so a section-filtered report can never mix
  students from other sections) — not client-side filtering.
- Reports index shows the active filters as chips; every detail page renders a
  prominent context panel answering "which section / SY / level / subject /
  period / students is this?".
- `/api/reports/[type]` export route (PDF/XLSX/CSV) accepts the same params and
  passes them to the same backend builders, so downloads match what is on
  screen and filename-safe context labels.

### Permissions (enforced server-side)
- `grades.write` is now granted to **teacher only** (deliberately withheld
  from admin, school_admin and all other roles) — see the `TEACHER_ONLY_WRITE`
  set in `permissions.ts` with a documented rationale.
- `/grades` is readable by `grades.view` (teachers get read-only views of
  sheets they don't advise; other roles read-only) — encoding/submit/reopen
  are verifiably blocked for non-teachers at the action layer.
- Sidebar gains a Grades link for the teacher role (`nav-icons.tsx` already
  had the `grades` entry).

---

## 2. Grade-management workflow

```
Not started → Draft (save anytime, safe to leave) → Review (issue list)
            → Submitted (locked, ledger recorded)
            → Reopen (if a correction is needed → back to Draft)
```

- Drafts persist in `student_grades` keyed by enrollment × subject × period
  (unique index prevents duplicate grade records).
- Submit refuses incomplete/invalid sheets and lists every problem.
- Reopening keeps full ledger history in `grade_submissions`.
- Enrollment-anchored rows mean grade carry-over across years/sections is
  automatic: a student's old grades stay attached to their own enrollment;
  every new sheet only reads students actively enrolled in that section.

## 3. Tests performed

- **Unit (vitest, 171 → 178 tests, all green):**
  - new `grade-validation.test.ts` (7 cases: missing, empty entries, full
    60–100 scale, out-of-range, NaN, not-on-roster, clean sheet);
  - `rbac-roles.test.ts` extended: **only `teacher` has `grades.write`**, all
    six other roles are asserted negative, and `grades.view` stays read-only;
  - full suite: `16 test files / 178 tests passed`.
- **Type/lint/build:** `tsc --noEmit` clean; `eslint` 0 errors (only the 4
  pre-existing warnings in `scripts/` + `test-pdf.ts`); `next build` succeeds.
- **DB:** migration applied + schema verified directly against Turso
  (`grade_submissions` + 4 indexes, 3 lifecycle columns, 384 legacy rows intact).
- RBAC tests keep proving the registrar (and every non-teacher) cannot write
  grades through any action.

## 4. Bugs discovered and fixed during implementation

1. `grade-sheet.tsx` initially imported DB-dependent helpers — split the pure
   validator into `grade-validation.ts` so nothing pulls Turso into the client bundle.
2. Grade-sheet filters used a stale internal shape (`years`, `sy/level/…`
   typed as resolved selection keys) — retyped against the URL-param contract.
3. Report filter form couldn't accept `undefined` select values — widened the
   type so "All" works.
4. Pre-existing `tsc` failures in `report-card-pdf.tsx` (`alt` prop on the
   react-pdf `Image`, which has no such prop) — fixed + a11y lint note.
5. Migration was first "applied" against the wrong target from a stale fallback
   env — re-ran and **verified on Turso** with a direct schema inspection script.
6. Multiple lint errors (`<a>` inside pages, unused vars) — fixed; zero errors left.

## 5-bis. Follow-up: per-subject teaching loads (2026-10-26)

The advised-only model was extended with **departmental subject assignments**:
- New table `section_subject_teachers` (migration `0007_fancy_roxanne_simpson.sql`,
  applied and verified on Turso): one `(section, subject) → teacher` assignment,
  admin/seed-managed like the adviser flag (no UI yet — flagged below).
- Advisers still encode **every** subject of their section; a departmental
  teacher may encode only the subjects assigned to them in that section.
  `canWriteGradesInSection(user, sectionId, subjectId?)` is the single guard
  used by every grade action and by sheet-context resolution.
- The teacher's section dropdown now lists advisory sections (`· advises`)
  **and** departmental ones (`· assigned`); the subject dropdown restricts
  itself to assigned subjects when such a section is selected (with automatic
  fallback to the first assigned subject when switching sections).
- Drafts are now strictly private: read-only viewers (other sections/roles)
  see submitted grades only.
- Teacher-only `grades.write` and all server-side guards unchanged.
- Tests: 176 passing (3 new for `groupAssignmentsBySection`); tsc/lint/build clean.

## 5. Remaining limitations / recommended next steps

- Admin/intervention dashboard widgets can surface grade averages next.
- Form 137 / report-card PDFs may be extended to render per-period draft vs
  final marks once the school decides whether drafts should ever print (they
  currently don't — only submitted grades are treated as official).
- A scheduled "grade submission deadline" per grading period could hard-lock
  encoding after quarter close (currently teacher-initiated only).
- ~~Fine-grained per-subject teacher assignments are not modeled~~ — **done
  2026-10-26** (`section_subject_teachers`); an admin UI to manage assignments
  (instead of DB/seed management) is still open.

---

*Verified: `npx tsc --noEmit` ✅ · `vitest run` 16 files / 178 tests ✅ ·
`npm run lint` 0 errors ✅ · `npm run build` ✅ · migration verified on Turso ✅*
