# Architecture Review

## Routing Architecture
- **App Router** (`src/app/`) is fully adopted.
- Route groups `(app)` used for protected app layout.
- Dynamic route segments (`[id]`, `[token]`, `[type]`) present.
- Route handlers (`route.ts`) used for forecasts, PDF generation, reports.
- No evidence of `pages/` directory remaining; migration complete.

## Layout Structure
- Root layout (`layout.tsx`) defines metadata, viewport, CSS import.
- `(app)/layout.tsx` performs auth check (`getCurrentUser()`) and redirects to `/login`. This is a standard protected layout pattern.
- No nested layout usage beyond root + app.
- `loading.tsx` and `error.tsx` exist at multiple levels; good practice.
- No `not-found.ts` observed besides root; some feature routes may lack custom 404 handling.

## Server Components (SC)
- `AppShell` is an async SC (`export default async function AppShell`). It reads user, filters nav by permission, fetches unread notification count. This is appropriate: no interactivity required.
- Most pages are likely SCs (need to inspect more). Pages using `useState` or event handlers will need `"use client"`.

## Client Components (CC)
- `"use client"` usage needs systematic audit (many interactive components: sidebar, mobile nav, forms, charts).
- `nav-icons.tsx` likely resolves icon names to components; may be a CC.
- `mobile-nav-toggle.tsx`, `logout-button.tsx` likely CC.
- `components/ui/*` may include both SC and CC variants.

## Server Actions
- `src/actions/` contains mutation logic.
- Each action likely performs independent validation; no centralized validation service observed.
- Actions need authorization checks (`getAuthorizedUser()` or similar). Must verify that every mutation checks authorization independently.
- No evidence of `revalidatePath` or `revalidateTag` usage in actions; mutation invalidation strategy must be audited.

## Data Access
- Database queries are primarily through `drizzle-orm` in `src/lib/` and actions.
- `src/lib/queries.ts` likely provides query helpers.
- No repository abstraction layer; queries directly use `db.select(...).from(...)`.
- For simple applications this is acceptable; for larger applications a service/repository layer may improve testability.

## External APIs / Services
- `arima` forecasting library used for predictions; not an external HTTP service.
- `@react-pdf/renderer` used for server-side PDF rendering (requires external package handling).
- `@zxing/browser` used for QR scanning (client-side).
- No external REST APIs called from the application (no `fetch()` to third-party endpoints observed in key files).

## State Management
- No global state library (Redux, Zustand, etc.) observed.
- URL state likely managed via search params or route segments.
- Local UI state handled by React `useState` / `useReducer`.
- Auth state is server-side (cookie-based session); no client-side auth context needed.

## Caching / Rendering
- `force-dynamic` on root page; other routes may use default static/dynamic behavior.
- No explicit `revalidate` or `export const revalidate` values observed in pages inspected.
- No `fetch()` from Server Components with `cache` or `next.revalidate` options inspected yet.

## Code Organization
- `features/` folder not present; components organized by domain (`dashboard/`, `performance/`, `forecast/`, `welcome/`, etc.).
- `components/` contains shared UI (`ui/`), layout (`app-shell`, `logo`), and feature components.
- `lib/` contains business logic, auth, queries, forecasting, reporting.
- `actions/` contains mutations.
- This organization is coherent; no major restructuring needed unless duplication is found.

## Key Architectural Risks
1. **CSP in `next.config.ts`**: `script-src 'self' 'unsafe-inline' 'unsafe-eval'` weakens Content Security Policy. If inline scripts are used (e.g., React hydration), this may be required temporarily, but should be minimized.
2. **No middleware**: Auth relies solely on `(app)/layout.tsx`. Route-level protection is sufficient for App Router pages, but API routes (`route.ts`) must enforce authorization independently.
3. **No centralized mutation invalidation**: If mutations don't invalidate caches, stale data may appear after updates.
4. **Direct DB queries from components/actions**: No repository abstraction; acceptable for current scale but may become harder to mock/test.
