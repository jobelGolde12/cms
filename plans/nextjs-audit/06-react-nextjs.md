# React & Next.js Review

## Server Components vs Client Components
- `AppShell` is an async Server Component that performs DB queries; this is correct.
- `RootLayout` and `(app)Layout` are Server Components; no client-side logic needed.
- `WelcomePage` and other landing components may be static or dynamic depending on usage.
- Interactive components (`MobileNavToggle`, `SidebarNav`, `LogoutButton`, forms, charts) must be Client Components (`"use client"`). Need to verify which ones are properly marked and which are unnecessarily client-side.
- `components/ui/*` may contain both SC and CC variants; inspect.

## Component Size and Duplication
- `AppShell` is a large component (~200 lines) that combines layout, sidebar, header, search form, notification badge, user info, footer. For maintainability, consider splitting into smaller sub-components (e.g., `Sidebar`, `Header`, `Footer`, `SearchForm`).
- `components/app-shell.tsx` duplicates some navigation section definitions (`NAV_SECTIONS`) that are also in `navLinks`. This is acceptable as they serve different purposes (navigation links vs section grouping).
- `components/welcome/*` contains multiple small components for the landing page; good modularity.

## Prop Drilling
- `AppShell` passes `user: SessionUser` and `children` to the layout; `user` is propagated to sidebar, header, and footer sections. No deep prop drilling observed.
- `SidebarNav` receives `links` array; `navLinks` defined locally in `AppShell`.
- No global context provider for auth observed; auth is server-side only. This is preferred: no unnecessary context.

## Effects and State
- `welcome/useScrolled.ts` likely uses a scroll listener; must verify cleanup (`useEffect` return function) and performance (`useSyncExternalStore` preferred over `useEffect` for scroll state in React 19).
- Chart animations (`recharts`) should use CSS animations or minimal JS animations to avoid expensive renders.

## Accessibility
- Skip-to-content link present (`sr-only focus:not-sr-only`).
- `AppShell` uses `aria-label` extensively; `main#main-content` has `tabIndex={-1}` for focus management after skip link.
- `focus-visible` ring defined in CSS (`outline: 3px solid`).
- `form` with `role="search"` and `label` for search input; good.
- `datalist` used for autocomplete; acceptable but may not be fully accessible in all browsers.
- Mobile navigation (`MobileNavToggle`) must be keyboard accessible (focus trap, `Escape` close, `aria-expanded`). Inspect implementation.
- `Tooltip` component from `components/ui/tooltip` must support keyboard focus and not rely solely on hover.
- `print:hidden` and `print:` CSS rules present; good for print accessibility.

## Responsive Design
- `AppShell` uses responsive breakpoints (`lg:` for sidebar visibility, `hidden lg:flex`, `lg:hidden`, etc.).
- `globals.css` does not include responsive typography or container queries; relies on Tailwind utility classes.
- `max-w-7xl` container used; good.

## React Best Practice Issues
- `AppShell` defines `navLinks` as a constant array; it references `SCHOOL`, `ROLE_LABELS`, and `hasPermission`. This is fine for a static array.
- `visibleLinks` is computed with `.filter()` on every render; acceptable for small arrays, but could be memoized if needed (`useMemo`).
- No `React.memo`, `useMemo`, or `useCallback` observed in `AppShell`; unnecessary for current complexity.
- `framer-motion` used for animations; verify whether it is imported only in interactive components or globally.

## React 19 Compatibility
- React 19.2.8 is very new; some libraries (`recharts`, `framer-motion`) may not fully support React 19. Verify compatibility and any deprecation warnings.
- `useFormStatus` and `useActionState` (React 19 hooks) may not be used yet; consider adopting for form state if appropriate.
