# Feature-Specific Audit — Reports

## Routes
`/reports` (`GET` — list of report types with links to PDF/XLSX exports)
`/api/reports/[type]` (`GET` — export handler)

## File Locations
- Page: `src/app/(app)/reports/page.tsx`
- API Route: `src/app/api/reports/[type]/route.ts`
- Service: `src/lib/reports/report-data.ts` (`buildReport`)
- Service: `src/lib/reports/pdf.tsx` (`renderReportPdf` — `@react-pdf/renderer`)
- Service: `src/lib/reports/excel.ts` (`renderReportExcel` — `exceljs`)
- Schema: `src/db/schema.ts` (`reports`, `reportExports`)

## Authentication / Authorization
- Page requires user (`getCurrentUser()`)
- API route requires `getCurrentUser()` + `hasPermission(user.role, "reports.export")`
- `reports.view` is checked by page access; `reports.export` by API access

## Export Formats
- `format` query param: `pdf`, `xlsx`, `csv` (API accepts all three but only PDF and XLSX have renderers; CSV falls through to error — audit notes `format !== "pdf" && format !== "xlsx"` returns 400, so CSV is rejected intentionally)

## Potential Bugs / Issues
- `buildReport()` creates `BuiltReport` with `columns` and `rows` (array of `Record<string, string | number | null>`). No schema validation for `ReportRow` keys.
- `reportExports` stores `fileReference` (string) but not the file bytes. This is by design (metadata only).
- `renderReportExcel()` uses `exceljs`; `renderReportPdf()` uses `@react-pdf/renderer`. Both return buffers; API returns `NextResponse` with appropriate `Content-Type` and `Content-Disposition`.
- `reports` table has `createdAt` only; no `updatedAt`. `reportExports` has `createdAt` and `expiresAt` (nullable).

---

References: `src/app/(app)/reports/page.tsx`, `src/app/api/reports/[type]/route.ts`, `src/lib/reports/report-data.ts`, `src/lib/reports/pdf.tsx`, `src/lib/reports/excel.ts`.
