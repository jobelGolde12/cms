# IMPLEMENTATION_PLAN.md — Municipal Child Mapping System

Municipality of Sta. Magdalena, Sorsogon — DepEd child-mapping digitization platform.

## 1. Current Architecture (Audit Result)

- **Framework:** Next.js 16.3.5 (App Router), React 19.2, TypeScript 5 (strict)
- **Styling:** Tailwind CSS v4 (CSS-first config via `@theme`), PostCSS
- **State of code at audit:** Bare `create-next-app` scaffold — only `src/app/layout.tsx`, `page.tsx`, `globals.css` exist. No business code, no database, no auth, no tests.
- **Dependencies already installed:** `@libsql/client`, `drizzle-orm`, `bcryptjs`, `zod`, `react-hook-form` + `@hookform/resolvers`, `recharts`, `qrcode`, `@zxing/browser`, `@react-pdf/renderer`, `exceljs`, `lucide-react`
- **Added during this work:** `drizzle-kit` (migrations), `tsx` (seed script runner)
- **Package manager:** pnpm (Node 22)
- **Design sources:** `prompt.md`, `stitch-prompt.md` (Stitch project `16898433093946115816` lists 11 screens). No `design/` screenshots were shipped in the repo, so the Stitch screen list drives the page inventory and a design system was generated with the installed **UI/UX Pro Max** skill (`Accessible & Ethical` style — see Design System below).
- **Next.js 16 notes:** `middleware.ts` is deprecated → use `proxy.ts`. `cookies()`, `params`, and `searchParams` are async. Server Actions used for all mutations.

## 2. Target Architecture

```
Browser ──> Next.js 16 App Router (Vercel/Node host)
             ├─ Server Components (data reads, scoped by role)
             ├─ Server Actions   (all mutations; re-validate + re-authorize server-side)
             ├─ Route Handlers   (PDF/Excel export, QR image, verification token)
             └─ proxy.ts         (cheap cookie gate for /dashboard.., full authz in each page/action)
                        │
                        ▼
                 Turso / libSQL  (Drizzle ORM)
```

- **Runtime DB:** Turso (`LIBSQL_URL=libsql://…`, `LIBSQL_AUTH_TOKEN=…`).
- **Local dev:** `LIBSQL_URL=file:./local.db` — same Drizzle code, no mock layer. No JSON-file database anywhere.

## 3. Design System (UI/UX Pro Max output)

- Style: **Accessible & Ethical** — high contrast, WCAG-compliant, large readable text, semantic HTML, visible focus.
- Palette: primary `#0F172A` (slate-900 navy), secondary `#334155`, action blue `#0369A1` (sky-700), background `#F8FAFC`, text `#020617`.
- Typography: Fira Sans (UI) + Fira Code (numeric/code/child-ID), via `next/font/google`.
- Icons: lucide-react only, 24px viewBox, consistent sizing.
- Effects: 3px focus rings, 44px touch targets, no motion anti-patterns; status is never color-only (icon + label).

## 4. Data Model (Drizzle, `src/db/schema.ts`)

| Table | Purpose |
|---|---|
| `barangays` | Barangay registry (Sta. Magdalena) |
| `schools` | School registry (DepEd district) |
| `users` | Accounts: role (`admin|lgu|school|barangay`), optional `school_id`/`barangay_id` scope, active flag, bcrypt password |
| `sessions` | Opaque session tokens (SHA-256 stored), expiry, UA/IP |
| `children` | Core child record: child code `CM-YYYY-######`, identity, address/barangay, education (status/school/grade/SY/ALS), ECCD (participation/center/reason), disability (status/type/support/referral), guardian contact, validation status, verifier + timestamps |
| `validation_history` | Append-only workflow trail (submitted/verified/returned/resubmitted + notes + actor) |
| `duplicate_candidates` | Potential duplicates (child vs candidate, match fields, status: potential/confirmed/resolved/dismissed, reviewer) |
| `qr_tokens` | Per-child verification tokens (random, unique, active flag, optional expiry, scan stats) |
| `monitoring_followups` | Follow-ups for OSY/ECCD/disability/intervention monitoring |
| `reports` | Generated report metadata (type, filters JSON, generator) |
| `audit_logs` | Append-only audit (user, role, action, entity, result, metadata, IP) |
| `notifications` | Per-user notifications (type, title, body, read flag, entity link) |

