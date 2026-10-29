# 05 — Entity Relationship Diagram (ERD)

**Records Management System — Sta. Magdalena National High School**  
**Based strictly on actual database schema (`src/db/schema.ts`, `drizzle/*.sql`)**  
**Notation:** Crow's Foot / Chen-style hybrid (PK, FK, cardinality, relationship labels)

---

## Core Entities and Relationships (Actual Schema)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  ROLES (PK: id)          ┌───────────────────────┐    ┌───────────────────────┐                     │
│  • id (text)             │  role_permissions     │    │  permissions          │                     │
│  • name (text, UNIQUE)   │  • role_id (FK→roles) │◄───│  • id (text, PK)       │                     │
│  • description (text)    │  • permission_id      │    │  • name (text, UQ)     │                     │
│  • created_at            │    (FK→permissions)   │    │  • module (text)        │                     │
│  • updated_at            │  • created_at         │    │  • action (text)        │                     │
│                          │  PK: (role_id,        │    │  • description          │                     │
│                          │       permission_id)  │    │  • created_at           │                     │
│                          └───────────────────────┘    └───────────────────────┘                     │
└──────────────────────────│────────────────────────────────────────────────────────────────────────┘
                           │ (1:N — one role has many users)
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  USERS (PK: id)                                                                                     │
│  • id (text, PK)                                                                                    │
│  • role_id (FK→roles.id, NOT NULL)                                                                   │
│  • first_name, middle_name, last_name                                                                │
│  • email (text, UNIQUE)                                                                              │
│  • password_hash (text)                                                                              │
│  • phone (text, nullable)                                                                            │
│  • is_active (bool, default true)                                                                    │
│  • last_login_at (timestamp, nullable)                                                                │
│  • created_at, updated_at                                                                             │
│  Indexes: email_uq, email_idx, role_idx, active_idx                                                    │
└──────────────────────────│────────────────────────────────────────────────────────────────────────┘
                           │ (1:N — one user has many sessions)
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  SESSIONS (PK: id)                                                                                   │
│  • id (text, PK)                                                                                    │
│  • token_hash (text, UNIQUE)                                                                          │
│  • user_id (FK→users.id, NOT NULL, CASCADE)                                                          │
│  • expires_at (timestamp)                                                                             │
│  • ip (text, nullable)                                                                                │
│  • user_agent (text, nullable)                                                                        │
│  • created_at                                                                                         │
│  Indexes: token_hash_uq, user_idx                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
                           │ (1:N — one user creates/updates students)
                           │ (1:N — one user advises sections)
                           │ (1:N — one user records audits)
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  SCHOOL YEARS (PK: id)                                                                               │
│  • id (text, PK)                                                                                      │
│  • year (text, UNIQUE) — e.g. "2025-2026"                                                              │
│  • start_date, end_date (text)                                                                        │
│  • is_current (bool, default false)                                                                   │
│  • created_at, updated_at                                                                              │
│  Indexes: year_uq, current_idx                                                                         │
│                                                                                                     │
│  (1:N → sections, grading_periods, student_enrollments)                                               │
└──────────────────────────│────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  GRADE LEVELS (PK: id)                                                                               │
│  • id (text, PK)                                                                                      │
│  • name (text, UNIQUE) — "Grade 7" to "Grade 12"                                                      │
│  • order_index (integer)                                                                              │
│  • created_at, updated_at                                                                              │
│  Indexes: name_uq, order_idx                                                                           │
│  (1:N → sections, student_enrollments)                                                                │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  SECTIONS (PK: id)                                                                                     │
│  • id (text, PK)                                                                                      │
│  • school_year_id (FK→school_years.id, NOT NULL)                                                      │
│  • grade_level_id (FK→grade_levels.id, NOT NULL)                                                      │
│  • name (text)                                                                                         │
│  • adviser_id (FK→users.id, nullable, set null on delete)                                              │
│  • is_active (bool, default true)                                                                     │
│  • created_at, updated_at                                                                              │
│  UNIQUE: [school_year_id, grade_level_id, name]                                                        │
│  Indexes: sy_idx, grade_idx, adviser_idx                                                               │
│  (1:N → student_enrollments; 1:N → section_subject_teachers)                                            │
└──────────────────────────│────────────────────────────────────────────────────────────────────────┘
                           │ (1:N — section has many subject teachers)
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  SUBJECTS (PK: id)                                                                                     │
│  • id (text, PK)                                                                                      │
│  • code (text, UNIQUE)                                                                                │
│  • name (text)                                                                                         │
│  • description (text, nullable)                                                                       │
│  • is_active (bool, default true)                                                                     │
│  • created_at, updated_at                                                                              │
│  Indexes: code_uq, active_idx                                                                          │
│  (1:N → section_subject_teachers; 1:N → student_grades)                                                 │
└──────────────────────────│────────────────────────────────────────────────────────────────────────┘
                           │ (1:N — subject assigned to teachers per section)
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  SECTION SUBJECT TEACHERS (PK: id)                                                                    │
│  • id (text, PK)                                                                                      │
│  • section_id (FK→sections.id, NOT NULL, CASCADE)                                                     │
│  • subject_id (FK→subjects.id, NOT NULL, CASCADE)                                                      │
│  • teacher_id (FK→users.id, NOT NULL, CASCADE)                                                       │
│  • created_at, updated_at                                                                              │
│  UNIQUE: [section_id, subject_id]                                                                     │
│  Indexes: teacher_idx, section_idx                                                                     │
│  (1:N — one section-subject pair has one teacher assignment; enforces grade encoding scope)         │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘

```

### Academic & Grade Entities

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  GRADING PERIODS (PK: id)                                                                             │
│  • id (text, PK)                                                                                      │
│  • school_year_id (FK→school_years.id, NOT NULL)                                                      │
│  • name (text) — "Quarter 1" ... "Quarter 4"                                                           │
│  • order_index (integer)                                                                               │
│  • start_date, end_date (text, nullable)                                                              │
│  • is_current (bool, default false)                                                                    │
│  • created_at, updated_at                                                                              │
│  UNIQUE: [school_year_id, name]                                                                        │
│  Indexes: sy_idx, current_idx                                                                          │
│  (1:N → student_grades; 1:N → grade_submissions)                                                        │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
                           │ (1:N — period has many grades)
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  STUDENT ENROLLMENTS (PK: id)                                                                         │
│  • id (text, PK)                                                                                      │
│  • student_id (FK→students.id, NOT NULL, CASCADE)                                                      │
│  • school_year_id (FK→school_years.id, NOT NULL)                                                      │
│  • grade_level_id (FK→grade_levels.id, NOT NULL)                                                      │
│  • section_id (FK→sections.id, NOT NULL)                                                                │
│  • status (text, default "active") — active | completed | transferred | withdrawn                   │
│  • enrollment_date (text, nullable)                                                                    │
│  • remarks (text, nullable)                                                                            │
│  • eligibility_certificate (text, nullable) — SF10-JHS                                                 │
│  • previous_school_name, previous_school_address (text)                                               │
│  • previous_general_average (real, nullable)                                                           │
│  • previous_grade_level (text, nullable)                                                               │
│  • promotion_status, academic_distinction (text, nullable)                                            │
│  • recorded_by (FK→users.id, NOT NULL)                                                               │
│  • created_at, updated_at                                                                              │
│  UNIQUE: [student_id, school_year_id]                                                                  │
│  Indexes: student_idx, sy_idx, grade_idx, section_idx, status_idx                                      │
│  (1:N → student_grades; 1:N → attendance_records)                                                      │
└──────────────────────────│────────────────────────────────────────────────────────────────────────┘
                           │ (1:N — enrollment has many grades)
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  STUDENT GRADES (PK: id)                                                                               │
│  • id (text, PK)                                                                                      │
│  • enrollment_id (FK→student_enrollments.id, NOT NULL, CASCADE)                                        │
│  • subject_id (FK→subjects.id, NOT NULL)                                                              │
│  • grading_period_id (FK→grading_periods.id, NOT NULL)                                                 │
│  • grade (real)                                                                                       │
│  • remarks (text, nullable)                                                                            │
│  • recorded_by (FK→users.id, NOT NULL)                                                                 │
│  • status (text, NOT NULL, default "draft") — draft | submitted                                       │
│  • submitted_at (timestamp, nullable)                                                                  │
│  • submission_id (FK→grade_submissions.id, nullable, set null on delete)                               │
│  • created_at, updated_at                                                                              │
│  UNIQUE: [enrollment_id, subject_id, grading_period_id]                                                │
│  Indexes: enrollment_idx, subject_idx, period_idx                                                      │
└──────────────────────────│────────────────────────────────────────────────────────────────────────┘
                           │ (submission links grades to submission ledger)
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  GRADE SUBMISSIONS (PK: id) — Ledger (append-only history)                                           │
│  • id (text, PK)                                                                                      │
│  • school_year_id (FK→school_years.id, NOT NULL)                                                      │
│  • section_id (FK→sections.id, NOT NULL)                                                               │
│  • subject_id (FK→subjects.id, NOT NULL)                                                              │
│  • grading_period_id (FK→grading_periods.id, NOT NULL)                                                 │
│  • status (text, NOT NULL) — submitted | reopened                                                   │
│  • submitted_by (FK→users.id, NOT NULL)                                                              │
│  • submitted_at (timestamp, NOT NULL)                                                                 │
│  • reopened_at (timestamp, nullable)                                                                  │
│  • reopened_by (FK→users.id, nullable, set null)                                                       │
│  • entry_count (integer, NOT NULL, default 0)                                                         │
│  • roster_count (integer, NOT NULL, default 0)                                                        │
│  • warnings_json (text, nullable) — { invalid: string[], skipped: string[] }                          │
│  • created_at                                                                                         │
│  Indexes: context_idx (section+subject+period), sy_idx, submitted_idx, submitter_idx                  │
│  (1:N — submission commits many grades)                                                               │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Student & Related Entities

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  STUDENTS (PK: id)                                                                                     │
│  • id (text, PK)                                                                                      │
│  • student_number (text, NOT NULL, UNIQUE) — e.g. SM-2026-000001                                      │
│  • lrn (text, nullable) — 12-digit DepEd LRN                                                           │
│  • first_name (text), middle_name (text, nullable), last_name (text), suffix (text, nullable)        │
│  • birth_date (text, nullable — ISO YYYY-MM-DD), birth_place (text, nullable)                         │
│  • sex (text, NOT NULL) — male | female                                                                │
│  • contact_number (text, nullable), address (text)                                                     │
│  • status (text, NOT NULL, default "active") — active | inactive | archived                          │
│  • record_status (text, NOT NULL, default "draft") — draft | pending_validation | needs_correction │
│    | verified | marked_duplicate                                                                         │
│  • created_by (FK→users.id, NOT NULL)                                                                  │
│  • updated_by (FK→users.id, nullable)                                                                 │
│  • created_at, updated_at                                                                               │
│  Indexes: number_uq, last_name_idx, first_name_idx, birth_idx, status_idx, record_status_idx,         │
│           created_idx                                                                                   │
│  (1:N → student_guardians; 1:N → student_enrollments; 1:N → behavior_records; 1:N → assessments;     │
│   1:N → interventions; 1:N → record_verifications; 1:N → duplicate_candidates [both sides];         │
│   1:N → qr_verifications; 1:N → health_records; 1:N → clinical_records)                              │
└──────────────────────────│────────────────────────────────────────────────────────────────────────┘
                           │ (M:N — student linked to guardians)
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  GUARDIANS (PK: id)                                                                                   │
│  • id (text, PK)                                                                                      │
│  • first_name, middle_name (nullable), last_name                                                      │
│  • relationship (text, NOT NULL) — mother | father | guardian (configurable vocabulary)              │
│  • contact_number (text, nullable), email (text, nullable), occupation (text, nullable)             │
│  • created_at, updated_at                                                                               │
│  Indexes: last_name_idx, first_name_idx                                                              │
└──────────────────────────│────────────────────────────────────────────────────────────────────────┘
                           │ (join table: student_guardians)
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  STUDENT GUARDIANS (Join — M:N)                                                                       │
│  • student_id (FK→students.id, NOT NULL, CASCADE)                                                      │
│  • guardian_id (FK→guardians.id, NOT NULL, CASCADE)                                                  │
│  • is_primary (bool, NOT NULL, default false)                                                        │
│  • created_at                                                                                         │
│  PK: (student_id, guardian_id)                                                                         │
│  Index: guardian_idx                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  BEHAVIOR CATEGORIES (PK: id)                                                                         │
│  • id (text, PK)                                                                                      │
│  • name (text, NOT NULL, UNIQUE)                                                                       │
│  • kind (text, NOT NULL) — positive | concern                                                        │
│  • description (text, nullable)                                                                        │
│  • created_at, updated_at                                                                               │
│  Index: name_uq                                                                                        │
│  (1:N → behavior_records)                                                                              │
└──────────────────────────│────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  BEHAVIOR RECORDS (PK: id)                                                                             │
│  • id (text, PK)                                                                                      │
│  • student_id (FK→students.id, NOT NULL, CASCADE)                                                      │
│  • category_id (FK→behavior_categories.id, NOT NULL)                                                 │
│  • date (text, NOT NULL)                                                                              │
│  • description (text, NOT NULL)                                                                        │
│  • severity (text, nullable) — low | medium | high (for concerns)                                   │
│  • follow_up (text, nullable)                                                                          │
│  • status (text, NOT NULL, default "open") — open | monitored | resolved                            │
│  • confidential (bool, NOT NULL, default false) — only admin, school_admin, guidance may read/write │
│  • recorded_by (FK→users.id, NOT NULL)                                                                 │
│  • created_at, updated_at                                                                              │
│  Indexes: student_idx, category_idx, date_idx, status_idx                                            │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  INTERVENTIONS (PK: id)                                                                               │
│  • id (text, PK)                                                                                      │
│  • student_id (FK→students.id, NOT NULL, CASCADE)                                                      │
│  • intervention_type (text, NOT NULL)                                                                   │
│  • description (text, NOT NULL)                                                                        │
│  • status (text, NOT NULL, default "planned") — planned | active | completed | discontinued            │
│  • outcome (text, nullable)                                                                            │
│  • start_date (text, nullable), target_date (text, nullable), completed_date (text, nullable)        │
│  • assigned_to (FK→users.id, nullable)                                                                │
│  • created_by (FK→users.id, NOT NULL)                                                                   │
│  • created_at, updated_at                                                                               │
│  Indexes: student_idx, status_idx, target_idx                                                        │
│  (1:N → intervention_followups)                                                                        │
└──────────────────────────│────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  INTERVENTION FOLLOWUPS (PK: id)                                                                       │
│  • id (text, PK)                                                                                      │
│  • intervention_id (FK→interventions.id, NOT NULL, CASCADE)                                            │
│  • follow_up_date (text, NOT NULL)                                                                     │
│  • status (text, NOT NULL, default "scheduled") — scheduled | done | missed | cancelled             │
│  • notes (text, nullable)                                                                              │
│  • recorded_by (FK→users.id, NOT NULL)                                                                 │
│  • created_at, updated_at                                                                               │
│  Index: intervention_idx                                                                                │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Health, Assessments, Verification, QR, Reports, Audit

```
HEALTH RECORDS (PK: id)                  CLINICAL RECORDS (PK: id)
• student_id (FK→students.id, CASCADE)   • student_id (FK→students.id, CASCADE)
• school_year_id (FK→school_years.id,    • date (text, NOT NULL)
  nullable)                                • category (text, NOT NULL)
