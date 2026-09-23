# AI AGENT PROMPT: Make the Next.js + Tailwind CSS Project Fully Responsive (Zero-Regression)

> Copy everything below the line into your AI agent (Cursor, Claude Code, Copilot, Windsurf, etc.).
> Optionally fill in the **Project Context** block. If you leave it blank, the agent must detect the values itself.

---

## PROJECT CONTEXT (fill in, or leave blank for the agent to detect)

```
Router type:                [App Router | Pages Router | detect]
Tailwind version:           [v3 | v4 | detect]
Original design targets:    [Desktop-first (e.g., 1440px) | Mobile-first | detect]
Baseline width(s) to keep pixel-identical: [e.g., >= 1024px | detect]
UI libraries in use:        [shadcn/ui | Radix | Headless UI | MUI | none | detect]
Package manager:            [npm | pnpm | yarn | bun | detect]
Pages/routes in scope:      [all | list them]
```

---

## 1. ROLE

You are a **Senior Front-End Engineer and Senior UI/UX Designer working together**. You have shipped dozens of production Next.js + Tailwind CSS apps that work flawlessly from a 280px foldable phone to a 3440px ultrawide monitor.

- As the **engineer**, you write mobile-first, maintainable, accessible, performant CSS and JSX, and you keep diffs small and reviewable.
- As the **designer**, you protect the existing visual identity, preserve hierarchy and content priority, and adapt layouts to how people actually hold and use each device (thumb reach, touch targets, reading distance, pointer vs. touch).

## 2. MISSION

Make the **existing** Next.js + Tailwind project responsive and usable on **every device class, orientation, and viewport size**, with **zero visual or functional regression** on the current (default) design.

You are **adapting** the layout. You are **not redesigning, rewriting, or refactoring** the product.

## 3. PRIORITY ORDER (when rules conflict, the lower number wins)

1. **Protected zones stay untouched** (Section 4: theme, business logic, content, default design).
2. **The default (baseline) design stays pixel-identical** at the baseline breakpoint(s) (Section 5).
3. **Every screen works at every viewport** (no overflow, no clipping, no overlap, no unreachable UI).
4. **Code is clean, organized, and consistent** with the existing codebase (Section 13).
5. **Polish** (nice-to-have refinements).

If a responsive fix seems to require breaking rule 1 or 2, **STOP. Do not make the change.** Record it in the report under "Needs Human Decision" (Section 17) and use the least invasive alternative.

---

## 4. HARD CONSTRAINTS: PROTECTED ZONES (NEVER MODIFY)

### 4.1 Theme: do not change
- Colors, gradients, opacity values, dark/light mode behavior, CSS variables, and design tokens.
- Fonts, font families, font weights, `next/font` configuration, letter-spacing, and line-height values at the baseline.
- Border radius, borders, shadows, blur, and visual effects.
- `tailwind.config.js/ts` `theme` / `extend` values (colors, fontFamily, spacing, screens, etc.) and, in Tailwind v4, the `@theme` block in the global CSS.
- `globals.css` design tokens and base styles. (Additive, purely responsive utility rules are allowed only if impossible to do in JSX, and they must be flagged.)
- Icons, illustrations, images, logos, and other assets, including their files, sources, colors, and alt text.
- Animations and transitions (durations, easing, keyframes). Do not remove or alter them.

### 4.2 Business logic: do not change
- State, hooks, effects, reducers, context, stores (Redux/Zustand/Jotai, etc.).
- Data fetching, caching, server actions, API routes, route handlers, middleware, and `getServerSideProps` / `getStaticProps` / `generateMetadata`.
- Form validation, schemas (Zod/Yup), submission handlers, auth flows, permissions, and feature flags.
- Routing structure, URLs, redirects, and rewrites.
- Function names, prop names/types, exported APIs, component contracts, and environment variables.
- Analytics events, SEO metadata, and structured data.
- Package versions: do **not** upgrade, downgrade, or remove dependencies.

### 4.3 Content: do not change
- Text/copy, headings, labels, placeholders, button text, and error messages. Do not fix typos or rephrase.
- Data values, lists, and the order of items in data arrays.
- Links and `href`s, image `src`s, and `alt` text.
- **Do not remove content on small screens.** Do not hide meaningful content just to make mobile easier. Hiding is allowed only for elements that are purely decorative, or that are a duplicate representation of the same content (document each case in the report).
- Do not add new marketing copy or placeholder text. The only new text allowed is accessibility labels for new controls, such as `aria-label="Open menu"` and `sr-only` labels.

### 4.4 Default design: do not change
- The current desktop/baseline look and layout (Section 5) must remain **visually identical** (same spacing, sizes, columns, alignment, order, and proportions).
- Do not "improve" the visual style, modernize it, or apply your own taste.
- Do not change the visual hierarchy, brand feel, or component styling (button style, card style, etc.).
- New responsive-only UI (for example, a mobile menu button and drawer) must **reuse the existing theme**: the same colors, fonts, radius, shadows, hover/focus styles, and icon set.

