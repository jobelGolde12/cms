# 02 — Context Diagram (Level 0 DFD)

**System Boundary:** Records Management System with Profile and Performance Analytics  
**Central Process:** School Records & Performance System  
**Scope:** Sta. Magdalena National High School — Internal Personnel Only  
**Not in scope:** Municipality / LGU / Barangay / Public access (removed in migration)

---

## Context Diagram — External Entities and Information Flows

```
                              ┌──────────────────────────────────────┐
                              │   EXTERNAL ENTITIES                  │
                              │                                      │
  ┌───────────────────────┐   │  • System Administrator (admin)      │
  │  EXTERNAL             │   │  • School Administrator              │
  │  REFERENCE DATA       │   │    (school_admin)                    │
  │                       │   │  • Adviser / Teacher (teacher)       │
  │  • Student Profile    │◄──│  • Subject Teacher (subject_teacher) │
  │    Documents          │   │  • Records Personnel (records)       │
  │  • Official Forms     │   │  • Guidance Counselor (guidance)     │
  │    (Form 137,         │   │  • Nurse (nurse)                     │
  │     Student Card)     │   │  • Registrar (registrar)             │
  │  • DepEd Reference    │   │  • Language & Literacy Coordinator   │
  │    Standards          │   │    (literacy_coordinator)            │
  │                       │   │  • Admin Officer (admin_officer)     │
  └───────────────────────┘   │                                      │
         │                  │                                      │
         │ PDF / Card Data │                                      │
         │ (documents)      │                                      │
         ▼                  │                                      │
  ┌───────────────────────┐   │                                      │
  │  SCHOOL SYSTEM        │◄──│  Information Exchanged (per role):   │
  │  (Central Process)    │   │                                      │
  │  ─────────────────    │   │  ADMIN:                              │
  │  • Authentication     │   │    • Manage users / roles / settings │
  │  • Student Registry   │   │    • View audit logs                 │
  │  • Academic Records   │   │    • Full system access              │
  │  • Health / Nutrition │   │                                      │
  │  • Behavior /         │   │  SCHOOL ADMIN:                       │
  │    Interventions      │   │    • Manage students / enrollment     │
  │  • Assessments        │   │    • Configure academics (subjects, │
  │  • Reports / Analytics│   │      grading periods)                │
  │  • Employee Records   │   │    • View grades / attendance         │
  │  • QR Verification    │   │    • Generate reports / exports      │
  │  • Audit Trail        │   │                                      │
  └───────────────────────┘   │  ADVISER (teacher):                  │
          │                  │    • View assigned students            │
          │                  │    • View student profiles             │
          │ Student Data     │    • View grades / attendance          │
          │ Reports          │    • Record attendance / behavior      │
          ▼                  │    • Record assessments / behavior     │
  ┌───────────────────────┐   │    • Generate reports (section)      │
  │  SYSTEM OUTPUTS       │   │                                      │
  │                       │   │  SUBJECT TEACHER:                    │
  │  • Student Master List│   │    • Encode grades (assigned subjects│
  │  • Enrollment Reports │   │      in assigned sections only)      │
  │  • Grade Reports      │   │    • Save / submit grade sheets      │
  │  • Report Cards       │   │    • View grade records              │
  │  • Performance        │   │                                      │
  │    Analytics          │   │  RECORDS PERSONNEL:                  │
  │  • Form 137 (PDF)     │   │    • Create / update / archive       │
  │  • Student Card (PDF) │   │      students                        │
  │  • Health Reports     │   │    • Manage guardians / enrollment    │
  │  • Reading / Literacy │   │    • Verify / review records         │
  │    / Numeracy Reports │   │    • Review duplicate candidates     │
  │  • Intervention       │   │    • Print official documents        │
  │    Reports            │   │    • Generate / export reports       │
  │  • Service Credits    │   │                                      │
  │    Report             │   │  GUIDANCE COUNSELOR:                  │
  │  • Audit Logs         │   │    • Search students / view profiles  │
  └───────────────────────┘   │    • Record incidents (behavior)      │
                              │    • Record interventions             │
                              │    • View incident history            │
                              │                                      │
                              │  NURSE:                              │
                              │    • Record health / nutritional data │
                              │    • Record clinical records          │
                              │    • View health reports              │
                              │                                      │
                              │  REGISTRAR:                          │
                              │    • View all student records (read) │
                              │    • Print official documents         │
                              │    • Generate / export reports        │
                              │                                      │
                              │  LITERACY COORDINATOR:                │
                              │    • Record reading / literacy /      │
                              │      numeracy assessments             │
                              │    • View assessment reports          │
                              │                                      │
                              │  ADMIN OFFICER:                      │
                              │    • Manage employee records         │
                              │    • Manage 201 file records          │
                              │    • Record service credits           │
                              │    • NO student access (isolated)     │
                              └──────────────────────────────────────┘
```

---

## System Boundary & Key Constraints

| Constraint | Implementation Evidence |
|---|---|
| **No public/student access** | Self-registration removed (`login/page.tsx`); internal accounts only (`users` table, `createUser` action requires `users.manage`) |
| **No LGU / municipality scope** | `barangays`, `municipalities` tables removed; `project-overview.md` confirms |
| **Admin Officer isolated** | `ROLE_PERMISSIONS` for `admin_officer` excludes all `students.*`, `enrollment.*`, `grades.*`, `behavior.*`, `assessments.*`, `interventions.*`, `health.*`; database has separate `employees` domain |
| **Subject Teacher scope** | `section_subject_teachers` table + `canWriteGradesInSection()` (`src/lib/grades.ts`) enforces row-level grade encoding |
| **Adviser does NOT encode grades** | `TEACHER` permission array excludes `grades.write` (`src/lib/permissions.ts`, comment line 130) |
| **Registrar strictly read-only** | `REGISTRAR` array excludes all write permissions; `documents.print` is preview-only (`src/lib/reports/*.tsx`) |
| **Grade submission lock** | `grade_submissions` ledger (`submitted` / `reopened`) locks `student_grades.status` (`src/actions/grades.ts`) |

---

## Information Flow Summary (Simplified)

```
External User → System → Data Store / Process → System → External User

Example: Subject Teacher
  Input:  Grade values (draft / submit / reopen request)
  Process: `saveSectionGradeDraft()` / `submitSectionGradeSheet()` / `reopenSectionGradeSheet()`
  Data Store: `student_grades`, `grade_submissions`, `student_enrollments`, `sections`
  Output: Confirmed grade sheet / Error message (missing grades, invalid grades)

Example: Admin Officer
  Input:  Employee data / 201 file entry / Service credit transaction
  Process: `createEmployee()` / `updateEmployee()` / `addEmployee201Record()` / `addServiceCredit()`
  Data Store: `employees`, `employee_201_records`, `service_credit_transactions`
  Output: Updated employee profile / 201 file / Credit balance (derived: earned − consumed)
  Constraint: Zero access to `students`, `student_grades`, `behavior_records`, etc.
```
