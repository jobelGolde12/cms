# Functional Tests

Key cases executed or verified:
- Reports list page loads with all 14 report cards
- View Report button navigates to /reports/[type]
- Report detail page uses buildReport() with real DB data
- Empty state shown when no records
- Back navigation works (Link component)
- Export buttons respect reports.export permission
- Auth/session works (cookie, session hash, expiration)
