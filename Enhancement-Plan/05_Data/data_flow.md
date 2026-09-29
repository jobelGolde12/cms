# Data Flow Audit

## Critical Workflows

### Login Flow
User → Login Page → `performLogin()` (Server Action) → `verifyPassword()` → `createSession()` → Cookie Set → Redirect

### Child Registry Flow
User → Children List → `/children/[id]` → Child Details → Edit Form (`child-form.tsx`) → `updateChild()` Action → DB Update → Revalidate

### Validation Flow
Validation Page → Submit Form → `submitValidation()` → DB Insert (`child_validations`) → Audit Log → Revalidate Path

### Duplicate Review Flow
Duplicates Page → Select Candidate → Review Form → `reviewDuplicate()` → DB Update (`child_duplicate_candidates`) → Audit Log → Revalidate

### Monitoring / Intervention Flow
Monitoring Page → `recordMonitoring()` / `createIntervention()` → DB Insert → Audit Log → Revalidate

### Report Flow
Reports Page → Select Filters → `generateReport()` → DB Query → `reportExports` Insert → File Reference (PDF/XLSX) → Download Link

## Duplication / Redundancy
- Some actions call `db.select()` without `limit()` on reference data (municipalities, barangays) — acceptable for small sets but should be bounded.
- Dashboard aggregates use multiple queries; could use a single optimized aggregate query or pre-computed view.
