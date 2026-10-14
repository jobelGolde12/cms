# Role & Permission Matrix — School System

> STATUS: **IMPLEMENTED**. The eight-role catalog below is live in
> `src/lib/permissions.ts`, seeded via `scripts/seed.mts` /
> `scripts/seed-remote-reference.mts` and enforced **server-side**
> (`requirePermission`, `getAuthorizedUser`, row-level scope in
> `src/lib/scope.ts`). UI checks remain cosmetic only.

## Roles

| Role key | Label | Summary of responsibilities |
|---|---|---|
| `admin` | System Administrator | User management, roles/permissions, system configuration, audit logs, technical administration |
| `school_admin` | School Administrator | School-wide student records, academic monitoring, enrollment, analytics, reports |
| `teacher` | Teacher / Adviser | Assigned sections' students: grades, attendance, assessments, behavior notes, interventions (where permitted) |
| `records` | Records Personnel | Student records, enrollment, profile verification, historical records, documents |
| `guidance` | Guidance / Student Support Personnel | Behavior records, interventions, support information, selected student development data |
| `nurse` | Nurse | Health & nutrition records and clinical records ONLY — cannot edit general student information |
| `registrar` | Registrar | STRICTLY read-only views + official document printing (student card, Form 137) |
| `literacy_coordinator` | Language & Literacy Coordinator | Reading / literacy / numeracy assessments and statistics |

**Removed roles:** `barangay`, `lgu` (municipality scope eliminated).

**Scope rule (replaces `childScope` in `src/lib/scope.ts`):**
- `admin`, `school_admin`, `records`, `guidance`, `nurse`, `registrar`, `literacy_coordinator` → all students (domain gating is by permission, not row scope).
- `teacher` (Adviser) → students with an **active enrollment in a section where the user is adviser** (`sections.adviser_id`).

**Sensitive-data boundaries:**
- **Guidance confidentiality** — behavior rows with `confidential = true`
  (authored by Guidance Office) are readable/mutable only by `admin`,
  `school_admin` and `guidance`. The flag is enforced in every behavior
  query, dashboard, report export and the `saveBehavior`/list guards
  (`src/lib/scope.ts#confidentialBehaviorFilter`); it is never a UI-only rule.
- **Health data** — `health_records` and `clinical_records` require
  `health.view` (only `admin` and `nurse` hold it).
- **Registrar** — no write permission on any student domain; the only write
  path (`documents.print` pages) renders a preview and calls the browser
  print dialog, mutating no data.

## Permission Matrix

Legend: ✓ full · ✓ᴬ assigned-scope only (teacher → own sections) · View read-only · — none.

| Feature / Permission key | Admin | School Admin | Teacher | Records | Guidance | Nurse | Registrar | Literacy |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Dashboard (`dashboard.view`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Student registry — view (`students.view`) | ✓ | ✓ | ✓ᴬ | ✓ | View | ✓ | ✓ | ✓ |
| Student registry — create (`students.create`) | ✓ | ✓ | — | ✓ | — | — | — | — |
| Student registry — update (`students.update`) | ✓ | ✓ | — | ✓ | — | — | — | — |
| Student archive (`students.archive`) | ✓ | ✓ | — | ✓ | — | — | — | — |
| Student profile — full | ✓ | ✓ | ✓ᴬ | ✓ | Limited (support domains) | Health only | Read-only | Assessments only |
| Guardians — view/manage (`guardians.*`) | ✓ | ✓ | View (assigned) | ✓ | View | View | View | View |
| Enrollment — create/update (`enrollment.*`) | ✓ | ✓ | — | ✓ | — | — | — | — |
| Enrollment — view | ✓ | ✓ | ✓ᴬ | ✓ | View | ✓ | ✓ | ✓ |
| Subjects / grading periods config (`academics.config`) | ✓ | ✓ | — | — | — | — | — | — |
| Grades — encode/edit (`grades.write`) | ✓ | ✓ | ✓ᴬ | — | — | — | — | — |
| Grades — view (`grades.view`) | ✓ | ✓ | ✓ᴬ | View | View (summary) | — | ✓ | — |
| Attendance — record (`attendance.write`) | ✓ | ✓ | ✓ᴬ | — | — | — | — | — |
| Attendance — view | ✓ | ✓ | ✓ᴬ | View | View | — | ✓ | — |
| Behavior — record/update (`behavior.write`) | ✓ | ✓ | ✓ᴬ (notes) | — | ✓ | — | — | — |
| Behavior — view (`behavior.view`) | ✓ | ✓ | ✓ᴬ | — | ✓ | — | — | — |
| Confidential guidance records | ✓ | ✓ | — | — | ✓ | — | — | — |
| Health / nutrition — record (`health.write`) | ✓ | — | — | — | — | ✓ | — | — |
| Health / nutrition — view (`health.view`) | ✓ | ✓ | — | — | — | ✓ | — | — |
| Clinical records (`health.write`) | ✓ | — | — | — | — | ✓ | — | — |
| Reading/Literacy/Numeracy — record (`assessments.write`) | ✓ | ✓ | ✓ᴬ | — | ✓ | — | — | ✓ |
| Assessments — view | ✓ | ✓ | ✓ᴬ | View | ✓ | — | ✓ | ✓ |
| Interventions — create/update (`interventions.write`) | ✓ | ✓ | Limited | — | ✓ | — | — | — |
| Interventions — view | ✓ | ✓ | ✓ᴬ | — | ✓ | — | — | ✓ |
| Record verification — review (`verification.review`) | ✓ | ✓ | — | ✓ | — | — | — | — |
| Duplicates — review (`duplicates.review`) | ✓ | ✓ | — | ✓ | — | — | — | — |
| Reports — view/generate (`reports.view`, `reports.generate`) | ✓ | ✓ | ✓ᴬ (own sections) | View | Limited | ✓ (health-only) | ✓ | ✓ |
| Reports — export (`reports.export`) | ✓ | ✓ | — | ✓ | — | — | ✓ | — |
| Official documents — print (`documents.print`) | ✓ | ✓ | — | ✓ | — | — | ✓ | — |
| QR — generate/verify (`qr.verify`) | ✓ | ✓ | — | ✓ | — | — | — | — |
| Users — manage (`users.*`) | ✓ | — | — | — | — | — | — | — |
| Audit logs — view (`audit_logs.view`) | ✓ | ✓ | — | — | — | — | — | — |
| Settings — manage (`settings.manage`) | ✓ | Limited (academic config) | — | — | — | — | — | — |

## Documentation Rules

- Every permission key above is a `PERMISSIONS` entry in `src/lib/permissions.ts`
  and a seeded row in `permissions` + `role_permissions` (existing seeding mechanism).
- Any future rule change updates this file **and** the code map together.
- "Requires Attention" indicators follow the neutral terminology rule and are
  visible per matrix (same access as the underlying data).
