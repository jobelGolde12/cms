# Testing Checklist

- [ ] Existing tests pass (`npm run test`): `queries-filters`, `utils`, `scope`, `schemas`, `workflow`
- [ ] Auth tests (new) cover `hashToken`, `verifyPassword`, `createSession` behavior, `getCurrentUser` with valid/expired/missing cookie, `destroySession`
- [ ] Scope tests (expanded) cover all roles (`admin`, `lgu`, `barangay`) with and without `barangayId`, `createdBy` filter, unknown role (`sql`1 = 0`)
- [ ] Component tests (new) cover `ChildForm` happy path (`createChild` / `updateChild`), validation errors (`fail()` display), pending state (`pending` prop), `mode` prop (`create` vs `edit`)
- [ ] Integration tests (new) cover `createChild` DB transaction (all 5 dependent tables inserted), audit log created, `revalidatePath()` called, duplicate candidates refreshed
- [ ] Integration tests cover `reviewValidation` (DB updates to `childValidations` + `children`), audit log, notification creation (`notify()`)
- [ ] API tests cover `/api/reports/[type]` — 401 (no cookie), 403 (no `reports.export`), 400 (unknown type / unsupported format), 200 (successful download with correct headers)
- [ ] Regression tests cover authorization bypass (direct server action call without auth should return `fail()`; direct DB query without `childScope()` should not be possible since all queries apply scope)
- [ ] E2E test plan (documented) covers critical user flows (`/login` → `/dashboard` → `/children/new` → `/validation` → `/children/[id]/edit` → `/duplicates` → `/monitoring` → `/reports` → `/qr` → `/settings` → `/users` → `/activity-logs` → `/notifications` → `/logout`)
