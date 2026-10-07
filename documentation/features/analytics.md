# Feature — Analytics

> STATUS: **PLAN**. Every chart answers a real school question (TODO §28);
> every metric documented per TODO §55. All values computed from the database —
> **no hardcoded production statistics**. Server-side aggregation only
> (`src/lib/analytics-queries.ts`, new; patterns from `dashboard-data.ts`).

## Metric Specifications

Each entry: source → calculation → filters → permissions → visualization → states.

### Enrollment
| Metric | Source | Calculation | Viz | Notes |
|---|---|---|---|---|
| Total / active students | `students` | count by status | KPI card | scope-filtered |
| Current enrollment | `student_enrollments` | count where school_year=current, status=active | KPI card | |
| Enrollment by grade | `student_enrollments` ⨝ `grade_levels` | group by level, current year | horizontal bars (`distribution-bar.tsx`) | empty → zero rows shown |
| Enrollment trend | `student_enrollments` ⨝ `school_years` | count per year | line chart | last 5 years |
| Section sizes | `student_enrollments` ⨝ `sections` | count per section | table w/ balance flag (threshold from settings) | |

### Academic
| Metric | Source | Calculation | Viz |
|---|---|---|---|
| Average general grade (school) | `student_grades` | mean per current period | KPI card |
| Performance by subject | `student_grades` ⨝ `subjects` | mean per subject | horizontal bars, lowest-first |
| Grade trend | `student_grades` ⨝ `grading_periods` | mean per period | line |
| Low performers | same | students below configured threshold | "Academic Support Recommended" list (neutral) |

### Attendance
| Metric | Source | Calculation | Viz |
|---|---|---|---|
| Attendance rate | `attendance_records` | attended ÷ recorded per configured definition | KPI card |
| Attendance trend | same | rate per month | line |
| Repeated absences | same | unexcused > threshold in window | "Attendance Requiring Follow-Up" list |

### Reading / Literacy / Numeracy
| Metric | Source | Calculation | Viz |
|---|---|---|---|
| Proficiency distribution | `assessments` (latest per student per domain) | count per level | stacked bars per grade |
| Trend | same | mean level index / score per period | line |
| Below-target share | same | below configured target ÷ assessed | KPI card |

### Behavior
| Metric | Source | Calculation | Viz |
|---|---|---|---|
| Positive vs concern counts | `behavior_records` ⨝ `behavior_categories` | counts per kind, window | two-bar summary |
| Open casework | same | status=open/monitored | KPI card |
| Repeat concerns | same | ≥ N records in window (settings) | neutral list |

### Interventions
| Metric | Source | Calculation | Viz |
|---|---|---|---|
| Active interventions | `interventions` | status=active | KPI card |
| Outcomes | same | outcome counts for completed | distribution bars |
| Overdue follow-ups | `intervention_followups` | date < today, status=scheduled | list |

## "Requires Attention" Indicator Rules (documented, configurable)

Stored as JSON in `system_settings.monitoring_rules`; default thresholds ship
as **documented placeholders** the school can adjust. Indicators are advisory
flags using neutral language — never diagnoses, never labels like "at-risk
student" in student-facing contexts. Trigger candidates (each separately
toggleable):

| Rule | Default placeholder | Label shown |
|---|---|---|
| Low academic performance | general average below configured threshold | Academic Support Recommended |
| Declining grades | period-over-period drop ≥ N points | Grade Decline — Monitor |
| Repeated absences | unexcused absences ≥ N per quarter | Attendance Follow-Up |
| Repeated lateness | late ≥ N per quarter | Attendance Follow-Up |
| Low reading/literacy/numeracy | latest level below target | Reading/Literacy/Numeracy Support Recommended |
| Repeated behavior concerns | ≥ N concern records per quarter | Guidance Check-In Recommended |
| Incomplete interventions | active intervention past target date | Intervention Follow-Up Needed |

Students meeting any rule appear on a "Needs Monitoring" dashboard list
(permissions follow the underlying data). All rules, thresholds, and labels
are documented here and configurable via settings.

## Cross-Cutting Requirements

- **Permissions:** every metric respects the role matrix + scope; charts for
  restricted domains simply don't render for unauthorized roles.
- **Empty state:** charts render zero-filled with explanatory caption; lists
  show helpful guidance ("No students currently flagged").
- **Loading:** skeleton variants (existing kit); **Error:** boundary with retry
  (existing `(app)/error.tsx`), no technical detail exposure.
- **Performance:** grouped SQL aggregates, indexed per `documentation/database/indexing.md`,
  parallel `Promise.all` loading; no N+1.
- **School-year filter:** analytics default to the current school year with a
  selector for comparison (school-year comparison report feeds Reports phase).
