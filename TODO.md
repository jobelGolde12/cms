# Service Credits — Admin Officer Plan & 100% Working Checklist

> Based on actual codebase inspection (`src/app/(app)/service-credits/page.tsx`, `src/app/(app)/employees/[id]/service-credits/page.tsx`, `src/lib/employees.ts`, `src/actions/employees.ts`, `src/lib/schemas.ts`, `documentation/features/admin-officer-employee-records.md`, `src/db/schema.ts`).

---

## A. What exists today (verified working)

| Component / File | Status | What it does |
|---|---|---|
| `service_credit_transactions` DB table (`src/db/schema.ts`) | ✅ Present | `id`, `employeeId` (FK → employees), `type` (`earned`\|`consumed`), `credits` (real > 0), `transactionDate` (ISO), `reason`, `referenceDocument`, `remarks`, `createdBy`/`updatedBy`, timestamps. Indexes on `employeeId`, `type`, `transactionDate`. |
| `serviceCreditSchema` (`src/lib/schemas.ts`) | ✅ Present | Zod validation: `type` enum, `credits` coerce number 0.01–365, `reason` required (max 300), `transactionDate` ISO, `referenceDocument` optional (max 100), `remarks` optional (max 300). |
| `serviceCreditSummary()` (`src/lib/employees.ts`) | ✅ Present | Derives `earned` / `consumed` / `balance` from live `serviceCreditTransactions` ledger per employee (`computeBalance()`). No stored balance column — audit-safe. |
| `listServiceCreditTransactions()` (`src/lib/employees.ts`) | ✅ Present | Returns transactions for an employee with optional `{ type }` filter (`earned` / `consumed`). Ordered by `transactionDate DESC`, `createdAt DESC`. |
| `serviceCreditOverview()` (`src/lib/employees.ts`) | ✅ Present | All-employee overview: joins `employees` + `serviceCreditTransactions`, groups by `employees.id`, computes `earned` / `consumed` / `balance`. Supports `{ q?: string }` search on name / number / position. |
| `/service-credits` page (`src/app/(app)/service-credits/page.tsx`) | ✅ Present | Overview with 3 KPI cards (Total Earned / Consumed / Available), search form (`q`), table (`employeeNumber`, `name`, `position`, `CreditBadges`, `Open ledger` link). |
| `/employees/[id]/service-credits` page (`src/app/(app)/employees/[id]/service-credits/page.tsx`) | ✅ Present | Per-employee balance cards (`TrendingUp`/`TrendingDown`/`Wallet`), filterable transaction history (`type` filter `GET` param), `Open ledger` links to detail. |
| `AddServiceCreditModal` (`src/components/employees/service-credit-modal.tsx`) | ✅ Present | Client-side `useActionState` form. Fields: `type` (earned/consumed), `credits` (number 0.01–365), `transactionDate` (date), `referenceDocument`, `reason` (required), `remarks`. Shows current `balance`. Submits to `addServiceCreditTransaction`. Validation errors mapped to fields. |
| `addServiceCreditTransaction()` (`src/actions/employees.ts`) | ✅ Present | Server action: checks `service_credits.manage` permission, validates schema, checks employee exists and is not `archived`, validates `consumed` against live balance (`validateCreditAmount()`), inserts `serviceCreditTransactions`, logs audit (`SERVICE_CREDIT_ADD`), revalidates paths. |
| `updateServiceCreditTransaction()` (`src/actions/employees.ts`) | ✅ Present | Server action: checks `service_credits.manage`, validates schema, checks employee and transaction exist, validates `consumed` correction does not make balance negative (`balanceForEmployee()` with edit projection), updates transaction, logs audit (`SERVICE_CREDIT_UPDATE`), revalidates paths. |
| Permission gates (`src/lib/permissions.ts`) | ✅ Present | `service_credits.view` / `.manage` defined. `ADMIN_OFFICER` role grants both. Route guards (`hasPermission()`) on both pages. Action guards (`getAuthorizedUser("service_credits.manage")`) on actions. |

---

## B. What still needs to be verified / made 100% working for admin role

### 1. Color / theme consistency (post-UI-standardization)
- [x] `src/app/(app)/service-credits/page.tsx`: Updated `hover:bg-brand-50` → `hover:bg-[#F4F7FC]`, `text-brand-600` → `text-[#64748B]`, `hover:text-brand-900` → `hover:text-[#14295F]`. (Fixed in previous commit.)
- [x] `src/app/(app)/employees/[id]/service-credits/page.tsx`: Same fixes applied. (Fixed.)
- Verify both pages render with dark navy headings (`#14295F`), neutral body (`#263449`), muted secondary (`#64748B`), primary buttons (`#315EF7`).

