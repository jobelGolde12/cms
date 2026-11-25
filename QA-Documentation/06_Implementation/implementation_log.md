# Implementation Log

## TASK-001 — Responsive, opaque mobile drawer and brand handling

Finding: BUG-001, BUG-002
Problem: The drawer was translucent, its close button fell outside the viewport at phone widths, and the two-line brand clipped.

### Changes Made

- File: `src/components/welcome/WelcomeHeader.tsx`
- Change: Split the full-screen wrapper into an explicit backdrop and a bounded opaque panel (`bg-white`, `w-[min(19rem,calc(100vw-3rem))]`, right-aligned). Header row is `justify-between`; brand area is `min-w-0`; close control is `shrink-0`. Drawer uses mark + “MENU” instead of a clipped lockup. Footer text wraps instead of truncating.
- Reason: Guarantee the panel and controls fit at any phone width and remain legible.

- File: `src/components/logo.tsx`
- Change: Added opt-in `hideSchoolNameOnMobile` (hides the long school line below `sm`) and `markOnlyOnNarrow` (mark-only below 360 px with `aria-label={BRAND_NAME}`). Defaults unchanged.
- Reason: Avoid ellipsis/clipping without altering every other Logo instance.

### Validation

- Test: Browser screenshots at 320, 390, 768, 1024, 1440 px; overflow measurements.
- Result: PASS — document width never exceeds viewport; close button visible; brand reads cleanly.

### Status

Implemented / Verified

---

## TASK-002 — Drawer focus management, touch targets and contrast

Finding: BUG-003, A11Y-001, A11Y-002, A11Y-003
Problem: Focus stayed on the hamburger, Tab could leave the dialog, background content remained reachable, controls were 36 px, and drawer helper text failed AA contrast.

### Changes Made

- File: `src/components/welcome/WelcomeHeader.tsx`
- Change: On open, focus the close button (`data-autofocus`); trap Tab/Shift+Tab within the panel; close on Escape/backdrop; set `#main-content` and footer `inert` while open; restore focus and inert state on cleanup. Hamburger/close are `h-11 w-11`; menu rows `min-h-11`; drawer labels/footer use `text-brand-600`.
- Reason: Meet dialog focus contracts and WCAG target-size/contrast requirements.

### Validation

- Test: Keyboard walkthrough (Tab sequence, Escape), focus/inert assertions in the browser, full accessibility-tree inspection, contrast calculation.
- Result: PASS — focus cycles How it works → Capabilities → Compliance → Verify → Sign In → logo → Close; Escape restores the trigger; inert toggles correctly.
- Note: A first implementation made the header's ancestor inert (because the page root wraps header+main), which froze the dialog. It was corrected to inert only `main` and `footer`, then re-verified.

### Status

Implemented / Verified

---

## TASK-003 — Desktop navigation and anchor targets

Finding: Navbar design gap
Problem: The header offered only “Sign In”, had no section navigation, and anchor scrolling had no targets/offset.

### Changes Made

- File: `src/components/welcome/WelcomeHeader.tsx`
- Change: Added desktop nav (How it works, Capabilities, Compliance), a divider, “Verify a Record” and a compact dark Sign In button. Mobile drawer exposes the same destinations plus Sign In. Header container padding now matches the hero.
- Files: `WelcomeHowItWorks.tsx`, `WelcomeFeatures.tsx`, `WelcomeAbout.tsx`
- Change: Added `id="how-it-works"`, `id="capabilities"`, `id="compliance"` and `scroll-mt-20`.
- Reason: Make the landing page navigable and consistent with `design.md` §6.

### Validation

- Test: Clicked “How it works”; hash and section position checked; visual review at 1024/1440 px.
- Result: PASS (offset raised from `scroll-mt-16` to `scroll-mt-20` after measuring a 1 px overlap under the 65 px desktop header; the class-only change was not re-measured in a second browser session).

### Status

Implemented / Verified

---

## TASK-004 — Grade-range copy

Finding: BUG-005
Problem: Welcome purpose copy advertised Grades 7–12 while the system enforces 7–10.

### Changes Made

- File: `src/components/welcome/WelcomeAbout.tsx`
- Change: “Grades 7–12” → “Grades 7–10”.
- Reason: Copy must match enforced product scope.

### Validation

- Test: Source grep; grade-level and student-action tests in full suite.
- Result: PASS.

### Status

Implemented / Verified

---

## TASK-005 — Guidance AI authorization

Finding: SEC-001
Problem: `summarizeGuidanceCase` and `draftGuidanceFollowUp` used `canViewConfidentialBehavior`, which includes advisers, although documentation restricts guidance AI to admin/school_admin/guidance. Two tests failed.

### Changes Made

- File: `src/actions/ai.ts`
- Change: Added `canUseGuidanceAi(user)` (admin | school_admin | guidance) and replaced the broader check in both actions. Advisers keep guidance-module read access; only AI assistance is narrowed.
- Reason: Enforce documented least privilege for confidential data sent to an external AI provider.

### Validation

- Test: `npx vitest run src/actions/__tests__/ai-actions.test.ts` → 39/39 pass.
- Test: `npm test` → 40 files, 464/464 pass.
- Result: PASS.

### Status

Implemented / Verified

---

## TASK-006 — Dependency advisory

Finding: SEC-002
Problem: uuid@8.3.2 via exceljs@4.4.0 has a moderate advisory.

### Changes Made

- None. npm's proposed fix is a semver-major downgrade of ExcelJS (3.4.0), which risks export regressions. No vulnerable API path is used.
- Reason: Avoid an unsafe dependency change without an upstream compatible release.

### Validation

- Test: `npm audit --omit=dev` — 2 moderate, 0 high/critical; documented.

### Status

Blocked (upstream) / Documented

---

## TASK-007 / TASK-008

- Hero source image (10.2 MB) and global eyebrow/footer contrast were documented as remaining recommendations; no code/content change was made. See `07_Verification/remaining_issues.md`.
