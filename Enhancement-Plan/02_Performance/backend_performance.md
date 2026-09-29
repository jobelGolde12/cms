# Backend Performance
- `getCurrentUser()` uses `cache()` — good
- Dashboard aggregates (`dashboard-data.ts`) run multiple parallel queries — acceptable for SQLite but could be optimized with composite indexes or a dedicated aggregate table
- No query memoization beyond React `cache()`
- Server actions return JSON/state directly; no unnecessary serialization overhead
- Rate limit in-memory only
- No middleware-level session validation adds per-request DB overhead
