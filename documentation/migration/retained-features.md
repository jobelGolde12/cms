# Retained Features

> STATUS: **PLAN** — features kept because the school system needs them and the
> implementation is sound.

| Feature | Code | Why retained |
|---|---|---|
| Session auth (cookie + bcrypt + hashed tokens) | `src/lib/auth.ts`, `sessions` table | Solid, audited, rate-limited; mechanics unchanged |
| Server-side RBAC | `src/lib/permissions.ts`, `roles`/`permissions`/`role_permissions` | Same skeleton re-cataloged for school roles |
| Row-level scoping pattern | `src/lib/scope.ts` | Pattern reused (`studentScope`) with role×assignment semantics |
| Append-only audit log | `src/lib/audit.ts`, `audit_logs` | Required by TODO §46; implementation already correct |
| In-app notifications | `src/lib/audit.ts` `notify`, notifications module | Useful for verification/intervention workflows |
| Duplicate detection + human review | `src/lib/duplicates.ts`, duplicates pages | Directly reused with student fields |
| Record status state machine | `src/lib/workflow.ts` | Same pattern for verification workflow |
| Report pipeline (PDF/XLSX + metadata + audit) | `src/lib/reports/*`, `/api/reports/[type]`, `report-data.ts` | Rebuild catalog, keep pipeline |
| QR token system | `src/lib/qr.ts`, `/qr`, `/verify/*` | Security model correct; retarget to students |
| User management UI + last-admin guard | `src/app/(app)/users/page.tsx`, `countOtherActiveAdmins` | Required module, unchanged mechanics |
| Activity log viewer | `/activity-logs`, `listAuditLogs` | Unchanged module |
| Skeleton/loading system + page transitions | `src/components/loading/*`, per-route `loading.tsx` | Recent perf work (see IMPLEMENTATION_PROGRESS.md) — preserve |
| Error boundaries | `error.tsx`, `global-error.tsx` | Retained |
| Design tokens & component library | `globals.css`, `ui/*` | Approved design (must not be redesigned) |
| Dashboard primitives (KPI grid, distribution bars, cards) | `dashboard/primitives.tsx` | Fed with school metrics |
| Registry kit (filters, chips, pagination, KPI grid) | `registry/registry-ui.tsx` | Reused for students |
| Zod + RHF validation stack | `src/lib/schemas.ts`, `child-form.tsx` pattern | Extended with student/academic schemas |
| Vitest suites | `src/lib/__tests__/*` | Ported to new domain + extended |
| Security headers & CSP | `next.config.ts` | Retained |
| Rate limiting | `src/lib/rate-limit.ts` | Retained (login) |
| Analytics event abstraction | `src/lib/analytics.ts` | Retained; event names updated |
| Idempotent seeding pattern | `scripts/seed.mts` | Rewritten for school data, same idempotency approach |
