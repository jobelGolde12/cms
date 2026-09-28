# Phase 3 Checklist — Database & Data Integrity

- [ ] Read `src/db/schema.ts` — confirm all indexes listed
- [ ] Confirm `childFilters()` (`lib/queries.ts`) uses indexed columns for filters (`barangayId`, `recordStatus`, `status`, `sex`)
- [ ] Confirm `exists` sub-queries (`educationStatus`, `schoolId`) reference indexed columns (`childEducation.childId`, `isCurrent`, `educationStatus`)
- [ ] Confirm `childAddresses.isCurrent` index (`child_addresses_child_idx` + `isCurrent`) supports current address lookup
- [ ] Confirm `childEducation.isCurrent` index (`child_education_child_idx` + `isCurrent`) supports current education lookup
- [ ] Confirm all `references()` have appropriate `onDelete` (`cascade` for child data, `set null` for audit/user links)
- [ ] Document index/query alignment in `02-database/queries/`
- [ ] Confirm cascade behavior matches `archiveChild` (soft delete updates `children.status`, does not delete `childAddresses`/`childEducation` — safe because no `DELETE` called for archive)
