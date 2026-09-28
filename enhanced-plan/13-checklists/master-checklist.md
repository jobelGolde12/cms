# Master Implementation Checklist

This checklist is the central tracking document. It is organized by phase according to dependency order.

**Rules:**
- Check items only when the user explicitly authorizes implementation.
- Preserve the existing UI/theme at all times (see `00-overview/ui-theme-preservation.md`).
- Do not invent new features. Only implement what this audit discovered as needed.
- Every task has an exact file reference and a verification step.

---

## Phase 1 — Foundation & Safety (Critical Fixes)

These tasks address the most fragile architectural gaps discovered during the audit.

- [ ] Inspect whether `src/app/middleware.ts` is missing (confirmed: no middleware file exists at root or in `src/app/`)
  - **Location:** `src/app/middleware.ts` (missing), `next.config.ts`
  - **Current behavior:** No middleware-based session/auth gate; protection relies solely on per-page `getCurrentUser()` and `(app)/layout.tsx` redirect.
  - **Problem:** Direct API access or missing `getCurrentUser()` call creates unprotected routes.
  - **Root cause:** Middleware file never created.
  - **Proposed solution:** Create `src/app/middleware.ts` with cookie validation (`hashToken` from cookie) and redirect for protected routes. Ensure CSP/security headers remain in `next.config.ts`.
  - **Dependencies:** None (independent of other changes).
  - **Risk:** Low; must not break existing session resolution.
  - **Verification:** Test `/dashboard` with and without cookie; test `/api/reports/[type]` without cookie.
  - **Files likely affected:** `new src/app/middleware.ts`, `next.config.ts`

- [ ] Verify `proxy.ts` behavior and ensure protected routes are fully covered
  - **Location:** `src/proxy.ts` (referenced in README, not fully inspected during audit)
  - **Current behavior:** Unknown (not fully audited).
  - **Problem:** Potential gap if `proxy.ts` relies on middleware that doesn't exist.
  - **Root cause:** Incomplete inspection.
  - **Proposed solution:** Read `src/proxy.ts`, document its purpose, and ensure it aligns with any middleware added.
  - **Dependencies:** Middleware inspection.
  - **Risk:** Low.
  - **Verification:** Confirm `proxy.ts` does not conflict with middleware.
  - **Files likely affected:** `src/proxy.ts`

- [ ] Fix rate-limit scalability (document limitation, not redesign)
  - **Location:** `src/lib/rate-limit.ts`
  - **Current behavior:** In-memory rate limit (process-level only).
  - **Problem:** Horizontal scaling breaks rate limits; no shared store.
  - **Root cause:** Design choice for single-instance municipal deployment.
  - **Proposed solution:** Document limitation in `09-security/findings/` and `08-performance/backend/`. If needed, propose DB-backed or Redis-backed store (without redesigning UI/theme).
  - **Dependencies:** None.
  - **Risk:** Low; documentation only unless user requests infrastructure change.
  - **Verification:** Confirm documentation reflects actual code (`limit` and `retryAfterSeconds` logic).
  - **Files likely affected:** `src/lib/rate-limit.ts` (read-only documentation update)

---

## Phase 2 — Security Hardening

- [ ] Add middleware-level authorization check for `/api/reports/[type]`
  - **Location:** `src/app/middleware.ts` (new or updated), `src/app/api/reports/[type]/route.ts`
  - **Current behavior:** Handler-level auth only (`getCurrentUser()` + `hasPermission()`).
  - **Problem:** Middleware could reject unauthorized requests earlier, reducing DB load.
  - **Root cause:** No middleware.
  - **Proposed solution:** Ensure middleware validates session and optionally checks `reports.export` permission before reaching handler.
  - **Dependencies:** Phase 1 middleware.
  - **Risk:** Low; must preserve handler-level checks as defense-in-depth.
  - **Verification:** Unauthorized `/api/reports/child_registry?format=pdf` returns 401/403 from middleware (or handler as fallback).
  - **Files likely affected:** `new src/app/middleware.ts`, `src/app/api/reports/[type]/route.ts`

