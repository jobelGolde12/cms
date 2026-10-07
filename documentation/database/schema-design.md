# Schema Design — Target Database (School System)

> STATUS: **PLAN**. Drizzle definitions will live in `src/db/schema.ts`.
> Conventions: TEXT UUID PKs, unixepoch integer timestamps, 0/1 booleans,
> ISO `YYYY-MM-DD` date strings (matches existing `birth_date` handling).

Every table below states: purpose, columns (type, nullability), PK, FKs,
uniques, indexes, cascade behavior, and why it exists.

---

## school_years

**Purpose:** Academic year dimension. Anchor for enrollment, grading, analytics. Why: replaces the loose `school_year` text in `child_education` with a real entity enabling school-year comparisons.

| Column | Type | Null | Notes |
|---|---|---|---|
| id | TEXT | no | PK (UUID) |
| year | TEXT | no | `YYYY-YYYY` |
| start_date / end_date | TEXT (ISO date) | yes | informational |
| is_current | INTEGER (bool) | no | default 0; exactly one current year enforced in application logic |
| created_at / updated_at | INTEGER ts | no | |

Uniques: `school_years_year_uq (year)`. Indexes: `is_current`.
FKs: none. Cascade: n/a.

## grade_levels

**Purpose:** Ordered grade-level definitions (Grade 7…10 default; 11–12 optional). Why: replaces elementary K–6 list; drives enrollment and analytics ordering.

| Column | Type | Null | Notes |
|---|---|---|---|
| id | TEXT | no | PK |
| name | TEXT | no | e.g. "Grade 7" |
| order_index | INTEGER | no | sort order |
| created_at / updated_at | INTEGER ts | no | |

Uniques: `grade_levels_name_uq (name)`. Indexes: `order_index`.

## sections

**Purpose:** Class grouping per school year & grade level. Operational scope for teachers. Why: replaces barangay as the row-level scoping unit.

| Column | Type | Null | Notes |
|---|---|---|---|
| id | TEXT | no | PK |
| school_year_id | TEXT | no | FK → school_years.id, cascade delete of section only if year deleted (years rarely deleted; prefer RESTRICT semantics via app checks) |
| grade_level_id | TEXT | no | FK → grade_levels.id |
| name | TEXT | no | e.g. "Sampaguita" |
| adviser_id | TEXT | yes | FK → users.id, ON DELETE SET NULL |
| is_active | INTEGER bool | no | default 1 |
| created_at / updated_at | INTEGER ts | no | |

Uniques: `sections_sy_grade_name_uq (school_year_id, grade_level_id, name)`.
Indexes: `school_year_id`, `grade_level_id`, `adviser_id`.

## guardians

**Purpose:** Parent/guardian directory. Why: guardian contact info is required for school operations and is sensitive → isolated table + access control.

| Column | Type | Null | Notes |
|---|---|---|---|
| id | TEXT | no | PK |
| first_name / last_name | TEXT | no | |
| middle_name | TEXT | yes | |
| relationship | TEXT | no | e.g. mother, father, guardian (configurable vocabulary) |
| contact_number | TEXT | yes | |
| email | TEXT | yes | |
| occupation | TEXT | yes | |
| created_at / updated_at | INTEGER ts | no | |

Indexes: `last_name`, `first_name`.

## students

**Purpose:** Central student record. Why: replaces `children`; school-centric identity.

| Column | Type | Null | Notes |
|---|---|---|---|
| id | TEXT | no | PK |
| student_number | TEXT | no | generated `SM-2026-000001` (prefix from system_settings, reuse `child-code.ts` mechanism) |
| first_name | TEXT | no | |
| middle_name | TEXT | yes | |
| last_name | TEXT | no | |
| suffix | TEXT | yes | |
| birth_date | TEXT ISO | no | |
| sex | TEXT | no | `male \| female` (retain existing vocabulary) |
| contact_number | TEXT | yes | optional, data-minimized |
| address | TEXT | yes | single current address (replaces child_addresses) |
| status | TEXT | no | `active \| inactive \| archived`, default `active` |
| created_by / updated_by | TEXT | yes/no | FK → users.id |
| created_at / updated_at | INTEGER ts | no | |

