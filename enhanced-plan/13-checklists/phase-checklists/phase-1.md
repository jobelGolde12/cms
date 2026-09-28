# Phase 1 Checklist — Foundation & Safety

- [ ] Confirm `src/app/middleware.ts` is missing (read directory listing)
- [ ] Create `src/app/middleware.ts` (if authorized) — session cookie validation, protected route guard
- [ ] Confirm middleware does not break existing session resolution (`getCurrentUser()`)
- [ ] Inspect `src/proxy.ts` (read file) — document behavior
- [ ] Confirm `proxy.ts` aligns with middleware (if middleware added)
- [ ] Read `src/lib/rate-limit.ts` — document in-memory limitation in `08-performance/backend/` and `09-security/findings/`
- [ ] Confirm `next.config.ts` headers remain intact after middleware addition
