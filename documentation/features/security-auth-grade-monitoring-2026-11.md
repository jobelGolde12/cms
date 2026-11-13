# Authentication, Security, and Grade-Submission Monitoring (2026-11)

This document covers the implementation plan, architecture, database changes,
security model, and deployment/verification notes for:

1. Self-registration with administrator approval
2. Multi-factor authentication (TOTP + recovery codes)
3. Password reset / recovery
4. Encryption at rest for sensitive records
5. Teacher grade-submission deadline monitoring

The existing stack was extended rather than replaced: Drizzle + Turso,
DB-backed sessions with an httpOnly cookie, bcrypt password hashes, the
role/permission map in `src/lib/permissions.ts`, and the existing
`grade_submissions` ledger.

---

## 1. Existing architecture (inspected before changes)

| Area | Implementation |
| --- | --- |
| Auth | `src/lib/auth.ts` — bcrypt hashes, SHA-256 session-token hashes, `sessions` table, httpOnly `sms_session` cookie |
| Route gate | `src/proxy.ts` (Next 16 proxy/middleware) checks cookie + DB session |
| RBAC | `src/lib/permissions.ts` + `user_roles` union; page/action guards in `requirePermission` / `getAuthorizedUser` |
| Accounts | `users` table + `roles`; self-registration did not exist |
| Grades | `student_grades` drafts + append-only `grade_submissions` ledger; `grading_periods` had dates but no deadline |
| Health | `health_records`, `clinical_records` (Nurse domain) |
| Guidance | `behavior_records` (confidential flag) |
| 201 files | `employees`, `employee_201_records` (Admin Officer domain) |
| DB | Turso; schema mirrored in `src/db/schema.ts` and `drizzle/*.sql` |

Deployed Turso (`cms`) at inspection: 20 users, 0 students, 0 health/clinical/
behavior rows, 1 employee, 0 201 rows, 0 grade submissions, 3 grading periods.
The migration is additive only; no table is rebuilt and no data is dropped.

---

## 2. Database changes (migration `0015_melted_dragon_lord.sql`)

### `users` (new columns)

| Column | Purpose |
| --- | --- |
| `status` | `pending`, `approved`, `rejected`, `suspended`, `disabled`. Defaults to `approved` so existing accounts keep working. |
| `requested_position` | Informational position requested at registration. Never grants access. |
| `registration_note` | Applicant note; also carries the internal rejection reason. |
| `reviewed_by` / `reviewed_at` | Administrator + timestamp of approval/rejection. |
| `mfa_enabled` | TOTP switched on only after a verified code. |
| `mfa_secret` | Encrypted TOTP secret (never exposed after enrollment). |
| `mfa_enrolled_at` | Enrollment timestamp. |

### New tables

- `password_reset_tokens` — `token_hash` (unique), `expires_at`, `used_at`.
- `mfa_recovery_codes` — `code_hash`, `used_at`; unique per (user, hash).
- `mfa_challenges` — `token_hash` (unique), `expires_at`, `attempts`.

### `grading_periods`

- `submission_deadline` (ISO date, nullable).

### Seed

- `roles` row `role-pending`: inert placeholder for pending registrations.
  It is deliberately absent from `roleNameFromId`, so it resolves to no
  application role and therefore no permissions.

Indexes and foreign keys are declared in the schema and generated migration.

---

## 3. Self-registration and approval

### Flow

```
/register (public)
  → validate (name, email, phone, requested position, password + confirmation)
  → INSERT users with status='pending', role_id='role-pending'
  → notify administrators
  → generic success state

/users → Pending registrations (users.manage only)
  → Approve: choose role → status='approved', isActive=true, reviewed_by/at
  → Reject: status='rejected', isActive=false, internal reason stored
```

- The registration schema accepts **no role field**. Zod strips unknown keys;
  the insert hard-codes the inert placeholder role.
- Only `status='approved'` **and** `isActive=true` can sign in — enforced in
  `getCurrentUser()` (used by the app layout, every page and every action) and
  again in the login action.
- Approval/rejection/suspend actions all require `users.manage` server-side and
  re-validate the role against `ROLE_IDS`.
- `deactivateUser` now sets `status='disabled'` and revokes every session.
- Re-enabling a suspended/disabled account through the user edit dialog
  restores `status='approved'`; pending/rejected accounts must go through the
  approval queue.

### Password policy (new passwords)

At least 10 characters, containing a letter and a number
(`newPasswordSchema`). Applied to registration, password reset and the
change-password form. Passwords are hashed with bcrypt (existing library,
cost 10); plaintext is never stored, logged, or returned.

---

## 4. MFA