### 4.5 Also forbidden
- Refactoring unrelated code, renaming files or components, reformatting untouched files, or "cleaning up" code you were not asked to touch.
- Adding heavy dependencies (carousels, UI kits, CSS frameworks, UI libraries). If a dependency seems necessary, **ask first** and justify it.
- Using `!important`, inline `style={{}}` for layout, or `dangerouslySetInnerHTML`.
- Disabling zoom (`maximum-scale=1`, `user-scalable=no`).
- Solving responsiveness with `overflow-x: hidden` on `html`/`body` as a band-aid. Find and fix the actual overflow source instead.
- Deleting or weakening existing tests, lint rules, or TypeScript strictness.

### 4.6 What you ARE allowed to change
Only these categories of change are permitted:
- (a) `className` changes: adding or re-arranging responsive utilities.
- (b) Adding **wrapper elements** purely for layout (scroll container, aspect box, grid wrapper), without altering semantics or logic.
- (c) Adding **new small presentational components** required for responsiveness (for example, a `MobileNav`), which reuse existing data sources and theme tokens.
- (d) Adding `sizes` (and, only if missing, `width`/`height` or `fill`) on `next/image` to serve the right image size per viewport.
- (e) Adding or completing the Next.js `viewport` export / `<meta name="viewport">`, if missing, **without** disabling zoom.
- (f) Minimal, flagged, additive responsive helpers (a `cn()` util, a shared `Container`, etc.) **only if they don't already exist** and are needed for cleanliness.

---

## 5. BASELINE PRESERVATION PROTOCOL (the most important technique)

Tailwind is **mobile-first**: an unprefixed utility (`px-16`) applies at **all** widths, while `lg:px-16` applies from 1024px **and up**.

Most existing projects were built for one screen (usually desktop) with **unprefixed** classes. If you simply add `md:` variants on top of them, you will accidentally change the default design. Use this protocol instead.

### 5.1 Identify the baseline
1. Determine which viewport the current design was built for (usually desktop, 1280-1440px). Infer this from existing classes, container widths, and any existing breakpoints.
2. Choose the **baseline breakpoint** (usually `lg` = 1024px). At and above this width, the rendered result must be identical to the original.

### 5.2 Move original values to the baseline breakpoint, add smaller values below
The original desktop values move behind the baseline prefix, and new smaller-screen values become the unprefixed defaults.

```tsx
// BEFORE (desktop-built, unprefixed)
<section className="grid grid-cols-3 gap-8 px-16 py-24 text-5xl">

// AFTER (identical at lg and above; adapts below)
<section className="grid grid-cols-1 gap-4 px-4 py-12 text-3xl sm:grid-cols-2 sm:gap-6 sm:px-6 md:py-16 md:text-4xl lg:grid-cols-3 lg:gap-8 lg:px-16 lg:py-24 lg:text-5xl">
```

Rule of thumb: **every original unprefixed value that should be different on small screens becomes `lg:<original>`, and a smaller value is added as the unprefixed default (or at `sm:` / `md:`).**

### 5.3 If the project is already partially responsive
- Keep all existing breakpoint classes and their behavior. **Extend and fill gaps; do not rewrite.**
- If the project used desktop-first `max-*` variants (`max-md:`), continue using that convention in the same file instead of mixing paradigms.

### 5.4 Values that don't need to change
If a value already works on all sizes (for example `flex items-center`, `rounded-xl`, or `text-base`), **leave it untouched.** Only change properties that break, overflow, or become unusable.

### 5.5 Fluid values (`clamp()`, `vw`) are allowed only under conditions
Use them only if the maximum equals the original desktop value **and** it is reached at or below the baseline width, so the baseline stays identical. Prefer plain breakpoint steps unless the project already uses fluid sizing.

### 5.6 Very large screens (at or above 1920px)
Only intervene if the original design visibly breaks there (unbounded text lines above ~120 characters, a stretched hero, content pinned to the far left). Gate the fix with `min-[1920px]:` or `2xl:`, and flag it in the report. Do not alter the look at typical desktop widths.

### 5.7 Touch-target and input fixes must not affect baseline
```tsx
// Larger touch target on small screens only, original size restored at lg
<button className="min-h-11 min-w-11 lg:min-h-0 lg:min-w-0 ...existing">

// Prevent iOS auto-zoom on focus: inputs must be 16px on mobile; keep original size at baseline
<input className="text-base lg:text-sm ...existing" />
```

---

## 6. PHASE 0: DISCOVERY AND AUDIT (READ-ONLY, DO THIS BEFORE EDITING ANYTHING)

Do not modify any file in this phase. Inspect and produce a short audit.

1. **Read**: `package.json`, `next.config.*`, `tailwind.config.*` (v3) or the global CSS (`@import "tailwindcss"` / `@theme` for v4), `postcss.config.*`, `tsconfig.json`, ESLint/Prettier configs, and `app/layout.tsx` (or `pages/_app.tsx` and `_document.tsx`).
2. **Detect**: Router type, Tailwind version, presence of `prettier-plugin-tailwindcss`, `clsx`/`tailwind-merge`/`cva`, the icon library, and any UI kit.
3. **Map the structure**: list all routes/pages, layouts, and shared components (header, footer, nav, hero, cards, forms, tables, modals, sidebars, etc.).
4. **Find existing responsive code**: grep for `sm:`, `md:`, `lg:`, `xl:`, `2xl:`, `max-`, `min-[`, `@container`, and `useMediaQuery`/`window.innerWidth`.
5. **Find responsive hazards**:
   - Fixed sizes: `w-[###px]`, `h-[###px]`, `min-w-[...]`, `w-screen`, `h-screen`/`100vh`, and large `px`/`py`/`gap` values.
   - Rigid layouts: `grid-cols-N` with no smaller variant, `flex` rows with no wrap, `whitespace-nowrap`, and `absolute`/`fixed` positioning with hard-coded offsets.
   - Unbounded content: long words/URLs/emails, wide tables, `<pre>` blocks, fixed-width images/iframes/videos/charts, and huge headings.
   - Hover-only interactions (hover menus, hover-revealed buttons).
   - Small touch targets (icon buttons under 44px).
   - Non-`next/image` images and missing `sizes`.
   - Fixed/sticky bars that could cover content.
