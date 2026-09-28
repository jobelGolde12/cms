# Current System Architecture

## High-Level Stack
```
Browser
  │
  ▼
Next.js 16 (App Router) + React 19
  ├── Public routes (welcome, login, register, verify, root)
  └── Protected routes ((app) layout → AppShell)
        │
        ▼
Server Components / Client Components
        │
        ▼
Server Actions (`use server`) / API Routes (`route.ts`)
        │
        ▼
Zod Validation (`lib/schemas.ts`)
        │
        ▼
Drizzle ORM (`src/db/index.ts` → `src/db/schema.ts`)
        │
        ▼
SQLite (`local.db` file) or Turso/libSQL remote (`TURSO_DATABASE_URL`)
```

## Component Boundaries
- **Server Components**: All `page.tsx` files inside `(app)/` (dashboard, children, validation, duplicates, monitoring, reports, settings, users, notifications, qr, activity-logs). They fetch data directly via `await db.select()` or `await getCurrentUser()`.
- **Client Components**: `app-shell.tsx`, `child-form.tsx`, `login/page.tsx`, `register/page.tsx`, `sidebar-nav.tsx`, `mobile-nav-toggle.tsx`, `nav-icons.tsx`, `archive-child-button.tsx`, `logout-button.tsx`, `dashboard/primitives.tsx` (icon registry is server-safe but components are client-rendered).
- **Mixed Pattern**: Server pages (`ChildrenPage`) import client form (`ChildForm`). Client actions (`createChild`) are called via `useActionState` inside the client component.

## Authentication Flow
```
Login Page (`login/page.tsx`) → `login` action (`actions/auth.ts`)
  → `performLogin` (FormData → Zod → DB user lookup)
    → `verifyPassword` (bcrypt.compare)
    → `findDefaultCredential` (fallback for dev accounts)
    → `createSession` (random token → DB insert `sessions` → cookie set)
    → `db.update(users)` (lastLoginAt)
    → `logAudit` (LOGIN audit entry)
    → redirect to `/dashboard`
```

Session resolution (`getCurrentUser` in `lib/auth.ts`):
```
Cookie `cms_session` (opaque token)
  → SHA-256 hash
  → DB query (`sessions` INNER JOIN `users` INNER JOIN `roles`)
  → Filter by `tokenHash` and `expiresAt > new Date()`
  → Return `SessionUser` with `role` mapped from DB `roles.name`
```

No refresh mechanism. Session expires naturally (`SESSION_TTL_MS`). Logout deletes DB session row and clears cookie.

## Authorization Flow (Per Action)
Every server action (`actions/*.ts`) starts with:
```
const user = await getAuthorizedUser("permission.name");
if (!user) return fail("...");
```
This enforces server-side permission checks independently of UI. The UI also checks `hasPermission()` for cosmetic filtering (e.g., `visibleLinks` in `app-shell.tsx`).

Row-level scope (`lib/scope.ts`):
- `admin` / `lgu`: `undefined` (no filter) → full municipality
- `barangay`: `or(eq(children.barangayId, user.barangayId), eq(children.createdBy, user.id))`

Every query that reads `children` applies `childScope(user)` via `childFilters()` (`lib/queries.ts`). This ensures no route can leak records outside scope by calling the query directly.

## Database Interaction Pattern
- `db.select()` / `db.insert()` / `db.update()` / `db.delete()` from `src/db/index.ts`
- Transactions (`db.transaction(async (tx) => {...})`) used in `createChild`, `updateChild`, `reviewValidation`, `archiveChild`, `reopenChild`
- Queries use `innerJoin`, `leftJoin`, `and()`, `or()`, `inArray()`, `sql` expressions (`exists` sub-queries)

## Report Flow
```
Reports Page (`reports/page.tsx`) → links to `/api/reports/[type]?format=pdf` or `xlsx`
  → API Route (`api/reports/[type]/route.ts`)
    → `getCurrentUser()` (401 if missing)
    → `hasPermission(user.role, "reports.export")` (403 if missing)
    → `buildReport()` (query scoped by `childScope()`)
    → `db.insert(reports)` (metadata)
    → `db.insert(reportExports)` (format + file reference)
    → `renderReportPdf()` / `renderReportExcel()`
    → `NextResponse` with download headers
```

Note: `buildReport()` creates PDF via `@react-pdf/renderer` (`lib/reports/pdf.tsx`) and Excel via `exceljs` (`lib/reports/excel.ts`). File bytes are returned directly; only metadata (`fileReference`) is stored in DB.

## State Management
- No external state library (Redux, Zustand, etc.).
- Server actions return `ActionState` (`{ ok: true/false; message?: string; redirectTo?: string; error?: string; fieldErrors?: Record<string, string> }`).
- Client components use `useActionState(action, initial)` (React 19 feature) to bind forms to server actions.
- No global client-side state (no `Context` providers for user/auth). User is resolved per-request via server component (`getCurrentUser` with `cache()`).
- Navigation active state computed client-side (`usePathname` in `sidebar-nav.tsx`).

---

This architecture supports a single-instance or horizontally scaled deployment (with shared DB). No middleware means every protected route must explicitly call `getCurrentUser()`; missing this call creates an unprotected route.
