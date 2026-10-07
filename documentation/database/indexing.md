# Indexing Strategy — Target Database

> STATUS: **PLAN**. Indexes are declared in `src/db/schema.ts` (Drizzle
> `index()`/`uniqueIndex()`) exactly as the current schema does.

## Guiding Rules

1. Index every FK used in joins (`student_id`, `enrollment_id`, `section_id`, …).
2. Index every filter/sort column used by registry pages and reports.
3. Unique indexes double as correctness constraints (one enrollment per
   student/year; one attendance row per enrollment/date; one grade per
   enrollment/subject/period).
4. Composite indexes ordered by selectivity: `(student_id, domain)` on
   assessments, `(enrollment_id, date)` on attendance.
5. Measure with `EXPLAIN QUERY PLAN` after seeding; add indexes only where
   queries show scans (Turso/libSQL is SQLite — no columnar tricks needed at school scale).

## Planned Indexes

| Table | Index | Serves |
|---|---|---|
| students | `student_number` (uq), `last_name`, `first_name`, `birth_date`, `status`, `created_at` | registry search/sort, duplicate detection, KPIs |
| student_enrollments | uq `(student_id, school_year_id)`; `school_year_id`, `grade_level_id`, `section_id`, `status` | enrollment by grade/section, dashboard KPIs |
| student_grades | uq `(enrollment_id, subject_id, grading_period_id)`; `grading_period_id`, `subject_id` | averages, trends, subject performance |
| attendance_records | uq `(enrollment_id, date)`; `date`, `status` | daily entry, rates, trends, repeated absences |
| assessments | `(student_id, domain)`, `domain`, `date` | profile tabs, distributions, trends |
| behavior_records | `student_id`, `category_id`, `date`, `status` | profile tab, casework lists |
| sections | uq `(school_year_id, grade_level_id, name)`; `adviser_id` | teacher scope lookups |
| grading_periods | uq `(school_year_id, name)`; `is_current` | current-period queries |
| guardians / student_guardians | `guardian_id`; PK pair | profile guardian section |
| qr_verifications | `verification_token` (uq), `student_id`, `verified_at` | retained from current schema |
| audit_logs | `user_id`, `(entity_type, entity_id)`, `created_at` | retained |
| interventions | `student_id`, `status`, `target_date` | retained pattern |

## Anti-Patterns Avoided

- Loading all students into the client (pagination via existing `ALLOWED_PAGE_SIZES` pattern).
- Computing analytics in JS over full result sets (SQL `GROUP BY`/aggregates server-side).
- N+1 (single grouped queries + one follow-up batched query where needed — current `listInterventions` pattern).
