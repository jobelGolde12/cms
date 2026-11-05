# Add Employee + Student LRN — Audit & Enhancement Plan (2026-11)

## Existing Problems (audit findings)

1. **Critical — form data destroyed on any failure.** `EmployeeForm` uses
   uncontrolled inputs (`defaultValue`) with `useActionState`. React 19
   automatically resets uncontrolled fields once a server action completes —
   *including when the action returns a validation error*. In create mode every
   default is empty, so any failure (missing required field, duplicate employee
   number, DB insert failure) wipes everything the user typed. This is the
   exact behavior flagged in section 5/6 of the task.
2. **No `aria-invalid` / `aria-describedby` linkage.** The shared `Field`
   component renders `role="alert"` error text, but the control itself is
   neither flagged invalid nor referenced — screen readers do not connect
   message to field.
3. **No focus management.** After a failed submit, focus stays on the submit
   button; the first invalid field is not focused.
4. **Students page shows the wrong identifier.** The registry table's first
   column is labeled “Student No.” and displays `studentNumber`
   (`SM-YYYY-######`, an application-generated internal number), not the
   student's LRN. The student detail page header likewise shows
   `studentNumber` as the identity line, with LRN relegated to the detail list.
5. Minor: duplicated per-field `error={...}` wiring is fine, but nothing
   prevented the modal from closing on failure — verified it only closes via
   `onSuccess` (no issue).

## Non-problems (verified healthy)

- Server-side validation before every DB write (`employeeFormSchema` zod parse
  in `createEmployee`/`updateEmployee`), authorization via
  `getAuthorizedUser("employees…")` — not client-only.
- Duplicate protection: early friendly check `employeeNumberTaken` + unique
  index on `employees.employee_number` + collision-aware retry loop.
- Friendly DB error mapping (`isEmployeeNumberConflict`, human-readable
  messages, technical detail to console only).
- Double submission prevented (`disabled={pending}` on the submit button).
- Success resets the form only by unmounting the modal *after* the action
  confirms success (`onSuccess` closure), `revalidatePath("/employees")`
  refreshes the list.
- Schema/types match Drizzle migrations (`employees.employee_number` unique,
  `students.lrn` nullable text, 12-digit zod rule in `studentFormSchema`).
- `students.lrn` is edited only through the LRN field on the student form;
  editing unrelated fields does not touch the stored LRN value.

## Critical Fixes

1. Preserve submitted values on failure: snapshot every `formData` entry in the
   client wrapper action before calling the server action; on a failed result
   echo the snapshot back inside `ActionState` and use it as the effective
   `defaultValue` for every uncontrolled field. React's post-action reset then
   restores the user's own values instead of clearing them.
2. Sync the controlled `position` / `otherPosition` state with the echoed
   values after a failed submission.

## Recommended UX / a11y Improvements

- `Field` injects `aria-invalid` and `aria-describedby` (error id actually
  referenced); error text and hints get stable ids.
- Focus the first field whose error is present after a failed submission.
- Loading state already present (“Saving…” + `disabled={pending}`); retained.
- Error banner keeps `role="alert"`; success keeps `role="status"`.

## Students Page (LRN)

- Registry table first column → label **LRN / Student No.**, value `lrn ?? studentNumber`.
  When the LRN is not filed yet, the student number is shown **with an explicit
  "LRN not filed" caption** — the fallback is never silent, because a bare
  em dash gave the school no identifier to work with. The link still routes to
  the internal profile URL (`/students/{id}`) — internal PKs stay for
  relations; only the displayed identifier changes.
- Registry search covers the LRN as well as the name and the student number
  (`studentFilters` in `src/lib/queries.ts`).
- The registry sort control is an explicit "Sort records" dropdown (Recently
  added / Oldest first / Name A–Z). The column headers used to carry sort
  arrows that silently sorted by creation date while claiming to sort by LRN.
- Detail page identity line shows the LRN (falls back to the record number
  with an explicit “no LRN yet” marker when not filed).

## Database Improvements

None required: schema already matches application expectations
(`employees.employee_number` unique not-null, `students.lrn` nullable).
Additive future option (not in scope now): unique index on
`students.lrn` once a policy exists for nulls.

## Security

No changes needed: server actions re-check permission server-side, all SQL goes
through Drizzle parameterization, secrets never leave env vars.

## Testing Plan

- Vitest suites (schemas, teaching loads, PDFs) — must pass unchanged.
- `pnpm lint`, `pnpm typecheck`-equivalent (`tsc --noEmit`), `pnpm build`.
- Manual end-to-end against Turso: create valid employee (verify row in Turso),
  duplicate employee number, missing required field (state preserved), refresh
  persistence.
- Students: registry LRN column matches `students.lrn` in Turso for sampled
  rows.

## Implementation Order

1. `Field` a11y injection (`aria-invalid`, `aria-describedby`, error ids).
2. `EmployeeForm` value echo (preserve-on-failure) + focus first invalid field.
3. Registry LRN column + detail identity line.
4. Checks, tests, Turso verification, Vercel verification.
