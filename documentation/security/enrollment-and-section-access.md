# Enrollment, Adviser Student Creation & Section Authorization

Status: Implemented — 2026-11 revision D.
Code: `src/lib/enrollment-rules.ts`, `src/lib/scope.ts`,
`src/actions/records.ts` (`saveEnrollment`), `src/actions/students.ts`
(`createStudent`), `src/components/students/enrollment-form.tsx`,
`src/components/students/section-picker.tsx`, `src/components/student-form.tsx`.

This note documents how a student is placed in a section, how an Adviser is
limited to their own sections when adding/enrolling students, how a Subject
Teacher is limited to their exact teaching loads, and how the whole chain is
enforced on the server.

## 1. The authoritative relationship

Student placement is **not** a column on `students`. It is the enrollment row:

```
students ──< student_enrollments >── school_years
                       │        └──── grade_levels
                       └───────────── sections (school_year_id, grade_level_id, name UNIQUE, is_active)
```

- Unique index `enrollment_student_sy_uq (student_id, school_year_id)` → one
  enrollment per student per school year.
- A `sections` row belongs to exactly one `(school_year_id, grade_level_id)`
  pair, so an enrollment is coherent only when the section's school year AND
  grade level match the selected values.

Every list/profile/report that shows a student's "current section" reads it from
`student_enrollments` (joined on `status = 'active'`), so there is a single
source of truth.

## 2. Enrollment flow

Sequence in the UI (`/students/[id]` → **Enrollment** panel):

```
Student → School Year → Grade Level → Available Section → Status → Save
```

The section dropdown is **dynamic** (`SectionPickerFields`): the grade-level list
is narrowed to grade levels that have sections in the chosen school year, and the
section list to the sections of the chosen year + grade level. Only the sections
the server handed this account are ever present in the options.

## 3. Server-side validation (`saveEnrollment` / `resolveEnrollmentIntent`)

The browser is never trusted. Both actions run the same ordered checks:

1. **Authenticate + permission** — `enrollment.manage` (or `students.create` for
   the create path).
2. **Row scope** — the caller must already be able to access the student
   (`canAccessStudent`); an Adviser only reaches students in a section they advise.
3. **Referenced records exist** — school year, grade level and section must each
   resolve to a live row.
4. **Placement** — `checkSectionPlacement` rejects a section that is inactive, or
   whose school year / grade level does not match the submitted values.
5. **Section scope** — `canManageEnrollmentInSection`: school-wide records roles
   may use any active section; an Adviser only a section they advise; everyone
   else nothing.
6. **Mutate** — an upsert on `(student_id, school_year_id)` so a duplicate or a
   double-submit updates the existing row instead of racing the unique index.

`enrollmentFormSchema` still validates required fields and the enrollment status
enum. Duplicate submissions are idempotent because of the upsert.

## 4. Adviser: adding a student

- The `teacher` (Adviser) role now holds `students.create`, `students.update`
  and `enrollment.manage` (2026-11 revision D).
- An Adviser is **not** school-wide: `hasSchoolWideStudentScope()` is false for any
  account carrying a teaching role, even when combined with a records role.
- When an Adviser creates a student, `createStudent` requires an enrollment and
  rejects any section that is not one they advise. The student is written together
  with its enrollment in a single transaction, so it appears immediately in the
  advised section and nowhere else.
- Editing and enrolling a student both flow through `canEditStudent` /
  `canManageEnrollmentInSection`, so a hand-crafted request against another
  adviser's section fails on the server.

## 5. Subject Teacher: exact (section, subject) access

Grade encoding remains authorization-based (revision C) and is unchanged here:

- `grades.write` + `grades.encode` come from the Subject Teacher role; an account
  may hold that role **in addition to** the Adviser role on one account
  (`user_roles`).
- The write itself requires a matching `section_subject_teachers` row for the exact
  `(section, subject)` pair — `canWriteGradesInSection`. Being the section adviser
  grants no encoding; holding the role elsewhere grants no encoding.
- A teaching load does **not** grant enrollment/student-creation rights. Only an
  advisory does.

## 6. Effective access model

```
User ── roles (users.role_id + user_roles)
        ├── Adviser            → sections.adviser_id
        │                        └── whole-section: students, enrollment, attendance,
        │                            assessments, behavior; add/edit students in-section
        └── Subject Teacher    → section_subject_teachers (section + subject)
                                 └── grade encoding for that exact (section, subject)

Effective permissions = UNION of every role's permissions (hasUserPermission).
Row access          = still narrowed per role by src/lib/scope.ts.
```

The union never widens the **rows**: an Adviser who is also a Subject Teacher can
encode only the assigned subjects and may add/enroll students only in advised
sections.

## 7. Read surfaces kept consistent

- Registry (`/students`): `sectionName` / `gradeLevelName` come from the active
  enrollment join; Advisers/Subject Teachers are filtered by `userSectionScope`.
- Profile (`/students/[id]`): a **Current Enrollment** summary (school year, grade
  level, section, adviser, status) plus the full history (now with adviser).
- Dashboard: the generic cards are scoped by `userSectionScope`; an Adviser also
  gets a **My Sections** card listing the sections they advise with active counts.

## 8. Negative / abuse cases covered

- Enroll into another adviser's section (crafted `sectionId`) → rejected by
  `canManageEnrollmentInSection`.
- Section that does not belong to the chosen grade level / school year → rejected
  by `checkSectionPlacement`.
- Inactive/archived section → rejected.
- Duplicate enrollment for the same school year → upsert/update, never a second row.
- Adviser editing/viewing a student outside their section → rejected by
  `canAccessStudent` / `canEditStudent`.
- Subject Teacher encoding an unassigned subject or section → rejected by
  `canWriteGradesInSection`.
- Direct action call with a manipulated id → all checks run server-side.

## 9. Database

No schema change was required. The relationships, foreign keys, unique indexes and
lookup indexes already exist (`student_enrollments`, `sections`,
`section_subject_teachers`, `user_roles`). Verified with the Turso CLI:
`PRAGMA integrity_check` → `ok`, `PRAGMA foreign_key_check` → empty, no orphan
enrollments. Existing enrollment rows (none at the time of writing) are untouched.

## 10. Tests

- `src/lib/__tests__/enrollment-rules.test.ts` — placement validation, conflict
  messaging.
- `src/lib/__tests__/scope.test.ts` — `hasSchoolWideStudentScope`,
  `enrollableSectionIds`.
- `src/lib/__tests__/rbac-roles.test.ts` — Adviser gains create/update/enroll but
  no administrative powers; other roles do not gain them.
- `src/lib/__tests__/assignments.test.ts` — the multi-role union.
