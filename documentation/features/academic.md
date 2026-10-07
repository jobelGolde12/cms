# Feature — Academic Records (Subjects, Grading Periods, Grades)

> STATUS: **PLAN**.

## Structure

- `subjects`: catalog with unique code + name (admin-managed).
- `grading_periods`: per school year, ordered (default four quarters —
  **configurable**; no invented DepEd policy).
- `student_grades`: enrollment × subject × period, unique triple; numeric
  grade in the school-configured scale; `recorded_by`; audited updates.

**Grading scale policy:** the numeric scale and passing threshold are stored in
`system_settings` (`grading_scale`). Documented defaults are placeholders to be
confirmed by the school — the system must not silently invent national standards
(TODO §64).

## Data Entry

- Teachers (`grades.write`, assigned sections only) encode grades per section
  grid: rows = students, columns = subjects, per selected grading period.
- Server actions validate: section ownership (scope), period belongs to the
  enrollment's school year, value within configured scale.
- Records/admin can correct any grade (audited with old/new values).

## Computation (pure functions + unit tests in `src/lib/`)

| Metric | Definition |
|---|---|
| Subject average (student) | mean of that subject's grades across periods for the enrollment |
| General average (period) | mean of the period's subject grades for the enrollment |
| General average (year) | mean of period general averages |
| Subject/class average | mean per subject across students (analytics) |

All computed **in SQL aggregation** for lists/dashboards; per-student values may
be computed server-side for the profile.

## Pages

- `/performance/academic`: school/grade/section/subject selector; averages,
  distribution (reuse `distribution-bar.tsx`), trend across periods; low
  performers flagged via the documented monitoring rules.
- Profile → Academic Performance + Grades tabs: period table, subject rows,
  general average per period, sparkline-style trend (existing chart primitives).

## Authorization

| Role | Access |
|---|---|
| admin, school_admin | all grades; encode/correct |
| teacher | assigned sections only |
| records | view |
| guidance | view summaries (per matrix) |

## Empty/Edge States

- No subjects configured → setup prompt (admins).
- Period not started → disabled grid with explanation.
- Missing grades → visible gaps, averages computed from present values with
  count disclaimer ("based on 5 of 8 subjects").
