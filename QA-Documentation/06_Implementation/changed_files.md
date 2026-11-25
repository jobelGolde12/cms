# Changed Files

Only files modified during this audit are listed.

| File | Change | Reason | Related Task |
|---|---|---|---|
| `src/components/welcome/WelcomeHeader.tsx` | Rewrote header/drawer: opaque bounded panel, desktop nav, section links, focus trap, inert background, 44 px controls, contrast fixes, focus restoration | Responsive/design defects and accessibility | TASK-001, TASK-002, TASK-003 |
| `src/components/logo.tsx` | Added optional `hideSchoolNameOnMobile` and `markOnlyOnNarrow` props with conditional accessible name | Prevent brand clipping on phones without affecting other logo usages | TASK-001 |
| `src/components/welcome/WelcomeHowItWorks.tsx` | Added `id="how-it-works"` and `scroll-mt-20` | Anchor navigation target and sticky-header offset | TASK-003 |
| `src/components/welcome/WelcomeFeatures.tsx` | Added `id="capabilities"` and `scroll-mt-20` | Anchor navigation target | TASK-003 |
| `src/components/welcome/WelcomeAbout.tsx` | Added `id="compliance"`/`scroll-mt-20`; corrected Grades 7–12 → 7–10 | Anchor target; copy accuracy | TASK-003, TASK-004 |
| `src/actions/ai.ts` | Added `canUseGuidanceAi` and applied it to both guidance AI actions | Fix confirmed authorization defect | TASK-005 |
| `QA-Documentation/**` | Replaced the previous documentation set with this audit | Deliverable required by the QA lifecycle | Documentation |

## Restored / cleaned during the session

| Path | Action | Reason |
|---|---|---|
| `IMPLEMENTATION_PROGRESS.md` | Restored (`git checkout`) | A tracked file was unexpectedly deleted during the session; restored to avoid unrelated loss |
| `--viewport` | Deleted | Accidental file created by a malformed screenshot command |

`src/actions/__tests__/password-reset-flow.test.ts` was already untracked at session start and was left untouched; it is included in the test run.
