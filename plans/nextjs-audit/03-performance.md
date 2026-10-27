# Performance Review

## Bundle / Build
- `package.json` includes `sharp` for image optimization; `lucide-react`, `recharts`, `framer-motion` add bundle weight.
- `next.config.ts` includes `optimizePackageImports` for `lucide-react`, `recharts`, `lodash`, `moment`; `lodash` and `moment` not in dependencies — harmless but unnecessary.
- `webpack` `watchOptions` ignores `.db` files to prevent infinite recompiles.
- `turbopack: {}` enabled; Turbopack is still experimental in Next.js 16; should verify stability.

## Rendering Strategy
- Root page (`/`) uses `force-dynamic` to read cookies. This prevents static generation and increases server load for every visit. Consider whether a static landing page with client-side redirect (after auth check) could work, but for cookie-aware auth, `force-dynamic` is a valid and safe choice.
- No evidence of `export const dynamic = 'force-static'` or `revalidate` settings on important routes.
- Pages with data that changes infrequently (e.g., reports, settings) could benefit from ISR (`revalidate`) or static rendering with manual revalidation.

## Image Optimization
- `next.config.ts` does not configure `images.remotePatterns` or `images.disableStaticImages`.
- No `Image` component usage inspected yet; must audit all image usage.
- `public/` contains `apple-icon.png`, `favicon.ico`, and other assets.

## Font Optimization
- `globals.css` defines `font-sans` and `font-mono` but no `next/font` usage observed.
- Using `next/font/google` or `next/font/local` could improve font loading and reduce layout shift.

## Client JavaScript
- Many interactive components (`AppShell`, forms, charts, mobile nav) will ship JavaScript.
- `framer-motion` is a large library; audit whether animations are essential or can be replaced with CSS animations (many are already CSS-defined in `globals.css`).
- `recharts` is used for charts; acceptable for analytics but should be dynamically imported (`next/dynamic`) on routes where charts are not the first interactive element.

## Data Fetching
- `AppShell` performs async DB query (`unreadNotificationCount`) for every protected page render. This adds latency to every navigation. Consider:
  - Fetching notifications separately (e.g., via `Suspense` boundary) so the shell renders faster.
  - Caching the notification count with a short TTL.
- Route handlers may return data without caching headers; inspect each.

## Database Queries
- Schema includes many indexes; query performance likely acceptable for SQLite with current scale.
- No pagination limits observed in query inspection yet; unbounded queries could become slow as data grows.
- `SELECT *` patterns should be avoided in favor of selecting only needed columns.

## Performance Improvements (recommended, not yet implemented)
- Add dynamic import (`next/dynamic`) for chart components.
- Evaluate whether `framer-motion` can be removed from non-interactive pages.
- Add pagination to report and student list queries.
- Consider `Suspense` boundaries for notification counts.
- Ensure `next/font` is used for brand typography.
