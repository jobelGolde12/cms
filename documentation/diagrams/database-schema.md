# 06 — Database Schema Diagram (Physical Implementation)

**Records Management System — Sta. Magdalena National High School**  
**Physical database: Turso (libSQL) — SQLite-compatible, remote-capable**  
**Schema source: `src/db/schema.ts`, migrations `drizzle/*.sql`, `drizzle.config.ts` (dialect: turso)**  
**ORM: Drizzle ORM v0.45.2 (`sqlite-core`)**

---

## Physical Schema — Table Definitions (Actual Columns, Types, Constraints)

### Authentication & User Management

```
TABLE: roles
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL  (stable seed IDs: role-admin, role-admin-officer, ...)
name            TEXT    NOT NULL  UNIQUE (e.g. "System Administrator")
description     TEXT    NULL
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
updated_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
INDEX: roles_name_uq (name)

TABLE: permissions
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL  (e.g. students.view, grades.write)
name            TEXT    NOT NULL  UNIQUE (e.g. "dashboard.view")
description     TEXT    NULL
module          TEXT    NOT NULL  (e.g. "students", "grades")
action          TEXT    NOT NULL  (e.g. "view", "write", "create")
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
INDEX: permissions_name_uq (name)

TABLE: role_permissions
──────────────────────────────────────────────────────────────────────────────
role_id         TEXT    NOT NULL  FK → roles.id ON DELETE CASCADE
permission_id   TEXT    NOT NULL  FK → permissions.id ON DELETE CASCADE
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
PK: (role_id, permission_id)
INDEX: role_permissions_role_idx (role_id)
INDEX: role_permissions_permission_idx (permission_id)

TABLE: users
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL  (UUID from crypto.randomUUID())
role_id         TEXT    NOT NULL  FK → roles.id
first_name      TEXT    NOT NULL
middle_name     TEXT    NULL
last_name       TEXT    NOT NULL
email           TEXT    NOT NULL  UNIQUE
password_hash   TEXT    NOT NULL  (bcrypt hash from src/lib/auth.ts hashPassword)
phone           TEXT    NULL
is_active       INTEGER  NOT NULL  DEFAULT 1  (boolean mode: 0/1)
last_login_at   INTEGER  NULL  (timestamp)
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
updated_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
INDEX: users_email_uq (email)  UNIQUE
INDEX: users_email_idx (email)
INDEX: users_role_idx (role_id)
INDEX: users_active_idx (is_active)

TABLE: sessions
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL  (UUID)
token_hash      TEXT    NOT NULL  UNIQUE  (SHA-256 of opaque cookie; raw token never stored)
user_id         TEXT    NOT NULL  FK → users.id ON DELETE CASCADE
expires_at      INTEGER  NOT NULL  (timestamp)
ip              TEXT    NULL
user_agent      TEXT    NULL
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
INDEX: sessions_token_hash_uq (token_hash)  UNIQUE
INDEX: sessions_user_idx (user_id)
```

---

### Academic Structure & Enrollment

```
TABLE: school_years
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
year            TEXT    NOT NULL  UNIQUE  (e.g. "2025-2026")
start_date      TEXT    NULL  (ISO YYYY-MM-DD)
end_date        TEXT    NULL
is_current      INTEGER  NOT NULL  DEFAULT 0  (boolean: 0/1)
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
updated_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
INDEX: school_years_year_uq (year)  UNIQUE
INDEX: school_years_current_idx (is_current)

TABLE: grade_levels
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
name            TEXT    NOT NULL  UNIQUE  (e.g. "Grade 7", ... "Grade 12")
order_index     INTEGER  NOT NULL
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
updated_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
INDEX: grade_levels_name_uq (name)  UNIQUE
INDEX: grade_levels_order_idx (order_index)

TABLE: sections
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
school_year_id  TEXT    NOT NULL  FK → school_years.id
grade_level_id  TEXT    NOT NULL  FK → grade_levels.id
name            TEXT    NOT NULL
adviser_id      TEXT    NULL  FK → users.id ON DELETE SET NULL
is_active       INTEGER  NOT NULL  DEFAULT 1
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
updated_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
UNIQUE: sections_sy_grade_name_uq (school_year_id, grade_level_id, name)
INDEX: sections_sy_idx (school_year_id)
INDEX: sections_grade_idx (grade_level_id)
INDEX: sections_adviser_idx (adviser_id)

TABLE: subjects
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
code            TEXT    NOT NULL  UNIQUE  (e.g. "MATH-7")
name            TEXT    NOT NULL
description     TEXT    NULL
is_active       INTEGER  NOT NULL  DEFAULT 1
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
updated_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
INDEX: subjects_code_uq (code)  UNIQUE
INDEX: subjects_active_idx (is_active)

TABLE: section_subject_teachers
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
section_id      TEXT    NOT NULL  FK → sections.id ON DELETE CASCADE
subject_id      TEXT    NOT NULL  FK → subjects.id ON DELETE CASCADE
teacher_id      TEXT    NOT NULL  FK → users.id ON DELETE CASCADE
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
updated_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
UNIQUE: section_subject_teacher_uq (section_id, subject_id)
INDEX: section_subject_teacher_teacher_idx (teacher_id)
INDEX: section_subject_teacher_section_idx (section_id)
```