- Mechanism: TOTP (RFC 6238, SHA-1, 6 digits, 30 s), the standard
  authenticator-app profile. Implemented on Node `crypto` HMAC + RFC 4648
  base32; no custom cipher.
- Enrollment (`/settings/mfa`):
  1. `beginMfaSetup` generates a 160-bit secret, stores it encrypted with
     `mfa_enabled=false`, and returns the `otpauth://` URI plus a server-rendered
     QR data URL (`qrcode`).
  2. `confirmMfaSetup` verifies a code (±1 step drift) before enabling MFA.
  3. Ten recovery codes are generated, returned once, and stored as SHA-256
     hashes. Regeneration requires the password + a current code and deletes the
     old codes.
  4. Disabling requires the password + a current code.
- Login:
  ```
  email + password → rate limit → verify bcrypt
    → status/active check
    → MFA enabled ? create short-lived challenge : create session
  ```
  `createMfaChallenge` stores only a hash of a random 32-byte token in
  `mfa_challenges` and sets an httpOnly `sms_mfa` cookie (10 min). **No session
  is created before the second factor.**
- Verification: TOTP or a single-use recovery code. The recovery code is claimed
  with an atomic `UPDATE … WHERE used_at IS NULL RETURNING`, so concurrent
  requests cannot both consume it. Success deletes the challenge (no replay),
  then creates the session. Five wrong attempts invalidate the challenge.
- `/login/mfa` is server-guarded: no valid challenge row/cookie → redirect to
  `/login`.
- Server-side rate limits: login 10/min/IP, MFA 12/min/IP, registration 5/h/IP,
  forgot-password 5/15 min/IP, reset 10/15 min/IP.

---

## 5. Password reset

```
/forgot-password
  → generic response ALWAYS
  → eligible account (active, approved, real) → single token row
  → email (Resend) or development-only on-screen link

/reset-password?token=…
  → server validates token shape + hash + unused + unexpired
  → new password + confirmation (same policy)
  → update hash, mark token used, delete other tokens, revoke ALL sessions
  → redirect to /login
```

- Tokens: 32 random bytes (base64url), SHA-256 hash stored, 30-minute expiry,
  single use.
- Account enumeration: the request action returns the same message for unknown
  addresses, ineligible accounts and success. Unknown-address requests also
  write a minimal audit entry to keep timing roughly uniform.
- Development fallback: when `NODE_ENV !== 'production'` and no mail provider
  is configured, the reset URL is rendered on the page. It is never logged, and
  it is never returned in production.

---

## 6. Encryption at rest

`src/lib/security/encryption.ts`:

- AES-256-GCM, random 96-bit IV per value, authentication tag stored with the
  ciphertext: `enc:v1:<iv>:<tag>:<ciphertext>` (base64url).
- Key from `ENCRYPTION_KEY` (base64 of 32 bytes, 64 hex chars, or an arbitrary
  passphrase run through scrypt with a fixed domain salt). Cached per process.
- Tampering throws on read — a corrupted value is never rendered as plaintext.
- Legacy plaintext (no prefix) passes through read-only compatibility until the
  backfill encrypts it.
- In production a missing key throws on first use. In development a fixed
  development-only key is used with a warning, so local work still runs.

Wiring: `encryptedText()` is a Drizzle custom column type in
`src/db/schema.ts`. Reads/writes go through Drizzle everywhere, so actions,
queries, reports and PDFs all decrypt transparently without crypto logic in
components.

Encrypted columns:

| Table | Columns |
| --- | --- |
| `health_records` | `remarks` |
| `clinical_records` | `description`, `assessment`, `action_taken`, `remarks` |
| `behavior_records` (guidance) | `description`, `follow_up` |
| `employee_201_records` | `description`, `file_reference` |
| `employees` | `address`, `contact_number`, emergency contacts, `gsis_number`, `philhealth_number`, `pagibig_number`, `tin_number`, `prc_license_number`, `eligibility` |
| `users` | `mfa_secret` |

Backfill: `scripts/encrypt-existing-records.mts` (idempotent, skips
`enc:v1:%`, reports counts only, fails if plaintext remains). Hashing is used
only for passwords, session/reset/MFA-challenge tokens and recovery codes —
never for retrievable record content.

### Authorization (encryption is not authorization)

Existing server-side gates remain the access control:

- Health actions/queries: `health.view` / `health.write` + `canAccessStudent`.
- Guidance incidents: `behavior.write` + role ∈ (guidance, admin, school_admin)
  + confidential filter on every read.
- 201 files / employee records: `employees.*`, `employee_201.*` (Admin Officer,
  System Administrator); no student-facing role holds them.
- Decryption happens only after these checks, in server code.

---

