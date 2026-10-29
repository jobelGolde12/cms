# 03 — Data Flow Diagram (DFD)

**Records Management System — Sta. Magdalena National High School**  
**Level 0 (Overview)** + **Level 1 (Detailed)** combined representation for clarity  
**Notation:** Gane-Sarson / Yourdon notation (process = circle, data store = open rectangle, external entity = rectangle, data flow = arrow)

---

## DFD — Level 0: System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  EXTERNAL ENTITIES                                                                              │
│                                                                                              │
│  E1: System Administrator        E2: School Administrator        E3: Adviser (teacher)        │
│  E4: Subject Teacher             E5: Records Personnel            E6: Guidance Counselor       │
│  E7: Nurse                      E8: Registrar                    E9: Literacy Coordinator     │
│  E10: Admin Officer               E11: Student / Public (not applicable — removed)            │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
                                              │
                                              │ Data Flows (see Level 1 for detail)
                                              ▼
                              ┌─────────────────────────────────────┐
                              │  0. SCHOOL RECORDS SYSTEM          │
                              │     (Central Process — System)      │
                              │                                      │
                              │  • Authentication & Authorization   │
                              │  • Student Registry                 │
                              │  • Academic Management              │
                              │  • Health & Nutrition               │
                              │  • Behavior & Interventions         │
                              │  • Assessment (Reading/Lit/Num)     │
                              │  • Report Generation                │
                              │  • Employee Management              │
                              │  • Audit & Verification             │
                              └─────────────────────────────────────┘
                                              │
                                              │ Read / Write
                                              ▼
              ┌─────────────────────────────┐     ┌─────────────────────────────┐
              │  D1: Users & Auth Data       │     │  D2: Student Registry Data  │
              │  • users                     │     │  • students                 │
              │  • roles                     │     │  • guardians                │
              │  • permissions               │     │  • student_guardians        │
              │  • role_permissions          │     │  • student_enrollments      │
              │  • sessions                  │     │  • sections                 │
              │  • audit_logs                │     │  • school_years             │
              └─────────────────────────────┘     │  • grade_levels             │
                                              │  • subjects                 │
                                              │  • grading_periods          │
                                              └─────────────────────────────┘
                                              │
                                              ▼
              ┌─────────────────────────────┐     ┌─────────────────────────────┐
              │  D3: Academic Records        │     │  D4: Grade & Submission     │
              │  • attendance_records        │     │  • student_grades           │
              │  • behavior_records          │     │  • grade_submissions        │
              │  • behavior_categories       │     │  • assessments              │
              │  • health_records            │     │  • record_verifications     │
              │  • clinical_records          │     │  • duplicate_candidates     │
              │  • interventions             │     │  • qr_verifications         │
              │  • intervention_followups    │     │  • reports                  │
              │  • assessments (reading/     │     │  • report_exports           │
              │    literacy/numeracy)        │     │  • notifications            │
              └─────────────────────────────┘     │  • forecasts                │
                                              │  • system_settings            │
                                              └─────────────────────────────┘
                                              │
                                              ▼
                              ┌─────────────────────────────────────┐
                              │  D5: Employee Domain (Isolated)     │
                              │  • employees                       │
                              │  • employee_201_records             │
                              │  • service_credit_transactions     │
                              │  (NO foreign keys to students)     │
                              └─────────────────────────────────────┘
```

---

## DFD — Level 1: Detailed Process Decomposition

### Process 1: Authentication & User Management (`P1`)

```
E1 (Admin) ──[Create User / Update / Deactivate]──► P1 ──► D1 (users, roles, permissions, role_permissions)
E1 ──[View Audit Logs]────────────────────────► P1 ──► D1 (audit_logs)

P1 Sub-processes:
  P1.1  Login / Create Session (`auth.ts`): validates credentials, creates `sessions` row, sets cookie.
  P1.2  User Management (`users.ts`): create/update/deactivate; enforces admin escalation guard.
  P1.3  Role/Permission Seed: `permissions` and `role_permissions` managed via seed scripts.

Data Stores Accessed:
  • `users` (PK: id, FK: role_id → roles.id, UNIQUE: email)
  • `roles` (PK: id)
  • `permissions` (PK: id, UNIQUE: name)
  • `role_permissions` (PK: [role_id, permission_id])
  • `sessions` (PK: id, FK: user_id → users.id, UNIQUE: token_hash)
  • `audit_logs` (PK: id, FK: user_id → users.id, set null on delete)
```

### Process 2: Student Registry & Verification (`P2`)

```
E2 (School Admin) ──[Create / Update / Archive]──► P2 ──► D2 (students)
E3 (Adviser) ──[View Profile]───────────────────► P2 ──► D2 (students, student_enrollments, sections)
E5 (Records) ──[Create / Verify / Archive]──────► P2 ──► D2 + D4 (record_verifications)
E5 ──[Review Duplicates]──────────────────────► P2 ──► D4 (duplicate_candidates)

