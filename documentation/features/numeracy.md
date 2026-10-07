# Feature — Numeracy

> STATUS: **PLAN**. Shared `assessments` engine with `domain = 'numeracy'`.

## "Humiracy" Interpretation (TODO §23)

The project description contains the term **"humiracy"**. Investigation found
no such standard term in the codebase or common education literature; the
intended meaning is almost certainly **numeracy** (the ability to apply
mathematical skills), consistent with the reading–literacy–numeracy triad.
**Decision:** use **NUMERACY** consistently in all UI, docs, and data. The
original term is preserved here for traceability. *(Action item during
requirements confirmation with the school: verify this interpretation before
final labeling.)*

## Recording

Same fields as reading/literacy (date, type, optional `skill_area` e.g.
`computation | problem_solving | measurement`, level from
`system_settings.assessment_levels.numeracy`, optional score, assessor, notes).
Re-assessments append for trend tracking.

## Analytics

| Chart/Metric | Question it answers |
|---|---|
| Proficiency distribution | Numeracy levels across the school / grade levels |
| Trend | Is numeracy improving period over period? |
| Skill-area breakdown | Which numeracy skill areas are weakest? |
| Below-target count | Students below the configured target level |
| Intervention linkage | Numeracy-support interventions and their outcomes |

## Pages

- `/performance/numeracy` — shared assessment page parameterized by domain.
- Profile → Numeracy tab — history + progression + latest level.

## Permissions

Identical to reading (matrix): write = teacher ✓ᴬ / guidance ✓ / admins ✓;
view per matrix.

## Tests

- Domain-scoped aggregations; skill-area grouping; configured-level validation;
  scope enforcement for writers.
