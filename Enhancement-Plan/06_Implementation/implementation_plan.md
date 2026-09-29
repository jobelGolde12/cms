# Implementation Plan

## Priorities
- P0 — Middleware / Security / Reliability (missing middleware, session validation)
- P0 — Analytics abstraction (no events tracked currently)
- P1 — Database query optimization (pagination, indexes)
- P1 — Caching strategy (reference data, dashboard)
- P1 — Error handling / reliability (structured errors, rollback)
- P2 — Routing UX (Suspense, loading states)
- P2 — Performance budget / bundle audit

## Phases
1. Middleware (`src/middleware.ts`) + session validation
2. Analytics abstraction (`src/lib/analytics.ts`) + event taxonomy
3. Database pagination (children list, users list, notifications, audit logs)
4. Caching for reference data and dashboard aggregates
5. Idempotency / rate limit for mutation actions
6. Structured error responses and improved error boundaries
7. Performance measurement and verification
