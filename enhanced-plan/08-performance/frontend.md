# Performance Audit

## Evidence From Actual Codebase

### Frontend Performance
- **Client components:** `app-shell.tsx` (side navigation, search input, mobile toggle), `child-form.tsx` (form with `useActionState`), `login/page.tsx`, `register/page.tsx`, `sidebar-nav.tsx` (client-side active link detection via `usePathname`).
- **No unnecessary re-renders:** `dashboard/primitives.tsx` uses static props; no `useEffect` loops or expensive calculations in render. `KpiGrid` renders from prop array; `BarangayDistribution` calculates `max` once.
- **Image optimization:** No `<Image>` component usage found; no `next/image` imports in audited files. No unoptimized images in the application (only icons from `lucide-react`).

### Backend Performance
- **Dashboard aggregates (`dashboardData`, `src/lib/dashboard-data.ts`):** Uses `Promise.all()` with many parallel queries (`dashboardStats`, `byBarangay`, `education`, `recordStatus`, `duplicateFlags`, `needsCorrectionRow`, `activityRows`, `monitoringByBarangay`, `monitoringTypeRows`, `activeRow`, `openMonitoringRow`). This is efficient for SQLite with small dataset but could become a bottleneck with thousands of records.
- **Sub-queries (`exists`):** `dashboardStats` uses `sql` exists for education (`educationStatus = 'enrolled'`), `monitoringOverview` uses `exists` for education and school filters. These are acceptable for SQLite but not as fast as pre-computed fields or separate summary tables.
- **Pagination:** `listChildren()` (`src/lib/queries.ts`) applies `limit` and `offset` with `count()` for total — correct pagination pattern.
- **No N+1 query patterns discovered:** Queries use `innerJoin` and `leftJoin` with indexed foreign keys; no loops that query per row.

### Database Performance
- **Indexes (`src/db/schema.ts`):** All tables have appropriate indexes for read patterns (`email`, `lastName`, `barangayId`, `recordStatus`, `status`, `createdAt`, `tokenHash`, `userId`, `isCurrent`). Composite indexes cover common joins (`childAddresses` child + isCurrent, `childEducation` child + isCurrent + status).
- **No missing critical indexes:** `children` has `barangay_idx`, `record_status_idx`, `status_idx`, `created_idx`, `last_name_idx`, `first_name_idx`, `birth_idx`, `code_uq`. `childEducation` has `child_idx`, `school_idx`, `status_idx`, `sy_idx`.

### Network Performance
- **Payload size:** API responses (`GET /api/reports/[type]`) return file downloads (PDF/XLSX buffers), not JSON payloads — efficient.
- **CSP and security headers:** `next.config.ts` applies `nosniff`, `DENY`, `strict-origin-when-cross-origin`, CSP. These add minimal overhead.

---

References: `src/lib/dashboard-data.ts`, `src/lib/queries.ts`, `src/db/schema.ts` (indexes), `next.config.ts`, `src/components/dashboard/primitives.tsx`.
