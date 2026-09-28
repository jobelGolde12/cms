# Implementation Phase Plan

This document defines the logical order of future work. It references the master checklist (`13-checklists/master-checklist.md`) and task files in subfolders.

---

## Phase 1 — Foundation & Safety (Critical Architecture)
**Goal:** Fix fragile architectural gaps that could break existing functionality.
**Duration:** Short (1–2 tasks)
**Dependencies:** None
**Tasks (refer to master checklist):**
- [ ] Inspect/create `middleware.ts`
- [ ] Inspect `proxy.ts`
- [ ] Document rate-limit limitation

---

## Phase 2 — Security Hardening
**Goal:** Strengthen authorization and document security model without redesign.
**Duration:** Short
**Dependencies:** Phase 1 middleware (optional for middleware-level auth; handler-level auth is independent)
**Tasks:**
- [ ] Middleware authorization for `/api/reports/[type]`
- [ ] Audit all server actions for authorization consistency
- [ ] Verify environment variable exposure

---

## Phase 3 — Database & Data Integrity
**Goal:** Confirm and document database reliability.
**Duration:** Short
**Dependencies:** None
**Tasks:**
- [ ] Verify indexes match query patterns
- [ ] Confirm FK cascade behavior matches business rules

---

## Phase 4 — Form & Validation Improvements
**Goal:** Improve accessibility and error handling.
**Duration:** Short
**Dependencies:** None
**Tasks:**
- [ ] Improve `aria-describedby` linking in forms
- [ ] Add `aria-required` to register checkbox

---

## Phase 5 — Performance & Reliability
**Goal:** Document performance characteristics; add consistent loading/empty/error states.
**Duration:** Short
**Dependencies:** None
**Tasks:**
- [ ] Document dashboard query performance
- [ ] Review and standardize loading/empty/error states across pages

---

## Phase 6 — Testing
**Goal:** Add missing tests for critical flows.
**Duration:** Medium
**Dependencies:** Phase 1 (middleware must not break auth flow before testing auth)
**Tasks:**
- [ ] Integration tests for authentication
- [ ] Component tests for `ChildForm`
- [ ] Regression tests for authorization
- [ ] E2E test plan documentation

---

## Phase 7 — Code Quality & Architecture
**Goal:** Document contracts and verify TypeScript/build health.
**Duration:** Short
**Dependencies:** None
**Tasks:**
- [ ] Document server action contracts
- [ ] Verify TypeScript strictness

---

## Phase 8 — Content & Consistency
**Goal:** Standardize content and terminology.
**Duration:** Short
**Dependencies:** None
**Tasks:**
- [ ] Review placeholder/empty-state messages
- [ ] Confirm terminology consistency

---

## Phase 9 — Documentation & Maintenance
**Goal:** Maintain plan and prepare rollback.
**Duration:** Short (ongoing during implementation)
**Dependencies:** All phases (updated after implementation)
**Tasks:**
- [ ] Update master checklist progress
- [ ] Create rollback strategy documentation

---

## Final Verification (After All Implementation)
**Duration:** Short
**Dependencies:** All phases complete
**Tasks:** Refer to master checklist final verification items (development server, build, TypeScript, lint, tests, database, auth, authorization, core flows, error states, responsive, accessibility, security, data integrity, UI preservation).

---

## Dependency Graph (Simplified)
```
Phase 1 (Foundation)
  ↓
Phase 2 (Security) [optional dependency on Phase 1 middleware]
  ↓
Phase 3 (Database)
  ↓
Phase 4 (Forms)
  ↓
Phase 5 (Performance)
  ↓
Phase 6 (Testing) — depends on Phase 1 for auth stability
  ↓
Phase 7 (Quality)
  ↓
Phase 8 (Content)
  ↓
Phase 9 (Documentation) — updates continuously
```

All phases are designed to be safe: they either document existing behavior, add missing verification, or improve reliability without changing the UI/theme.