- [ ] Audit all server actions for missing authorization
  - **Location:** All `src/actions/*.ts`
  - **Current behavior:** All actions start with `getAuthorizedUser()` — good.
  - **Problem:** None discovered; audit confirms consistent enforcement.
  - **Proposed solution:** Document confirmation in `09-security/authorization/`. No code change required unless future changes break the pattern.
  - **Dependencies:** None.
  - **Risk:** None.
  - **Verification:** Confirm each action file (`auth.ts`, `children.ts`, `duplicates.ts`, `monitoring.ts`, `interventions.ts`, `notifications.ts`, `qr.ts`, `register.ts`, `reports/*.ts`, `settings.ts`, `users.ts`, `get-barangays.ts`) uses `getAuthorizedUser()`.
  - **Files likely affected:** `12-implementation/phases/` documentation only

- [ ] Verify environment variable exposure (no `NEXT_PUBLIC_` secrets, no `.env` reading in client code)
  - **Location:** `src/lib/default-credentials.ts`, `src/lib/env-validation.ts`, `.env.example`, `.env`
  - **Current behavior:** `default-credentials.ts` reads only server-side (`process.env`). `.env` exists but must not be read by client.
  - **Problem:** None discovered; audit confirms server-only env usage.
  - **Proposed solution:** Document confirmation in `09-security/authentication/`. Ensure `.env` is never committed (already in `.gitignore`).
  - **Dependencies:** None.
  - **Risk:** Low.
  - **Verification:** Confirm no client component (`"use client"`) imports `process.env` directly (except `NEXT_PUBLIC_` which is not present).
  - **Files likely affected:** `09-security/authentication/` documentation

---

## Phase 3 — Database & Data Integrity

- [ ] Verify all indexes match query patterns in `lib/queries.ts`
  - **Location:** `src/db/schema.ts` (indexes), `src/lib/queries.ts`
  - **Current behavior:** Indexes cover `email`, `role`, `barangay`, `status`, `recordStatus`, `createdAt`, `isCurrent`, `tokenHash`, `userId`, etc.
  - **Problem:** Some complex sub-queries (`exists` for education, school, disability, monitoring) may not fully leverage composite indexes. SQLite query planner handles single-table indexes well, but multi-table `exists` sub-queries are slower.
  - **Root cause:** Design uses normalized relational model (good for integrity) but some queries use sub-selects rather than pre-computed fields.
  - **Proposed solution:** Document query patterns. If performance becomes an issue, consider adding composite indexes (e.g., `(childEducation.childId, childEducation.isCurrent, childEducation.educationStatus)`) without redesigning UI/theme. Do not redesign data model unless required.
  - **Dependencies:** None.
  - **Risk:** Low; documentation and optional index addition.
  - **Verification:** Confirm `explain query plan` (or manual review) for `childFilters()` sub-queries.
  - **Files likely affected:** `src/db/schema.ts` (optional index additions), `02-database/queries/`

- [ ] Confirm foreign key cascade behavior matches business rules
  - **Location:** `src/db/schema.ts` (all `references()` calls)
  - **Current behavior:** Child-related tables (`child_addresses`, `child_education`, etc.) use `onDelete: cascade`. `audit_logs` uses `onDelete: set null`. `interventions` uses `onDelete: cascade`.
  - **Problem:** None discovered. Cascade behavior aligns with soft-delete (`archiveChild`) — archive updates `status`, does not delete row, so cascade is safe.
  - **Proposed solution:** Document confirmation in `02-database/relationships/`.
  - **Dependencies:** None.
  - **Risk:** Low.
  - **Verification:** Confirm `archiveChild` does not call `db.delete()` (it updates `status`); confirm cascade rules match design.
  - **Files likely affected:** `02-database/relationships/` documentation

---

## Phase 4 — Form & Validation Improvements

