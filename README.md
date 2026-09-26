Municipal Child Mapping System

Official platform for the Municipality of Sta. Magdalena, Sorsogon (Region V — Bicol) to register, validate, monitor, and report child census data across all 14 barangays.

Built for DepEd Form 1 verification workflows and aligned with RA 10173 (Data Privacy Act) and the DepEd Child Protection Policy.



Overview

Barangay personnel collect child records (identity, address, education status, ECCD participation, disability). LGU and admin users validate those records, resolve duplicates, track monitoring and interventions, generate reports, and issue QR codes for field verification.

Who it is for







Role



Typical use





Barangay User



Create and update child records for an assigned barangay; view validation and monitoring data





LGU User



Municipal oversight: validation review, duplicate resolution, reports, QR verification





System Administrator



Full access including user management, settings, and audit logs

Schools are reference entities only — there is no school login role.



Features

Core





Child registry — Create, search, filter, edit, and archive child profiles (personal details, household address, education, ECCD, disability)



Validation workflow — Record statuses: draft → pending_validation → verified / needs_correction / marked_duplicate



Duplicate detection — Candidate pairs and review workflow



Monitoring & interventions — Educational status, out-of-school youth, ECCD, disability support; interventions with follow-ups



Reporting — Municipal/barangay summaries; export to PDF, Excel, or CSV



QR verification — Generate codes for verified records; public /verify and token-based lookup for field checks



Role-based access (RBAC) — Server-enforced permissions and barangay-scoped data access



Audit trail — Action logging for sensitive operations



Notifications — In-app notification list



User management — Admin user lifecycle (create, update, disable)



Settings — System settings management

Public surfaces





Landing / welcome page (/)



Login and registration flows



QR verification pages (/verify, /verify/[token])



Technology stack







Layer



Technology





Framework



Next.js 16 (App Router)





UI



React 19, Tailwind CSS 4, Lucide icons





Language



TypeScript (strict)





Database



Turso / libSQL (SQLite-compatible); local file local.db for development





ORM



Drizzle ORM + Drizzle Kit





Validation



Zod, React Hook Form





Auth



Session cookies, bcrypt password hashes, server-side RBAC





Reports



@react-pdf/renderer, ExcelJS





QR



qrcode, @zxing/browser





Charts



Recharts



Requirements





Node.js 20+ (recommended; project uses modern Next.js 16)



npm, pnpm, or yarn (both package-lock.json and pnpm-lock.yaml are present — pick one package manager and stick to it)



No separate database server required for local development (SQLite file)

Optional for production:





Turso account and database URL + auth token



HTTPS (required for secure session cookies)



Installation

git clone https://github.com/jobelGolde12/cms.git
cd cms

# Install dependencies (use one package manager)
npm install
# or: pnpm install
# or: yarn install

Environment configuration

cp .env.example .env.local

Edit .env.local:





Database — For local SQLite leave:

TURSO_DATABASE_URL=file:./local.db

For Turso, set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.



Default accounts — Set email, bcrypt password hash, names, and role for:





DEFAULT_ADMIN_*



DEFAULT_LGU_*



DEFAULT_BARANGAY_*

Roles must be exactly admin, lgu, or barangay. Generate a bcrypt hash (cost 10 is fine) for each password; never store plaintext passwords in env files.



Session — Keep SESSION_COOKIE_SECURE=false for local HTTP. Set true in production HTTPS deployments.

See Environment variables for the full list.

Database setup

# Apply schema (local SQLite or remote Turso)
npm run db:push
# or generate + migrate:
# npm run db:generate
# npm run db:migrate

# Seed reference data + fictional demo children (idempotent)
npm run seed

The seed script creates the municipality, 14 barangays, schools (reference only), roles/permissions, default users from env, and fictional child records for development. It does not use real child data.

Run

npm run dev

Open http://localhost:3000. Signed-in users are redirected to the dashboard; others see the public welcome page.



Environment variables

All sensitive variables are server-only. Do not prefix them with NEXT_PUBLIC_.







Variable



Required



Description





TURSO_DATABASE_URL



Yes*



