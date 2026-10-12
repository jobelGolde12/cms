# Student Data & Analytics — Implementation Documentation

Final documentation pass reflecting the **actual implemented** system
(as-built, not the original plan).

---

## 1. Student Data Entry

### 1.1 Student Record Creation

- Route: `/students/new` → server action `createStudent()` (`src/actions/students.ts`)
- Required fields: first name, last name, birth date, sex
- Optional fields: middle name, suffix, contact number, address
- Server-side validation: zod schemas in `src/lib/schemas.ts`
- Row-level auth: `canAccessStudent()` (`src/lib/scope.ts`) — teachers write
  only students in their adviser sections; admins/records/guidance school-wide
- Every student starts with `record_status = 'draft'`

### 1.2 Enrollment (links a student to academic structure)

- Server action `saveEnrollment()`: one enrollment per (student, school year)
  — enforced by unique index `enrollment_student_sy_uq`
- Each row binds the student to a **school year + grade level + section**, so
  all grades, attendance and analytics attached to that enrollment are
  historically scoped and never disturbed by later progression

### 1.3 Grades

- Server action `saveGrade()` (`src/actions/records.ts`)
- Composite unique index (`enrollment_id`, `subject_id`, `grading_period_id`) —
  duplicate saves update instead of inserting
- Grade scale: numeric 0–100; passing threshold 75

### 1.4 Development domains

| Domain | Table | Trigger |
|---|---|---|
| Behavior | `behavior_records` + `behavior_categories` | `saveBehavior()` |
| Reading / Literacy / Numeracy | `assessments` (`domain` column) | `saveAssessment()` |
| Attendance | `attendance_records` | `saveAttendance()` |
| Interventions | `interventions` + `intervention_followups` | `saveIntervention()` |

### 1.5 Validation / verification workflow

Students move: `draft → pending_validation → verified` (or
`needs_correction`, `marked_duplicate`), governed by `src/lib/workflow.ts`.
Only **verified** records feed forecasting and performance analytics.

---

## 2. Data Relationships

```text
students 1 ─── n student_enrollments n ─── 1 school_years
                    │                n ─── 1 grade_levels
                    │                n ─── 1 sections
                    ├─ n student_grades    (enrollment_id, subject_id, grading_period_id)
                    ├─ n attendance_records (enrollment_id, date)
                    └─ (student-level) assessments, behavior_records,
                       interventions, guardians, verifications
```

All joins are id-based (no string interpolation of user input into SQL),
eliminating SQL-injection risk on filters.

---

## 3. Automatic Analytics

Analytics are **derived at request time** from normalized data — there is no
precomputed aggregate cache except the forecast table (§4). This guarantees
correctness after any data change with zero invalidation logic for the main
dashboard: as soon as a grade / behavior / assessment save commits, the next
page view reflects it.

### 3.1 Where each metric is computed

| Metric group | Function | File |
|---|---|---|
| Dashboard KPIs, distributions, coverage, system health | `dashboardData()` | `src/lib/dashboard-data.ts` |
| Registry stats (`total`, `verified`, `verificationRate`, …) | `registryStats()` | `src/lib/queries.ts` |
| Verification queue stats + duplicate score bands | `verificationStats()` | `src/lib/queries.ts` |
| Performance overview (subjects, grade levels, periods, attendance, failing) | `performanceOverview()` | `src/lib/queries.ts` |
| Forecast projections | `getForecastWithCache()` | `src/lib/forecasting/service.ts` |

### 3.2 Formulas

- **Subject/grade-level/period average** → SQL `avg(grade)` rounded to 1 dp
- **Attendance rate** → `sum(status in ('present','late')) / count(*)` × 100
- **Failing count** → `sum(grade < 75)` per subject
- **Verification rate** → `verified / (non-duplicate active)` × 100
- **Scope filters** are applied consistently (_teacher → adviser sections;
  others → school-wide_), so analytics never leak out-of-scope students.

### 3.3 Missing / inactive data handling