P2 Sub-processes:
  P2.1  Student Profile Management (`students.ts`): create/update/archive (`status`: active/inactive/archived);
         `recordStatus`: draft → pending_validation → verified / needs_correction / marked_duplicate.
  P2.2  Guardian Management (`guardians`, `student_guardians`): M:N relationship.
  P2.3  Enrollment (`student_enrollments`): active/completed/transferred/withdrawn; links to `school_years`, `grade_levels`, `sections`.
  P2.4  Verification Workflow (`record_verifications`): submitted_by, reviewed_by, status (pending/approved/needs_correction/rejected).
  P2.5  Duplicate Review (`duplicate_candidates`): pair-unique; status (pending/confirmed_duplicate/not_duplicate/dismissed).

Data Stores Accessed:
  • `students` (PK: id, UNIQUE: student_number, FK: created_by → users.id, updated_by → users.id)
  • `guardians` (PK: id)
  • `student_guardians` (PK: [student_id, guardian_id], FK: both → students.id / guardians.id)
  • `student_enrollments` (PK: id, UNIQUE: [student_id, school_year_id], FK: student/section/grade/school_year/user)
  • `record_verifications` (PK: id, FK: student_id, submitted_by, reviewed_by → users.id)
  • `duplicate_candidates` (PK: id, UNIQUE: [student_id, possible_student_id], FK: both → students.id)
```

### Process 3: Grade Management & Submission Lock (`P3`)

```
E4 (Subject Teacher) ──[Save Draft]───────► P3 ──► D4 (student_grades: status=draft)
E4 ──[Submit Sheet]──────────────────────► P3 ──► D4 (grade_submissions: status=submitted) + D4 (student_grades: status=submitted)
E4 ──[Reopen Sheet]──────────────────────► P3 ──► D4 (grade_submissions: status=reopened) + D4 (student_grades: status=draft)
E2 (School Admin) ──[View Grades]────────► P3 ──► D4 (read-only: grades.view permission)
E3 (Adviser) ──[View Grades]─────────────► P3 ──► D4 (read-only: grades.view permission, NO grades.write)

P3 Sub-processes (from `src/actions/grades.ts`, `src/lib/grades.ts`):
  P3.1  Context Verification (`verifyContext`): section.active=true, grading_period.school_year_id = section.school_year_id.
  P3.2  Roster Integrity (`sectionRoster`): active enrollments (`status='active'`) + active students (`status='active'`).
  P3.3  Draft Save (`saveSectionGradeDraft`): inserts/updates `student_grades` (status=draft); skips locked (`submitted`) rows.
  P3.4  Submit (`submitSectionGradeSheet`): validates completeness, creates `grade_submissions` row (`submitted`), updates grades to `submitted`.
  P3.5  Reopen (`reopenSectionGradeSheet`): creates `grade_submissions` row (`reopened`), reverts grades to `draft`.
  P3.6  Remove Draft (`removeSectionGrade`): deletes only `draft` rows; submitted rows must be reopened first.
  P3.7  Row-Level Enforcement (`canWriteGradesInSection`): user.role === "subject_teacher" + (section, subject) ∈ `section_subject_teachers`.

Data Stores Accessed:
  • `student_grades` (PK: id, UNIQUE: [enrollment_id, subject_id, grading_period_id], FK: enrollment/subject/period/user/submission)
  • `grade_submissions` (PK: id, FK: school_year/section/subject/grading_period/user; indexes: context, submitted_at)
  • `section_subject_teachers` (PK: id, UNIQUE: [section_id, subject_id], FK: section/subject/user)
```

### Process 4: Attendance Management (`P4`)

```
E3 (Adviser) ──[Record Attendance]───────► P4 ──► D3 (attendance_records)
E2 (School Admin) ──[Record / View]───────► P4 ──► D3
E6 (Guidance) ──[View Attendance]────────► P4 ──► D3

P4 Sub-processes (`attendance_records`):
  • Status values: present | absent_excused | absent_unexcused | late
  • Unique constraint: [enrollment_id, date]
  • FK: enrollment_id → student_enrollments.id, recorded_by → users.id
