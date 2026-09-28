# Decision Log

This log records important design and audit decisions. It supports future implementations of this plan by explaining why certain recommendations were made.

---

## Decision 1: Preserve Existing Theme / No Redesign
- **Date:** 2026-09-28
- **Context:** User instruction (task instructions section 3: MOST IMPORTANT UI AND THEME PRESERVATION RULE) explicitly requires preservation of current theme.
- **Evidence:** `src/app/globals.css` defines `brand-*`, `action-*`, `status-*` tokens. `layout.tsx` uses `Fira_Sans` / `Fira_Code`. All pages use these tokens consistently.
- **Decision:** All future work must preserve existing colors, typography, spacing, and layout. Changes to theme are only permitted for functional accessibility fixes (e.g., missing focus ring, broken responsive behavior).
- **Justification:** The user explicitly stated: "The existing website's UI, visual identity, theme, layout language, branding, and overall design direction MUST NOT be changed." Any redesign would violate the planning-only scope of this task and the user's requirements.

## Decision 2: No Source Code Changes During Audit
- **Date:** 2026-09-28
- **Context:** Task instructions section 2 (ABSOLUTE RULE: DO NOT IMPLEMENT ANYTHING) and section 43 (DO NOT INVENT FEATURES) prohibit any code modification.
- **Evidence:** No source files were edited (`find src -type f -newer package-lock.json` not relevant; `git status` shows only new `enhanced-plan/` directory).
- **Decision:** Only documentation was produced inside `enhanced-plan/`.
- **Justification:** This is a planning-only phase. Implementation requires explicit user authorization.

## Decision 3: Middleware Gap Documented (Not Implemented)
- **Date:** 2026-09-28
- **Context:** Audit discovered no `middleware.ts` file (`find src/app -name 'middleware*'` returns nothing).
- **Evidence:** `next.config.ts` applies security headers globally; `(app)/layout.tsx` uses `getCurrentUser()` redirect; `actions/*.ts` use `getAuthorizedUser()` independently.
- **Decision:** Documented as a critical gap (`01-codebase/routing/`, `09-security/findings.md`) and included in master checklist (Phase 1). Not implemented.
- **Justification:** Implementation of middleware could break existing session resolution or CSP headers if not carefully tested. It requires explicit authorization.

## Decision 4: Rate Limit Documented (Not Redesigned)
- **Date:** 2026-09-28
- **Context:** `src/lib/rate-limit.ts` uses in-memory counter.
- **Evidence:** `limit` is stored in process memory (`addressKey` string key with numeric value). No DB or external store referenced.
- **Decision:** Documented limitation (`08-performance/backend/`, `09-security/findings.md`). Not redesigned.
- **Justification:** The application is designed for a single-instance municipal deployment (`local.db` file or Turso DB). Redesigning rate limiting requires infrastructure changes (Redis, DB-backed store) that go beyond the scope of this audit and could affect deployment requirements.

## Decision 5: Feature Audit Based on Actual Code, Not Assumptions
- **Date:** 2026-09-28
- **Context:** Task instructions section 6 (UNDERSTAND THE APPLICATION BEFORE PLANNING) and section 31 (DO NOT INVENT FEATURES) require codebase-based justification.
- **Evidence:** All feature audits (`05-features/*.md`) reference actual files (`src/app/(app)/...`, `src/actions/*.ts`, `src/lib/*.ts`). All recommendations reference specific lines or patterns (e.g., `nextChildCode()` sequential code with retry, `exists` sub-queries in `dashboardStats`).
- **Decision:** Every recommendation is tied to an actual file, function, or data model.
- **Justification:** Prevents generic or invented improvements. Ensures future AI coding agent can locate and implement tasks safely.

## Decision 6: Testing Plan Reflects Actual Gaps
- **Date:** 2026-09-28
- **Context:** Only 5 test files exist (`queries-filters`, `utils`, `scope`, `schemas`, `workflow`).
- **Evidence:** No auth flow tests, no component tests, no E2E framework installed.
- **Decision:** Documented gaps (`10-testing/plan.md`) and proposed specific test files (`auth.test.ts`, `child-form.test.tsx`, `scope.test.ts` expansion, E2E plan).
- **Justification:** Matches actual codebase state. Proposes safe, targeted testing without redesigning architecture.

---

This decision log will be updated during future implementation phases if new architectural choices are made.
