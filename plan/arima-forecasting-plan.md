# ARIMA-Based Academic Performance Forecasting Implementation Plan

## Executive Summary

This plan outlines the implementation of ARIMA-based academic performance forecasting for Sta. Magdalena National High School's Records Management System. The implementation will integrate forecasting capabilities as a **predictive analytics layer** that consumes validated academic data and produces statistical forecasts—**never modifying actual grades or becoming the source of truth**.

---

## 1. Current Architecture Analysis

### 1.1 Frontend Framework
- **Next.js 16.3.5** with App Router
- **React 19.2.8** with Server Components
- **TypeScript** for type safety
- **Tailwind CSS 4** for styling
- **Framer Motion** for animations
- **Lucide React** for icons

### 1.2 Backend Framework
- **Next.js API Routes** (Route Handlers)
- **Server Actions** for mutations
- **No background job system** currently implemented

### 1.3 Database
- **libSQL (Turso)** — SQLite-compatible serverless database
- **Drizzle ORM 0.45.2** for type-safe queries
- **Local development**: File-based SQLite (`local.db`)
- **Production**: Turso remote database
- **Migrations**: drizzle-kit

### 1.4 Authentication System
- Session-based auth with secure HTTP-only cookies
- **bcryptjs** for password hashing
- Session tokens: UUID + SHA-256 hash
- 8-hour session TTL
- Session stores in `sessions` table

### 1.5 Authorization System
- **Role-based access**: admin, school_admin, teacher, records, guidance
- **Permission-based**: granular permissions in `role_permissions` table
- **Row-level scoping**: Teachers can only see their assigned sections
- Scope enforced in `userSectionScope()` via `studentSectionScope`

### 1.6 API Architecture
- **App Router** with file-system routing
- **Server Actions** for mutations (`actions/` directory)
- **Route Handlers** for API endpoints (`/api/` directory)
- **Authorization**: Checked in route handlers via `getCurrentUser()`

### 1.7 Analytics Architecture
- **Dashboard** (`/dashboard`) with KPI cards
- **Reports** (`/reports`) section for PDF/XLSX exports
- **Analytics queries** in `/lib/queries.ts` (performanceOverview, dashboardStats)
- **Recharts** available but not currently used in main dashboard

### 1.8 Existing Grade Management Architecture

#### Tables:
```
students | studentEnrollments | studentGrades
         | schoolYears        | gradingPeriods
         | subjects           | gradeLevels
         | sections           |
```

#### Grade Flow:
1. Student created → `students` table (record_status: draft/pending_validation/verified)
2. Student enrolled → `studentEnrollments` table (links to school year, grade level, section)
3. Grade recorded → `studentGrades` table (enrollmentId, subjectId, gradingPeriodId, grade)

#### Academic Structure:
- **School Years**: YYYY-YYYY format (e.g., "2025-2026")
- **Grading Periods**: Quarter 1, Quarter 2, Quarter 3, Quarter 4 (per school year)
- **Grade Levels**: 7, 8, 9, 10 (configurable)
- **Subjects**: 8 subjects (FIL, ENG, MATH, SCI, AP, ESP, TLE, MAPEH)

### 1.9 Current School Year Handling
- `schoolYears.is_current = true` marks the current year
- `gradingPeriods.is_current` marks the current grading period
- Current year determined via `getCurrentSchoolYear()`

### 1.10 No Existing Background Jobs/Scheduled Tasks
- Investigation confirms: **No cron, no queue workers, no background job infrastructure**
- Session followups are data records, not scheduled jobs

### 1.11 Testing Infrastructure
- **Vitest 3.2.7** for unit testing
- Tests in `/src/lib/__tests__/`
- SQLiteSyncDialect for SQL rendering tests (no DB connection required)

### 1.12 Dependencies (Current)
```json
"dependencies": {
  "@hookform/resolvers": "^5.9.1",
  "@libsql/client": "^0.18.0",
  "@react-pdf/renderer": "^4.9.0",
  "@zxing/browser": "^0.2.1",
  "bcryptjs": "^3.0.3",
  "drizzle-orm": "^0.45.2",
  "exceljs": "^4.4.0",
  "framer-motion": "^13.4.5",
  "lucide-react": "^1.47.0",
  "next": "16.3.5",
  "qrcode": "^1.5.4",
  "react": "19.2.8",
  "recharts": "^3.10.1",
  "zod": "^4.6.5"
}
```

### 1.13 Relevant Files & Directories
- **Schema**: `/src/db/schema.ts`
- **Queries**: `/src/lib/queries.ts`
- **Actions**: `/src/actions/`
- **Auth**: `/src/lib/auth.ts`
- **Permissions**: `/src/lib/permissions.ts`
- **Constants**: `/src/lib/constants.ts`
- **Scope**: `/src/lib/scope.ts`
- **Audit**: `/src/lib/audit.ts`
- **Dashboard Data**: `/src/lib/dashboard-data.ts`
- **Reports**: `/src/lib/reports/`
- **Components**: `/src/components/`
- **API Routes**: `/src/app/api/`

