# Deployment / Build Checklist

- [ ] `npm run build` completes (`NODE_OPTIONS` from `package.json` applied: `--max-old-space-size=4096 --dns-result-order=ipv4first`)
- [ ] `next.config.ts` headers applied correctly (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, CSP present)
- [ ] `turbopack` enabled (`next.config.ts` line 4) — build uses Turbopack
- [ ] `productionBrowserSourceMaps: false` (memory/CPU savings)
- [ ] `removeConsole` excludes `error` only (`console.error` preserved for diagnostics)
- [ ] TypeScript errors not ignored (`ignoreBuildErrors: false`)
- [ ] `webpack` `watchOptions` ignores `local.db`, `.env*`, `.pem`, `.key`, `node_modules`, `.next`, `.git`, uploads, logs, public/images, scripts/seed.mts, lock files
- [ ] `config.resolve.symlinks = true` (monorepo/pnpm compatibility)
- [ ] No secrets exposed in build output (`.env.local` excluded by `.gitignore` and build process)
