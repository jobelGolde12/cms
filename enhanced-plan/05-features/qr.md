# Feature-Specific Audit — QR Verification

## Routes
`/verify` (`GET` — public form to enter token or scan QR)
`/verify/[token]` (`GET` — token lookup page, not fully read)
`/verify/result` (`GET` — result display, not fully read)
`/qr` (`GET` — admin/studio interface, implied by `qr/page.tsx` reference)

## File Locations
- Page: `src/app/verify/page.tsx`
- Page: `src/app/verify/result/page.tsx` (not fully read)
- Page: `src/app/verify/[token]/page.tsx` (not fully read)
- Action: `src/actions/qr.ts` (not fully read)
- Component: `src/components/ui/badge.tsx` (used for `RecordStatusBadge` — referenced by `child-profile` page; not directly QR-specific)
- Library: `src/lib/qr.ts` (not fully read — implied by actions/qr reference and `deactivateChildTokens` usage in `actions/children.ts`)
- Schema: `src/db/schema.ts` (`qrVerifications`)

## Schema
`qrVerifications`:
- `verificationToken`: unique (`uniqueIndex`), opaque token
- `verificationType`: `generate` | `scan` | `revoke`
- `result`: `valid` | `invalid` | `expired` | `revoked`
- `verifiedBy`: optional (`references` to `users.id`)
- `verifiedAt`: timestamp

## Potential Bugs / Issues
- `deactivateChildTokens()` (used in `updateChild` when `isResubmit` or `recordStatus === "verified"`) revokes tokens when data changes — correct behavior.
- `qrVerifications` table does not store child personal details; only token and verification metadata — privacy-preserving by design.
- No middleware-level authorization for `/verify/[token]` or `/verify/result` — these are public routes by design.

---

References: `src/app/verify/page.tsx`, `src/db/schema.ts` (`qrVerifications` table), `src/actions/children.ts` (line 292: `await deactivateChildTokens(childId, user.id)`), `src/lib/qr.ts` (implied but not fully read).
