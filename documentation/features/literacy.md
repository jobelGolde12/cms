# Feature — Literacy

> STATUS: **PLAN** — includes the documented decision required by TODO §22.

## Decision: Literacy = Broader Assessment Domain (option 2)

**Chosen:** literacy is represented as a broader assessment category sharing the
same `assessments` engine (`domain = 'literacy'`), **not** a separate schema.

**Rationale:**

1. Reading, literacy, and numeracy share identical mechanics (date, type,
   level, score, assessor, notes, history/trend) — a second table would
   duplicate schema, queries, UI, and tests (TODO §22: "avoid duplicating data
   unnecessarily").
2. Literacy differs from reading in *breadth* (comprehension, writing,
   communication), which is expressible as different `assessment_type` /
   `skill_area` values within the same domain model.
3. Config-driven level sets (`system_settings.assessment_levels.literacy`)
   let the school define literacy-specific proficiency labels without schema change.

**Consequence:** "Reading vs literacy" distinctions are captured by
`domain` + `skill_area` (e.g. literacy assessments may include
`skill_area = 'comprehension' | 'writing' | 'communication'`). If the school
later requires distinct workflows (different permissions per domain), a
domain-permission map can be added without migration.

## Analytics

Same queries as reading, parameterized by domain: proficiency distribution,
trend, grade-level literacy, intervention progress linkage (interventions may
reference assessment history in their notes/outcome), students needing support.

## Pages

- `/performance/literacy` — reuses the assessment page components parameterized
  by `domain` (component reuse, no duplication).
- Profile → Literacy tab — same pattern.

## Tests

- Domain-scoped queries return only the requested domain.
- Config validation per domain (levels set exists).