• measurement_date (text, NOT NULL)         • description (text, NOT NULL)
• weight_kg (real, nullable)              • assessment (text, nullable)
• height_cm (real, nullable)              • action_taken (text, nullable)
• bmi (real, nullable — computed)          • remarks (text, nullable)
• nutritional_status (text, nullable)     • recorded_by (FK→users.id, NOT NULL)
  — normal | wasted | severely_wasted     • created_at, updated_at
  | overweight | obese                     Indexes: student_idx, date_idx
• remarks (text, nullable)
• recorded_by (FK→users.id, NOT NULL)
• created_at, updated_at
Indexes: student_idx, date_idx, status_idx
```

```
ASSESSMENTS (PK: id)                      RECORD VERIFICATIONS (PK: id)
• student_id (FK→students.id, CASCADE)   • student_id (FK→students.id, CASCADE)
• domain (text, NOT NULL)                 • submitted_by (FK→users.id, NOT NULL)
  — reading | literacy | numeracy           • reviewed_by (FK→users.id, nullable)
• assessment_type (text, nullable)        • status (text, default "pending")
• skill_area (text, nullable)               — pending | approved | needs_correction
• date (text, NOT NULL)                     | rejected
• level (text, nullable)                  • remarks (text, nullable)
• score (real, nullable)                  • submitted_at (timestamp, NOT NULL)
• assessor_id (FK→users.id, NOT NULL)     • reviewed_at (timestamp, nullable)
• notes (text, nullable)                  • created_at, updated_at
• created_at, updated_at                  Indexes: student_idx, status_idx,
Indexes: student_domain_idx, domain_idx     submitted_idx
         , date_idx
