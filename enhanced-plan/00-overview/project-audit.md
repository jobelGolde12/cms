# Project Audit Summary

## Audit Scope
Full read-only inspection of the Next.js 16 CMS codebase. No files modified.

## Application Type
Municipal child-mapping information management platform (`child-mapping-system` v0.1.0, private).

## Framework & Versions
- Next.js 16.3.5 (App Router, `turbopack` enabled in `next.config.ts`)
- React 19.2.8
- TypeScript 5 (`strict` implied by `tsconfig.json`)
- Tailwind CSS v4 (`@tailwindcss/postcss`)
- Drizzle ORM 0.45.2 (`sqlite-core` via `@libsql/client`)
- Zod 4.6.5, React Hook Form 7.88.0, Vitest 3.2.7

## Routing Architecture
- Root layout (`src/app/layout.tsx`) — public pages (welcome, login, register, verify, root redirect)
- App layout (`src/app/(app)/layout.tsx`) — protected by `getCurrentUser()` redirect to `/login`
- No `middleware.ts` file exists.
- Route groups: `(app)` for authenticated content.

## Rendering Strategy
- Server Components (RSC) by default for pages (`page.tsx` files are mostly server components with `async` data fetching)
- Client Components (`"use client"`) for interactive elements: `app-shell.tsx`, `child-form.tsx`, `login/page.tsx`, `register/page.tsx`, `sidebar-nav.tsx`
- Mixed patterns: server pages import client form components (`ChildForm`).

## Authentication Architecture
- Session-based cookie (`SESSION_COOKIE_NAME = "cms_session"`) via `cookies()` from `next/headers`
- `hashToken()` uses SHA-256 of opaque 32-byte base64url token (`randomBytes(32)`)
- `bcryptjs` password hashing (`hashPassword` cost 10)
- `getCurrentUser()` uses `cache()` from `react` (per-request deduped)
- Session TTL: 8 hours (`SESSION_TTL_MS`), 7 days for `rememberMe`
- No refresh token mechanism. Session deletion on logout (`destroySession`).
- Rate limiting: in-memory (`src/lib/rate-limit.ts`) — 10 attempts per minute per `(ip + "|login")` key.

## Authorization Architecture
- Three roles: `admin`, `lgu`, `barangay` (`ROLES` in `constants.ts`)
- Permission array (`PERMISSIONS`) with module/action split (e.g., `children.view`, `validation.review`, `reports.export`)
- `ROLE_PERMISSIONS` map defines role capabilities
- `hasPermission(role, permission)` checks inclusion
- `getAuthorizedUser(permission)` returns user or `null` (used by server actions)
- `requirePermission()` redirects to `/dashboard?denied=` (page-level)
- `childScope()` applies row-level filtering (`barangay` users see their barangay + records they created; `lgu`/`admin` see all)
- `canAccessChild()` checks scope before reading a single record
- `canEditChild()` prevents editing `verified` records unless `admin`

## Database Architecture
- SQLite (local file `local.db` or Turso/libSQL remote via `TURSO_DATABASE_URL`)
- Drizzle ORM schema in `src/db/schema.ts` (761 lines, extensive relationships)
- Tables: `roles`, `permissions`, `role_permissions`, `municipalities`, `barangays`, `schools`, `users`, `sessions`, `children`, `child_addresses`, `child_education`, `child_eccd`, `child_disabilities`, `child_validations`, `child_duplicate_candidates`, `child_monitoring`, `interventions`, `intervention_followups`, `qr_verifications`, `reports`, `report_exports`, `notifications`, `audit_logs`, `system_settings`
- Primary keys: text (`crypto.randomUUID()`) except `roles` and `permissions` which have stable IDs (`role-admin`, `role-lgu`, `role-barangay`, `perm-...`)
- Foreign keys with `onDelete: cascade` for child-related tables; `onDelete: set null` for audit/user references
- Indexes cover common read patterns (email, role, barangay, status, createdAt, recordStatus)

