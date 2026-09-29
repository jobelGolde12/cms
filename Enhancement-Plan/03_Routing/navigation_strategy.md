# Navigation Strategy

## Goals
- Make navigation feel immediate
- Protect routes without over-fetching
- Preserve correct authorization

## Improvements Planned
1. Add `src/middleware.ts` with session cookie validation and route matching for `(app)/*`
2. Keep `next.config.ts` CSP headers; middleware applies additional headers selectively
3. Add Suspense boundaries to `/dashboard`, `/reports`, `/children/[id]`
4. Implement pagination for large list routes to reduce initial payload
5. Use `next/font/google` correctly (already done)
6. Consider `prefetch={false}` for links that trigger mutations (e.g., delete/archive buttons)
