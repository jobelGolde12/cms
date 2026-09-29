# Current Architecture

## Stack
- Next.js 16.3.5 (App Router)
- React 19.2.8
- TypeScript 5
- Tailwind CSS v4
- Drizzle ORM 0.45.2 + SQLite (@libsql/client)
- Vitest for testing
- Framer Motion for animations

## Key Directories
- `src/app/` — App Router pages, layouts, error boundaries
- `src/actions/` — Server actions (auth, children, duplicates, monitoring, notifications, settings, users, qr, register, interventions, get-barangays)
- `src/components/` — UI primitives, forms, navigation
- `src/lib/` — Auth, permissions, queries, audit, reports, rate-limit, schemas
- `src/db/` — Drizzle schema (`schema.ts`) + index (`db/index.ts`)

## Routing Structure
- `(app)` route group for protected application pages
- `/login`, `/register`, `/welcome`, `/verify` for public/auth flows
- `/children/[id]`, `/children/new`, `/dashboard`, `/reports`, `/settings`, `/users`, `/notifications`, `/monitoring`, `/validation`, `/duplicates`, `/qr`, `/activity-logs`

## Auth / Authorization
- Cookie session (`SESSION_COOKIE_NAME`) with SHA-256 hashed token
- `getCurrentUser()` uses `cache()` for request-level dedup
- RBAC via `roles` → `permissions` join (`src/lib/permissions.ts`)
- Page guards: `requireUser()`, `requirePermission()` redirect when missing
- Action guards: `getAuthorizedUser()` returns null instead of redirect

## Database Patterns
- All tables use text UUID primary keys
- Indexes exist for common query paths (children, addresses, education, monitoring, interventions, duplicate candidates, notifications, audit logs)
- Relationships defined in schema but not always used in queries (some use raw `db.select()`)
- No pagination in list pages currently (potential N+1 / large result risks)
- No middleware-level session validation

## Middleware / Proxy
- `next.config.ts` applies CSP and security headers globally
- No `src/middleware.ts` or `middleware/proxy` layer
- Rate limiting (`src/lib/rate-limit.ts`) is in-memory only (process-level), not shared
- `proxy.ts` exists at root (need to inspect)