## Data Flow (Important Path: Child Registry)
```
User (UI) → ChildForm (client) → createChild/updateChild (action) → Zod validation → DB transaction (children + addresses + education + eccd + disabilities) → audit log + revalidatePath → response state → UI update
```

Important: `createChild` performs sequential code generation (`nextChildCode`) with one retry on collision. `updateChild` supersedes address and education records (marks old as `isCurrent: false`, inserts new). `archiveChild` sets `status: "archived"` (soft delete) and revokes QR tokens.

Validation flow: `pending_validation` → validator reviews (`reviewValidation`) → updates `child_validations` (approved/needs_correction/rejected) + updates `children.recordStatus` via `REVIEW_DECISION_TO_RECORD_STATUS` workflow map (`src/lib/workflow.ts` not fully read, referenced in actions/children.ts line 27).

Duplicate flow: `detectDuplicates()` calculates score (name 40 + middle 10 + birth_date 35 + barangay 15) and creates `child_duplicate_candidates` (pending). Human review (`reviewDuplicate`) updates candidate status and can mark newer record as `marked_duplicate`.

Monitoring flow: `childMonitoring` records with types (`education`, `out_of_school_youth`, `eccd`, `disability`, `general`) and statuses (`open`, `in_progress`, `resolved`, `closed`). `interventions` have follow-ups (`intervention_followups`).

Report flow: `reports` table stores metadata (`name`, `reportType`, `scope`, `filtersJson`). `reportExports` stores format and file reference (not file bytes). API route (`/api/reports/[type]`) builds query (`buildReport`), renders PDF (`@react-pdf/renderer`) or Excel (`exceljs`), and returns file download.

## Key Features Implemented
- Child registry (create, edit, archive, filter, pagination)
- Validation workflow (submit, approve, return, reject, reopen)
- Duplicate detection (candidate pairing, human review)
- Monitoring & interventions (case tracking, follow-ups)
- Reports (PDF / XLSX export, summary tables)
- QR verification (token generation, public `/verify`, token lookup `/verify/result`)
- Notifications (in-app list, mark-all-read action)
- Activity audit logs (append-only, action/entity tracking)
- User management (create/update/disable, role-based access, profile/password updates)
- System settings (`system_name`, `child_code_prefix`, `default_school_year`, `maintenance_mode`)
- Public surfaces: landing (`welcome`), login, register, verify

## Key Features Partially Implemented / Gaps
- No middleware-based session/auth gate.
- Rate limiting is process-local only.
- No automated coverage for critical flows (tests minimal).
- `proxy.ts` referenced in README but not fully inspected.
- No middleware-level authorization for `/api/reports/[type]` (only handler-level check).
- Some content placeholders remain (`"No records yet"`, `"No notifications yet"`).
- `settings.manage` checks `hasPermission(user.role, "settings.manage")` but `PERMISSIONS` array includes `"settings.manage"` — this is correct.
- `audit_logs` table has `userAgent`, `ipAddress` fields; audit entries record these.

## Issues Discovered (Not Yet Fixed)
- **No middleware** (`middleware.ts` missing). (Documented in `01-codebase/routing/` and `09-security/`)
- **No centralized route guard middleware** (rely on layout redirect). (Documented in `03-authentication/authentication/`)
- **Rate limit store is in-memory** (not scalable). (Documented in `08-performance/backend/` and `09-security/input-validation/`)
- **Testing coverage minimal** (only 5 test files, covering queries/schemas/utils/scope/workflow, no component/API/E2E). (Documented in `10-testing/`)
- **No middleware-level CSP or security headers enforcement** (only `next.config.ts` headers). (Documented in `09-security/authentication/`)
- **No `proxy.ts` inspection completed** (referenced but not fully audited). (Documented in `01-codebase/structure/`)
- **Some accessibility gaps** (e.g., `register` checkbox requires manual agreement but has no `aria-required` link; `notifyValidators` best-effort may miss users). (Documented in `07-ui-logic/accessibility/`)

---

The full detailed audit of each component, page, action, database table, and security concern is documented in the subfolders below.