## 7. Grade-submission monitoring

Expected submission = one row in `section_subject_teachers` × every grading
period of that section's school year (active sections only). The current state
of a context is the **latest** `grade_submissions` row (append-only ledger), so
a reopen makes the sheet outstanding again.

Deadline source: `grading_periods.submission_deadline`, configured on
`/grades/monitoring` by roles holding `academics.config`.

Timezone: deadlines mean **end of day Asia/Manila** (UTC+8, no DST).

```
now < deadline end                     → Not Yet Due
submitted_at <= deadline end           → Submitted On Time
submitted_at > deadline end            → Submitted Late
deadline passed, not submitted         → Overdue
period end passed, not submitted       → Missing
no deadline, submitted                 → Submitted
no deadline, not submitted             → Not Yet Due
```

Implementation: `computeSubmissionStatus` is a pure function (unit-tested);
`gradeSubmissionMonitoring` loads the expected rows, ledger, and reference data
in batched queries and evaluates the status server-side. Submission timestamps
come from `grade_submissions.submitted_at`, written by the existing server
action (`SUBMIT_GRADE_SHEET` audit entry) — clients cannot supply them.

Dashboard (`/grades/monitoring`, `grades.monitor` — System/School
Administrator): summary cards (expected, completion %, on time, late,
overdue/missing, not yet due), per-grading-period breakdown, deadline
configuration, and filters by school year, grade level, section, subject,
teacher, grading period and status.

RBAC additions:

- `grades.monitor` — admin, school_admin only.
- `academics.config` already governs deadline configuration.

---

## 8. Environment variables

Add to `.env.example` only (never commit real values):

| Variable | Required | Purpose |
| --- | --- | --- |
| `ENCRYPTION_KEY` | Production | AES-256 key for sensitive columns. `openssl rand -base64 32`. |
| `MAILGUN_API_KEY` | Production | Mailgun private API key for password-reset email delivery. |
| `MAILGUN_DOMAIN` | Production | Verified Mailgun sending domain. |
| `MAILGUN_FROM_EMAIL` | Production | Sender mailbox on the verified domain. |
| `MAILGUN_FROM_NAME` | Optional | Display name shown in the recipient's inbox. |
| `MAILGUN_REGION` | Optional | Set to `eu` for EU-region Mailgun accounts. |
| `NEXT_PUBLIC_APP_URL` | Production | Public base URL used to build reset links. |

Existing `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `SESSION_COOKIE_SECURE` remain
required. Without Mailgun configured, production reset requests return the
generic message but no mail is delivered — see
`documentation/features/password-reset-mailgun-2026-11.md` before relying on
self-service reset in production.

Key rotation note: ciphertext embeds no key id. Rotating `ENCRYPTION_KEY`
requires decrypting and re-encrypting existing values with the new key in a
controlled maintenance run.

---

## 9. Migration & deployment verification

1. `npx drizzle-kit generate` → `0015_melted_dragon_lord.sql` (additive).
2. Apply to Turso through the configured `drizzle-kit migrate` credentials, or
   `turso db shell cms < drizzle/0015_melted_dragon_lord.sql`.
3. Verify with the Turso CLI: new columns/tables/indexes exist; `role-pending`
   exists; every pre-existing account has `status='approved'`.
4. Run `scripts/encrypt-existing-records.mts` with the production key; verify it
   reports zero plaintext remaining.
5. `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.
6. Push; Vercel builds. Confirm `ENCRYPTION_KEY` is set for Production (and
   Preview) and the deployment logs show no encryption/module-boundary errors.
7. Production smoke test: login, registration → approval → login, MFA
   enrollment/login, password reset, a health/guidance/201 read as an
   authorized role and a denial for an unauthorized role, and
   `/grades/monitoring` with a configured deadline.

### Test coverage added

- `src/lib/__tests__/encryption.test.ts` — round-trip, IV uniqueness, tamper
  detection (ciphertext + tag), legacy passthrough, no double encryption.
- `src/lib/__tests__/totp.test.ts` — RFC 6238 vectors, drift window, malformed
  input, base32, recovery-code generation/normalization.
- `src/lib/__tests__/auth-security.test.ts` — registration/role-injection,
  password policy, reset token entropy/single-use/expiry, form schemas.
- `src/lib/__tests__/grade-submissions.test.ts` — every deadline status,
  Asia/Manila end-of-day, immunity to client time.

---

## 10. Known limitations

- The in-process rate limiter is per-instance; a multi-instance deployment needs
  a shared store.
- TOTP is the only second factor (no WebAuthn/SMS).
- Password reset in production requires a configured email provider.
- No trusted-device ("remember this browser") support for MFA.