libSQL URL (file:./local.db or libsql://...)





TURSO_AUTH_TOKEN



Remote only



Turso auth token





LIBSQL_URL



Legacy



Fallback if TURSO_DATABASE_URL unset





LIBSQL_AUTH_TOKEN



Legacy



Fallback if TURSO_AUTH_TOKEN unset





SESSION_COOKIE_SECURE



Prod



"true" when using HTTPS





DEFAULT_ADMIN_EMAIL



Dev defaults



Admin login email





DEFAULT_ADMIN_PASSWORD_HASH



Dev defaults



bcrypt hash





DEFAULT_ADMIN_FIRST_NAME



Dev defaults









DEFAULT_ADMIN_LAST_NAME



Dev defaults









DEFAULT_ADMIN_ROLE



Dev defaults



Must be admin





DEFAULT_ADMIN_BARANGAY_ID



Optional









DEFAULT_LGU_*



Dev defaults



Same pattern; role lgu





DEFAULT_BARANGAY_*



Dev defaults



Same pattern; role barangay

* If neither Turso nor LIBSQL URL is set, the client falls back to file:./local.db.

Never commit real values. .gitignore excludes .env*. Prefer .env.local for local secrets.



Available scripts







Command



Purpose





npm run dev



Development server (increased Node heap)





npm run build



Production build (next build --webpack)





npm run start



Run production server





npm run lint



ESLint (Next.js core-web-vitals + TypeScript)





npm run db:push



Push schema to the database (Drizzle Kit)





npm run db:generate



Generate SQL migrations





npm run db:migrate



Apply migrations





npm run seed



Seed reference + demo data





npm test



Run Vitest (vitest run)



Project structure

├── drizzle/                 # Generated SQL migrations
├── documentation/           # Auth, phases, production notes, database docs
├── plan/                    # Implementation plans and flowcharts
├── public/                  # Static assets
├── scripts/
│   └── seed.mts             # Development seed
├── src/
│   ├── actions/             # Server Actions (auth, children, QR, reports, …)
│   ├── app/
│   │   ├── (app)/           # Authenticated app shell (dashboard, children, …)
│   │   ├── api/             # API routes (e.g. report exports)
│   │   ├── login/           # Login page
│   │   ├── register/        # Registration
│   │   ├── verify/          # Public QR verification
│   │   ├── welcome/         # Marketing/landing sections
│   │   └── page.tsx         # Root: redirect or welcome
│   ├── components/
│   │   ├── ui/              # Shared primitives (button, card, table, …)
│   │   ├── welcome/         # Landing page sections
│   │   └── app-shell.tsx    # Sidebar + header layout
│   ├── db/
│   │   ├── schema.ts        # Drizzle schema (all tables)
│   │   └── index.ts         # DB client
│   ├── lib/                 # Auth, permissions, workflow, reports, utils
│   └── proxy.ts             # Cookie presence gate for protected routes
├── drizzle.config.ts
├── next.config.ts           # Security headers, build options
├── package.json
└── README.md



Architecture

Browser
  │
  ▼
Next.js App Router
  ├── Public routes (/ , /login, /register, /verify/…)
  └── Protected routes (proxy cookie check → app layout)
        │
        ▼
  Server Actions + route handlers
        │
        ├── Auth (session cookie, bcrypt, RBAC)
        ├── Domain logic (workflow, scope, duplicates, QR)
        └── Drizzle ORM
              │
              ▼
         Turso / libSQL (SQLite)





Authorization is enforced on the server (requirePermission / getAuthorizedUser). UI permission checks are cosmetic only.



Data scope: barangay users are limited to their assigned barangay; LGU and admin see municipal data.



Record workflow is defined in src/lib/workflow.ts (allowed status transitions).



Authentication and authorization





Session cookie name: cms_session (7-day TTL). Cookie is httpOnly, sameSite: "lax", and secure when SESSION_COOKIE_SECURE=true or production HTTPS.



Login uses email + password; rate-limited; failed attempts are audited.



Default accounts are resolved from environment variables (development convenience) and can also be seeded into the users table.



Permissions are listed in src/lib/permissions.ts (e.g. children.view, validation.review, reports.export).



Database







Item



Detail





Engine



Turso / libSQL (SQLite dialect)





Schema



src/db/schema.ts





Migrations



drizzle/ via Drizzle Kit





Local file



local.db

Major domain tables include: users, sessions, roles, permissions, municipalities, barangays, schools, children and related address/education/ECCD/disability tables, validation and duplicate tables, monitoring, interventions, QR verifications, reports, notifications, audit logs, system settings.

Further documentation lives under documentation/database/.



Testing and quality

npm run lint
npm test

Vitest is configured as the test runner. Automated coverage is still limited; treat npm test as the entry point for any tests that exist. Prefer verifying critical flows (login, child create → validation → QR) manually after setup.



Deployment

The app is a standard Next.js application. Typical steps:





Set production environment variables (Turso URL/token, default accounts if used, SESSION_COOKIE_SECURE=true).



Build and start:

npm run build
npm run start



Or deploy to a Node-capable host (e.g. Vercel, a VPS, or any platform that supports Next.js). Ensure the process has write access if using a local SQLite file; prefer Turso for multi-instance production.

Security headers (CSP, X-Frame-Options, nosniff, etc.) are configured in next.config.ts.

There is no Docker configuration in this repository.



Security notes





Never commit .env, .env.local, or real password hashes beyond what your team explicitly manages.



Do not expose Turso tokens or session secrets to the client.



Keep dependencies updated; run npm audit periodically.



Report security issues privately to the repository maintainers.



Default accounts are for development. In production, rely on proper user management and rotate credentials.



Known limitations





Responsive, accessibility, security QA, and broader automated tests are marked incomplete in internal progress tracking.



Rate limiting is in-process (fine for single-instance municipal deployments; needs a shared store if horizontally scaled).



Some dashboard charts and monitoring sub-views have been iterated; verify report exports and charts against your data after seeding.



Auth-related docs under documentation/ may still mention a former “school” role; the code is authoritative: roles are admin, lgu, and barangay only.



Documentation







Path



Content





documentation/



Auth env vars, phase audits, production checklist





documentation/database/



Schema and Turso notes





plan/



Implementation plans and system flow description





IMPLEMENTATION_PROGRESS.md



Feature completion checklist





TODO.md



Outstanding work items



Contributing





Fork or branch from the main branch.



Follow setup above (.env.local, db:push, seed).



Keep changes scoped; run npm run lint and exercise affected flows.



Prefer server-side authorization and Zod validation for new mutations.



Open a pull request with a clear description of behavior and any env/schema changes.



License

No license file is present in the repository. Treat the project as proprietary unless the maintainers publish a license.



Acknowledgments

Developed for the Municipality of Sta. Magdalena, Sorsogon, to support municipal child mapping, DepEd Form 1 verification, and related LGU workflows.