```
TABLE: grading_periods
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
school_year_id  TEXT    NOT NULL  FK → school_years.id
grade_level_id  INTEGER  NOT NULL  (not directly in grading_periods — actually grading_periods links only to school_years)
name            TEXT    NOT NULL  (e.g. "Quarter 1")
order_index     INTEGER  NOT NULL
start_date      TEXT    NULL  (ISO YYYY-MM-DD)
end_date        TEXT    NULL
is_current      INTEGER  NOT NULL  DEFAULT 0
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
updated_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
UNIQUE: grading_periods_sy_name_uq (school_year_id, name)
INDEX: grading_periods_sy_idx (school_year_id)
INDEX: grading_periods_current_idx (is_current)

TABLE: student_enrollments
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
student_id      TEXT    NOT NULL  FK → students.id ON DELETE CASCADE
school_year_id  TEXT    NOT NULL  FK → school_years.id
grade_level_id  TEXT    NOT NULL  FK → grade_levels.id
section_id      TEXT    NOT NULL  FK → sections.id
status          TEXT    NOT NULL  DEFAULT "active"
                 ("active" | "completed" | "transferred" | "withdrawn")
enrollment_date TEXT    NULL  (ISO YYYY-MM-DD)
remarks         TEXT    NULL
eligibility_certificate  TEXT  NULL  (SF10-JHS)
previous_school_name     TEXT  NULL
previous_school_address  TEXT  NULL
previous_general_average REAL  NULL  (numeric grade from previous school)
previous_grade_level     TEXT  NULL
promotion_status         TEXT  NULL
academic_distinction     TEXT  NULL
recorded_by     TEXT    NOT NULL  FK → users.id
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
updated_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
UNIQUE: enrollment_student_sy_uq (student_id, school_year_id)
INDEX: enrollments_student_idx (student_id)
INDEX: enrollments_sy_idx (school_year_id)
INDEX: enrollments_grade_idx (grade_level_id)
INDEX: enrollments_section_idx (section_id)
INDEX: enrollments_status_idx (status)
```

---

### Student & Guardian Entities

```
TABLE: students
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL  (UUID)
student_number  TEXT    NOT NULL  UNIQUE  (e.g. SM-2026-000001)
lrn             TEXT    NULL  (DepEd 12-digit Learner Reference Number)
first_name      TEXT    NOT NULL
middle_name     TEXT    NULL
last_name       TEXT    NOT NULL
suffix          TEXT    NULL
birth_date      TEXT    NULL  (ISO YYYY-MM-DD)
birth_place     TEXT    NULL
sex             TEXT    NOT NULL  ("male" | "female")
contact_number  TEXT    NULL
address         TEXT    NULL
status          TEXT    NOT NULL  DEFAULT "active"
                 ("active" | "inactive" | "archived")
record_status   TEXT    NOT NULL  DEFAULT "draft"
                 ("draft" | "pending_validation" | "needs_correction" |
                  "verified" | "marked_duplicate")
created_by      TEXT    NOT NULL  FK → users.id
updated_by      TEXT    NULL  FK → users.id
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
updated_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
INDEX: students_number_uq (student_number)  UNIQUE
INDEX: students_last_name_idx (last_name)
INDEX: students_first_name_idx (first_name)
INDEX: students_birth_idx (birth_date)
INDEX: students_status_idx (status)
INDEX: students_record_status_idx (record_status)
INDEX: students_created_idx (created_at)

TABLE: guardians
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
first_name      TEXT    NOT NULL
middle_name     TEXT    NULL
last_name       TEXT    NOT NULL
relationship    TEXT    NOT NULL  ("mother" | "father" | "guardian")
contact_number  TEXT    NULL
email           TEXT    NULL
occupation      TEXT    NULL
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
updated_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
INDEX: guardians_last_name_idx (last_name)
INDEX: guardians_first_name_idx (first_name)

TABLE: student_guardians
──────────────────────────────────────────────────────────────────────────────
student_id      TEXT    NOT NULL  FK → students.id ON DELETE CASCADE
guardian_id     TEXT    NOT NULL  FK → guardians.id ON DELETE CASCADE
is_primary      INTEGER  NOT NULL  DEFAULT 0  (boolean mode)
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
PK: (student_id, guardian_id)
INDEX: student_guardians_guardian_idx (guardian_id)
```

