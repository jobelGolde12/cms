# Role & Permission Matrix — School System

> STATUS: **PLAN**. Final role list chosen after codebase audit (TODO §13):
> the existing RBAC skeleton (`roles`/`permissions`/`role_permissions` +
> `src/lib/permissions.ts`) is retained; the catalog is re-seeded.
> Enforcement stays **server-side** (`requirePermission`, `getAuthorizedUser`,
> row-level scope). UI checks remain cosmetic.

## Roles

| Role key | Label | Summary of responsibilities |
|---|---|---|
| `admin` | System Administrator | User management, roles/permissions, system configuration, audit logs, technical administration |
| `school_admin` | School Administrator | School-wide student records, academic monitoring, enrollment, analytics, reports |
| `teacher` | Teacher / Adviser | Assigned sections' students: grades, attendance, assessments, behavior notes, interventions (where permitted) |
| `records` | Records Personnel | Student records, enrollment, profile verification, historical records, documents |
| `guidance` | Guidance / Student Support Personnel | Behavior records, interventions, support information, selected student development data |

**Removed roles:** `barangay`, `lgu` (municipality scope eliminated).

**Scope rule (replaces `childScope` in `src/lib/scope.ts`):**
- `admin`, `school_admin`, `records` → all students.
- `teacher` → students with an **active enrollment in a section where the user is adviser or assigned teacher** (`sections.adviser_id` + a teacher-section assignment table or per-section assignment by admin).
- `guidance` → all students **for behavior/assessments/interventions domains only**; grades views limited to summary (see matrix).

## Permission Matrix

Legend: ✓ full · ✓ᴬ assigned-scope only (teacher → own sections) · View read-only · — none.

| Feature / Permission key | Admin | School Admin | Teacher | Records | Guidance |
|---|---:|---:|---:|---:|---:|
| Dashboard (`dashboard.view`) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Student registry — view (`students.view`) | ✓ | ✓ | ✓ᴬ | ✓ | View |
| Student registry — create (`students.create`) | ✓ | ✓ | — | ✓ | — |
| Student registry — update (`students.update`) | ✓ | ✓ | — | ✓ | — |
| Student archive (`students.archive`) | ✓ | ✓ | — | ✓ | — |
| Student profile — full | ✓ | ✓ | ✓ᴬ | ✓ | Limited (support domains) |
| Guardians — view/manage (`guardians.*`) | ✓ | ✓ | View (assigned) | ✓ | View |
| Enrollment — create/update (`enrollment.*`) | ✓ | ✓ | — | ✓ | — |
| Enrollment — view | ✓ | ✓ | ✓ᴬ | ✓ | View |
| Subjects / grading periods config (`academics.config`) | ✓ | ✓ | — | — | — |
| Grades — encode/edit (`grades.write`) | ✓ | ✓ | ✓ᴬ | — | — |
| Grades — view (`grades.view`) | ✓ | ✓ | ✓ᴬ | View | View (summary) |
| Attendance — record (`attendance.write`) | ✓ | ✓ | ✓ᴬ | — | — |
| Attendance — view | ✓ | ✓ | ✓ᴬ | View | View |
| Behavior — record/update (`behavior.write`) | ✓ | ✓ | ✓ᴬ (notes) | — | ✓ |
| Behavior — view (`behavior.view`) | ✓ | ✓ | ✓ᴬ | — | ✓ |
| Reading/Literacy/Numeracy — record (`assessments.write`) | ✓ | ✓ | ✓ᴬ | — | ✓ |
| Assessments — view | ✓ | ✓ | ✓ᴬ | View | ✓ |
| Interventions — create/update (`interventions.write`) | ✓ | ✓ | Limited | — | ✓ |
| Interventions — view | ✓ | ✓ | ✓ᴬ | — | ✓ |
| Record verification — review (`verification.review`) | ✓ | ✓ | — | ✓ | — |
| Duplicates — review (`duplicates.review`) | ✓ | ✓ | — | ✓ | — |
| Reports — view/generate (`reports.view`, `reports.generate`) | ✓ | ✓ | ✓ᴬ (own sections) | View | Limited |
| Reports — export (`reports.export`) | ✓ | ✓ | — | ✓ | — |
| QR — generate/verify (`qr.verify`) | ✓ | ✓ | — | ✓ | — |
| Users — manage (`users.*`) | ✓ | — | — | — | — |
| Audit logs — view (`audit_logs.view`) | ✓ | ✓ | — | — | — |
| Settings — manage (`settings.manage`) | ✓ | Limited (academic config) | — | — | — |

## Documentation Rules

- Every permission key above is a `PERMISSIONS` entry in `src/lib/permissions.ts`
  and a seeded row in `permissions` + `role_permissions` (existing seeding mechanism).
- Any future rule change updates this file **and** the code map together.
- "Requires Attention" indicators follow the neutral terminology rule and are
  visible per matrix (same access as the underlying data).