Uniques: `students_number_uq (student_number)`.
Indexes: `last_name`, `first_name`, `birth_date`, `status`, `created_at`.

## student_guardians

**Purpose:** Student↔guardian many-to-many with primary flag. Why: households vary; one canonical join.

| Column | Type | Null | Notes |
|---|---|---|---|
| student_id | TEXT | no | PK part, FK → students.id CASCADE |
| guardian_id | TEXT | no | PK part, FK → guardians.id CASCADE |
| is_primary | INTEGER bool | no | default 0 |

PK: `(student_id, guardian_id)`. Index: `guardian_id`.

## student_enrollments

**Purpose:** Historical enrollment: student → school year → grade level → section. Why: history is never overwritten (TODO §16); enables cohort analytics.

| Column | Type | Null | Notes |
|---|---|---|---|
| id | TEXT | no | PK |
| student_id | TEXT | no | FK → students.id, ON DELETE CASCADE |
| school_year_id | TEXT | no | FK → school_years.id |
| grade_level_id | TEXT | no | FK → grade_levels.id |
| section_id | TEXT | no | FK → sections.id |
| status | TEXT | no | `active \| completed \| transferred \| withdrawn`, default `active` |
| enrollment_date | TEXT ISO | yes | |
| recorded_by | TEXT | no | FK → users.id |
| created_at / updated_at | INTEGER ts | no | |

Uniques: `enrollment_student_sy_uq (student_id, school_year_id)` — one placement per year.
Indexes: `student_id`, `school_year_id`, `section_id`, `grade_level_id`, `status`.

## subjects

**Purpose:** Subject catalog. Why: grades reference stable subject definitions.

| Column | Type | Null |
|---|---|---|
| id | TEXT PK | no |
| code | TEXT unique | no |
| name | TEXT | no |
| description | TEXT yes | |
| is_active | INTEGER bool default 1 | no |
| created_at / updated_at | INTEGER ts | no |

## grading_periods

**Purpose:** Periods within a school year (default Quarter 1–4; configurable — no invented policy). Why: grades and period analytics reference it.

| Column | Type | Null | Notes |
|---|---|---|---|
| id | TEXT | no | PK |
| school_year_id | TEXT | no | FK → school_years.id |
| name | TEXT | no | e.g. "Quarter 1" |
| order_index | INTEGER | no | |
| start_date / end_date | TEXT ISO | yes | |
| is_current | INTEGER bool | no | default 0 |

Uniques: `grading_periods_sy_name_uq (school_year_id, name)`. Indexes: `school_year_id`, `is_current`.

## student_grades

**Purpose:** Grade per enrollment × subject × grading period. Why: the academic fact table powering subject averages, general averages, trends.

| Column | Type | Null | Notes |
|---|---|---|---|
| id | TEXT | no | PK |
| enrollment_id | TEXT | no | FK → student_enrollments.id, CASCADE |
| subject_id | TEXT | no | FK → subjects.id |
| grading_period_id | TEXT | no | FK → grading_periods.id |
| grade | REAL | no | school-configured scale (documented placeholder: 60–100; **not an invented DepEd standard**) |
| remarks | TEXT | yes | |
| recorded_by | TEXT | no | FK → users.id |
| created_at / updated_at | INTEGER ts | no | |

Uniques: `grades_enrollment_subject_period_uq (enrollment_id, subject_id, grading_period_id)`.
Indexes: `enrollment_id`, `subject_id`, `grading_period_id`.

## attendance_records

**Purpose:** Daily attendance per enrollment. Why: attendance rate/trend analytics; supports repeated-absence indicators.

