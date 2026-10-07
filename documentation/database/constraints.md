# Constraints — Target Database

> STATUS: **PLAN**. SQLite supports UNIQUE, PK, FK, CHECK; Drizzle exposes
> unique/pk/fk directly and CHECK via `sql` predicates. Application-level
> (Zod + action guards) enforces the rest — mirroring the existing pattern
> where `workflows`/`scope` logic guards state transitions.

## Database-Level

| Table | Constraint | Type |
|---|---|---|
| students | `student_number` UNIQUE | correctness |
| students | `sex IN ('male','female')` | CHECK |
| students | `status IN ('active','inactive','archived')` | CHECK |
| school_years | `year` UNIQUE; `year GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9]'` | UNIQUE + CHECK |
| grade_levels | `name` UNIQUE | UNIQUE |
| sections | `(school_year_id, grade_level_id, name)` UNIQUE | correctness |
| student_enrollments | `(student_id, school_year_id)` UNIQUE | **history integrity** — one placement per year |
| student_enrollments | `status IN ('active','completed','transferred','withdrawn')` | CHECK |
| student_grades | `(enrollment_id, subject_id, grading_period_id)` UNIQUE | one grade per subject+period |
| student_grades | `grade >= 0` (scale bounds from settings, app-enforced) | CHECK |
| attendance_records | `(enrollment_id, date)` UNIQUE; `status IN ('present','absent_excused','absent_unexcused','late')` | UNIQUE + CHECK |
| assessments | `domain IN ('reading','literacy','numeracy')` | CHECK |
| behavior_categories | `name` UNIQUE; `kind IN ('positive','concern')` | UNIQUE + CHECK |
| behavior_records | `status IN ('open','monitored','resolved')` | CHECK |
| grading_periods | `(school_year_id, name)` UNIQUE | correctness |
| interventions | `status IN ('planned','active','completed','discontinued')` | CHECK |
| users | `email` UNIQUE | retained |

## Application-Level (Zod in `src/lib/schemas.ts` + action guards)

- Grade values within the configured scale (settings-driven, not hardcoded).
- Enrollment requires an active school year; section must belong to that year + grade level.
- Attendance date not in the future; only for an `active` enrollment.
- Assessment `level` must be one of the configured levels for the domain.
- Behavior descriptions: required, max length, neutral-language review.
- Record-verification transitions follow the state machine (pattern: `src/lib/workflow.ts`).
- Role-gated permissions on every mutation (`getAuthorizedUser(permission)` first — existing pattern).

## Cascade Summary

- CASCADE: sessions→users; student_enrollments→students; grades/attendance→enrollment; behavior/assessments/interventions/QR/verifications/duplicates→students; followups→interventions.
- SET NULL: sections.adviser_id; audit_logs.user_id.
- RESTRICT (app-guarded): role changes, deleting school_years/grade_levels/sections with references (UI prevents; archive instead).
