# Feature-Specific Audit — Duplicate Review

## Route
`/duplicates` (`GET`)

## File Locations
- Page: `src/app/(app)/duplicates/page.tsx`
- Component: `src/components/validation/validation-ui.tsx` (reused: `ValidationKpiGrid`, `ValidationPageHeader`)
- Component: `src/components/validation/validation-ui.tsx` (`MatchEvidence`, `RecordComparison`, `ResolutionExplainer`, `ConfidenceChip`, `DuplicateStatusBadge` — not fully inspected individually)
- Action: `src/actions/duplicates.ts` (`reviewDuplicate`)
- Library: `src/lib/duplicates.ts` (`detectDuplicates`, `refreshDuplicateCandidates`)
- Query: `src/lib/queries.ts` (`listDuplicates`)

## Data Source
`childDuplicateCandidates` joined with `children` (both sides) plus current education/school data.

## Matching Logic
Score calculation (`detectDuplicates`):
- Same full name (`normalizeName`): +40
- Same middle name (if both present): +10
- Same birth date: +35
- Same barangay: +15
- Strong match requires at least 2 identifiers (`(sameName && (birth_date || barangay))` OR `(!sameName && birth_date && barangay)`)
- `refreshDuplicateCandidates()` updates pending candidates: dismisses stale ones, updates `not_duplicate` back to `pending` if new match found, inserts new pending pairs.

## Potential Bugs / Issues
- `detectDuplicates()` uses `OR` filter (`lastName`, `firstName`, `birthDate`, `barangayId`) — broad filter before scoring. Acceptable for SQLite with ~60 demo records; could become slow with thousands.
- `listDuplicates()` applies `childScope()` only through the `children` join in the query; the duplicate pair query does not explicitly filter by scope on the `possibleChild` side. This means a `barangay` user could see duplicate candidates where the `possibleChild` is outside their scope. This is a potential authorization gap.
- `reviewDuplicate()` determines newer record by `createdAt` (`(childRows[0]?.createdAt ?? 0) >= (possibleRows[0]?.createdAt ?? 0) ? childId : possibleChildId`). This uses numeric comparison of Date objects — safe because Date objects coerce to numbers (milliseconds since epoch) in arithmetic.

## Missing Functionality
- No bulk dismiss or bulk confirm (intentional — individual review required).
- No automatic duplicate resolution (only proposals; human review required — correct per design).

---

References: `src/lib/duplicates.ts`, `src/actions/duplicates.ts`, `src/app/(app)/duplicates/page.tsx`, `src/lib/queries.ts` (lines 743–865).