```

```
DUPLICATE CANDIDATES (PK: id)             QR VERIFICATIONS (PK: id)
• student_id (FK→students.id, CASCADE)   • student_id (FK→students.id, CASCADE)
• possible_student_id (FK→students.id,     • verification_token (text, NOT NULL,
  CASCADE)                                   UNIQUE)
• match_score (integer, nullable)          • verified_by (FK→users.id, nullable)
• match_reason (text, nullable)           • verification_type (text, NOT NULL)
• status (text, default "pending")          — generate | scan | revoke
  — pending | confirmed_duplicate |       • result (text, default "valid")
  | not_duplicate | dismissed               — valid | invalid | expired | revoked
• reviewed_by (FK→users.id, nullable)     • verified_at (timestamp, NOT NULL)
• review_notes (text, nullable)           • ip_address (text, nullable)
• reviewed_at (timestamp, nullable)       • user_agent (text, nullable)
• created_at, updated_at                  Indexes: token_uq, student_idx,
Indexes: pair_uq, status_idx                verified_at_idx
```

```
REPORTS (PK: id)                          REPORT EXPORTS (PK: id)
• name (text, NOT NULL)                   • report_id (FK→reports.id, NOT NULL,
• report_type (text, NOT NULL)              CASCADE)
• generated_by (FK→users.id, NOT NULL)     • format (text, NOT NULL) — PDF | XLSX | CSV
• scope (text, NOT NULL, default         • file_reference (text, NOT NULL)
  "school") — school | grade_level |     • generated_by (FK→users.id, NOT NULL)
  section                                 • created_at
