# Codebase Analysis

## Directory Structure (major)
```
src/
  app/                 # App Router (routes + route handlers + layout + pages)
  components/          # Shared, feature, and UI components
  db/                  # Drizzle schema + connection
  lib/                 # Auth, constants, permissions, queries, reports, forecasting, schemas, utilities
  actions/             # Server Actions (auth, students, grades, health, duplicates, settings, etc.)
  hooks/               # (need to inspect)
public/                # Assets, icons
scripts/               # Seed, generate-brand-icons
.drizzle/              # Migrations
```

## Routes (App Router)
- Root (`/`) — public landing; redirects signed-in users to `/dashboard`
- `/login`, `/logout/route.ts`, `/verify/*`
- `/welcome/page.tsx`
- `/dashboard`, `/settings`, `/notifications`
- `/students/*`, `/grades`, `/performance`, `/development`, `/health`, `/verification`, `/duplicates`, `/reports/*`, `/qr`, `/activity-logs`
- `/employees/*`, `/service-credits`
- `/privacy`
- `/robots.ts`

## Layouts
- `src/app/layout.tsx` — root layout with metadata, viewport, globals.css import
- `src/app/(app)/layout.tsx` — protected app layout; uses `getCurrentUser()` and redirects unauthenticated users to `/login`
- `AppShell` component provides sidebar, header, main content area, footer, skip-to-content link

## Database Schema Highlights
- Large SQLite schema (`src/db/schema.ts`) covering users, roles, permissions, sessions, students, enrollments, grades, subjects, grading periods, attendance, behavior, health, assessments, interventions, verifications, duplicates, QR verifications, reports, forecasts, notifications, audit logs, system settings, employees, 201 records, service credits.
- Relations defined with `relations()` for typed relational queries.
- Indexes present for common query patterns.
- No schema migrations directory shown (drizzle migrations may be in `.drizzle/` or generated via `db:migrate`).

## Key Components
- `components/app-shell.tsx` — server component that reads user and filters nav by permission; renders sidebar, header, footer
- `components/logo.tsx` — brand asset exports
- `components/ui/*` — card, button, table, badge, tooltip, field, states, print-button
- `components/dashboard/*`, `components/performance/*`, `components/forecast/*`
- `components/grades/*`, `components/students/*`, `components/health/*`
- `components/welcome/*` — landing page components
- `components/loading/*` — skeletons, page-transition, section-boundary

## Auth System
- Custom session cookies (`sms_session`) with SHA-256 token hashes stored in DB.
- `getCurrentUser()` uses `cache()` for dedup per render.
- `requireUser()`, `requirePermission()`, `getAuthorizedUser()` provide page/action guards.
- `createSession()` / `destroySession()` manage DB + cookie.
- Role mapping from DB `roles.id` to `Role` key.
- `hasPermission()` checks `ROLE_PERMISSIONS` matrix.

## Server Actions (`src/actions/`)
- `auth.ts`, `students.ts`, `grades.ts`, `health.ts`, `duplicates.ts`, `employees.ts`, `interventions.ts`, `notifications.ts`, `qr.ts`, `records.ts`, `settings.ts`, `users.ts`, `helpers.ts`
- No centralized validation layer visible; each action likely validates independently.

## API Routes (`src/app/api/`)
- `/api/forecasts/route.ts`
- `/api/form137/[id]/route.ts`
- `/api/report-card/[id]/route.ts`
- `/api/reports/[type]/route.ts`

## Dependencies
- **UI/Interaction**: `lucide-react`, `framer-motion`, `recharts` (dashboard charts)
- **Forms**: `react-hook-form`, `@hookform/resolvers`, `zod` (validation)
- **PDF**: `@react-pdf/renderer` (official document generation)
- **Database**: `drizzle-orm`, `@libsql/client`
- **Auth**: `bcryptjs`
- **QR**: `qrcode`, `@zxing/browser`
- **Excel/Import**: `exceljs`
- **Analytics/Forecasting**: `arima`
- **Testing**: `vitest`
- **Dev**: `eslint`, `typescript`, `sharp`, `tsx`, `dotenv`, `tailwindcss`, `postcss`

## Key Observations (pre-change)
- `next.config.ts` has `turbopack: {}`, `productionBrowserSourceMaps: false`, `compiler.removeConsole`, `typescript.ignoreBuildErrors: false`, custom security headers (`CSP`, `X-Frame-Options`, etc.), `serverExternalPackages: ["@react-pdf/renderer"]`, `webpack` config with `watchOptions.ignored` and `symlinks: true`.
- `.env` exists with real values; `.env.local` also exists. Must not read secret contents.
- `package-lock.json` and `pnpm-lock.yaml` both present; package manager may be ambiguous.
- `dev-dashboard-verify.db` exists in root; `local.db` is the SQLite DB.
- The codebase uses App Router correctly (layouts, route groups via `(app)`, route handlers).
- No `middleware.ts` or `middleware` file observed yet.
- Several docs/plans exist; architecture is well-documented.
- TypeScript strict mode enabled; `skipLibCheck: true`.
- Testing framework is `vitest`; test files exist under `src/lib/__tests__/`.

## Potential Issues (to verify in detail)
- `src/app/page.tsx` uses `force-dynamic` to prevent prerendering; this is a valid security measure for cookie-aware pages but may affect performance.
- `next.config.ts` CSP has `'unsafe-inline'` and `'unsafe-eval'` in `script-src`; this is a security concern.
- `turbopack: {}` is minimal; no significant turbopack customization.
- `webpack` ignores `local.db` and `*.db`; this prevents file-watching loops but should be verified safe.
- There is a `.kilo/` directory (agent workspace); `.gitignore` excludes `.kilo/`.
- `postcss.config.mjs` and `tailwindcss` v4 (`@tailwindcss/postcss`) — Tailwind v4 config may be different from v3.
- `globals.css` uses `@import "tailwindcss"` which is Tailwind v4 syntax.
- No `middleware.ts` file found; authentication relies solely on layout-level redirect, which may miss some edge cases.
- The `next.config.ts` `headers()` applies security headers globally; need to verify CSP compatibility with React hydration and any inline scripts.
