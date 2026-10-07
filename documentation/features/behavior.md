# Feature — Behavior

> STATUS: **PLAN**. Permission-controlled; **neutral, non-stigmatizing
> language** throughout (TODO §20).

## Categories (configurable, admin-editable)

Seeded defaults (labels reviewable by the school):

- **Positive:** Positive Participation · Leadership · Cooperation · Academic Effort
- **Concern:** Classroom Concern · Attendance-Related Concern · Peer Relations Concern

`behavior_categories(kind: positive | concern)` — names/sets editable in settings.

## Records

| Field | Notes |
|---|---|
| student, date, category | required |
| description | required; neutral phrasing; max 500 chars |
| severity | low/medium/high (concerns only; optional) |
| follow_up | free text; links to an intervention when action is needed |
| status | open → monitored → resolved |
| recorded_by | audit-attributed |

## UX

- `/development/behavior`: casework list (open/monitored/resolved tabs), filters
  (grade, section, category, date range), trend of concern counts (support
  decision-making, not punishment stats).
- Profile → Behavior tab: chronological timeline, positive vs concern split,
  follow-up status; visible only to roles with `behavior.view`.
- Confirmation dialog before recording a concern; encouraging copy for positives.

## Permissions

- `behavior.view` / `behavior.write` per matrix: admin, school admin ✓;
  teacher ✓ᴬ (own sections); guidance ✓; records —; others —.
- Server enforces scope + domain gating; UI checks are cosmetic.

## Analytics

- Category distribution (positive vs concern) over time.
- Open casework count; repeat-concern students (≥ configurable count in
  window → "Requires Attention" indicator, documented rule).
- Never displays incident details in dashboards — counts only.

## Tests

- Permission gating (records role blocked; teacher scoped to sections).
- Lifecycle transitions (open → monitored → resolved).
- Neutral-language lint: banned shaming words list in form validation warning (soft check, documented).