- [ ] Improve error message linking (`aria-describedby`) in all forms
  - **Location:** `src/components/child-form.tsx`, `src/app/login/page.tsx`, `src/app/register/page.tsx`, `src/app/(app)/settings/page.tsx`
  - **Current behavior:** Most fields use `Field` component with `error` prop; some forms have `aria-describedby` linking to error IDs (`login/page.tsx` uses `emailHintId` + `errorId`). `register/page.tsx` uses `Field` errors but lacks explicit `aria-describedby` linking each error to input.
  - **Problem:** Screen readers may not associate error text with input consistently.
  - **Root cause:** Partial accessibility implementation.
  - **Proposed solution:** Ensure every input with an error has `aria-describedby` pointing to the error message element. Preserve existing colors and layout.
  - **Dependencies:** None.
  - **Risk:** Low; accessibility fix only.
  - **Verification:** Inspect rendered HTML; confirm `aria-describedby` links error message IDs.
  - **Files likely affected:** `src/components/child-form.tsx`, `src/app/login/page.tsx`, `src/app/register/page.tsx`, `src/app/(app)/settings/page.tsx`

- [ ] Ensure `register` checkbox (`agreed`) has `aria-required` and is validated server-side
  - **Location:** `src/app/register/page.tsx`, `src/actions/register.ts`
  - **Current behavior:** Client checkbox (`agreed`) is validated server-side (`String(agreedRaw ?? "").toLowerCase() === "on" || ... === "true"`). No `aria-required` on checkbox.
  - **Problem:** Accessibility gap; server validation is correct.
  - **Proposed solution:** Add `aria-required="true"` to checkbox; document in `07-ui-logic/accessibility/`. No theme change.
  - **Dependencies:** None.
  - **Risk:** Low.
  - **Verification:** Confirm checkbox has `aria-required`; server validation remains intact.
  - **Files likely affected:** `src/app/register/page.tsx`

---

## Phase 5 — Performance & Reliability

- [ ] Document performance characteristics of dashboard queries
  - **Location:** `src/lib/dashboard-data.ts`, `src/lib/queries.ts`
  - **Current behavior:** Many parallel queries (`Promise.all`) with sub-selects. Acceptable for SQLite with small dataset (~60 demo children + reference data).
  - **Problem:** Not a current performance problem; future growth may require optimization.
  - **Root cause:** Normalized relational design + real-time aggregation.
  - **Proposed solution:** Document query patterns. Suggest future optimization (materialized views, pre-computed summary tables) only if needed. Preserve theme.
  - **Dependencies:** None.
  - **Risk:** Low.
  - **Verification:** Confirm documentation matches code (`dashboardData()` function structure).
  - **Files likely affected:** `08-performance/backend/`, `02-database/queries/`

- [ ] Add loading/error/empty states review for all major pages
  - **Location:** All `page.tsx` files inside `(app)/`, `src/components/ui/states.tsx`
  - **Current behavior:** Some pages handle empty states (`EmptyState` component used in validation, duplicates). Some do not explicitly handle DB errors (rely on Next.js error boundary).
  - **Problem:** Inconsistent error/empty state handling.
  - **Root cause:** Partial implementation.
  - **Proposed solution:** Document which pages have states. Recommend adding consistent `EmptyState` and error handling without changing theme.
  - **Dependencies:** None.
  - **Risk:** Low.
  - **Verification:** Confirm `EmptyState` component (`states.tsx`) is available; check each page uses it where appropriate.
  - **Files likely affected:** `07-ui-logic/states/` documentation; optional component updates

---

## Phase 6 — Testing

- [ ] Write integration tests for authentication flow
  - **Location:** `src/lib/__tests__/` (new files)
  - **Current behavior:** `auth` logic is covered implicitly by `test-driven-development` patterns? Not directly tested.
  - **Problem:** No test covers `login`, `createSession`, `getCurrentUser`, `destroySession`.
  - **Proposed solution:** Add tests that create mock cookies/sessions and verify auth behavior. Preserve code behavior; tests only.
  - **Dependencies:** None.
  - **Risk:** Low.
  - **Verification:** Tests pass (`npm run test`); confirm they cover happy path and failure cases.
  - **Files likely affected:** `new src/lib/__tests__/auth.test.ts` (or similar), `vitest.config.ts`