### 1.14 Relevant Database Tables for Forecasting
| Table | Purpose | Forecast Relevant |
|-------|---------|-------------------|
| `students` | Student records | Student count, demographics |
| `studentEnrollments` | Enrollment linking | Links grades to students |
| `studentGrades` | Grade records | **Primary time series source** |
| `schoolYears` | Academic year metadata | Forecasting temporal context |
| `gradingPeriods` | Quarter/periods | **Time index for forecasting** |
| `subjects` | Subject definitions | Forecast by subject |
| `gradeLevels` | Grade level definitions | Forecast by grade level |
| `sections` | Section definitions | Forecast by section |
| `auditLogs` | All changes | **For forecast invalidation** |

### 1.15 Existing Related Services
- **Audit Logging**: `/src/lib/audit.ts` - appends on all changes
- **Notifications**: `/src/lib/audit.ts` - notify users
- **Reports**: `/src/lib/reports/` - PDF/XLSX generation
- **Verification**: `/src/lib/workflow.ts` - record status workflow

---

## 2. Integration Architecture for ARIMA

### 2.1 Forecasting Layer Placement
The ARIMA functionality should integrate as:

```
ACTUAL ACADEMIC DATA
        ↓
VALIDATED GRADE RECORDS (record_status = 'verified')
        ↓
AGGREGATION / TIME SERIES
        ↓
ARIMA FORECASTING ENGINE (new)
        ↓
FORECAST RESULTS (persisted in new table)
        ↓
ANALYTICS / VISUALIZATION
        ↓
DECISION SUPPORT
```

**Location**: New module at `/src/lib/forecasting/`

### 2.2 Integration Points

1. **Data Source**: `studentGrades` joined with `gradingPeriods`, `subjects`, `schoolYears`
2. **Aggregation Layer**: New aggregation functions in `/src/lib/forecasting/time-series.ts`
3. **Model Layer**: Statistical computation in `/src/lib/forecasting/arima.ts`
4. **Persistence**: New `forecasts` table (migration required)
5. **API**: New route at `/src/app/api/forecasts/[scope]/route.ts`
6. **UI**: New dashboard component at `/src/components/forecast/`

---

## 3. ARIMA Model Architecture Design

### 3.1 Library Selection: `simple-statistics`

**Decision**: Use `simple-statistics` for ARIMA implementation.

**Rationale**:
- Pure JavaScript/TypeScript (no Python/Node.js bridge needed)
- Actively maintained
- Includes ARIMA implementation with `arima()` function
- Supports ACF/PACF, differencing, model selection
- Lightweight (~100KB minified)
- Compatible with serverless environments

**Alternative Considered**: `arch` (Python) would require:
- Python runtime environment
- Separate microservice architecture
- More complex deployment
- Inter-process communication overhead

### 3.2 ARIMA Parameters Configuration

After evaluating the academic data structure (4 quarters per year), the following configuration will be used:

```typescript
const ARIMA_CONFIG = {
  // Minimum observations for reliable forecasting
  MIN_OBSERVATIONS: 4,  // Full year of grade data
  
  // Model order defaults (auto-selected via AIC)
  p: [0, 1, 2],  // AR order candidates
  d: [0, 1],     // Differencing candidates
  q: [0, 1, 2],  // MA order candidates
  
  // Forecast horizon
  FORECAST_HORIZON: 4,  // Next academic year (all quarters)
  
  // Confidence level for prediction intervals
  CONFIDENCE_LEVEL: 0.95,
};
```

### 3.3 Model Selection Strategy
```
For each time series:
  1. Check data sufficiency (≥4 observations)
  2. Test stationarity (Augmented Dickey-Fuller)
  3. If non-stationary, apply differencing (d=1)
  4. Grid search: try ARIMA(p,d,q) combinations
  5. Select model with lowest AIC/BIC
  6. Generate forecasts with 95% prediction intervals
```

---

## 4. Forecasting Levels & Justification

### 4.1 Level 1: School-Wide Forecasting ✓ IMPLEMENT

**Rationale**: 
- Most observations available
- Useful for trend analysis
- Aggregated metrics are stable

**Implementation**:
- Aggregate grade by quarter across all subjects
- Time series: 4 data points per quarter
- Model: ARIMA(1,1,1) or auto-selected

### 4.2 Level 2: Grade-Level Forecasting ✓ IMPLEMENT

**Rationale**:
- Natural grouping for administrators
- Average ~40-50 students per grade level
- Sufficient data points

**Implementation**:
- Group by grade_level (7, 8, 9, 10)
- Aggregate by quarter
- Generate 4-quarter forecast

### 4.3 Level 3: Section Forecasting ✗ DEFER

**Rationale**:
- Sections typically have ≤15 students
- Limited historical data
- High variance in small samples

**Decision**: Not implemented initially. Data available; can be added when more historical cycles exist.

### 4.4 Level 4: Subject Forecasting ✓ IMPLEMENT

**Rationale**:
- Each subject has independent performance patterns
- Useful for identifying at-risk subjects

