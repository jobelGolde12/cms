# Authorization — School System

> STATUS: **PLAN**. Pattern preserved from the audited codebase: **authorization
> is enforced server-side; frontend checks are cosmetic only** (TODO §44).

## Layers

1. **Route gate** (`src/proxy.ts`) — cookie presence + DB session validation;
   matcher updated for the new route set (no `/register`).
2. **Page guards** — `requireUser()` / `requirePermission(permission)` in every
   server component (`(app)/**/page.tsx`), same as today.
3. **Action guards** — every server action begins with
   `getAuthorizedUser(permission)` and returns a failure state on null
   (pattern: `src/actions/children.ts`).
4. **Row-level scope** — every read *and* write query composes the scope
   predicate (pattern: `childScope` in `src/lib/scope.ts` → replaced by
   `studentScope`).

## New Scope Model

| Role | Scope |
|---|---|
| admin, school_admin, records | all students |
| teacher | students with active enrollment in sections where user is adviser/assigned (`sections.adviser_id`, plus admin-managed teacher-section assignments) |
| guidance | all students, **domain-limited** (behavior, assessments, interventions); grade data limited to summaries |

Implementation notes:
- `studentScope(user, domain?)` returns the SQL predicate; `domain` restricts
  which tables the role may touch at all (e.g. records role cannot read behavior rows).
- `canAccessStudent(user, studentRef)` and `canEditStudent(...)` mirror the
  existing helpers and are unit-tested (`src/lib/__tests__/scope.test.ts` pattern).
- Detail pages re-check scope before rendering any data (existing pattern in
  `children/[id]/page.tsx`).

## State-Machine Authorization

Record verification keeps the documented-transition pattern
(`src/lib/workflow.ts`): allowed `record_status` transitions per role, admin-only
re-open of approved records, and a mapping between the student's current status
and the verification-history rows.

## Testing Requirements

- Per-role matrix tests (from `documentation/security/role-permission-matrix.md`).
- Direct-API tests: actions called without session/permission must fail closed.
- Scope tests: teacher of section A cannot read/write section B rows.
- Domain tests: guidance cannot mutate grades; records cannot read behavior.

## Non-Negotiables

- Never trust client role/permission payloads.
- Never expose data in API responses beyond the role's matrix allowance.
- Audit every permission-relevant mutation (see `audit-logging.md`).
