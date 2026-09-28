# Phase 5 Checklist — Performance & Reliability

- [ ] Read `src/lib/dashboard-data.ts` — confirm `Promise.all()` structure; document query count and types
- [ ] Read `src/lib/queries.ts` — confirm pagination (`limit` + `offset`) and `count()` usage
- [ ] Confirm no N+1 patterns in `listChildren()` (joins: `barangays`, `childAddresses`, `childEducation`, `schools` — all single joins, not per-row queries)
- [ ] Confirm `EmptyState` component (`states.tsx`) used consistently across pages (check `validation/page.tsx`, `duplicates/page.tsx`, `notifications/page.tsx`, `monitoring/page.tsx`)
- [ ] Confirm `loading.tsx` (app-level) and `loading` patterns in dashboard cards (pending buttons show `"Saving…"` / `"Submitting…"`)
- [ ] Confirm responsive layout (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) works without overflow
- [ ] Confirm mobile sidebar (`mobile-nav-toggle.tsx`) does not break header layout