• filters_json (text, NOT NULL, default   • expires_at (timestamp, nullable)
  "{}")                                  Indexes: report_idx, generated_idx
• created_at
Indexes: type_idx, created_idx
(1:N → report_exports)
```

```
NOTIFICATIONS (PK: id)                     AUDIT LOGS (PK: id)
• user_id (FK→users.id, NOT NULL,         • user_id (FK→users.id, nullable,
  CASCADE)                                   set null on delete)
• type (text, NOT NULL)                  • action (text, NOT NULL)
• title (text, NOT NULL)                  • entity_type (text, NOT NULL)
• message (text, nullable)                • entity_id (text, nullable)
• link (text, nullable)                   • old_values_json (text, nullable)
• is_read (bool, NOT NULL, default false) • new_values_json (text, nullable)
• created_at                            • ip_address (text, nullable)
• read_at (timestamp, nullable)          • user_agent (text, nullable)
Index: user_idx (user_id, is_read)         • created_at
                                          Indexes: user_idx, entity_idx,
                                                  created_idx
```

```
SYSTEM SETTINGS (PK: id)                    FORECASTS (PK: id) — Additive Only
• key (text, NOT NULL, UNIQUE)           • forecast_type (text, NOT NULL)
• value (text, NOT NULL)                 • scope_level (text, NOT NULL)
• description (text, nullable)             — school_wide | grade_level | subject
• updated_by (FK→users.id, nullable,     • target_period (text, NOT NULL)
  set null)                                 — quarter end timestamp
