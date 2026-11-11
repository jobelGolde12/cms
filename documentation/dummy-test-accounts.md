# Dummy / Test Login Accounts

> **TEST / DUMMY ACCOUNTS — NOT REAL PERSONNEL**
>
> These accounts exist **only** so every system role's authentication, role
> resolution, permission resolution and module visibility can be exercised
> against the live database. They are **not people**, hold **no school data**,
> and are **completely invisible** throughout the application.

---

## 1. Purpose

The system ships ten roles. Verifying each one end-to-end (login → role →
permissions → allowed/denied modules) previously required hand-provisioning
accounts. This feature provides **exactly one hidden dummy login account per
current role**, created safely, idempotently and removably, without touching
any real record.

The goal is **login-test accounts only** — *not* demo application data.

---

## 2. What is (and is not) created

Created (the strict minimum for authentication + role assignment):

- one row in `users` per role, marked `is_dummy = 1`;
- one row in `user_roles` linking each account to its primary role;
- nothing else.

**Never** created:

- students, guardians, enrolments, grades, attendance, behaviour, health,
  clinical, assessment, intervention, report, document or QR rows;
- employee / personnel records, 201 files or service credits;
- sections, subjects or teaching assignments.

The `subject_teacher` and `teacher` dummy accounts are deliberately left
**unassigned** (no teaching load, no advisory). They prove that the row-level
scope correctly returns **no students** until a real assignment exists, and
that grade writing stays denied without a real `(section, subject)` load.

---

## 3. The database marker (authoritative)

A column was added to `users`:

```sql
ALTER TABLE users ADD COLUMN is_dummy integer NOT NULL DEFAULT false;
CREATE INDEX users_dummy_idx ON users (is_dummy);
```

- `is_dummy = 0` → a **real** account (every existing account).
- `is_dummy = 1` → a **dummy/test** account (only these ten rows).

The marker is the **single source of truth**. The application never decides
visibility from the e-mail address — it filters on `is_dummy`. Helpers live in
[`src/lib/dummy-accounts.ts`](../src/lib/dummy-accounts.ts)
(`realUsersOnly()`, `isDummyAccountEmail()`, `DUMMY_ACCOUNTS`).

The reserved domain is `@smnhs.test`. The normal **Create User** form rejects
that domain so a real account can never collide with a dummy one.

Migration: `drizzle/0014_sturdy_ravenous.sql`.

---

## 4. The ten accounts

| # | Role | E-mail | Password | Expected scope |
|---|------|--------|----------|----------------|
| 1 | `admin` | `dummy.admin@smnhs.test` | `admin123` | Full system access. Sees **no** dummy account anywhere. |
| 2 | `school_admin` | `dummy.schooladmin@smnhs.test` | `schooladmin123` | School-wide records, academics, analytics, reports. No health, no user management. |
| 3 | `subject_teacher` | `dummy.subjectteacher@smnhs.test` | `subject123` | Grade-encoding module visible; **no** teaching load ⇒ every grade write denied. |
| 4 | `teacher` | `dummy.teacher@smnhs.test` | `teacher123` | Adviser role, **no** section ⇒ row scope returns no students; no grade-writing permission. |
| 5 | `records` | `dummy.records@smnhs.test` | `records123` | Student records, enrolment, verification, duplicate review. |
| 6 | `guidance` | `dummy.guidance@smnhs.test` | `guidance123` | Guidance Office domain only. No grades/attendance/assessments/reports/documents. |
| 7 | `nurse` | `dummy.nurse@smnhs.test` | `nurse123` | Health & nutrition only. **No** Reports access. |
| 8 | `registrar` | `dummy.registrar@smnhs.test` | `registrar123` | Read-only records + document printing. **No** grade encoding. |
| 9 | `literacy_coordinator` | `dummy.literacy@smnhs.test` | `literacy123` | Reading / literacy / numeracy assessment domain only. |
| 10 | `admin_officer` | `dummy.adminofficer@smnhs.test` | `officer123` | Employee records only. **No** student data access. |

> Passwords are stored **only** as bcrypt hashes (`$2b$…`) — the plaintext
> above is for login/testing documentation. No real user's password appears
> here.

