# User Data Audit — Sta. Magdalena Records Management System (CMS)

Audit date: **November 5, 2026**
Database: Turso `cms` (remote, `libsql://cms-sirjobel.aws-ap-northeast-1.turso.io`)
Scope: the `users` table and every table that references `users.id`.

> Supersedes the draft audit that was written before the cleanup ran. Every
> number below was produced by the Turso CLI **after** the removal, not from
> an estimate.

---

## 1. Result in one paragraph

Seven demo/test accounts were removed from `users`. Every row that pointed at
one of them through a `ON DELETE RESTRICT` foreign key was re-pointed at the
one remaining legitimate administrator (`user-admin`, Karing Magdalena); rows
that cascade or null out were left to the database. No student, attendance,
assessment, behavior, health, clinical, intervention, employee, 201-file or
service-credit row was deleted or altered. The foreign-key check is empty and
the integrity check reports `ok`.

---

## 2. Accounts that were removed

| User id | Name | E-mail | Role |
|---|---|---|---|
| `db80c0fc-71af-40db-9f45-c4bd76e955af` | Admin Sample | `admin@gmail.com` | `role-admin` |
| `user-school-admin` | SchoolAdmin | `school_admin@local.dev` | `role-school-admin` |
| `user-teacher` | Adviser | `teacher@local.dev` | `role-teacher` |
| `user-guidance` | Counselor | `guidance@local.dev` | `role-guidance` |
| `user-nurse` | Nurse | `nurse@local.dev` | `role-nurse` |
| `user-admin-officer` | AdminOfficer | `admin_officer@local.dev` | `role-admin-officer` |
| `user-qa-integration` | QA | `qa-integration@qa.local.dev` | `role-admin` |

All seven are confirmed absent from `users` (query in §6).

## 3. Accounts that were kept

| User id | Name | E-mail | Role | Why it stays |
|---|---|---|---|---|
| `user-admin` | Karing Magdalena | `admin@stamagdalena.gov.ph` | `role-admin` | The real school administrator — the only genuine login left in the system. |

## 4. How the referencing rows were handled

| Referencing column | FK rule | Treatment |
|---|---|---|
| `attendance_records.recorded_by` | RESTRICT | re-pointed at `user-admin` |
| `assessments.assessor_id` | RESTRICT | re-pointed at `user-admin` |
| `behavior_records.recorded_by` | RESTRICT | re-pointed at `user-admin` |
| `health_records.recorded_by` | RESTRICT | re-pointed at `user-admin` |
| `clinical_records.recorded_by` | RESTRICT | re-pointed at `user-admin` |
| `intervention_followups.recorded_by` | RESTRICT | re-pointed at `user-admin` |
| `employees.created_by` / `updated_by` | RESTRICT | re-pointed at `user-admin` |
| `employee_201_records.created_by` / `updated_by` | RESTRICT | re-pointed at `user-admin` |
| `service_credit_transactions.created_by` / `updated_by` | RESTRICT | re-pointed at `user-admin` |
| `interventions.assigned_to` | RESTRICT (nullable) | set to `NULL` — the assignment is no longer owned by a deleted account, and `notify()` can no longer fail on it |
| `sessions.user_id` | CASCADE | deleted with the account (expected) |
| `notifications.user_id` | CASCADE | deleted with the account (expected) |
| `audit_logs.user_id` | SET NULL | set to `NULL` — the audit entries themselves are preserved |
| `sections.adviser_id` | SET NULL | set to `NULL` |
| `employees.user_id` | SET NULL | set to `NULL` — no linked personnel account remains |
| `section_subject_teachers` | CASCADE | teaching-load rows removed with the account |

**Why the recorder columns were re-pointed instead of nulled:** these columns
are `NOT NULL`, so there was no choice — and keeping the original recorder
identity would have been a lie. Re-pointing them to the remaining
administrator keeps the audit trail intact and the database consistent.

## 5. Row-count evidence (after the cleanup)

| Table | Rows | Table | Rows |
|---|---|---|---|
| `students` | 25 | `sections` | 13 |
| `student_enrollments` | 25 | `attendance_records` | 336 |
| `assessments` | 60 | `behavior_records` | 12 |
| `health_records` | 18 | `clinical_records` | 4 |
| `interventions` | 4 | `intervention_followups` | 1 |
| `employees` | 11 | `employee_201_records` | 51 |
| `service_credit_transactions` | 36 | `record_verifications` | 21 |
| `qr_verifications` | 15 | `audit_logs` | 235 → 246 |

Every count is identical to the pre-cleanup baseline. The only movement is
`audit_logs`, which grew by the entries written by the removal itself and by
the QA passes performed afterwards — that is the audit trail doing its job.
`users` went from 9 to 2 (7 removed, 1 temporary QA account created for the
audit and deleted afterwards — see §7).

## 6. Verification queries

```sql
-- 1. The seven targets are gone (expected: 0 rows)
SELECT id, email FROM users
WHERE email IN (
  'admin@gmail.com', 'school_admin@local.dev', 'teacher@local.dev',
  'guidance@local.dev', 'nurse@local.dev', 'admin_officer@local.dev',
  'qa-integration@qa.local.dev'
);

-- 2. No broken foreign keys (expected: no rows)
PRAGMA foreign_key_check;

-- 3. The file itself is consistent (expected: ok)
PRAGMA integrity_check;

-- 4. No orphan recorder ids anywhere (expected: 0 for every table)
SELECT count(*) FROM attendance_records WHERE recorded_by NOT IN (SELECT id FROM users);
```

## 7. Temporary QA account

`qa-temp-audit-user` (`qa-temp-audit@qa.local.dev`) was created only to drive
the browser QA pass (the single legitimate administrator's credentials are not
in this repository and were not used). It is deleted at the end of the work,
together with its sessions, so the system is left with exactly one account:
`user-admin`.

## 8. Backup

`database-backups/user-cleanup-2026-11-05/cms-backup-2026-11-05.db`
(1.73 MB, Turso `db export`, plus the WAL sidecar). The directory is
git-ignored — the export never enters the repository. The export was opened
after the fact and confirmed to contain 8 user rows (the 7 targets plus
`user-admin`) and all 25 students, so the removal is reversible.

## 9. Known remaining issue — `users_backup_20261031`

The database still contains an in-database snapshot table `users_backup_20261031`
(14 rows) left behind by an earlier cleanup attempt. It still carries the
removed demo addresses **and their password hashes**, so it is both a
credential-retention risk and a contradiction of the removal.

It was deliberately **not** dropped as part of this task: the table also
contains a copy of `user-admin`, so dropping it is a wider deletion than the
one that was authorised. The recommended follow-up is:

```sql
DROP TABLE users_backup_20261031;
```

after confirming that the file export in §8 is the accepted recovery path.

## 10. Preventing the accounts from coming back

Both seed scripts now refuse to provision a retired demo address:

* `scripts/seed.mts` and `scripts/seed-remote-reference.mts` only create an
  account when **both** `DEFAULT_<ROLE>_EMAIL` and
  `DEFAULT_<ROLE>_PASSWORD_HASH` are configured — there is no shared fallback
  password and no `*@local.dev` fallback address any more.
* A deny-list (`RETIRED_DEMO_EMAILS`) covers the seven addresses above plus the
  whole `*@local.dev` domain, so a leftover environment variable cannot bring
  them back.
* The destructive dev seed refuses to run against a remote database unless
  `ALLOW_REMOTE_SEED=1` is set; `npm run seed:reference` is the safe tool for
  remote databases.
