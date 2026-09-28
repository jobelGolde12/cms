# Content Audit

## Evidence From Actual Codebase

### Labels & Terminology
- `RECORD_STATUS_LABELS` (`constants.ts`): `draft` → "Draft", `pending_validation` → "Pending Validation", `needs_correction` → "Needs Correction", `verified` → "Verified", `marked_duplicate` → "Marked Duplicate".
- `CHILD_STATUS_LABELS`: `active` → "Active", `inactive` → "Inactive", `archived` → "Archived".
- `EDUCATION_STATUS_LABELS`: consistent mapping.
- `MONITORING_TYPE_LABELS`: consistent mapping.

### Placeholder / Generic Messages
- Registry empty state: `"No records yet."` (`dashboard/primitives.tsx`, `BarangayDistribution` when `rows.length === 0`).
- Validation empty queue: `"No records pending validation"` (`validation/page.tsx`, `EmptyState` component).
- Notifications empty: `"No notifications."` (`notifications/page.tsx`).
- Activity log empty: `"No activity recorded yet."` (`dashboard/primitives.tsx`, `RecentActivity`).
- System status: hardcoded `databaseOnline: true` (`dashboard-data.ts`, line 476: `databaseOnline: true // the page could not render otherwise`). This is a safe assumption but could be misleading if DB is unreachable.

### Inconsistent Terminology (Minor)
- `monitoring` page title: `"Barangay Monitoring"` (`monitoring/page.tsx`). `Monitoring` is also the name of the module (`monitoring.view` permission). Consistent.
- `interventions` page uses `"Monitoring"` link but the title is `"Interventions"`. The `app-shell` navigation label is `"Monitoring"`. This is consistent (monitoring module contains interventions).
- `duplicates` page title: `"Duplicate Review"` (navigation label `"Duplicate Review"` matches).

---

References: `src/lib/constants.ts`, `src/components/dashboard/primitives.tsx`, `src/app/(app)/monitoring/page.tsx`, `src/app/(app)/duplicates/page.tsx`, `src/lib/dashboard-data.ts` (line 476).
