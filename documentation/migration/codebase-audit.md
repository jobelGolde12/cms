# Codebase Audit — Phase 1 (Master Migration)

> STATUS: **COMPLETE** — audit of the repository as of branch `change-title`
> (commit `b647e73`, 2026-10). Performed per TODO.md §6–§9. **No code was modified.**

## 1. Project Architecture

| Layer | Technology | Evidence |
|---|---|---|
| Framework | Next.js 16.3.5 (App Router), React 19.2.8, TS strict | `package.json`, `tsconfig.json` |
| UI | Tailwind CSS v4 (`@theme` tokens), Lucide icons, Recharts (installed) | `src/app/globals.css` |
| DB | Turso/libSQL (SQLite dialect), local `file:./local.db` fallback | `src/db/index.ts`, `drizzle.config.ts` |
| ORM | Drizzle ORM 0.45 + Drizzle Kit (`db:push`, `db:generate`, `db:migrate`) | `package.json` |
| Validation | Zod 4 + React Hook Form + `@hookform/resolvers` | `src/lib/schemas.ts`, `src/components/child-form.tsx` |
| Auth | Session cookie `cms_session` (httpOnly, sameSite lax, 8h TTL), bcrypt(10), SHA-256 token hash | `src/lib/auth.ts` |
| AuthZ | Server-side `requirePermission` / `getAuthorizedUser` + row-level scoping | `src/lib/permissions.ts`, `src/lib/scope.ts` |
| Reports | `@react-pdf/renderer`, `exceljs` (CSV via route) | `src/lib/reports/*` |
| QR | `qrcode` (generate), `@zxing/browser` (scan) | `package.json` |
| Tests | Vitest (`src/lib/__tests__/`: scope, workflow, schemas, queries-filters, utils) | `vitest.config.ts` |
| Seed | Idempotent fictional seed (`scripts/seed.mts`, 764 lines) | `package.json` `seed` |
| Analytics events | `trackEvent` → audit log (no PII) | `src/lib/analytics.ts` |
| Middleware | `src/proxy.ts` (cookie gate + DB session validation + API pre-auth) | `src/proxy.ts` |
| Security headers | CSP, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy | `next.config.ts` |

## 2. Folder Structure (actual)

```
src/
├── actions/            # Server Actions: auth, children, duplicates, interventions,
│                       # monitoring, notifications, qr, register, settings, users, get-barangays, helpers
├── app/
│   ├── (app)/          # Authenticated shell: dashboard, children(/new,/​[id],/[id]/edit),
│   │                   # validation, duplicates, monitoring(/interventions,/[type]),
│   │                   # reports, qr, users, activity-logs, notifications, settings
│   ├── api/reports/[type]/route.ts   # Export route (PDF/XLSX)
│   ├── login/ register/ verify(/​[token],/result)/ welcome/ logout/
│   └── page.tsx        # Root: redirect → /dashboard or welcome
├── components/
│   ├── ui/             # button, card, field, table, badge, states, page-header, tooltip…
│   ├── dashboard/      # primitives.tsx (KPI grid, distributions, cards), distribution-bar.tsx
│   ├── registry/       # registry-ui.tsx (KPI grid, filters, table, pagination, info cards)
│   ├── welcome/        # editorial landing sections (design.md-driven)
│   ├── loading/        # skeletons.tsx, page-transition.tsx, section-boundary.tsx
│   └── app-shell.tsx, sidebar-nav.tsx, nav-icons.tsx, logo.tsx, child-form.tsx, …
├── db/                 # index.ts (client), schema.ts (24 tables)
├── lib/                # auth, permissions, scope, workflow, queries, dashboard-data,
│                       # duplicates, qr, audit, analytics, schemas, constants,
│                       # child-code, rate-limit, env-validation, default-credentials,
│                       # reports/, utils + __tests__/ (5 suites)
└── proxy.ts            # Route gate
drizzle/                # Generated SQL migrations
documentation/          # Existing: database/ (SCHEMA, ERD), phase audits, production docs
scripts/                # seed.mts, repair-rejected-records.mts, generate-brand-icons.mts
```

**Assessment:** architecture is sound and reusable for the school system. The
`(app)` route group, ui primitives, skeletons, audit/notify helpers, scope
pattern, and report pipeline carry over.

## 3. Route Inventory & Disposition

