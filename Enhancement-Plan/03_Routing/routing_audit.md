# Routing Audit

## Route Groups
- `(app)` — protected application routes (dashboard, children, settings, etc.)
- Root — public (welcome, login, register, verify)

## Gaps
1. **No `middleware.ts`**: No centralized session validation, CSP enforcement at middleware, or rate-limit headers.
2. **No `not-found` customization** in `(app)` group beyond root `not-found.tsx`.
3. **No loading UI customization** per route group.
4. **Dynamic routes** (`[id]`) work correctly but lack Suspense boundaries for data fetching.
5. **Direct URL access** protected routes rely solely on `getCurrentUser()` — if a user bookmarks a protected URL without session, they get redirected by `requireUser()` correctly.

## Navigation
- `nav-item-client.tsx` and `mobile-nav-toggle.tsx` handle navigation; links use `<Link>` properly.
- No prefetching strategy (Next.js prefetches `visible` links by default; acceptable).