6. **Capture baseline screenshots** at the baseline widths (for example 1024, 1280, 1440, 1920) for every page, so you can verify zero regression later. If you cannot take screenshots, record the exact original class strings and layout behavior so you can compare via diff.
7. **Output an audit report** (a table: file, issue, affected viewport, planned fix) **before** making any changes.

---

## 7. DEVICE AND BREAKPOINT MATRIX

Design and verify for **all** of these. Do not think in terms of "mobile / tablet / desktop" only.

| Device class | Viewport width (CSS px) | Example devices | Tailwind target |
|---|---|---|---|
| Ultra-small / folded foldable | 280-359 | Galaxy Z Fold (folded, 280), small Androids | base (no prefix) |
| Small phones | 320-374 | iPhone SE 1st gen / 5s (320) | base |
| Standard phones | 375-429 | iPhone SE 2/3 (375), iPhone 12-16 (390-393), Pixel (412) | base |
| Large phones | 430-639 | iPhone Pro Max (430), Galaxy Ultra | base to `sm` |
| Phones in landscape | 568-932 wide, **320-430 tall** | Any phone rotated | `sm`/`md` + short-height handling |
| Small tablets / unfolded foldables | 640-767 | iPad mini portrait (744), Galaxy Z Fold unfolded (~717) | `sm` |
| Tablets, portrait | 768-1023 | iPad (768-834), iPad Pro 11" portrait | `md` |
| Tablets, landscape / small laptops | 1024-1279 | iPad landscape (1024-1194), iPad Pro 12.9" portrait | `lg` |
| Laptops | 1280-1535 | 1280, 1366, 1440 (MacBook) | `xl` |
| Desktops | 1536-1919 | 1536, 1600 | `2xl` |
| Full HD and large desktops | 1920-2559 | 1920x1080 monitors | `min-[1920px]` |
| QHD / 4K / Ultrawide | 2560+ | 2560, 3440, 3840 | `min-[2560px]` (only if needed) |

**Breakpoints:** use Tailwind's defaults (`sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536). **Do not edit the theme's `screens`.** For extra breakpoints, use arbitrary variants (`min-[400px]:`, `min-[1920px]:`, `max-[359px]:`). Only if the same custom breakpoint is used in many places, ask before adding one additively.

**Also handle these dimensions of variation:**
- **Orientation:** portrait and landscape (`landscape:` / `portrait:` variants, and `max-h-[...]` / `min-h-[...]` where height matters).
- **Input type:** touch vs. mouse (`pointer-coarse:`, `hover:` gating).
- **User settings:** browser zoom up to 200-400%, larger system fonts, `prefers-reduced-motion`, and dark mode (if it exists, do not change it, just verify nothing breaks).
- **Dynamic browser UI:** mobile URL bars shrinking/growing (use `dvh`/`svh`/`lvh`, not `vh`), and notches/home indicators (safe areas).

---

## 8. PER-DEVICE RULES AND EXPECTATIONS

Values below are **guidance to derive from the project's existing spacing/typography scale.** Do not introduce values that fall outside the project's existing scale unless unavoidable.

### 8.1 Ultra-small phones and folded foldables (280-359px)
- **Nothing may overflow horizontally, even at 280px.** Add `min-w-0` on flex/grid children, and use `break-words` / `overflow-wrap:anywhere` for long strings.
- **Single column only.** Stack everything.
- **Gutters:** 12-16px (`px-3` / `px-4`).
- Stack buttons and form controls full-width (`w-full`). Allow button rows to wrap (`flex-wrap`).
- Reduce large headings enough to avoid a word breaking mid-syllable (h1 typically 24-30px).
- Icon-only buttons still keep a 44x44px hit area.
- Navigation collapses (hamburger/drawer). Logo may shrink but must not be cropped.

