# Staff Roles & Accounts — Implemented Plan

> Multi-role staff account system for the Records Management System with
> Profile and Performance Analytics of Sta. Magdalena National High School.
> Built as an **additive extension** of the existing architecture: the existing
> five roles, Turso database, design system, authentication, and audit logging
> are preserved and extended — nothing was redesigned or replaced.

## Progress checklist

- [x] Inspect current authentication (`src/lib/auth.ts`, sessions, bcrypt)
- [x] Inspect current authorization (`src/lib/permissions.ts`, `requirePermission`,
      `getAuthorizedUser`, row-level `canAccessStudent` / `canEditStudent`)
- [x] Inspect Turso schema (`src/db/schema.ts`, drizzle migrations)
- [x] Design role model (additive: 3 new roles on top of the existing 5 — see
      `documentation/security/role-permission-matrix.md`)
- [x] Database changes: `health_records`, `clinical_records`,
      `behavior_records.confidential` column (migration `drizzle/0002_*.sql`)
- [x] Centralized server-side authorization (extended permission map + scope)
- [x] Protect Guidance data (confidentiality flag enforced at query, action,
      dashboard, and export level)
- [x] Adviser permissions (existing `teacher` role — already section-scoped)
- [x] Nurse permissions (health/nutrition/clinical domain only)
- [x] Registrar permissions (strict read-only + student card / Form 137 printing)
- [x] Guidance permissions (existing `guidance` role, unchanged)
- [x] Literacy Coordinator permissions (assessment domain via existing engine)
- [x] Role-based navigation (permission-filtered sidebar, existing components)
- [x] Role-based student profile (every section gated server-side by permission)
- [x] User management for new roles (`userFormSchema.roleId` enum + role labels)
- [x] Audit logging for new domains (health/clinical/student print actions)
- [x] Testing (unit tests for role boundaries + typecheck + lint + smoke test)
- [ ] Full per-role browser walkthrough with seeded demo accounts (manual step)

## Roles introduced

| Role key | Role id | Purpose |
|---|---|---|
| `nurse` | `role-nurse` | Health & nutrition records only; can never edit general student info |
| `registrar` | `role-registrar` | Strictly read-only views + official document printing |
| `literacy_coordinator` | `role-literacy-coordinator` | Reading/literacy/numeracy assessments and statistics |

The existing `admin`, `school_admin`, `teacher` (= Adviser), `records`, and
`guidance` roles remain untouched. Adviser section scoping already works via
`sections.adviser_id` and `src/lib/scope.ts`.

## Database migration

- Migration: `drizzle/0002_handy_captain_cross.sql`
  - `CREATE TABLE health_records` (weight/height/BMI/nutritional status per
    student + school year, recorded by Nurse)
  - `CREATE TABLE clinical_records` (date, category, description, assessment,
    action taken, remarks, recorded by)
  - `ALTER TABLE behavior_records ADD confidential INTEGER NOT NULL DEFAULT 0`
- Applied with `pnpm db:migrate` against the existing Turso-compatible
  configuration (no new database was created; `local.db` fallback remains the
  dev fallback from `drizzle.config.ts`).
- Reference roles/grants for the new roles are inserted by
  `npx tsx scripts/seed-remote-reference.mts` (idempotent, non-destructive).
  The full demo seed `pnpm seed` also seeds three demo staff accounts and
  fictional health/clinical demo data.

## Authorization architecture

```
Page guards        requirePermission(permission) → redirect on failure  (pages)
Server actions     getAuthorizedUser(permission) → explicit fail result
Row-level scope    canAccessStudent / canEditStudent / userSectionScope
Domain gates       hasPermission(role, key) — single source of truth
Sensitive data     confidentialBehaviorFilter(user) — Guidance flag
New permissions    health.view, health.write, documents.print
```

Every new server action re-validates: authentication → permission → student
row-level scope → field-level business rules. A Nurse calling an Adviser-only
endpoint, a Registrar calling any write action, or an Adviser requesting
confidential guidance rows all receive an authorization error — never data.

## Sensitive-data rules

- **Guidance/behavioral data**: `behavior_records.confidential` is set when a
  record is authored by the Guidance Office; only `admin`, `school_admin`,
  `guidance` may read or modify it. The boundary is enforced inside every
  behavior query (`queries.ts`), the dashboard aggregate chain
  (`dashboard-data.ts`), report generation (`report-data.ts`, including the
  needs-monitoring subqueries), and the `saveBehavior` mutation guard.
- **Health data**: served only through `health.view`-gated pages/sections.
- **Profile page**: each section (grades, assessments, behavior,
  interventions, attendance, QR, health, clinical) is hidden unless the role
  holds the corresponding permission; the Edit button only renders for
  `students.update`, and print actions only for `documents.print`.
- **Search/registry** inherits the same `students` row scoping, so extra path
  is available for reaching out-of-scope students.

## Registrar document printing (read-only by design)

- `/students/[id]/print/card` — printable student card preview.
- `/students/[id]/print/form137` — printable Learner's Permanent Record.
- Both require `documents.print` (admin, school_admin, records, registrar) and
  row-level access; they only render data and call the browser print dialog —
  no record mutation, and printing does not change `updated_at`/audit state.

## Audit integration

New audited actions: `CREATE_HEALTH_RECORD`, `UPDATE_HEALTH_RECORD`,
`CREATE_CLINICAL_RECORD`, `UPDATE_CLINICAL_RECORD`. Existing audit coverage
(students, grades, users, reports, verification) is unchanged — the audit log
table already supported this via `logAudit`.

## Testing results

- `npx tsc --noEmit` — pass
- `pnpm lint` — 0 errors, 0 warnings (after cleanup)
- `pnpm test` — 90/90 (incl. new `rbac-roles.test.ts` covering:
  registrar write-less, nurse patient-domain-only, literacy coordinator
  domain-only, guidance confidentiality boundary)
- Smoke test (dev server): unauthenticated `/health`, `/students`,
  `/students/*\/print/form137` → 307 redirect to `/login` (proxy matcher now
  includes `/health`).

## Future extension points

- New assessment types: `assessments` is a single engine keyed on
  `domain`/`assessment_type` — no schema change needed for new instruments.
- New behavior categories/clinical categories: data rows, not code.
- Per-section literacy dashboards can reuse the existing analytics layer and
  the `assessments` domain filters already used by reports.