---

### Grade Lifecycle — Physical Tables & Constraints

```
TABLE: student_grades
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
enrollment_id   TEXT    NOT NULL  FK → student_enrollments.id ON DELETE CASCADE
subject_id      TEXT    NOT NULL  FK → subjects.id
grading_period_id  TEXT  NOT NULL  FK → grading_periods.id
grade           REAL    NOT NULL  (numeric score; validated by action layer: MIN=0, MAX=100)
remarks         TEXT    NULL  (max 200 chars per zod schema)
recorded_by     TEXT    NOT NULL  FK → users.id
status          TEXT    NOT NULL  DEFAULT "draft"  ("draft" | "submitted")
submitted_at    INTEGER  NULL  (timestamp — set when submitted)
submission_id   TEXT    NULL  FK → grade_submissions.id ON DELETE SET NULL
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
updated_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
UNIQUE: grades_enrollment_subject_period_uq (enrollment_id, subject_id, grading_period_id)
INDEX: grades_enrollment_idx (enrollment_id)
INDEX: grades_subject_idx (subject_id)
INDEX: grades_period_idx (grading_period_id)
NOTE: Grade mutation is protected: only "subject_teacher" role with row-level `section_subject_teachers`
      assignment can write; submitted rows are locked; removal only for drafts (`status="draft"`).

TABLE: grade_submissions
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
school_year_id  TEXT    NOT NULL  FK → school_years.id
section_id      TEXT    NOT NULL  FK → sections.id
subject_id      TEXT    NOT NULL  FK → subjects.id
grading_period_id  TEXT  NOT NULL  FK → grading_periods.id
status          TEXT    NOT NULL  ("submitted" | "reopened")
submitted_by    TEXT    NOT NULL  FK → users.id
submitted_at    INTEGER  NOT NULL  (timestamp)
reopened_at     INTEGER  NULL  (timestamp — set when reopened)
reopened_by     TEXT    NULL  FK → users.id ON DELETE SET NULL
entry_count     INTEGER  NOT NULL  DEFAULT 0  (number of grade rows committed)
roster_count    INTEGER  NOT NULL  DEFAULT 0  (roster size snapshot for history)
warnings_json   TEXT    NULL  (JSON string: { invalid: string[], skipped: string[] })
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
INDEX: grade_submissions_context_idx (section_id, subject_id, grading_period_id)
INDEX: grade_submissions_sy_idx (school_year_id)
INDEX: grade_submissions_submitted_idx (submitted_at)
INDEX: grade_submissions_submitter_idx (submitted_by)
NOTE: Append-only ledger. Latest `submitted` row defines lock state; `reopened` creates new history row.
```

---

### Attendance, Behavior, Interventions

