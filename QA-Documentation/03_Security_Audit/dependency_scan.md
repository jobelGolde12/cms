# Dependency Scan

Command: `npm audit --omit=dev` (production dependencies) — executed 2026-11-25.
Result: **0 critical, 0 high, 2 moderate, 0 low** across 272 production dependencies (865 total incl. dev).

| Package | Version | Purpose | Vulnerability status | Evidence / source | Recommended action | Implementation status |
|---|---|---|---|---|---|---|
| exceljs | 4.4.0 | Server-side Excel export/reporting | Moderate (via transitive uuid) | `npm audit` advisory GHSA-w5hq-g745-h8pq through uuid < 11.1.1 | Track ExcelJS release bundling uuid ≥ 11.1.1; do not downgrade to 3.4.0 blindly | NOT IMPLEMENTED — documented |
| uuid | 8.3.2 (transitive via exceljs) | Identifier generation for ExcelJS internals | Moderate — missing buffer bounds check in v3/v5/v6 when a caller buffer is supplied | `npm ls uuid`; advisory GHSA-w5hq-g745-h8pq; `npm audit` marks fix available only via ExcelJS downgrade | Upgrade when ExcelJS updates; no direct use of vulnerable API in this repo | NOT IMPLEMENTED |
| next | 16.4.6 | Framework | No advisory reported by npm audit | `npm audit` | Keep patched | N/A |
| react / react-dom | 19.2.8 | UI runtime | No advisory reported | `npm audit` | Keep patched | N/A |
| drizzle-orm | 0.45.2 | ORM | No advisory reported | `npm audit` | Keep patched | N/A |
| @libsql/client | 0.18.0 | Turso/libSQL driver | No advisory reported | `npm audit` | Keep patched | N/A |
| bcryptjs | 3.0.3 | Password hashing | No advisory reported | `npm audit` | Keep patched | N/A |
| zod | 4.6.6 | Validation | No advisory reported | `npm audit` | Keep patched | N/A |
| exceljs / recharts / framer-motion / lucide-react | see package.json | Reporting, charts, animation, icons | No other advisories reported | `npm audit` | Routine maintenance | N/A |

## Notes

- Both lockfiles (`package-lock.json`, `pnpm-lock.yaml`) exist; the audit used npm and the installed tree. Projects should standardise on one package manager to avoid drift.
- No unused-dependency or duplicate-package sweep was performed beyond the audit; that is an optimisation, not a security gap.
- The advisory’s practical exploitability is low here because ExcelJS is used to generate workbooks server-side and does not accept user-supplied buffers for uuid generation.
