# Relationship Map — Target Database

> STATUS: **PLAN**. Every relationship documents cardinality, foreign key,
> deletion behavior, reason, and historical implications (TODO §54).

```
users ─┬─< sessions
       ├─< student_enrollments (recorded_by)
       ├─< student_grades (recorded_by)
       ├─< attendance_records (recorded_by)
       ├─< behavior_records (recorded_by)
       ├─< assessments (assessor_id)
       ├─< interventions (assigned_to / created_by)
       └─< audit_logs (set null)

roles ─< users                        permissions ─ role_permissions >─ roles

school_years ─┬─< sections
              ├─< grading_periods
              └─< student_enrollments

grade_levels ─┬─< sections
              └─< student_enrollments

sections ─< student_enrollments

students ─┬─< student_guardians >─ guardians
          ├─< student_enrollments ─┬─< student_grades
          │                        └─< attendance_records
          ├─< behavior_records >─ behavior_categories
          ├─< assessments
          ├─< interventions ─< intervention_followups
          ├─< record_verifications
          ├─< duplicate_candidates (both sides)
          └─< qr_verifications
```

## Detailed List

| # | Relationship | Cardinality | FK | Deletion | Reason | Historical implication |
|---|---|---|---|---|---|---|
| 1 | users → sessions | 1:N | sessions.user_id | CASCADE | Sessions die with user | — |
| 2 | roles → users | 1:N | users.role_id | RESTRICT (app-enforced) | Never orphan a user | Role catalog changes reassign users |
| 3 | school_years → sections | 1:N | sections.school_year_id | RESTRICT in practice | Sections belong to a year | Old-year sections retained for history |
| 4 | school_years → grading_periods | 1:N | grading_periods.school_year_id | CASCADE | Periods meaningless without year | — |
| 5 | school_years → student_enrollments | 1:N | student_enrollments.school_year_id | RESTRICT | Enrollment history anchors to year | Never delete a year with enrollments |
| 6 | grade_levels → sections / enrollments | 1:N | *_grade_level_id | RESTRICT | Level definitions stable | Reordering allowed; renaming changes labels only |
| 7 | sections → student_enrollments | 1:N | student_enrollments.section_id | RESTRICT | Historical placement | Section dissolved ≠ delete; new rows stop referencing it going forward |
| 8 | students → student_guardians → guardians | M:N | composite PK | CASCADE on join rows | Guardian directory reusable | Removing a guardian removes only the link |
| 9 | students → student_enrollments | 1:N | student_enrollments.student_id | CASCADE (only via student deletion, which the app avoids — archive instead) | One placement per year (unique) | **History never overwritten**; new year = new row |
| 10 | enrollments → student_grades | 1:N | student_grades.enrollment_id | CASCADE | Grades belong to a placement | Grade corrections update in place (unique per subject+period); history via audit log |
| 11 | enrollments → attendance_records | 1:N | attendance_records.enrollment_id | CASCADE | Attendance per school day (unique per date) | Immutable daily record; corrections audited |
| 12 | students → behavior_records → behavior_categories | 1:N / N:1 | behavior_records.student_id / category_id | CASCADE / RESTRICT | Categorized observations | Records retained while student archived |
| 13 | students → assessments | 1:N | assessments.student_id | CASCADE | Reading/literacy/numeracy engine | Re-assessments append; trend = ordered history |
| 14 | students → interventions | 1:N | interventions.student_id | CASCADE | Support lifecycle | Follow-ups cascade with intervention |
| 15 | interventions → intervention_followups | 1:N | intervention_followups.intervention_id | CASCADE | Follow-up log | — |
| 16 | students → record_verifications | 1:N | record_verifications.student_id | CASCADE | Verification history (dual convention: `students` may carry a current record_status + history rows) | Full review trail preserved |
| 17 | students → duplicate_candidates (×2) | 1:N both sides | child_id / possible_student_id | CASCADE | Pair-unique review candidates | Never auto-merge; review rows are the audit trail |
| 18 | students → qr_verifications | 1:N | qr_verifications.student_id | CASCADE | Token events (generate/scan/revoke) | Event-sourced token state (pattern from `src/lib/qr.ts`) |
| 19 | users → audit_logs | 1:N | audit_logs.user_id | SET NULL | Actor attribution survives user deletion | Append-only; never edited |
| 20 | reports → report_exports | 1:N | report_exports.report_id | CASCADE | Export metadata | — |

## Notes

- **RESTRICT semantics:** SQLite enforces FKs only when `PRAGMA foreign_keys=ON`;
  libSQL honors the pragma — Drizzle schema declares `onDelete` explicitly and the
  application additionally guards destructive paths (same defense-in-depth as the
  current `canAccessChild`/`canEditChild` checks).
- **Archive-not-delete:** student "deletion" is `status='archived'`; hard deletes
  are never exposed in the UI or actions.
