# Remediation Plan

Priority scheme: P0 critical, P1 high, P2 medium, P3 low. Security first, then functional breakage, accessibility, maintainability.

| Task ID | Source Finding | Priority | Problem | Root Cause | Files Affected | Implementation Steps | Risks | Testing Strategy | Rollback | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| TASK-001 | BUG-001, BUG-002 | P1 | Mobile drawer translucent/overflowing; brand clips | Wrapper background inherited; fixed panel width; non-shrinking lockup | `WelcomeHeader.tsx`, `logo.tsx` | Separate backdrop/panel; opaque bounded panel; header row `justify-between`; responsive logo props | Drawer transitions/stacking could regress | Browser at 320/390/768/1024/1440; open/close | Revert two components | IMPLEMENTED / VERIFIED |
| TASK-002 | BUG-003, A11Y-001/002/003 | P1 | Dialog lacks focus management; touch targets small; helper text contrast | No focus effect; padding-based sizing; light colour token | `WelcomeHeader.tsx` | Focus close on open; Tab trap; Escape; inert background; restore focus; 44 px targets; brand-600 text | Inert applied to the header ancestor would freeze the dialog (caught and corrected during verification) | Keyboard walkthrough; focus/inert assertions; contrast calculation | Revert header | IMPLEMENTED / VERIFIED |
| TASK-003 | Navbar design | P2 | Header had no real navigation or section anchors; sparse desktop design | Landing sections lacked ids; nav only Sign In | `WelcomeHeader.tsx`, `WelcomeHowItWorks.tsx`, `WelcomeFeatures.tsx`, `WelcomeAbout.tsx` | Add section ids + `scroll-mt-20`; add desktop/mobile nav links and compact Sign In | Anchor scrolling behind sticky header | Click anchors; measure offset | Revert | IMPLEMENTED / VERIFIED (offset class change not re-measured in browser) |
| TASK-004 | BUG-005 | P2 | Welcome copy says Grades 7–12 | Copy not updated for 7–10 scope | `WelcomeAbout.tsx` | Change to Grades 7–10 | None | Grep; grade-scope tests | Revert | IMPLEMENTED / VERIFIED |
| TASK-005 | SEC-001 | P0/P1 | Advisers could invoke guidance AI over confidential records | AI used module read scope instead of documented AI role set | `src/actions/ai.ts` | Add `canUseGuidanceAi` (admin/school_admin/guidance); gate both actions | Over-restricting could block intended users | Targeted AI suite then full suite | Revert function and call sites | IMPLEMENTED / VERIFIED |
| TASK-006 | SEC-002 | P3 | Moderate uuid advisory via ExcelJS | Stale transitive dependency | `package.json`/lockfile | Upgrade only when ExcelJS supports uuid ≥ 11.1.1; avoid npm's downgrade suggestion | Downgrade would break exports | npm audit | N/A | BLOCKED (upstream) — documented |
| TASK-007 | PERF-001 | P3 | 10.2 MB hero source image | Oversized original asset | `public/school1.jpg` | Re-encode to ~2500–3200 px, q80 | Visual fidelity/content asset change | Visual compare; LCP measurement | Restore original | NOT IMPLEMENTED — documented (delivered bytes already optimized) |
| TASK-008 | A11Y-004 | P3 | Global eyebrow/footer microcopy contrast | Light brand token used for small text | `globals.css`, `WelcomeFooter.tsx` | Darken token or restrict usage | Alters established editorial look | Contrast calculation + visual review | Revert | NOT IMPLEMENTED — documented |

## Explicitly out of scope

- Redesigning the visual identity, content structure or brand.
- Production database changes or data backfills.
- Adding new dependencies or test frameworks.
