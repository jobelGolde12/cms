# Project Overview — Records Management System with Profile and Performance Analytics of Sta. Magdalena National High School

> STATUS: **PLAN (Phase 2 of the master migration plan)** — this document describes the
> *target* system. The repository currently contains the "Integrated Web-Based Child
> Mapping System" (municipality scope). See `documentation/migration/old-vs-new.md`.

## 1. Official System Identity

- **Old title (OUTDATED):** Integrated Web-Based Child Mapping System
- **New official title:** *Records Management System with Profile and Performance Analytics of Sta. Magdalena National High School*

The new title must be used consistently in page metadata, layout chrome
(`src/components/app-shell.tsx`), landing page (`src/components/welcome/*`),
auth pages, report headers, and documentation.

## 2. System Identity Change

| Aspect | Old | New |
|---|---|---|
| Owning entity | Municipality of Sta. Magdalena, Sorsogon (LGU) | **Sta. Magdalena National High School** |
| Platform type | Municipality-wide child census / mapping | **Internal school records + performance analytics platform** |
| Central entity | `children` (child of a barangay) | **`students`** (enrolled learner of the school) |
| Users | Barangay personnel, LGU users, admins | **School personnel only** (all users belong to or are officially associated with the school) |
| Geography | 14 barangays, municipality, province, region | **Removed** — no barangay/municipality data model |
| Registration | Public-ish /register application flow | **Internal accounts provisioned by the System Administrator** (self-registration removed) |
| QR verify | Public `/verify` child-record lookup | **Secure student identifier verification** (token → server validation → limited info), re-evaluated for school context |

## 3. Primary Objectives

Authorized school personnel use the system to:

1. Manage student profiles.
2. Manage enrollment records (with full historical enrollment).
3. Maintain academic records (subjects, grading periods, grades).
4. Monitor grades (subject averages, general average, trends).
5. Monitor attendance (present/absent/late/excused/unexcused).
6. Monitor behavior (permission-controlled, neutral language).
7. Monitor reading performance (configurable assessment levels).
8. Monitor literacy performance.
9. Monitor numeracy performance.
10. Record interventions (planned → active → completed → discontinued).
11. Identify students who may require additional support ("Needs Monitoring" — neutral terminology, documented rules only).
12. Analyze student performance and compare across periods.
13. Generate school reports (PDF/XLSX/CSV via the existing report pipeline).
14. Maintain historical records (enrollment, academic, assessment history).
15. Maintain an audit trail (existing append-only `audit_logs` retained).
16. Protect sensitive student information (server-side authorization, data minimization).

## 4. Conceptual Model (Data Flow)

```
SCHOOL
  ↓
USERS (school personnel)
  ↓
STUDENTS  ←── central entity
  ↓
ENROLLMENT (student → school year → grade level → section)
  ↓
STUDENT PROFILE
  ↓
ACADEMIC PERFORMANCE (grades)
  ↓
ATTENDANCE · BEHAVIOR · READING · LITERACY · NUMERACY
  ↓
INTERVENTIONS
  ↓
ANALYTICS
  ↓
REPORTS
```

## 5. Absolute Scope Boundary (MUST NOT exist)

The system must NOT be or contain:

- Municipality / barangay / LGU / community management
- Public child registry or public student directory
- Multi-agency platform or third-party data-sharing platform
- Nationwide student database
- House-to-house survey workflows

All authorized users belong to or are officially associated with the school.

## 6. Non-Negotiable Constraints (from TODO.md)

- **Preserve the approved design** (Tailwind v4 tokens in `src/app/globals.css`:
  `brand-*` civic navy ramp, `action-*` governmental blue, `status-*` semantic colors,
  Fira Sans/Fira Code, editorial landing system). Content and IA change; visual identity does not.
- **Keep Turso/libSQL + Drizzle** (`src/db/index.ts`, `drizzle.config.ts`).
- **Keep Next.js App Router architecture** (server components, server actions,
  `proxy.ts` gate, server-side authorization).
- **No hardcoded production analytics** — all metrics computed from the database.
- **No invented DepEd policies, grading thresholds, or risk criteria** — grading
  scales, reading levels, and "Needs Monitoring" rules must be documented and configurable.
- **No `.env` reading/modification**; only `.env.example` keys may be documented by name.
- **Migration safety:** obsolete tables are analyzed, archived, and documented before removal.