- [ ] Write component-level tests for `ChildForm`
  - **Location:** `src/components/child-form.tsx`
  - **Current behavior:** No component tests.
  - **Problem:** Form logic (validation display, pending state) untested.
  - **Proposed solution:** Add React Testing Library or Vitest component tests. No UI/theme change.
  - **Dependencies:** None.
  - **Risk:** Low.
  - **Verification:** Confirm form submits correctly and displays errors.
  - **Files likely affected:** `new src/components/__tests__/child-form.test.tsx`

- [ ] Add regression tests for authorization bypass
  - **Location:** `src/lib/scope.ts`, `src/lib/permissions.ts`
  - **Current behavior:** Unit tests exist for `scope.test.ts`, `permissions` implied but not extensively tested.
  - **Problem:** Authorization logic could break with schema or role changes.
  - **Proposed solution:** Expand `scope.test.ts` with additional cases (e.g., unknown role, missing `barangayId`). Preserve code.
  - **Dependencies:** None.
  - **Risk:** Low.
  - **Verification:** All existing and new tests pass.
  - **Files likely affected:** `src/lib/__tests__/scope.test.ts`

- [ ] Create end-to-end test plan (document only; implementation optional)
  - **Location:** `10-testing/e2e/`
  - **Current behavior:** No E2E framework configured (Playwright/Cypress not installed).
  - **Problem:** No automated E2E coverage.
  - **Proposed solution:** Document E2E test plan describing critical user flows to test manually or with future tool. Preserve theme.
  - **Dependencies:** None.
  - **Risk:** None (documentation only).
  - **Verification:** Confirm plan references actual routes (`/login`, `/dashboard`, `/children/new`, `/validation`, `/duplicates`, `/monitoring`, `/reports`).
  - **Files likely affected:** `10-testing/e2e/e2e-plan.md`

---

## Phase 7 — Code Quality & Architecture

- [ ] Document all server actions with input/output contracts
  - **Location:** All `src/actions/*.ts`
  - **Current behavior:** Actions have `ActionState` type and use `fail`/`ok` helpers.
  - **Problem:** No centralized documentation of action inputs, permissions, and side effects.
  - **Proposed solution:** Create `04-api/server-actions/` documentation mapping each action (file, required permission, input schema, DB mutations, audit actions, revalidated paths).
  - **Dependencies:** None.
  - **Risk:** Low.
  - **Verification:** Confirm documentation covers all action files.
  - **Files likely affected:** `04-api/server-actions/action-map.md`

- [ ] Verify TypeScript strictness (no `any` usage in critical paths)
  - **Location:** `tsconfig.json`, all `.ts` / `.tsx` files
  - **Current behavior:** TypeScript strict mode is implied; `next.config.ts` sets `ignoreBuildErrors: false`. No `any` discovered in critical paths (audit did not find unsafe assertions).
  - **Problem:** Potential future regressions.
  - **Proposed solution:** Document confirmation; recommend running `npx tsc --noEmit` before any future merge.
  - **Dependencies:** None.
  - **Risk:** Low.
  - **Verification:** Confirm `npx tsc --noEmit` passes.
  - **Files likely affected:** `01-codebase/architecture/` documentation; `next.config.ts`

---

## Phase 8 — Content & Consistency

- [ ] Review and standardize placeholder / empty-state messages
  - **Location:** All pages using `EmptyState` (`src/components/ui/states.tsx`)
  - **Current behavior:** `EmptyState` has `icon`, `title`, `description` props. Used in validation, duplicates, notifications, registry (implicitly via empty table states).
  - **Problem:** Some messages are generic (`"No records yet."`, `"No notifications yet."`).
  - **Root cause:** Partial content review.
  - **Proposed solution:** Review all `EmptyState` usages; ensure messages are appropriate for context (e.g., explain why no records appear, suggest user actions). Preserve design.
  - **Dependencies:** None.
  - **Risk:** Low; content change only.
  - **Verification:** Confirm messages are consistent with feature purpose.
  - **Files likely affected:** `07-ui-logic/states/` documentation; optional message updates in pages/components