• updated_at                            • forecast_value (real, NOT NULL)
Index: key_uq                            • lower_bound (real, NOT NULL)
                                          • upper_bound (real, NOT NULL)
                                          • model_type (text, default "ARIMA")
                                          • model_order (text, default "{}")
                                          • observation_count (integer)
                                          • training_start, training_end (text)
                                          • accuracy_metrics (text, nullable)
                                          • generated_at (timestamp, NOT NULL)
                                          • generated_by (FK→users.id, nullable,
                                            set null)
                                          • status (text, default "generated")
                                            — generated | insufficient_data |
                                            | failed | stale
                                          • error_message (text, nullable)
                                          • created_at
                                          Indexes: type_scope_target_uq,
                                                  type_status_idx, scope_idx,
                                                  generated_idx
```

---

### Employee Domain — Strictly Isolated from Student Data

```
EMPLOYEES (PK: id)                       EMPLOYEE 201 RECORDS (PK: id)
• employee_number (text, UNIQUE)         • employee_id (FK→employees.id,
• first_name, middle_name, last_name      NOT NULL, CASCADE)
• suffix (text, nullable)                • category (text, NOT NULL)
• birth_date (text, nullable)             — personal_information | appointment
• sex (text, NOT NULL)                     | eligibility | training | performance
• civil_status (text, nullable)            | leave | government | certificate
  — single | married | widowed |         | memorandum | other
  separated | annulled                   • title (text, NOT NULL)
• address (text, nullable)               • description (text, nullable)
• contact_number (text, nullable)        • record_date (text, NOT NULL)
• email (text, nullable)                 • file_reference (text, nullable)
• emergency_contact_* (text, nullable)   • is_archived (bool, default false)
• position, designation (text, nullable) • created_by (FK→users.id, NOT NULL)
• appointment_status (text, nullable)    • updated_by (FK→users.id, nullable)
  — permanent | provisional | casual |  • created_at, updated_at
  contractual | substitute | part_time   Indexes: employee_idx, category_idx,
• employment_type (text, nullable)         date_idx, archived_idx
  — teaching | non_teaching | support
• department (text, nullable)
• date_hired, date_of_appointment (text,
  nullable)
• salary_grade, step (text, nullable)
• gsis_number, philhealth_number,
  pagibig_number, tin_number,
  prc_license_number, eligibility (text,
  nullable)
• status (text, default "active")
  — active | inactive | archived
• created_by, updated_by (FK→users.id)
• created_at, updated_at
Indexes: number_uq, last_name_idx,
         first_name_idx, status_idx,
         position_idx, created_idx
(1:N → employee_201_records; 1:N →
 service_credit_transactions)
                           │
                           ▼
SERVICE CREDIT TRANSACTIONS (PK: id)
• employee_id (FK→employees.id,
  NOT NULL, CASCADE)
• type (text, NOT NULL) — earned | consumed
• credits (real, NOT NULL) — positive value
• transaction_date (text, NOT NULL)
• reason (text, NOT NULL)
• reference_document (text, nullable)
• remarks (text, nullable)
• created_by, updated_by (FK→users.id,
  NOT NULL / nullable)
• created_at, updated_at
Indexes: employee_idx, type_idx,
         date_idx