### 2. Transaction edit / correction UI (admin manages existing records)
- The `updateServiceCreditTransaction()` action exists but there is **no UI link/button** to edit an existing transaction on `/employees/[id]/service-credits`.
- **Plan to complete:** Add an `Edit` link (or small pencil/action button) per transaction row that opens the same `AddServiceCreditModal` pre-populated with existing data (`transactionId` hidden field, form pre-filled, submit action switches to update). The action already supports edit projection (`balanceForEmployee()` with `edit` param).

### 3. Audit trail visibility
- Every transaction has `createdBy` and is audited (`audit_logs`). The admin should be able to verify the audit entry.
- **Plan:** Confirm `/activity-logs` shows `SERVICE_CREDIT_ADD` / `SERVICE_CREDIT_UPDATE` with entity type `service_credit_transaction` and the employee reference. No new feature needed — already implemented in `addServiceCreditTransaction()` and `updateServiceCreditTransaction()`.

### 4. Search / filter behavior
- `/service-credits` supports `?q=` search. `/employees/[id]/service-credits` supports `?type=` (`earned` / `consumed` / empty `All`).
- **Plan:** Verify form submits correctly (GET) and query params persist after submit. Already implemented; verify responsive layout (mobile) and that the filter dropdown uses consistent colors.

### 5. Permission isolation (admin role)
- Confirm `admin_officer` has `service_credits.view` and `.manage`, no student permissions (`students.*` denied), and that `serviceCreditOverview()` does not accidentally include student data (joins only `employees` and `serviceCreditTransactions`).
- **Plan:** Manual QA: log in as admin officer → open `/service-credits` → verify no student data appears; open `/employees/[id]/service-credits` → verify no access to student routes; verify `/service-credits` shows only employee rows.

### 6. Data integrity checks
- `serviceCreditSchema` caps `credits` at 365. The DB uses `real` (positive). `computeBalance()` rounds to 2 decimal places. `validateCreditAmount()` rejects `consumed` exceeding balance.
- **Plan:** Add a brief server-side guard in `serviceCreditOverview()` to handle potential float drift (already handled by `Number(r.earned) || 0` mapping). Confirm `serviceCreditSummary()` always returns non-negative balance.

### 7. Responsive / mobile behavior
- The card grid (`grid-cols-1 sm:grid-cols-3`) and table (`minWidth={760}`) are responsive. Mobile drawer uses navy background (fixed). Sidebar sections (`CORE MODULES` etc.) include `Employee Records` with `/service-credits`.
- **Plan:** Verify sidebar scroll behavior does not clip the service-credits link; verify the `Open ledger` link and `Record Transaction` button are accessible on small screens.

---

## C. How to make Service Credits 100% working (step-by-step)

1. **Theme consistency:** Complete the color updates (done in commit `6fe7b09`). Verify `service-credits/page.tsx` and `employees/[id]/service-credits/page.tsx` use `#14295F` headings, `#263449` body, `#64748B` secondary, `#315EF7` interactive elements.
2. **Edit transaction UI:** Add an edit link per row in `/employees/[id]/service-credits/page.tsx`. Reuse `AddServiceCreditModal` with `transactionId` hidden input and pre-filled form (`defaultValue` props for `Select`/`Input`/`Textarea`). Submit triggers `updateServiceCreditTransaction()`.
3. **Audit verification:** Confirm `/activity-logs` displays `SERVICE_CREDIT_ADD` and `SERVICE_CREDIT_UPDATE` entries with correct `entityId`, `oldValues`, `newValues`. Already implemented in actions; verify visually.
4. **Admin isolation test:** Confirm `admin_officer` role has zero access to `/students*`, `/performance`, `/development`, `/verification`, `/duplicates`, etc., and full access to `/service-credits`, `/employees`, `/employees/[id]/service-credits`, `/employees/[id]/201`.
5. **Validation & build:** Run `npm run lint`, `npm run build`, `npm run test`. Confirm no new errors.
6. **Documentation update:** Create `documentation/features/service-credits.md` (see Section D below).

---

## D. Documentation file (`documentation/features/service-credits.md`)

See `documentation/features/service-credits.md` (created below) for full admin-facing documentation covering purpose, routes, database rules, validation schema, permission gates, audit actions, and verification steps.
