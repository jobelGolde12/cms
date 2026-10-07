# Rollback Plan

> STATUS: **PLAN**.

## Principles

- Nothing destructive happens before an archive copy exists (rename-to-`_archived_*`, never bare `DROP`).
- Every phase is a separately revertible commit set; migrations are append-only and never edited.
- A pre-migration snapshot is mandatory.

## Snapshot (before Phase 4)

- Local dev: stop server; copy `local.db` (e.g. `local.db.pre-migration-backup`; the repo already carries a stale backup file convention).
- Turso: take a point-in-time/duplicated database for rehearsal; production cutover only after a rehearsal succeeds on the copy.
- Record: git commit hash, `npm run db:generate` output diff, seed state.

## Rollback Scenarios

| Failure point | Action |
|---|---|
| New-table migrations fail midway | `drizzle-kit migrate` rolls back per-migration per its journal; else restore snapshot; investigate before retry |
| Backfill script errors | script is transactional per batch + idempotent — fix, re-run; worst case restore snapshot (old tables were never touched) |
| Cutover bugs found post-launch (code reads new tables) | code rollback to pre-cutover commit; old tables still intact if archive step not yet run |
| Archive step already executed | restore `_archived_*` tables via rename-back script + revert code commits |
| Data divergence after cutover (new records exist) | do **not** silently restore; export new-era rows, restore, re-run backfill + merge script (documented appendix to `database/migration.md`) |

## Guardrails

- Never delete `children`-family tables in the same release as the cutover.
- Keep dual-read capability during a short verification window (shadow queries compare counts).
- Rehearsal checklist: migrate → backfill → reconciliation report → duplicate scan → spot-join checks → archive → app smoke test → (rollback drill once).
