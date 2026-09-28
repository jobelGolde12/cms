# Feature-Specific Audit — Registry (Child Registry)

## Route
`/children` (`GET`) — list, filter, paginate, search
`/children/[id]` (`GET`) — profile view
`/children/[id]/edit` (`GET`) — edit form
`/children/new` (`GET`) — create form

## File Locations
- Page: `src/app/(app)/children/page.tsx`
- Profile: `src/app/(app)/children/[id]/page.tsx`
- Edit: `src/app/(app)/children/[id]/edit/page.tsx`
- Create: `src/app/(app)/children/new/page.tsx`
- Component: `src/components/child-form.tsx`
- Component: `src/components/registry/registry-ui.tsx`
- Component: `src/components/archive-child-button.tsx`
- Action: `src/actions/children.ts`
- Query: `src/lib/queries.ts` (`listChildren`, `getChildProfile`, `getCurrentAddress`, etc.)
- Schema: `src/lib/schemas.ts` (`childFormSchema`)
- Scope: `src/lib/scope.ts`
- Workflow: `src/lib/workflow.ts` (referenced in actions/children.ts, not fully read)

## Data Required
- Child identity (`firstName`, `lastName`, `middleName`, `suffix`, `birthDate`, `sex`, `civilStatus`, `birthPlace`)
- Address (`barangayId`, `householdAddress`, `sitio` — stored in `child_addresses` with `isCurrent`)
- Education (`educationStatus`, `schoolId`, `gradeLevel`, `schoolYear`, `enrollmentStatus` — stored in `child_education` with `isCurrent`)
- ECCD (`participationStatus`, `programName`, `provider`, `remarks` — stored in `child_eccd`)
- Disability (`hasDisability`, `disabilityType`, `description`, `supportNeeded`, `assistanceStatus`, `verified` — stored in `child_disabilities`; only inserted when `hasDisability` is true)
- Validation history (`childValidations` — created on submit/reopen/resubmit)
- Duplicate candidates (`childDuplicateCandidates` — refreshed by `refreshDuplicateCandidates()`)

## Data Source
- `db.select()` / `db.insert()` / `db.update()` via `db.transaction()` in `actions/children.ts`
- Queries in `lib/queries.ts` use `innerJoin` + `leftJoin` with current address/education sub-joins (`isCurrent = true`)

## Authentication Requirement
- All registry pages inside `(app)` layout require `user` (redirect to `/login` if missing)
- `createChild` requires `children.create`
- `updateChild` requires `children.update`
- `archiveChild` requires `children.delete`
- Profile view (`[id]/page.tsx`) checks `canAccessChild()` — if false, redirect to `/children`

## User Actions
- Search (`q` param — `LIKE` on `firstName`, `lastName`, `childCode`)
- Filter (`barangay`, `status` [record status], `sex`, `education`, `school`, `ageMin`, `ageMax`, `cohort`, `sort`, `active` [lifecycle])
- Paginate (`page`, `pageSize` — allowed sizes: 10, 25, 50, 100)
- Create (`/children/new`)
- Edit (`/children/[id]/edit`)
- Archive (`ArchiveChildButton` — form submits `archiveChild` action with `childId`)

## Forms
- `ChildForm` (`src/components/child-form.tsx`) — client component using `useActionState` bound to `createChild` or `updateChild`
- Fields grouped into sections: Basic Information, Household Address, Education, ECCD, Disability (restricted data section with `EyeOff` icon label)
- Submits via `intent=draft` or `intent=submit` (hidden input `intent`)

## Validation
- Client-side: `childFormSchema` (Zod) validates all fields; `Field` component displays errors (`state.fieldErrors?.firstName`)
- Server-side: `createChild` and `updateChild` call `childFormSchema.safeParse()`; if invalid, return `fail()` with `zodFieldErrors()`
- `updateChild` checks `canEditChild()` before allowing edit (scope + verified lock)

## Potential Bugs / Issues
- `archiveChild` does not delete DB rows (`soft delete` via `status = "archived"`) — this is intentional and documented.
- `updateChild` supersedes address/education (marks old `isCurrent: false`, inserts new) — this preserves historical data correctly.
- `createChild` uses sequential code generation (`nextChildCode`) with retry — good for collision handling.
- `canEditChild()` prevents non-admin users from editing `verified` records — correct per design.
- `childFilters()` uses `exists` sub-queries for education and school filters — acceptable for SQLite but may become slow at very large scale.
- `ChildForm` has default values (`defaultValue={defaults.schoolId ?? ""}`) — if `defaults` is missing a key, the input is empty; this is safe.

## Edge Cases
- `middleName` is optional (`optional().or(z.literal(""))`); server `scrub()` converts `""` to `null`
- `civilStatus` defaults to `"single"` in form but schema allows any string up to 20 chars
- `birthDate` validated against `notTooOld()` (year ≥ 1990 and ≤ current year + 1)
- `schoolId` optional; when empty, `scrub()` returns `null` (no school linked)
- `hasDisability` checkbox: `transform((v) => v === "on" || v === "true")`; server checks `v.hasDisability`

## Missing Functionality / Improvements
- No bulk import/export from registry page (only individual create/edit)
- No direct PDF/Excel export of registry table (reports exist separately)
- No image upload for child profile (not required by design)
- No batch archive (only single archive via button)

---

All findings reference actual files (`src/app/(app)/children/page.tsx`, `src/components/child-form.tsx`, `src/actions/children.ts`, `src/lib/queries.ts`). No new features invented.
