# 01 — System Architecture Diagram

**Records Management System with Profile and Performance Analytics**  
Sta. Magdalena National High School — Internal School Platform  
Source of truth: `src/db/schema.ts`, `src/lib/auth.ts`, `package.json`, `src/app/*`, `src/actions/*`

---

## Architecture Overview (Layered)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  EXTERNAL ENTITIES / USERS                                                                  │
│  ────────────────────────────────────────────────────────────────────────────────────────  │
│  • System Administrator (admin)            • School Administrator (school_admin)           │
│  • Adviser / Teacher (teacher)             • Subject Teacher (subject_teacher)            │
│  • Records Personnel (records)             • Guidance Counselor (guidance)                │
│  • Nurse (nurse)                           • Registrar (registrar)                        │
│  • Language & Literacy Coordinator         • Admin Officer (admin_officer)               │
│    (literacy_coordinator)                                                                       │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                                              │
                                              │ HTTPS / Browser
                                              ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  CLIENT LAYER (Browser / Next.js App Router)                                                   │
│  ──────────────────────────────────────────────────────────────────────────────────────── │
│  • React 19 + Next.js 16.3.5 App Router                                                         │
│  • Tailwind CSS v4 (brand / action / status tokens)                                            │
│  • Client components: form inputs, dashboards, charts (Recharts), navigation                  │
│  • Protected routes enforced by server-side `getCurrentUser()` in layout (`(app)/layout.tsx`) │
│  • Client-side navigation with server-rendered pages (`page.tsx`, `layout.tsx`)                 │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                                              │
                                              │ Server Actions / API Routes
                                              ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  SERVER LAYER (Next.js Server Components + Server Actions + API Routes)                        │
│  ──────────────────────────────────────────────────────────────────────────────────────── │
│  Authentication & Authorization                                                                    │
│    • `src/lib/auth.ts` — session management (`bcryptjs`), cookie-based (`sms_session`),      │
│      `getCurrentUser()`, `requirePermission()`, `requireUser()`                               │
│    • `src/lib/permissions.ts` — RBAC map (`ROLE_PERMISSIONS`); 45 granular permissions        │
│    • `src/lib/scope.ts` — row-level scope enforcement (teacher → assigned sections only)     │
│                                                                                               │
│  Server Actions (`src/actions/*.ts`)                                                             │
│    • `auth.ts` — login/logout                                                                  │
│    • `users.ts` — user CRUD (admin only), role escalation guard (`countOtherActiveAdmins`)  │
│    • `students.ts` — student profile, archive, verification (`recordStatus` workflow)         │
│    • `grades.ts` — grade encoding, draft → submit → reopen workflow (`gradeSubmissions`)    │
│    • `guidance.ts` — behavior records (`behaviorRecords`), confidential filter (`confidential`) │
│    • `interventions.ts` — intervention lifecycle (`planned` → `active` → `completed`)        │
│    • `health.ts` — health/nutritional records (`healthRecords`, `clinicalRecords`)            │
│    • `employees.ts` — employee records, 201 files (`employee201Records`)                   │
│    • `records.ts`, `settings.ts`, `notifications.ts`, `qr.ts`, etc.                            │
│                                                                                               │
│  Server Components & Data Access                                                                │
│    • `src/lib/queries.ts`, `src/lib/dashboard-data.ts` — aggregated queries                 │
│    • `src/lib/analytics.ts` — analytics computation                                           │
│    • `src/lib/forecasting/` — ARIMA forecasting (`forecasts` table)                            │
│    • `src/lib/reports/*.ts` — PDF (`@react-pdf/renderer`), Excel (`exceljs`), CSV             │
│    • `src/app/api/` — REST endpoints (`form137/[id]`, `report-card/[id]`, `reports/[type]`) │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                                              │
                                              │ Drizzle ORM + `@libsql/client`
                                              ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  DATA ACCESS LAYER                                                                               │
│  ──────────────────────────────────────────────────────────────────────────────────────── │
│  • `drizzle-orm` (v0.45.2) with `sqlite-core` schema (`src/db/schema.ts`)                      │
│  • `src/db/index.ts` — `createClient({ url, authToken })` connects to Turso (libSQL)         │
│  • Schema: 30+ tables, normalized relations, foreign keys, unique indexes, composite PKs   │
│  • Migration system: `drizzle-kit` (SQL files in `drizzle/`)                                  │
│  • Transaction support: `db.transaction()` in grade submission/reopen actions                 │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                                              │
                                              │ libsql:// (remote) / file:./local.db (dev)
                                              ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  DATABASE (Turso / libSQL — SQLite-compatible, remote-capable, server-only connection)        │
