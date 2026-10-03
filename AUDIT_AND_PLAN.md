# Dashboard Routing, Navigation & Performance Audit

Audit Date: 2026-10-03
Framework: Next.js 16.3.5 (App Router), React 19.2.8, TypeScript 5

## 1. CURRENT ROUTING ARCHITECTURE

- Root layout: `src/app/layout.tsx` (global fonts, metadata)
- App group layout: `src/app/(app)/layout.tsx` — async `AppShell` with `getCurrentUser()` auth guard
- Routes under `(app)`:
  - `/dashboard` — overview + KPIs + charts + tables
  - `/children` — registry with filters/pagination
  - `/children/[id]` — profile
  - `/children/[id]/edit` — edit form
  - `/children/new` — add form
  - `/validation` — validation queue
  - `/duplicates` — duplicate review
  - `/monitoring` — monitoring + interventions
  - `/monitoring/[type]` — type-specific monitoring
  - `/monitoring/interventions` — interventions
  - `/reports` — report generation
  - `/qr` — QR studio
  - `/activity-logs` — audit log viewer
  - `/notifications` — notification center
  - `/users` — user management
  - `/settings` — settings/profile
- Navigation: `AppShell` (sidebar + header) preserved across routes (good)
- Client-side links: `next/link` used in `SidebarNav` and components

## 2. BOTTLENECKS IDENTIFIED

### Critical (high impact on navigation feel)

A. `AppShell` is async and calls `getCurrentUser()` + `unreadNotificationCount()` on EVERY route change.
   - This blocks the layout from rendering until DB queries complete.
   - The dashboard shell should not wait for unread count or full user profile refresh.

B. No prefetching: `Link` components have no `prefetch` prop configured.
   - Routes visible in sidebar (`/dashboard`, `/children`, `/validation`, `/duplicates`, `/monitoring`, `/reports`) should prefetch.

C. No granular loading states: `(app)/loading.tsx` is a single generic skeleton.
   - Each major route (`dashboard`, `children`, `validation`, `reports`) should have its own skeleton.

D. `dashboardData()` runs 10+ parallel DB queries (some with sub-selects `exists`).
   - On navigation back to dashboard, all queries re-run with no caching/revalidation strategy.

E. `getCurrentUser()` is called in `AppShell`, `AppLayout`, and individual pages (duplicate auth checks).
   - Should be deduplicated and cached per request.

F. No Suspense boundaries: the entire page is either loading (skeleton) or loaded.
   - Independent sections (e.g., chart vs statistics vs notifications) should load independently.

### Important (medium impact)

G. `SidebarNav` and `NavItemClient` use `usePathname()` — this is fine, but mobile drawer state (`MobileNavToggle`) doesn't respond to navigation until `onNavigate` fires.

H. Active route detection uses `pathname === link.href || pathname.startsWith(link.href + "/")` — works but does not handle query params or child paths cleanly for nested routes.

I. No route-level error boundaries with retry mechanism.

J. No reduced-motion handling for skeleton shimmer animations.

K. `TableSkeleton` and `Skeleton` components exist but are generic; page-specific structures are not represented.

## 3. DASHBOARD ROUTES & DATA DEPENDENCIES

| Route | Data Source | Key Queries | Loading Critical? |
|---|---|---|---|
| `/dashboard` | `dashboardData()` (10 parallel queries) | stats, barangay, education, status, duplicates, activity, monitoring, system | Yes — primary landing page |
| `/children` | `listChildren()`, `registryStats()`, `cohortCounts()`, `listBarangays()`, `listSchools()` | paginated table, filters, stats | Yes — high traffic |
| `/validation` | `validationQueue()`, `validationStats()` | queue list (limit 100), stats | Yes |
| `/duplicates` | `listDuplicates()` | candidate pairs, scores | Yes |
| `/monitoring` | `monitoringOverview()` | type counts | Medium |
| `/reports` | DB `reports` table | recent reports list | Low |
| `/notifications` | `recentNotifications()` | notification list | Low |
| `/settings` | DB `systemSettings` | editable settings | Low |

## 4. LOADING STRATEGY

Current hierarchy:
- `(app)/loading.tsx` — generic route-level skeleton (cards + table skeleton)
- No component-level skeletons for: KPI cards, chart areas, table rows, pagination, filter controls, profile forms
- `TableSkeleton` exists but is basic (rows of gray bars)

Target hierarchy:
- Route loading: stable dashboard shell + route-specific skeleton
- Section loading: independent component skeletons (stats, chart, table, notifications)
- Component loading: button spinners for mutations
- Action loading: inline spinners for mutations

## 5. SKELETON STRATEGY

Requirements from spec:
- Soft placeholder surfaces (`bg-brand-200/70` with subtle shimmer)
- Subtle animated shimmer (current `animate-pulse` is fine but could be smoother shimmer)
- Realistic dimensions matching actual content
- Responsive sizing
- Independent section loading (not blocking the whole page)
- No excessive flashing

Reusable skeleton components needed:
- `DashboardPageSkeleton` — full dashboard page layout skeleton
- `StatsCardSkeleton` — KPI card placeholder
- `ChartSkeleton` — chart container placeholder
- `TableSkeleton` — enhanced with realistic column widths and row heights (exists, needs improvement)
- `TableRowSkeleton` — individual row skeleton
- `SearchBarSkeleton` — search/filter bar skeleton
- `PaginationSkeleton` — pagination bar skeleton
- `ProfileFormSkeleton` — profile/settings form skeleton
- `ValidationTableSkeleton` — validation queue skeleton
- `RegistryTableSkeleton` — registry table skeleton

