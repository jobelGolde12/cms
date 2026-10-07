# Requirements — Records Management System with Profile and Performance Analytics of Sta. Magdalena National High School

> STATUS: **PLAN** — requirements derived from TODO.md §4 (objectives), §13 (roles),
> and the actual capabilities of the existing codebase. Each requirement is
> testable and maps to phases in `documentation/migration/master-migration-plan.md`.

## 1. Functional Requirements

### FR-1 Student Records
- FR-1.1 Create student profiles: student number (auto-generated, e.g. `SM-2026-000001`), name (first/middle/last/suffix), birth date, sex, contact info (optional), status.
- FR-1.2 Edit, archive (soft status), and search students (server-side pagination, filters: name, student number, grade level, section, enrollment status).
- FR-1.3 Duplicate detection on create/edit (student number, name, birth date, sex) with **human review only** — never auto-merge.
- FR-1.4 Student profile page with sections: Overview, Personal Information, Enrollment, Academic Performance, Attendance, Behavior, Reading, Literacy, Numeracy, Interventions, Achievements (optional), Activity History.

### FR-2 Guardians
- FR-2.1 Record parent/guardian information (name, relationship, contact) per student.
- FR-2.2 Multiple guardians per student via a join table; guardian data is sensitive (access-controlled).

### FR-3 Enrollment
- FR-3.1 Enroll a student per school year into a grade level and section.
- FR-3.2 Historical enrollment is immutable — a new school year creates a new row; prior rows are never overwritten.
- FR-3.3 Enrollment states: active, completed, transferred, withdrawn.

### FR-4 Academic Records
- FR-4.1 Subject catalog (definitions editable by admin).
- FR-4.2 Grading periods (e.g. four quarters per school year — configurable).
- FR-4.3 Per-student, per-subject, per-period grade records.
- FR-4.4 General average computed server-side from subject grades.
- FR-4.5 Grading scale/thresholds are **configuration, not invention** — documented defaults are placeholders pending school input (see `documentation/features/academic.md`).

### FR-5 Attendance
- FR-5.1 Record daily attendance per enrolled student: present, absent (excused/unexcused), late, with recording user and date.
- FR-5.2 Analytics: attendance rate, absence/late counts, monthly/quarterly trends, students with repeated absences.

### FR-6 Behavior
- FR-6.1 Categorized behavior records (positive + concern categories, configurable).
- FR-6.2 Fields: student, date, category, description, severity, recorded_by, follow-up, status.
- FR-6.3 Permission-controlled; neutral language (no stigmatizing labels).

### FR-7 Reading / Literacy / Numeracy Assessments
- FR-7.1 Assessment records: date, assessment type, level/proficiency, score, assessor, notes.
- FR-7.2 Assessment categories and levels are **configurable** (no invented standards).
- FR-7.3 Literacy is modeled as a broader assessment category sharing the assessment engine (documented decision — see `documentation/features/literacy.md`).
- FR-7.4 Analytics: proficiency distribution, trends, grade-level comparison, students needing support.

### FR-8 Interventions
- FR-8.1 Intervention records: student, type, reason, assigned personnel, start/target dates, status (planned/active/completed/discontinued), outcome, notes, follow-ups.
- FR-8.2 Analytics: active/completed counts, outcomes, students requiring follow-up.

### FR-9 "Requires Attention" Indicators
- FR-9.1 Configurable indicator rules (low performance, declining grades, repeated absences, low reading/literacy/numeracy, repeated behavior concerns, incomplete intervention).
- FR-9.2 Neutral terminology only: "Requires Attention", "Needs Monitoring", "Academic Support Recommended".
- FR-9.3 Every rule and threshold documented in `documentation/features/analytics.md`; never presented as a diagnosis.

### FR-10 Reports
- FR-10.1 School report catalog (master list, enrollment, grade, subject performance, attendance, behavior, reading, literacy, numeracy, intervention, profile, needs-monitoring, grade-level/section performance, school-year comparison).
- FR-10.2 PDF/XLSX/CSV export via the existing `/api/reports/[type]` pipeline, with authorization, filters, school-year selection, empty states, audit logging.

### FR-11 QR Verification
- FR-11.1 QR = secure student identifier only (opaque token). Server validates token → permission check → limited info.

### FR-12 Administration
- FR-12.1 User management (create, update, disable) by System Administrator.
- FR-12.2 Role & permission management.
- FR-12.3 Audit log viewer; system settings (school profile, grading config, assessment levels).

## 2. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | **Design preservation:** existing Tailwind tokens/layout/component style unchanged; content & IA only. |
| NFR-2 | **Performance:** server-side aggregation, indexed queries, pagination; no N+1; no full-table client loads. |
| NFR-3 | **Security:** server-side authorization on every page/action/route; httpOnly session cookie; bcrypt; Zod validation; parameterized queries (Drizzle); audit logging on sensitive ops. |
| NFR-4 | **Privacy:** data minimization, no PII in QR/logs, guardian & behavior data access-controlled, DPA (RA 10173) aligned. |
| NFR-5 | **Accessibility:** keyboard nav, 3px focus rings (existing), semantic tables, chart descriptions, form errors associated with fields. |
| NFR-6 | **Responsiveness:** dashboard/registry/profile/forms usable on desktop, laptop, tablet, mobile; tables have a deliberate mobile strategy. |
| NFR-7 | **States:** every major page has loading (skeleton), empty, error, and success feedback in existing UI language. |
| NFR-8 | **Testing:** Vitest units for auth/scope/workflow/schemas/analytics; authorization tests per role. |
| NFR-9 | **No hardcoded production data:** development seed clearly identified as fictional demo data. |

## 3. Acceptance Criteria (summary)

- A school user can create a student, enroll them, record grades/attendance/assessments, and see analytics update — all from the database.
- Obsolete municipality/barangay/LGU flows are unreachable (routes removed or redirected) and their tables archived per migration plan.
- Every role in `documentation/security/role-permission-matrix.md` gets exactly the documented access (verified by tests).
- The app looks and feels like the same application post-migration.
