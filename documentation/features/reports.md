# Feature — Reports

> STATUS: **PLAN**. Replaces municipal/barangay reports. Pipeline retained:
> `buildReport()` → PDF (`@react-pdf/renderer`) / XLSX (`exceljs`) via
> `/api/reports/[type]`, with `reports` + `report_exports` metadata rows and
> audit logging — exactly as today, new catalog + school scope.

## Report Catalog

| Type key | Report | Primary audience |
|---|---|---|
| `student_master_list` | Student Master List (per section/grade; guardians on request) | records, admin |
| `enrollment_report` | Enrollment Summary (by grade/section/year) | admin, school admin |
| `grade_report` | Grade Report (per section & period; per student) | teachers, admin |
| `subject_performance` | Subject Performance (averages, distributions) | admin, school admin |
| `attendance_report` | Attendance Report (rates, absences by section/period) | admin, teacher ✓ᴬ |
| `behavior_report` | Behavior Summary (counts/categories — no incident text) | admin, guidance |
| `reading_report` | Reading Assessment Summary | admin, teacher ✓ᴬ |
| `literacy_report` | Literacy Assessment Summary | admin, teacher ✓ᴬ |
| `numeracy_report` | Numeracy Assessment Summary | admin, teacher ✓ᴬ |
| `intervention_report` | Intervention Summary (status/outcomes) | admin, guidance |
| `student_profile_report` | Student Profile Report (single student, permission-gated) | per matrix |
| `needs_monitoring_report` | Requires-Attention List (neutral labels) | admin, school admin, guidance |
| `grade_level_performance` | Grade-Level Performance | admin, school admin |
| `section_performance` | Section Performance | admin, school admin, teacher ✓ᴬ |
| `school_year_comparison` | School-Year Comparison (enrollment, averages, rates) | admin, school admin |

## Requirements per Report (TODO §34)

- **Authorization:** route re-checks `reports.export` + report-type-level role gate (matrix); row-level scope applied in builders.
- **Filters:** school year (required selector), grade level, section, period, date range where applicable.
- **Privacy:** sensitive columns (guardian contacts, behavior text, assessment notes) included only for roles allowed by the matrix; behavior/assessment reports ship counts, not narratives.
- **Header:** school header replaces `MUNI_HEADER` (name, address, school year, generated-by, timestamp).
- **Error handling:** builder failures → 500 JSON (no stack); unsupported type/format → 400.
- **Empty state:** valid export with a "No records match the selected filters" page/row.
- **Audit:** `GENERATE_REPORT` / `EXPORT_REPORT` entries (existing actions) with type + filters (no row data).

## UI

- `/reports`: catalog cards grouped by domain (reuse card grid layout), each with
  filter form + PDF/XLSX buttons (existing design), plus "Recently generated" table.
- CSV support: evaluate — current route documents CSV but implements PDF/XLSX;
  either implement CSV in the same route or remove the format constant (decision logged in implementation).

## Tests

- Builder output shape per type (columns constant, rows typed).
- Empty datasets → zero-row report, no crash.
- Permission gating per report type × role.
- Scope: teacher exports limited to assigned sections.