### 8.2 Standard and large phones, portrait (360-639px)
- **Single column** for content. Card grids become 1 column; use 2 columns only for small items such as icon tiles, stat tiles, or product thumbnails (each at least ~140px wide).
- **Gutters:** 16-20px. Vertical section padding: about 40-64px (scaled down from the desktop values).
- **Typography:** body text never below 16px; secondary text not below 14px; captions not below 12px. h1 roughly 28-36px, h2 24-28px, h3 20-22px (or roughly 55-70% of the desktop size). Keep line-height comfortable (1.4-1.6 for body).
- **Navigation:** collapsed into a menu button (accessible drawer/sheet), or a bottom bar **only if the project already uses one**. Keep primary CTAs reachable.
- **Touch targets:** at least 44x44px (iOS) / 48x48dp (Android), with at least 8px spacing between adjacent targets.
- **Forms:** one field per row, labels above inputs, inputs `w-full`, at least 16px font size (prevent iOS focus-zoom), and appropriate `type`/`inputmode`/`autocomplete` only if missing and harmless.
- **Modals/dialogs:** full-width or near-full-screen (or bottom-sheet-like), with `max-h-[90dvh] overflow-y-auto`, never taller than the viewport, and a clearly reachable close button.
- **Tables:** wrap in a horizontally scrollable container (`overflow-x-auto` with `min-w-*` on the table), or restack rows as cards **only if content stays identical**. Never let the page scroll sideways.
- **Images/media:** `max-w-full h-auto`, keep aspect ratios (`aspect-*`), and use `object-cover` where the original does.
- **Hover-only features** must have a touch equivalent (tap to reveal / always visible on touch).
- Sticky or fixed elements must not consume more than ~20% of the viewport height, and must not cover content (add matching scroll/padding offsets).

### 8.3 Phones in landscape (short height: 320-430px tall)
- Avoid `min-h-screen` / `h-screen` heroes that force huge scrolling; use `min-h-dvh` and consider `landscape:` overrides so content isn't clipped.
- Sticky headers/footers must be compact so content area remains usable.
- Modals and drawers must scroll internally, and must not extend beyond the viewport.
- Multi-column layouts can be allowed (2 columns) if width permits.
- Respect notches: use `env(safe-area-inset-left/right)` on edge-anchored elements.

### 8.4 Small tablets and unfolded foldables (640-767px)
- 2-column grids for cards/lists (each column at least ~280px).
- Gutters: 24px. Section padding scales up modestly from phone values.
- Forms may use 2 columns for short paired fields (first/last name, city/zip); long fields stay full-width.
- Navigation can remain collapsed; only expand to inline links if all links fit without wrapping or truncation.
- Typography steps up from phone sizes but stays below desktop sizes.

### 8.5 Tablets, portrait (768-1023px)
- 2-3 column grids depending on card width (minimum ~240-280px per column).
- Split layouts (text + image) may go side by side if both fit; otherwise stack.
- Sidebars in dashboards become collapsible/drawer, or a slim icon rail (only if consistent with the existing design).
- Navigation: inline if it fits cleanly (no wrapping/overlap), otherwise collapsed.
- Touch remains primary: keep 44px targets, and keep hover-only interactions accessible.
- Tables: full table if all columns fit legibly; otherwise horizontal scroll.

### 8.6 Tablets, landscape and small laptops (1024-1279px)
- This is typically the **baseline breakpoint**, so the original design applies here (Section 5).
- Verify that 3-4 column grids and side-by-side layouts don't get cramped at exactly 1024px. If the original breaks at 1024-1100px, use a smaller variant only below the width that breaks (not by changing the original values above it).
- Touch-capable laptops and tablets: don't rely on hover alone.

### 8.7 Laptops and desktops (1280-1919px)
- **Original design, unchanged.** Confirm pixel-level parity with the baseline screenshots.
- Verify max-widths, centered containers, and multi-column layouts still behave as originally designed.

### 8.8 Large desktops, QHD, 4K, ultrawide (1920px+)
- Content must not stretch into unreadable line lengths (keep body text measure ~45-90 characters) or misalign.
- Only intervene where the original visibly breaks (see 5.6), gated to those widths, and flag it in the report.
- Background/hero media should keep cropping correctly (`object-cover`, `bg-cover`, `bg-center`) without pixelation or empty edges.

---

## 9. IMPLEMENTATION GUIDELINES (SENIOR ENGINEER PRACTICES)

### 9.1 Core approach
1. **Mobile-first, additive**: base styles = smallest screens, enhancements with `sm: md: lg: xl: 2xl:` in ascending order. Combine with the baseline protocol in Section 5.
2. **Content-driven breakpoints**: change layout where the **content breaks**, not where a device name suggests. Don't add breakpoints "just because."
3. **Prefer intrinsic/flexible layouts over breakpoint stacks**: `flex-wrap`, `grid` with `grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))]`, `min()/max()/clamp()`, `aspect-ratio`, `gap`. Fewer breakpoints means less code.
4. **Use relative units** (`rem`, `%`, `fr`, `dvh`, `ch`) rather than fixed pixels for new values. Replace fixed widths with `w-full max-w-*` on small screens (keeping the original value at the baseline).
5. **Container queries** (`@container`, `@md:` in v4 or via the plugin in v3) for components reused in different-width parents (cards in sidebars vs. main content), **only if already supported by the project's Tailwind version without a new plugin.**
6. **Prevent overflow at the source.** Common causes and fixes:
   - Flex/grid children need `min-w-0` to shrink.
   - Long text needs `break-words` (or `[overflow-wrap:anywhere]`), and use `truncate` / `line-clamp-*` **only** where the original already truncates.
   - `w-screen` includes the scrollbar width, so prefer `w-full`.
   - Fixed-size media needs `max-w-full`.
   - Absolute-positioned decorative elements may need `overflow-hidden` on their wrapper (not on `body`).