**Implementation**:
- Group by subject (FIL, ENG, MATH, SCI, etc.)
- Aggregate by quarter
- Generate quarterly forecasts

### 4.5 Level 5: Individual Student Forecasting ✗ DO NOT IMPLEMENT

**Rationale**:
- Insufficient longitudinal data per student
- Risk of over-interpreting patterns
- Potential for misleading predictions

**Decision**: Use trend-based metrics instead:
- Recent average
- Historical average
- Performance change rate
- Rule-based risk indicators

---

## 5. Data Aggregation Design

### 5.1 Time Series Generation

For each forecasting scope, aggregate grades as:

```
Raw Grades → Validate → Group → Aggregate → Time Series
```

#### Aggregation Rules:

1. **Validation**: Only grades where `student.record_status = 'verified'`
2. **Grouping**: By academic period (grading_period.order_index) + school_year
3. **Aggregation**: Mean grade per period

#### Aggregation Functions:

```typescript
// School-wide quarterly average
type SchoolQuarterlySeries = {
  timestamp: number;  // Unix timestamp of period end
  value: number;      // Mean grade
  count: number;      // Number of grades aggregated
  stdDev: number;     // Standard deviation
};

// Grade-level quarterly series
type GradeLevelSeries = {
  gradeLevel: string;
  quarters: SchoolQuarterlySeries[];
};

// Subject quarterly series
type SubjectSeries = {
  subject: string;
  code: string;
  quarters: SchoolQuarterlySeries[];
};
```

### 5.2 Aggregation SQL Query Pattern

```sql
SELECT
  gy.year AS school_year,
  gp.order_index AS quarter,
  AVG(sg.grade) AS average_grade,
  COUNT(*) AS grade_count,
  STDDEV(sg.grade) AS std_dev
FROM student_grades sg
JOIN student_enrollments se ON sg.enrollment_id = se.id
JOIN school_years gy ON se.school_year_id = gy.id
JOIN grading_periods gp ON sg.grading_period_id = gp.id
WHERE gy.is_current = true  -- Current school year
  AND EXISTS (SELECT 1 FROM students s WHERE s.id = se.student_id AND s.record_status = 'verified')
GROUP BY gy.year, gp.order_index
ORDER BY gy.year, gp.order_index
```

---

## 6. Stationarity & Differencing Strategy

### 6.1 Stationarity Test
Use Augmented Dickey-Fuller test:
- Null hypothesis: Series has unit root (non-stationary)
- Alternative: Series is stationary

### 6.2 Differencing Application
```
If ADF p-value > 0.05:
  Apply first differencing: Δy_t = y_t - y_{t-1}
  Re-test for stationarity
  Set d = 1
Else:
  Series is stationary
  Set d = 0
```

### 6.3 Pre-Smoothing Options (if needed)
For noisy academic data:
- Moving average smoothing
- Exponential smoothing
- But preserve interpretability

---

## 7. SARIMA vs ARIMA Decision

### 7.1 Seasonality Analysis
**Decision**: Start with **ARIMA**, defer SARIMA.

**Rationale**:
1. Dataset: 1 school year = 4 quarters (1 cycle)
2. Minimum requirement for SARIMA: ≥2 complete seasonal cycles
3. With current data (~1 year), SARIMA would overfit

**Future Path**:
- When 2+ school years exist: Enable SARIMA
- Seasonal period = 4 (quarters)
- Configuration: SARIMA(p, d, q)(P, D, Q)[4]

---

## 8. Data Sufficiency Rules

### 8.1 Minimum Observation Requirements

```typescript
export const FORECAST_SUFFICIENCY = {
  // Minimum completed quarters for school-wide
  MIN_QUARTERS_SCHOOL: 4,
  
  // Minimum per grade level
  MIN_QUARTERS_GRADE: 3,
  
  // Minimum per subject
  MIN_QUARTERS_SUBJECT: 3,
  
  // Minimum data points
  MIN_OBSERVATIONS: 4,
  
  // Maximum missing tolerance (40% gaps)
  MAX_MISSING_RATE: 0.4,
};
```

### 8.2 Insufficient Data Handling

When insufficient data:
```
Status: "insufficient_data"
Message: "More historical academic data is required before a reliable forecast can be generated. A minimum of {X} completed quarters are needed."
```

---

## 9. Missing Data Handling

### 9.1 Policy: NO DEFAULT TO ZERO

**Rationale**: A missing grade is not equivalent to a zero grade.

### 9.2 Handling Strategy

| Scenario | Action |
|----------|--------|
| Missing quarter in middle | Interpolate (linear) between neighbors |
| Missing quarter at end | Leave null (forecast target anyway) |
| Missing student data | Exclude from aggregation |
| New subject | Cannot forecast (insufficient history) |
| Transferred student | Use actual enrollment period only |

### 9.3 Imputation Method (if needed)

For intermediate missing values:
```typescript
function linearInterpolate(prev: number, next: number, ratio: number): number {
  return prev + (next - prev) * ratio;
}
```

---

## 10. Outlier Handling

### 10.1 Policy: PRESERVE OUTLIERS

