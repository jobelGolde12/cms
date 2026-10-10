# Turso Database Schema — CMS

**Database URL:** `libsql://cms-sirjobel.aws-ap-northeast-1.turso.io`  
**Dialect:** SQLite (Turso / libSQL)  
**Dialect config:** `turso`  
**Connection:** Cloud-hosted Turso database (aws-ap-northeast-1 region)  
**Schema source:** Retrieved via `turso db shell` (`.schema`) on 2026-10-10

---

## Overview

This schema supports a multi-module CMS (Content / Student Management System) with the following major domains:

| Domain | Key Tables |
|---|---|
| **Users & Auth** | `users`, `roles`, `permissions`, `role_permissions`, `sessions`, `audit_logs` |
| **Organization / Geography** | `municipalities`, `barangays`, `schools` |
| **Students** | `students`, `guardians`, `student_guardians` |
| **Child / Early Childhood** | `children`, `child_addresses`, `child_disabilities`, `child_eccd`, `child_education`, `child_monitoring`, `child_validations`, `child_duplicate_candidates` |
| **Enrollment & Grades** | `school_years`, `grade_levels`, `sections`, `student_enrollments`, `subjects`, `grading_periods`, `student_grades`, `attendance_records` |
| **Behavior & Interventions** | `behavior_categories`, `behavior_records`, `interventions`, `intervention_followups` |
| **Assessments** | `assessments` |
| **Records & Verification** | `record_verifications`, `qr_verifications`, `duplicate_candidates` |
| **Reports & Notifications** | `reports`, `report_exports`, `notifications` |
| **System** | `system_settings`, `__drizzle_migrations` |

---

## Tables

### `__drizzle_migrations`
Migration tracking table used by Drizzle ORM.

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL | PK |
| `hash` | text NOT NULL | Migration hash |
| `created_at` | numeric | Timestamp |

---

### `users`
System users with role-based access.

| Column | Type | Constraints / Default |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `role_id` | text NOT NULL | FK → `roles(id)` |
| `barangay_id` | text | FK → `barangays(id)` |
| `first_name` | text NOT NULL | — |
| `middle_name` | text | — |
| `last_name` | text NOT NULL | — |
| `email` | text NOT NULL | Unique (`users_email_uq`) |
| `password_hash` | text NOT NULL | — |
| `phone` | text | — |
| `is_active` | integer | DEFAULT `true` |
| `last_login_at` | integer | — |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

**Indexes:** `users_email_uq`, `users_email_idx`, `users_role_idx`, `users_barangay_idx`, `users_active_idx`

---

### `roles`
User roles (e.g., admin, school, barangay, lgu, teacher, records, guidance).

| Column | Type | Notes |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `name` | text NOT NULL | Unique (`roles_name_uq`) |
| `description` | text | — |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

---

### `permissions`
Granular permissions by module and action.

| Column | Type | Notes |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `name` | text NOT NULL | Unique (`permissions_name_uq`) |
| `description` | text | — |
| `module` | text NOT NULL | — |
| `action` | text NOT NULL | — |
| `created_at` | integer | DEFAULT `(unixepoch())` |

---

### `role_permissions`
Many-to-many link between roles and permissions.

| Column | Type | Constraints |
|---|---|---|
| `role_id` | text NOT NULL | PK, FK → `roles(id)` ON DELETE CASCADE |
| `permission_id` | text NOT NULL | PK, FK → `permissions(id)` ON DELETE CASCADE |
| `created_at` | integer | DEFAULT `(unixepoch())` |

**Indexes:** `role_permissions_role_idx`, `role_permissions_permission_idx`

---

### `sessions`
User session tokens.

| Column | Type | Notes |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `token_hash` | text NOT NULL | Unique (`sessions_token_hash_uq`) |
| `user_id` | text NOT NULL | FK → `users(id)` |
| `expires_at` | integer | — |
| `ip` | text | — |
| `user_agent` | text | — |
| `created_at` | integer | DEFAULT `(unixepoch())` |

---

### `audit_logs`
Audit trail for user actions.

