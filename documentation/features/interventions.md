# Feature — Interventions

> STATUS: **PLAN**. Reworks the existing intervention module
> (`src/actions/interventions.ts`, `/monitoring/interventions`) to the
> student-scoped model with the TODO §30 lifecycle.

## Lifecycle

```
planned → active → completed
              └──→ discontinued
```

| Status | Meaning |
|---|---|
| planned | approved support scheduled, not started |
| active | in progress |
| completed | finished; `outcome` recorded |
| discontinued | stopped early; `outcome` explains why |

Old values `ongoing/cancelled` map to `active/discontinued` during migration.

## Record

student · intervention type (configurable list, e.g. academic remediation,
reading support, counseling referral — school-editable) · reason ·
assigned personnel (`users.id`) · start date · target date · status · outcome ·
notes. Follow-ups: date, status (scheduled/done/missed/cancelled), notes,
recorder — retained from `intervention_followups`.

## Permissions

`interventions.view` / `interventions.write` per matrix — admin & school admin
full; guidance full (core use case); teacher limited (own sections); records —.

## Analytics

- Active vs planned vs completed vs discontinued counts (dashboard card).
- Outcome distribution for completed interventions.
- Students with open interventions ("students receiving support" — neutral label).
- Overdue follow-ups (target date passed, status not completed).
- Avg. completion time by intervention type (helps resourcing decisions).

## Pages

- `/development/interventions` (moves from `/monitoring/interventions`):
  list + filters (status, type, assignee, grade/section), detail with
  follow-up timeline, create/edit forms (reuse existing form patterns).
- Profile → Interventions tab: personal history + status badges.

## Tests

- Lifecycle transition guards (invalid transitions rejected server-side).
- Permission gating (records blocked; teacher scoped).
- Follow-up scheduling; overdue computation.
