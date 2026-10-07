# Database Migration Plan (Turso + Drizzle)

> STATUS: **PLAN**. Applies via `npm run db:generate` → review → `npm run db:migrate`
> (`drizzle/` is append-only; applied migrations are never edited).

## Strategy: Append → Backfill → Cutover → Archive

1. **Append** all new tables (Phase 4 list in `documentation/migration/master-migration-plan.md`) in dependency order:
   `school_years` → `grade_levels` → `sections` → `guardians` → `students`
   → `student_guardians` → `student_enrollments` → `subjects` →
   `grading_periods` → `student_grades` → `attendance_records` →
   `behavior_categories` → `behavior_records` → `assessments`
   → `record_verifications` → role/permission re-seed.
2. **Backfill** transform script (`scripts/migrate-children-to-students.mts`, new):
   - `children` → `students` (id preserved; `child_code` → `student_number` with prefix mapping; names/birth/sex/status copied; `barangay_id` dropped).
   - `child_education` (is_current rows) → `student_enrollments`: parse `school_year` text → ensure `school_years` row; map grade level text → `grade_levels` (unknown → closest level, logged); section defaulted per school decision (logged as `transferred`-neutral placeholder or "Unassigned" section).
   - `child_validations` → `record_verifications` (status mapping direct).
   - `child_duplicate_candidates` → `duplicate_candidates` (ids preserved).
   - `interventions`, `intervention_followups`, `qr_verifications`: `child_id` → `student_id` (1:1 id preservation makes this a column update post-copy).
   - ECCD / disability / monitoring rows: **exported to archive files** (JSON/CSV under `backups/` naming convention) — not migrated; the school decides if any value is worth manual entry.
   - The script is **idempotent** (keyed by preserved ids) and prints a reconciliation report (counts before/after per table).
3. **Cutover:** code switches to the new tables (Phases 6–18). During transition both schemas coexist — old tables untouched.
4. **Archive (only after verified cutover):** rename old tables to `_archived_children`, `_archived_barangays`, etc. (or `CREATE TABLE _archive_x AS SELECT *` + drop, decision recorded). Never drop before archive copy exists.

## Constraints & Safety

- **Transactions** per table batch; failure rolls the batch back and reports progress.
- **Foreign keys:** `PRAGMA foreign_keys` honored by libSQL; `onDelete` declared per relationship (see `relationships.md`).
- **Validation after backfill:** row-count reconciliation + spot checks (10 random students fully joined) + duplicate detection run to catch mapping errors.
- **Seed:** `scripts/seed.mts` rewritten for school demo data (fictional; header comment states it; idempotent upserts as today).
- **Rollback:** `documentation/migration/rollback-plan.md` — archive tables remain restorable; migrations can be reverted by restoring `local.db`/Turso point-in-time backup taken **before** step 1.

## Data-Destruction Rules (TODO §49)

For every obsolete table the implementer must record: contains data? referenced
by code? migrated? archived? Only after all five answers may the archive step
rename it. Decisions logged in this file's appendix below.

## Appendix: Obsolete-Table Decision Log (to fill during implementation)

| Table | Has data? | Referenced? | Migrated? | Archived? | Removed? |
|---|---|---|---|---|---|
| municipalities | ☐ | ☐ | n/a | ☐ | ☐ |
| barangays | ☐ | ☐ | n/a | ☐ | ☐ |
| schools | ☐ | ☐ | n/a | ☐ | ☐ |
| children | ☐ | ☐ | ☐ | ☐ | ☐ |
| child_addresses | ☐ | ☐ | partial | ☐ | ☐ |
| child_education | ☐ | ☐ | ☐ | ☐ | ☐ |
| child_eccd | ☐ | ☐ | export only | ☐ | ☐ |
| child_disabilities | ☐ | ☐ | export only | ☐ | ☐ |
| child_validations | ☐ | ☐ | ☐ | ☐ | ☐ |
| child_duplicate_candidates | ☐ | ☐ | ☐ | ☐ | ☐ |
| child_monitoring | ☐ | ☐ | export only | ☐ | ☐ |
