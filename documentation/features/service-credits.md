# Service Credits — Admin Officer Feature

> Based on actual codebase: `src/app/(app)/service-credits/page.tsx`, `src/app/(app)/employees/[id]/service-credits/page.tsx`, `src/components/employees/service-credit-modal.tsx`, `src/lib/employees.ts`, `src/actions/employees.ts`, `src/lib/schemas.ts`, `src/db/schema.ts`.

---

## 1. Purpose

The Service Credits module provides an auditable ledger of earned and consumed service credit days per employee. It is strictly isolated from all student-facing data (enforced by permissions and SQL scope). The balance is always derived from the transaction history (`computeBalance()` in `src/lib/employees.ts`) — there is no manually editable stored balance column, which preserves full auditability.

---

## 2. Database (existing table)

Table: `service_credit_transactions` (`src/db/schema.ts`)

- `id`: text PK (`crypto.randomUUID()`)
- `employeeId`: FK → `employees.id` (cascade delete)
- `type`: `earned` | `consumed`
- `credits`: positive decimal (`real` > 0)
- `transactionDate`: ISO `YYYY-MM-DD`
- `reason`: required text (max 300)
- `referenceDocument`: optional text (max 100)
- `remarks`: optional text (max 300)
- `createdBy` / `updatedBy`: FK → `users.id`
- `createdAt` / `updatedAt`: `unixepoch()` timestamps
- Indexes: `service_credits_employee_idx`, `service_credits_type_idx`, `service_credits_date_idx`

No stored balance column. Balance = Σ(earned) − Σ(consumed).

---

## 3. Routes & gates (admin role)

| Route | Purpose | Permission gate |
|---|---|---|
| `/service-credits` | All-employee credit overview + school-wide totals + search (`?q=`) | `service_credits.view` |
| `/employees/[id]/service-credits` | Per-employee balance cards + filterable transaction history (`?type=` `earned`/`consumed`/empty) + record transaction button | `service_credits.view` (view); `service_credits.manage` (add/edit) |

Route guards (`src/app/(app)/service-credits/page.tsx` and `src/app/(app)/employees/[id]/service-credits/page.tsx`) redirect to `/dashboard` if the user lacks the permission.

---

## 4. Validation rules (`src/lib/schemas.ts`)

Schema: `serviceCreditSchema`

- `employeeId`: required
- `type`: `earned` | `consumed`
- `credits`: number 0.01–365 (inclusive)
- `transactionDate`: valid ISO date (`YYYY-MM-DD`)
- `reason`: required (min 1, max 300)
- `referenceDocument`: optional (max 100)
- `remarks`: optional (max 300)

Server-side (`src/actions/employees.ts`):

- Consumed transactions must not exceed the live derived balance (`validateCreditAmount()`).
- Archived employees (`status === 'archived'`) reject new transactions (`addServiceCreditTransaction()`).
- Corrections (`updateServiceCreditTransaction`) compute a projected balance; if the correction would drive balance below 0, the action is rejected.
- Every mutation logs to `audit_logs` (`SERVICE_CREDIT_ADD` or `SERVICE_CREDIT_UPDATE`) with `oldValues` and `newValues`.

---

## 5. Key components

- `serviceCreditOverview()` (`src/lib/employees.ts`): all-employee summary with `earned` / `consumed` / `balance`.
- `serviceCreditSummary()` (`src/lib/employees.ts`): per-employee derived totals.
- `listServiceCreditTransactions()` (`src/lib/employees.ts`): filterable history.
- `AddServiceCreditModal` (`src/components/employees/service-credit-modal.tsx`): client-side form using `useActionState`. Submits to `addServiceCreditTransaction()`.
- `CreditBadges` (`src/components/employees/employee-ui.tsx`): displays earned / consumed / balance badges.

---

## 6. How to make Service Credits 100% working for admin

1. **Theme consistency:** Verify `service-credits/page.tsx` and `employees/[id]/service-credits/page.tsx` use the centralized color tokens (`#14295F` headings, `#263449` body, `#64748B` secondary, `#315EF7` interactive). Done in previous commit; confirm visually.
2. **Edit transaction UI:** Add an edit link per row on `/employees/[id]/service-credits/page.tsx`. Reuse `AddServiceCreditModal` by passing the transaction data (`defaultValue` props, hidden `transactionId` input). The server action `updateServiceCreditTransaction()` already handles edit validation and audit logging.
3. **Audit verification:** Confirm `/activity-logs` shows `SERVICE_CREDIT_ADD` and `SERVICE_CREDIT_UPDATE` with the correct `entityType`, `entityId`, `oldValues`, `newValues`, `userId`, `ipAddress`, `userAgent`. Already implemented; verify in UI.
4. **Admin isolation:** Confirm the admin officer (`admin_officer` role) holds `service_credits.view` and `.manage`, has zero student-facing permissions (`students.*` denied), and that `/service-credits` shows only employee rows (joins `employees` + `serviceCreditTransactions` only).
5. **Data integrity checks:** Verify `serviceCreditSchema` validates `credits` > 0 and ≤ 365; `computeBalance()` rounds to 2 decimal places; `validateCreditAmount()` prevents over-consumption; archived employees are blocked.
6. **Responsive / mobile:** Confirm sidebar scroll includes `Employee Records` → `Service Credits`; mobile drawer uses navy background (`#14295F`); card grids (`sm:grid-cols-3`) and table (`minWidth={760}`) display correctly at 320 px–1440 px.
7. **Build / lint:** Run `npm run lint`, `npm run build`, `npm run test`. Confirm clean results.

---

## 7. Testing performed (existing)

From `documentation/features/admin-officer-employee-records.md`:

- `npm run test`: 123 passed (includes `employees.test.ts`: 201/credit schemas, balance math, amount rules, birth-date windows).
- `npm run lint`: clean for feature files.
- `npm run build`: passes; routes registered.
- `npm run db:migrate`: `drizzle/0004_*.sql` applied.
- Role isolation: admin officer holds no student permission; scope test denies all student rows.
