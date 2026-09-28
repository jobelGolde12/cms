# Feature-Specific Audit — Monitoring & Interventions

## Routes
`/monitoring` (`GET` — overview cards by type)
`/monitoring/[type]` (`GET` — type-specific list, e.g., `education`, `out_of_school_youth`, `eccd`, `disability`, `general`)
`/monitoring/interventions` (`GET` — intervention list page)

## File Locations
- Page: `src/app/(app)/monitoring/page.tsx`
- Page: `src/app/(app)/monitoring/[type]/page.tsx` (not fully read individually; pattern similar to `monitoring/page.tsx`)
- Page: `src/app/(app)/monitoring/interventions/page.tsx` (not fully read)
- Component: `src/components/dashboard/primitives.tsx` (`MonitoringBarangayTable`, `MonitoringCasework`)
- Action: `src/actions/monitoring.ts` (`saveMonitoring`, `updateMonitoringStatus`)
- Action: `src/actions/interventions.ts` (referenced but not fully read; implied by `interventions` table usage)
- Schema: `src/db/schema.ts` (`childMonitoring`, `interventions`, `interventionFollowups`)
- Query: `src/lib/queries.ts` (`monitoringOverview`, `monitoringList`, `listInterventions`, `getFollowupsForIntervention`, `getMonitoringRecords`)

## Data Source
`childMonitoring` (monitoring type, status, observedAt, remarks, recordedBy) joined with `children` and `barangays`. `interventions` (interventionType, description, status, priority, dates, assignedTo, createdBy). `interventionFollowups` (followUpDate, status, notes, recordedBy).

## Potential Bugs / Issues
- `monitoringOverview()` uses `scopeSql` for monitoring counts — correct for row-level scope.
- `monitoringList()` uses `scopeSql` + optional `eq(childMonitoring.monitoringType, type)` — correct.
- `listInterventions()` applies `scopeSql` — correct.
- No middleware-level authorization for `/monitoring/interventions` (page-level `getCurrentUser()` only) — consistent with other protected routes.

---

References: `src/app/(app)/monitoring/page.tsx`, `src/actions/monitoring.ts`, `src/lib/queries.ts` (lines 868–1037).