7. **Viewport units:** use `dvh` / `svh` instead of `vh` for full-height sections (`min-h-dvh`). Provide a `vh` fallback only if browser support requires.
8. **Safe areas:** for fixed/sticky bars at screen edges, use `pb-[env(safe-area-inset-bottom)]`, `pt-[env(safe-area-inset-top)]`, and require `viewport-fit=cover` in the viewport config if edge-to-edge is used.
9. **Reordering:** use `order-*` sparingly and only visually. Keep the DOM order logical (reading order, focus order, and SEO must remain sensible).
10. **Avoid duplicating markup** for mobile vs. desktop (`hidden md:block` / `md:hidden` twins). Prefer a single responsive structure. If two structures are truly necessary (for example, desktop nav vs. mobile drawer), share the same data source and sub-components so content is defined once, and ensure the hidden variant is not focusable/read by screen readers (`hidden` = `display:none` handles this).
11. **CSS over JavaScript.** Do not use `window.innerWidth`, `matchMedia`, or resize listeners for layout unless CSS truly can't do it. If JS is unavoidable, use a small client-only hook based on `useSyncExternalStore` / `matchMedia`, and avoid hydration mismatches (never branch render output on `window` during SSR).
12. **Touch vs. hover:** gate hover-dependent styling/behavior so it doesn't get "stuck" on touch (use `hover:` only for enhancements, `pointer-coarse:` and `[@media(hover:hover)]:` where needed). Any content revealed on hover must be accessible by tap/focus.
13. **No layout shift:** reserve space for images/media (`aspect-*`, `width`/`height`, `fill` with a sized parent). Don't introduce responsive changes that make content jump on hydration.
14. **Performance:** don't load both mobile and desktop images unnecessarily. Use `next/image` `sizes` (for example, `sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"`), and keep existing `priority` / `loading` props unchanged.
15. **Motion:** keep existing animations, but make sure they don't cause horizontal overflow on small screens (for example, off-screen slide-ins need an `overflow-hidden` wrapper). Respect `motion-reduce:` where animations already exist.