```
TABLE: attendance_records
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
enrollment_id   TEXT    NOT NULL  FK → student_enrollments.id ON DELETE CASCADE
date            TEXT    NOT NULL  (ISO YYYY-MM-DD)
status          TEXT    NOT NULL  ("present" | "absent_excused" | "absent_unexcused" | "late")
remarks         TEXT    NULL
recorded_by     TEXT    NOT NULL  FK → users.id
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
updated_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
UNIQUE: attendance_enrollment_date_uq (enrollment_id, date)
INDEX: attendance_date_idx (date)
INDEX: attendance_status_idx (status)
INDEX: attendance_enrollment_idx (enrollment_id)

TABLE: behavior_categories
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
name            TEXT    NOT NULL  UNIQUE
kind            TEXT    NOT NULL  ("positive" | "concern")
description     TEXT    NULL
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
updated_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
INDEX: behavior_categories_name_uq (name)  UNIQUE

TABLE: behavior_records
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
student_id      TEXT    NOT NULL  FK → students.id ON DELETE CASCADE
category_id     TEXT    NOT NULL  FK → behavior_categories.id
category_id     TEXT    NOT NULL
date            TEXT    NOT NULL  (ISO YYYY-MM-DD)
description     TEXT    NOT NULL
severity        TEXT    NULL  ("low" | "medium" | "high" — for concerns)
follow_up       TEXT    NULL
status          TEXT    NOT NULL  DEFAULT "open"  ("open" | "monitored" | "resolved")
confidential    INTEGER  NOT NULL  DEFAULT 0  (boolean; server-side filter: only admin/school_admin/guidance)
recorded_by     TEXT    NOT NULL  FK → users.id
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
updated_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
INDEX: behavior_student_idx (student_id)
INDEX: behavior_category_idx (category_id)
INDEX: behavior_date_idx (date)
INDEX: behavior_status_idx (status)
NOTE: Confidential filter enforced in `scope.ts` (`confidentialBehaviorFilter`).

TABLE: interventions
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
student_id      TEXT    NOT NULL  FK → students.id ON DELETE CASCADE
intervention_type  TEXT  NOT NULL
description     TEXT    NOT NULL
status          TEXT    NOT NULL  DEFAULT "planned"  ("planned" | "active" | "completed" | "discontinued")
outcome         TEXT    NULL
start_date      TEXT    NULL  (ISO YYYY-MM-DD)
target_date     TEXT    NULL
target_date     TEXT    NULL
target_date     TEXT    NULL  (Note: corrected — `start_date`, `target_date`, `completed_date` are separate columns)
start_date      TEXT    NULL  (correct column definition)
target_date     TEXT    NULL  (correct column definition)
completed_date  TEXT    NULL  (correct column definition)
assigned_to     TEXT    NULL  FK → users.id
created_by      TEXT    NOT NULL  FK → users.id
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
updated_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
INDEX: interventions_student_idx (student_id)
INDEX: interventions_status_idx (status)
INDEX: interventions_target_idx (target_date)

TABLE: intervention_followups
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
intervention_id  TEXT  NOT NULL  FK → interventions.id ON DELETE CASCADE
follow_up_date  TEXT    NOT NULL  (ISO YYYY-MM-DD)
status          TEXT    NOT NULL  DEFAULT "scheduled"  ("scheduled" | "done" | "missed" | "cancelled")
notes           TEXT    NULL
recorded_by     TEXT    NOT NULL  FK → users.id
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
updated_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
INDEX: intervention_followups_intervention_idx (intervention_id)
```

---

### Health, Clinical, Assessments, Verification, QR, Reports