**Rationale**: Academic outliers can be legitimate exceptional results (e.g., gifted students, remedial interventions).

### 10.2 Documentation

Document when outlier detection would be applied:
- Flag values > 3 standard deviations from mean
- Report in model metadata
- Do NOT automatically remove

---

## 11. Forecast Horizon

### 11.1 Default Horizon: 1 Academic Year

```typescript
export const FORECAST_HORIZON = {
  QUARTERS: 4,  // Next full academic year
  SCHOOL_YEARS: 1,
};
```

### 11.2 Configuration

Make configurable via `system_settings`:
- Key: `forecast_horizon_quarters`
- Default: 4
- Maximum: 8 (2 years)

---

## 12. Forecast Confidence / Prediction Intervals

### 12.1 Output Structure

```typescript
type ForecastPoint = {
  timestamp: number;
  forecast: number;
  lowerBound: number;  // 95% CI lower
  upperBound: number;  // 95% CI upper
};
```

### 12.2 Visual Distinction in UI

- Historical: Solid line with filled circles
- Forecast: Dashed line with open circles  
- Prediction interval: Shaded area

---

## 13. Forecast Result Storage

### 13.1 Table Design

```sql
CREATE TABLE forecasts (
  id TEXT PRIMARY KEY,
  forecast_type TEXT NOT NULL,           -- 'school_wide' | 'grade_level' | 'subject'
  scope_level TEXT NOT NULL,             -- 'school', 'grade_7', 'mathematics', etc.
  target_period TEXT NOT NULL,           -- ISO date of forecast target
  forecast_value REAL NOT NULL,
  lower_bound REAL NOT NULL,
  upper_bound REAL NOT NULL,
  model_type TEXT NOT NULL DEFAULT 'ARIMA',
  model_order TEXT NOT NULL,             -- JSON: {"p":1,"d":1,"q":1}
  observation_count INTEGER NOT NULL,
  training_start TEXT NOT NULL,
  training_end TEXT NOT NULL,
  accuracy_metrics TEXT,                 -- JSON: {"aic":..., "bic":..., "mae":...}
  generated_at TIMESTAMP NOT NULL DEFAULT (unixepoch()),
  generated_by TEXT REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'completed', -- pending, processing, completed, failed
  error_message TEXT,
  INDEX idx_forecasts_type_status (forecast_type, status),
  INDEX idx_forecasts_scope (scope_level),
  INDEX idx_forecasts_target (target_period),
  INDEX idx_forecasts_generated (generated_at)
);
```

### 13.2 Uniqueness Strategy

One forecast per `(forecast_type, scope_level, target_period)` with same model version.

---

## 14. Model Metadata Storage

Store in `accuracy_metrics` JSON:

```json
{
  "aic": 1234.5,
  "bic": 1250.2,
  "mae": 4.2,
  "rmse": 5.8,
  "mape": 0.12,
  "ljung_box_p": 0.35,
  "residual_std": 3.1
}
```

---

## 15. Model Versioning

### 15.1 Current Approach

Hard-code model version in code. Track via:
- Git commit hash in metadata
- Model parameter string in `model_order`

### 15.2 Future Enhancement

```sql
ALTER TABLE forecasts ADD COLUMN model_version TEXT;
```

---

## 16. Forecast Generation Architecture

### 16.1 Option Selected: **On-Demand with Caching**

**Rationale**:
- No existing background job infrastructure
- Simple deployment
- Forecasts cached in database
- API provides cached results when available

**Architecture**:
```
API Request
    ↓
Check cache (forecasts table)
    ↓ Yes
Return cached forecast
    ↓ No
Generate forecast (new request)
    ↓
Store in forecasts table
    ↓
Return forecast
```

### 16.2 Cache Invalidation

When grades change:
1. Audit log triggered
2. Identify affected scope(s)
3. Mark forecasts as `status = 'stale'`
4. Next request regenerates

---

## 17. Performance Requirements

### 17.1 Forecast Generation Time Target
- School-wide: ≤ 5 seconds
- Grade-level: ≤ 3 seconds  
- Subject: ≤ 2 seconds

### 17.2 Dashboard Load
- Read cached forecasts: ≤ 100ms
- Generate if stale: On-demand (acceptable as background process can also run via cron)

### 18. Failure Handling

### 18.1 Scenarios & Responses

| Scenario | Response |
|----------|----------|
| Insufficient data | Return `status: "insufficient_data"` |
| Model convergence | Return `status: "failed"` with error message |
| Database error | Log + return error state |
| Invalid parameters | Return 400 error |

### 18.2 Status Values

```typescript
export type ForecastStatus = 'pending' | 'processing' | 'completed' | 'insufficient_data' | 'failed' | 'stale';
```

---

## 19. Forecast Staleness Detection

### 19.1 Staleness Triggers

```typescript
const STALENESS_RULES = {
  // Grade change triggers forecast invalidation
  invalidationOn: [
    'SAVE_GRADE',
    'student.update',  // For record_status changes
  ],
  
  // How far back to look for new grades
  lookbackDays: 30,
};
```