```

### Process 5: Behavior, Interventions & Assessment (`P5`)

```
E6 (Guidance) ──[Record Behavior]────────► P5 ──► D3 (behavior_records) + D3 (behavior_categories)
E6 ──[Record Confidential Note]─────────► P5 ──► D3 (confidential=true: visible only to admin/school_admin/guidance)
E6 ──[Record Intervention]──────────────► P5 ──► D3 (interventions) + D3 (intervention_followups)
E3 (Adviser) ──[Record Behavior]────────► P5 ──► D3
E8 (Nurse) ──[Record Health / Nutrition]─► P5 ──► D3 (health_records, clinical_records)
E9 (Literacy Coord) ──[Record Assessment]► P5 ──► D3 (assessments: domain=reading|literacy|numeracy)

P5 Sub-processes:
  P5.1  Behavior (`behavior_records`): categories (`behavior_categories`), severity (low/medium/high for concerns), status (open/monitored/resolved), confidential flag.
  P5.2  Interventions (`interventions`): type (e.g., Academic Remediation), status (planned/active/completed/discontinued), assigned_to (FK: users.id), created_by.
         Followups (`intervention_followups`): follow_up_date, status (scheduled/done/missed/cancelled), recorded_by.
  P5.3  Health (`health_records`): weight_kg, height_cm, bmi (computed), nutritional_status (normal/wasted/severely_wasted/overweight/obese).
         Clinical (`clinical_records`): category (Health Assessment/First Aid/Referral/Health Education/etc.), description, assessment, action_taken.
  P5.4  Assessments (`assessments`): domain (reading | literacy | numeracy), assessment_type (e.g. Phil-IRI), skill_area, date, level (configurable via system_settings), score, assessor_id (FK: users.id), notes.
```

### Process 6: Health & Nutrition (`P6`)

```
E7 (Nurse) ──[Record Health/Nutrition]────► P6 ──► D3 (health_records)
E7 ──[Record Clinical]──────────────────► P6 ──► D3 (clinical_records)
E2 (Admin) ──[View Health]────────────────► P6 ──► D3 (read-only for non-nurse; health.view required)

Data Stores:
  • `health_records` (PK: id, FK: student_id, school_year_id [nullable], recorded_by; index: student, date, status)
  • `clinical_records` (PK: id, FK: student_id, recorded_by; index: student, date)
```

### Process 7: Reports & Analytics (`P7`)

```
E4 (Subject Teacher) ──[Generate Section Report]──► P7 ──► D4 (reports, report_exports)
E2 (School Admin) ──[Generate / Export]────────────► P7 ──► D4 + File System (PDF/XLSX/CSV)
E5 (Records) ──[Generate / Export]────────────────► P7 ──► D4 + File System
E10 (Admin Officer) ──[Generate Reports]─────────► P7 ──► D4 (reports only; no student data access)

P7 Sub-processes (`src/lib/reports/*.ts`, `src/actions/reports.ts`, `src/lib/analytics.ts`):
  P7.1  Report Generation: creates `reports` row (name, report_type, scope [school/grade_level/section], filters_json); then `report_exports` (format: PDF/XLSX/CSV, file_reference, generated_by).
  P7.2  PDF Pipeline (`form137-pdf.tsx`, `report-card-pdf.tsx`, `pdf.tsx`): `@react-pdf/renderer` renders React components to PDF.
  P7.3  Excel Pipeline (`reports/excel.ts`): `exceljs` builds `.xlsx` files.
  P7.4  Forecasting (`forecasting/service.ts`, `forecasting/storage.ts`, `forecasting/arima.ts`): generates `forecasts` rows (`school_wide` / `grade_level` / `subject`) using `arima` package; invalidates on grade submission.
  P7.5  Performance Analytics (`performance/page.tsx`, `analytics.ts`): computes student performance metrics from `student_grades`.
```

### Process 8: Employee Records (`P8`)

```
E10 (Admin Officer) ──[Create / Update / Archive]──► P8 ──► D5 (employees, employee_201_records, service_credit_transactions)
E10 ──[Record 201 File]──────────────────────────► P8 ──► D5 (employee_201_records)
E10 ──[Record Service Credits]────────────────────► P8 ──► D5 (service_credit_transactions)
E1 (Admin) ──[View / Manage Employees]────────────► P8 ──► D5 (admin only)

P8 Constraints (from `permissions.ts`):
  • `admin_officer` has ONLY: dashboard.view, employees.*, employee_201.*, service_credits.*, reports.view, reports.generate, audit_logs.view.
  • Zero access to any student-related table (`students`, `student_grades`, etc.).
  • `service_credit_transactions`: type (earned | consumed), credits (positive), transaction_date, reason, reference_document; balance derived (sum earned − sum consumed).
```

### Process 9: Verification & QR (`P9`)

```
E5 (Records) ──[Generate QR / Verify Token]────────► P9 ──► D4 (qr_verifications)
E8 (Registrar) ──[Print Documents]────────────────► P9 ──► File System (PDF) + D4 (reports/exports metadata)
E1 (Admin) ──[Verify QR]──────────────────────────► P9 ──► D4 (qr_verifications)

