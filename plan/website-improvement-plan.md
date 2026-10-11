# Website Improvement Plan — Records Management System

Updated: 2026-10-11 · Branch: `change-title`

> Operating rule for every task in this plan: **preserve the existing design
> system, theme, navigation structure, content and business logic**. Improve,
> don't replace.

---

## 1. Verified architecture (no guessing)

- **Framework:** Next.js 16.3.5 (App Router, `--webpack` build), React 19.2.8,
  TypeScript strict
- **Styling:** Tailwind CSS 4 with `@theme` tokens in `src/app/globals.css`
  (brand = slate/navy ramp, action = sky blue, status colors)
- **DB:** Turso/libSQL via Drizzle ORM (`src/db/schema.ts`), local `local.db`
- **Auth:** DB-backed sessions (`sms_session` cookie), bcrypt, server-side
  RBAC in `src/lib/permissions.ts` (5 roles) + row scope in `src/lib/scope.ts`
- **Validation:** Zod schemas in `src/lib/schemas.ts`, shared client/server
- **Tests:** Vitest, 48 tests in `src/lib/__tests__/`
- **Routes (app group):** /dashboard, /students (+new, [id], [id]/edit),
  /verification, /duplicates, /reports, /qr, /notifications, /users,
  /activity-logs, /settings
- **Public:** / (welcome), /login, /verify, /verify/[token], /verify/result

## 2. Baseline (recorded 2026-10-11)

- `npm run lint` — 0 errors, 1 warning (`scripts/seed-remote-reference.mts` unused `users`)
- `npx tsc --noEmit` — pass
- `npm test` — 48/48 pass
- `npm run build` — pass (21 routes)

## 3. Design system lock (reference for all UI work)

- Colors: `brand-*` slate ramp (navy `brand-900/950` for emphasis/dark bars),
  `action-600/700` sky blue for CTAs/links/eyebrows, semantic status tokens
- Cards: `rounded-lg border border-brand-200 bg-white shadow-xs`
  (`src/components/ui/card.tsx`, dashboard `<Panel>`)
- Tables: `TableWrap/Th/Td` uppercase tinted header, hairline dividers
- Badges: `Badge` / `RecordStatusBadge` with icon + tone
- Page header: `PageHeader` (eyebrow / bold title / muted description / actions)
- Empty states: `EmptyState` + `TableEmptyState`
- Focus: 3px `action-600` outline (global CSS); `prefers-reduced-motion` honored

---

## Phase 1 — Audit (complete)

- [x] Read package.json, configs, DB client, schema docs
- [x] Inventory all routes and components
- [x] Read auth, permissions, scope, workflow, rate-limit, schemas
- [x] Read key pages: dashboard, students, verification, users, activity-logs, qr, verify, login
- [x] Record design system (above) and baseline checks (above)

## Phase 2 — P0/P1 fixes

- [x] **P1/Broken nav:** sidebar links `/performance` and `/development`
      (`src/components/app-shell.tsx`) and dashboard links
      `/performance` + `/development/behavior`
      (`src/components/dashboard/primitives.tsx`) point at routes that do not
      exist → users hit 404s from primary navigation. Fix by creating the two
      missing pages using ONLY existing components/queries/design tokens.
- [x] `/performance` — academic performance overview using the existing
      `performanceOverview()` query (`src/lib/queries.ts`; unused until now).
- [x] `/development` — student development overview using existing
      `listAssessments`, `listBehaviorRecords`, `listInterventions`.
- [x] Fix lint warning in `scripts/seed-remote-reference.mts`.

## Phase 3 — Verification

- [x] Rerun lint / tsc / tests / build after changes
- [x] Runtime smoke test with `npm run start` (login → dashboard → new pages)
- [x] Regression: all pre-existing routes still render

Report: `plan/website-improvement-report.md`

## Intentionally NOT done (documented decisions)

- No theme/typography/nav redesign — identity preserved by mandate.
- No new dependencies.
- No DB schema changes (avoided without user approval; report data is unused
  by any route today, so the P1 fix needs no migration).
- No dark mode, no glassmorphism, no new animation systems.
