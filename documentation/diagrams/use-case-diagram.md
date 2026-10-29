# 04 — Use Case Diagram (UML Style)

**Records Management System — Sta. Magdalena National High School**  
**Actors derived from `src/lib/constants.ts` and `src/lib/permissions.ts`**  
**Use cases derived from `src/actions/*.ts`, `src/app/*`, `src/lib/permissions.ts`, and `documentation/security/role-permission-matrix.md`**

---

## Actor Definitions (Verified from Implementation)

```
Actor Key  Role Name                     System Role Key (DB: roles.id)   Evidence
─────────────────────────────────────────────────────────────────────────────────────────────
ACT-01     System Administrator            admin                          src/lib/constants.ts
ACT-02     School Administrator            school_admin                    src/lib/constants.ts
ACT-03     Adviser (Teacher)               teacher                         src/lib/constants.ts
ACT-04     Subject Teacher                 subject_teacher                 src/lib/constants.ts
ACT-05     Records Personnel               records                         src/lib/constants.ts
ACT-06     Guidance Counselor              guidance                        src/lib/constants.ts
ACT-07     Nurse                           nurse                           src/lib/constants.ts
ACT-08     Registrar                       registrar                       src/lib/constants.ts
ACT-09     Language & Literacy Coord      literacy_coordinator           src/lib/constants.ts
ACT-10     Admin Officer                   admin_officer                   src/lib/constants.ts
```

---

## UML Use Case Diagram — System Boundary

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  RECORDS MANAGEMENT SYSTEM                                                                       │
│  (System Boundary)                                                                              │
│                                                                                               │
│  Use Case Groups:                                                                                 │
│  ├─ Authentication & Access Control                                                               │
│  ├─ User Management                                                                                │
│  ├─ Student Registry                                                                               │
│  ├─ Enrollment                                                                                     │
│  ├─ Academic Records (Grades)                                                                      │
│  ├─ Attendance                                                                                     │
│  ├─ Behavior & Interventions                                                                       │
│  ├─ Health & Nutrition                                                                             │
│  ├─ Assessments (Reading / Literacy / Numeracy)                                                   │
│  ├─ Verification & Duplicates                                                                      │
│  ├─ Reports & Analytics                                                                           │
│  ├─ Official Documents (PDF)                                                                       │
│  ├─ QR Verification                                                                                │
│  ├─ Audit & System                                                                                 │
│  └─ Employee Records (Isolated Domain)                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

Actors (outside boundary, left → right):
  ACT-01 Admin              ACT-02 School Admin          ACT-03 Adviser
  ACT-04 Subject Teacher    ACT-05 Records               ACT-06 Guidance
  ACT-07 Nurse              ACT-08 Registrar             ACT-09 Literacy Coord
  ACT-10 Admin Officer
```

---

## Detailed Use Case Mapping by Actor

### ACT-01 — System Administrator (`admin`)

**Permissions:** All (`PERMISSIONS`) except `grades.write` excluded by design; `grades.write` not granted even to admin (`TEACHER_ONLY_WRITE`). `src/lib/permissions.ts`: `ADMIN = PERMISSIONS.filter(p => !TEACHER_ONLY_WRITE.has(p))`.

```
Use Cases:
  UC-01.1  Login / Logout                       [Authentication & Access Control]
  UC-01.2  Manage Users (Create, Update, Deactivate)  [User Management] — includes escalation guard (`countOtherActiveAdmins`)
  UC-01.3  Manage Roles & Permissions               [System Settings / Config]
  UC-01.4  Manage System Settings                  [System] — `system_settings`
  UC-01.5  View Audit Logs                         [Audit] — `audit_logs`
  UC-01.6  Manage Students (Create, Update, Archive) [Student Registry]
  UC-01.7  Manage Guardians                        [Student Registry]
  UC-01.8  Manage Enrollment                        [Enrollment]
  UC-01.9  Configure Academics (Subjects, Grading Periods) [Academic]
  UC-01.10 View Grades                             [Grades — read-only for admin]
  UC-01.11 Manage Attendance                        [Attendance]
  UC-01.12 Manage Behavior (including confidential) [Behavior]
  UC-01.13 Manage Interventions                    [Interventions]
  UC-01.14 Manage Health / Nutrition               [Health]
  UC-01.15 Manage Assessments                      [Assessments]
  UC-01.16 Manage Verification & Duplicates         [Verification]
  UC-01.17 Generate & Export Reports               [Reports]
  UC-01.18 Print Official Documents (Form 137, Student Card) [Documents]
  UC-01.19 Verify QR Tokens                        [QR]
  UC-01.20 Manage Employee Records                  [Employee Domain]
  UC-01.21 Manage 201 File Records                  [Employee Domain]
  UC-01.22 Manage Service Credits                   [Employee Domain]
  UC-01.23 View Dashboard & Analytics              [Dashboard / Analytics]