- [ ] Confirm terminology consistency across all pages
  - **Location:** `src/lib/constants.ts`, all pages
  - **Current behavior:** `RECORD_STATUSES`, `CHILD_STATUSES`, `EDUCATION_STATUSES`, `MONITORING_TYPES`, `INTERVENTION_STATUSES` are centralized.
  - **Problem:** Some labels use slightly different wording in UI vs. constants (e.g., `"Verified"` vs. `"Verified Records"`).
  - **Proposed solution:** Audit label mappings (`RECORD_STATUS_LABELS`, etc.) and confirm page text matches. Document any mismatches.
  - **Dependencies:** None.
  - **Risk:** Low.
  - **Verification:** Confirm page titles and card titles match `constants.ts` labels.
  - **Files likely affected:** `11-content/terminology.md`, `11-content/consistency.md`

---

## Phase 9 — Documentation & Maintenance

- [ ] Update `enhanced-plan/README.md` to reflect completed phases
  - **Location:** `enhanced-plan/README.md`
  - **Current behavior:** This plan exists; no implementation performed.
  - **Proposed solution:** After each phase, check completed tasks and update phase progress. Preserve documentation structure.
  - **Dependencies:** All phases.
  - **Risk:** None.
  - **Files likely affected:** `enhanced-plan/README.md`, `enhanced-plan/13-checklists/master-checklist.md`

- [ ] Create rollback strategy documentation
  - **Location:** `12-implementation/rollback/`
  - **Current behavior:** No rollback plan documented.
  - **Problem:** If future implementation breaks existing functionality, no rollback plan exists.
  - **Proposed solution:** Document rollback steps: revert DB schema (if changed), revert middleware, revert actions, revert components. Confirm build and tests pass after rollback.
  - **Dependencies:** Implementation phases.
  - **Risk:** Low.
  - **Verification:** Confirm rollback steps reference exact files that could change.
  - **Files likely affected:** `12-implementation/rollback/rollback-plan.md`

---

## Final Verification (After All Implementation)

Before claiming work complete, verify:

- [ ] Development server starts (`npm run dev`)
- [ ] Production build succeeds (`npm run build` with `NODE_OPTIONS` from `package.json`)
- [ ] TypeScript passes (`npx tsc --noEmit` or `next build` type check)
- [ ] Lint passes (`npm run lint`)
- [ ] All existing tests pass (`npm run test`)
- [ ] Database connectivity works (`local.db` or `TURSO_DATABASE_URL`)
- [ ] Authentication flows work (login, session cookie, logout, redirect on unauthenticated access)
- [ ] Authorization enforced server-side (`getAuthorizedUser()` returns null for unauthorized actions; `canAccessChild()` prevents scope bypass)
- [ ] Core user flows work: register, login, create/edit/archive child, validate, review duplicate, open monitoring, generate report, verify QR
- [ ] Error handling covers runtime errors, validation errors, missing records, unauthorized access
- [ ] Empty states display correctly
- [ ] Loading states visible (pending buttons, pending forms)
- [ ] Mobile layout works (sidebar collapses, header stays, forms responsive)
- [ ] Desktop layout works (sidebar visible, two-column dashboard, table pagination)
- [ ] Accessibility: keyboard navigation, focus rings visible (`outline: 3px solid var(--color-action-600)`), labels present
- [ ] Security: CSP headers in response, cookie flags (`httpOnly`, `secure` when `NODE_ENV=production`), no secrets exposed
- [ ] Data integrity: transactions complete, cascade rules work, audit logs created for sensitive actions
- [ ] UI/theme preserved (compare with `00-overview/ui-theme-preservation.md` checklist)

---

## Implementation Status (Planning Only)

> **This checklist is for future implementation.** No tasks have been executed. The audit confirms the current system works as documented (`README.md`, existing `documentation/`, code inspection). The master checklist defines the safe improvement path without redesigning the website.
>
> Do NOT begin implementation until the user explicitly instructs the AI to implement the `enhanced-plan` documentation.