| Column | Type | Notes |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `user_id` | text | FK → `users(id)` ON DELETE SET NULL |
| `action` | text NOT NULL | — |
| `entity_type` | text NOT NULL | — |
| `entity_id` | text | — |
| `old_values_json` | text | — |
| `new_values_json` | text | — |
| `ip_address` | text | — |
| `user_agent` | text | — |
| `created_at` | integer | DEFAULT `(unixepoch())` |

**Indexes:** `audit_user_idx`, `audit_entity_idx`, `audit_created_idx`

---

### `municipalities`
Higher-level geographic division.

| Column | Type | Notes |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `name` | text NOT NULL | — |
| `province` | text NOT NULL | — |
| `region` | text NOT NULL | — |
| `short_name` | text | — |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

---

### `barangays`
Barangays (villages) linked to municipalities.

| Column | Type | Notes |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `municipality_id` | text | FK → `municipalities(id)` |
| `name` | text NOT NULL | Unique (`barangays_name_uq`) |
| `code` | text | Unique (`barangays_code_uq`) |
| `is_active` | integer | DEFAULT `true` |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

**Indexes:** `barangays_name_uq`, `barangays_code_uq`, `barangays_municipality_idx`

---

### `schools`
School institutions linked to barangays.

| Column | Type | Notes |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `barangay_id` | text | FK → `barangays(id)` |
| `name` | text NOT NULL | Unique (`schools_name_uq`) |
| `school_code` | text | Unique (`schools_code_uq`) |
| `school_type` | text | DEFAULT `'elementary'` |
| `address` | text | — |
| `is_active` | integer | DEFAULT `true` |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

**Indexes:** `schools_name_uq`, `schools_code_uq`, `schools_barangay_idx`

---

### `system_settings`
Application-level settings.

| Column | Type | Notes |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `key` | text NOT NULL | Unique (`system_settings_key_uq`) |
| `value` | text NOT NULL | — |
| `description` | text | — |
| `updated_by` | text | FK → `users(id)` ON DELETE SET NULL |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

---

### `students`
Main student / pupil records.

| Column | Type | Notes |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `student_number` | text NOT NULL | Unique (`students_number_uq`) |
| `first_name` | text NOT NULL | — |
| `middle_name` | text | — |
| `last_name` | text NOT NULL | — |
| `suffix` | text | — |
| `birth_date` | text NOT NULL | — |
| `sex` | text NOT NULL | — |
| `contact_number` | text | — |
| `address` | text | — |
| `status` | text | DEFAULT `'active'` |
| `record_status` | text | DEFAULT `'draft'` |
| `created_by` | text NOT NULL | — |
| `updated_by` | text | — |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

**Indexes:** `students_number_uq`, `students_last_name_idx`, `students_first_name_idx`, `students_birth_idx`, `students_status_idx`, `students_record_status_idx`, `students_created_idx`

---

### `guardians`
Student guardians / parents.

| Column | Type | Notes |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `first_name` | text NOT NULL | — |
| `middle_name` | text | — |
| `last_name` | text NOT NULL | — |
| `relationship` | text NOT NULL | — |
| `contact_number` | text | — |
| `email` | text | — |
| `occupation` | text | — |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

---

### `student_guardians`
Link table between students and guardians.

| Column | Type | Constraints |
|---|---|---|
| `student_id` | text NOT NULL | PK, FK → `students(id)` ON DELETE CASCADE |
| `guardian_id` | text NOT NULL | PK, FK → `guardians(id)` ON DELETE CASCADE |
| `is_primary` | integer | DEFAULT `false` |
| `created_at` | integer | DEFAULT `(unixepoch())` |

**Index:** `student_guardians_guardian_idx`

---

### `children`
Early childhood / child development records.

| Column | Type | Notes |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `child_code` | text NOT NULL | — |
| `first_name` | text NOT NULL | — |
| `middle_name` | text | — |
| `last_name` | text NOT NULL | — |
| `suffix` | text | — |
| `birth_date` | text NOT NULL | — |
| `sex` | text NOT NULL | — |
| `civil_status` | text | — |
| `birth_place` | text | — |
| `barangay_id` | text NOT NULL | FK → `barangays(id)` |
| `status` | text | DEFAULT `'active'` |
| `record_status` | text | DEFAULT `'draft'` |
| `created_by` | text NOT NULL | — |
| `updated_by` | text | — |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