## 6. CACHING STRATEGY

Based on existing architecture:

Highly dynamic (short cache / revalidate):
- Validation status, submitted records, notifications, live activity (`dashboardData` statistics, `validationQueue`)
- Cache duration: 30-60s, or no cache with `revalidate=30`

Moderately dynamic (medium cache):
- Dashboard statistics, registry counts, reports (`dashboardStats`, `registryStats`)
- Cache duration: 60-120s

Stable (longer cache):
- User role info, school/barangay reference data, static config (`listBarangays`, `listSchools`, user profile fields)
- Cache duration: 5-10 minutes, or longer with manual invalidation after mutations

Cache invalidation after mutations:
- Server actions that modify children/validation should call `revalidatePath` or `revalidateTag`.
- Need to audit all actions (`src/actions/`) for missing `revalidatePath`.

## 7. PREFETCHING STRATEGY

Routes to prefetch (visible in navigation, frequently visited):
- `/dashboard` (primary landing)
- `/children` (core module)
- `/validation` (core module)
- `/duplicates` (core module)
- `/monitoring` (core module)
- `/reports` (operations)
- `/qr` (operations)
- `/notifications` (operations)
- `/settings` (system)

Avoid prefetching:
- Dynamic child profile pages (`/children/[id]`) unless explicitly navigated
- Admin-only pages (`/users`, `/activity-logs`) for non-admin users
- All possible parameter combinations

Implementation:
- Add `prefetch={true}` (default) or `prefetch={false}` selectively on `Link` components.
- In `SidebarNav`, prefetch links that are visible in navigation.
- Do not prefetch hidden/permission-filtered links.

Note: Next.js 16 `Link` prefetches by default for static routes. The issue is that with server components and async data, prefetch may trigger data fetching. We should ensure prefetch doesn't cause unnecessary DB load. For data-heavy pages, we may set `prefetch={true}` but rely on `loading.tsx` for user experience.

## 8. AUTHENTICATION & ROUTE GUARDS

Current behavior:
- `(app)/layout.tsx` calls `getCurrentUser()` — redirects if null
- `AppShell` calls `getCurrentUser()` again
- Individual pages also call `getCurrentUser()`

Optimization:
- Cache `getCurrentUser()` per request using React `cache()` (already done in `auth.ts`)
- Do not call `getCurrentUser()` in `AppShell` if already checked in layout — or keep it but rely on cached result
- Avoid redirect loops: if `AppShell` detects no user, redirect; layout also does it — this is safe but redundant

Flash of unauthorized content:
- Protected routes check auth in layout before rendering — safe
- No content flashes before redirect because `redirect()` throws before any JSX renders
- Good practice maintained

## 9. TRANSITION & ANIMATION

Current state:
- `framer-motion` is installed but not used extensively in dashboard
- No page-level transition animations
- Skeleton uses `animate-pulse`

Target:
- Subtle content fade-in when skeleton replaces with real content
- Navigation state updates immediately (already works via `usePathname`)
- Mobile drawer has `transition-transform duration-300` (good)
- Add `prefers-reduced-motion` support to skeleton animations

Implementation:
- Wrap main content in a container with subtle opacity transition
- Ensure `SidebarNav` active state updates instantly (already instant with `usePathname`)
- Add subtle shimmer animation instead of just pulse for modern feel

## 10. PERFORMANCE MONITORING

Measurements needed (before and after):
- Time from click to skeleton appearance (navigation feedback)
- Time from skeleton to full content (data loading)
- Database query times for `dashboardData()`, `listChildren()`, `validationQueue()`
- Layout shift score (CLS) — skeleton dimensions must match content
- Bundle size impact of new skeleton components

No artificial delays should be added.
No fake setTimeout() loading states.
Skeleton duration must reflect actual loading time.

## 11. ACCESSIBILITY

Requirements:
- `aria-busy="true"` on loading containers (already present in `(app)/loading.tsx`)
- `aria-label` describing loading state
- `prefers-reduced-motion` respected
- Focus management preserved during navigation
- Screen reader announcements for page changes (optional, via `aria-live`)
- Accessible retry buttons for errors
- Keyboard navigation through sidebar remains functional

## 12. ERROR HANDLING & NETWORK FAILURE

Requirements:
- Route-level error boundary with retry mechanism
- Section-level error states (not full page errors for partial data failures)
- Offline/network timeout feedback
- Clear error messages without exposing sensitive details
- Preserve dashboard shell during errors

Current state:
- `global-error.tsx` and `(app)/error.tsx` exist but are minimal
- No granular error boundaries for sections
- No retry mechanism shown in loading components

## 13. SECURITY

Requirements:
- Authentication stays secure (`getCurrentUser()` with cookie + session token hash)
- Authorization enforced server-side (already done via `hasPermission()`)
- Prefetch must not expose protected data to unauthorized users (Next.js handles this: prefetch only loads public/static data; server components re-check auth on render)
- Cache invalidation must not leak stale protected data
- No secrets in client components

## 14. IMPLEMENTATION ORDER

Phase 1 — Audit & Planning (complete)
Phase 2 — Skeleton Component System (reusable components)
Phase 3 — Route-Specific Loading States
Phase 4 — Shell Preservation & Navigation Optimization
Phase 5 — Prefetching Strategy
Phase 6 — Data Fetching & Caching Optimization
Phase 7 — Error Boundaries & Network Handling
Phase 8 — Transitions & Animation
Phase 9 — Accessibility & Reduced Motion
Phase 10 — Performance Validation
Phase 11 — Final Audit
