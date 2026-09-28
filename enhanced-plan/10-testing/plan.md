# Testing Plan & Gaps

## Existing Tests
- `src/lib/__tests__/queries-filters.test.ts`
- `src/lib/__tests__/utils.test.ts`
- `src/lib/__tests__/scope.test.ts`
- `src/lib/__tests__/schemas.test.ts`
- `src/lib/__tests__/workflow.test.ts`
- `vitest.config.ts` configured.

## Gaps (Evidence-Based)
- No authentication flow tests (`login`, session creation, cookie behavior).
- No authorization / scope tests beyond basic `scope.test.ts` (limited cases).
- No component tests (`ChildForm`, `AppShell`, `SidebarNav`).
- No API route tests (`/api/reports/[type]` export, authorization, error cases).
- No end-to-end tests (`/login` → `/dashboard` → `/children/new` → `/validation`).
- No regression tests for database cascade behavior (`archiveChild` deletes nothing, but `deleteChild` does not exist; `archiveChild` updates `status`).
- No error-boundary tests (`global-error.tsx`, `error.tsx` minimal).

## Recommended Test Additions (Future Implementation Only)
- Unit: Auth (`performLogin`, `createSession`, `getCurrentUser`, `destroySession`).
- Unit: Scope (`childScope`, `canAccessChild`, `canEditChild`) with all role/status combinations.
- Unit: Workflow (`REVIEW_DECISION_TO_RECORD_STATUS` mapping, `nextChildCode` sequential generation with retry).
- Unit: Duplicate detection (`detectDuplicates`, `refreshDuplicateCandidates`).
- Component: `ChildForm` submission (happy path, validation errors, pending state).
- Integration: `createChild` → DB verification (transaction completes, audit log exists, duplicate candidates refreshed).
- Integration: `reviewValidation` → DB verification (validation updated, child `recordStatus` updated, notification created).
- API: `/api/reports/[type]` — unauthorized (401/403), unknown type (400), unsupported format (400), successful export (200 with correct headers).
- End-to-end (documented plan): Login → Dashboard → Registry (filter/search) → New Child → Validation Queue → Approve → Profile View → Archive → Monitor → Interventions.

---

References: `vitest.config.ts`, `src/lib/__tests__/*.test.ts`, `src/app/api/reports/[type]/route.ts`, `src/actions/auth.ts`, `src/lib/auth.ts`, `src/lib/scope.ts`, `src/lib/workflow.ts`.