---

### `child_addresses`
Child address records.

| Column | Type | Constraints |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `child_id` | text NOT NULL | FK → `children(id)` ON DELETE CASCADE |
| `barangay_id` | text NOT NULL | FK → `barangays(id)` |
| `household_address` | text NOT NULL | — |
| `sitio` | text | — |
| `is_current` | integer | DEFAULT `true` |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

**Indexes:** `child_addresses_child_idx`, `child_addresses_barangay_idx`

---

### `child_disabilities`
Disability tracking for children.

| Column | Type | Constraints |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `child_id` | text NOT NULL | FK → `children(id)` ON DELETE CASCADE |
| `has_disability` | integer | DEFAULT `false` |
| `disability_type` | text | — |
| `description` | text | — |
| `support_needed` | text | — |
| `assistance_status` | text | — |
| `verified` | integer | DEFAULT `false` |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

**Index:** `child_disabilities_child_idx`

---

### `child_eccd`
Early Childhood Care and Development (ECCD) participation.

| Column | Type | Constraints |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `child_id` | text NOT NULL | FK → `children(id)` ON DELETE CASCADE |
| `participation_status` | text NOT NULL | — |
| `program_name` | text | — |
| `provider` | text | — |
| `start_date` | text | — |
| `end_date` | text | — |
| `remarks` | text | — |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

**Index:** `child_eccd_child_idx`

---

### `child_education`
Child education records linked to schools.

| Column | Type | Constraints |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `child_id` | text NOT NULL | FK → `children(id)` ON DELETE CASCADE |
| `school_id` | text | FK → `schools(id)` |
| `education_status` | text NOT NULL | — |
| `grade_level` | text | — |
| `school_year` | text | — |
| `enrollment_status` | text | — |
| `is_current` | integer | DEFAULT `true` |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

**Indexes:** `child_education_child_idx`, `child_education_school_idx`, `child_education_status_idx`, `child_education_sy_idx`

---

### `child_monitoring`
Child monitoring entries.

| Column | Type | Constraints |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `child_id` | text NOT NULL | FK → `children(id)` ON DELETE CASCADE |
| `monitoring_type` | text NOT NULL | — |
| `status` | text | DEFAULT `'open'` |
| `observed_at` | integer | — |
| `recorded_by` | text NOT NULL | — |
| `remarks` | text | — |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

---

### `child_validations`
Child record validation / review workflow.

| Column | Type | Constraints |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `child_id` | text NOT NULL | FK → `children(id)` ON DELETE CASCADE |
| `submitted_by` | text NOT NULL | FK → `users(id)` |
| `reviewed_by` | text | FK → `users(id)` |
| `status` | text | DEFAULT `'pending'` |
| `remarks` | text | — |
| `submitted_at` | integer NOT NULL | — |
| `reviewed_at` | integer | — |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

---

### `interventions`
Child interventions.

| Column | Type | Constraints |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `child_id` | text NOT NULL | FK → `children(id)` ON DELETE CASCADE |
| `intervention_type` | text NOT NULL | — |
| `description` | text NOT NULL | — |
| `status` | text | DEFAULT `'planned'` |
| `priority` | text | — |
| `start_date` | text | — |
| `target_date` | text | — |
| `completed_date` | text | — |
| `assigned_to` | text | FK → `users(id)` |
| `created_by` | text NOT NULL | FK → `users(id)` |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

**Indexes:** `interventions_child_idx`, `interventions_status_idx`, `interventions_target_idx`

---

### `intervention_followups`
Follow-up records for interventions.

| Column | Type | Constraints |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `intervention_id` | text NOT NULL | FK → `interventions(id)` ON DELETE CASCADE |
| `follow_up_date` | text NOT NULL | — |
| `status` | text | DEFAULT `'scheduled'` |
| `notes` | text | — |
| `recorded_by` | text NOT NULL | FK → `users(id)` |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

