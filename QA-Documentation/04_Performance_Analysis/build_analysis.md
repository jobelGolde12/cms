# Build Analysis

## Command and result

```bash
npm run build
```

| Item | Result |
|---|---|
| Exit code | 0 |
| Compile time | 13.9 s (final run, after all edits) |
| Compiler warnings | None in final log |
| TypeScript errors | None (`ignoreBuildErrors: false`) |
| ESLint errors | None (`npm run lint` exit 0) |
| Render strategy | `/welcome` prerendered as static (`○`); authenticated modules dynamic (`ƒ`); Proxy/middleware active |

## Route observations

- All 41 page routes plus 4 API route handlers and `/logout` compiled.
- `/welcome`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/privacy`, `/verify`, `robots.txt` and icons are static/eligible for static delivery.
- Authenticated modules are dynamic and server-rendered on demand, appropriate for per-user data.
- No build-time environment failure occurred; the app builds without live Turso credentials because DB access is runtime-driven.

## Deployment concerns

- `serverExternalPackages: ["@react-pdf/renderer"]` is intentional; PDF routes depend on it running from `node_modules`.
- `productionBrowserSourceMaps: false` and console stripping (except `console.error`) are enabled.
- Strict CSP is applied globally; verify any future third-party script/iframe is added to the policy deliberately.
- Both npm and pnpm lockfiles exist; CI should pin one package manager.
