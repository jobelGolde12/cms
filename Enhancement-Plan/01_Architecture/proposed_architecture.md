# Proposed Architecture Improvements

## 1. Middleware Layer (`src/middleware.ts`)
- Validate session cookie on protected routes
- Apply CSP/headers at middleware level (already in `next.config.ts`, keep both)
- Restrict middleware matcher to `(app)/*` to avoid public-route overhead
- Add rate-limit headers optionally

## 2. Server Component / Client Component Boundaries
- Audit all `"use client"` directives; keep only interactive components
- Move data-heavy rendering to Server Components with Suspense

## 3. Caching Strategy
- Cache `getCurrentUser()` per-request (already uses `cache()`)
- Add `unstable_cache` or `revalidate` for dashboard aggregates
- Cache reference data (municipalities, barangays, roles) with longer TTL

## 4. Analytics Abstraction (`src/lib/analytics.ts`)
- Central event taxonomy: `page_viewed`, `feature_used`, `action_completed`, `error_occurred`
- Privacy-aware: no PII, no session secrets, minimal properties
- Server-side event logging to audit or external provider

## 5. Database Query Optimization
- Add pagination to children list, users list, notifications, audit logs
- Ensure indexes cover filter/sort patterns
- Use `limit` + `offset` or cursor pagination where appropriate

## 6. Reliability / Idempotency
- Add idempotency keys for mutation actions (register, duplicate review, validation submit)
- Implement rollback patterns for optimistic updates
- Improve error boundaries and structured error responses