**Index:** `intervention_followups_intervention_idx`

---

### `behavior_categories`
Behavior classification types.

| Column | Type | Notes |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `name` | text NOT NULL | Unique (`behavior_categories_name_uq`) |
| `kind` | text NOT NULL | — |
| `description` | text | — |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

---

### `behavior_records`
Student behavior incident records.

| Column | Type | Constraints |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `student_id` | text NOT NULL | FK → `students(id)` ON DELETE CASCADE |
| `category_id` | text NOT NULL | FK → `behavior_categories(id)` |
| `date` | text NOT NULL | — |
| `description` | text NOT NULL | — |
| `severity` | text | — |
| `follow_up` | text | — |
| `status` | text | DEFAULT `'open'` |
| `recorded_by` | text NOT NULL | FK → `users(id)` |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

**Indexes:** `behavior_student_idx`, `behavior_category_idx`, `behavior_date_idx`, `behavior_status_idx`

---

### `school_years`
Academic years.

| Column | Type | Notes |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `year` | text NOT NULL | Unique (`school_years_year_uq`) |
| `start_date` | text | — |
| `end_date` | text | — |
| `is_current` | integer | DEFAULT `false` |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

**Indexes:** `school_years_year_uq`, `school_years_current_idx`

---

### `grade_levels`
Grade level definitions (e.g., Grade 1, Grade 2).

| Column | Type | Notes |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `name` | text NOT NULL | — |
| `order_index` | integer NOT NULL | — |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

---

### `sections`
Class sections per school year / grade level.

| Column | Type | Constraints |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `school_year_id` | text NOT NULL | FK → `school_years(id)` |
| `grade_level_id` | text NOT NULL | FK → `grade_levels(id)` |
| `name` | text NOT NULL | — |
| `adviser_id` | text | FK → `users(id)` ON DELETE SET NULL |
| `is_active` | integer | DEFAULT `true` |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

**Unique Index:** `sections_sy_grade_name_uq` (school_year_id, grade_level_id, name)  
**Indexes:** `sections_sy_idx`, `sections_grade_idx`

---

### `subjects`
Academic subjects.

| Column | Type | Notes |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `code` | text NOT NULL | Unique (`subjects_code_uq`) |
| `name` | text NOT NULL | — |
| `description` | text | — |
| `is_active` | integer | DEFAULT `true` |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

**Indexes:** `subjects_code_uq`, `subjects_active_idx`

---

### `grading_periods`
Grading terms within a school year.

| Column | Type | Constraints |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `school_year_id` | text NOT NULL | FK → `school_years(id)` |
| `name` | text NOT NULL | — |
| `order_index` | integer NOT NULL | — |
| `start_date` | text | — |
| `end_date` | text | — |
| `is_current` | integer | DEFAULT `false` |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

---

### `student_enrollments`
Student enrollment per school year / grade / section.

| Column | Type | Constraints |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `student_id` | text NOT NULL | FK → `students(id)` ON DELETE CASCADE |
| `school_year_id` | text NOT NULL | FK → `school_years(id)` |
| `grade_level_id` | text NOT NULL | FK → `grade_levels(id)` |
| `section_id` | text NOT NULL | FK → `sections(id)` |
| `status` | text | DEFAULT `'active'` |
| `enrollment_date` | text | — |
| `recorded_by` | text NOT NULL | FK → `users(id)` |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

**Unique Index:** `enrollment_student_sy_uq` (student_id, school_year_id)  
**Indexes:** `enrollments_student_idx`, `enrollments_sy_idx`, `enrollments_grade_idx`, `enrollments_section_idx`, `enrollments_status_idx`

---

### `student_grades`
Grades per student, subject, and grading period.

| Column | Type | Constraints |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `enrollment_id` | text NOT NULL | FK → `student_enrollments(id)` ON DELETE CASCADE |
| `subject_id` | text NOT NULL | FK → `subjects(id)` |
| `grading_period_id` | text NOT NULL | FK → `grading_periods(id)` |
| `grade` | real NOT NULL | — |
| `remarks` | text | — |
| `recorded_by` | text NOT NULL | FK → `users(id)` |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

