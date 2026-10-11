# Sta. Magdalena Records Management System

**Student Records & Performance Analytics Portal** for Sta. Magdalena National High School, Sorsogon (Region V — Bicol). Built for authorized school personnel to manage student profiles, enrollment, academic performance, attendance, behavior tracking, interventions, verification, and reporting — with server-enforced role-based access control (RBAC) and full audit logging.

> Protected under **RA 10173** (Data Privacy Act) and aligned with the **DepEd Child Protection Policy**. All sensitive data stays server-side; session cookies are `httpOnly`, `sameSite: lax`, and `secure` in production HTTPS deployments.

---

## Overview

This application is a modern, internal **school records and analytics platform**. It replaces fragmented paper-based tracking with a centralized, auditable digital system covering:

- **Student registry** (profiles, enrollment history, grade levels, sections)
- **Academic records** (subjects, grading periods, grades, averages)
- **Performance monitoring** (reading, literacy, numeracy assessments with configurable levels)
- **Attendance** (present, absent, late, excused/unexcused)
- **Student development** (behavior observations, interventions with follow-ups)
- **Record verification workflow** (draft → pending → verified / needs correction / marked duplicate)
- **Duplicate detection** (candidate pair review)
- **Public QR verification** (token-based student record confirmation with data minimization)
- **Reporting** (PDF, Excel, CSV exports across school, grade-level, and section scopes)
- **Audit trail** (append-only action logs for sensitive operations)

### Who it is for

| Role | Typical use |
|---|---|
| **Administrator (`admin`)** | Full access — user management, settings, audit logs, system-wide reports, verification reviews |
| **School Administrator (`school_admin`)** | School-level oversight — enrollment, grades, attendance, reports, verification, student records |
| **Teacher (`teacher`)** | Student profiles, grades, attendance, behavior, assessments, interventions, reports |
| **Records Personnel (`records`)** | Student data entry/update, enrollment, grades, attendance, verification, reports |
| **Guidance Personnel (`guidance`)** | Student profiles, behavior, assessments, interventions, attendance, reports |

Accounts are **provisioned internally** by the System Administrator. There is no public self-registration flow for production.

---

## Features

### Student Registry
- Create, search, filter, edit, and archive student profiles
- Manage grade-level assignments, sections, and enrollment history
- Filter by lifecycle: active, inactive, archived, all

### Enrollment & Sections
- School year, grade level, and section management
- Enrollment status tracking (active, completed, transferred, withdrawn)
- Section-level coverage analytics

### Academic Performance
- Subject grades across grading periods
- Grade averages and trend tracking
- Grade-level and section comparison reports

### Attendance
- Daily attendance recording (present, absent, late, excused, unexcused)
- Per-student and aggregate attendance reports

### Student Development
- Behavior observations (positive / concern categories, severity tracking)
- Reading, literacy, and numeracy assessment levels (configurable per school settings)
- Interventions (planned → active → completed / discontinued) with scheduled follow-ups
- Monitoring flags for students who may require additional support

### Verification & Duplicates
- Record status workflow: `draft` → `pending_validation` → `verified` / `needs_correction` / `marked_duplicate`
- Duplicate candidate detection and review workflow
- Re-opening verified records is admin-only

### QR Verification (`/verify`)
- Public, token-based lookup with minimal information disclosure
- Confirm a student record is registered with the school without exposing full profiles

### Reports & Exports
- 15+ built-in report types (master list, enrollment, grades, attendance, behavior, assessments, interventions, performance comparisons)
- Export formats: PDF, XLSX, CSV
- Scope filtering: school-wide, grade-level, or section-level

### User Management & RBAC
- User lifecycle: create, update, disable
- Server-enforced permissions (`src/lib/permissions.ts`)
- Role-scoped data access for section and grade-level visibility

### Notifications & Audit
- In-app notification list for system events
- Append-only audit log (`audit_logs`) for sensitive actions
- Session tracking (IP, user agent, 8-hour TTL with auto-revoke)

---

## Screenshots & Demo

No screenshots are included in this repository. The landing page (`/welcome`) and login page (`/login`) render a clean institutional design using the school's brand identity (navy `brand-*` palette, Fira Sans typography, editorial layout).

