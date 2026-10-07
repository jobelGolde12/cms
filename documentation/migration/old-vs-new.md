# Old vs New — System Comparison

> STATUS: **PLAN** — based on the actual codebase audit (see `codebase-audit.md`).

## 1. Identity & Purpose

| | Old | New |
|---|---|---|
| Title | Integrated Web-Based Child Mapping System | Records Management System with Profile and Performance Analytics of Sta. Magdalena National High School |
| Purpose | Municipal child census, DepEd Form 1 verification, LGU monitoring | Internal school records + student performance analytics |
| Users | Barangay users, LGU users, system admins | School personnel (admins, school admin, teachers, records, guidance) |

## 2. Data Model

| Old (src/db/schema.ts) | New | Migration action |
|---|---|---|
| `municipalities` | — | Archive |
| `barangays` | `sections` (+ `grade_levels`) | Archive after data mapping |
| `schools` | single-school profile (system settings) | Archive |
| `users` (+barangayId) | `users` (+assignment fields) | Migrate |
| `roles` / `permissions` / `role_permissions` | same tables, new catalog | Re-seed |
| `sessions` | unchanged | Retain |
| `children` | `students` | Migrate (name/birthdate/sex/status) |
| `child_addresses` | folded into student contact/address fields | Archive |
| `child_education` | `student_enrollments` | Transform |
| `child_eccd` | — | Archive |
| `child_disabilities` | (sensitive notes) — decision point | Archive |
| `child_validations` | `record_verifications` (student checks) | Transform |
| `child_duplicate_candidates` | `duplicate_candidates` | Migrate |
| `child_monitoring` | behavior / development records | Transform |
| `interventions`, `intervention_followups` | same, student-scoped | Migrate |
| `qr_verifications` | same, student-scoped | Migrate |
| `reports`, `report_exports` | same, new catalog | Re-seed catalog |
| `notifications`, `audit_logs`, `system_settings` | unchanged | Retain |
| — | `guardians`, `student_guardians` | New |
| — | `school_years`, `grade_levels`, `sections`, `student_enrollments` | New |
| — | `subjects`, `grading_periods`, `student_grades` | New |
| — | `attendance_records` | New |
| — | `behavior_categories`, `behavior_records` | New |
| — | `assessments` (reading/literacy/numeracy) | New |

## 3. Roles & Permissions

| Old | New |
|---|---|
| `barangay` (Barangay User) | removed |
| `lgu` (LGU User) | removed |
| `admin` (System Administrator) | retained |
| — | **School Administrator** |
| — | **Teacher / Adviser** (assigned sections) |
| — | **Records Personnel** |
| — | **Guidance / Student Support Personnel** |

Permission keys are re-cataloged (`students.*`, `enrollment.*`, `grades.*`,
`attendance.*`, `behavior.*`, `assessments.*`, `interventions.*`, `reports.*`,
`users.*`, `audit_logs.*`, `settings.manage`). See
`documentation/security/role-permission-matrix.md`.

## 4. Pages & Routes

| Old route | New route | Action |
|---|---|---|
| `/` + `/welcome` | `/` + `/welcome` | Rewrite copy to school identity |
| `/login` | `/login` | Retain (relabel) |
| `/register` | — | Remove |
| `/dashboard` | `/dashboard` | Rewrite metrics (school KPIs) |
| `/children` | `/students` | Rewrite (registry) |
| `/children/new` | `/students/new` | Rewrite |
| `/children/[id]` | `/students/[id]` | Rewrite (profile IA per TODO §25) |
| `/children/[id]/edit` | `/students/[id]/edit` | Rewrite |
| `/validation` | `/verification` | Repurpose (record verification) |
| `/duplicates` | `/duplicates` | Rewrite (student fields) |
| `/monitoring` (+ `[type]`, `/interventions`) | `/development` (+ behavior, interventions) | Repurpose |
| — | `/performance` (academic, attendance, reading, literacy, numeracy) | New |
| `/reports` | `/reports` | Rewrite catalog |
| `/qr` | `/qr` | Retain, student-scoped |
| `/verify`, `/verify/[token]`, `/verify/result` | `/verify/*` | Security review; retain if school wants QR identity verification |
| `/users` | `/users` | Retain (new roles) |
| `/activity-logs` | `/activity-logs` | Retain |
| `/notifications` | `/notifications` | Retain |
| `/settings` | `/settings` | Rewrite (school profile, grading config, assessment levels) |
| `/api/reports/[type]` | `/api/reports/[type]` | Rewrite data builders |
| `/logout` | `/logout` | Retain |

## 5. Analytics

| Old dashboard | New dashboard |
|---|---|
| Total children / verified / pending | Total students / active / current enrollment |
| Enrolled vs out-of-school | General average, attendance rate |
| ECCD non-participation, disability counts | Reading / literacy / numeracy proficiency |
| Barangay distribution | Enrollment by grade level & section |
| Monitoring casework by type | Intervention status, students needing support |
| Municipal summary reports | School-year comparison reports |