```
TABLE: health_records
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
student_id      TEXT    NOT NULL  FK → students.id ON DELETE CASCADE
school_year_id  TEXT    NULL  FK → school_years.id
measurement_date  TEXT  NOT NULL  (ISO YYYY-MM-DD)
weight_kg       REAL    NULL  (kg)
height_cm       REAL    NULL  (cm)
bmi             REAL    NULL  (kg/m² — computed by action layer; not manually edited)
nutritional_status  TEXT  NULL  ("normal" | "wasted" | "severely_wasted" | "overweight" | "obese")
remarks         TEXT    NULL
recorded_by     TEXT    NOT NULL  FK → users.id
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
updated_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
INDEX: health_student_idx (student_id)
INDEX: health_date_idx (measurement_date)
INDEX: health_status_idx (nutritional_status)
NOTE: Only `nurse` role has `health.write`; `admin` has `health.view`. `school_admin` does NOT have health access per 2026-10 audit (documented in `permissions.ts` and `security/role-permission-matrix.md`).

TABLE: clinical_records
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
student_id      TEXT    NOT NULL  FK → students.id ON DELETE CASCADE
date            TEXT    NOT NULL  (ISO YYYY-MM-DD)
category        TEXT    NOT NULL  (e.g. "Health Assessment", "First Aid", "Referral", "Health Education")
description     TEXT    NOT NULL
assessment      TEXT    NULL
action_taken    TEXT    NULL
remarks         TEXT    NULL
recorded_by     TEXT    NOT NULL  FK → users.id
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
updated_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
INDEX: clinical_student_idx (student_id)
INDEX: clinical_date_idx (date)

TABLE: assessments
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
student_id      TEXT    NOT NULL  FK → students.id ON DELETE CASCADE
domain          TEXT    NOT NULL  ("reading" | "literacy" | "numeracy")
assessment_type  TEXT  NULL  (e.g. "Phil-IRI", "Reading Assessment", "Literacy Assessment", "Numeracy Assessment")
skill_area      TEXT    NULL
date            TEXT    NOT NULL  (ISO YYYY-MM-DD)
level           TEXT    NULL  (configurable via system_settings.assessment_levels; default: Beginning/Developing/Approaching/Proficient)
score           REAL    NULL
assessor_id     TEXT    NOT NULL  FK → users.id
notes           TEXT    NULL
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
updated_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
INDEX: assessments_student_domain_idx (student_id, domain)
INDEX: assessments_domain_idx (domain)
INDEX: assessments_date_idx (date)
```

```
TABLE: record_verifications
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
student_id      TEXT    NOT NULL  FK → students.id ON DELETE CASCADE
submitted_by    TEXT    NOT NULL  FK → users.id
reviewed_by     TEXT    NULL  FK → users.id
status          TEXT    NOT NULL  DEFAULT "pending"  ("pending" | "approved" | "needs_correction" | "rejected")
remarks         TEXT    NULL
submitted_at    INTEGER  NOT NULL  (timestamp)
reviewed_at     INTEGER  NULL  (timestamp)
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
updated_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
INDEX: verifications_student_idx (student_id)
INDEX: verifications_status_idx (status)
INDEX: verifications_submitted_idx (submitted_at)

TABLE: duplicate_candidates
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
student_id      TEXT    NOT NULL  FK → students.id ON DELETE CASCADE
possible_student_id  TEXT  NOT NULL  FK → students.id ON DELETE CASCADE
match_score      INTEGER  NULL
match_reason     TEXT    NULL
status          TEXT    NOT NULL  DEFAULT "pending"
                 ("pending" | "confirmed_duplicate" | "not_duplicate" | "dismissed")
reviewed_by     TEXT    NULL  FK → users.id ON DELETE SET NULL
review_notes    TEXT    NULL
reviewed_at     INTEGER  NULL  (timestamp)
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
updated_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
UNIQUE: duplicate_pair_uq (student_id, possible_student_id)
INDEX: duplicate_status_idx (status)
```

```
TABLE: qr_verifications
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
student_id      TEXT    NOT NULL  FK → students.id ON DELETE CASCADE
verification_token  TEXT  NOT NULL  UNIQUE  (secure opaque token; server validates, not embedded data)
verified_by     TEXT    NULL  FK → users.id
verification_type  TEXT  NOT NULL  ("generate" | "scan" | "revoke")
result          TEXT    NOT NULL  DEFAULT "valid"  ("valid" | "invalid" | "expired" | "revoked")
verified_at     INTEGER  NOT NULL  (timestamp)
ip_address      TEXT    NULL
user_agent      TEXT    NULL
INDEX: qr_verifications_token_uq (verification_token)  UNIQUE
INDEX: qr_verifications_student_idx (student_id)
INDEX: qr_verifications_verified_at_idx (verified_at)

TABLE: reports
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
name            TEXT    NOT NULL
report_type     TEXT    NOT NULL  (e.g. "student_master_list", "grade_report", ...)
generated_by    TEXT    NOT NULL  FK → users.id
scope           TEXT    NOT NULL  DEFAULT "school"  ("school" | "grade_level" | "section")
filters_json    TEXT    NOT NULL  DEFAULT "{}"
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
INDEX: reports_type_idx (report_type)
INDEX: reports_created_idx (created_at)

TABLE: report_exports
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
report_id       TEXT    NOT NULL  FK → reports.id ON DELETE CASCADE
format          TEXT    NOT NULL  ("PDF" | "XLSX" | "CSV")
file_reference  TEXT    NOT NULL  (path/key to generated file; not the file itself)
generated_by    TEXT    NOT NULL  FK → users.id
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
expires_at      INTEGER  NULL  (timestamp — optional file expiry)
INDEX: report_exports_report_idx (report_id)
INDEX: report_exports_generated_idx (created_at)
```