### 19.2 Implementation
After grade save:
1. Query affected scopes
2. Update `status = 'stale'` in forecasts table
3. Next API read regenerates

---

## 20. Grade Correction Impact

### 20.1 Invalidation Logic

When `SAVE_GRADE` occurs:
1. Identify affected `forecast_scope` (e.g., if grade is in Grade 7 Mathematics)
2. Mark all forecasts for that scope as stale
3. Optionally trigger async regeneration

### 20.2 Historical Context Preservation

Grades remain in historical school years; forecasts are tied to scope + target period.

---

## 21. Analytics Integration

### 21.1 Dashboard Integration Point
Add new panel to dashboard:

```tsx
<PerformanceForecast 
  schoolYear={currentYear}
  gradeLevel={userScope}
/>
```

### 21.2 Display Components

| Component | Purpose |
|-----------|---------|
| `PerformanceForecastChart` | Line chart with historical + forecast |
| `ForecastKPIs` | Accuracy metrics, data sufficiency |
| `ForecastStatus` | Status indicator, explanation |

---

## 22. Risk Analytics

### 22.1 Forecast ≠ Risk Label

**Important**: Forecast is advisory only.

### 22.2 Risk Indicators (Separate System)

```typescript
type RiskIndicator = {
  studentId: string;
  recentPerformance: number;
  trendSlope: number;
  failingSubjects: number;
  forecastDirection: 'improving' | 'declining' | 'stable';
  riskScore: number;  // Combined score 0-100
};
```

### 22.3 Not Implemented for Individual Students
- Too few observations
- Use aggregate trends instead

---

## 23. Student-Level Analytics (Alternative Approach)

### 23.1 Trend Analysis Instead of ARIMA

```typescript
type StudentTrend = {
  studentId: string;
  quarters: {
    quarter: number;
    average: number;
  }[];
  slope: number;  // Linear regression slope
  volatility: number;  // Standard deviation
  recentAverage: number;
};
```

---

## 24. Dashboard UI Integration

### 24.1 Location: After SectionCoverageTable

Preserve existing layout. Add new panel:

```tsx
<Panel
  title="Academic Performance Forecast"
  description="Statistical projection based on finalized grades."
>
  <PerformanceForecastChart data={forecastData} />
</Panel>
```

### 24.2 Styling
- Use existing `Panel` component
- Use Tailwind CSS existing classes
- Match dashboard color scheme

---

## 25. Chart Requirements

### 25.1 Using Recharts (already installed)

```tsx
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>
    <XAxis dataKey="period" />
    <YAxis domain={[40, 100]} />
    <Tooltip />
    <Legend />
    <Line
      type="monotone"
      dataKey="actual"
      stroke="#2563eb"
      strokeWidth={2}
      dot={{ r: 4 }}
    />
    <Line
      type="monotone"
      dataKey="forecast"
      stroke="#dc2626"
      strokeDasharray="5 5"
      strokeWidth={2}
      dot={{ r: 4, fill: '#dc2626' }}
    />
    <Area
      type="monotone"
      dataKey="lower"
      stroke="transparent"
      fill="rgba(220, 38, 38, 0.1)"
      connectNulls
    />
    <Area
      type="monotone"
      dataKey="upper"
      stroke="transparent"
      fill="rgba(220, 38, 38, 0.1)"
      connectNulls
    />
  </LineChart>
</ResponsiveContainer>
```

---

## 26. Forecast Explanation UI

```tsx
<div className="rounded-md bg-brand-50 p-3 text-xs text-brand-700">
  <p>
    <strong>Forecast Notice:</strong> These projections are statistical 
    estimates based on historical finalized academic performance. They should 
    be used as decision-support information rather than official grades.
  </p>
  <p className="mt-1">
    Forecasts require at least 4 completed grading periods of verified data. 
    Prediction intervals indicate uncertainty around the projection.
  </p>
</div>
```

---

## 27. Admin/User Permissions

### 27.1 Permission Matrix

| Action | Required Permission |
|--------|---------------------|
| View forecasts | `grades.view` (all roles) |
| Generate forecast | `reports.generate` (admin, school_admin, teacher, records) |
| Regenerate forecast | `settings.manage` (admin, school_admin) |
| View model details | `audit_logs.view` (admin, school_admin) |

### 27.2 Implementation
- Check permission in API route
- Filter scope via existing userSectionScope

---

## 28. Audit Logging

### 28.1 Forecast Generation Audit

```typescript
await logAudit({
  userId: user.id,
  action: "GENERATE_FORECAST",
  entityType: "forecast",
  entityId: forecastId,
  newValues: {
    forecastType: "school_wide",
    scopeLevel: "school",
    modelOrder: "ARIMA(1,1,1)",
    observationCount: 4,
  },
});
```

### 28.2 Forecast Invalidation

When grade changes:
```typescript
await logAudit({
  userId: user.id,
  action: "INVALIDATE_FORECAST",
  entityType: "forecast",
  entityId: affectedForecastIds,
  oldValues: { status: "completed" },
  newValues: { status: "stale" },
});
```

---

## 29. Security