**Unique Index:** `grades_enrollment_subject_period_uq` (enrollment_id, subject_id, grading_period_id)  
**Indexes:** `grades_enrollment_idx`, `grades_subject_idx`, `grades_period_idx`

---

### `attendance_records`
Daily attendance linked to enrollments.

| Column | Type | Constraints |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `enrollment_id` | text NOT NULL | FK → `student_enrollments(id)` ON DELETE CASCADE |
| `date` | text NOT NULL | — |
| `status` | text NOT NULL | — |
| `remarks` | text | — |
| `recorded_by` | text NOT NULL | FK → `users(id)` |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

**Unique Index:** `attendance_enrollment_date_uq` (enrollment_id, date)  
**Indexes:** `attendance_date_idx`, `attendance_status_idx`, `attendance_enrollment_idx`

---

### `assessments`
Student assessments by domain.

| Column | Type | Constraints |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `student_id` | text NOT NULL | FK → `students(id)` ON DELETE CASCADE |
| `domain` | text NOT NULL | — |
| `assessment_type` | text | — |
| `skill_area` | text | — |
| `date` | text NOT NULL | — |
| `level` | text | — |
| `score` | real | — |
| `assessor_id` | text NOT NULL | FK → `users(id)` |
| `notes` | text | — |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

**Indexes:** `assessments_student_domain_idx`, `assessments_domain_idx`, `assessments_date_idx`

---

### `record_verifications`
Record verification / approval workflow.

| Column | Type | Constraints |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `student_id` | text NOT NULL | FK → `students(id)` ON DELETE CASCADE |
| `submitted_by` | text NOT NULL | FK → `users(id)` |
| `reviewed_by` | text | FK → `users(id)` |
| `status` | text | DEFAULT `'pending'` |
| `remarks` | text | — |
| `submitted_at` | integer NOT NULL | — |
| `reviewed_at` | integer | — |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

**Indexes:** `verifications_student_idx`, `verifications_status_idx`, `verifications_submitted_idx`

---

### `duplicate_candidates`
Potential duplicate student records.

| Column | Type | Constraints |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `student_id` | text NOT NULL | FK → `students(id)` ON DELETE CASCADE |
| `possible_student_id` | text NOT NULL | FK → `students(id)` ON DELETE CASCADE |
| `match_score` | integer | — |
| `match_reason` | text | — |
| `status` | text | DEFAULT `'pending'` |
| `reviewed_by` | text | FK → `users(id)` |
| `review_notes` | text | — |
| `reviewed_at` | integer | — |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |

---

### `notifications`
In-app notifications for users.

| Column | Type | Constraints |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `user_id` | text NOT NULL | FK → `users(id)` ON DELETE CASCADE |
| `type` | text NOT NULL | — |
| `title` | text NOT NULL | — |
| `message` | text | — |
| `link` | text | — |
| `is_read` | integer | DEFAULT `false` |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `read_at` | integer | — |

**Index:** `notifications_user_idx`

---

### `reports`
Saved report definitions.

| Column | Type | Constraints |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `name` | text NOT NULL | — |
| `report_type` | text NOT NULL | — |
| `generated_by` | text NOT NULL | FK → `users(id)` |
| `scope` | text | DEFAULT `'municipality'` |
| `filters_json` | text | DEFAULT `'{}'` |
| `created_at` | integer | DEFAULT `(unixepoch())` |

**Indexes:** `reports_type_idx`, `reports_created_idx`

---

### `report_exports`
Generated report exports.

| Column | Type | Constraints |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `report_id` | text NOT NULL | FK → `reports(id)` ON DELETE CASCADE |
| `format` | text NOT NULL | — |
| `file_reference` | text NOT NULL | — |
| `generated_by` | text NOT NULL | FK → `users(id)` |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `expires_at` | integer | — |

**Indexes:** `report_exports_report_idx`, `report_exports_generated_idx`

---

### `child_duplicate_candidates`
Duplicate detection candidates for children.

