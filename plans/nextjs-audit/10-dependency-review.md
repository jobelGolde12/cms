# Dependency Review

## Production Dependencies
- `next` (16.3.5) — very recent; may have experimental features (`turbopack`).
- `react` (19.2.8), `react-dom` (19.2.8) — latest major.
- `lucide-react` (1.47.0) — icon library; optimized with `optimizePackageImports`.
- `recharts` (3.10.1) — charting library; optimized but large.
- `framer-motion` (13.4.5) — animation library; consider whether it can be reduced or replaced with CSS animations.
- `drizzle-orm` (0.45.2), `@libsql/client` (0.18.0) — database layer; versions should be checked for compatibility.
- `bcryptjs` (3.0.3) — password hashing.
- `react-hook-form` (7.88.0), `@hookform/resolvers` (5.9.1), `zod` (4.6.5) — form handling and validation.
- `@react-pdf/renderer` (4.9.0) — PDF generation; requires server-side bundling (`serverExternalPackages`).
- `qrcode` (1.5.4), `@zxing/browser` (0.2.1) — QR generation/scanning.
- `arima` (0.2.8) — forecasting; check for security updates.
- `exceljs` (4.4.0) — Excel import/export.

## Development Dependencies
- `tailwindcss` (v4) — uses `@tailwindcss/postcss`; different from v3 (no `tailwind.config.js`, uses CSS `@theme`).
- `eslint` (v9), `eslint-config-next` (16.3.5) — modern ESLint config.
- `typescript` (v5), `sharp` (0.35.5) — image optimization.
- `vitest` (v3.2.7) — testing.
- `tsx` (v4.23.13) — TypeScript execution.
- `drizzle-kit` (v0.31.10) — schema migrations.

## Potential Issues
- `turbopack` is enabled with minimal config (`turbopack: {}`). Turbopack is still experimental; verify build stability.
- `next` v16.3.5 is newer than `eslint-config-next` v16.3.5; versions align.
- `tailwindcss` v4 (`@tailwindcss/postcss`) requires `postcss.config.mjs` and `globals.css` with `@import "tailwindcss"`. Check that build passes with v4 syntax.
- `sharp` version should be verified for security updates.
- `recharts` v3.10.1 may not fully support React 19; test thoroughly.
- `framer-motion` v13.4.5 may not fully support React 19; test thoroughly.
- `lodash` and `moment` mentioned in `optimizePackageImports` but not in dependencies; harmless.

## Dependency Recommendations
- Run `npm audit` and fix vulnerabilities.
- Verify `recharts` and `framer-motion` compatibility with React 19.
- Evaluate whether `framer-motion` can be removed or reduced.
- Ensure `sharp` is updated to latest secure version.
