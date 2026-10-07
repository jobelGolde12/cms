# Feature — Students (Registry, Profile, Guardians, Duplicates)

> STATUS: **PLAN**. Replaces the child registry (`/children` → `/students`).

## Student Registry — `/students`

- KPI chips (same visual kit as `src/components/registry/registry-ui.tsx`): total, active, current-year enrolled, archived.
- Filters: search (name/student number), grade level, section, enrollment status, sex, lifecycle status; server-side pagination (existing `ALLOWED_PAGE_SIZES` pattern).
- Table columns: student number, name, grade level, section, enrollment status, lifecycle status, created.
- Row actions: view profile, edit (permission), archive (confirm dialog).
- Empty/loading/error states per existing patterns (`TableEmptyState`, route `loading.tsx` skeletons).

## Add / Edit Student — `/students/new`, `/students/[id]/edit`

- New `src/components/student-form.tsx` mirrors `child-form.tsx` structure:
  identity (names, suffix, birth date, sex), optional contact + address,
  guardians editor (add/remove, primary flag), enrollment placement
  (school year, grade level, section — validated together).
- Zod `studentFormSchema` (client + server, single source like today).
- On create: duplicate detection (below) → if candidates, route to review
  instead of silently inserting; student number generated server-side.

## Student Profile — `/students/[id]`

Information architecture (TODO §25) — tabbed, each tab lazily rendered with
Suspense + skeletons:

Overview (summary metrics) · Personal Information · Enrollment (history) ·
Academic Performance (per-period averages, trends) · Grades · Attendance ·
Behavior (permission-gated) · Reading · Literacy · Numeracy · Interventions ·
Achievements (optional, phase-gated) · Activity History (audit-derived).

Header: student number (mono font `.numeric`), name, status badge, current
enrollment facts, QR button (permission), archive (permission).

## Guardians

- `guardians` + `student_guardians` (`is_primary`); managed from the profile
  Personal Information tab and during create/edit.
- Sensitive: `guardians.view/manage` permissions; excluded from public surfaces.

## Duplicate Detection (retained, re-targeted)

- Signals: student number (exact), normalized full name, birth date, sex; same
  scoring/review approach as `src/lib/duplicates.ts` (pair rows, match score,
  reasons, ≥2 independent identifiers).
- Workflow: candidate → review (`/duplicates`) → confirm duplicate OR mark
  different. **Never auto-merge; never auto-delete** (TODO §32). Confirmed
  duplicates are archived after human confirmation with audit entries.

## Server Implementation Map

| Concern | File (new/changed) |
|---|---|
| Actions | `src/actions/students.ts` (create/update/archive — transactional, audited) |
| Queries | `src/lib/queries.ts` → `listStudents`, `getStudentProfile`, `listStudentEnrollments`, `getStudentGuardians` |
| Schemas | `src/lib/schemas.ts` → `studentFormSchema`, `studentQuerySchema`, `guardianFormSchema` |
| Duplicates | `src/lib/duplicates.ts` (retargeted) |
| Student number | `src/lib/child-code.ts` renamed logic, prefix from settings |
| Pages | `src/app/(app)/students/**` |
| Scope | `src/lib/scope.ts` `studentScope` |
