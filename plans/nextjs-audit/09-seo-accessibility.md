# SEO & Accessibility Review

## SEO
- `metadata` defined in root layout (`layout.tsx`) with `metadataBase`, `title` (default + template), `description`, `openGraph`, `twitter`. Good.
- `robots.ts` exists; must verify it returns appropriate `robots` rules (e.g., allow public pages, disallow auth pages).
- `sitemap` or `sitemap.ts` not observed; should be added or verified.
- Dynamic routes (`[id]`, `[token]`) may need individual metadata; inspect if pages export `generateMetadata()`.
- `canonical` URLs should be verified for duplicate content (e.g., `/login` vs `/welcome`).

## Accessibility
- Skip-to-content link present.
- `focus-visible` ring defined.
- `AppShell` uses `aria-label` extensively.
- `form` elements have labels (`label htmlFor`).
- `datalist` autocomplete may have limited screen reader support; consider `combobox` ARIA pattern.
- `Tooltip` must be keyboard-accessible (focusable, `Escape` to close).
- `MobileNavToggle` must have `aria-expanded`, `aria-controls`, and focus trap.
- `print:` media queries present; print output excludes navigation chrome.
- `prefers-reduced-motion` handled; animations disabled when preferred.
- Contrast ratios: `brand-900` (`#14295F`) on `brand-50` (`#F4F7FC`) likely passes AA; `action-600` (`#2449D8`) on white passes; verify all color pairs.

## Improvements
- Add `sitemap.ts` for SEO.
- Verify `robots.ts` rules.
- Audit mobile navigation for full keyboard accessibility.
- Verify tooltip keyboard behavior.
- Ensure all interactive elements have visible focus indicators (`focus-visible` CSS is present but must apply to all interactive elements).