There is no public live demo. To preview the system locally, follow the [Installation](#installation) steps below.

---

## Technology Stack

### Frontend
- **Framework**: Next.js 16.3.5 (App Router, React Server Components, Server Actions)
- **UI**: React 19.2.8, Tailwind CSS 4, `lucide-react` icons
- **Forms / Validation**: React Hook Form, Zod, `@hookform/resolvers`
- **Charts**: Recharts
- **Animation**: Framer Motion

### Backend
- **Runtime**: Node.js 20+
- **Language**: TypeScript 5 (strict mode, `noEmit` in production build)
- **Server Actions**: Next.js App Router (`src/actions/`)
- **API Routes**: Route handlers for report exports (`src/app/api/reports/[type]/`)

### Database
- **Engine**: Turso / libSQL (SQLite-compatible)
- **ORM / Query**: Drizzle ORM + Drizzle Kit (`drizzle-orm`, `drizzle-kit`)
- **Local file**: `local.db` (development only; falls back to file-based SQLite when no remote URL is configured)
- **Migrations**: `drizzle/` directory; `npm run db:generate`, `npm run db:migrate`
- **Schema**: `src/db/schema.ts` (all domain tables)

### Auth & Security
- **Sessions**: `httpOnly`, `sameSite: lax`, `secure` via `SESSION_COOKIE_SECURE`
- **Passwords**: `bcryptjs` (cost 10)
- **RBAC**: Server-side permission matrix (`src/lib/permissions.ts`)
- **Security headers**: CSP, X-Frame-Options (`DENY`), X-Content-Type-Options (`nosniff`), Referrer-Policy (`strict-origin-when-cross-origin`), Permissions-Policy configured in `next.config.ts`

### Reports
- **PDF**: `@react-pdf/renderer`
- **Excel**: `exceljs`

### QR
- **Generation**: `qrcode`
- **Scanning / Reading**: `@zxing/browser`

### Testing & Quality
- **Test runner**: Vitest (`vitest.config.ts`)
- **Lint**: ESLint 9 (`eslint.config.mjs`) — Next.js core-web-vitals + TypeScript
- **Type check**: TypeScript compiler (`next build` ignores `ignoreBuildErrors: false`)

---

## Requirements

- **Node.js**: 20+ (recommended; project uses modern Next.js 16 APIs)
- **Package manager**: `npm`, `pnpm`, or `yarn` (`package-lock.json` and `pnpm-lock.yaml` are both present — pick one and stay consistent)
- **Database (development)**: SQLite file (`local.db`) — no separate server required
- **Database (production)**: Turso account with `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
- **HTTPS (production)**: Required for `SESSION_COOKIE_SECURE=true`

---

## Installation

```bash
git clone https://github.com/jobelGolde12/cms.git
cd cms

# Install dependencies (use one package manager)
npm install
# or: pnpm install
# or: yarn install
```

### Environment configuration

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Database — use file-based SQLite locally
TURSO_DATABASE_URL=file:./local.db
# For remote Turso, set:
# TURSO_DATABASE_URL=libsql://...
# TURSO_AUTH_TOKEN=...

# Legacy fallback variables (optional)
# LIBSQL_URL=file:./local.db
# LIBSQL_AUTH_TOKEN=

# Session cookie security — false for local HTTP; true in production HTTPS
SESSION_COOKIE_SECURE=false

# Public base URL for QR links
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Default accounts (development)

Generate bcrypt hashes with:

```bash
node -e "require('bcryptjs').hash('your-password', 10).then(console.log)"
```

Then set in `.env.local`:

```env
DEFAULT_ADMIN_EMAIL=
DEFAULT_ADMIN_PASSWORD_HASH=
DEFAULT_ADMIN_FIRST_NAME=
DEFAULT_ADMIN_LAST_NAME=
DEFAULT_ADMIN_ROLE=admin

DEFAULT_SCHOOL_ADMIN_EMAIL=
DEFAULT_SCHOOL_ADMIN_PASSWORD_HASH=
DEFAULT_SCHOOL_ADMIN_FIRST_NAME=
DEFAULT_SCHOOL_ADMIN_LAST_NAME=
DEFAULT_SCHOOL_ADMIN_ROLE=school_admin

DEFAULT_TEACHER_EMAIL=
DEFAULT_TEACHER_PASSWORD_HASH=
DEFAULT_TEACHER_FIRST_NAME=
DEFAULT_TEACHER_LAST_NAME=
DEFAULT_TEACHER_ROLE=teacher

DEFAULT_RECORDS_EMAIL=
DEFAULT_RECORDS_PASSWORD_HASH=
DEFAULT_RECORDS_FIRST_NAME=
DEFAULT_RECORDS_LAST_NAME=
DEFAULT_RECORDS_ROLE=records

DEFAULT_GUIDANCE_EMAIL=
DEFAULT_GUIDANCE_PASSWORD_HASH=
DEFAULT_GUIDANCE_FIRST_NAME=
DEFAULT_GUIDANCE_LAST_NAME=
DEFAULT_GUIDANCE_ROLE=guidance
```

> **Note**: Roles must match exactly: `admin`, `school_admin`, `teacher`, `records`, `guidance`. Never commit real password hashes or credentials.

### Database setup

```bash
# Push schema to the database (Drizzle Kit)
npm run db:push
# or generate migrations then apply:
# npm run db:generate
# npm run db:migrate

# Seed reference data + demo students (idempotent)
npm run seed
```

The seed script creates the school, grade levels, sections, roles, permissions, default users from environment variables, and fictional student records for development. It does not use real student data.

---

## Running the Project

### Development server

```bash
npm run dev
```

Open `http://localhost:3000`. Signed-in users are redirected to `/dashboard`; others see the public welcome page (`/welcome`).

### Production build

```bash
npm run build
```

### Production start

```bash
npm run start
```

---

## Environment Variables

All sensitive variables are **server-only**. Never prefix them with `NEXT_PUBLIC_` (except `NEXT_PUBLIC_APP_URL`).

| Variable | Required | Description |
|---|---|---|
| `TURSO_DATABASE_URL` | Yes* | libSQL URL: `file:./local.db` or `libsql://...` |
| `TURSO_AUTH_TOKEN` | Remote only | Turso auth token |
| `LIBSQL_URL` | Legacy | Fallback if `TURSO_DATABASE_URL` unset |
| `LIBSQL_AUTH_TOKEN` | Legacy | Fallback if `TURSO_AUTH_TOKEN` unset |
| `SESSION_COOKIE_SECURE` | Prod (`true`) | Set `"true"` when using HTTPS |
| `NEXT_PUBLIC_APP_URL` | Optional | Base URL for QR verification links |

### Default account variables (development only)

| Prefix | Variables | Role |
|---|---|---|
| `DEFAULT_ADMIN_*` | `EMAIL`, `PASSWORD_HASH`, `FIRST_NAME`, `LAST_NAME`, `ROLE` (`admin`) | System Administrator |
| `DEFAULT_SCHOOL_ADMIN_*` | Same pattern; `ROLE=school_admin` | School Administrator |
| `DEFAULT_TEACHER_*` | Same pattern; `ROLE=teacher` | Teacher |
| `DEFAULT_RECORDS_*` | Same pattern; `ROLE=records` | Records Personnel |
| `DEFAULT_GUIDANCE_*` | Same pattern; `ROLE=guidance` | Guidance Personnel |

> *If neither Turso nor `LIBSQL_URL` is set, the application falls back to `file:./local.db`.

---

## Available Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server (increased Node heap, optimized watch exclusions) |
| `npm run build` | Production build (`next build --webpack`) |
| `npm run start` | Production server (`next start`) |
| `npm run lint` | ESLint (`eslint`) |
| `npm run db:push` | Push schema to the database |
| `npm run db:generate` | Generate SQL migrations |
| `npm run db:migrate` | Apply migrations |
| `npm run seed` | Seed reference + demo data (idempotent) |
| `npm run test` | Run Vitest (`vitest run`) |

---

## Project Structure

```
.
├── drizzle/                 # Generated SQL migrations
├── documentation/           # Auth docs, production checklist, database notes,
│                            # feature docs, security docs, testing docs
├── scripts/
│   └── seed.mts             # Development seed (reference + demo students)
├── public/                  # Static assets (logo, icons, SVGs)
├── src/
│   ├── actions/             # Server Actions (auth, students, reports, QR, etc.)
│   ├── app/
│   │   ├── (app)/           # Authenticated app shell
│   │   │   ├── dashboard/
│   │   │   ├── students/     # Registry (search, filter, create, edit, archive)
│   │   │   ├── development/  # Behavior, assessments, interventions
│   │   │   ├── duplicates/   # Duplicate review workflow
│   │   │   ├── verification/ # Validation review queue
│   │   │   ├── reports/      # Report generation and history
│   │   │   ├── settings/     # System settings
│   │   │   ├── users/        # User management
│   │   │   ├── notifications/
│   │   │   ├── activity-logs/
│   │   │   └── ...
│   │   ├── api/             # API routes (e.g. report exports)
│   │   ├── login/
│   │   ├── register/
│   │   ├── verify/          # Public QR verification pages
│   │   ├── welcome/
│   │   └── page.tsx         # Root redirect (signed-in → dashboard; else welcome)
│   ├── components/
│   │   ├── ui/              # Shared primitives (button, card, table, form fields)
│   │   ├── dashboard/       # Dashboard widgets
│   │   ├── registry/        # Student registry components
│   │   ├── welcome/         # Landing page sections
│   │   └── app-shell.tsx    # Sidebar + header layout
│   ├── db/
│   │   ├── schema.ts        # Drizzle schema (all tables: users, students, grades, etc.)
│   │   └── index.ts         # DB client (Turso/libSQL)
│   ├── lib/
│   │   ├── auth.ts          # Sessions, cookies, user resolution
│   │   ├── permissions.ts   # RBAC permission matrix
│   │   ├── constants.ts     # Domain constants (roles, statuses, grade levels, etc.)
│   │   ├── workflow.ts      # Record status transition rules
│   │   ├── queries.ts       # Database queries
│   │   ├── dashboard-data.ts # Dashboard analytics aggregation
│   │   ├── audit.ts         # Audit logging
│   │   └── ...
│   └── proxy.ts             # Cookie presence gate for protected routes
├── .env.example             # Environment template
├── drizzle.config.ts        # Drizzle Kit configuration
├── next.config.ts           # Security headers, build settings, webpack config
├── package.json
├── tsconfig.json
└── vitest.config.ts         # Vitest configuration
```

---

## Architecture Overview

```
Browser
  │
  ▼
Next.js App Router
  ├── Public routes (/, /welcome, /login, /register, /verify, /verify/[token])
  └── Protected routes (proxy cookie check → (app) layout)
        │
        ▼
  Server Actions + Route Handlers
        │
        ├── Auth (session cookie, bcrypt, server-side RBAC)
        ├── Domain logic (workflow, scope, duplicates, QR generation)
        └── Drizzle ORM
              │
              ▼
         Turso / libSQL (SQLite-compatible)
```

### Authorization

Authorization is enforced entirely on the server (`requirePermission()` / `getAuthorizedUser()` in `src/lib/auth.ts`). UI permission checks are cosmetic only. Data scope restrictions (`userSectionScope` in `src/lib/scope.ts`) limit access based on the user's assigned grade/section scope where applicable.

### Key workflow

1. User authenticates (`/login`) → `createSession()` sets `sms_session` cookie.
2. Protected pages (`/dashboard`, `/students`, etc.) call `getCurrentUser()`.
3. Server actions check permissions before executing mutations.
4. Sensitive actions are logged to `audit_logs`.

---

## Database

| Item | Detail |
|---|---|
| **Engine** | Turso / libSQL (SQLite-compatible dialect) |
| **ORM** | Drizzle ORM (`drizzle-orm` 0.45.2) |
| **Schema file** | `src/db/schema.ts` |
| **Client** | `src/db/index.ts` |
| **Migrations** | `drizzle/` (generated by Drizzle Kit) |
| **Local dev file** | `local.db` |

### Major domain tables

- `users`, `sessions`, `roles`, `permissions`, `role_permissions`
- `school_years`, `grade_levels`, `sections`
- `students` (central entity with profile, enrollment, record status)
- `student_enrollments`, `student_guardians`
- `subjects`, `grades`, `grading_periods`
- `attendance_records`
- `behavior_categories`, `behavior_records`
- `assessment_domains`, `assessment_levels`, `assessment_records`
- `interventions`, `intervention_followups`
- `verification_reviews`, `duplicate_candidates`, `duplicate_reviews`
- `audit_logs`, `notifications`, `system_settings`, `reports`

Full schema documentation lives under `documentation/database/`.

---

## Authentication and Authorization

### Authentication

- **Mechanism**: Email + password with `bcryptjs` hashes (cost 10)
- **Sessions**: `sms_session` cookie (8-hour TTL), `httpOnly`, `sameSite: lax`, `secure` when `SESSION_COOKIE_SECURE=true`
- **Rate limiting**: In-process (fine for single-instance municipal/school deployments; needs shared store for horizontal scaling)
- **Failed attempts**: Audited

### Authorization

- **Roles** (exact values in `constants.ts`): `admin`, `school_admin`, `teacher`, `records`, `guidance`
- **Permissions**: Listed in `src/lib/permissions.ts` (e.g. `dashboard.view`, `students.create`, `verification.review`, `reports.export`, `audit_logs.view`)
- **Enforcement**: Server-side via `requirePermission()` and `getAuthorizedUser()`. Never rely on UI visibility alone.
- **Data scope**: `scope.ts` applies grade-level and section-level filters for applicable roles.

---

## Testing and Code Quality

```bash
npm run lint      # ESLint
npm run test      # Vitest (vitest run)
```

- Tests exist for queries (`queries-filters`), schemas (`schemas`), workflow (`workflow`), scope (`scope`), and utilities (`utils`).
- Automated test coverage is limited; treat `npm test` as the entry point and verify critical flows manually after setup.
- Before opening a pull request: run `npm run lint`, verify affected flows, and keep changes scoped.

---

## Deployment

This is a standard Next.js application. Typical deployment steps:

1. Configure production environment variables (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `SESSION_COOKIE_SECURE=true`, default accounts if needed).
2. Build and start:
   ```bash
   npm run build
   npm run start
   ```
3. Deploy to any Node-capable host (Vercel, VPS, or any platform supporting Next.js).

> **Production notes**:
> - Ensure the process has write access if using a local SQLite file; prefer Turso for multi-instance production.
> - Security headers (`CSP`, `X-Frame-Options`, etc.) are configured in `next.config.ts`.
> - There is no Docker configuration in this repository.

---

## Security

- **Never commit `.env`, `.env.local`, or real password hashes** beyond what your team explicitly manages.
- **Never expose Turso tokens or session secrets** to the client.
- Keep dependencies updated: `npm audit` periodically.
- Report security issues privately to the repository maintainers.
- Default accounts are for development. In production, rely on proper user management (`/users`) and rotate credentials.

---

## Troubleshooting

| Issue | Likely cause | Solution |
|---|---|---|
| `npm run db:push` fails with connection error | `TURSO_DATABASE_URL` or `LIBSQL_URL` is missing or invalid | Verify `.env.local`; for local dev use `file:./local.db` |
| `npm run seed` throws about missing env vars | Default account variables (`DEFAULT_ADMIN_*`, etc.) are empty | Fill required fields in `.env.local` or disable seed defaults |
| `npm run dev` crashes with out-of-memory | Large Node heap required for modern Next.js | The `dev` script sets `NODE_OPTIONS="--max-old-space-size=4096"`; verify environment |
| Login redirects back to `/login` repeatedly | `SESSION_COOKIE_SECURE` mismatch or cookie blocked | For local HTTP, keep `SESSION_COOKIE_SECURE=false`; for HTTPS, set `true` |
| Reports download as empty or fail | User lacks `reports.export` permission | Verify user role in `users` table; only `admin`, `school_admin`, `teacher`, `records`, `guidance` have varying report access |
| `local.db` file grows very large | Development seed creates many demo records | The seed is idempotent; delete `local.db` and re-seed if needed |

---

## Known Limitations

- **Responsive / accessibility QA**: Partial; verify critical flows manually after setup.
- **Automated test coverage**: Limited. Critical flows (login, record creation → verification → QR, report export) should be verified manually after setup.
- **Rate limiting**: Single-instance only. Horizontal scaling requires a shared rate-limit store (e.g., Redis / Turso KV).
- **Some dashboard charts and monitoring sub-views** have been iterated; verify report exports and charts against your data after seeding.
- **Self-registration (`/register`)** exists in the codebase but is intended for internal/provisioned use only. Production deployments should rely on administrator-provisioned accounts.
- Documentation under `documentation/` may reference legacy terminology; the source code (`constants.ts`, `permissions.ts`, `auth.ts`, routes) is the authoritative reference.

---

## Roadmap (Implemented vs. Planned)

### Implemented
- [x] Student registry with lifecycle filters
- [x] Enrollment, grade levels, sections
- [x] Grades, grading periods, subjects
- [x] Attendance tracking
- [x] Student development (behavior, assessments, interventions)
- [x] Verification workflow and duplicate review
- [x] QR verification (`/verify`, `/verify/[token]`)
- [x] Reports and exports (PDF, XLSX, CSV)
- [x] User management and RBAC
- [x] Audit trail (`audit_logs`)
- [x] In-app notifications
- [x] System settings
- [x] Dashboard analytics
- [x] Security headers (CSP, X-Frame-Options, etc.)

### In Progress / Planned
- [ ] Expanded automated test coverage (Vitest)
- [ ] Broader accessibility audit
- [ ] Shared-store rate limiting for multi-instance deployments
- [ ] Enhanced mobile navigation refinements

---

## Contributing

This repository supports internal development for Sta. Magdalena National High School.

1. Fork or branch from the main branch.
2. Set up locally (`.env.local`, `npm run db:push`, `npm run seed`).
3. Keep changes scoped; prefer server-side authorization and Zod validation for new mutations.
4. Run `npm run lint` and exercise affected flows manually.
5. Open a pull request with a clear description of behavior and any environment/schema changes.

---

## License

No license file is present in the repository. Treat the project as proprietary unless the maintainers publish a license.

---

## Acknowledgments

Developed for **Sta. Magdalena National High School**, Sta. Magdalena, Sorsogon, Region V — Bicol, to support student records management, performance analytics, verification workflows, and related school administrative processes aligned with the DepEd Child Protection Policy and RA 10173 (Data Privacy Act).
