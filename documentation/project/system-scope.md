# System Scope — School-Only Platform

> STATUS: **PLAN** — target-state scope contract for the migration.

## 1. In Scope

| Domain | Capability |
|---|---|
| Students | Registry, profiles, archive, search/filter, duplicate review, record verification |
| Enrollment | Per school-year enrollment (grade level + section), full history, never overwritten |
| Academic | Subjects, grading periods, per-subject quarterly grades, general average |
| Attendance | Daily per-student attendance records; rate/trend analytics |
| Behavior | Categorized, permission-controlled records with neutral language |
| Reading / Literacy / Numeracy | Configurable assessments, levels, scores, trends |
| Interventions | Planned → active → completed → discontinued lifecycle with follow-ups |
| Analytics | Enrollment, academic, attendance, behavior, reading/literacy/numeracy, intervention |
| Reports | School-level report catalog, PDF/XLSX/CSV export (existing pipeline) |
| QR | Secure student identifier tokens → server-side verification → limited info |
| Administration | Users, roles & permissions, audit logs, settings |
| Privacy | Data minimization, RBAC, append-only audit trail |

## 2. Out of Scope (Absolute Boundary)

- Municipality management, barangay management, LGU workflows
- Community volunteer coordination, multi-agency data sharing
- Public child/student registry or directory
- House-to-house survey workflows, child mapping
- Nationwide student database
- Third-party data-sharing integrations

## 3. Features Removed from the Old System

| Removed | Old location | Disposition |
|---|---|---|
| Municipality reference data & municipal summary reports | `municipalities` table, `src/lib/constants.ts` `MUNICIPALITY`, `src/lib/reports/report-data.ts` | Remove tables/labels; replace with single-school profile settings |
| Barangay management + 14-barangay seed | `barangays` table, `src/actions/get-barangays.ts`, seed script | Remove; replaced by grade levels & sections |
| Barangay-scoped data access | `src/lib/scope.ts` | Rewrite: scope becomes role × assignment (teacher → sections) |
| Public registration (`/register`) | `src/app/register/page.tsx`, `src/actions/register.ts` | Remove route + action; accounts provisioned by admin |
| Out-of-School Youth / ECCD / disability-census monitoring types | `childMonitoring.monitoringType`, `child_eccd`, `child_disabilities` | Repurpose monitoring to school context; archive ECCD/disability tables after data review |
| Education status of non-students (`out_of_school`, `not_yet_in_school`) | `child_education.educationStatus` | Replaced by real enrollment history |
| Public `/verify` child-record confirmation for LGU field work | `src/app/verify/*` | Re-evaluate: retain only if the school wants QR identity verification; see `documentation/features/qr-verification.md` |

## 4. Features Retained (Evolved)

- Session auth (`cms_session` cookie, bcrypt, DB-backed sessions) — unchanged mechanics.
- RBAC skeleton (`roles`, `permissions`, `role_permissions`, `src/lib/permissions.ts`) — role set redefined.
- Append-only audit logs (`audit_logs`, `src/lib/audit.ts`).
- Duplicate detection + human review (`src/lib/duplicates.ts`) — matching fields become student fields.
- Report export pipeline (`src/lib/reports/*`, `/api/reports/[type]`) — report catalog redefined.
- QR token model (`src/lib/qr.ts`) — opaque tokens, server-side resolution retained.
- Loading/empty/error state system, skeletons, design tokens — untouched.
- Vitest test suites in `src/lib/__tests__/` — extended, not replaced.

## 5. Features Repurposed

| Old | New |
|---|---|
| Validation workflow (child record verification) | **Student record verification** (completeness/consistency checks; duplicates) |
| Monitoring module (OSY/ECCD/disability/general) | **Student Development** (behavior follow-ups, intervention monitoring) |
| Registry (children per barangay) | **Student Registry** (students of the school) |
| Dashboard (municipal demographics) | **School dashboard** (enrollment, performance, attendance, support metrics) |
| Reports (municipal/barangay summaries) | **School reports** (master list, enrollment, grade, attendance, performance) |