| Column | Type | Constraints |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `child_id` | text NOT NULL | FK → `children(id)` ON DELETE CASCADE |
| `possible_child_id` | text NOT NULL | FK → `children(id)` ON DELETE CASCADE |
| `match_score` | integer | — |
| `match_reason` | text | — |
| `status` | text | DEFAULT `'pending'` |
| `reviewed_by` | text | FK → `users(id)` |
| `review_notes` | text | — |
| `created_at` | integer | DEFAULT `(unixepoch())` |
| `updated_at` | integer | DEFAULT `(unixepoch())` |
| `reviewed_at` | integer | — |

**Unique Index:** `duplicate_pair_uq` (child_id, possible_child_id)  
**Index:** `duplicate_status_idx`

---

### `qr_verifications`
QR-based verification records for children.

| Column | Type | Constraints |
|---|---|---|
| `id` | text PRIMARY KEY | — |
| `child_id` | text NOT NULL | FK → `children(id)` ON DELETE CASCADE |
| `verification_token` | text NOT NULL | Unique (`qr_verifications_token_uq`) |
| `verified_by` | text | FK → `users(id)` |
| `verification_type` | text NOT NULL | — |
| `result` | text | DEFAULT `'valid'` |
| `verified_at` | integer NOT NULL | — |
| `ip_address` | text | — |
| `user_agent` | text | — |

**Indexes:** `qr_verifications_token_uq`, `qr_verifications_child_idx`, `qr_verifications_verified_at_idx`

---

## Key Relationships

```
municipalities (1)
  └── barangays (many)
         ├── schools (many)
         ├── children (many via barangay_id)
         ├── child_addresses (many)
         └── users (many via barangay_id)

users (1)
  ├── audit_logs (many, optional)
  ├── role_permissions (via roles)
  ├── student_guardians (not direct)
  ├── assessments (many as assessor)
  ├── attendance_records (many as recorder)
  ├── behavior_records (many as recorder)
  ├── child_monitoring (many as recorder)
  ├── interventions (many as assigned/created)
  ├── notifications (many)
  ├── reports (many as generator)
  ├── report_exports (many)
  └── sections (optional adviser)

roles (1)
  ├── users (many via role_id)
  └── permissions (many via role_permissions)

students (1)
  ├── assessments (many)
  ├── behavior_records (many)
  ├── student_guardians (many via link table)
  ├── student_enrollments (many)
  ├── record_verifications (many)
  ├── attendance_records (many via enrollment)
  └── duplicate_candidates (many, both sides)

school_years (1)
  ├── sections (many)
  ├── grading_periods (many)
  └── student_enrollments (many)

grade_levels (1)
  ├── sections (many)
  └── student_enrollments (many)

sections (1)
  └── student_enrollments (many)

subjects (1)
  └── student_grades (many)

grading_periods (1)
  └── student_grades (many)

children (1)
  ├── child_addresses (many)
  ├── child_disabilities (many)
  ├── child_eccd (many)
  ├── child_education (many)
  ├── child_monitoring (many)
  ├── child_validations (many)
  ├── interventions (many)
  ├── child_duplicate_candidates (many)
  └── qr_verifications (many)
```

---

## Schema Notes

- All tables use `text` primary keys (`id`) rather than integer auto-increment.
- Default timestamps use SQLite `unixepoch()`.
- Most tables include `created_at` and `updated_at` fields.
- Foreign keys generally use `ON DELETE cascade` for child/dependent records and `ON DELETE set null` for optional references.
- Indexes include unique constraints (`_uq`) and lookup indexes (`_idx`).
- The database uses `integer` for booleans (`0` = false, `1` = true).
- The `turso` dialect is configured in `drizzle.config.ts`.

---

## Source / Verification

Schema extracted from live Turso database using:

```bash
turso db shell libsql://cms-sirjobel.aws-ap-northeast-1.turso.io ".schema"
```

Executed from `/media/jobel/SSD1/Projects/jowbeyl_company/apps/cms` on 2026-10-10.

---

*File: `DATABASE_SCHEMA.md` — Generated automatically from live Turso schema.*
