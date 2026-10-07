# Feature — QR Verification

> STATUS: **PLAN** (retained with security review; TODO §33).

## Purpose

QR codes serve as a **secure student identifier** for verification workflows —
NOT a carrier of student information.

## Security Flow (retained from current implementation, `src/lib/qr.ts`)

```
QR code (opaque random token, 24 bytes, base64url)
   ↓
Public /verify scan (or in-app scanner, @zxing/browser)
   ↓
Server-side token resolution (no client-side data)
   ↓
Validation: exists? revoked? expired (365-day TTL)?
   ↓
Permission check (what may this context show?)
   ↓
Limited information response
```

## Guarantees

- **Payload minimality:** token only — never name, student number as data,
  birth date, address, guardian or assessment info.
- **Token model:** event-sourced rows (`generate`/`scan`/`revoke`); newest event
  per token decides state; generating a new token supersedes older ones;
  revocation propagates (record edit/dispute revokes — existing behavior).
- **Server-only resolution:** the public page shows only verification status +
  reference code; personal details never included (current
  `verify/[token]/page.tsx` behavior is correct and is preserved).
- **Auditability:** scans recorded with token reference + result; no personal
  data in scan logs beyond the token's own linkage.
- **Rate/abuse:** public endpoint has no data enumeration risk (unguessable
  tokens); responses uniform for valid-but-expired vs unknown to avoid probing signals.

## School-Context Decision

- **Keep** `/verify` public page (useful for ID verification with minimal data).
- **Re-word** all copy from "child record / municipal" to "student record /
  Sta. Magdalena National High School".
- **Keep** `/qr` studio page (generation events table) scoped to `qr.verify`
  holders (records/admin per matrix).
- Generation entry point moves to the student profile (verified/active students).

## Tests

- Token lifecycle: generate → resolve → revoke → resolve fails.
- Expired token behavior; unknown token behavior (indistinguishable handling).
- Revocation cascades on record edit (existing action retained).