- Inactive (`status ≠ 'active'`) students excluded from registry KPIs
- `marked_duplicate` records excluded everywhere
- Students with no grades simply do not appear in grade aggregates
  (no zero-filling — matching the forecast missing-data policy)
- Transferred/withdrawn students keep their historical enrollments and grades

### 3.4 Historical preservation

Grades/attendance/assessments are **enrollment-scoped**, not
current-profile-scoped: when a student advances Grade 7 → Grade 8 (new
enrollment row next school year), her Grade-7 grades remain untouched and
remain attributable to the correct year/section in every historical comparison
query.

---

## 4. Forecasting (ARIMA)

New module `src/lib/forecasting/`:

| File | Purpose |
|---|---|
| `time-series.ts` | Aggregation of verified grades into per-quarter series; gap interpolation; sufficiency thresholds |
| `arima.ts` | WASM ARIMA engine wrapper: model selection, prediction, clamping, CI, outlier flags |
| `storage.ts` | Forecast DB cache + staleness invalidation |
| `service.ts` | Cache-read → generate-on-miss orchestration, scope validation, audit logging |
| `../api/forecasts/route.ts` | `GET /api/forecasts?type=&scope=` endpoint |
| `../components/forecast/` | Dashboard panel (server) + chart (client; Recharts requires the browser React runtime) |

### 4.1 Model behavior

- **Input**: quarterly mean grades, only `record_status = 'verified'`, scoped
  to the current school year
- **Sufficiency**: school ≥ 4 quarters, grade-level/subject ≥ 3 quarters;
  otherwise `insufficient_data` status with explanatory message
- **Missing quarters**: linear interpolation of interior gaps; leading/trailing
  left null; > 40 % interior gaps ⇒ forecast refused
- **Model selection**: holdout-MAE over a 7-candidate ARIMA grid (larger grid
  only when ≥ 12 observations)
- **Output**: 4-quarter horizon, 95 % CI via model error series (residual-σ
  fallback), all values clamped to [0, 100]
- **Determinism**: same input ⇒ same output (verified by unit test)

### 4.2 Cache & invalidation

- Cache key: `(forecast_type, scope_level)` rows in the `forecasts` table
  (additive migration `0001_pretty_prodigy.sql`)
- `saveGrade()` marks `school` and `subject` scopes stale; next read
  regenerates (< 10 ms per series in practice)
- Generation on cache miss is audited (`GENERATE_FORECAST` audit action)

### 4.3 Privacy

Forecasts expose **aggregates only** — no student identifiers, no raw grade
rows. School-wide forecast viewing requires `grades.view`; generation falls
under `reports.generate` permission when granted. Teachers' row scope limits
dashboard-visible aggregates to their sections.

---

## 5. Record Meta

- `Created by` / `Updated by` come from joining `users` on
  `students.created_by` / `students.updated_by`
- If the related user no longer resolves (deleted/legacy), the UI shows
  `Unknown` — never raw identifiers or template text
- Legacy barangay/LGU placeholder users identified during this pass were
  cleaned: their student-record references were reassigned to the active
  administrator and the accounts deactivated (kept for FK/history integrity)

---

## 6. Testing & Verification Performed

| Check | Result |
|---|---|
| `npm run lint` | 0 errors, 0 warnings |
| `npx tsc --noEmit` | clean |
| `npm test` | 59/59 (6 files, incl. 11 new forecasting tests) |
| `npm run build` | passes |
| Remote migration `0001` | applied & journal-recorded on Turso; `forecasts` + 4 indexes verified present |

## 7. Known Limitations

1. SARIMA deferred until ≥ 2 full school years of data (plan §7).
2. No individual-student ARIMA forecasts — trend metrics only (intentional).
3. Forecast invalidation triggers on grade saves (school + subject scopes);
   enrollment/section restructuring invalidation is future work.
4. AIC/BIC unavailable from the WASM port; MAE/RMSE/MAPE are recorded.