### 29.1 Input Validation
- Scope parameter validated against allowed values
- No raw grade data exposed
- User scope enforced per request

### 29.2 Data Protection
- Forecasts exclude student PII
- API returns aggregated data only
- No endpoint returns individual student forecasts

---

## 30. Privacy

### 30.1 No Unauthorized Access
- Same scope enforcement as grades
- Teacher: Section-scoped forecasts only
- Admin: School-wide forecasts

### 30.2 No Data Leakage
- Forecasts return mean values, not individual data
- No student identifiers in school-wide aggregations

---

## 31. Environment File Safety

### 31.1 No Secrets in Forecast Code
- No new environment variables required
- Existing database credentials handled by Drizzle
- No external API keys for statistical computation

---

## 32. Dependency Strategy

### 32.1 New Dependency
```bash
npm install simple-statistics
```

### 32.2 Dev Dependency (for testing)
```bash
npm install -D @types/simple-statistics
```

### 32.3 Size Impact
- ~100KB minified
- Acceptable for this application

---

## 33. Python/Javascript Architecture Decision

### 33.1 Selected: Pure JavaScript Implementation

**Reasons**:
1. No Python runtime required
2. No separate service/deployment complexity
3. Existing Next.js runtime handles computation
4. Simple-statistics provides production-ready ARIMA
5. Serverless-compatible

**Alternative Rejected**: Python microservice
- Would require separate FastAPI service
- Need inter-process communication
- Python dependency management
- Deployment complexity

---

## 34. API Design

### 34.1 Endpoint Structure

```
GET /api/forecasts/school-wide?quarter=4&year=2025-2026
GET /api/forecasts/grade-level?gradeLevelId=gl-7&quarter=4
GET /api/forecasts/subject?subjectId=sub-MATH&quarter=4
```

### 34.2 Authorization
All endpoints require authentication. School-wide: admin/school_admin. Others: scoped via existing permissions.

### 34.3 Response Structure

```typescript
type ForecastResponse = {
  type: 'school_wide' | 'grade_level' | 'subject';
  scope: string;
  timestamp: number;
  forecast: ForecastPoint[];
  status: ForecastStatus;
  message?: string;
  modelInfo?: {
    type: string;
    order: { p: number; d: number; q: number };
    aic: number;
    bic: number;
  };
  dataPoints: number;
  sufficiency: number; // % of required data available
};
```

---

## 35. Database Design & Modifications

### 35.1 New Table: `forecasts`

Migration file: `0001_forecasts_table.sql`

### 35.2 No Changes to Existing Tables
- No modification to `students`, `studentGrades`, etc.
- Historical data remains untouched
- Forecasts are additive

### 35.3 Index Strategy
Indexes on:
- `forecast_type, status` (for dashboard queries)
- `scope_level` (for scope-based invalidation)
- `target_period` (for time-based queries)
- `generated_at` (for cleanup of stale forecasts)

---

## 36. Caching Strategy

### 36.1 Primary: Database Cache

Store forecasts in `forecasts` table. Dashboard reads from database.

### 36.2 Invalidation Triggers

1. Grade saved: Update `status = 'stale'`
2. Record status changed to verified: Enable forecasting
3. Record marked duplicate: Mark associated forecasts stale

### 36.3 No Redis/In-memory Cache
- Simple SQLite database sufficient
- No need for additional infrastructure

---

## 37. Testing Strategy

### 37.1 Unit Tests

Location: `/src/lib/__tests__/forecasting.test.ts`

Test cases:
- Time series aggregation
- Stationarity detection
- ARIMA model selection
- Forecast generation
- Data sufficiency checks
- Missing data handling

### 37.2 Integration Tests

Test flow:
```
Seed data → Generate forecast → Verify results → Update grade → Verify invalidation
```

### 37.3 Authorization Tests
- Verify teachers cannot access other sections' forecasts
- Verify unauthenticated access rejected
- Verify insufficient permissions rejected

### 37.4 Statistical Validation Tests

Compare forecast against known values:
- RMSE < 10% of grade range
- Predictions within 2 std dev
- No negative grades
- No grades > 100

---

## 38. Statistical Validation

### 38.1 Backtesting Method

With historical data:
1. Train on earlier periods
2. Predict later periods
3. Compare predictions to actual
4. Calculate metrics

### 38.2 Metrics to Track

| Metric | Formula | Threshold |
|--------|---------|-----------|
| MAE | Σ|y_true - y_pred|/n | < 5% of grade range |
| RMSE | √(Σ(y_true - y_pred)²/n) | < 8% of grade range |
| MAPE | Σ|y_true - y_pred|/|y_true| | < 10% |

Note: MAPE can be unstable near 0, use with caution.

---

## 39. Model Selection

### 39.1 Grid Search Approach

Generate candidate models:
```typescript
const candidates = [
  { p: 0, d: 0, q: 0 },
  { p: 1, d: 0, q: 0 },
  { p: 0, d: 0, q: 1 },
  { p: 1, d: 1, q: 1 },
  // ... grid search
];
```

Select best by:
1. Lowest AIC (Akaike Information Criterion)
2. Cross-validate on holdout data

