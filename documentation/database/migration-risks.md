# Database Migration Risks

> STATUS: **PLAN**. Risk register for Phase 4 (database) and cutover.

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | Data loss during `children`→`students` backfill | Low | Critical | Idempotent script keyed by preserved ids; transactional batches; full backup of `local.db`/Turso snapshot before start; reconciliation report (counts per table) |
| 2 | `school_year` text → `school_years` rows mapping errors (malformed/missing) | Medium | Medium | Parser with explicit fallback year bucket; unmappable rows logged to a review file, never silently dropped |
| 3 | Grade-level text (`grade_level` free text) doesn't match `grade_levels` names | High | Low | Normalization map (e.g. "G7", "Grade 7", "7"); unmapped → placeholder level flagged for admin review |
| 4 | Section assignment for migrated students unknown | High | Low | Default "Unassigned" section per year/grade (clearly labeled); admins reassign in UI |
| 5 | Dual-schema period confuses queries (old tables still present) | Medium | Medium | Old tables renamed `_archived_*` at cutover end; a repo-wide grep checklist ensures no code references them |
| 6 | Unique-constraint violations during backfill (duplicate students) | Medium | Medium | Run duplicate detection *before* insert; conflicts recorded as `duplicate_candidates` for human review — no auto-merge (TODO §32) |
| 7 | Audit-trail continuity (old `child.*` actions vs new vocabulary) | Low | Low | Audit rows are append-only history; new vocabulary starts at cutover; no rewriting of old rows |
| 8 | QR tokens point at migrated ids | Low | Medium | Student ids preserved 1:1 from children ids — tokens keep resolving; verified in post-migration spot checks |
| 9 | Settings-driven scales misconfigured (grading/assessment) | Medium | Medium | Zod-validated settings keys with documented placeholder defaults; admin UI validation; seed ships sensible demo values |
| 10 | Performance regressions from new joins | Low | Medium | Indexes per `indexing.md`; `EXPLAIN QUERY PLAN` spot checks; seeded-volume load test of dashboard/report queries |
| 11 | Migration run against production Turso by mistake | Low | High | Document: run against a Turso **database copy** first; `drizzle.config.ts` unchanged; env names only, values never committed |
| 12 | Incomplete cutover leaves features reading old tables | Medium | High | Phase-24 grep gate: old table names must appear only in archive docs/scripts |

## Rollback (summary — full doc: `documentation/migration/rollback-plan.md`)

- Pre-migration snapshot restored; or
- `_archived_*` tables restored + revert commits (no destructive drops until archive verified).