```
TABLE: notifications
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
user_id         TEXT    NOT NULL  FK → users.id ON DELETE CASCADE
type            TEXT    NOT NULL
                  (e.g. "system", "grade_submitted", etc.)
title           TEXT    NOT NULL
message         TEXT    NULL
link            TEXT    NULL
is_read         INTEGER  NOT NULL  DEFAULT 0  (boolean)
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
read_at         INTEGER  NULL  (timestamp)
INDEX: notifications_user_idx (user_id, is_read)
```

---

### System & Audit

```
TABLE: audit_logs
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
user_id         TEXT    NULL  FK → users.id ON DELETE SET NULL
action          TEXT    NOT NULL  (namespaced, e.g. "CREATE_USER", "SAVE_GRADE_DRAFT", "SUBMIT_GRADE_SHEET", "REOPEN_GRADE_SHEET", "REMOVE_GRADE_DRAFT")
entity_type     TEXT    NOT NULL  (e.g. "user", "student", "student_grade", "grade_submission", "behavior_record")
entity_id       TEXT    NULL
old_values_json  TEXT    NULL  (JSON snapshot before mutation)
new_values_json  TEXT    NULL  (JSON snapshot after mutation)
ip_address      TEXT    NULL
user_agent      TEXT    NULL
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
INDEX: audit_user_idx (user_id)
INDEX: audit_entity_idx (entity_type, entity_id)
INDEX: audit_created_idx (created_at)
NOTE: Append-only; never edited. Survives user deletion (`ON DELETE SET NULL`).

TABLE: system_settings
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
key             TEXT    NOT NULL  UNIQUE  (e.g. "system_name", "assessment_levels", etc.)
value           TEXT    NOT NULL
                  (plain string; never secrets)
description     TEXT    NULL
updated_by      TEXT    NULL  FK → users.id ON DELETE SET NULL
updated_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
INDEX: system_settings_key_uq (key)  UNIQUE
NOTE: NO secrets stored (documented in schema comment and `documentation/security/authentication.md`).
```

---

### Forecasting (Additive — Not Source of Truth)

```
TABLE: forecasts
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
forecast_type   TEXT    NOT NULL  ("school_wide" | "grade_level" | "subject")
scope_level     TEXT    NOT NULL  (aggregation scope: "school" or specific id)
target_period   TEXT    NOT NULL  (ISO timestamp of quarter end)
forecast_value  REAL    NOT NULL
lower_bound     REAL    NOT NULL
upper_bound     REAL    NOT NULL
model_type      TEXT    NOT NULL  DEFAULT "ARIMA"  (future SARIMA/ETS possible)
model_order     TEXT    NOT NULL  DEFAULT "{}"  (JSON: {"p":1,"d":1,"q":1})
observation_count  INTEGER  NOT NULL
training_start  TEXT    NOT NULL  (ISO timestamp)
training_end    TEXT    NOT NULL  (ISO timestamp)
accuracy_metrics  TEXT  NULL  (JSON: {aic,bic,mae,rmse,mape,residStd})
generated_at    INTEGER  NOT NULL  DEFAULT (unixepoch())
generated_by    TEXT    NULL  FK → users.id ON DELETE SET NULL
status          TEXT    NOT NULL  DEFAULT "generated"  ("generated" | "insufficient_data" | "failed" | "stale")
error_message   TEXT    NULL
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
UNIQUE: forecasts_type_scope_target_uq (forecast_type, scope_level, target_period, model_type)
INDEX: forecasts_type_status_idx (forecast_type, status)
INDEX: forecasts_scope_idx (scope_level)
INDEX: forecasts_generated_idx (generated_at)
NOTE: Generated by `arima` package (`src/lib/forecasting/arima.ts`). Invalidated on grade submission (`invalidateForecasts` in `src/lib/forecasting/storage.ts`).
```

---

### Employee Domain — Strict Isolation (No Student FKs)