### 39.2 No Over-Engineering

For small datasets:
- Keep grid small (3x2x3 = 18 models max)
- Focus on reasonable defaults (ARIMA(1,1,1) works well for many cases)

---

## 40. Configuration

### 40.1 System Settings

Add to `system_settings` table:

| Key | Default | Purpose |
|-----|---------|---------|
| `forecast_horizon_quarters` | 4 | How many quarters to forecast |
| `forecast_min_observations` | 4 | Minimum data points |
| `forecast_confidence_level` | 0.95 | CI percentage |

### 40.2 Hardcoded (Not User Config)

- ARIMA parameter grid
- Model selection criteria
- Time series aggregation method

---

## 41. Automation Strategy

### 41.1 Primary: On-Demand with Caching

Forecasts generated when:
1. Dashboard page loaded
2. API endpoint called

### 41.2 Optional: Periodic Regeneration

Add admin-action to regenerate all forecasts.

### 41.3 No Cron Without Infrastructure

Current system has no cron/scheduled tasks. Will implement manual regeneration via admin UI if needed.

---

## 42. Idempotency

### 42.1 Regeneration Safety

Running forecast generation twice should:
- Not create duplicate forecasts
- Not corrupt existing data
- Return same results for same input

Implementation:
- Use UPSERT (INSERT OR REPLACE) pattern
- Or DELETE + INSERT pattern
- Unique constraint on (type, scope, target_period)

---

## 43. Concurrency

### 43.1 Current Risk: Low

- Single-server deployment
- Dashboard reads cached, generates on miss
- Infrequent forecast generation

### 43.2 Mitigation

- Database UNIQUE constraint prevents duplicates
- Row-level locking via SQLite (sufficient for single server)

---

## 44. Observability

### 44.1 Logging Points

```typescript
// Start
console.log(`[forecast] Generating school-wide forecast for ${year}`);

// Completion
console.log(`[forecast] Generated forecast with ARIMA${order}, AIC=${aic}, MAE=${mae}`);

// Failure
console.error(`[forecast] Forecast failed: ${error.message}`);
```

### 44.2 Metrics to Log

- Duration
- Observation count
- Model selected
- AIC/BIC
- MAE
- Status

### 44.3 What NOT to Log

- No student PII
- No raw grade values
- No model internals that reveal data

---

## 45. User Experience States

### 45.1 Loading State

Skeleton loader matching dashboard style:
```tsx
<div className="h-48 bg-brand-200 rounded-lg animate-pulse" />
```

### 45.2 Available State

Normal chart display with historical + forecast

### 45.3 Insufficient Data State

```tsx
<p className="py-6 text-center text-sm text-brand-400">
  Insufficient data for forecasting. A minimum of 4 completed grading periods are required.
</p>
```

### 45.4 Failed State

```tsx
<p className="py-6 text-center text-sm text-amber-600">
  Forecast generation failed. Please try again.
</p>
```

### 45.5 Stale State

```tsx
<p className="text-xs text-brand-500">
  Forecast is outdated. Reloading...
</p>
```

---

## 46. Mobile Responsiveness

### 46.1 Chart Requirements
- Horizontal scrollbar for wide charts
- Tooltips work on tap
- Minimum height: 280px

### 46.2 Touch Targets
- All interactive elements ≥ 44px

---

## 47. Accessibility

### 47.1 Chart Requirements
- `<title>` element with description
- Pattern for colorblind users (dashed vs solid lines)
- aria-label on interactive elements

### 47.2 Loading States
- `aria-busy="true"` during loading

---

## 48. Documentation to Create

### 48.1 Files

1. `/documentation/arima-forecasting.md` - Main documentation
2. `/documentation/forecasting-api.md` - API specification
3. `/documentation/forecasting-architecture.md` - Technical architecture

### 48.2 Content Structure

- Overview
- Purpose
- Architecture diagram
- Data flow
- Model methodology
- API endpoints
- Configuration
- Limitations
- Maintenance guide

---

## 49. Implementation Order

| Priority | Task | Files to Create/Modify |
|----------|------|------------------------|
| 1 | Create forecasting module structure | `/src/lib/forecasting/` |
| 2 | Create database migration | `/drizzle/0001_forecasts_table.sql` |
| 3 | Implement time series aggregation | `/src/lib/forecasting/time-series.ts` |
| 4 | Implement ARIMA engine | `/src/lib/forecasting/arima.ts` |
| 5 | Create forecast storage | `/src/lib/forecasting/storage.ts` |
| 6 | Create API endpoint | `/src/app/api/forecasts/school-wide/route.ts` |
| 7 | Add permissions | `/src/lib/permissions.ts` |
| 8 | Create dashboard component | `/src/components/forecast/forecast-panel.tsx` |
| 9 | Add to dashboard page | `/src/app/(app)/dashboard/page.tsx` |
| 10 | Write unit tests | `/src/lib/__tests__/forecasting.test.ts` |
| 11 | Create documentation | `/documentation/arima-forecasting.md` |
| 12 | Update plan with status | `plan/arima-forecasting-plan.md` |