| Column | Type | Null | Notes |
|---|---|---|---|
| id | TEXT | no | PK |
| enrollment_id | TEXT | no | FK → student_enrollments.id, CASCADE |
| date | TEXT ISO | no | school day |
| status | TEXT | no | `present \| absent_excused \| absent_unexcused \| late` |
| remarks | TEXT | yes | |
| recorded_by | TEXT | no | FK → users.id |
| created_at / updated_at | INTEGER ts | no | |

Uniques: `attendance_enrollment_date_uq (enrollment_id, date)`.
Indexes: `date`, `status`, `enrollment_id`.

## behavior_categories

**Purpose:** Configurable behavior vocabulary. Why: avoids hardcoded categories; supports positive + concern kinds with neutral labels.

| Column | Type | Null | Notes |
|---|---|---|---|
| id | TEXT | no | PK |
| name | TEXT | no | e.g. "Positive Participation", "Classroom Concern" |
| kind | TEXT | no | `positive \| concern` |
| description | TEXT | yes | |

Uniques: `behavior_categories_name_uq (name)`.

## behavior_records

**Purpose:** Permission-controlled behavior observations. Why: behavior monitoring with follow-ups; sensitive → dedicated table and access rules.

| Column | Type | Null | Notes |
|---|---|---|---|
| id | TEXT | no | PK |
| student_id | TEXT | no | FK → students.id, CASCADE |
| category_id | TEXT | no | FK → behavior_categories.id |
| date | TEXT ISO | no | |
| description | TEXT | no | neutral language required |
| severity | TEXT | yes | `low \| medium \| high` |
| follow_up | TEXT | yes | |
| status | TEXT | no | `open \| monitored \| resolved`, default `open` |
| recorded_by | TEXT | no | FK → users.id |
| created_at / updated_at | INTEGER ts | no | |

Indexes: `student_id`, `category_id`, `date`, `status`.

## assessments

**Purpose:** Single engine for reading, literacy, numeracy (TODO §22 decision: literacy = broader domain in the same table; no duplicated schema). Levels are data-configurable — **no invented standards**.

| Column | Type | Null | Notes |
|---|---|---|---|
| id | TEXT | no | PK |
| student_id | TEXT | no | FK → students.id, CASCADE |
| domain | TEXT | no | `reading \| literacy \| numeracy` |
| assessment_type | TEXT | yes | e.g. school-chosen tool name |
| skill_area | TEXT | yes | numeracy/literacy sub-skill |
| date | TEXT ISO | no | |
| level | TEXT | yes | configurable proficiency label |
| score | REAL | yes | optional numeric score |
| assessor_id | TEXT | no | FK → users.id |
| notes | TEXT | yes | sensitive — access-controlled |
| created_at / updated_at | INTEGER ts | no | |

Indexes: `(student_id, domain)`, `domain`, `date`.

## Repurposed / migrated tables

| Table | Change |
|---|---|
| `users` | drop `barangay_id`; add optional assignment fields per role (e.g. `adviser_section_ids` via sections.adviser_id instead — keep users lean) |
| `roles` / `permissions` / `role_permissions` | structure unchanged; catalog re-seeded |
| `interventions` | `childId` → `studentId`; statuses `planned/active/completed/discontinued`; add `outcome`; keep followups |
| `qr_verifications` | `childId` → `studentId`; token model unchanged |
| `duplicate_candidates` | from `child_duplicate_candidates`, student fields |
| `record_verifications` (new, from `child_validations`) | student record verification history: student_id, submitted_by, reviewed_by, status `pending/approved/needs_correction/rejected`, remarks, timestamps |
| `reports` | new `report_type` catalog; scope becomes `school \| grade_level \| section` |
| `system_settings` | new keys: `system_name`, `student_number_prefix`, `default_school_year`, `grading_scale_*`, `assessment_levels_*`, `attendance_thresholds`, `maintenance_mode` |

## Archived (Phase 4 final step, data-preserving)

`municipalities`, `barangays`, `schools`, `children`, `child_addresses`,
`child_education`, `child_eccd`, `child_disabilities`, `child_validations`,
`child_duplicate_candidates`, `child_monitoring`.
Decision log + rollback: `migration.md`, `migration-risks.md`.