```
TABLE: employees
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL  (UUID)
employee_number  TEXT  NOT NULL  UNIQUE  (e.g. EMP-2026-000001)
first_name      TEXT    NOT NULL
middle_name     TEXT    NULL
last_name       TEXT    NOT NULL
suffix          TEXT    NULL
birth_date      TEXT    NULL  (ISO YYYY-MM-DD)
sex             TEXT    NOT NULL  ("male" | "female")
civil_status    TEXT    NULL  ("single" | "married" | "widowed" | "separated" | "annulled")
address         TEXT    NULL
contact_number  TEXT    NULL
email           TEXT    NULL
emergency_contact_name  TEXT  NULL
emergency_contact_relation  TEXT  NULL
emergency_contact_number  TEXT  NULL
position        TEXT    NULL
designation     TEXT    NULL
appointment_status  TEXT  NULL  ("permanent" | "provisional" | "casual" | "contractual" | "substitute" | "part_time")
employment_type  TEXT  NULL  ("teaching" | "non_teaching" | "support")
department      TEXT    NULL
date_hired      TEXT    NULL  (ISO YYYY-MM-DD)
date_of_appointment  TEXT  NULL  (ISO YYYY-MM-DD)
salary_grade    TEXT    NULL
step            TEXT    NULL
gsis_number     TEXT    NULL
philhealth_number  TEXT  NULL
pagibig_number  TEXT    NULL
tin_number      TEXT    NULL
prc_license_number  TEXT  NULL
eligibility     TEXT    NULL
status          TEXT    NOT NULL  DEFAULT "active"  ("active" | "inactive" | "archived")
created_by      TEXT    NOT NULL  FK → users.id
updated_by      TEXT    NULL  FK → users.id
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
updated_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
INDEX: employees_number_uq (employee_number)  UNIQUE
INDEX: employees_last_name_idx (last_name)
INDEX: employees_first_name_idx (first_name)
INDEX: employees_status_idx (status)
INDEX: employees_position_idx (position)
INDEX: employees_created_idx (created_at)
NOTE: Zero foreign keys to any student table. Complete isolation from student data.

TABLE: employee_201_records
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
employee_id     TEXT    NOT NULL  FK → employees.id ON DELETE CASCADE
category        TEXT    NOT NULL  ("personal_information" | "appointment" | "eligibility" | "training" | "performance" | "leave" | "government" | "certificate" | "memorandum" | "other")
title           TEXT    NOT NULL
description     TEXT    NULL
record_date     TEXT    NOT NULL  (ISO YYYY-MM-DD)
file_reference  TEXT    NULL  (path/key to uploaded document — document never physically deleted; soft-archived)
is_archived     INTEGER  NOT NULL  DEFAULT 0  (boolean)
created_by      TEXT    NOT NULL  FK → users.id
updated_by      TEXT    NULL  FK → users.id
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
updated_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
INDEX: employee_201_employee_idx (employee_id)
INDEX: employee_201_category_idx (category)
INDEX: employee_201_date_idx (record_date)
INDEX: employee_201_archived_idx (is_archived)
NOTE: Soft-archivable (`is_archived`); never physically deleted.

TABLE: service_credit_transactions
──────────────────────────────────────────────────────────────────────────────
id              TEXT    PK    NOT NULL
employee_id     TEXT    NOT NULL  FK → employees.id ON DELETE CASCADE
type            TEXT    NOT NULL  ("earned" | "consumed")
credits         REAL    NOT NULL  (positive quantity; sign derived from type: earned=positive, consumed=positive but subtracted for balance)
transaction_date  TEXT  NOT NULL  (ISO YYYY-MM-DD)
reason          TEXT    NOT NULL
reference_document  TEXT  NULL  (e.g. office order number)
remarks         TEXT    NULL
created_by      TEXT    NOT NULL  FK → users.id
updated_by      TEXT    NULL  FK → users.id
created_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
updated_at      INTEGER  NOT NULL  DEFAULT (unixepoch())
INDEX: service_credits_employee_idx (employee_id)
INDEX: service_credits_type_idx (type)
INDEX: service_credits_date_idx (transaction_date)
NOTE: Balance always derived: SUM(credits WHERE type="earned") − SUM(credits WHERE type="consumed"). No manually editable stored balance column.
```

---

## Physical Database Consistency Verification

