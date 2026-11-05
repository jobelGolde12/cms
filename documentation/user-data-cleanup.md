# User Data Cleanup — Procedure and Rollback

Companion to `user-data-audit.md` (which records the *result*). This file
records *how* the removal was performed and how to undo it.

Cleanup date: **November 5, 2026**
Database: Turso `cms` (remote).

---

## 1. Rules that were followed

1. **Inspect first.** Every table that references `users.id` was read
   (`PRAGMA foreign_key_list`) and every column classified as CASCADE,
   SET NULL, RESTRICT or plain, before a single row was touched.
2. **Back up first.** A full `turso db export` was taken and verified before
   the first delete.
3. **Delete only the seven named accounts.** No account was removed by
   pattern, role, or "looks like a demo account".
4. **Never read, print, or modify secrets.** No `.env` file was opened; no
   password hash, token or key appears in this repository.
5. **Preserve the domain data.** Student, academic, health, employee and
   ledger rows were re-pointed or left to the database — never deleted.

## 2. Backup

```bash
turso db export cms \
  --output-file database-backups/user-cleanup-2026-11-05/cms-backup-2026-11-05.db \
  --overwrite
```

* Size: 1.73 MB (plus the `-wal` sidecar).
* Location: `database-backups/` — git-ignored, never committed.
* Verification: the export was reopened and contains 8 user rows (the 7
  targets + `user-admin`) and all 25 students.

## 3. Foreign-key classification

See the table in `user-data-audit.md` §4 for the full list. The rule applied
was:

* **CASCADE** — delete with the account (sessions, notifications).
* **SET NULL** — let the database do it (audit trail, sections, employee link).
* **RESTRICT and NOT NULL** — re-point at `user-admin` before deleting
  (attendance, assessments, behavior, health, clinical, intervention
  follow-ups, employees, 201-files, service credits).
* **RESTRICT and nullable** — set to `NULL` (`interventions.assigned_to`).

## 4. Execution

The removal itself was performed with the Turso CLI inside a single
transaction so that a failure could not leave a half-migrated database:

```sql
BEGIN;
-- re-point the RESTRICT recorder columns
UPDATE attendance_records SET recorded_by = 'user-admin' WHERE recorded_by IN (<7 ids>);
UPDATE assessments         SET assessor_id  = 'user-admin' WHERE assessor_id  IN (<7 ids>);
UPDATE behavior_records    SET recorded_by  = 'user-admin' WHERE recorded_by  IN (<7 ids>);
UPDATE health_records      SET recorded_by  = 'user-admin' WHERE recorded_by  IN (<7 ids>);
UPDATE clinical_records    SET recorded_by  = 'user-admin' WHERE recorded_by  IN (<7 ids>);
UPDATE intervention_followups SET recorded_by = 'user-admin' WHERE recorded_by IN (<7 ids>);
UPDATE employees           SET created_by = 'user-admin', updated_by = 'user-admin' WHERE created_by IN (<7 ids>) OR updated_by IN (<7 ids>);
UPDATE employee_201_records SET created_by = 'user-admin', updated_by = 'user-admin' WHERE created_by IN (<7 ids>) OR updated_by IN (<7 ids>);
UPDATE service_credit_transactions SET created_by = 'user-admin', updated_by = 'user-admin' WHERE created_by IN (<7 ids>) OR updated_by IN (<7 ids>);
UPDATE interventions SET assigned_to = NULL WHERE assigned_to IN (<7 ids>);

-- remove the accounts
DELETE FROM users WHERE id IN (<7 ids>);
COMMIT;
```

## 5. Verification

| Check | Command | Result |
|---|---|---|
| Targets gone | `SELECT … FROM users WHERE email IN (…)` | 0 rows |
| No broken FKs | `PRAGMA foreign_key_check` | no rows |
| File consistency | `PRAGMA integrity_check` | `ok` |
| Orphan scan | `count(*)` per referencing table where the user id is not in `users` | 0 everywhere |
| Row counts | `count(*)` on all 17 domain tables | identical to the baseline |

## 6. Rollback

The database was not modified in a way that cannot be undone.

**Option A — restore the whole database (exact).** Stop the application, then:

```bash
turso db shell cms "SELECT 1"   # sanity: the target is reachable
cp database-backups/user-cleanup-2026-11-05/cms-backup-2026-11-05.db ./restore.db
```

The export is a full SQLite file; restoring it means replacing the remote
database with it (Turso import / console upload). This rolls back *everything*
that happened after 08:22 on 2026-11-05, including the QA writes.

**Option B — re-create only the accounts.** The seven rows can be inserted
again from the export, and the recorder columns re-pointed back:

```sql
-- inspect the original rows first (from the exported file)
SELECT id, email, role_id, first_name, last_name, is_active FROM users WHERE id IN (<7 ids>);
```

Re-inserting a password hash from the export restores the *old* credentials.
The correct operational answer for a real incident is to re-provision the
accounts from User Management with fresh passwords instead.

## 7. Tooling

`scripts/delete-dummy-users.ts` is the reusable, audited version of the
procedure above. It differs from the one-off commands in four ways:

* the target set comes from the command line (`--emails`), never from a list
  hard-coded in the repository;
* it refuses to run if every active administrator is in the target set;
* it re-points the RESTRICT columns at a surviving administrator
  (`--reassign-to`) instead of leaving dangling references;
* it runs in dry-run mode unless `--execute` is passed, and can be told to
  require an existing backup (`--backup`).

```bash
# preview
npx tsx scripts/delete-dummy-users.ts --emails a@x.dev,b@x.dev --dry-run

# apply, with a verified backup and an explicit reassignment target
npx tsx scripts/delete-dummy-users.ts \
  --emails a@x.dev,b@x.dev \
  --reassign-to user-admin \
  --backup database-backups/user-cleanup-2026-11-05/cms-backup-2026-11-05.db \
  --execute
```

## 8. Aftercare

* The seven addresses are on a deny-list in both seed scripts — they cannot
  be re-created by a seed run.
* The seed scripts no longer invent a password or a `*@local.dev` address.
* The destructive dev seed refuses to run against a remote database.
* User Management (`/users`) can now create, edit, disable and re-enable
  accounts, so real personnel logins no longer depend on a seed run.
