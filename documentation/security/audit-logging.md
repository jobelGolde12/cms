# Audit Logging — School System

> STATUS: **PLAN**. Mechanism retained: append-only `audit_logs` via
> `logAudit()` (`src/lib/audit.ts`) — failures logged, never thrown; no
> application path edits or deletes rows.

## Tracked Events (TODO §46)

| Domain | Actions |
|---|---|
| Auth | login, logout, login-failed (rate-limited attempts) |
| Students | create, update, archive, (restore) |
| Enrollment | create, update (status/transfer) |
| Grades | create, update |
| Attendance | record, update |
| Behavior | record, update, resolve |
| Assessments | record, update (reading/literacy/numeracy) |
| Interventions | create, update, complete/discontinue, follow-ups |
| Verification | submit, review (approve/needs_correction/reject), reopen |
| Duplicates | candidate flagged (system), confirm, dismiss |
| Reports | generate, export (type + scope + filters, no row data) |
| QR | generate, revoke (+ public scan events) |
| Users | create, update, disable, role change, password change |
| Settings | update (key names + before/after **non-secret** values) |

## Record Shape (unchanged table)

| Field | Content |
|---|---|
| actor (`user_id`) | performing user (SET NULL if user deleted) |
| action | namespaced verb, e.g. `grade.update` (dictionary in `data-dictionary.md`) |
| entity | `entity_type` + `entity_id` |
| timestamp | `created_at` (unixepoch) |
| metadata | `old_values_json` / `new_values_json` — **minimal diffs, never secrets or bulk PII** |
| request | `ip_address`, `user_agent` (as available) |

## Rules

1. Audit writes must never break the primary operation (existing behavior).
2. Old/new value snapshots: exclude password hashes, tokens, assessment notes
   verbatim, guardian contact values — reference ids instead.
3. Report/QR logs record *what was produced/verified*, not row contents.
4. Public `/verify` scans log token id + result only.
5. Dashboard "Recent Activity" continues to derive from audit rows (existing
   `dashboard-data.ts` pattern) with human-readable labels updated to the new vocabulary.
6. Viewer: `/activity-logs` (admins + school admins per matrix).
