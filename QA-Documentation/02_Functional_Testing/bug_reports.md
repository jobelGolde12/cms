# Bug Reports

All items below were reproduced before the fix. “Verification Status” reflects the final state at the end of this audit.

---

## BUG-001 — Mobile navigation drawer is translucent, overflows and hides its close control

**Severity:** Major
**Priority:** P1
**Feature:** Welcome page navbar
**Environment:** Next.js dev server; Chrome; 390×844 and 320×720
**Preconditions:** Width < 1024 px; `/welcome` loaded.

**Reproduction Steps:**
1. Open `/welcome` at 390 px width.
2. Tap the hamburger.
3. Observe the drawer panel.

**Expected Behavior:** Opaque panel within the viewport with visible brand and close button.

**Actual Behavior:** Panel inherited `bg-white/95` from the full-screen wrapper, so page content showed through. The 256 px panel plus non-shrinking lockup pushed the close button outside the viewport; panel brand text was clipped. Drawer footer text was clipped as well.

**Impact:** Users could not see the close button and had to discover backdrop dismissal; visual quality and trust degraded.

**Root Cause:** Overlay wrapper carried both the background and `justify-end`; panel lacked its own opaque background and the lockup did not shrink. Fixed width `w-64` plus unscoped `px-5` in the footer.

**Code Reference:** `src/components/welcome/WelcomeHeader.tsx` (drawer markup, pre-fix).

**Recommended Fix:** Separate backdrop from panel; give the panel `bg-white` and `w-[min(19rem,calc(100vw-3rem))]`; make header row `justify-between` with `min-w-0` brand and `shrink-0` close button.

**Implementation Status:** IMPLEMENTED
**Verification Status:** VERIFIED — screenshots at 320/390 px; close button 44×44, panel 272/304 px.

---

## BUG-002 — Header brand clips at phone widths

**Severity:** Minor
**Priority:** P2
**Feature:** Welcome page navbar
**Environment:** 390 px and 320 px
**Preconditions:** `/welcome`.

**Reproduction Steps:** Load page at 390 px, then 320 px; inspect brand lockup.

**Expected Behavior:** Brand reads cleanly without ellipsis mid-word.
**Actual Behavior:** “STA. MAGDALENA NATIONAL HIGH S…” truncated at 390 px; at 320 px “Records Management ...” also truncated.

**Impact:** Unpolished first impression on the most common device class.

**Root Cause:** Two-line lockup (long school name + long product name) exceeded available width; `truncate` resolved the overflow by clipping.

**Code Reference:** `src/components/logo.tsx`, `src/components/welcome/WelcomeHeader.tsx`.

**Recommended Fix:** Opt-in logo behaviour for headers: hide the long school line below `sm`; show only the mark below 360 px, with an explicit accessible name.

**Implementation Status:** IMPLEMENTED
**Verification Status:** VERIFIED — screenshots at 320/390 px and accessibility-tree name “Sta. Magdalena National High School Records Management System”.

---

## BUG-003 — Drawer lacks focus management and page background remains reachable

**Severity:** Major (accessibility)
**Priority:** P1
**Feature:** Welcome page navbar
**Environment:** Mobile viewport; keyboard/screen reader
**Preconditions:** Drawer open.

**Reproduction Steps:**
1. Open drawer with keyboard.
2. Inspect `document.activeElement`.
3. Press Tab repeatedly.
4. Inspect accessibility tree.

**Expected Behavior:** Focus moves into the dialog, is trapped there, and background content is inert; focus returns to the trigger on close.

**Actual Behavior:** Focus stayed on the hamburger; Tab could move to page content; the accessibility tree still exposed hero/sections/footer; brand and controls inside the drawer were partly unreachable/duplicated.

**Impact:** Keyboard and assistive-technology users could lose context or interact with hidden content.

**Root Cause:** No focus effect, no trap, no `inert` background, no focus restoration.

**Code Reference:** `src/components/welcome/WelcomeHeader.tsx` drawer (pre-fix).

**Recommended Fix:** Focus close button on open; cycle Tab within the panel; Escape/backdrop close; set `#main-content` and footer `inert` while open; restore focus and inert state on cleanup.

**Implementation Status:** IMPLEMENTED
**Verification Status:** VERIFIED — focus moves to “Close navigation menu”; Tab cycles; Escape restores focus to trigger; `inert` toggles correctly.

---

## BUG-004 — Header controls below minimum touch target; helper text below AA contrast

**Severity:** Minor
**Priority:** P2
**Feature:** Welcome page navbar
**Environment:** Mobile

**Expected Behavior:** Interactive targets ≥44×44 CSS px; small text ≥4.5:1 contrast.
**Actual Behavior:** Hamburger hit area 36×36 px (`p-2` + 20 px icon); drawer footer 11 px text in `brand-400` (#6B9CF5) on white ≈ 2.7:1.

**Impact:** Harder to tap; low-vision users struggle to read the drawer location text.

**Root Cause:** Padding-based sizing and a decorative colour token reused for informational text.

**Code Reference:** `src/components/welcome/WelcomeHeader.tsx` (pre-fix classes).

**Recommended Fix:** `h-11 w-11` controls; `min-h-11` menu rows; `text-brand-600` for drawer labels and footer.

**Implementation Status:** IMPLEMENTED
**Verification Status:** VERIFIED by rendered layout/source and contrast calculation (visual re-check after colour-only change not repeated).

---

## BUG-005 — Landing-page copy states Grades 7–12 while the product supports Grades 7–10

**Severity:** Minor
**Priority:** P2
**Feature:** Welcome page content
**Environment:** `/welcome`

**Expected Behavior:** Marketing copy matches the enforced grade catalog (Grades 7–10).
**Actual Behavior:** Purpose section said “reporting for Grades 7–12.”

**Impact:** Misleads prospective users and contradicts server-side validation/tests.

**Root Cause:** Copy not updated during the Grade 7–10 scope change.

**Code Reference:** `src/components/welcome/WelcomeAbout.tsx:57`.

**Recommended Fix:** Change to “Grades 7–10”.

**Implementation Status:** IMPLEMENTED
**Verification Status:** VERIFIED — source inspection and grade-scope tests pass.

---

## SEC-001 — Guidance AI actions allowed roles broader than documented policy

**Severity:** Major (authorization)
**Priority:** P0/P1 (confidential student data)
**Feature:** AI guidance assistance
**Environment:** Vitest integration suite (SQLite)

**Reproduction Steps:**
1. Log in as `teacher` (adviser of the student's section).
2. Invoke `summarizeGuidanceCase({ studentId })`.
3. Invoke `draftGuidanceFollowUp({ incidentId })`.

**Expected Behavior:** Error “This feature is restricted to the Guidance Office role set.” No AI provider call.
**Actual Behavior:** Both actions succeeded and could include confidential incident records for the adviser's students, contradicting `documentation/ai/ai-features.md` (allowed: admin, school_admin, guidance).

**Impact:** Confidential guidance records could be sent to an external AI provider and returned to a role outside the documented AI role set.

**Root Cause:** Both actions used `canViewConfidentialBehavior`, which intentionally includes `teacher` for the guidance module, instead of a stricter AI-specific role check.

**Code Reference:** `src/actions/ai.ts` — `summarizeGuidanceCase`, `draftGuidanceFollowUp`; fix at `canUseGuidanceAi` (line ~365).

**Recommended Fix:** Add `canUseGuidanceAi` limited to admin/school_admin/guidance and use it in both actions.

**Implementation Status:** IMPLEMENTED
**Verification Status:** VERIFIED — both previously failing tests pass; full suite 464/464.
