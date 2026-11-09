# Demo Data Removal — 2026-11-08

> **Implementation record**, not a plan. The Turso `cms` database no longer
> contains a single seeded or QA row, and the scripts that used to create them
> can no longer recreate them.

Companion to `user-data-audit.md` / `user-data-cleanup.md` (the November 5
account cleanup).

Cleanup date: **November 8, 2026**
Database: Turso `cms` (remote, `libsql://cms-sirjobel.aws-ap-northeast-1.turso.io`)

---

## 1. Rules that were followed

1. **Turso only.** Every inspection and every write went through the Turso
   CLI (`turso db shell cms "<sql>"`). The local `local.db` was never used and
   never modified.
2. **Back up first.** A full `turso db export` was taken **before** the first
   destructive statement and was read back to confirm it contained the data.
3. **Targeted deletes only.** Every `DELETE` named the exact rows to remove.
   No blanket `DELETE FROM students`, no `LIKE '%test%'` sweep.
4. **The real administrator is never touched.** `user-admin` (Mariel Anonuevo)
   and the nine `@deped.gov.ph` accounts were excluded from every statement.
5. **No secret was read or written.** `.env` was never opened; no credential
   value appears in this document or in the repository.
6. **Reference data is preserved.** Roles, permissions, the role↔permission
   matrix, grade levels, the school year, the subject catalog, the three
   grading periods, behaviour categories, system settings, schools and
   municipalities all survive untouched.

---

## 2. Backup

```bash
turso db export cms \
  --output-file database-backups/cleanup-2026-11-08/cms-pre-cleanup-2026-11-08.sql \
  --overwrite
```

| Property | Value |
|---|---|
| Location | `database-backups/cleanup-2026-11-08/` — **git-ignored**, never committed |
| Size | 1.73 MB |
| Format | a full SQLite database file (the `turso db export` format), opened read-only with `sqlite3` |
| Read-back | confirmed before the cleanup: **28 students**, **16 users** |

The export was verified *before* the cleanup ran, so the operation was
reversible at the time it was performed.

---

## 3. What was removed

| Table | Rows removed | How they were identified |
|---|---|---|
| `students` | 25 | seed pattern `SM-2026-%` (fictional name pool, no LRN) |
| `students` | 3 | QA ids `qa-student-%` |
| `guardians` | 31 | orphaned — no remaining `student_guardians` row referenced them |
| `sections` | 12 | seeded ids `sec-7-*` … `sec-10-*` |
| `sections` | 3 | QA sections |
| `employees` | 10 | seeded numbers `EMP-2026-000001` … `EMP-2026-000010` |
| `employees` | 1 | `qa-employee-dual` |
| `users` | 6 | QA ids `qa-user-%` |
| `student_enrollments`, `student_grades`, `attendance_records`, `assessments`, `behavior_records`, `health_records`, `clinical_records`, `interventions`, `record_verifications`, `qr_verifications`, `employee_201_records`, `service_credit_transactions` | all | cascaded with their parent rows (verified as orphans first) |

### 3.1 Legacy backup tables dropped

These tables held a copy of demo data from earlier experiments and were
dropped after the export was verified (exact names, confirmed against the
pre-cleanup export):

```
students_backup_20261014
student_enrollments_backup_20261014
interventions_backup_20261010
qr_verifications_backup_20261010
children_backup_20261010
users_backup_20261031
```

`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%backup%'`
now returns **no rows**.

---

## 4. What was kept

| Data | Rows after the cleanup |
|---|---|
| `students` | 0 |
| `students` (real) | 0 — the school has not enrolled any student yet |
| `sections` | 1 — `sec-12-hestia` ("HESTIA - CSS"), inactive, a real section |
| `employees` | 1 — `EMP-2026-000011` (Alu Gotis), archived, a real personnel record |
| `users` | 10 — all real: `user-admin` (Mariel Anonuevo) + 9 `@deped.gov.ph` accounts |
| `user_roles` | 10 |
| `roles` | 12 (10 school roles + 2 legacy rows) |
| `permissions` / `role_permissions` | 43 permissions / 157 grants after the sync (see §6) |
| `grading_periods` | 3 — TERM 1, TERM 2, TERM 3 |
| `subjects` | 8 |
| `grade_levels` | 5 — Grade 7 … Grade 10, Grade 12 |
| `school_years` | 1 — 2026-2027 (current) |
| `system_settings` | 7 (including `assessment_levels`) |
| `notifications` / `sessions` | 9 / 5 — all belonging to real users |
| `audit_logs` | retained in full |
| `schools` / `municipalities` | 13 / 1 |
| `section_subject_teachers` | 0 — no teaching load is assigned yet |

---

## 5. Verification

| Check | Command | Result |
|---|---|---|
| No broken foreign keys | `PRAGMA foreign_key_check` | no rows |
| File consistency | `PRAGMA integrity_check` | `ok` |
| Orphan scan | `count(*)` per referencing table | 0 everywhere |
| Demo rows gone | `count(*)` per table (see §4) | matches the table above |
| Grading periods | `SELECT name FROM grading_periods` | TERM 1, TERM 2, TERM 3 — 0 rows containing "Quarter" |
| Grade-encoding matrix | `roles × grades.*` | `grades.encode` on admin, school_admin, records, subject_teacher — **never** on registrar |
| Reference seed re-run | `npm run seed:reference` | 0 new students, 0 new sections, 0 new users, 0 changed accounts |

