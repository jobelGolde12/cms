# Implementation Plan

## Executive Summary
The application is a modern, App Router-based Next.js 16 project with a well-structured database layer (`drizzle-orm` + SQLite), custom session auth, role-based permissions, and comprehensive documentation. Key strengths: server-first architecture, clear server/client boundaries (`AppShell` as async SC), strong TypeScript config (`strict`), security headers (`CSP`, `X-Frame-Options`, etc.), audit logging, rate limiting, and accessibility features (skip-to-content, reduced-motion, focus rings).

Key weaknesses: CSP is weakened by `'unsafe-eval'`, no middleware file exists (auth relies solely on `(app)/layout`), mutation authorization/validation needs systematic verification, performance could be improved (notification query per render, chart bundle weight, no pagination on some queries), testing is limited to library logic, and some accessibility behaviors (tooltip keyboard, mobile nav focus trap) need verification.

## Problems Found (with file, severity, impact, solution)

### P0 — Critical
1. **Security header CSP too permissive** (`next.config.ts`). `script-src 'unsafe-inline' 'unsafe-eval'` allows XSS. Solution: investigate if `'unsafe-eval'` is required; if not, remove it. If inline scripts are required, use `nonce`-based CSP.
2. **No middleware file** (`src/middleware.ts` or equivalent). Auth relies solely on `(app)/layout.tsx`. While App Router layout guards are sufficient for pages, middleware provides defense-in-depth for API routes and prevents accidental unprotected routes. Solution: create `middleware.ts` that checks session cookie and redirects unauthenticated requests to `/login` for protected paths.
3. **Server action authorization needs audit** (`src/actions/*.ts`). Every mutation must independently verify authorization. Some actions may rely solely on client-side checks. Solution: inspect each action; add `getAuthorizedUser()` or role checks.

### P1 — High
4. **Performance: AppShell async query per render** (`src/components/app-shell.tsx`). `unreadNotificationCount` runs for every protected page. Solution: consider caching with `unstable_cache` or `revalidate`; or split notification count into a `Suspense` boundary.
5. **Performance: chart bundle weight** (`recharts`, `framer-motion`). Large JS bundles for interactive components. Solution: dynamically import chart components (`next/dynamic`); evaluate replacing `framer-motion` with CSS animations where possible.
6. **Data fetching: pagination missing** (`src/lib/queries.ts`, `src/app/*/page.tsx`). Unbounded queries may become slow. Solution: add pagination parameters (`limit`, `offset`) to list queries and UI components.
7. **Testing gaps** (`src/lib/__tests__/` only). No component, API, or action tests. Solution: add targeted tests for critical workflows (login, student mutation, authorization denial).

### P2 — Medium
8. **TypeScript `any` usage limited** (`src/lib/permissions.ts`, `src/lib/scope.ts`, etc.). Most `any` references are comments (`"any student domain"`), not types. Solution: verify no actual `any` type usage remains in critical paths.
9. **No `sitemap` generation**. Solution: add `sitemap.ts` (Next.js App Router native) or `robots.ts` verification.
10. **Accessibility: tooltip keyboard behavior** and **mobile nav focus trap** need verification. Solution: inspect `tooltip` and `mobile-nav-toggle` implementations; add keyboard handling.
11. **Font optimization** (`globals.css`). No `next/font` usage. Solution: import brand font via `next/font/google` or `next/font/local`.

### P3 — Low
12. **Dependency updates** (`npm audit`, `sharp`, `recharts` React 19 compatibility). Solution: run audit, update critical packages.
13. **Naming and code cleanup** (minor). Solution: review variable names in `actions/` for clarity.

## Implementation Phases

### Phase 1 — Safety and Correctness (P0)
- Create `src/middleware.ts` for auth defense-in-depth.
- Audit CSP in `next.config.ts` and adjust.
- Audit all `actions/*.ts` for authorization checks.

### Phase 2 — Architecture (P1)
- Split `AppShell` notification query into `Suspense` boundary or add caching.
- Add `next/dynamic` for chart components.
- Verify pagination in queries and pages.

### Phase 3 — Testing (P1/P2)
- Add action integration tests for `auth`, `students`, `grades`.
- Add component tests for interactive elements.

### Phase 4 — Performance (P1)
- Evaluate `recharts` and `framer-motion` usage; reduce bundle weight.
- Add pagination to list pages.

### Phase 5 — Accessibility/SEO (P2)
- Verify tooltip and mobile nav keyboard behavior.
- Add `sitemap.ts` or verify `robots.ts`.

### Phase 6 — Types and Quality (P2)
- Verify `any` usage; remove if any real type issues exist.
- Improve naming where unclear.

### Phase 7 — Final Verification
- Run `lint`, `typecheck`, `test`, `build`.
- Verify manual workflows (login, student creation, grade submission, authorization denial, error states).

## Dependencies Between Phases
- Phase 1 must complete before Phase 3 (tests rely on secure authorization).
- Phase 4 (performance) can run in parallel with Phase 3 (testing) but should not break existing behavior.
- Phase 5 (SEO/accessibility) is independent of other phases.