Deterministic account ids: `dummy-user-<role>` (e.g. `dummy-user-admin`).
Seeded role ids: `role-<role>` (e.g. `role-school-admin`). Each account holds
**exactly one** role (no accidental multi-role assignment).

---

## 5. Visibility guarantee (loginable but invisible)

One intentional exception exists in the authentication path: the login lookup
**can** find a dummy account by e-mail and verify its password, so the account
can obtain a session and load its roles.

Every **application-facing** surface excludes `is_dummy = 1`:

| Surface | Where the filter lives |
|---|---|
| User Management (`/users`) list + count | `listUsersWithRoles` (`src/lib/queries.ts`) |
| Audit trail list + count, Dashboard activity | `auditLogWhere`, `dashboard-data.ts` (actor resolved through `users.is_dummy`) |
| Teacher assignment picker (`/assignments`) | `assignmentTeacherOptions` (`src/lib/assignments.ts`) |
| Employee → account picker (`/employees`) | `subjectTeacherAccountOptions` (`src/lib/teaching-loads.ts`) |
| Section adviser picker (`/sections`) | page query (`src/app/(app)/sections/page.tsx`) |
| "Principal" signature on official documents | `getPrincipalName` (`src/lib/report-card.ts`) |
| Verification notifications | `notifyVerifiers` (`src/actions/helpers.ts`) |
| "Last active administrator" guard | `countOtherActiveAdmins` (`src/lib/auth.ts`) |

Server-side actions also reject dummy accounts defensively (treated as
"not found"): `loadTeacher`, `validateSubjectTeacherScope`,
`validateSectionRefs`, and the user-management `update`/`deactivate` actions.
UI hiding is never the sole mechanism — the database layer enforces it.

No "show dummy users" switch or hidden query parameter exists.

---

## 6. Create / verify / remove

### Create (idempotent)

```bash
npm run seed:dummy
```

- Skips accounts that already exist (prints `Dummy account already exists: … — Skipping.`).
- **Fails safely** on a real-account e-mail collision:
  `CONFLICT: dummy.admin@… already belongs to an existing REAL account. No changes were made.`
- Never overwrites, never converts a real account, never touches real data.

Preview without writing:

```bash
npm run seed:dummy -- --dry-run
```

### Verify with the Turso CLI

```bash
# 10 dummy accounts, one role each, bcrypt hashes, marker set
turso db shell cms "SELECT id, role_id, email, is_dummy FROM users WHERE is_dummy = 1 ORDER BY role_id;"

# exactly one role row per dummy account
turso db shell cms "SELECT ur.user_id, ur.role_id FROM user_roles ur JOIN users u ON u.id = ur.user_id WHERE u.is_dummy = 1 ORDER BY ur.user_id;"

# real accounts are untouched
turso db shell cms "SELECT id, email, is_dummy FROM users WHERE is_dummy = 0 ORDER BY id;"

# counts: 10 dummy, 10 dummy role rows
turso db shell cms "SELECT (SELECT count(*) FROM users WHERE is_dummy=1) dummy, (SELECT count(*) FROM user_roles ur JOIN users u ON u.id=ur.user_id WHERE u.is_dummy=1) dummy_roles;"

# no plaintext / non-bcrypt hashes
turso db shell cms "SELECT count(*) FROM users WHERE is_dummy=1 AND password_hash NOT LIKE '\$2%';"
```

### Remove (safe reset)

```bash
npm run seed:dummy -- --remove
```

- Deletes **only** rows that are both marked `is_dummy = 1` **and** match a
  known dummy `(id, e-mail)` pair — unknown dummy-marked rows are reported and
  left untouched.
- Removes the dummy accounts' own audit/notification noise first, so no
  actor-less "system" entries leak into the audit UI.
- Never deletes real accounts, students, employees or real audit history.
- Never uses a broad `DELETE FROM users`.

---

## 7. Safety properties

- Authentic superuser accounts are unaffected; the retired-demo deny-list
  (`RETIRED_DEMO_EMAILS`, `assertNotRetiredDemoIdentifier`) is untouched and
  still enforced.
- `.env` / `.env.example` are not modified.
- The normal reference seed (`npm run seed` / `seed:reference`) does **not**
  create or resurrect dummy accounts — provisioning is a separate explicit
  command.
- No dummy student, section, employee or teaching assignment is ever created;
  real counts (students, sections, employees, assignments) are unchanged.
