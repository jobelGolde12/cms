# UI / Theme Preservation Contract

## Mandatory Preservation Requirement

The future implementation of this enhanced plan MUST NOT redesign the existing website. The current visual identity, theme, typography, color system, branding, navigation appearance, page structure, spacing philosophy, component styling, and overall design direction must remain intact unless an existing UI problem directly prevents functionality from working.

## Protected Areas (Do Not Change Without Explicit Justification)

- [ ] Current theme (`brand-50` through `brand-950`, `action-50` through `action-800`, `status-*` semantic colors)
- [ ] Existing typography (`Fira_Sans` as `font-sans`, `Fira_Code` as `font-mono`, `font-variant-numeric: tabular-nums` for numeric data)
- [ ] Existing branding (`"Child Mapping System — Sta. Magdalena"`, `"Municipal Child Mapping System"`, `"Sta. Magdalena, Sorsogon"`)
- [ ] Existing logo/icon treatment (`UsersRound` icon in header, navy `bg-brand-900` circle logo, `ShieldCheck` on login/welcome)
- [ ] Existing navigation appearance (left sidebar desktop, top mobile toggle, grouped sections: Core Modules / Operations & Tools / System)
- [ ] Existing page layout (two-column dashboard, card-based panels, registry table with pagination, validation queue list)
- [ ] Existing component styling (`rounded-xl`, `border-brand-200`, `shadow-xs`, `bg-white`, `text-brand-900` headers, `text-brand-500` descriptions)
- [ ] Existing color token names (`brand-*`, `action-*`, `status-*`) — do not rename or remove
- [ ] Existing spacing scale and layout language (`space-y-5`, `gap-5`, `max-w-7xl`, `mx-auto`)
- [ ] Existing focus ring style (`outline: 3px solid var(--color-action-600)`, `outline-offset: 2px`, `border-radius: 2px`)
- [ ] Existing animations / motion preferences (`prefers-reduced-motion` media query present)
- [ ] Existing responsive breakpoints (`sm`, `md`, `lg`, `xl`) and grid patterns (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`)
- [ ] Existing footer and header design (`sticky top-0 z-30 header`, `border-t border-brand-200/70` footer)
- [ ] Existing welcome / marketing page design (`WelcomeHero`, `WelcomeFeatures`, institutional header with Republic of the Philippines branding)

## Change Justification Requirement

Any proposed change that could affect these protected areas must:
1. Identify the exact file and line.
2. Explain why the existing UI prevents functionality from working.
3. Propose the smallest possible change that fixes the functional issue.
4. Confirm the change does not alter the theme, color tokens, typography, or branding.

If a UI-related issue is discovered (e.g., contrast issue, missing focus state), document it first in `07-ui-logic/accessibility/` or `07-ui-logic/responsiveness/` and explain why it affects usability or functionality before proposing any change.

---

## Evidence From Actual Codebase

- Theme tokens: `src/app/globals.css` lines 9–44 (`@theme` block with `--color-brand-*`, `--color-action-*`, `--color-status-*`).
- Typography variables: `src/app/globals.css` lines 10–11 (`--font-sans`, `--font-mono` mapped to `Fira_Sans` / `Fira_Code` variables from `layout.tsx`).
- Focus ring: `src/app/globals.css` lines 68–74 (`:where(a, button, ...)` with `outline: 3px solid var(--color-action-600)`).
- Layout patterns: `src/components/app-shell.tsx` (sidebar width `w-60`, header `h-16`, main `max-w-7xl`), `src/components/dashboard/primitives.tsx` (panel `rounded-lg border-brand-200 bg-white shadow-xs`).
- Branding text: `src/app/layout.tsx` metadata (`title.default: "Child Mapping System — Sta. Magdalena"`), `src/components/app-shell.tsx` header (`"Child Mapping System"` + municipality tag).
- Navigation grouping: `src/components/app-shell.tsx` lines 32–36 (`NAV_SECTIONS` array: Core Modules, Operations & Tools, System).

---

## Implementation Note

The only permitted changes to the UI/theme are:
- Fixing missing accessibility behavior (`aria-label`, `aria-describedby`, keyboard navigation) that prevents usability.
- Fixing broken responsive behavior (overflow, collapsed elements) that prevents content from being used on mobile/tablet.
- Fixing contrast or focus-state bugs that violate accessibility requirements.
- Fixing broken component interactions (buttons that don't submit, links that point to wrong routes, forms that don't handle errors).

In all cases, preserve the existing colors, spacing, typography, and layout structure.
