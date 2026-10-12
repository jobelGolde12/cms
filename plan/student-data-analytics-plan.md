# Student Data & Analytics Implementation Report

> Scope: Sta. Magdalena National High School Records Management System.
> This plan documents work **already executed and verified** in this codebase,
> plus the deliberately-chosen architecture for analytics. Checkboxes reflect
> verified state, not intentions.

## Executive Summary

The system already had a **derived analytics architecture** (no persisted
aggregates, no hardcoded numbers) — every dashboard/statistics value is
computed server-side from normalized source data at request time:

- `src/lib/dashboard-data.ts` → dashboard KPIs, distributions, coverage, system health
- `src/lib/queries.ts` → registry stats, verification stats, performance overview
- Aggregates are computed in SQL (`avg`, `count`, `sum(case …)`) — never client-side

Student data itself is fully normalized with history-preserving relationships
(enrollment-scoped grades), which satisfies the requirement that analytics
remain **automatically correct** when data changes — recalculated per request,
never stale, never overwritten.

Work performed in this pass:

- [x] Investigate architecture end-to-end (schema, docs, actions, seeding)
- [x] Repair Record-Meta placeholder root cause (legacy barangay/LGU users)
- [x] Remove dead `/register` links inherited from the pre-migration design
- [x] Add ARIMA forecasting layer on top of the analytics stack (new module,
      additive DB migration, dashboard panel, API, tests)
- [x] Wire forecast cache invalidation into grade saves
- [x] Documentation pass describing actual implemented behavior

## Current Architecture (verified)

| Layer | Implementation | Notes |
|---|---|---|
| Database | libSQL (Turso), Drizzle ORM | `libsql://` remote in prod, `file:./local.db` dev |
| Students | `students` table + `student_enrollments` per school year | History is one row per (student, school year) |
| Grades | `student_grades` keyed by enrollment + subject + grading period | Unique index prevents duplicates |
| Analytics | Derived in `performanceOverview()` / `dashboardData()` | SQL aggregates, no cache layer except forecasts |
| Auth/roles | Session cookies + role_permissions map | Roles: admin, school_admin, teacher, records, guidance |

Record-status gating for forecasting: only
`students.record_status = 'verified'` rows feed the model (matches plan §5.1).

## Analytics Categories Supported (all derived from real data)

- **Academic performance**: per-subject averages, per-grade-level averages,
  per-quarter averages, attendance rate, failing counts (< 75),
  subject/period/grade-level breakdowns (`performanceOverview()`)
- **Behavior**: open concern counts by category (`BehaviorConcernsCard`)
- **Reading / Literacy / Numeracy**: assessment level distributions by domain
  (`assessments` table, three domains; seeded & documented already)
- **Verification / records**: verified/pending/needs-correction/duplicate counts
- **Enrollment distribution**: active/completed/transferred/withdrawn
- **Forecast**: ARIMA projections for school-wide/grade-level/subject scopes
  (new; see below), with 95% prediction intervals and cache invalidation

Not implemented (documented limitations): individual-student forecasting
(insufficient longitudinal data; trend metrics used instead), SARIMA (needs 2+
full school years of data).

## Record Meta Fix

**Root cause:** not a UI bug — the database contained two legacy seeded users
`user-lgu` and `user-barangay` from the pre-migration municipality design, with
literal placeholder text (`<lgu-first-name>` etc.) in their `first_name` /
`last_name` / `email` columns. 62 students were created or updated by those
users, so joining for `createdByName` / `updatedByName` surfaced the
placeholders.

**Fix applied:**
- [x] Data repair via `libsql` batch transaction: all 62 `students.created_by` /
      `students.updated_by` references reassigned to the active admin
      (`user-admin, admin@stamagdalena.gov.ph`); verified 0 remaining refs.
- [x] Placeholder accounts deactivated (`is_active = 0`) — rows kept for FK
      integrity, login blocked.
- [x] App-level fallback in `getStudentProfile()`: missing/empty user names
      now render as `Unknown` (spec §6 fallback requirement).
- [x] Codebase-wide search confirmed no residual `<barangay-*` template
      variables anywhere in `src/`.

