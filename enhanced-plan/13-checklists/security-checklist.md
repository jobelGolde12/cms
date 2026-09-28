# Security Verification Checklist

- [ ] `middleware.ts` (new or updated) validates session cookie (`hashToken`) and rejects invalid/missing cookies (401/403)
- [ ] All `src/actions/*.ts` start with `getAuthorizedUser()` or `getCurrentUser()` — no action lacks authorization check
- [ ] `childScope()` (`lib/scope.ts`) applied to all database queries reading `children` (check `queries.ts` functions: `listChildren`, `dashboardStats`, `monitoringOverview`, `monitoringList`, `listInterventions`, `buildReport`)
- [ ] `canAccessChild()` used before reading single child profile (`children/[id]/page.tsx` — line 38: `if (!canAccessChild(user, child)) redirect("/children");`)
- [ ] `canEditChild()` prevents editing verified records by non-admin (`actions/children.ts` line 186: `if (!canEditChild(user, child)) return fail(...)`)
- [ ] Rate limit (`lib/rate-limit.ts`) configured (10 attempts / 60s window) — document limitation if not changed
- [ ] CSP headers present (`next.config.ts`) — document `unsafe-inline` / `unsafe-eval` if preserved
- [ ] Cookie flags (`httpOnly`, `sameSite: "lax"`, `secure` conditional on env) verified (`lib/auth.ts` `createSession`)
- [ ] `.env.local` excluded from repository (`.gitignore`)
- [ ] No `NEXT_PUBLIC_` variables used for secrets (audit `src/` for `process.env` usage — only `SESSION_COOKIE_SECURE`, `NODE_ENV`, `TURSO_DATABASE_URL`, default credential env vars used; none are `NEXT_PUBLIC_`)