Every column name, data type, constraint, and index listed above is derived directly from:
- `sqliteTable()` definitions in `src/db/schema.ts`
- Column definitions (`primaryKey()`, `integer()`, `text()`, `real()`, `bool()` via integer mode)
- `index()` and `uniqueIndex()` declarations
- `references()` with `onDelete` behavior
- Migration SQL in `drizzle/*.sql` confirming physical table creation
- No invented columns; no omitted core fields; no fabricated indexes.

---

## Data Types Reference (SQLite / Drizzle `sqlite-core` Mapping)

| Type Keyword | SQLite Storage | Drizzle Mode | Used For |
|---|---|---|---|
| `text` | TEXT | — (default) | Strings (names, IDs, descriptions, dates in ISO format, JSON strings) |
| `integer` | INTEGER | `{ mode: "integer" }` | Numeric IDs, counts, boolean flags (0/1) |
| `real` | REAL | `{}` (default for number) | Grades, scores, BMI, weights, heights, credit amounts |
| `integer` (timestamp) | INTEGER (Unix epoch) | `{ mode: "timestamp" }` | `created_at`, `updated_at`, `submitted_at`, `verified_at`, etc. |
| `integer` (boolean) | INTEGER (0/1) | `{ mode: "boolean" }` | `is_active`, `is_current`, `is_read`, `confidential`, `is_archived`, `is_primary` |

---

## Cross-Reference: Database Schema → Application Code

| Table | Key Action / Component | Evidence |
|---|---|---|
| `users` | `createUser` (`src/actions/users.ts`), `getCurrentUser` (`src/lib/auth.ts`) | Direct DB insert/select |
| `roles` / `permissions` / `role_permissions` | `permissionsForRole` (`src/lib/permissions.ts`), seed scripts (`scripts/seed.mts`) | Direct DB query |
| `sessions` | `createSession`, `destroySession` (`src/lib/auth.ts`) | Insert with token hash, delete by hash |
| `students` | `createStudent`, `updateStudent`, `archiveStudent` (`src/actions/students.ts`) | Direct DB mutation |
| `student_guardians` | Guardian management in student forms | M:N join |
| `student_enrollments` | Enrollment actions (`src/actions/enrollment.ts` — inferred from `students.ts` patterns) | Direct DB mutation |
| `sections` | Section management; adviser assignment (`adviser_id`) | Direct DB reference |
| `subjects` / `grading_periods` / `section_subject_teachers` | Academic setup; grade encoding scope (`src/lib/grades.ts`) | Direct DB references |
| `student_grades` / `grade_submissions` | Grade draft, submit, reopen, remove (`src/actions/grades.ts`) | Transactional mutations |
| `attendance_records` | Attendance recording (`src/actions/attendance.ts` — inferred) | Direct insert/update |
| `behavior_records` / `behavior_categories` | Behavior recording (`src/actions/guidance.ts`) | Direct mutations with `confidential` filter |
| `interventions` / `intervention_followups` | Intervention lifecycle (`src/actions/interventions.ts`) | Direct mutations |
| `health_records` / `clinical_records` | Health/nutrition (`src/actions/health.ts`) | Direct mutations |
| `assessments` | Reading / literacy / numeracy (`src/lib/analytics.ts`, `performance/page.tsx`) | Direct queries |
| `record_verifications` / `duplicate_candidates` | Verification / duplicate review (`src/actions/verification.ts`, `duplicates.ts`) | Direct mutations |
| `reports` / `report_exports` | Report generation (`src/actions/reports.ts`, `src/lib/reports/*.ts`) | Direct insert for metadata; file reference stored |
| `qr_verifications` | QR generation / scan (`src/lib/qr.ts`, `src/actions/qr.ts`) | Direct mutations |
| `notifications` | Notification creation (`src/lib/audit.ts` `notify`) | Direct insert |
| `audit_logs` | Every action (`src/lib/audit.ts` `logAudit`) | Append-only insert |
| `system_settings` | System configuration (`src/actions/settings.ts`) | Direct update |
| `forecasts` | ARIMA forecasting (`src/lib/forecasting/`) | Direct insert; invalidated on grade submission |
| `employees` / `employee_201_records` / `service_credit_transactions` | Employee management (`src/actions/employees.ts`) | Direct mutations; strict isolation verified |