---

## 50. Final Verification Checklist

### 50.1 Before Completion

- [ ] All planned files created
- [ ] Database migration runs successfully
- [ ] Forecast generation produces valid results
- [ ] Dashboard displays forecasts correctly
- [ ] Caching works (second request uses cache)
- [ ] Insufficient data handled gracefully
- [ ] Authorization enforced
- [ ] No PII exposed
- [ ] Tests pass
- [ ] Documentation complete
- [ ] Existing functionality preserved

---

## 51. Limitations & Known Issues

### 51.1 Current Limitations

1. **Single school year data**: SARIMA not yet implemented
2. **No background scheduling**: Generates on-demand
3. **Section forecasting deferred**: Needs more historical cycles
4. **Individual student forecasts**: Using trend metrics instead

### 52. Future Improvements

1. SARIMA when 2+ school years available
2. Background job system for batch forecasting
3. Automated cache refresh via cron
4. More sophisticated model selection (residual diagnostics)
5. Additional metrics (seasonal adjustment)
6. Customizable forecast horizon
7. Confidence interval visualization improvements

---

## 53. Statistical Sanity Checks

### 53.1 Range Validation

Grades: 0-100 scale
- Forecast values clamped to [0, 100] during display
- Model can produce out-of-range; clamp, don't discard

### 53.2 Persistence Validation

- Historical values never modified
- Forecasts stored separately
- No overwrite of actual grades

---

## 54. Performance Baseline

### 54.1 Expected Performance

| Operation | Expected Time |
|-----------|---------------|
| Database read (cached forecast) | < 50ms |
| Forecast generation (school-wide) | < 3 seconds |
| Forecast generation (grade-level) | < 2 seconds |
| Forecast generation (subject) | < 1 second |

### 54.2 Bottleneck: ARIMA Computation

Simple-statistics compute-intensive. Benchmark on deployment environment.

---

## 55. File-Specific Implementation Plan

| Task | File/Folder | Action | Dependencies | Status |
|------|-------------|--------|--------------|--------|
| Create forecasting module | `/src/lib/forecasting/` | CREATE | None | [ ] |
| Time series aggregation | `/src/lib/forecasting/time-series.ts` | CREATE | None | [ ] |
| ARIMA engine | `/src/lib/forecasting/arima.ts` | CREATE | simple-statistics | [ ] |
| Forecast storage | `/src/lib/forecasting/storage.ts` | CREATE | Drizzle schema | [ ] |
| Database migration | `/drizzle/0001_forecasts_table.sql` | CREATE | None | [ ] |
| Update schema | `/src/db/schema.ts` | MODIFY | Migration | [ ] |
| Forecast API | `/src/app/api/forecasts/school-wide/route.ts` | CREATE | storage.ts | [ ] |
| Grade-level API | `/src/app/api/forecasts/grade-level/route.ts` | CREATE | storage.ts | [ ] |
| Subject-level API | `/src/app/api/forecasts/subject/route.ts` | CREATE | storage.ts | [ ] |
| Add permissions | `/src/lib/permissions.ts` | MODIFY | None | [ ] |
| Forecast panel | `/src/components/forecast/forecast-panel.tsx` | CREATE | API | [ ] |
| Update dashboard | `/src/app/(app)/dashboard/page.tsx` | MODIFY | panel | [ ] |
| Unit tests | `/src/lib/__tests__/forecasting.test.ts` | CREATE | implementation | [ ] |
| Documentation | `/documentation/arima-forecasting.md` | CREATE | implementation | [ ] |
| API docs | `/documentation/forecasting-api.md` | CREATE | API | [ ] |

---

## 56. Implementation Order (Recommended)

1. Add `forecasts` table to schema
2. Create migration file
3. Implement time series aggregation
4. Implement ARIMA engine
5. Create forecast storage layer
6. Create API endpoints
7. Add permissions
8. Create dashboard component
9. Integrate into dashboard page
10. Write tests
11. Create documentation
12. Final verification

---

## 57. Risk Mitigation

### 57.1 Database Migration Safety
- Migration is additive only
- No destructive operations
- Can be rolled back (DROP TABLE if needed)

### 57.2 Performance Impact
- Forecasts cached in database
- No expensive computation on dashboard load (only on first visit per scope)
- Simple-statistics optimized for common use cases

### 57.3 Data Integrity
- Forecasts don't affect actual grades
- Validation on inputs
- Unique constraints prevent duplicates

---

## 58. Rollback Plan

If issues discovered:

1. Remove new API routes
2. Remove dashboard component
3. Remove forecasting module files
4. Database: DROP forecasts table (if needed)
5. Comments explaining removal for future attempt

---

## 59. Post-Implementation Tasks

1. Run seeds to generate demo forecast data
2. Verify dashboard loads correctly
3. Verify API returns expected data
4. Verify caching works
5. Run all tests
6. Document findings

---

## 60. Final Report Will Include

1. Files created
2. Files modified
3. Database migrations
4. New dependencies
5. API endpoints
6. Testing results
7. Known limitations
8. Future work recommendations