Indexes on `children(child_code)` unique, `children(last_name, first_name, birth_date)`, `children(validation_status)`, `sessions(token_hash)` unique, `qr_tokens(token)` unique, `audit_logs(created_at)`, FKs throughout.

## 5. Authentication

- Login via Server Action: email + password (bcrypt), constant-time-ish DB lookup, generic error message.
- Session: 256-bit random token in `HttpOnly; Secure; SameSite=Lax` cookie (`cms_session`), only its SHA-256 stored in `sessions`; 7-day idle+absolute expiry, sliding refresh.
- `proxy.ts`: redirect unauthenticated users away from app routes; redirect authenticated users away from `/login`. Real authorization always re-checked server-side.
- Login rate limiting: per-IP + per-email counters (in-process, documented limitation for single-instance deployments).
- Logout: delete session row + clear cookie.

## 6. Authorization (RBAC + data scope)

- Permission map in `src/lib/permissions.ts` (role → permission strings, e.g. `children.view`, `children.create`, `children.update`, `children.validate`, `children.export`, `reports.generate`, `users.manage`, `audit.view`, `qr.manage`).
- `requireUser()`, `requirePermission(perm)` helpers used by **every** page and Server Action; route-scoped loaders filter rows by the user's `school_id`/`barangay_id`/municipality scope. UI hiding is cosmetic only — the server is the enforcement point.
- Last-admin guard: cannot deactivate/demote the only active admin.

## 7. Route Structure

```
/login                      (login)
/                           → redirect /dashboard
/(app) shell: sidebar + topbar
  /dashboard                metrics + charts (live queries)
  /children                 registry: search/filter/sort/pagination (server-side)
  /children/new             multi-section add form (RHF + Zod, review step)
  /children/[id]            profile w/ verification + QR + history
  /children/[id]/edit       edit (permission + validation-status rules)
  /validation               validation queue (verify / return for correction)
  /validation/duplicates    duplicate review workflow
  /monitoring               OSY / ECCD / Disability / Educational status / Interventions
  /reports                  generate + download PDF/Excel reports
  /qr                       QR studio (generate/print) — folded into child profile actions too
  /activity-logs            audit log viewer (admin/LGU)
  /users                    user management (admin)
  /notifications            notification center
  /settings                 profile + password
/verify + /verify/[token]   public QR verification (minimal info; more if authorized)
```

## 8. Validation, Reporting, QR, Audit

- **Record workflow:** `draft → submitted → pending_validation → verified`, with `needs_correction → resubmitted` loop. Every transition is a permission-checked Server Action writing `validation_history` + audit + notifications.
- **Duplicates:** on create/update, normalized name+birthdate (+barangay) match generates `duplicate_candidates` rows; reviewer confirms (marks records) or dismisses. No auto-merge.
- **Reports:** server-generated from live queries — barangay report, municipal consolidated, child mapping summary, educational planning, monitoring reports; PDF via `@react-pdf/renderer` route handler, Excel via `exceljs` route handler. Filters echo into the document header/footer; generation logged.
- **QR:** token URL `BASE_URL/verify/<token>` rendered with `qrcode`; printable page; scan/verify logs events; public result shows only status + child code (name masked), authorized users see their scope's fields.

## 9. Testing Strategy

`vitest` unit tests for business logic: auth/session, RBAC + scope filters, duplicate matching, child-code generation, workflow transitions, QR token resolution, and input schema validation. Manual QA matrix for responsive (1440→375px) and accessibility per Section 49/51 of the spec.

## 10. Deployment

- Build `next build`; start `next start` (or platform equivalent).
- Env: `LIBSQL_URL`, `LIBSQL_AUTH_TOKEN`, `SESSION_COOKIE_SECURE` (auto), `NEXT_PUBLIC_APP_URL`. All documented in `.env.example` — never commit secrets.
- `drizzle-kit push` for dev; generated SQL migrations for production.

## 11. Phases

Phases 1–22 tracked in `IMPLEMENTATION_PROGRESS.md` (audit → design tokens → shell → schema → auth → RBAC → registry → profile → add/edit → validation → duplicates → dashboard → monitoring → reports → QR → audit logs → users → notifications → QA → security → tests → build).
