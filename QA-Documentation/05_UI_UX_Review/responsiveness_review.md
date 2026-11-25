# Responsiveness Review

Verified in Chrome at 320, 390, 768, 1024 and 1440 px widths.

## Final behaviour

| Viewport | Header | Result |
|---|---|---|
| 320×720 | Mark-only brand (below 360 px), 44 px hamburger | PASS — document width 305, no overflow |
| 390×844 | Mark + “Records Management System”, 44 px hamburger | PASS — no clipping |
| 768×1024 | Full lockup + hamburger; desktop nav hidden | PASS — 753 document width vs 768 |
| 1024×768 | Full desktop navigation, divider, Verify, Sign In | PASS — nav 293 px, no crowding |
| 1440×900 | Desktop navigation right-aligned; brand left | PASS — 65 px header, no overflow |

## Before/after

| Issue | Before | After |
|---|---|---|
| Drawer panel | Translucent (`bg-white/95` inherited), page visible through it | Opaque `bg-white`, dark navy backdrop, shadow |
| Drawer width | Fixed `w-64` (256 px) with fixed inner padding | `w-[min(19rem,calc(100vw-3rem))]` (272 px at 320, 304 px at 390) |
| Close button | Pushed outside the right viewport edge | 44×44, `shrink-0`, visible on every tested width |
| Brand in drawer | Clipped mid-word at the right edge | Brand mark + “MENU” label; no clipping |
| Brand in header | Truncated at 390 px (“…HIGH S…”); two-line clip at 320 px | School line hidden <640 px; mark-only <360 px; explicit accessible name |
| Header padding | `px-4` vs hero `px-5` (4 px misalignment) | `px-5 sm:px-8 md:px-10 lg:px-16`, aligned with hero |
| Desktop nav | Only “Sign In”; comment promised a register action | How it works / Capabilities / Compliance / Verify a Record / compact Sign In |
| Anchor offsets | Sections had no ids; `scroll-mt` absent | ids added; `scroll-mt-20` clears the 56–65 px sticky header |
| Drawer footer | `px-5` inside `p-5`; truncated single-line text | Padding-normalised, wrapping lines |

## Files responsible

- `src/components/welcome/WelcomeHeader.tsx` — all header/drawer layout, focus and inert logic.
- `src/components/logo.tsx` — optional `hideSchoolNameOnMobile`, `markOnlyOnNarrow`, accessible-name handling.
- `src/components/welcome/WelcomeHowItWorks.tsx`, `WelcomeFeatures.tsx`, `WelcomeAbout.tsx` — anchor ids and `scroll-mt-20`.

## Remaining responsive notes (not defects)

- The desktop navigation starts at `lg` (1024 px). Between 768–1023 px the drawer is used to avoid a cramped header.
- The 320 px mark-only brand is intentional: showing the wordmark there would clip.
- The welcome footer and editorial content use a narrower max-width than the hero by design; only the hero/header were aligned.
