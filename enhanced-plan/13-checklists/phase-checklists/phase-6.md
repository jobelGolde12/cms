# Phase 6 Checklist — Testing

- [ ] Confirm `npm run test` passes with existing 5 test files (`src/lib/__tests__/*.test.ts`)
- [ ] Create `src/lib/__tests__/auth.test.ts` (new file) — test `hashToken`, `verifyPassword`, `createSession` logic (mock cookie store if necessary)
- [ ] Confirm `scope.test.ts` covers `childScope()` for all roles (`admin`, `lgu`, `barangay`) and unknown role (`sql`1 = 0`)
- [ ] Confirm `schemas.test.ts` validates `childFormSchema`, `loginSchema`, `userFormSchema`, `monitoringFormSchema`, `interventionFormSchema`
- [ ] Confirm `queries-filters.test.ts` validates `childFilters()` with various query parameters
- [ ] Confirm `workflow.test.ts` validates `REVIEW_DECISION_TO_RECORD_STATUS` mapping
- [ ] Confirm new tests reference actual functions (not invented behavior)
- [ ] Confirm component tests (`ChildForm`) reference actual props (`barangays`, `schools`, `defaults`, `mode`)