```

---

### ACT-02 — School Administrator (`school_admin`)

**Permissions:** `SCHOOL_ADMIN` array (`permissions.ts`). NO `users.manage`, NO `employees.*`, NO `health.write` (per 2026-10 audit: school admin has `health.view` removed; `NURSE` only has health). Read-only grades (`grades.view`), full student management.

```
Use Cases:
  UC-02.1  Login / View Dashboard                  [Authentication / Dashboard]
  UC-02.2  View & Manage Students (Create, Update, Archive) [Student Registry]
  UC-02.3  Manage Guardians                         [Student Registry]
  UC-02.4  Manage Enrollment                        [Enrollment]
  UC-02.5  Configure Academics                     [Academic Config — subjects, grading periods]
  UC-02.6  View Grades (read-only)                  [Grades — NO grades.write]
  UC-02.7  Manage Attendance                         [Attendance]
  UC-02.8  Manage Behavior (including confidential)  [Behavior — full access]
  UC-02.9  Manage Assessments                        [Assessments]
  UC-02.10 Manage Interventions                     [Interventions]
  UC-02.11 Review Verification & Duplicates          [Verification — review/reject/approve]
  UC-02.12 Generate & Export Reports                [Reports — view, generate, export]
  UC-02.13 Print Official Documents                 [Documents]
  UC-02.14 Verify QR Tokens                         [QR]
  UC-02.15 View Audit Logs (limited)                 [Audit — `audit_logs.view` included]
  UC-02.16 Manage Settings (limited)                 [Settings — `settings.manage`, academic scope]
```

---

### ACT-03 — Adviser (`teacher` — assigned sections only)

**Permissions:** `TEACHER` array. `grades.view` but NO `grades.write` (revision B, 2026-10). Access restricted to assigned sections (`sections.adviser_id` = user.id) and their active enrollments.

```
Use Cases:
  UC-03.1  Login / View Dashboard                  [Authentication / Dashboard]
  UC-03.2  View Assigned Students                  [Student Registry — row-level scope via sections.adviser_id]
  UC-03.3  View Student Profiles                    [Profile — limited to assigned students]
  UC-03.4  View Guardians (of assigned students)    [Student Registry — scope-enforced]
  UC-03.5  View Enrollment (of assigned students)    [Enrollment]
  UC-03.6  View Grades (read-only oversight)          [Grades — grades.view ONLY; NO grades.write]
  UC-03.7  Record Attendance                         [Attendance — write for assigned sections]
  UC-03.8  Record Behavior                           [Behavior — write for assigned students]
  UC-03.9  Record Assessments                        [Assessments — write for assigned students]
  UC-03.10 View Interventions                        [Interventions — view only]
  UC-03.11 Generate Reports (section-level)          [Reports — reports.view + reports.generate; NO reports.export]
