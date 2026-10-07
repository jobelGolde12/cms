# Feature — Enrollment

> STATUS: **PLAN**.

## Model

`student_enrollments` = student → school year → grade level → section, with
status `active | completed | transferred | withdrawn`. One row per
student per school year (unique). **History is never overwritten** — a new
school year is a new row; corrections are audited updates of the existing row,
never rewrites of prior years.

## Operations

| Operation | Rules |
|---|---|
| Enroll | Requires active school year; section must belong to that year + grade level; sets status `active`; audited (`enrollment.create`) |
| Update placement | Same-year section/level move → update row (audited with old/new values) |
| Transfer out | status `transferred` + date; student remains in registry |
| Withdraw | status `withdrawn`; blocks attendance/grades going forward |
| Complete (year end) | `completed`; next year's row created via Enroll |
| Unassign/section dissolved | Enrollment rows retained (RESTRICT); UI blocks deleting sections with enrollments |

## Sections & Grade Levels (admin)

- CRUD for `sections` per school year + grade level; optional adviser
  (`sections.adviser_id`) which drives teacher scoping.
- Grade levels seeded (Grade 7–10; 11–12 optional) — ordered, admin-editable names.

## Analytics (server-side, `src/lib/queries.ts`)

- Enrollment by grade level & section (current year) — dashboard chart.
- Enrollment trend across school years — line/bar.
- Active vs completed vs transferred vs withdrawn distribution.
- Section size balance (flags oversized sections — threshold from settings).

## UI

- Profile → Enrollment tab: chronological table (year, level, section, status) with actions per permission.
- Admin: sections management under Settings/Academic Structure.
- Registry filters: grade level + section (replacing barangay/school filters).

## Tests

- Create enrollment; duplicate-per-year rejected.
- History immutability: prior-year rows never modified by new-year enrollment.
- Transfer/withdraw flows; permission gating (records/admin only for mutations).
