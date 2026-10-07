# Feature — Reading

> STATUS: **PLAN**. Uses the shared `assessments` engine with
> `domain = 'reading'`. **Assessment levels/types are configurable — the system
> invents no official standards** (TODO §21/§64).

## Recording

| Field | Notes |
|---|---|
| date | when assessed |
| assessment_type | school-chosen tool/label (free, from configured list) |
| level | ordered proficiency label from `system_settings.assessment_levels.reading` (e.g. school-defined levels — placeholders shipped as config, not policy) |
| score | optional numeric |
| assessor | recording user |
| notes | sensitive, length-limited |

Teachers/guidance record (`assessments.write`, scope-limited); re-assessments
append — history enables trend lines.

## Analytics

| Chart/Metric | Question it answers |
|---|---|
| Proficiency distribution | How many students are at each reading level? (stacked bar by grade level) |
| Trend | Is reading performance improving across periods? (line per grade level) |
| Grade-level comparison | Which grade levels need reading support? |
| Below-target count | How many students are below the target level? (target = configured setting) |
| Improvement list | Which students improved/declined since last assessment? (profile-facing) |

## Pages

- `/performance/reading`: distribution + trend + below-target list (neutral
  heading: "Students Recommended for Reading Support").
- Profile → Reading tab: assessment history table, level progression, latest level badge.

## Permissions

Write: teacher ✓ᴬ, guidance ✓, admins ✓. View: per matrix (records view;
no behavior-style restriction needed but notes are sensitive).

## Empty/Edge States

- No levels configured → setup prompt for admins; recording blocked with guidance message.
- Student never assessed → profile shows "No reading assessments recorded" + CTA (permission-gated).

## Tests

- Level validation against configured set.
- Distribution/trend aggregations (zero-filled periods).
- Scope: teacher records only within assigned sections.
