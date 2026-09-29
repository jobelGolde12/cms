# Logic Analysis

## Duplicated / Inefficient Patterns Found
1. **No middleware**: Session validation relies solely on per-page `getCurrentUser()` calls. Direct action/API calls that miss `getAuthorizedUser()` are unprotected.
2. **Rate limit memory-only**: `rateLimit()` uses a process Map; horizontal scaling breaks it.
3. **Dashboard aggregates** (`src/lib/dashboard-data.ts`): Multiple parallel DB queries. Could be optimized with composite indexes or pre-aggregation, but acceptable for SQLite.
4. **Large result sets**: Several list pages (children, users, notifications) load all records without pagination.
5. **No centralized analytics**: No event tracking abstraction; analytics events not consistently tracked.
6. **Form submission duplication risk**: Some actions lack idempotency keys for mutations (e.g., register, duplicate reviews).
7. **No request correlation IDs**: Logs contain action/entity but no request-level trace ID for distributed debugging.
8. **Client bundle optimization**: Large imports (`lucide-react`, `recharts`, `framer-motion`) are tree-shaken via `experimental.optimizePackageImports`, which is correct.

## Business Logic Preservation Requirements
- Child registry workflow: create → validation → duplicate review → monitoring/interventions
- QR verification: generate, scan, revoke
- Report generation: filter, export (PDF/XLSX)
- User management: roles, permissions, deactivation protection
- Notification system: read/unread, user-scoped
- Audit trail: every significant mutation logs to `audit_logs`
