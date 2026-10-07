# Data Dictionary — Target Database

> STATUS: **PLAN**. Column-level specs live in `schema-design.md`; this file
> defines vocabularies, formats, and derived values.

## Identifier Formats

| Field | Format | Generator | Config |
|---|---|---|---|
| `students.student_number` | `SM-2026-000001` | sequential per year (reuses `src/lib/child-code.ts` mechanism) | `system_settings.student_number_prefix` |
| `school_years.year` | `2026-2027` | manual/admin | — |
| all `id` | UUID v4 | `crypto.randomUUID()` | — |

## Status Vocabularies

| Field | Values | Notes |
|---|---|---|
| `students.status` | `active`, `inactive`, `archived` | mirrors old child lifecycle |
| `student_enrollments.status` | `active`, `completed`, `transferred`, `withdrawn` | one active row per student per year (unique) |
| `attendance_records.status` | `present`, `absent_excused`, `absent_unexcused`, `late` | TODO §19 set |
| `behavior_categories.kind` | `positive`, `concern` | neutral labels; admin-editable |
| `behavior_records.severity` | `low`, `medium`, `high` | optional |
| `behavior_records.status` | `open`, `monitored`, `resolved` | lifecycle |
| `assessments.domain` | `reading`, `literacy`, `numeracy` | single engine, three domains |
| `assessments.level` | free/configurable label set | stored per school settings; **no invented standards** |
| `interventions.status` | `planned`, `active`, `completed`, `discontinued` | renamed from old ongoing/cancelled |
| `record_verifications.status` | `pending`, `approved`, `needs_correction`, `rejected` | carries over validation semantics |
| `duplicate_candidates.status` | `pending`, `confirmed_duplicate`, `not_duplicate`, `dismissed` | unchanged concept |
| `users.is_active` | 0/1 | disabled users cannot authenticate |
| `qr_verifications.result` | `valid`, `invalid`, `expired`, `revoked` | unchanged |
| `reports.scope` | `school`, `grade_level`, `section` | replaces municipality/barangay |

## Derived Values (computed server-side, never stored unless noted)

| Metric | Formula | Source |
|---|---|---|
| General average (period) | mean of `student_grades.grade` for the enrollment × period | `student_grades` |
| Subject average | mean of grades for enrollment × subject across periods | `student_grades` |
| Attendance rate | present+late(?) ÷ recorded days — **ratio definition documented & configurable** | `attendance_records` |
| Reading/literacy/numeracy proficiency share | students at/above target level ÷ assessed students | `assessments` |
| Enrollment count | active enrollments per year/grade/section | `student_enrollments` |
| Needs-monitoring flags | documented rule engine over the above | see `documentation/features/analytics.md` |

## system_settings Keys (planned)

| Key | Purpose |
|---|---|
| `system_name` | "Records Management System — Sta. Magdalena National High School" |
| `student_number_prefix` | default `SM` |
| `default_school_year` | e.g. `2026-2027` |
| `grading_scale` | JSON: min, max, passing threshold placeholders (school-provided) |
| `attendance_rate_definition` | which statuses count as attended |
| `assessment_levels` | JSON: domain → ordered level labels |
| `monitoring_rules` | JSON: needs-monitoring thresholds |
| `maintenance_mode` | retained |

## Audit Action Vocabulary (append-only `audit_logs.action`)

`auth.login`, `auth.logout`, `student.create/update/archive`,
`enrollment.create/update`, `grade.create/update`, `attendance.record/update`,
`behavior.record/update`, `assessment.record/update`,
`intervention.create/update/complete`, `verification.submit/review`,
`duplicate.confirm/dismiss`, `report.generate/export`, `qr.generate/revoke`,
`user.create/update/disable`, `role.change`, `setting.update` — mirrors the
existing event style (`CREATE_CHILD`, `APPROVE_VALIDATION`, …) with namespaced names.
