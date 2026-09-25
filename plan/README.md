# Municipal Child Mapping System — Enhancement Plan

> **DESIGN PRESERVATION REQUIREMENT**
>
> All planned enhancements must preserve the existing application's design system, theme (`brand-900`, `brand-500`, `action-700`, etc.), colors, typography, icons (`lucide-react`), visual identity, spacing system, and overall UI appearance. Future implementation should improve functionality, reliability, usability, performance, accessibility, security, maintainability, and completeness **within the existing design system**. Visual redesign, theme changes, typography changes, icon replacements, or layout redesigns are explicitly out of scope.

## Purpose

This directory contains the evidence-based enhancement plan produced by analyzing the actual `src/` codebase at the time of creation. Every recommendation references discovered file paths, database tables, actions, and components rather than assumptions.

## Date of Analysis

2026-09-25

## Project Architecture Discovered

- **Framework:** Next.js 16.3.5 (App Router), TypeScript 5, React 19.2.8
- **UI / Design System:** Tailwind CSS v4 (`postcss.config.mjs`), `lucide-react` icons, `shadcn/ui`-style components (`src/components/ui/`), custom brand color palette (`brand-*`, `action-*`)
- **Database:** SQLite (`local.db`) / Turso (`LIBSQL_URL`) via Drizzle ORM (`drizzle-orm` 0.45.2, `@libsql/client` 0.18.0). Schema: `src/db/schema.ts`
- **Authentication:** Custom session-based auth (`src/lib/auth.ts`), cookie-based (`cms_session`), bcrypt (`bcryptjs` 3.0.3), rate-limited login (`src/lib/rate-limit.ts`), audit logging (`src/lib/audit.ts`)
- **Authorization:** Role-based (`admin`, `lgu`, `barangay`) with granular permission map (`src/lib/permissions.ts`), server-side enforcement (`requirePermission`, `getAuthorizedUser`), resource-level scoping (`src/lib/scope.ts`)
- **Server Actions:** `src/actions/` for auth, children, duplicates, monitoring, notifications, QR, users, with `"use server"`
- **Pages / Routes:** `src/app/(app)/` (protected app layout), `src/app/login/`, `src/app/verify/[token]/`, `src/app/page.tsx`
- **Components:** `src/components/app-shell.tsx` (layout with sidebar + header), `src/components/ui/` (badge, button, card, field, states, table)
- **Testing:** `vitest` framework present (`package.json`); no dedicated `tests/` directory; no integration/e2e tests discovered

## Scope

- **IN SCOPE:** Security hardening, authorization completeness, database reliability, performance improvements, validation robustness, error handling, accessibility fixes, audit completeness, workflow improvements, code maintainability, and production readiness.
- **OUT OF SCOPE:** Changing colors, fonts, icons, typography, spacing (purely aesthetic), layout redesign, UI framework replacement, theme replacement, new visual identity, or removing existing visual elements.

## Existing Plan Files Preserved

- `plan/erd_implementation_plan.md` — Database schema specification (preserved intact)
- `plan/responsiveness.md` — Responsive design prompt/instructions (preserved intact)
- `plan/System Flowchart & Web Application Implementation Plan.md` — System flowchart (preserved intact)

## Documents in This Plan

| File | Purpose |
|---|---|
| `README.md` | This file — scope, design preservation, architecture summary |
| `CURRENT-STATE-ANALYSIS.md` | Evidence-based inventory of existing routes, features, components, database, auth/authz, issues |
| `FEATURE-ENHANCEMENT-PLAN.md` | Complete feature inventory, enhancement matrix, feature-by-feature plans, dependencies, priorities |
| `SECURITY-ENHANCEMENT-PLAN.md` | Auth/authz gaps, input validation, session security, secret exposure, audit rules, API protection |
| `PERFORMANCE-ENHANCEMENT-PLAN.md` | Query optimization, pagination, caching, rendering, bundle, image/asset improvements |
| `TESTING-ENHANCEMENT-PLAN.md` | Existing test status, missing unit/integration/E2E/auth/security/accessibility tests, critical workflow tests |
| `IMPLEMENTATION-ROADMAP.md` | Phased implementation order, dependencies, risks, expected outcomes |
| `MASTER-CHECKLIST.md` | Actionable checklist with IDs, priorities, dependencies, status tracking |

## Implementation Restrictions

1. **No source code modification during planning.** This task delivers documentation only.
2. **No database schema modification during planning.** Schema recommendations are documented for future implementation.
3. **No visual redesign.** Every enhancement recommendation preserves the current design system.
4. **Evidence only.** Features must be found in the actual codebase (`src/`, `public/`, `scripts/`) before being included.

## Key Restrictions for Implementing Agents

When implementing any enhancement from this plan:
- Preserve `brand-900`, `brand-500`, `brand-200`, `action-700`, `action-800`, and related utility colors in Tailwind configurations and component classes.
- Preserve all `lucide-react` icons used in pages/components.
- Preserve the sidebar/header layout (`AppShell`), rounded-xl cards, shadow-sm, border-brand-200 patterns, and existing spacing (`space-y-6`, `gap-4`, `px-4`, etc.).
- Preserve existing typography scale (`text-2xl font-extrabold tracking-tight`, `text-sm font-bold`, etc.).
- Do not change navigation styling, card styling, table styling, badge styling, or modal/dialog styling purely for aesthetic reasons.
- Any minimal visual correction (e.g., accessibility focus ring change) must be documented with a clear functional justification.