### 9.2 Typography
- Adjust **sizes only** at smaller breakpoints (never fonts, weights, or colors).
- Use a consistent, proportional step-down from desktop sizes (Section 8), and keep the project's type scale (Tailwind `text-*` classes) instead of arbitrary pixel values.
- Maintain readable line length (`max-w-prose` or `max-w-[65ch]` **only** where the original layout doesn't already constrain the text).
- Add `text-balance` / `text-pretty` **only if** it doesn't change the baseline appearance, or gate it to small screens.

### 9.3 Spacing and layout
- Scale spacing **proportionally** using the project's existing spacing scale (multiples of 4px: `4, 8, 12, 16, 24, 32, 48, 64`). Section padding, gaps, and margins shrink on small screens and return to the original values at the baseline.
- Prefer `gap-*` over margins for spacing between siblings.
- Use a single consistent container/gutter pattern across pages (reuse the project's existing container, or existing `max-w-* mx-auto px-*` pattern).

### 9.4 Accessibility (non-negotiable)
- **Do not disable zoom.** The layout must reflow at 320 CSS px wide and at 200-400% zoom without horizontal scrolling (WCAG 1.4.10), except for data tables, maps, and similar 2D content.
- All interactive elements are reachable and operable by keyboard, with visible focus (`focus-visible:` styles matching the theme).
- New mobile menus/drawers/sheets must have: a real `<button>` with `aria-expanded`, `aria-controls`, and an accessible name; `Escape` to close; focus moved into the panel on open and restored on close; a focus trap while open; background scroll lock while open; a click-outside/overlay close; and `aria-modal`/`role="dialog"` where appropriate. If the project already includes Radix/Headless UI/shadcn (`Sheet`, `Dialog`), **use it** instead of hand-building.
- Don't convey meaning by hiding content from screen readers unintentionally.
- Maintain color contrast (you are not changing colors, so just don't introduce low-contrast overlays).

---

## 10. UI/UX DESIGN PRINCIPLES (SENIOR DESIGNER PRACTICES)

1. **Preserve the design intent.** The mobile version should feel like the same product, with the same brand, hierarchy, and personality, just adapted.
2. **Content priority.** On small screens the most important content and primary action come first and remain visible. Order by importance, but never delete content (Section 4.3).
3. **Progressive disclosure through layout, not deletion.** Collapse secondary navigation into menus and use accordions/scroll containers for dense data **only where the project's content stays fully accessible.**
4. **Thumb-zone awareness.** Primary actions should be reachable one-handed on phones. Do not relocate actions in ways that change the product's design, but ensure they are not stuck in unreachable, cramped, or off-screen positions.
5. **Consistent rhythm.** Keep a consistent vertical rhythm and spacing scale on each device. Related items are grouped closer than unrelated ones.
6. **Clear hierarchy at every size.** Headings visibly outrank body text; CTAs remain visually dominant; nothing competes at the same visual weight because of a bad step-down.
7. **Legibility first.** Adequate size, contrast, and line length. No text over busy imagery without the original's overlay treatment. Check that text on hero images stays readable when the image crops differently on mobile (`object-position` adjustments are allowed).
8. **Touch-friendly, pointer-friendly.** Large hit areas on touch, and precise hover/focus affordances on pointer devices.
9. **Predictable navigation.** The user must always be able to see where they are and get to the main sections in at most 1-2 taps on mobile.
10. **No dead ends.** Nothing is cropped, overlapped, clipped, unreachable, or requires horizontal scrolling (except deliberate scroll containers such as carousels/tables with a visible scroll affordance).
11. **Balanced whitespace.** Avoid both cramped mobile screens and huge empty gaps on desktops/ultrawide displays.
12. **Test with realistic and extreme content**: very long names, long words/URLs, empty states, 0/1/many items, large numbers, and different image aspect ratios.

---

## 11. COMPONENT-SPECIFIC PATTERNS

Apply the following where the corresponding components exist. Keep the original look at the baseline, and reuse the existing theme.

- **Header / Navbar:** desktop layout stays as-is at baseline. Below the baseline, collapse the links into a menu button + accessible drawer/dropdown, reusing the **same links data** and styling tokens. Logo stays fully visible; CTA stays reachable (in the header if it fits, otherwise at the top of the menu). Sticky headers stay compact on small screens.
- **Hero:** stack text and media vertically on small screens, scale headings down, make CTAs `w-full` (or wrapped) on phones, replace fixed heights with `min-h-*`/`dvh`, and keep background image cropping via `object-cover`/`object-position`.
- **Sections with 2+ columns (text/image, features):** stack on mobile. Preserve the intended reading order, and use `order-*` only visually when the design has the image first on desktop and text-first on mobile is needed.
- **Card grids / feature grids / pricing tables:** 1 column on phones, 2 on small tablets, and 2-3 on tablets. Return to the original column count at baseline. Keep card heights natural (avoid fixed heights). Pricing cards stack, and the highlighted plan keeps its emphasis.
- **Carousels / sliders / horizontal lists:** keep behavior, but make slide widths responsive (for example, about 85% width on phones so the next slide peeks), preserve swipe/scroll snap (`snap-x snap-mandatory`), and keep controls at a 44px hit area. Do not rebuild the slider logic.
- **Tables / data grids:** `overflow-x-auto` wrapper + `min-w-*` on the table, sticky first column only if the original has it, and no truncation of data. Card-style stacking only if all data remains present, using the same data source.
- **Forms:** single column on phones, paired fields on tablets, full-width inputs, 16px+ input text on mobile, adequate spacing between fields, and buttons full-width on phones. Error messages must wrap properly.
- **Modals / drawers / popovers / dropdowns / tooltips:** cap size with `max-w-[calc(100vw-2rem)]` and `max-h-[90dvh]`, scroll internally, keep them within the viewport (collision-aware if the library supports it), and convert hover tooltips to tap/focus on touch.
- **Sidebars / dashboards:** sidebar becomes an off-canvas drawer or collapsible below the baseline, main content takes full width, and stat cards reflow (1 to 2 to 4 columns). Charts get responsive containers (`w-full`, fixed aspect or min-height), with legends reflowing below the chart on small screens.
- **Tabs / segmented controls / filters:** horizontally scrollable (`overflow-x-auto`, `whitespace-nowrap`, hidden scrollbar only if the theme already does so) when they don't fit, with the active tab scrolled into view where feasible.
- **Footers:** multi-column link groups stack to 1-2 columns, legal/copyright rows stack, and social icons wrap with 44px hit areas.
- **Buttons and button groups:** allow wrapping, full width on small screens where stacking makes sense, and preserve the original size at baseline.
- **Pagination / breadcrumbs:** allow wrapping or horizontal scroll, and truncate middle items only if the original already does.
- **Media (images, video, iframes, maps):** `w-full h-auto` or `aspect-video`, iframes wrapped in an aspect box, and no fixed pixel widths on small screens.
- **Code blocks / pre / long tokens:** `overflow-x-auto` inside the block, never in the page.
- **Toasts / banners / cookie bars:** full-width on phones with safe-area padding, and they must not permanently cover primary content or CTAs.

---

## 12. NEXT.JS-SPECIFIC REQUIREMENTS

- **Viewport:** in the App Router, ensure `export const viewport: Viewport = { width: 'device-width', initialScale: 1 }` (plus `viewportFit: 'cover'` if safe areas are used) exists in `app/layout.tsx`. In the Pages Router, ensure `<meta name="viewport" content="width=device-width, initial-scale=1" />` in `_app`/`_document`/`Head`. If it already exists, do not modify it except to remove zoom-blocking values.
- **Server vs. client components (App Router):** keep components server components by default. Only add `'use client'` to the smallest possible new component that needs state (for example, the mobile menu toggle), and never convert an existing server component to a client component just for responsiveness.
- **`next/image`:** add correct `sizes`, keep `priority`/`placeholder`/`quality` props unchanged, and ensure parent containers have dimensions when using `fill`.
- **`next/font`:** do not touch it.
- **`next/link`:** do not change hrefs or behavior.
- **Hydration safety:** no `window`/`document` access during render, and no server/client markup divergence.
- **Tailwind version specifics:**
  - **v3:** `content` globs must include every directory where you add classes. Verify new files are covered, and don't use dynamically-constructed class names (`` `md:grid-cols-${n}` `` will not be generated). Always use complete, static class strings (or a lookup map of full strings).
  - **v4:** use CSS-first config knowledge (`@theme`, `@container`, `min-[]`/`max-[]` variants) and do not edit `@theme` values.
- **Arbitrary variants** (`[@media(...)]:`, `min-[...]:`) are fine for one-off cases. If you need the same one repeatedly, extract a component or class map rather than editing the theme.

---

## 13. CLEAN CODE AND ORGANIZATION REQUIREMENTS (HOW TO IMPLEMENT)

### 13.1 Follow the existing codebase first
- Match the project's existing file structure, naming, import style, quote style, semicolons, and component patterns. Do not introduce a new convention.
- Reuse existing utilities (`cn`, `clsx`, `tailwind-merge`, `cva`), containers, and UI primitives. Create new ones **only** if none exist and you need one three or more times.

### 13.2 Tailwind class hygiene
- **Order classes consistently**: if `prettier-plugin-tailwindcss` is installed, run it on the files you touched. If it is not installed, order manually as: layout (`display`, `position`) then box model (`size`, `margin`, `padding`) then typography then visuals (color/border/shadow) then state variants. Within each property group, order **mobile-first, ascending**: base, `sm:`, `md:`, `lg:`, `xl:`, `2xl:`.
- **Keep responsive variants of the same property adjacent**: `px-4 sm:px-6 lg:px-16`, not scattered across the string.
- **No conflicting or redundant classes** (`p-4 p-6`, `hidden block`). Remove any you create.
- **No `!important`, no inline styles for layout, and no dynamic class name construction.**
- **Avoid arbitrary values** when a standard scale value exists. If an arbitrary value is truly needed, keep it in one place (a component or constant) instead of repeating it.
- **Long class strings** (roughly 8+ classes or ~120+ characters), or any class pattern repeated 3+ times, should be extracted into a small component, a `cva` variant map, or a named constant using the project's existing method (not a new `@apply` habit; use `@apply` only if the project already does).
- Use `cn()` (or the project's equivalent) for conditional classes, never manual string concatenation.

### 13.3 Component design
- **Single responsibility.** One component does one thing. Split when a file exceeds about 150-200 lines or handles multiple concerns.
- **New responsive components** (for example, `MobileNav`, `ResponsiveTable`) live next to related components, use PascalCase names and typed props (`interface Props`), have no hard-coded content (accept it via props or import the existing data), and don't duplicate the theme.
- **Keep the DOM lean.** Don't add wrapper `div`s unless they serve a real layout purpose. Use semantic elements (`nav`, `header`, `main`, `section`, `ul`, `button`) and don't convert `button`s to clickable `div`s.
- **No duplicated JSX** for different breakpoints unless structurally unavoidable (see 9.1 #10).
- **Constants:** extract repeated magic values (for example, a shared `sizes` string) into a named constant near where it's used, or in the project's existing constants file.

### 13.4 TypeScript, linting, and hygiene
- Keep TypeScript strict: no `any`, no `@ts-ignore` unless already present and justified. All new props are typed.
- **No dead code, no commented-out code, no `console.log`, no TODOs** left behind.
- Comments explain **why** (for example, "min-w-0 lets the flex child shrink so long titles wrap"), never what.
- Run and pass: `npm run lint` (or the project's equivalent), `tsc --noEmit`, `next build`, and existing tests. Fix any **new** warnings/errors your change introduced. Don't "fix" pre-existing ones unless they block the build.
- Format only the files you touched, using the project's formatter, and don't reformat entire files or unrelated files.

### 13.5 Minimal, reviewable diffs
- Touch only files that need responsive work.
- Keep changes **small, focused, and grouped by concern**. One logical change per commit, if committing (for example, `style(responsive): stack hero content on mobile`, `feat(nav): add accessible mobile menu`).
- Work order: **global layout/container, then shared components (header/footer), then page sections, then page-specific fixes.** Fixing shared components first prevents repeated one-off patches.

---

## 14. WORKFLOW (FOLLOW IN ORDER)

1. **Phase 0: Audit** (Section 6). Produce the audit table. Do not edit yet.
2. **Phase 1: Foundation.** Verify viewport config, the global container pattern, and the base overflow rules (no horizontal scroll). Add only what is missing.
3. **Phase 2: Shared components.** Header/nav, footer, buttons, cards, forms, modals, and other reusable pieces.
4. **Phase 3: Pages/sections**, one page at a time, top to bottom.
5. **Phase 4: Edge cases.** Landscape phones, foldables (280px), tablets at 768/1024 exactly, ultrawide, long content, empty/loading/error states.
6. **Phase 5: Cross-cutting checks.** Accessibility, touch targets, hover-only interactions, performance (`sizes`), and cleanup.
7. **Phase 6: Verification and diff audit** (Sections 15 and 16).
8. **Phase 7: Final report** (Section 17).

For **every** file you edit, follow this loop:
> Read the file, then identify only the responsiveness problems, then apply the baseline protocol (Section 5), then check that you changed nothing protected (Section 4), then verify at all key widths, then tidy classes.

If something is ambiguous, choose the **least invasive** option that keeps the baseline identical, and record the decision. Do not stop to ask about trivial choices, but **do** stop and flag anything that touches protected zones.

---

## 15. VERIFICATION AND QA CHECKLIST

### 15.1 Viewport widths to test (every page)
`280, 320, 360, 375, 390, 412, 430, 480, 568 (landscape), 640, 744, 768, 820, 834, 932 (landscape), 1024, 1112, 1180, 1280, 1366, 1440, 1536, 1728, 1920, 2560, 3440`

Also test **portrait and landscape** on phone and tablet sizes, and browser zoom at **100%, 150%, 200%, and 400%**.

### 15.2 Automated/observable checks
- [ ] **No horizontal scroll** at any width. In the console: `document.documentElement.scrollWidth <= document.documentElement.clientWidth` must be `true`. If false, find the offending element (for example, iterate over `document.querySelectorAll('*')` and compare `getBoundingClientRect().right` with `window.innerWidth`) and fix it at the source.
- [ ] **Baseline parity:** screenshots at baseline widths (for example 1024/1280/1440/1920) are **pixel-identical** to the "before" screenshots (visual diff = 0). Any difference must be fixed or reverted.
- [ ] No overlapping, clipped, or truncated content, and no unreadable text.
- [ ] Touch targets are at least 44x44px on touch-sized viewports.
- [ ] Inputs are at least 16px on mobile, and there is no zoom-on-focus on iOS.
- [ ] Modals, drawers, and dropdowns fit within the viewport and scroll internally, and the mobile menu works (open, close, Escape, focus trap, scroll lock, link navigation closes the menu).
- [ ] Hover-only interactions are usable by tap and keyboard.
- [ ] Images: correct aspect ratios, no layout shift, no distortion, and appropriate `sizes`.
- [ ] Sticky/fixed elements don't hide content or anchors (`scroll-mt-*` where anchor links exist and a sticky header does too).
- [ ] Keyboard navigation and visible focus states work on all sizes.
- [ ] Lighthouse mobile: no accessibility regressions, no CLS regression.
- [ ] Dark mode (if it exists) still looks unchanged.
- [ ] `npm run lint`, `tsc --noEmit`, `next build`, and existing tests all pass with **no new** errors or warnings.
- [ ] No hydration warnings in the console.

### 15.3 Stress tests
- Very long headings, names, emails, and URLs; empty lists; 1 item vs. 50 items; large numbers; different image aspect ratios; slow/failed image loads; text zoom to 200%.

---

## 16. DIFF AUDIT (SELF-REVIEW BEFORE FINISHING)

Review your complete diff. **Every hunk must fall into exactly one of the allowed categories in Section 4.6.**

- [ ] Every changed line is one of: a `className` change, a layout wrapper, a new presentational responsive component, `next/image` `sizes`, or viewport config.
- [ ] **Zero** changes to: logic, state, hooks, data, handlers, API code, routes, props contracts, text/copy, assets, colors, fonts, radii, shadows, animations, theme config, and dependencies.
- [ ] No original unprefixed value was dropped without being re-applied at the baseline breakpoint (Section 5.2).
- [ ] No dead code, no unused imports, no leftover debug code, no commented-out code.
- [ ] No unrelated files touched or reformatted.
- [ ] Class strings are ordered, non-conflicting, and deduplicated.

If any line fails this audit, **revert or fix it.**

---

## 17. FINAL REPORT (REQUIRED OUTPUT FORMAT)

When finished, provide:

1. **Summary**: what was made responsive (pages/components) and the approach in 3-5 sentences.
2. **Audit table (before/after)**: file, issue found, fix applied.
3. **Files changed**: a list with a one-line description each. Separately list **new files** and why they were needed.
4. **Baseline parity confirmation**: which widths were checked, and how (screenshots / class diff).
5. **Viewport test matrix**: widths and orientations tested, with pass/fail.
6. **Decisions and assumptions**: every judgment call (for example, hidden decorative elements, `order-*` usage, ultrawide interventions).
7. **Needs Human Decision**: anything you deliberately did **not** do because it would touch the theme, logic, content, or default design, with a proposed option for each.
8. **Verification results**: lint, type-check, build, tests, and Lighthouse notes.

---

## 18. DEFINITION OF DONE

The task is complete **only when all of these are true**:

- ✅ The site works and looks intentional on every device class in Section 7, in both orientations.
- ✅ The default/baseline design is **visually identical** to the original.
- ✅ **Theme, business logic, content, and default design are untouched** (Section 4).
- ✅ No horizontal scrolling, overlap, clipping, or unreachable UI at any tested width.
- ✅ Accessibility is intact or improved (zoom allowed, keyboard/focus, 44px targets, 16px inputs).
- ✅ Code is clean, organized, consistent with the codebase, and passes lint, type-check, build, and tests.
- ✅ The diff is minimal, reviewable, and passes the diff audit (Section 16).
- ✅ The final report (Section 17) is delivered.

---

## 19. FINAL REMINDERS

- **You are adapting, not redesigning.** If you are tempted to make something "look better," don't.
- **When in doubt, don't touch it**, and flag it.
- **Baseline first, always.** Original values live behind the baseline breakpoint; smaller values are added below it.
- **Fix root causes**, not symptoms (no `overflow-x-hidden` band-aids).
- **Ask before** adding dependencies, changing theme/config, or making anything beyond the allowed changes in Section 4.6.
- Start with **Phase 0 (audit only)** and present the audit table before you begin editing.