P9 Sub-processes:
  P9.1  QR Verification (`qr.ts`, `qr_verifications`): token generation (generate), scan event (scan), revocation (revoke); result (valid/invalid/expired/revoked); IP/user agent logging.
  P9.2  Official Document Printing (`form137.ts`, `report-card-pdf.tsx`): generates PDF preview; `documents.print` permission required (registrar/admin/school_admin/records); NO database mutation.
```

---

## Data Flow Labels (Key Examples — All Data Stores Referenced)

| Source | Process | Destination Data Store | Data Flow Description |
|---|---|---|---|
| E4 (Subject Teacher) | P3.3 (Draft Save) | `student_grades` | Grade value, remarks, enrollment_id, subject_id, grading_period_id, status=draft |
| E4 (Subject Teacher) | P3.4 (Submit) | `grade_submissions` | School year, section, subject, period, status=submitted, entry_count, roster_count |
| E4 (Subject Teacher) | P3.4 (Submit) | `student_grades` | Updates status → submitted, submitted_at, submission_id |
| E4 (Subject Teacher) | P3.5 (Reopen) | `grade_submissions` | Status=reopened, reopened_at, reopened_by |
| E4 (Subject Teacher) | P3.5 (Reopen) | `student_grades` | Status → draft, submitted_at=null, submission_id=null |
| E6 (Guidance) | P5.1 (Behavior) | `behavior_records` | Student, category, date, description, severity, status, confidential, recorded_by |
| E6 (Guidance) | P5.2 (Intervention) | `interventions` | Student, type, description, status, start/target/completed dates, assigned_to, created_by |
| E6 (Guidance) | P5.2 (Followup) | `intervention_followups` | Intervention, follow_up_date, status, notes, recorded_by |
| E3 (Adviser) | P4 (Attendance) | `attendance_records` | Enrollment, date, status (present/absent_excused/absent_unexcused/late), remarks, recorded_by |
| E9 (Literacy Coord) | P5.4 (Assessment) | `assessments` | Student, domain (reading/literacy/numeracy), type, skill_area, date, level, score, assessor_id, notes |
| E7 (Nurse) | P6 (Health) | `health_records` | Student, measurement_date, weight_kg, height_cm, bmi, nutritional_status, remarks, recorded_by |
| E7 (Nurse) | P6 (Clinical) | `clinical_records` | Student, date, category, description, assessment, action_taken, remarks, recorded_by |
| E2 (School Admin) | P2.4 (Verification) | `record_verifications` | Student, submitted_by, reviewed_by [nullable], status, remarks, submitted_at, reviewed_at |
| E5 (Records) | P2.5 (Duplicate) | `duplicate_candidates` | Student, possible_student, match_score, match_reason, status, reviewed_by, review_notes |
| E5 (Records) | P2.1 (Archive) | `students` | Updates `status` → archived; `updated_by` |
| E10 (Admin Officer) | P8.2 (201 File) | `employee_201_records` | Employee, category, title, description, record_date, file_reference, is_archived |
| E10 (Admin Officer) | P8.3 (Service Credits) | `service_credit_transactions` | Employee, type (earned/consumed), credits, transaction_date, reason, reference_document |
| Any Role (Authorized) | P1 (Login) | `sessions` | Token hash, user_id, expires_at, ip, user_agent |
| Any Role (Authorized) | P1 (Audit) | `audit_logs` | User [nullable, set null], action, entity_type, entity_id, old/new JSON, ip, user_agent |

---

## Consistency Check Against Implementation

| Requirement | Verification |
|---|---|
| Every process exists in code | P1–P9 map to `src/actions/*.ts`, `src/lib/*.ts`, `src/app/*` |
| Every data store exists | All tables listed exist in `src/db/schema.ts` and `drizzle/*.sql` |
| Grade workflow accurate | P3 reflects `draft` → `submitted` → `reopened` with `grade_submissions` ledger |
| Adviser has NO `grades.write` | P3 input sources exclude adviser; `permissions.ts` confirms |
| Subject Teacher row-level enforcement | P3.7 references `section_subject_teachers` and `canWriteGradesInSection()` |
| Admin Officer isolated | P8 connects ONLY to D5 (`employees`, `employee_201_records`, `service_credit_transactions`); no student data flows |
| Health/Nurse isolation | P6 connects only to health/clinical tables; `NURSE` permissions exclude `students.update`, `guardians.manage` |
| Confidential behavior records | P5.1 includes `confidential` flag; `scope.ts` enforces server-side |
| No invented processes | All processes derived from actual actions and database tables |
| No invented roles | 10 roles from `constants.ts` / `permissions.ts`; no municipality/ barangay roles |
