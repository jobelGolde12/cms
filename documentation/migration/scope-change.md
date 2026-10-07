# Scope Change — From Municipality-Wide Child Mapping to School Records Management

> STATUS: **PLAN**

## 1. What Changed

The project's concept moved from the *Integrated Web-Based Child Mapping System*
(municipality-wide, multi-agency, barangay-driven) to the *Records Management System
with Profile and Performance Analytics of **Sta. Magdalena National High School***
(school-only, internal, student-centric).

## 2. Why the Data Model Changes

| Old driver | New driver | Consequence |
|---|---|---|
| Barangay = operational scope | Grade level + section = operational scope | `barangays`/`municipalities` out; `sections`, `grade_levels`, `school_years` in |
| Child = census subject (may not be in school) | Student = enrolled learner | `children` → `students` (+ enrollment, guardians) |
| Education status = field-collected attribute | Enrollment = system of record | `child_education.educationStatus` out; `student_enrollments` in |
| ECCD / disability census | School-based support | `child_eccd`, `child_disabilities` archived (data review first) |
| OSY monitoring | Not applicable | Monitoring types redefined |
| Municipal/barangay summary reports | School/grade/section reports | Report catalog rebuilt |
| LGU & barangay users | School personnel | Role set rebuilt; `/register` removed |
| Public QR verification of census records | Secure student identifier | QR retained, purpose narrowed & security-reviewed |

## 3. Architectural Invariants (unchanged)

- Next.js App Router + server components + server actions (`src/actions/*`).
- Turso/libSQL + Drizzle (`src/db/*`).
- Server-side authorization (`requirePermission`, `getAuthorizedUser`, scope helpers).
- Append-only audit logs; rate-limited login; secure session cookie.
- Design system: `brand-*`, `action-*`, `status-*` tokens, Fira Sans, editorial landing.

## 4. What Users Will Notice

- Same look & feel; new title and wording ("Student" everywhere).
- Sidebar: Dashboard, Students, Performance, Student Development, Reports, Administration.
- Dashboard: school KPIs (enrollment, general average, attendance rate, reading/literacy/numeracy proficiency, students needing support, active interventions).
- No barangay pickers, no municipality summaries, no public registration.
