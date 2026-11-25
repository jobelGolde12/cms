# Functional Test Execution Results

Executed 2026-11-25.

## Welcome navbar / layout

| Test ID | Actual Result | Status | Evidence | Notes |
|---|---|---|---|---|
| NAV-001 | 320 px viewport: document width 305, header 305, no horizontal scroll; logo rendered as mark only | PASS | Browser measurement; screenshot | Fixed in this audit |
| NAV-002 | 390 px: brand mark + “Records Management System”, no truncation; hamburger visible | PASS | Screenshot | Fixed in this audit |
| NAV-003 | 768 px: lockup + hamburger, no overflow (`scrollWidth` 753 / viewport 768) | PASS | Screenshot + measurement | — |
| NAV-004 | 1440 px: How it works / Capabilities / Compliance / Verify a Record / Sign In all visible, 65 px header | PASS | Screenshot | — |
| NAV-005 | Drawer 304 px wide at 390 px (272 px at 320 px), opaque white, close button visible | PASS | Screenshots | Previously translucent and close button off-screen |
| NAV-006 | Backdrop click closes; trigger re-expanded=false | PASS | Browser interaction | — |
| NAV-007 | Escape closes; `aria-expanded=false`; focus restored to “Open navigation menu” | PASS | Browser evaluation | — |
| NAV-008 | Tab sequence cycled: How it works → Capabilities → Compliance → Verify → Sign In → logo → Close → repeat | PASS | Browser focus inspection | New focus trap |
| NAV-009 | `#main-content` inert true while open, false after close; background absent from focus order | PASS | Browser evaluation | New |
| NAV-010 | Clicking “How it works” sets `#how-it-works`; section top 63.75 px vs 65 px header before `scroll-mt` adjustment; final offset increased to `scroll-mt-20` | PASS | Browser measurement | Offset increased; not re-measured in a second browser session (class-only change) |
| NAV-011 | Hamburger and close are 44×44; drawer links `min-h-11` | PASS | Source inspection + rendered layout | Fixed from 36 px |
| NAV-012 | Drawer labels/helper text changed from `brand-400` to `brand-600` on white | PASS | Contrast calculation | AA pass; visual re-check not repeated after class-only change |
| NAV-013 | Welcome purpose copy now “Grades 7–10” | PASS | Source inspection; grep for 7–12 returns no welcome copy | — |
| NAV-014 | 320/390/768/1024/1440 all have `scrollWidth ≤ innerWidth` | PASS | Browser measurements | — |

## Automated suite

Command: `npm test` → **40 files passed, 464 tests passed**, duration ~20.9 s.

First run before remediation: 2 failed / 462 passed in `src/actions/__tests__/ai-actions.test.ts`.

| Test ID | Actual Result | Status | Evidence | Notes |
|---|---|---|---|---|
| AUTH-001…004 | Auth, session and password-reset tests passed | PASS | Vitest output | Login rate limit reviewed in `src/actions/auth.ts` |
| AUTH-005 | Password reset suite passed | PASS | Vitest output | New untracked test file included by runner |
| AUTHZ-001/002 | Proxy and role-gate expectations passed | PASS | Vitest output + source review | — |
| AUTHZ-003 | IDOR test passed | PASS | Vitest | — |
| AUTHZ-004 | Initially **FAILED**: teacher received a guidance summary. After fix, restricted error | PASS | Vitest after fix | See SEC-001 |
| AUTHZ-005 | Initially **FAILED**: teacher received a draft. After fix, `ok:false` | PASS | Vitest after fix | See SEC-001 |
| AUTHZ-006 | Guidance/admin allowed tests passed | PASS | Vitest | — |
| AI-001…004 | Confidentiality, injection, rate limit, integrity tests passed | PASS | Vitest | — |
| TEST-001 | Grade 7–10 enforcement tests passed | PASS | Vitest | — |
| BUILD-001 | `npm run build` exit 0; compiled in 13.9 s; `/welcome` static | PASS | Build log | Final run after all edits |
| LINT-001 | `npm run lint` exit 0, no output | PASS | Terminal | Final run after all edits |
| TS-001 | `npx tsc --noEmit` exit 0 | PASS | Terminal | Final run after all edits |
| DEP-001 | `npm audit --omit=dev`: 0 critical/high, 2 moderate (uuid via exceljs) | PASS (with documented risk) | Audit JSON | See dependency_scan.md |

## Browser-verified but not automated

| Area | Result | Status |
|---|---|---|
| Authenticated role workflows in a real browser | No test credentials supplied | BLOCKED |
| Mailgun email delivery | Not exercised | BLOCKED |
| Real AI provider call | Mocked in tests | NOT TESTED |
| Production server (`next start`) smoke test | Not run; production build succeeded | NOT TESTED |
