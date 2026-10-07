# Data Privacy — School System

> STATUS: **PLAN**. Student information is sensitive personal data
> (RA 10173 — Data Privacy Act of the Philippines context carries over).

## Principles & Controls

| Principle | Control |
|---|---|
| **Data minimization** | Collect only fields required (TODO §45). Optional contact fields; guardian data only what operations need; no household-survey remnants. |
| **Access control** | Role + domain matrix (`role-permission-matrix.md`); row-level scope; sensitive tables (guardians, behavior, assessments notes) checked at query level, not just UI. |
| **Audit trails** | Append-only `audit_logs` for every sensitive read-class operation that mutates, plus all CRUD on students, grades, attendance, behavior, assessments, interventions, users, roles, settings (see `audit-logging.md`). |
| **Secure QR** | QR payload = opaque token only. Server resolves → validates → shows minimal fields (pattern: `src/app/verify/[token]/page.tsx` shows code + status only). Never encode name/birth date/address/assessment data. |
| **Report permissions** | Export route re-checks `reports.export`; scoped builders; sensitive columns excluded per role; school-year filters prevent over-broad pulls. |
| **Sensitive notes** | Behavior descriptions and assessment notes: permission-gated, neutral language, length-limited; never included in notifications or analytics events. |
| **Guardian information** | Access-controlled (`guardians.*`); never exposed via public routes. |
| **Browser exposure** | No PII in client props beyond the page's role allowance; no `NEXT_PUBLIC_` secrets; server components keep data server-side by default. |
| **API responses** | Minimal JSON errors (no stack traces); export route returns files, not data dumps. |
| **Logs** | `logAudit` stores no secrets; QR logs store token references only; `trackEvent` filters non-scalar/PII properties (existing behavior). |
| **Backups** | Migration archives (`_archived_*` / export files) stored securely, access-restricted, and disposed per school retention policy; `local.db` dev files never committed (`.gitignore` already excludes). |
| **No hard deletes in UI** | Students are archived, not deleted; destructive paths require explicit admin action + audit. |

## Privacy Review Gates (per feature phase)

1. List fields collected → justify each against a school need.
2. Identify which roles can read each field (matrix).
3. Confirm audit coverage for mutations.
4. Confirm no PII enters: notifications text, analytics events, QR payloads, error messages, client bundles.
5. Report builders: column-level privacy check before shipping.

## Deleted-System Data (census era)

Old ECCD/disability/barangay data is **not** carried into the school system;
it is archived (export files) and remains subject to the school's retention and
disposal policy. Disability-type data, if ever needed, requires explicit
documented justification and stricter access — not defaulted.
