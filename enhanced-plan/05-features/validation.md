# Feature-Specific Audit — Validation Workflow

## Route
`/validation` (`GET`)

## File Locations
- Page: `src/app/(app)/validation/page.tsx`
- Component: `src/components/validation/validation-ui.tsx`
- Component: `src/components/validation/review-form.tsx`
- Action: `src/actions/children.ts` (`reviewValidation`, `reopenChild`)
- Schema: `src/lib/schemas.ts` (`validationReviewSchema`)
- Query: `src/lib/queries.ts` (`validationQueue`, `validationStats`)

## Data Required
- Queue: `children` (`pending_validation`) joined with `childValidations` (`pending`) and submitter user (`users`)
- Stats: counts of `pending_validation`, `needs_correction`, `verified`, `pending` duplicate candidates, high/moderate/review bands from `childDuplicateCandidates`

## Authentication Requirement
- Page requires user (`redirect("/login")`)
- `reviewValidation` requires `validation.review`
- `reopenChild` requires `validation.review` + `user.role === "admin"`

## User Actions
- Search queue (`q` param — filter by name, code, barangay)
- Approve (`form action={reviewValidationForm}` with hidden `childId`, `decision="approved"`, `remarks`)
- Return for correction (`decision="needs_correction"`, `remarks`)
- Reject (`decision="rejected"`, `remarks`)

## Potential Bugs / Issues
- `validationQueue()` uses `inArray(children.recordStatus, ["pending_validation"])` with scope filter — correct but limits to first 100 results (`limit(100)`). Large municipalities may miss older submissions.
- `reopenChild()` is admin-only (`user.role !== "admin"` returns fail) — matches design but restricts re-opening flexibility.
- `reviewValidationForm()` is a wrapper (`await reviewValidation({ ok: false, ... }, formData)`). It ignores previous state — safe for server actions.

## Missing Functionality
- No batch approve/reject for multiple records (intentional — requires individual human review).
- No notification for rejected records (only for approved/needs_correction via `notify` in `reviewValidation` — audit confirms `notify` is called for all decisions with message adapted to decision).

---

References: `src/app/(app)/validation/page.tsx`, `src/actions/children.ts` (lines 321–402), `src/lib/queries.ts` (lines 689–741, 620–678).