```

---

### ACT-04 — Subject Teacher (`subject_teacher` — departmental loads only)

**Permissions:** `SUBJECT_TEACHER` array. `grades.write` granted ONLY for assigned `(section, subject)` pairs in `section_subject_teachers`. Row-level enforcement in `canWriteGradesInSection()` (`src/lib/grades.ts`). No `students.create/update/archive`, no `behavior.write` (wait — `behavior.write` NOT in `SUBJECT_TEACHER`; behavior write is only for `teacher` and `guidance` — correct per `permissions.ts`), no `attendance.write`, no `interventions.write`.

```
Use Cases:
  UC-04.1  Login / View Dashboard                  [Authentication / Dashboard]
  UC-04.2  View Assigned Students                  [Student Registry — scope-enforced]
  UC-04.3  Select Assigned Subject                 [Academic — from `section_subject_teachers`]
  UC-04.4  Select Assigned Grade Level             [Academic — from section's grade level]
  UC-04.5  Select Assigned Section                 [Academic — from assigned sections]
  UC-04.6  Encode Grades (Draft)                    [Grades — grades.write; only for (section, subject) pairs in `section_subject_teachers`]
  UC-04.7  Save Grade Draft                          [Grades — updates `student_grades` status=draft; skips submitted/locked rows]
  UC-04.8  Submit Grades                             [Grades — creates `grade_submissions` (submitted), updates grades to submitted]
  UC-04.9  Reopen Submitted Grades                   [Grades — creates `grade_submissions` (reopened), reverts grades to draft]
  UC-04.10 View Grade Records                       [Grades — grades.view]
  UC-04.11 Generate Reports (limited)               [Reports — reports.view + reports.generate]
```

**Critical Constraint (from `permissions.ts` and `grades.ts`):**
- `subject_teacher` CANNOT modify students, guardians, attendance, behavior, interventions, health, assessments, or user data.
- `grades.write` is the ONLY write permission for this role. All grade mutations are validated: `user.role === "subject_teacher"` AND `(sectionId, subjectId)` exists in `section_subject_teachers` for the user.

---

### ACT-05 — Records Personnel (`records`)

**Permissions:** `RECORDS` array. Full student management (`students.*`, `guardians.*`, `enrollment.*`), read-only grades (`grades.view`), attendance (`attendance.view` — wait, `attendance.view` included in RECORDS; `attendance.write` NOT included — correct: records can view attendance but not write it; only `teacher` and `school_admin` have `attendance.write` per `permissions.ts`). Verification (`verification.review`, `duplicates.view`, `duplicates.review`), reports (`reports.view`, `reports.generate`, `reports.export`), QR (`qr.verify`), documents (`documents.print`).

```
Use Cases:
  UC-05.1  Login / View Dashboard                  [Authentication / Dashboard]
  UC-05.2  Create / Update / Archive Students       [Student Registry — full CRUD + archive]
  UC-05.3  Manage Guardians                         [Student Registry]
  UC-05.4  Manage Enrollment                        [Enrollment — create/update]
  UC-05.5  View Grades (read-only)                   [Grades — grades.view; NO grades.write]
  UC-05.6  View Attendance                          [Attendance — attendance.view; NO attendance.write]
  UC-05.7  View Assessments                         [Assessments — assessments.view; NO assessments.write]
  UC-05.8  Review Student Verification              [Verification — submit/approve/reject]
  UC-05.9  Review Duplicate Candidates              [Duplicates — confirm/dismiss/review]
  UC-05.10 Generate & Export Reports                [Reports — full export capability]
  UC-05.11 Print Official Documents                 [Documents — student card, Form 137]
  UC-05.12 Generate / Verify QR Tokens             [QR]
```

---

### ACT-06 — Guidance Counselor (`guidance`)

**Permissions:** `GUIDANCE` array. NO `students.create/update/archive`, NO `enrollment.manage` (wait — `enrollment.manage` NOT in GUIDANCE; `enrollment.view` only — correct: guidance can view enrollment but not manage it). `behavior.write`, `interventions.write`, `assessments.write` included. `grades.view` included. Confidential behavior access (`confidential` filter in `scope.ts`).

```
Use Cases:
  UC-06.1  Login / View Dashboard                  [Authentication / Dashboard]
  UC-06.2  Search Students / View Profile            [Student Registry — read-only; profile focused on support-related info]
  UC-06.3  View Guardians                           [Student Registry — view only]
  UC-06.4  View Enrollment                           [Enrollment — view only]
  UC-06.5  View Grades (read-only summary)            [Grades — grades.view; NO grades.write]
  UC-06.6  View Attendance                           [Attendance — view only]
  UC-06.7  Record Incident / Behavior Note            [Behavior — behavior.write; includes confidential records]
  UC-06.8  Select Incident Type                      [Behavior — from `behavior_categories` (seeded categories)]
  UC-06.9  Record Intervention                       [Interventions — interventions.write]
  UC-06.10 Record Intervention Follow-up              [Interventions — followups via `intervention_followups`]
  UC-06.11 View Incident / Intervention History      [Behavior / Interventions — full history]
  UC-06.12 Update Incident / Intervention Status     [Behavior (`open` → `monitored` → `resolved`) / Interventions (`planned` → `active` → `completed` → `discontinued`)]
  UC-06.13 View / Record Assessments                  [Assessments — assessments.write]
  UC-06.14 Generate Reports (limited scope)           [Reports — reports.view + reports.generate; NO reports.export]
```

---

### ACT-07 — Nurse (`nurse`)

**Permissions:** `NURSE` array (`permissions.ts`). Deliberately NO `students.update`, NO `guardians.manage`. ONLY `health.view`, `health.write`. `students.view`, `guardians.view`, `enrollment.view`. Reports (`reports.view`, `reports.generate`). NO `behavior.*`, NO `grades.view` (wait — `grades.view` NOT in NURSE; correct — nurse cannot see grades), NO `assessments.*` (wait — `assessments.view` NOT in NURSE; correct — nurse cannot see assessments).

```
Use Cases:
  UC-07.1  Login / View Dashboard                  [Authentication / Dashboard]
  UC-07.2  View Student Registry (read-only)         [Student Registry — NO edit access]
  UC-07.3  View Enrollment                           [Enrollment — read-only]
  UC-07.4  View Guardians                            [Guardians — read-only]
  UC-07.5  Record Health / Nutritional Data          [Health — health.write (`health_records`)]
  UC-07.6  Record Clinical Records                   [Health — health.write (`clinical_records`)]
  UC-07.7  View Health / Nutrition Reports           [Reports — health-related reports only]
  UC-07.8  View Student Health Profile               [Profile — health/nutritional fields only]
```

---

### ACT-08 — Registrar (`registrar`)

**Permissions:** `REGISTRAR` array. Strictly read-only (`no create/update/archive/write` on any student domain). Only `documents.print`, `reports.view`, `reports.generate`, `reports.export`, `qr.verify`. `grades.view`, `attendance.view`, `assessments.view`, `enrollment.view`, `students.view`, `guardians.view` — all view-only.

```
Use Cases:
  UC-08.1  Login / View Dashboard                  [Authentication / Dashboard]
  UC-08.2  View Student Records (read-only)           [Student Registry]
  UC-08.3  View Grades (read-only)                  [Grades — grades.view]
  UC-08.4  View Attendance (read-only)               [Attendance — attendance.view]
  UC-08.5  View Assessments (read-only)              [Assessments — assessments.view]
  UC-08.6  Generate Reports                          [Reports — view, generate, export]
  UC-08.7  Print Official Documents (Student Card, Form 137) [Documents — preview + print dialog; NO DB mutation]
  UC-08.8  Verify / Generate QR Tokens              [QR — qr.verify]
```

---

### ACT-09 — Language & Literacy Coordinator (`literacy_coordinator`)

**Permissions:** `LITERACY_COORDINATOR` array. `assessments.view`, `assessments.write`. `interventions.view`. `reports.view`, `reports.generate`. NO `behavior.*`, NO `health.*`, NO `grades.*`, NO user management.

```
Use Cases:
  UC-09.1  Login / View Dashboard                  [Authentication / Dashboard]
  UC-09.2  View Student Registry (read-only)         [Student Registry]
  UC-09.3  View Enrollment                           [Enrollment — read-only]
  UC-09.4  View Guardians                            [Guardians — read-only]
  UC-09.5  View Student Profile (assessment focus)    [Profile — assessment-related info]
  UC-09.6  Record Reading Assessment                  [Assessments — domain=reading]
  UC-09.7  Record Literacy Assessment                 [Assessments — domain=literacy]
  UC-09.8  Record Numeracy Assessment                 [Assessments — domain=numeracy]
  UC-09.9  View Assessment Reports                    [Reports — reading, literacy, numeracy]
  UC-09.10 View Interventions (read-only)             [Interventions — interventions.view]
  UC-09.11 Generate Reports (assessment focus)       [Reports — reports.generate]
```

---

### ACT-10 — Admin Officer (`admin_officer`)

**Permissions:** `ADMIN_OFFICER` array. ONLY employee-related: `employees.*`, `employee_201.*`, `service_credits.*`, `reports.*`, `audit_logs.view`. NO student data access of any kind (`students.*`, `enrollment.*`, `grades.*`, `behavior.*`, `assessments.*`, `interventions.*`, `health.*`, `guardians.*`, `qr.verify` excluded). `dashboard.view` granted.

```
Use Cases:
  UC-10.1  Login / View Dashboard                  [Authentication / Dashboard — isolated view]
  UC-10.2  Manage Employee Records                  [Employees — employees.create/update/archive]
  UC-10.3  Manage 201 File Records                  [Employee 201 — employee_201.manage (create/update/archive)]
  UC-10.4  Record Service Credits Earned             [Service Credits — service_credits.manage (earned)]
  UC-10.5  Record Service Credits Consumed           [Service Credits — service_credits.manage (consumed)]
  UC-10.6  View Service Credit Balance (derived)     [Employee — balance = total(earned) − total(consumed); NOT a stored column]
  UC-10.7  View Audit Logs (employee actions)        [Audit — audit_logs.view]
  UC-10.8  Generate Reports (employee focus)         [Reports — reports.view + reports.generate; reports.export NOT granted]
```

---

## Use Case Dependency & Include/Extend Relationships

```
[UC-01.2 Manage Users] <<include>> [UC-01.1 Login]      [Requires authentication]
[UC-01.2 Manage Users] <<extend>>  [UC-01.2b Role Escalation Guard]  [Only admin creates admins]
[UC-04.6 Encode Grades] <<include>> [UC-04.3 Select Assigned Subject]  [Scope enforcement]
[UC-04.6 Encode Grades] <<include>> [UC-04.7 Save Draft / UC-04.8 Submit / UC-04.9 Reopen]
[UC-03.2 View Assigned Students] <<include>> [Row-Level Scope Check (scope.ts)]  [Enforced server-side]
[UC-06.7 Record Incident] <<include>> [Select Incident Type (behavior_categories)]
[UC-08.7 Print Official Documents] <<extend>> [Generate PDF (react-pdf)]  [No DB mutation; preview only]
[UC-07.5 Record Health] <<include>> [Compute BMI]  [Computed by action layer; stored in health_records.bmi]
[UC-10.6 View Service Credit Balance] <<include>> [Derive Balance]  [Derived query: SUM(earned) − SUM(consumed); no stored balance column]
```

---

## Cross-Verification (Consistency with Other Diagrams)

| Use Case | Process in DFD (P#) | Data Store in DFD (D#) | Actor in Context Diagram | Role in Permissions (`permissions.ts`) |
|---|---|---|---|---|
| UC-04.6 Encode Grades | P3 (Grade Management) | D4 (`student_grades`, `grade_submissions`) | Subject Teacher (E4) | `subject_teacher` — `grades.write` granted |
| UC-03.6 View Grades (read-only) | P3 | D4 | Adviser (E3) | `teacher` — `grades.view` only; NO `grades.write` |
| UC-01.10 View Grades | P3 | D4 | Admin (E1) | `admin` — `grades.view` (NOT `grades.write` by design) |
| UC-06.7 Record Incident | P5.1 (Behavior) | D3 (`behavior_records`) | Guidance (E6) | `guidance` — `behavior.write` granted |
| UC-10.2 Manage Employee Records | P8 (Employee Records) | D5 (`employees`) | Admin Officer (E10) | `admin_officer` — `employees.*` granted; NO student access |
| UC-07.5 Record Health | P6 (Health) | D3 (`health_records`) | Nurse (E7) | `nurse` — `health.write` granted; NO `students.update` |
| UC-02.2 Manage Students | P2 (Student Registry) | D2 (`students`) | School Admin (E2) | `school_admin` — `students.*` granted |
| UC-08.7 Print Documents | P9 (Verification/QR) | D4 (`reports`, `report_exports`) | Registrar (E8) | `registrar` — `documents.print` granted; NO `students.update` |
| UC-05.2 Create/Update Students | P2 | D2 | Records (E5) | `records` — `students.create/update/archive` granted |
| UC-05.11 Print Official Documents | P9 | File System (PDF) + D4 | Records (E5) | `records` — `documents.print` granted |

---

## Key Design Decisions (Verified in Source)

1. **Subject Teacher Grade Scope:** `UC-04.6 Encode Grades` is ONLY available to `subject_teacher`. The `TEACHER` role (`teacher` / Adviser) does NOT have `grades.write`. The `admin` role does NOT have `grades.write` (intentionally excluded via `TEACHER_ONLY_WRITE`). This is enforced in `permissions.ts` (line 83) and `grades.ts` (`getGradeWriter()` requires role === `"subject_teacher"` + `canWriteGradesInSection()` check).

2. **Adviser Read-Only Grades:** `UC-03.6` confirms the adviser (`teacher`) has `grades.view` but NO `grades.write`. This reflects the 2026-10 revision (documented in `permissions.ts` comments and `grade-scope.test.ts`).

3. **Admin Officer Isolation:** `UC-10.x` series connects ONLY to `P8` and `D5`. No use case references student data. This matches `permissions.ts` (`ADMIN_OFFICER` array excludes all student permissions) and `scope.ts` (`admin_officer` scope rules deny all student rows).

4. **Registrar Strictly Read-Only:** `UC-08.x` has NO create/update/archive/write use cases on any student data. Only `documents.print` (preview + browser print, no DB mutation) and `reports.export`.

5. **Nurse Health Isolation:** `UC-07.5` references `health_records` and `clinical_records` only. `UC-07.2` confirms read-only student access (`students.view` only, no `update`). This aligns with `permissions.ts` `NURSE` array.