| Route | Current purpose | Data source | Permission | Action |
|---|---|---|---|---|
| `/` | Redirect or welcome | `getCurrentUser` | public | Retain (new copy) |
| `/welcome` | Landing page | static | public | Rewrite copy |
| `/login` | Login (rate-limited, audited) | `auth.ts` | public | Retain |
| `/register` | Personnel self-registration | `actions/register.ts` | public | **Remove** (admin-provisioned accounts) |
| `/dashboard` | Municipal overview: 8 KPIs, barangay distribution, education/record status, monitoring casework, validation queue, activity, system status | `dashboard-data.ts`, `queries.ts` | `children.view` | **Rewrite** → school KPIs |
| `/children` | Child registry: KPI chips, cohort chips, filters (q, barangay, school, education, sex, status, age), table, pagination | `queries.ts listChildren` | `children.view` | **Rewrite** → `/students` |
| `/children/new` | Create child (identity+address+education+ECCD+disability form) | `child-form.tsx` | `children.create` | **Rewrite** → `/students/new` |
| `/children/[id]` | Child profile: tabs for details, validation, monitoring, interventions, QR, duplicates | `queries.ts` | scope-checked | **Rewrite** → `/students/[id]` |
| `/children/[id]/edit` | Edit child | `child-form.tsx` | scope + `children.update` | **Rewrite** |
| `/validation` | Validation queue + review (approve/needs_correction/reject) | `validationQueue` | `validation.view/review` | **Repurpose** → `/verification` (record verification) |
| `/duplicates` | Duplicate candidates review with score bands | `listDuplicates` | `duplicates.view/review` | **Rewrite** (student fields) |
| `/monitoring` | Monitoring overview (OSY/ECCD/disability/education/general) | `monitoringOverview` | `monitoring.view` | **Repurpose** → student development |
| `/monitoring/[type]` | Filtered monitoring list | `monitoringList` | `monitoring.view` | Repurpose/remove |
| `/monitoring/interventions` | Intervention list + follow-ups | `listInterventions` | `monitoring.view` | Move under `/development/interventions` |
| `/reports` | Report cards (8 types) + recent reports | `reports` table | `reports.view` | **Rewrite** catalog |
| `/qr` | QR token info + recent generation events | `qrVerifications` | `qr.verify` | Retain (student-scoped) |
| `/verify`, `/verify/[token]`, `/verify/result` | Public token verification (shows code + verified status only) | `lib/qr.ts` | public | Security review; keep pattern if QR retained |
| `/users` | User list (3 roles) | `listUsersWithRoles` | `users.view` | Retain (new roles) |
| `/activity-logs` | Audit log table | `listAuditLogs` | `audit_logs.view` | Retain |
| `/notifications` | In-app notifications | `notifications` | `children.view` | Retain |
| `/settings` | Profile, password, system settings (system_name, child_code_prefix, default_school_year, maintenance_mode) | `systemSettings` | mixed | **Rewrite** (school profile, grading/assessment config) |
| `/api/reports/[type]` | PDF/XLSX export; auth + audit + metadata rows | `report-data.ts` | `reports.export` | **Rewrite** builders |
| `/logout` | Session destroy | `auth.ts` | public | Retain |

Loading states exist for all major routes (`loading.tsx` per route + shared
skeletons). Error boundaries exist at root and app level.

## 4. Database Analysis (24 tables in src/db/schema.ts)

**Retain as-is:** `sessions`, `notifications`, `audit_logs`, `system_settings`,
`role_permissions` (catalog re-seeded), `roles`/`permissions` (values change).

**Transform:** `users` (drop `barangayId` → role-specific assignment fields),
`children` → `students`, `child_education` → `student_enrollments`,
`child_validations` → verification records, `child_duplicate_candidates`,
`interventions`, `intervention_followups`, `qr_verifications`,
`reports`/`report_exports` (new `report_type` catalog).

**Archive (data-preserving):** `municipalities`, `barangays`, `schools`,
`child_addresses`, `child_eccd`, `child_disabilities`, `child_monitoring`.

**New:** `guardians`, `student_guardians`, `school_years`, `grade_levels`,
`sections`, `student_enrollments`, `subjects`, `grading_periods`,
`student_grades`, `attendance_records`, `behavior_categories`,
`behavior_records`, `assessments`.

Details: `documentation/database/`.

## 5. Terminology Audit (old-term hits, by area)

Search performed for: child/children, barangay, municipal/municipality, LGU/lgu,
out-of-school, ECCD, disability, mapping, household, Annex. Results are
**contextualized** (no blind rename):

