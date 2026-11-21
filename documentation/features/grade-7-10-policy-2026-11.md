# Grade 7–10 Policy — Junior High School Records

> **Effective policy:** the records system supports Grade 7, Grade 8, Grade 9,
> and Grade 10 only. Grade 10 is the final supported year and must never
> promote or generate Grade 11.

## Canonical reference data

`src/lib/grade-levels.ts` is the single application-level source of truth:

| ID | Name | Grade | Order |
|---|---|---:|---:|
| `gl-7` | Grade 7 | 7 | 1 |
| `gl-8` | Grade 8 | 8 | 2 |
| `gl-9` | Grade 9 | 9 | 3 |
| `gl-10` | Grade 10 | 10 | 4 |

The shared policy helpers are used by forms, server actions, query filters,
report/document code, imports, and promotion logic. Grade-level names are fixed
reference data; users may configure sections and grading periods, but may not
add, rename, or extend the grade catalog.

## Enforcement boundaries

Unsupported Grade 11/12 requests must fail at every operational boundary:

1. **Forms and server actions** reject unsupported grade IDs and reject sections
   whose grade level is outside Grade 7–10 before writing.
2. **APIs and read paths** reject unsupported explicit grade or section filters
   and exclude unsupported rows from operational lists, dashboards, analytics,
   reports, forecasts, grade sheets, and document populations.
3. **Imports** cannot create or update Grade 11/12 operational records. Legacy
   Grade 12 import and verification scripts are hard-disabled rather than left
   as an accidental bypass.
4. **Database constraints** restrict `grade_levels`, `sections`, and
   `student_enrollments` to the canonical Grade 7–10 definitions. The database
   is the final defense against direct writes outside the application.

Rejection uses one user-facing message: **“Grade levels are limited to Grades
7–10.”**

## Promotion rule

Only these transitions are valid:

- Grade 7 → Grade 8
- Grade 8 → Grade 9
- Grade 9 → Grade 10

Grade 10 has no promotable successor. Form 137 and report-card promotion code
must use the shared capped promotion helper so Grade 10 can never produce
Grade 11.

## Operational cleanup rules

Live cleanup is dependency-aware and does not silently reassign records:

- Preserve valid Grade 7–10 sections, enrollments, grades, attendance, teacher
  assignments, and employee records.
- Preserve the affected student profile, guardian links, record-verification
  history, and append-only audit history.
- Remove unsupported operational placement, grade, attendance, submission, and
  assignment rows. Clear an unsupported employee section link rather than
  moving the employee to another section.
- Remove unsupported sections and grade-level reference rows only after their
  dependent rows are removed.
- Never move a student, employee, teacher assignment, grade, or report filter
  to a different grade merely to satisfy the new policy.

The cleanup migration must run before the constraint migration so SQLite table
rebuilds cannot copy unsupported rows into the constrained tables.

## Historical exceptions

Historical evidence is not rewritten to match current policy. This includes
audit logs, record-verification history, prior extraction/source facts, and
dated implementation or audit records that describe the earlier Grade 12 data.
Such references are intentional when a final project-wide search reports them.

## Verification checklist

- Unsupported direct writes fail in forms, actions, APIs, and the database.
- Unsupported rows do not appear in operational reads, analytics, reports,
  forecasts, grade sheets, or generated documents.
- Grade 10 does not generate Grade 11.
- Live cleanup preserves all Grade 7–10 rows and the required history.
- Database foreign-key and integrity checks remain clean after migration.
