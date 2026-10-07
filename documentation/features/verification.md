# Feature — Student Record Verification

> STATUS: **PLAN**. Repurposes the child validation workflow
> (`/validation`, `src/lib/workflow.ts`, `child_validations`) into
> **student record verification** — data quality, not census approval.

## Purpose

Ensure student records are complete, consistent, and non-duplicated so that
grades, attendance, and analytics are trustworthy.

## Checks (system-suggested, human-decided)

| Check | Detection |
|---|---|
| Duplicate student | existing detector (`/duplicates`) — human review |
| Missing student number | generator guarantees; legacy rows flagged |
| Incomplete profile | missing required fields (names, birth date, sex, enrollment, guardian) |
| Invalid enrollment | enrollment references inconsistent (section's year ≠ enrollment year, etc.) |
| Missing grade records | active enrollment with no grades in an open period (informational) |
| Inconsistent school year | assessments/attendance dated outside their enrollment's school year |
| Invalid assessment data | level not in configured set; future dates; orphaned rows |

**The system never auto-destroys or auto-merges records** — checks produce a
queue for humans (TODO §31).

## Workflow (retained state machine pattern, `src/lib/workflow.ts`)

```
draft → pending_verification → verified
                  ↓
          needs_correction → pending_verification (resubmit)
pending_verification → marked_duplicate (only via confirmed duplicate review)
```

- Roles: submit = creator; review = records/school admin/admin (`verification.review`).
- Re-open of a verified record: admin only (existing rule preserved).
- History: `record_verifications` rows (submitted_by, reviewed_by, status,
  remarks, timestamps) — same dual convention (current status on `students` +
  history table).

## Pages

- `/verification` (renamed from `/validation`): queue with completeness hints,
  review actions (approve / needs correction / flag duplicate), search & filters.
- Profile: verification history timeline (existing pattern from child profile).

## Tests

- Transition guards per role (port `workflow.test.ts`).
- Check-detector unit tests (each rule with positive/negative fixtures).
- Permission tests (teacher cannot review).