| Area | Files | Old terms | Disposition |
|---|---|---|---|
| Schema | `src/db/schema.ts` | `children`, `child_*` tables, `childCode`, `barangayId` | Rename via migration (careful, typed) |
| Domain constants | `src/lib/constants.ts` | `MUNICIPALITY`, `ROLES(barangay,lgu,admin)`, education/ECCD/disability enums, `REPORT_TYPES`, `child_code_prefix` | Rewrite |
| Scope/authz | `src/lib/scope.ts` | barangay scoping | Rewrite (role × section assignment) |
| Queries | `src/lib/queries.ts`, `src/lib/dashboard-data.ts` | child tables, barangay joins, education/ECCD/disability stats | Rewrite |
| Server actions | `src/actions/*.ts` | child CRUD, barangay list, review flows | Rewrite |
| UI pages | `(app)/**/page.tsx` | "Child Registry", "Child Mapping Overview", "Barangay Monitoring", barangay columns/filters | Rewrite copy + data |
| App shell | `src/components/app-shell.tsx` | "Child Mapping System", `MUNICIPALITY`, "Search children" | Rewrite |
| Landing/welcome | `src/components/welcome/*` | census/LGU/barangay copy | Rewrite copy |
| Auth pages | `register/page.tsx` | "LGU STA. MAGDALENA • DEPED", barangay select | Remove `/register`; relabel `/login` |
| Reports | `src/lib/reports/report-data.ts`, `MUNI_HEADER` | municipality header, barangay summary, OSY/ECCD/disability reports | Rewrite catalog |
| Seed | `scripts/seed.mts` | municipality + 14 barangays + child demo data | Rewrite (school demo data) |
| Tests | `src/lib/__tests__/*` | child scope/workflow fixtures | Update alongside code |
| Docs | `README.md`, `documentation/*` | full old-system descriptions | Rewrite |

**Keep-as-is (legit in school context):** `children` prop names in React
components (`children: React.ReactNode` — NOT data model), `framer-motion`
animation metadata.

## 6. Authentication Analysis

- `getCurrentUser()` (React `cache`-deduped) joins sessions→users→roles; inactive or unknown role ⇒ null.
- `requireUser()` / `requirePermission()` for pages (redirect); `getAuthorizedUser()` for actions (null).
- Session cookie: `cms_session`, httpOnly, sameSite=lax, secure in prod, 8h TTL.
- `createSession` stores only SHA-256 hash of a 32-byte random token.
- Login rate-limited (`src/lib/rate-limit.ts`), failures audited.
- Last-admin guard: `countOtherActiveAdmins`.
- `src/proxy.ts`: unauthenticated → `/login`; authenticated on auth pages → `/dashboard`; `/api/reports` pre-checks `reports.export`.
- Default dev credentials from env (`DEFAULT_*`, bcrypt hashes) — names only documented; values never read.

**Impact:** mechanics fully reusable. Role mapping (`roleNameFromId`) and role
IDs (`role-admin`, etc.) must be re-mapped to the new role catalog.

## 7. Authorization Analysis

- Permission model: code-level `ROLE_PERMISSIONS` map mirrors seeded `permissions`/`role_permissions`.
- Row-level scoping: `childScope()` (admin/lgu → all; barangay → own barangay or created-by). **Must be redesigned**: new scope = role + section assignments (teacher/adviser → assigned sections; records/guidance → school-wide per matrix).
- Workflow enforcement: `src/lib/workflow.ts` record-status transitions with role gating (admin re-open). Similar state machine will be rebuilt for student record verification.
- UI permission checks are cosmetic only — server always re-checks. ✅ keep pattern.

## 8. UI/Design Analysis

- Design tokens: `@theme` in `globals.css` — `brand-*` (civic navy), `action-*` (gov blue), `status-*` semantics; Fira Sans/Code; 3px focus rings; reduced-motion handling; chart entrance animations (`.bar-grow`, `.row-fade`, `.stagger-*`); shimmer skeletons.
- Components: `ui/*` primitives (button/card/field/table/badge/states/page-header/tooltip), dashboard `primitives.tsx` (KpiGrid, DistributionBar, cards), registry kit, editorial welcome sections, loading kit.
- Layout: fixed 240px sidebar + sticky header + max-w-7xl main + footer; mobile drawer.
- **Verdict:** preserve wholesale; change only content, data bindings, and navigation groups.

## 9. Existing Tests

`src/lib/__tests__/`: `scope.test.ts`, `workflow.test.ts`, `schemas.test.ts`,
`queries-filters.test.ts`, `utils.test.ts` — pure-function suites (no DB). They
will be updated per module and extended with analytics/report builders and
per-role authorization tests.

## 10. Observations & Risks

1. `README.md` and much of `documentation/` describe the old system — must be rewritten.
2. `package.json` name is `child-mapping-system` — rename optional (cosmetic).
3. Both `package-lock.json` and `pnpm-lock.yaml` exist (repo hygiene issue, note only).
4. `child_validations` uses both status fields (child `record_status` + history rows) — the new verification design must keep the same dual convention.
5. Seed data (fictional) must be rebuilt around students/enrollment/grades; ensure no real data.
6. Local `local.db` / `local.db.stale-backup` exist in repo root — treat as dev artifacts; do not delete user data without confirmation.
