# Database Overview — Target Schema (School System)

> STATUS: **PLAN** — new tables and transformations. The current 24-table schema
> is documented in `SCHEMA.md` (old system). Turso/libSQL + Drizzle retained
> (`drizzle.config.ts`, `src/db/index.ts`).

## Principles

1. **Student is the central entity.**
2. **History is never overwritten** (enrollment, grades, assessments are append-per-period).
3. **Soft lifecycle statuses** (`active | inactive | archived`) for students; no destructive deletes.
4. **Server-side aggregation** for analytics; indexes support every dashboard/report query.
5. **Sensitive tables isolated** (guardians, behavior, assessments notes) and permission-checked in queries.
6. **Configurable, not invented**: grading periods, assessment levels, behavior categories are data rows, editable via settings.

## Table Groups

### Reference / academic structure
| Table | Purpose | Key relations |
|---|---|---|
| `school_years` | Academic years `YYYY-YYYY`, one `is_current` | 1→N sections, grading_periods, enrollments |
| `grade_levels` | Grade 7…10 (+11/12 if configured), ordered | 1→N sections, enrollments |
| `sections` | Class group per school year & grade level; optional adviser | N→1 school_year, grade_level; 1→N enrollments |
| `subjects` | Subject catalog (code, name) | 1→N student_grades |
| `grading_periods` | Periods within a school year (default Q1–Q4) | N→1 school_year; 1→N student_grades |

### People
| Table | Purpose | Key relations |
|---|---|---|
| `users` | Authenticated school personnel (role + assignment fields) | N→1 roles; 1→N sessions |
| `roles` / `permissions` / `role_permissions` | RBAC (retain structure, new catalog) | as today |
| `students` | Central student record (`student_number` unique) | 1→N enrollments, assessments, behavior_records, interventions, duplicate_candidates |
| `guardians` | Parent/guardian directory | N→M students via `student_guardians` |
| `student_guardians` | Join + `is_primary` | — |

### Records
| Table | Purpose | Key relations |
|---|---|---|
| `student_enrollments` | Historical placement per school year (grade level, section, status) | N→1 student, school_year, grade_level, section |
| `student_grades` | Grade per enrollment × subject × grading period | N→1 enrollment, subject, grading_period |
| `attendance_records` | Daily status per enrollment (unique per date) | N→1 enrollment |
| `behavior_categories` | Configurable positive/concern categories | 1→N behavior_records |
| `behavior_records` | Permission-controlled observations | N→1 student, category, recorder |
| `assessments` | Reading / literacy / numeracy evaluations (single engine, `domain` column) | N→1 student, assessor |
| `interventions`, `intervention_followups` | Support lifecycle (student-scoped) | N→1 student; followups N→1 intervention |

### System (unchanged from old system)
`sessions`, `notifications`, `audit_logs`, `system_settings`, `reports`,
`report_exports`, `qr_verifications` (childId → studentId).

## Retained Conventions (from current schema)

- `id` TEXT PK (UUID), timestamps as `integer` unixepoch defaults, booleans as 0/1.
- Drizzle relations exported for typed relational queries.
- Append-only `audit_logs`; unique-index-backed natural keys (`users.email`, `system_settings.key`).
- Status vocabularies in `src/lib/constants.ts` mirrored by Zod enums in `src/lib/schemas.ts`.

## Migration Approach

Append-first: new tables are added; old tables are populated-then-archived
(renamed `_archived_*` or exported). Details and risk controls:
`migration.md`, `migration-risks.md`.
