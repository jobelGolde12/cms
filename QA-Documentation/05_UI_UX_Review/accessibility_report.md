# Accessibility Report

Method: manual WCAG 2.2 AA-oriented review, accessibility-tree inspection, keyboard testing and rendered colour contrast checks. No automated axe scan was available.

## Findings

### A11Y-001 — Mobile drawer had no focus management

```text
Finding ID:      A11Y-001
WCAG Area:       2.4.3 Focus Order; 4.1.2 Name, Role, Value
Severity:        Major
Affected Page:   /welcome
Affected Element: #welcome-mobile-nav and the hamburger trigger
Problem:         Focus stayed on the trigger; Tab moved into the page behind the open
                 dialog; background content remained in the accessibility tree.
Expected:        Focus enters the dialog, stays trapped, Escape closes it, and focus
                 returns to the trigger.
Recommended Fix: Focus the close button, trap Tab/Shift+Tab, toggle `inert` on
                 #main-content and footer, restore focus on close.
Implementation:  IMPLEMENTED
Verification:    VERIFIED — focus on "Close navigation menu"; Tab cycle confined;
                 Escape restores "Open navigation menu"; inert toggles true/false.
```

### A11Y-002 — Sub-44 px touch targets in the navbar

```text
Finding ID:      A11Y-002
WCAG Area:       2.5.8 Target Size (Minimum); 2.5.5 (Enhanced) best practice
Severity:        Minor
Affected Page:   /welcome
Affected Element: Hamburger trigger; drawer close; drawer navigation rows
Problem:         Trigger/close rendered 36×36 px via padding+20 px icon; rows were
                 shorter than 44 px.
Expected:        At least 44×44 px (24 px minimum under 2.5.8, 44 px target preferred).
Recommended Fix: h-11 w-11 controls; min-h-11 rows; h-11 Sign In.
Implementation:  IMPLEMENTED
Verification:    VERIFIED by rendered layout and source inspection.
```

### A11Y-003 — Drawer helper text below AA contrast

```text
Finding ID:      A11Y-003
WCAG Area:       1.4.3 Contrast (Minimum)
Severity:        Minor
Affected Page:   /welcome (drawer)
Affected Element: "Menu" label and school/address footer, 11 px
Problem:         text-brand-400 (#6B9CF5) on white ≈ 2.7:1, below 4.5:1 for normal text.
Expected:        ≥ 4.5:1 for small text.
Recommended Fix: Use brand-600 (#2449D8) — high contrast on white.
Implementation:  IMPLEMENTED
Verification:    VERIFIED by colour calculation and source. Visual re-check after the
                 colour-only change was not repeated.
```

### A11Y-004 — Decorative `eyebrow`/footer microcopy contrast (remaining)

```text
Finding ID:      A11Y-004
WCAG Area:       1.4.3 Contrast (Minimum)
Severity:        Minor
Affected Page:   /welcome, global editorial `eyebrow`, footer copyright
Affected Element: .eyebrow (brand-400), footer copyright lines (brand-400)
Problem:         Small uppercase labels and 11 px footer text use a light blue token
                 with roughly 2.7:1 contrast on white/tinted backgrounds.
Expected:        ≥ 4.5:1 for normal-size text.
Recommended Fix: Darken the eyebrow token or restrict it to large/decorative text;
                 use brand-600 for informational microcopy.
Implementation:  NOT IMPLEMENTED — changing the global editorial token would alter the
                 established visual identity beyond the requested navbar scope.
Verification:    OPEN
```

## Confirmed successes

| Check | Result |
|---|---|
| Skip-to-content link as first focusable element, visible on focus | PASS |
| Semantic landmarks: `header`, `nav[aria-label]`, `main#main-content`, `footer` | PASS |
| Heading hierarchy: one `h1`, section `h2`, card `h3` | PASS |
| Hamburger has `aria-label`, `aria-controls`, `aria-expanded` | PASS |
| Drawer is `role="dialog"`, `aria-modal`, labelled; hidden state removes it from focus | PASS |
| Decorative icons use `aria-hidden` | PASS |
| Hero parallax/reveal animations disabled under `prefers-reduced-motion` | PASS (CSS review) |
| Hero image has meaningful alt text | PASS |
| Nav links have visible focus rings | PASS |
| No keyboard trap outside intentional dialog trapping | PASS |
