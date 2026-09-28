# Phase 2 Checklist — Security Hardening

- [ ] Confirm middleware validates session cookie (`hashToken`) and returns 401 for missing/invalid cookie
- [ ] Confirm middleware applies authorization (`getCurrentUser()` + optional permission check) for protected routes
- [ ] Confirm `/api/reports/[type]` still has handler-level `getCurrentUser()` and `hasPermission()` (defense-in-depth)
- [ ] Read all `src/actions/*.ts` — confirm `getAuthorizedUser()` present in every action
- [ ] Document authorization confirmation in `09-security/authorization/`
- [ ] Read `.env.example` and `.env` (do not expose secrets) — confirm no client-side `process.env` usage for secrets
- [ ] Confirm `.env.local` is in `.gitignore` (read `.gitignore`)
