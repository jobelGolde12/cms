# Migration Risks (Program-Level)

> STATUS: **PLAN**. Database-specific register: `documentation/database/migration-risks.md`.

| # | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|
| 1 | Design drift (accidental redesign) | User rejection | Medium | Design-preservation checklist in each UI phase; diffs reviewed against token/layout reuse; no new visual systems |
| 2 | Scope creep during implementation | Delay | High | Master plan phases are the contract; new ideas → documented backlog, not phase edits |
| 3 | Broken intermediate states (half-migrated routes) | Blocked QA | Medium | Phase ordering (DB → auth → students → …) keeps app coherent per commit; old routes removed only after replacements land |
| 4 | Role/permission regressions (over- or under-access) | Security | Medium | Matrix-driven tests; direct-action-call tests; matrix doc + code map updated together |
| 5 | Terminology leftovers (child/barangay strings in UI) | Confusing UX | High | Phase-24 grep gate + copy review; glossary is the reference |
| 6 | Analytics mistrust (numbers don't reconcile) | Low adoption | Medium | Every metric documented (source+formula); KPI totals reconciled to table counts like current dashboard does |
| 7 | Invented standards perceived as official (grading/levels) | Compliance | Medium | All thresholds config-driven with documented placeholders; explicit "pending school confirmation" notes |
| 8 | Sensitive data exposure in new modules (behavior/assessments/guardians) | Privacy violation | Medium | Privacy review gate per feature; matrix gating at query level; audit coverage |
| 9 | Performance regressions from richer analytics | Slow dashboard | Medium | Server-side aggregation + indexes + seeded-volume verification |
| 10 | Test gaps during big rename | Hidden breakage | Medium | Port existing suites first, then extend; DoD requires lint+test+build per phase |
| 11 | Documentation rot | Future confusion | Medium | Docs updated in the same phase as code (checklist per phase) |
| 12 | Solo-developer bus factor / long-running migration | Stalled migration | Medium | Master plan is executable by another agent (paths, checkboxes, acceptance per task) |

## Risk Review Cadence

At each phase completion: re-score open risks; update this register; escalate
scope changes back to the plan instead of improvising.