│  ──────────────────────────────────────────────────────────────────────────────────────── │
│  • Turso database URL (`TURSO_DATABASE_URL` / `LIBSQL_URL`)                                  │
│  • Auth token (`TURSO_AUTH_TOKEN` / `LIBSQL_AUTH_TOKEN`) — never exposed                      │
│  • Schema enforced via Drizzle ORM (`sqliteTable`, relations, indexes)                       │
│  • Key tables: users, roles, permissions, role_permissions, students, student_enrollments,  │
│    student_grades, grade_submissions, sections, subjects, grading_periods, school_years,     │
│    attendance_records, behavior_records, behavior_categories, assessments, health_records,   │
│    clinical_records, interventions, intervention_followups, guardians, student_guardians,     │
│    record_verifications, duplicate_candidates, qr_verifications, reports, report_exports, │
│    employees, employee_201_records, service_credit_transactions, notifications, audit_logs,   │
│    system_settings, forecasts, sessions                                                           │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                                              │
                                              │ External / File Generation
                                              ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  EXTERNAL SERVICES & FILE OUTPUT                                                                │
│  ──────────────────────────────────────────────────────────────────────────────────────── │
│  • PDF Generation (`@react-pdf/renderer`) — Student Card, Form 137, Report Card             │
│  • Excel Export (`exceljs`) — spreadsheets for reports                                       │
│  • QR Verification (`qrcode` + `@zxing/browser`) — token-based secure verification            │
│  • Audit Logging (`audit_logs` — append-only, JSON snapshots)                                 │
│  • Forecasting (`arima` package) — time-series projections (`forecasts`)                     │
│  • Notification System (`notifications`) — in-app user alerts                                   │
└──────────────────────────────────────────────────────────────────────────────────────────┘

---

## Technology Stack (Verified from `package.json` + Code)

| Component             | Technology / Version  | Evidence                                      |
|-----------------------|----------------------|-----------------------------------------------|
| Framework             | Next.js 16.3.5       | `package.json`                                |
| React                 | React 19.2.8         | `package.json`                                |
| Database              | Turso (libSQL)       | `drizzle.config.ts`, `src/db/index.ts`         |
| ORM                   | Drizzle ORM 0.45.2   | `package.json`, `src/db/schema.ts`             |
| Auth / Sessions       | `bcryptjs` + cookies | `src/lib/auth.ts`, `SESSION_COOKIE_NAME`       |
| Style                 | Tailwind CSS v4      | `package.json` (`@tailwindcss/postcss`)        |
| Charts / Analytics    | Recharts 3.10.1      | `package.json`, `src/components/dashboard/*`  |
| Reports / PDF         | `@react-pdf/renderer`| `package.json`, `src/lib/reports/*.tsx`         |
| Reports / Excel       | `exceljs` 4.4.0      | `package.json`                                |
| QR / Verification     | `qrcode` + `@zxing/browser` | `package.json`, `src/lib/qr.ts`       |
| Forecasting           | `arima` 0.2.8        | `package.json`, `src/lib/forecasting/`         |
| Validation            | `zod` 4.6.5          | `package.json`, `src/lib/schemas.ts`           |

---

## Key Architectural Patterns

1. **Server-First Security** — Every mutation is a server action (`"use server"`). Client components only render data; authorization (`getAuthorizedUser`, `requirePermission`) is enforced server-side in actions.

2. **Row-Level Scope Enforcement** — Teachers see only students in sections they advise (`sections.adviser_id` + `student_enrollments`). The `subject_teacher` can write grades only for `(section, subject)` pairs listed in `section_subject_teachers` (`canWriteGradesInSection` in `src/lib/grades.ts`).

3. **Audit Trail** — Every mutation writes to `audit_logs` (`old_values_json` / `new_values_json`, `entity_type`, `entity_id`, `action`, `user_id`, `ip_address`, `user_agent`).

4. **Grade Lifecycle Lock** — Grades have `draft` → `submitted` states. Once submitted (`grade_submissions.status = "submitted"`), the context is locked; reopening creates a new `reopened` ledger row and reverts grades to `draft`.

5. **Employee Isolation** — `admin_officer` has zero student-facing permissions (`ROLE_PERMISSIONS` in `src/lib/permissions.ts`). The database contains employee-only tables (`employees`, `employee_201_records`, `service_credit_transactions`) with no student foreign keys.

6. **Sensitive Data Rules** — `behavior_records.confidential = true` is visible only to `admin`, `school_admin`, `guidance`. Health records (`health_records`, `clinical_records`) require `health.view` / `health.write`, granted only to `admin`, `nurse`.