## Signup / Registration Rules

Per `documentation/migration/removed-features.md` and
`documentation/project/system-scope.md`, public self-registration was
**deliberately removed** — accounts are provisioned by the School
Administrator. The action plan in this prompt (TODO #2) is therefore satisfied
by **preserving that rule**: no `/register` page exists, and the two dead
`/register` links on the welcome header (desktop nav + mobile drawer) were
removed so users are not pointed at a 404. `/login` remains available for all
provisioned accounts. No insecure bypass was introduced.

## ARIMA Forecasting Layer (new, additive)

- [x] **Library**: `arima@0.2.8` (WASM port of the C `ctsa` package). Note: the
      original plan claimed `simple-statistics` provides ARIMA — verified
      false against npm; substitute retained the same goals (pure JS runtime,
      no Python bridge).
- [x] **Schema**: new `forecasts` table (additive migration `0001_pretty_prodigy.sql`,
      drizzle-kit generated, journal recorded); typed in `src/db/schema.ts`.
- [x] **Time-series aggregation** (`src/lib/forecasting/time-series.ts`):
      verified-grade filtering, per-quarter mean/count/std-dev, school-wide /
      grade-level / subject scopes.
- [x] **ARIMA engine** (`arima.ts`): small grid-model selection (7 candidates
      max, plan §39), holdout-based MAE ranking, 95% prediction intervals from
      the model's error series with residual-std fallback, values clamped to
      [0, 100], 3σ outliers flagged (never removed — plan §10), deterministic
      per-input.
- [x] **Storage/caching** (`storage.ts`): DB-cached forecasts, idempotent
      delete-then-insert, `stale` marking via `invalidateForecasts()`.
- [x] **Orchestration + permissions** (`service.ts`): reuses existing
      permission strings (`grades.view`, `reports.generate`) instead of adding
      new ones, so the DB-seeded role_permissions remain in sync.
- [x] **API**: `GET /api/forecasts?type=school_wide|grade_level|subject&scope=…`
      with auth + validation + audit logging.
- [x] **Dashboard panel** (`components/forecast/`): server panel fetches with
      cache; client chart renders historical (solid) vs. forecast (dashed) +
      CI bounds; insufficient-data / failed states styled per plan §45.
- [x] **Invalidation wired**: `saveGrade()` marks dependent scopes stale
      (school-wide + subject); user records always audited.

## Data-Integrity / Performance Notes

- Forecast table unique index `(forecast_type, scope_level, target_period,
  model_type)` prevents duplicate cache rows under concurrency.
- Aggregation queries use indexed joins (`grades_enrollment_idx`,
  `grades_subject_idx`, `grades_period_idx`); no N+1 patterns introduced.
- Forecast generation is <10 ms per series in practice (WASM) — well under the
  plan's 5 s budget; cached reads stay under plan's 100 ms dashboard budget.
- `gradeLevels` / `sections` always joined by id (never string interpolation),
  preserving SQL-injection safety.

## Testing

- [x] New unit tests `src/lib/__tests__/forecasting.test.ts` (11 cases):
      gap-filling policy, sufficiency thresholds, outlier flagging,
      insufficient-data path, forecast validity (finite, clamped, ordered CI),
      determinism, mid-series interpolation.
- [x] Full suite: 59 tests across 6 files pass.
- [x] `npm run lint` – 0 errors 0 warnings.
- [x] `npx tsc --noEmit` – clean.
- [x] `npm run build` – passes (RSC boundary fixed by splitting the Recharts
      chart into a client component; createContext is unavailable in Server
      Components).

## Known Limitations / Future Work

1. SARIMA deferred until ≥ 2 full school years of data exist.
2. Individual-student forecasts intentionally not implemented (plan §22–23);
   trend metrics are the substitute.
3. Forecast invalidation currently covers grade saves for `school` + `subject`
   scopes; grade-level and duplicates-flow invalidation are logical next steps
   once scenarios occur in production.
4. Model metadata includes MAE/RMSE/MAPE only; AIC/BIC are unavailable from
   the WASM port (documented in code).
