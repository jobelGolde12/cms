# API Optimization

## Server Actions (Current)
- All server actions use Zod validation (`src/lib/schemas.ts`)
- Actions return `ActionState` (`ok` / `fail`) with typed responses
- Rate limit applied to `performLogin()` only
- No idempotency keys for mutations

## Improvements
1. Apply rate limit to mutation actions that create records (register, validation submit, duplicate review, intervention create) to prevent duplicate submissions.
2. Add idempotency keys (`X-Idempotency-Key` header or hidden form field) for mutation actions.
3. Return minimal data; avoid returning full nested objects when only status/code needed.
4. Use `revalidatePath()` after mutations (already partially done).
5. Add structured error responses with `error_category` for analytics tracking.