### 5.1 Final audit (2026-11-09)

| Check | Result |
|---|---|
| `users` without a `user_roles` row | 0 |
| `user_roles` pointing at a missing user | 0 |
| `user_roles` pointing at an unknown role | 0 |
| Retired demo e-mail addresses among the accounts | 1 — `admin@gmail.com`, which is the **live** `user-admin` account (Mariel Anonuevo); the deny-list only prevents a *seed* from provisioning it, it never touches an existing account |
| QA accounts (`qa-%`) | 0 |
| Demo students (`SM-2026-%`) | 0 |
| Demo sections (`sec-7-%` … `sec-10-%`) | 0 |
| Retired demo employee numbers (`EMP-2026-000001` … `000010`) | 0 — the surviving `EMP-2026-000011` (Alu Gotis, archived) is a real personnel record |
| Grading periods containing "Quarter"/"Q<n>" | 0 |
| Forecast rows with the old `·Q` label | 0 |
| `*_backup_*` tables | 0 |

---

## 6. The permission matrix was re-synced

The reference seed rewrote the `role_permissions` rows for the ten school
roles from the code map in `src/lib/permissions.ts`. This added the new
`grades.encode` permission (which the database did not know about yet) and
re-aligned every role with the code:

```
role-admin           grades.encode
role-school-admin    grades.encode
role-records         grades.encode
role-subject-teacher grades.encode
role-registrar       (nothing — no grades.encode, no grades.write)
role-teacher         (nothing — no grades.encode, no grades.write)
```

No account was modified by that run: the seed is **create-only** for accounts
and never resets a password, a role or a name.

---

## 7. The seed scripts were rewritten

The old `scripts/seed.mts` generated ~48 fictional students with guardians,
enrolments, grades, attendance, assessments, health, behaviour and intervention
records, a fictional plantilla of ten employees, twelve demo sections and the
demo teaching assignments — and it wiped the previous run before doing so.
`scripts/seed-remote-reference.mts` created the twelve demo sections and the
demo teaching assignments.

Both scripts were rewritten to create **reference data only**:

| File | What it does now |
|---|---|
| `scripts/lib/reference-seed.ts` | the shared implementation: roles, permissions, role matrix, school year, grade levels, subjects, the three grading periods, behaviour categories, system settings, and **create-only** accounts from the `DEFAULT_*` environment variables |
| `scripts/seed.mts` | the development entry point (remote databases still require `ALLOW_REMOTE_SEED=1`) |
| `scripts/seed-remote-reference.mts` | the remote entry point — the same reference data, no demo data |
| `src/lib/retired-demo.ts` | the deny-list of retired identifiers (e-mail addresses, employee numbers, section ids, account ids) and the guard that refuses them |
| `scripts/lib/remote-guard.mts` | requires an explicit opt-in before a QA script may write fixture rows to a remote database |

### 7.1 Safety properties of the new seeds

1. **Nothing is ever deleted.** The seed can only add reference rows.
2. **An existing account is never modified** — no password reset, no role
   overwrite, no name overwrite. An account whose e-mail already exists is
   skipped; an account whose deterministic id is already taken is skipped with
   a warning (this is what protects `user-admin`).
3. **No credential is ever invented** — an account is created only when BOTH
   `DEFAULT_<ROLE>_EMAIL` and `DEFAULT_<ROLE>_PASSWORD_HASH` are configured.
4. **School-adjusted settings are preserved** — `system_settings` rows are
   insert-only, so the Literacy Coordinator's `assessment_levels` are never
   overwritten by a seed run.
5. **Retired identifiers are refused** — `assertNotRetiredDemoIdentifier()`
   throws before any insert that would recreate the removed demo rows.
6. **QA scripts need an explicit opt-in** — `ALLOW_QA_FIXTURES=1`
   (`ALLOW_QA_USER=1` for the throwaway admin) before they may write to a
   remote database.

### 7.2 Why the deny-list is narrow on purpose

Only identifiers the **application never generates** are on the list:
the seeded section ids (`sec-7-*` … `sec-10-*`), the seeded employee numbers
(`EMP-2026-000001` … `000010`), the seeded account ids and the retired
e-mail addresses.

Student numbers are deliberately **not** blocked: the application itself
generates `SM-<year>-######` from `nextStudentNumber()`, so a blanket ban
would have stopped the school from enrolling its first real student. The
protection for students is structural — no seed script creates students at all.

---

## 8. Rollback

The database was not modified in a way that cannot be undone:

* **Exact restore** — replace the remote database with
  `database-backups/cleanup-2026-11-08/cms-pre-cleanup-2026-11-08.sql`
  (Turso import / console upload). This rolls back everything after the
  export, including the grading-period rename and the permission-matrix sync.
* **Partial restore** — the removed rows can be re-inserted from the export.
  The correct operational answer for real data is to re-enter it through the
  application, not to restore a demo row.

---

## 9. Aftercare

* Sections, students, employees and teacher assignments are now created
  **through the application** (Sections → New Section, Students → New Student,
  Employees → New Employee, Teacher Assignments).
* `npm run seed` / `npm run seed:reference` are safe to run at any time: they
  are idempotent, additive and create no operational data.
* The `user_roles` table is the single place where the additional roles of an
  account are recorded — assign the second role from **User Management**
  (Users → edit → roles) or from **Teacher Assignments**.