```

---

## Cardinality Summary (Actual Database Constraints)

| Parent Entity | Child Entity | Cardinality | FK Column(s) | On Delete | Evidence (`schema.ts`) |
|---|---|---|---|---|---|
| `roles` | `users` | 1:N | `users.role_id` | RESTRICT (app-enforced) | `users.roleId` references `roles.id`; `countOtherActiveAdmins` guards admin removal |
| `users` | `sessions` | 1:N | `sessions.user_id` | CASCADE | `sessions.userId` references `users.id`, `{ onDelete: "cascade" }` |
| `users` | `sections` (adviser) | 1:N | `sections.adviser_id` | SET NULL | `{ onDelete: "set null" }` |
| `school_years` | `sections` | 1:N | `sections.school_year_id` | RESTRICT (practical) | `sections.schoolYearId` → `schoolYears.id`; no `onDelete: cascade` |
| `school_years` | `grading_periods` | 1:N | `grading_periods.school_year_id` | CASCADE | `{ onDelete: "cascade" }` |
| `school_years` | `student_enrollments` | 1:N | `student_enrollments.school_year_id` | RESTRICT | No cascade declared |
| `grade_levels` | `sections` | 1:N | `sections.grade_level_id` | RESTRICT | No cascade declared |
| `grade_levels` | `student_enrollments` | 1:N | `student_enrollments.grade_level_id` | RESTRICT | No cascade declared |
| `sections` | `section_subject_teachers` | 1:N | `section_subject_teachers.section_id` | CASCADE | `{ onDelete: "cascade" }` |
| `subjects` | `section_subject_teachers` | 1:N | `section_subject_teachers.subject_id` | CASCADE | `{ onDelete: "cascade" }` |
| `users` | `section_subject_teachers` (teacher) | 1:N | `section_subject_teachers.teacher_id` | CASCADE | `{ onDelete: "cascade" }` |
| `sections` | `student_enrollments` | 1:N | `student_enrollments.section_id` | RESTRICT | No cascade declared |
| `subjects` | `subjects` (self — no) | — | — | — | — |
| `students` | `student_guardians` | 1:N (via M:N) | `student_guardians.student_id` | CASCADE | `{ onDelete: "cascade" }` |
| `guardians` | `student_guardians` | 1:N (via M:N) | `student_guardians.guardian_id` | CASCADE | `{ onDelete: "cascade" }` |
| `students` | `student_enrollments` | 1:N | `student_enrollments.student_id` | CASCADE | `{ onDelete: "cascade" }` |
| `student_enrollments` | `student_grades` | 1:N | `student_grades.enrollment_id` | CASCADE | `{ onDelete: "cascade" }` |
| `student_enrollments` | `attendance_records` | 1:N | `attendance_records.enrollment_id` | CASCADE | `{ onDelete: "cascade" }` |
| `subjects` | `student_grades` | 1:N | `student_grades.subject_id` | RESTRICT | No cascade declared |
| `grading_periods` | `student_grades` | 1:N | `student_grades.grading_period_id` | RESTRICT | No cascade declared |
| `grade_submissions` | `student_grades` | 1:N | `student_grades.submission_id` | SET NULL | `{ onDelete: "set null" }` |
| `users` | `student_grades` (recorded_by) | 1:N | `student_grades.recorded_by` | NO ACTION | Reference declared; no `onDelete` specified |
| `students` | `behavior_records` | 1:N | `behavior_records.student_id` | CASCADE | `{ onDelete: "cascade" }` |
| `behavior_categories` | `behavior_records` | 1:N | `behavior_records.category_id` | RESTRICT | No cascade declared |
| `students` | `assessments` | 1:N | `assessments.student_id` | CASCADE | `{ onDelete: "cascade" }` |
| `users` | `assessments` (assessor) | 1:N | `assessments.assessor_id` | NO ACTION | Reference declared |
| `students` | `interventions` | 1:N | `interventions.student_id` | CASCADE | `{ onDelete: "cascade" }` |
| `interventions` | `intervention_followups` | 1:N | `intervention_followups.intervention_id` | CASCADE | `{ onDelete: "cascade" }` |
| `users` | `interventions` (assigned_to, created_by) | 1:N | `interventions.assigned_to`, `created_by` | NO ACTION / RESTRICT | References declared |
| `students` | `record_verifications` | 1:N | `record_verifications.student_id` | CASCADE | `{ onDelete: "cascade" }` |
| `users` | `record_verifications` (submitted/reviewed) | 1:N | `record_verifications.submitted_by`, `reviewed_by` | NO ACTION / SET NULL | References declared |
| `students` | `duplicate_candidates` (both sides) | 1:N (self-ref) | `duplicate_candidates.student_id`, `possible_student_id` | CASCADE | Both references have `{ onDelete: "cascade" }` |
| `users` | `duplicate_candidates` (reviewed_by) | 1:N | `duplicate_candidates.reviewed_by` | SET NULL | `{ onDelete: "set null" }` |
| `students` | `qr_verifications` | 1:N | `qr_verifications.student_id` | CASCADE | `{ onDelete: "cascade" }` |
| `users` | `qr_verifications` (verified_by) | 1:N | `qr_verifications.verified_by` | NO ACTION | Reference declared |
| `users` | `reports` (generated_by) | 1:N | `reports.generated_by` | NO ACTION | Reference declared |
| `reports` | `report_exports` | 1:N | `report_exports.report_id` | CASCADE | `{ onDelete: "cascade" }` |
| `users` | `notifications` | 1:N | `notifications.user_id` | CASCADE | `{ onDelete: "cascade" }` |
| `users` | `audit_logs` | 1:N | `audit_logs.user_id` | SET NULL | `{ onDelete: "set null" }` |
| `users` | `system_settings` (updated_by) | 1:N | `system_settings.updated_by` | SET NULL | `{ onDelete: "set null" }` |
| `users` | `forecasts` (generated_by) | 1:N | `forecasts.generated_by` | SET NULL | `{ onDelete: "set null" }` |
| `employees` | `employee_201_records` | 1:N | `employee_201_records.employee_id` | CASCADE | `{ onDelete: "cascade" }` |
| `users` | `employee_201_records` (created/updated) | 1:N | `employee_201_records.created_by`, `updated_by` | NO ACTION / SET NULL | References declared |
| `employees` | `service_credit_transactions` | 1:N | `service_credit_transactions.employee_id` | CASCADE | `{ onDelete: "cascade" }` |
| `users` | `service_credit_transactions` (created/updated) | 1:N | `service_credit_transactions.created_by`, `updated_by` | NO ACTION / SET NULL | References declared |

---

## Key Constraints and Unique Indexes (Physical Schema)

| Table | Constraint Type | Columns / Condition | Evidence |
|---|---|---|---|
| `roles` | UNIQUE | `name` | `roles_name_uq` |
| `permissions` | UNIQUE | `name` | `permissions_name_uq` |
| `users` | UNIQUE | `email` | `users_email_uq` |
| `users` | INDEX | `email`, `role_id`, `is_active` | `users_email_idx`, `users_role_idx`, `users_active_idx` |
| `sessions` | UNIQUE | `token_hash` | `sessions_token_hash_uq` |
| `school_years` | UNIQUE | `year` | `school_years_year_uq` |
| `grade_levels` | UNIQUE | `name` | `grade_levels_name_uq` |
| `sections` | UNIQUE | `[school_year_id, grade_level_id, name]` | `sections_sy_grade_name_uq` |
| `subjects` | UNIQUE | `code` | `subjects_code_uq` |
| `section_subject_teachers` | UNIQUE | `[section_id, subject_id]` | `section_subject_teacher_uq` |
| `grading_periods` | UNIQUE | `[school_year_id, name]` | `grading_periods_sy_name_uq` |
| `student_grades` | UNIQUE | `[enrollment_id, subject_id, grading_period_id]` | `grades_enrollment_subject_period_uq` |
| `attendance_records` | UNIQUE | `[enrollment_id, date]` | `attendance_enrollment_date_uq` |
| `behavior_categories` | UNIQUE | `name` | `behavior_categories_name_uq` |
| `students` | UNIQUE | `student_number` | `students_number_uq` |
| `student_enrollments` | UNIQUE | `[student_id, school_year_id]` | `enrollment_student_sy_uq` |
| `duplicate_candidates` | UNIQUE | `[student_id, possible_student_id]` | `duplicate_pair_uq` |
| `qr_verifications` | UNIQUE | `verification_token` | `qr_verifications_token_uq` |
| `system_settings` | UNIQUE | `key` | `system_settings_key_uq` |
| `employees` | UNIQUE | `employee_number` | `employees_number_uq` |
| `forecasts` | UNIQUE | `[forecast_type, scope_level, target_period, model_type]` | `forecasts_type_scope_target_uq` |

---

## ERD Cross-Check with Database Schema (`src/db/schema.ts` / `drizzle/`)

Every entity, relationship, cardinality, and foreign key shown above is derived directly from:
- `sqliteTable` definitions and column types in `src/db/schema.ts`
- `relations()` definitions (e.g., `sectionRelations`, `gradeRelations`, `interventionRelations`)
- Migration SQL in `drizzle/*.sql` (PK, FK, indexes, constraints)
- No invented entities; no missing core tables; no fabricated relationships.
