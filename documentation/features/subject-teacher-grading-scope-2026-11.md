# Subject Teacher Grade Scope + Production Schema Repair — 2026-11-03

> **Implementation record**, not a plan. Everything below is implemented,
> type-checked (`tsc --noEmit`), linted, built (`next build`), covered by the
> unit-test suite and verified against the live Turso database.

---

## 1. The production incident

Adding an employee failed in production:

```
[createEmployee] insert failed Error: Failed query: insert into "employees" (..., "assigned_section_id", ...)
  [cause]: Error [LibsqlError]: SQLITE_UNKNOWN: SQLite error:
           table employees has no column named assigned_section_id
```

Root cause: `employees.assigned_section_id` was added to `src/db/schema.ts`
(RBAC revision 2026-11) **without a matching migration**, and the deployed
code was writing the column while the production table did not have it.

Two more defects hid the real error:

- the insert retry loop treated *every* failure as an employee-number
  collision, so a missing column surfaced as a generic "Could not create the
  record. Please try again.";
- migration `0008_nurse_height_for_age.sql` existed in `drizzle/` but was
  **not registered in `drizzle/meta/_journal.json`** and had no snapshot, so
  `drizzle-kit migrate` never applied it and the chain was broken.

## 2. Migration chain repaired

| Migration | Change | Production state |
|---|---|---|
| `0008_chief_xavin.sql` | `health_records.height_for_age` + index | DDL already applied out-of-band → recorded in `__drizzle_migrations` |
| `0009_lazy_hawkeye.sql` | `employees.assigned_section_id` + `employees_assigned_section_idx` | applied |
| `0010_nostalgic_nocturne.sql` | QR index set repair (see §4) | applied |
| `0011_sad_mattie_franklin.sql` | `employees.user_id` + `employees_user_uq` | applied |

Every new migration file is the drizzle-kit output with the `ON DELETE`
action restored — drizzle-kit drops it on `ALTER TABLE … ADD COLUMN`, while
the Drizzle schema declares `onDelete: "set null"` (SQLite accepts the
action on a nullable column).

The ledger rows were written with the same hash drizzle-kit uses
(`sha256` of the migration file) and the journal's `folderMillis`, so
`drizzle-kit migrate` treats the chain as applied and stays a no-op.

## 3. Drift guard

`scripts/check-remote-drift.mts` (npm script `db:drift`) compares
`src/db/schema.ts` with the live Turso database — columns, named indexes and
primary keys — using the `turso` CLI (it carries its own auth; no secret is
read from `.env`). It found and now guards against exactly the failure that
caused this incident.

```bash
npm run db:drift -- cms
# OK: no schema drift found — remote matches src/db/schema.ts
```

## 4. QR-verification index defect (found by the drift guard)

`qr_verifications` is an append-only **event log**: one token legitimately
appears in many rows (`generate` → `scan` → `scan` → `revoke` — see
`src/lib/qr.ts`). The schema nevertheless declared
`UNIQUE (verification_token)`, which made every public QR scan fail with
`UNIQUE constraint failed: qr_verifications.verification_token`. The unique
index was replaced by a plain lookup index
(`qr_verifications_token_idx`), and the indexes that the out-of-band remote
table rebuild had dropped were recreated.

## 5. Grade-encoding scope for an added Subject Teacher

Grade encoding is row-level: only the account holding the `subject_teacher`
role may write grades, and only for the (section, subject) pairs listed in
`section_subject_teachers`. Until now those pairs could only be seeded — the
admin UI was a documented follow-up.

- **Link** — `employees.user_id` (FK → `users.id`, unique, `ON DELETE SET
  NULL`) ties the personnel record to the login account that carries the
  teaching loads. The link is accepted **only** for the `subject_teacher`
  position (same rule shape as the adviser's `assignedSectionId`).
- **Scope** — the Employee form (create + edit) shows, for subject teachers,
  a *Login account* select and a *Grade Encoding Scope* panel: pick a
  section + subject, add the load, remove it again. The submitted pairs are
  sent as `teachingLoad` fields (`sectionId|subjectId`).
- **Server authority** — `validateSubjectTeacherScope()` re-checks
  everything the client could forge: the account must exist, be active, hold
  the `subject_teacher` role, and must not already back another personnel
  record; every (section, subject) pair must reference an existing, active
  section and subject.
- **Synchronisation** — `applyTeachingLoads()` adds the new loads, removes
  the dropped ones, and MOVES a pair that another teacher owns (the school
  reassigned the subject) instead of failing on the unique index.
- **Archiving** — archiving an employee drops the teaching loads of the
  linked account, so an archived record can no longer encode grades.
- **Audit** — `CREATE_EMPLOYEE` / `UPDATE_EMPLOYEE` / `ARCHIVE_EMPLOYEE`
  record the linked account and the teaching-load changes.

The Employee profile page now shows the *Grade Encoding Scope* card (linked
account + the (section, subject) loads).

## 6. Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ exit 0 |
| `npx vitest run` | ✅ 213 passed (20 files, 7 new for the teaching-load helpers) |
| `npx eslint` (changed files) | ✅ 0 problems |
| `npm run build` | ✅ exit 0 (all routes compiled) |
| `npm run db:drift -- cms` | ✅ no drift |
| Production round-trip (remote Turso) | ✅ employee insert with `user_id` + `assigned_section_id` succeeds; teaching load added and removed; row counts restored (employees 10 → 10, loads 24 → 24) |
| `vercel --prod` | ✅ READY — `https://cms-lilac-rho-30.vercel.app` |
| `vercel logs` (post-deploy) | ✅ no errors |
