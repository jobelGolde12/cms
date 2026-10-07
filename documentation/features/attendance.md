# Feature — Attendance

> STATUS: **PLAN**.

## Recording

- One row per enrollment per date (unique): `present | absent_excused |
  absent_unexcused | late`, optional remarks, `recorded_by`.
- Teachers record per section per day (roster UI, tap-to-set defaults to
  present for speed); corrections allowed within permission and audited.
- Records only for `active` enrollments; future dates rejected.

## Analytics (server-side aggregation)

| Metric | Definition |
|---|---|
| Attendance rate | attended days ÷ recorded days — "attended" = `present` (+ `late`?) per `system_settings.attendance_rate_definition`; **the counting rule is documented and configurable**, never hardcoded |
| Absences | count by excused/unexcused per period/month |
| Lateness | late count per student/section |
| Trends | monthly & quarterly rate trend (school, grade, section, student) |
| Repeated absences | students exceeding a configurable threshold of unexcused absences in a window — feeds the "Requires Attention" indicators (rule documented in `analytics.md`) |

## Pages

- `/performance/attendance`: today's roster entry (teacher, per section),
  rate dashboard (admin), trend charts, repeated-absence list (neutral title:
  "Attendance Requiring Follow-Up").
- Profile → Attendance tab: personal calendar strip (month grid), rate, absences/late counts.

## Privacy & Permissions

- Write: teachers (assigned sections), admins. Read: matrix (records/guidance view).
- Absence remarks may contain sensitive context → treated as sensitive notes
  (not shown to roles without attendance view; excluded from exports for those roles).

## Tests

- Unique constraint per enrollment/date.
- Rate calculation variants per configured definition.
- Trend queries (empty months → zero-filled, not missing).
- Permission gating on write paths.
