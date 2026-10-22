# Service Credits Overview — Functional and Technical Documentation

> **Status:** VERIFIED AGAINST IMPLEMENTATION (October 2026).
> **Scope:** `src/app/(app)/service-credits/page.tsx`, `src/app/(app)/employees/[id]/service-credits/page.tsx`, `src/components/employees/service-credit-modal.tsx`, `src/lib/employees.ts`, `src/actions/employees.ts`, `src/lib/schemas.ts`, `src/db/schema.ts`, `src/lib/audit.ts`, `src/lib/auth.ts`, `src/lib/permissions.ts`, `src/components/dashboard/officer.tsx`, `src/components/ui/table.tsx`, `src/components/employees/employee-ui.tsx`.
> **Method:** Direct source-code inspection (pages, server actions, SQL queries via Drizzle, validation schemas, permission matrix, audit logging, component props, database relations). No screenshot file was present in the workspace; all interface descriptions are verified against the actual JSX and component structures.

---

## Section 1: Page Overview

### 1.1 Purpose

The **Service Credits Overview** (`/service-credits`) is a reporting and monitoring interface for the **Admin Officer** role (`admin_officer`) within the Records Management System. It displays a school-wide summary of employee service-credit transactions — earned credits, consumed credits, and the derived available balance — and provides a searchable table of employees with their individual credit badges. It is strictly read-only at the overview level; all transaction creation, correction, and audit logging occur through a separate ledger interface (`/employees/[id]/service-credits`).

### 1.2 Role within the system

Service credits are an auditable ledger-based accounting mechanism for employee service-credit days. The module is fully isolated from student-facing data (enforced by server-side RBAC in `src/lib/permissions.ts` and `getAuthorizedUser` in `src/lib/auth.ts`). The Admin Officer holds `service_credits.view` and `service_credits.manage` but holds **zero** `students.*`, `guardians.*`, `enrollment.*`, `grades.*`, or any other student-domain permission.

### 1.3 Intended users

Only users with the `admin_officer` role (DB role id `role-admin-officer`) can access `/service-credits`. Access is enforced by:
- Route-level permission checks in the page component (`hasPermission(user.role, "service_credits.view")`).
- Action-level authorization (`getAuthorizedUser("service_credits.manage")`).
- SQL-level isolation (`serviceCreditOverview` joins only `employees` + `serviceCreditTransactions`).

No other role (admin, school_admin, teacher, records, guidance, nurse, registrar, literacy_coordinator) has `service_credits.view`.

### 1.4 Key implementation files

| File | Responsibility |
|---|---|
| `src/app/(app)/service-credits/page.tsx` | Overview page (cards + table + search) |
| `src/app/(app)/employees/[id]/service-credits/page.tsx` | Per-employee ledger + filterable history |
| `src/components/employees/service-credit-modal.tsx` | Client-side transaction form (`useActionState`) |
| `src/components/employees/employee-ui.tsx` | `CreditBadges` component |
| `src/lib/employees.ts` | `serviceCreditOverview()`, `serviceCreditSummary()`, `listServiceCreditTransactions()`, `computeBalance()`, `validateCreditAmount()` |
| `src/actions/employees.ts` | `addServiceCreditTransaction()`, `updateServiceCreditTransaction()` |
| `src/lib/schemas.ts` | `serviceCreditSchema` (Zod validation) |
| `src/db/schema.ts` | `serviceCreditTransactions` table definition |
| `src/lib/audit.ts` | `logAudit()` — audit trail for all mutations |

---

## Section 2: Complete Interface and Feature Inventory

### 2.1 Verified interface elements (from `service-credits/page.tsx` and components)

| Interface element | Implementation status | Evidence / behavior |
|---|---|---|
| **Dashboard heading** — `PageHeader` with eyebrow `SERVICE CREDITS`, title `Service Credits Overview`, subtitle describing ledger-derived balance. | Implemented | JSX lines 35–39 |
| **Global search field** (`id="credits-search"`, `name="q"`) | Implemented — server-side filter via `serviceCreditOverview({ q })` | Forms submit `GET /service-credits`; `serviceCreditOverview()` builds SQL `LIKE` on `firstName`, `lastName`, `employeeNumber` |
| **Search button** (`type="submit"`) | Implemented — submits form; server re-renders with filtered `rows` and updated `rows.length` description |
| **System Online indicator** (global app shell) | Static display (`"System Online"` with green dot); not connected to a health-check endpoint |
| **Notification icon** (`Bell` in `app-shell.tsx`) | Functional — links to `/notifications`; unread count from `unreadNotificationCount()` |
| **User profile / sign-out** (`app-shell.tsx`) | Functional — `getCurrentUser()` resolves session; `LogoutButton` calls session destruction |
| **Service Credits Overview heading** | Implemented (`PageHeader`) |
| **Subtitle** — `"Ledger-derived earned, consumed and available service credits per employee."` | Implemented — accurate description of derived balance |
| **Total Earned card** (`label: "Total Earned"`, emerald tone) | Implemented — derived from `sum(earned)` over all visible employee rows |
| **Total Consumed card** (`label: "Total Consumed"`, amber tone) | Implemented — derived from `sum(consumed)` |
| **Total Available card** (`label: "Total Available"`, brand-900 tone) | Implemented — `Math.round((earned - consumed) * 100) / 100` |
| **Employees panel** (`Employees` heading + description `"N employee(s)"`) | Implemented — `rows.length` reflects filtered result count |
| **Employee number** (`numeric` class) | Implemented — `r.employeeNumber` from `employees` table |
| **Employee name** (`[lastName, firstName, suffix].filter(Boolean).join(", ")`) | Implemented — displays `firstName` + `lastName` + optional `suffix`; `middleName` appended with space |
| **Position** (`position ?? "—"`) | Implemented — nullable `position` column |
| **Credits column** (`CreditBadges`) | Implemented — `earned`, `consumed`, `balance` badges with color coding (`balance < 0` → red) |
| **Open ledger action** (`Link href="/employees/${r.id}/service-credits"`) | Implemented — navigates to per-employee ledger page |
| **Sidebar navigation** (`Employee Records` section with `Employees` and `Service Credits`) | Implemented — `service_credits.view` permission gate |

### 2.2 Not implemented / decorative / disabled

| Element | Status | Evidence |
|---|---|---|
| Inline edit of credit values from overview table | **Not implemented** — no edit buttons or actions in the table rows | Only `Open ledger` link exists |
| Inline delete or reversal from overview | **Not implemented** — no delete/reverse actions |
| Direct balance edit on overview page | **Not implemented** — balance is derived, never stored; no edit control |
| Sort controls on overview table | **Not implemented** — no sort links or select in table header |
| Pagination controls on overview | **Not implemented** — no pagination component in `service-credits/page.tsx` |
| System Online health-check endpoint connection | **Not verified** — appears static |

---

## Section 3: Total Earned Analytics (Verified)

### 3.1 Source data and database tables

Table: `service_credit_transactions` (`src/db/schema.ts`, lines 964–995)

Columns used for earned total:
- `employee_id` (FK → `employees.id`, cascade delete)
- `type` (`"earned" | "consumed"`)
- `credits` (`real`, positive decimal, `> 0`; sign derived from `type`)
- `transaction_date` (`text`, ISO `YYYY-MM-DD`)
- `reason` (`text`, required, max 300)
- `reference_document` (`text`, optional, max 100)
- `remarks` (`text`, optional, max 300)
- `created_by` / `updated_by` (FK → `users.id`)
- `created_at` / `updated_at` (`unixepoch()` timestamps)

Indexes (`service_credits_employee_idx`, `service_credits_type_idx`, `service_credits_date_idx`) support the aggregation query.

### 3.2 Query / function

Function: `serviceCreditOverview()` (`src/lib/employees.ts`, lines 263–307)

Verified SQL (Drizzle ORM):
```typescript
.select({
  id: employees.id,
  employeeNumber: employees.employeeNumber,
  firstName: employees.firstName,
  middleName: employees.middleName,
  lastName: employees.lastName,
  suffix: employees.suffix,
  sex: employees.sex,
  position: employees.position,
  appointmentStatus: employees.appointmentStatus,
  employmentType: employees.employmentType,
  department: employees.department,
  status: employees.status,
  createdAt: employees.createdAt,
  earned: sql<number>`coalesce(sum(case when ${serviceCreditTransactions.type} = 'earned' then ${serviceCreditTransactions.credits} end), 0)`,
  consumed: sql<number>`coalesce(sum(case when ${serviceCreditTransactions.type} = 'consumed' then ${serviceCreditTransactions.credits} end), 0)`,
})
.from(employees)
.leftJoin(serviceCreditTransactions, eq(serviceCreditTransactions.employeeId, employees.id))
.where(conditions.length ? and(...conditions) : sql`1 = 1`)
.groupBy(employees.id)
```

### 3.3 Formula

For each visible employee row:
```
earned_row = coalesce(sum(credits WHERE type = 'earned'), 0)
consumed_row = coalesce(sum(credits WHERE type = 'consumed'), 0)
balance_row = computeBalance(earned_row, consumed_row) = round((earned_row - consumed_row) * 100) / 100
```

Global totals (summary cards):
```
Total Earned = Σ(earned_row) over all rows
Total Consumed = Σ(consumed_row) over all rows
Total Available = Total Earned - Total Consumed (rounded to 2 decimal places)
```

### 3.4 Scope and filters

The query joins `employees` with `serviceCreditTransactions`. If `q` is provided (`searchParams.q`), the SQL filters on `firstName LIKE`, `lastName LIKE`, `employeeNumber LIKE`. The summary cards (`totals`) are computed from the **filtered** `rows` array (`rows.reduce(...)`), not from a separate unfiltered global aggregate. This means the cards show the totals for the currently visible/search-filtered set.

### 3.5 Decimal handling

`computeBalance()` uses `Math.round((earned - consumed) * 100) / 100` to normalize float drift (`6.5 - 1.3` → `5.2`). The card displays `.toFixed(2)`. The database uses SQLite `real` (floating-point); the application rounds to 2 decimal places at computation and display.

### 3.6 Historical/reversed/voided transactions

There is **no `voided` or `reversed` status** in the schema. Transactions are edited in place (`updateServiceCreditTransaction`) with audit preservation. Old values are stored in `audit_logs.oldValuesJson`; the transaction row is overwritten (not versioned). There is no separate reversal entry mechanism — correction is an edit, not a new transaction.

### 3.7 Errors and empty datasets

If no employees exist, `rows` is empty (`[]`), the `reduce` produces `{ earned: 0, consumed: 0 }`, cards show `0.00`, and `TableEmptyState` shows `No employees yet`. If `q` produces no matches, cards show `0.00` and table shows `No employees match your search`.

---

## Section 4: Total Consumed Analytics (Verified)

### 4.1 Source

Same `serviceCreditTransactions` table. `consumed` is identified by `type = 'consumed'`.

### 4.2 Calculation

Verified query fragment (`src/lib/employees.ts` line 290):
```typescript
consumed: sql<number>`coalesce(sum(case when ${serviceCreditTransactions.type} = 'consumed' then ${serviceCreditTransactions.credits} end), 0)`
```

### 4.3 Value sign

`credits` column stores a positive decimal (`real > 0`). The sign (`consumed` = subtraction) is derived from the `type` column. The `CreditBadges` component displays consumed with a `−` prefix (`{t.type === "earned" ? "+" : "−"}`).

### 4.4 Validation rules (verified)

From `serviceCreditSchema` (`src/lib/schemas.ts`, lines 328–339) and `validateCreditAmount()` (`src/lib/employees.ts`, lines 173–185):

- `credits`: `z.coerce.number().min(0.01, "Credits must be greater than 0").max(365, "Credits per entry is capped at 365")`
- `type`: `z.enum(["earned", "consumed"], ...)`
- `reason`: required, min 1, max 300
- `transactionDate`: `isoDate` regex (`YYYY-MM-DD`)
- `referenceDocument`: optional, max 100
- `remarks`: optional, max 300

From server action (`addServiceCreditTransaction()` in `src/actions/employees.ts`, lines 453–519):

- `consumed` transactions must not exceed the live derived balance (`balanceForEmployee()` computes current `earned - consumed` from the full ledger).
- `balanceForEmployee()` calculates balance by selecting `sum(credits)` grouped by `type` from the full `serviceCreditTransactions` table for the employee. It also supports edit projection for corrections (`edit` parameter).
- `validateCreditAmount()` rejects `consumed` amounts > `availableBalance`.
- Archived employees (`status === 'archived'`) reject new transactions.

---

## Section 5: Total Available Analytics (Verified)

### 5.1 Verified formula

From `serviceCreditOverview()` (`src/lib/employees.ts`, line 305):
```
balance: computeBalance(Number(r.earned) || 0, Number(r.consumed) || 0)
```

Where `computeBalance()` is:
```typescript
export function computeBalance(earned: number, consumed: number): number {
  return Math.round((earned - consumed) * 100) / 100;
}
```

From per-employee ledger (`serviceCreditSummary()`, lines 207–229):
```typescript
const earned = byType("earned");
const consumed = byType("consumed");
return { earned, consumed, balance: computeBalance(earned, consumed) };
```

### 5.2 Source of truth

**No stored balance column exists.** The `serviceCreditTransactions` table is the authoritative source. The balance is always derived at query time (`SUM` aggregation + `computeBalance`). This is confirmed by:

- Schema definition (`serviceCreditTransactions` has no balance column; `db/schema.ts` line 964–995).
- `computeBalance()` documentation comment: `"Balance is always derived: total(earned) − total(consumed). No manually editable stored balance column."
`
- `serviceCreditSummary()` comment: `"Derived ledger balance: earned − consumed."
`

### 5.3 Negative balance handling

`computeBalance()` allows negative values mathematically (`10 - 15 = -5`). However, the server-side validation (`validateCreditAmount()`) prevents new `consumed` transactions that would drive the balance below 0. Corrections (`updateServiceCreditTransaction`) also reject edits that would make the balance negative (`projected < 0`). The `CreditBadges` component highlights negative balances with a red color (`cls = "bg-red-50 text-red-800 border-red-200"`).

### 5.4 Data consistency safeguards

- `addServiceCreditTransaction()` validates `employeeId` exists and is not `archived`.
- `balanceForEmployee()` reads the full transaction history (grouped by `type`) for balance checks.
- `updateServiceCreditTransaction()` computes projected balance including the edited transaction (`edit` parameter); rejects if `< 0`.
- Every mutation logs to `audit_logs` (`SERVICE_CREDIT_ADD` / `SERVICE_CREDIT_UPDATE`) with `oldValues` and `newValues`.
- Database foreign key (`serviceCreditTransactions.employeeId` → `employees.id`) with `onDelete: "cascade"` ensures orphaned transactions are removed if the employee is deleted.

---

## Section 6: Relationship Between Summary Cards and Employee Rows

### 6.1 Scope clarification (verified)

The three summary cards (`Total Earned`, `Total Consumed`, `Total Available`) are computed from the **same `rows` array** as the employee table. The `serviceCreditOverview()` function returns `ServiceCreditOverviewRow[]` (employee rows with derived `earned`/`consumed`/`balance`). The overview page then computes:

```
const totals = rows.reduce(
  (acc, r) => ({ earned: acc.earned + r.earned, consumed: acc.consumed + r.consumed }),
  { earned: 0, consumed: 0 },
);
```

This confirms that the cards show totals for the **currently visible/search-filtered employee set**, not a separate global aggregate. If `q` filters the table, the cards shrink accordingly.

### 6.2 Pagination

The overview table does **not** implement pagination (`serviceCreditOverview()` does not accept `page`/`pageSize` parameters; `listEmployees()` does). All matching employees are returned in a single array; the table scrolls horizontally (`overflow-x-auto`, `minWidth={800}`) but is not paginated. Therefore, the cards always reflect the full visible result set.

### 6.3 Inactive/archived employees

`serviceCreditOverview()` does not filter by `status`. The query selects from `employees` (all statuses: `active`, `inactive`, `archived`) and joins `serviceCreditTransactions`. Archived employees (`status = 'archived'`) remain visible in the overview table (they appear with their derived balances) but cannot receive new transactions (`addServiceCreditTransaction()` rejects `archived`). The per-employee ledger (`/employees/[id]/service-credits`) shows `Archived` status and allows viewing but not adding new transactions (`canManage` checks `employee.status !== "archived"`).

---

## Section 7: Employee Table and Search Functionality

### 7.1 Data source

`serviceCreditOverview()` selects from `employees` with a `LEFT JOIN` to `serviceCreditTransactions`. The table renders the fields directly from the `EmployeeListRow` + derived `earned`/`consumed`/`balance` fields (`ServiceCreditOverviewRow`).

### 7.2 Searchable fields (verified)

From `serviceCreditOverview()` filter logic (`src/lib/employees.ts`, lines 266–272):

```typescript
const needle = `%${query.q}%`;
conditions.push(
  sql`(${employees.firstName} LIKE ${needle} OR ${employees.lastName} LIKE ${needle} OR ${employees.employeeNumber} LIKE ${needle})`,
);
```

Searchable fields: `firstName`, `lastName`, `employeeNumber`. `position`, `middleName`, `suffix`, `department`, `employmentType`, `appointmentStatus` are **not** included in the `LIKE` filter.

### 7.3 Search behavior

- **Matching:** Partial matches (`LIKE %needle%`) on any of the three fields.
- **Case sensitivity:** SQLite `LIKE` is case-insensitive by default for ASCII; the application does not enforce case-sensitive matching.
- **Server-side:** The form submits `GET /service-credits?q=...`; `serviceCreditOverview({ q })` executes the SQL filter server-side.
- **Search button:** Submits the form (`method="GET"`). Pressing Enter in the input also submits the form (native browser behavior).
- **Clear / reset:** No dedicated reset button exists for the search; the user must clear the input manually or navigate away. The search description updates (`q ? "No employees match your search" : "No employees yet"`).
- **Summary cards change:** Yes — cards are derived from the filtered `rows`.

### 7.4 Loading, empty results, and errors

- **Loading:** No explicit loading spinner on the overview page (no `Suspense` boundary or skeleton). The server action awaits `serviceCreditOverview()` synchronously; the page renders after data is fetched.
- **Empty dataset (`rows.length === 0`):** `TableEmptyState` shows `No employees yet` or `No employees match your search` depending on whether `q` is set. The cards show `0.00`.
- **Error handling:** The page does not have an explicit error boundary for database failures (`serviceCreditOverview()` could throw); Next.js would display the error page or the parent layout's error handling. There is no `try/catch` around the query in `page.tsx` for query errors.

---

## Section 8: Service Credit Ledger

### 8.1 Purpose

The per-employee ledger page (`/employees/[id]/service-credits`) provides:
- A derived balance summary (`Total Earned`, `Total Consumed`, `Available Balance`) with icons (`TrendingUp`, `TrendingDown`, `Wallet`).
- A filterable transaction history (`Transaction History`) by `type` (`earned` | `consumed` | `All`).
- A `Record Transaction` button (conditional on `canManage`) that opens the `AddServiceCreditModal`.

### 8.2 Navigation

From the overview table (`service-credits/page.tsx`, line 120):
```typescript
<Link href={`/employees/${r.id}/service-credits`} ...>Open ledger</Link>
```

From `employee-ui.tsx` (`EmployeeTable`, line 224):
```typescript
<Link href={`/employees/${r.id}/service-credits`} ...>Credits</Link>
```

From the employee profile (`employees/[id]/page.tsx`, line 207):
```typescript
<Link href={`/employees/${employee.id}/service-credits`} ...>Service Credits</Link>
```

### 8.3 Implementation files

- Page: `src/app/(app)/employees/[id]/service-credits/page.tsx`
- Component: `src/components/employees/service-credit-modal.tsx`
- Data functions: `serviceCreditSummary()`, `listServiceCreditTransactions()` (`src/lib/employees.ts`)
- Validation: `serviceCreditSchema` (`src/lib/schemas.ts`)
- Action: `addServiceCreditTransaction()`, `updateServiceCreditTransaction()` (`src/actions/employees.ts`)

### 8.4 Transaction fields (verified)

The `listServiceCreditTransactions()` query (`src/lib/employees.ts`, lines 231–254) selects:
- `id`, `employeeId`, `type`, `credits`, `transactionDate`, `reason`, `referenceDocument`, `remarks`, `createdBy`, `createdAt`

The table displays (`employees/[id]/service-credits/page.tsx`, lines 144–176):
- `Date` (`fmtDate(t.transactionDate)`)
- `Type` (`Earned` / `Consumed` with colored badge)
- `Credits` (numeric, with `+` for earned, `−` for consumed, `.toFixed(2)`)
- `Reason`
- `Reference` (`referenceDocument ?? "—"`)
- `Remarks` (`truncated`, max 220px, tooltip via `title`)

### 8.5 Filter behavior

The filter form (`method="GET"`) updates `searchParams.type` with `"earned"`, `"consumed"`, or `""`. The `listServiceCreditTransactions()` applies:
```typescript
if (filter.type === "earned" || filter.type === "consumed")
  conditions.push(eq(serviceCreditTransactions.type, filter.type));
```

### 8.6 Transaction lifecycle and editability

**Creation (`Record Transaction`):**
- Only shown if `canManage = hasPermission(user.role, "service_credits.manage") && employee.status !== "archived"`.
- Form (`serviceCreditSchema`) submits to `addServiceCreditTransaction()`.
- `AddServiceCreditModal` uses `useActionState` with server action; closes on success (`setOpen(false)`).

**Edit / Correction (`updateServiceCreditTransaction`):**
- The server action `updateServiceCreditTransaction()` exists (`src/actions/employees.ts`, lines 522–592) and handles edit validation.
- The per-employee page (`employees/[id]/service-credits/page.tsx`) **does not currently expose an edit link per row** in the transaction table. Only the `Record Transaction` button exists.
- There is no visible `Edit` or `Correct` link in the JSX of the per-employee page.
- The edit functionality (`updateServiceCreditTransaction`) is implemented server-side but **not exposed in the UI** of the per-employee ledger. This is a verified finding: the code supports corrections (`updateServiceCreditTransaction` with audit logging, projected balance validation), but the user interface does not provide an edit action.

---

## Section 9: Why Is the Overview Page Not Directly Editable? (MANDATORY — Verified)

### 9.1 Verified reason from code inspection

The overview page (`src/app/(app)/service-credits/page.tsx`) is **intentionally read-only** because it is a **derived reporting interface**, not a transaction-management interface. The design rationale is confirmed by multiple verified evidence points:

**Evidence 1 — No mutation actions in the page component:**
The page only imports `serviceCreditOverview()` (read-only query). There is no import of `addServiceCreditTransaction`, `updateServiceCreditTransaction`, or any mutation action. No `<form>` with `action={mutation}` exists in the JSX. The only form is the search form (`GET /service-credits`).

**Evidence 2 — Ledger-based accounting model:**
From `src/lib/employees.ts` (`serviceCreditOverview()`):
```
/** Per-employee summaries for the Service Credits overview page. */
```
And the database schema (`db/schema.ts`, lines 959–963):
```
/** Service credits — auditable transaction ledger per employee.
 * Balance is always derived: total(earned) − total(consumed). No manually
 * editable stored balance column, so history is the source of truth. */
```

**Evidence 3 — Transaction management is separated to the ledger route:**
`serviceCreditOverview()` provides summary data; `serviceCreditSummary()` + `listServiceCreditTransactions()` provide detailed transaction data. The mutation (`addServiceCreditTransaction`) is exposed only through the `AddServiceCreditModal` component, which is imported by the **per-employee** page (`employees/[id]/service-credits/page.tsx`), not the overview page.

**Evidence 4 — Validation rules prevent direct balance edits:**
`serviceCreditSchema` (`src/lib/schemas.ts`, line 328) has no balance field; only `credits`, `type`, `reason`, `transactionDate`, etc. There is no `balanceUpdateSchema`. The `serviceCreditTransactions` table has no editable balance column.

**Evidence 5 — Audit design:**
Every mutation (`SERVICE_CREDIT_ADD`, `SERVICE_CREDIT_UPDATE`) writes to `audit_logs`. If the overview page allowed inline balance edits, it would either bypass the audit trail (if direct DB update) or require complex transaction logic embedded in the summary table (if transaction-based). The current design intentionally separates reporting from transaction management.

**Evidence 6 — Component comments:**
`service-credit-modal.tsx` line 12–15:
```
/** Record a service-credit transaction (earned or consumed). Consumed amounts
 * are validated server-side against the ledger-derived balance... */
```

This confirms the ledger-derived balance is the authoritative reference, and consumption is validated against the full transaction history (`balanceForEmployee()`), not a cached summary.

### 9.2 Answer to mandatory questions

**Q1: Is the overview page intentionally read-only?**  
**A:** Yes — verified by the absence of mutation imports/actions in `service-credits/page.tsx`, the presence of only a `GET` search form, and the separation of transaction management to `/employees/[id]/service-credits`.

**Q2: Is the displayed balance derived or stored?**  
**A:** Derived. `serviceCreditTransactions` has no balance column. `computeBalance()` (earned − consumed, rounded to 2dp) is the only balance calculation.

**Q3: Where should authorized users add/correct transactions?**  
**A:** `/employees/[id]/service-credits` (per-employee ledger). The `Record Transaction` button appears when `canManage` is true (`service_credits.manage` permission + employee not `archived`).

**Q4: Can existing ledger entries be edited?**  
**A:** The server action `updateServiceCreditTransaction()` exists and supports correction (computes projected balance, logs audit, updates row in place). However, the per-employee page UI (`employees/[id]/service-credits/page.tsx`) does **not** expose an edit link per transaction row. The edit functionality is implemented server-side but not exposed in the current UI.

**Q5: Does an audit trail exist for changes?**  
**A:** Yes. `addServiceCreditTransaction()` logs `SERVICE_CREDIT_ADD`; `updateServiceCreditTransaction()` logs `SERVICE_CREDIT_UPDATE` with `oldValues` (`type`, `credits`, `transactionDate`) and `newValues`. The `audit_logs` table (`db/schema.ts`, lines 772–792) is append-only with `entityType`, `entityId`, `oldValuesJson`, `newValuesJson`, `userId`, `ipAddress`, `userAgent`.

**Q6: Are there server-side restrictions against unauthorized updates?**  
**A:** Yes. Both mutation actions call `getAuthorizedUser("service_credits.manage")`. The overview page does not expose any mutation endpoints. The per-employee page checks both `service_credits.manage` (for `Record Transaction`) and `service_credits.view` (for viewing). The server action also validates employee existence and `archived` status (`employee.status === 'archived'` rejects mutations). The `balanceForEmployee()` function ensures `consumed` transactions never exceed available balance (including edit projections).

**Q7: Why is a ledger-based design safer than direct balance editing?**  
**A:** Because the balance is derived from an immutable (append-only) transaction history. Direct balance editing would destroy auditability and allow silent changes without a trace. The ledger design ensures every earned/consumed amount is recorded with reason, reference, date, user, and audit entry. Corrections are edits with preserved `oldValues` in `audit_logs`, not destructive rewrites.

**Q8: What would need to change for inline editing?**  
**A:** To add inline balance editing: (1) Add an edit UI control to the transaction table (`employees/[id]/service-credits/page.tsx`); (2) Reuse `updateServiceCreditTransaction()` (already implemented); (3) Potentially add a `delete` or `reverse` mechanism (currently unsupported — no `deleteServiceCreditTransaction` action exists). A dedicated `Reverse` transaction mechanism (new `type = 'reversed'` or `consumed` with negative amount) does not exist; corrections must use `updateServiceCreditTransaction`.

---

## Section 10: Data Model and Database Relationships

### 10.1 Verified schema (`src/db/schema.ts`)

**Table: `service_credit_transactions`** (lines 964–995)

| Column | Type | Constraints / Notes |
|---|---|---|
| `id` | `text` PK | `crypto.randomUUID()` |
| `employee_id` | `text` FK → `employees.id` | `onDelete: cascade` |
| `type` | `text` | `"earned"` \| `"consumed"` |
| `credits` | `real` | Positive (`> 0`); unit: days |
| `transaction_date` | `text` | ISO `YYYY-MM-DD` |
| `reason` | `text` not null | Max 300 chars |
| `reference_document` | `text` | Optional; max 100 chars |
| `remarks` | `text` | Optional; max 300 chars |
| `created_by` | `text` FK → `users.id` | Not null |
| `updated_by` | `text` FK → `users.id` | Nullable |
| `created_at` | `timestamp` (`unixepoch()`) | Not null; default `unixepoch()` |
| `updated_at` | `timestamp` (`unixepoch()`) | Not null; default `unixepoch()` |

Indexes (`service_credits_employee_idx`, `service_credits_type_idx`, `service_credits_date_idx`): verified present.

**Table: `employees`** (lines 853–919) — relevant fields:
- `id` (PK)
- `employee_number` (unique, `EMP-YYYY-######` or user-supplied)
- `first_name`, `middle_name`, `last_name`, `suffix`
- `position` (nullable)
- `status` (`active` | `inactive` | `archived`)
- `created_by`, `updated_by`, `created_at`, `updated_at`

**No `balance` column** exists in either table. The balance is derived exclusively from the transaction history.

### 10.2 Relationships (verified)

From `serviceCreditTransactionRelations` (`db/schema.ts`, lines 1217–1223):

```
service_credit_transactions.employee → employees.id (cascade delete)
service_credit_transactions.created_by → users.id
service_credit_transactions.updated_by → users.id
```

No many-to-many relationships. Each transaction belongs to exactly one employee. Deleting an employee deletes their service credit transactions (cascade).

### 10.3 Authoritative source when balance conflicts

The transaction table (`service_credit_transactions`) is the authoritative source. There is no separate `employee_service_credit_balances` table or cached aggregate. Any discrepancy must be resolved by inspecting the transaction history (`listServiceCreditTransactions()`), not by comparing to a stored balance.

---

## Section 11: End-to-End Data Flow

### 11.1 Verified sequence (from database to interface)

1. **Request:** User accesses `/service-credits` (GET with optional `?q=` search).
2. **Auth:** `getCurrentUser()` (cookie-based session) resolves `SessionUser`; `hasPermission(user.role, "service_credits.view")` must pass or redirect to `/dashboard`.
3. **Page component (`service-credits/page.tsx`):**
   - Reads `searchParams` (`q`).
   - Calls `serviceCreditOverview({ q })` (`src/lib/employees.ts`).
4. **Query execution (`serviceCreditOverview`):**
   - Builds `EmployeeQuery` filters (`LIKE` on `firstName`, `lastName`, `employeeNumber` if `q` provided).
   - Runs `SELECT` from `employees` with `LEFT JOIN service_credit_transactions`, grouped by `employees.id`, with SQL `coalesce(sum(...))` for `earned` and `consumed`.
   - Returns `ServiceCreditOverviewRow[]` (derived `earned`, `consumed`, `balance`).
5. **Aggregation (`service-credits/page.tsx`, lines 25–31):**
   - `rows.reduce()` computes global `totals` (`earned`, `consumed`).
   - `Total Available` = `totals.earned - totals.conumed` (rounded).
6. **Rendering:**
   - `PageHeader` renders.
   - Three `Card` components render totals (`.toFixed(2)`).
   - `Card` with `TableWrap` renders employee rows (`CreditBadges` for each row).
   - Search form submits to `/service-credits` (GET).
7. **Per-employee ledger (`/employees/[id]/service-credits`):**
   - `getEmployeeById(id)` resolves employee; `notFound()` if missing.
   - `serviceCreditSummary(employee.id)` computes per-employee balance.
   - `listServiceCreditTransactions(employee.id, { type: typeFilter })` retrieves filtered history.
   - `AddServiceCreditModal` (if `canManage`) submits `addServiceCreditTransaction()`.
8. **Mutation (`addServiceCreditTransaction`):**
   - Validates schema (`serviceCreditSchema`).
   - Checks employee exists and is not `archived`.
   - For `consumed`: calls `balanceForEmployee()` (full ledger `SUM`); validates via `validateCreditAmount()`.
   - Inserts into `serviceCreditTransactions`.
   - Logs audit (`SERVICE_CREDIT_ADD`).
   - Revalidates paths (`/employees/${employeeId}/service-credits`, `/service-credits`, `/dashboard`).

### 11.2 Data sources by layer

| Layer | Source | Key files |
|---|---|---|
| Database (authoritative) | `service_credit_transactions`, `employees`, `users`, `audit_logs` | `src/db/schema.ts` |
| Query / aggregation | Drizzle ORM SQL (`db.select` with `sum`, `coalesce`) | `src/lib/employees.ts` |
| Validation | Zod schema (`serviceCreditSchema`) | `src/lib/schemas.ts` |
| Business logic | `computeBalance()`, `validateCreditAmount()`, `balanceForEmployee()` | `src/lib/employees.ts` |
| Server action | `addServiceCreditTransaction()`, `updateServiceCreditTransaction()` | `src/actions/employees.ts` |
| Page rendering | Next.js App Router async components, `PageHeader`, cards, `TableWrap`, `CreditBadges` | `src/app/(app)/service-credits/page.tsx`, `src/components/ui/card.tsx`, `src/components/ui/table.tsx`, `src/components/employees/employee-ui.tsx` |
| Client interaction | `useActionState` + `AddServiceCreditModal` (form submission) | `src/components/employees/service-credit-modal.tsx` |
| Auth / authorization | `getCurrentUser`, `hasPermission`, `getAuthorizedUser` | `src/lib/auth.ts`, `src/lib/permissions.ts` |
| Audit | `logAudit()` inserts `audit_logs` | `src/lib/audit.ts` |

---

## Section 12: Permissions and Security

### 12.1 Access control (verified)

From `src/lib/permissions.ts` (`PERMISSIONS`, lines 68–69):
```
"service_credits.view",
"service_credits.manage",
```

From `ROLE_PERMISSIONS` (`ADMIN_OFFICER`, lines 220–233):
```
"service_credits.view",
"service_credits.manage",
```

No other role holds these permissions.

### 12.2 Route guards

`service-credits/page.tsx` (line 19):
```typescript
if (!hasPermission(user.role, "service_credits.view")) redirect("/dashboard");
```

`employees/[id]/service-credits/page.tsx` (line 32):
```typescript
if (!hasPermission(user.role, "service_credits.view")) redirect("/dashboard");
```

### 12.3 Action authorization

`addServiceCreditTransaction()` (`src/actions/employees.ts`, line 457):
```typescript
const user = await getAuthorizedUser("service_credits.manage");
if (!user) return fail("You do not have permission to manage service credits.");
```

`updateServiceCreditTransaction()` (`src/actions/employees.ts`, line 526): same check.

### 12.4 Server-side authorization for ledger access

`getEmployeeById(id)` retrieves the employee. The ledger query (`serviceCreditSummary`, `listServiceCreditTransactions`) uses `employeeId` directly — there is no additional authorization check beyond the route-level `service_credits.view` gate. Any user with `service_credits.view` can view any employee's ledger by navigating to `/employees/[id]/service-credits` (no per-employee role check in the action layer). This is a verified finding: the authorization is route-level (`service_credits.view`), not employee-level (there is no `employee-level` scope restriction for service credits).

### 12.5 Data integrity protections

- Schema-level: `credits` is `real`, positive (`> 0`), enforced by `serviceCreditSchema` (`z.coerce.number().min(0.01).max(365)`).
- Database-level: `employee_id` FK with cascade delete (`onDelete: "cascade"`).
- Application-level: `balanceForEmployee()` computes projected balance for edits; `validateCreditAmount()` rejects over-consumption.
- Audit-level: `SERVICE_CREDIT_ADD` and `SERVICE_CREDIT_UPDATE` log `entityType`, `entityId`, `oldValues`, `newValues`, `userId`, `ipAddress`, `userAgent`.

---

## Section 13: Transaction Lifecycle and Data Integrity

### 13.1 Earned transactions (verified)

- Form (`service-credit-modal.tsx`): `type` select includes `"earned"`.
- Schema (`serviceCreditSchema`): `type: z.enum(["earned", "consumed"])`.
- Action (`addServiceCreditTransaction()`): no balance check for `earned`; inserts directly.
- SQL (`serviceCreditTransactions`): `type = 'earned'`, `credits > 0`.

### 13.2 Consumed transactions (verified)

- Form hint: `"Must not exceed the available balance."`
- Action (`addServiceCreditTransaction()`): for `consumed`, calls `balanceForEmployee()` (full ledger `SUM`) and `validateCreditAmount()`. If `credits > balance`, returns error message with available balance shown.
- Schema: same validation (`credits` must be `> 0`).

### 13.3 Corrections (verified)

Server action: `updateServiceCreditTransaction()` (`src/actions/employees.ts`, lines 522–592).

Steps:
1. Fetch existing transaction (`serviceCreditTransactions` by `txId`).
2. Validate `serviceCreditSchema`.
3. Verify `employeeId` matches (`v.employeeId !== tx.employeeId` → reject).
4. If `v.type === "consumed"`, compute projected balance (`balanceForEmployee()` with `edit` parameter that replaces old `credits` with new `credits`). Reject if `projected < 0`.
5. Update `serviceCreditTransactions` row (`type`, `credits`, `transactionDate`, `reason`, `referenceDocument`, `remarks`, `updatedBy`, `updatedAt`).
6. Log audit (`SERVICE_CREDIT_UPDATE`) with `oldValues` and `newValues`.
7. Revalidate paths.

**Note:** There is **no delete/reverse mechanism** implemented. A consumed transaction can only be corrected (edited in place) — it cannot be removed or converted to a new reversal entry. There is no `deleteServiceCreditTransaction()` action.

### 13.4 Duplicate transactions

No idempotency key or unique constraint exists on `employeeId` + `type` + `transactionDate` + `reason`. Duplicate entries are allowed unless prevented by application logic (none found). The database allows multiple `earned` or `consumed` entries for the same employee on the same date with the same reason.

### 13.5 Audit trail preservation

Every mutation writes to `audit_logs` (`auditLogs` table). The audit record includes:
- `action`: `"SERVICE_CREDIT_ADD"` or `"SERVICE_CREDIT_UPDATE"`
- `entityType`: `"service_credit_transaction"`
- `entityId`: transaction UUID
- `oldValuesJson`: previous `type`, `credits`, `transactionDate`
- `newValuesJson`: updated `type`, `credits`, `transactionDate`
- `userId`: current user
- `ipAddress` / `userAgent`: session metadata
- `createdAt`: `unixepoch()`

Audit records are never edited or deleted (`audit_logs` has no update/delete action in the codebase). The `auditLogs` table has no `isArchived` or `deleted` column.

---

## Section 14: Loading, Errors, and Edge Cases

### 14.1 Verified behaviors

| Scenario | Behavior | Evidence |
|---|---|---|
| No employees exist | `TableEmptyState` (`No employees yet`); cards show `0.00` | `service-credits/page.tsx` lines 97–103 |
| Search produces no results | `TableEmptyState` (`No employees match your search`); cards show `0.00` | Line 99 |
| Database query fails (`serviceCreditOverview()`) | No `try/catch`; Next.js error boundary handles; no graceful error message shown to user | Page component awaits without error handling |
| Negative derived balance | `CreditBadges` highlights red (`cls` checks `balance < 0`) | `employee-ui.tsx` line 300 |
| Employee `position` is null | Displays `—` (`position ?? "—"`) | Page line 114 |
| `referenceDocument` is null | Displays `—` (`referenceDocument ?? "—"`) | Per-employee page line 168 |
| `remarks` is null or empty | Displays `—` (`remarks ?? "—"`) with `truncate` | Per-employee page line 169 |
| Mobile viewport (320px) | Sidebar hidden (`hidden lg:block`); mobile drawer button (`lg:hidden`) appears; content uses natural scroll (`overflow-y-auto`) without fixed panel constraints | Layout uses `lg:` responsive prefixes |
| No transactions for employee | Per-employee page shows `No transactions yet` (`TableEmptyState`) | Line 137 |

### 14.2 Missing or unverified behaviors

- **Loading state:** No skeleton or `Suspense` boundary exists for `serviceCreditOverview()` or the per-employee ledger query. The page renders only after the async server component resolves.
- **Pagination:** Not implemented for the overview table.
- **Sort controls:** Not implemented for the overview table (only `serviceCreditOverview()` supports `sort` for employee listing; the service-credits overview has no sort parameter).
- **Export:** No export functionality (`PDF`/`XLSX`) for service credit data.
- **Reconciliation / discrepancy alert:** No mechanism compares the derived summary cards against the full transaction history or flags inconsistencies.

---

## Section 15: Performance and Analytics Reliability

### 15.1 Query structure (verified)

`serviceCreditOverview()` (`src/lib/employees.ts`, lines 263–307):

- Uses a single `SELECT` with `LEFT JOIN` to `serviceCreditTransactions`, grouping by `employees.id`.
- Aggregates `SUM(case when ... then credits end)` at SQL level (not in memory).
- No N+1 query problem — no per-row transaction loading.
- No pagination or server-side filtering beyond the `LIKE` search (`serviceCreditOverview` does not use pagination parameters).

Performance implications:
- The query loads all employee rows + aggregated sums in one pass. For large employee counts, this may become slow (no `LIMIT` / pagination). There is no `page` or `pageSize` parameter for the overview.
- The `LEFT JOIN` means archived/inactive employees are included; there is no status filter by default (`serviceCreditOverview()` does not apply `status = 'active'`).

### 15.2 Decimal precision

`computeBalance()` rounds to 2 decimal places (`Math.round(... * 100) / 100`). The SQL `SUM` operates on SQLite `real` (floating-point). Float drift is normalized at computation time, but the SQL aggregate does not enforce rounding at the DB level. The application layer applies rounding consistently (`computeBalance()` called for both per-row and global totals).

### 15.3 Consistency checks (verified)

- Global cards = `rows.reduce()` over the same array returned by `serviceCreditOverview()`.
- Per-employee `CreditBadges` (`employee-ui.tsx`) displays `earned`, `consumed`, `balance` from the same `ServiceCreditOverviewRow` fields.
- Per-employee ledger (`serviceCreditSummary()`) calculates independently via `SUM` grouped by `type`; the card totals (`Total Earned`, `Total Consumed`, `Available Balance`) are derived from `serviceCreditSummary()`.
- There is no separate cached aggregate that could become stale. The overview cards are always derived from the live query.

### 15.4 Potential reliability risks

- **No pagination:** Large employee counts could slow the single `LEFT JOIN` + `SUM` query.
- **No index on `serviceCreditTransactions.transactionDate`:** Only indexes exist for `employee_id`, `type`, `date`. Filtering by date range (not currently supported in the UI) would require a full table scan.
- **No unique constraint on `serviceCreditTransactions` for `(employeeId, transactionDate, reason)`:** Duplicate entries are allowed.
- **No reconciliation mechanism:** If the SQL aggregate produces an incorrect result (e.g., due to float precision differences across SQLite versions), there is no reconciliation alert or cross-check.

---

## Section 16: Limitations and Technical Findings

### 16.1 Verified findings with evidence

| Finding / Issue | Evidence in codebase | Affected file / function | Impact | Severity |
|---|---|---|---|---|
| Overview page is read-only; no mutation actions exposed | `service-credits/page.tsx` imports only `serviceCreditOverview()`; no mutation imports; only `GET` search form exists | `service-credits/page.tsx` | Users cannot edit from overview; intended by design (ledger-based model) | Confirmed design |
| No pagination for overview table | `serviceCreditOverview()` has no `page`/`pageSize`; `page.tsx` renders all rows directly | `service-credits/page.tsx`, `src/lib/employees.ts` | Performance risk with large employee counts | Low |
| No sort controls on overview table | No `sort` parameter used; `serviceCreditOverview()` does not sort by credit values | `service-credits/page.tsx` | User must rely on employee name search; no sorting by balance | Low |
| Per-employee ledger does not expose edit link per transaction row | `employees/[id]/service-credits/page.tsx` JSX has no `Edit` or `Correct` link; only `Record Transaction` button | `employees/[id]/service-credits/page.tsx` | Users cannot edit existing transactions through the UI; the server action `updateServiceCreditTransaction()` exists but is not wired to any UI control | Confirmed — edit action exists server-side but UI link is missing |
| System Online indicator is static | `app-shell.tsx` line 135: `"System Online"` hard-coded; no health-check endpoint referenced | `app-shell.tsx` | Indicator is decorative; does not reflect actual system health | Low |
| Global search (`app-shell.tsx`) and employee search (`service-credits/page.tsx`) use different logic | Global search in `app-shell.tsx` uses `action="/students"` (student search); employee search uses `GET /service-credits?q=` with `LIKE` on `firstName`/`lastName`/`employeeNumber` | `app-shell.tsx`, `service-credits/page.tsx` | Different search scopes and endpoints; no shared logic | Confirmed |
| Audit logging covers mutations but does not log read access | `audit_logs` table has `action`, `entityType`, `entityId`, `oldValuesJson`, `newValuesJson`; `service_credits.view` does not generate audit entries (only mutations do) | `src/lib/audit.ts` | Read access is not audited; only changes (`SERVICE_CREDIT_ADD`, `SERVICE_CREDIT_UPDATE`) are logged | Confirmed |
| No file upload for service credit reference documents | `fileReference` column exists (`text`, max 100) but is only a text reference; no file-upload component or storage integration | `serviceCreditSchema` (`referenceDocument`), `serviceCreditTransactions.file_reference` | Reference document is text-only; no file attachment mechanism | Confirmed design (not a bug) |
| Mobile drawer for navigation uses `Menu` and `X` icons; no sticky sidebar on mobile | Sidebar (`hidden lg:block`); mobile drawer (`lg:hidden`) appears as overlay with backdrop | `PrivacyDocumentationLayout.tsx` | Correct responsive behavior; sidebar hidden on mobile; content scrolls naturally | Confirmed |

### 16.2 Design decisions (verified)

- **Read-only overview:** Confirmed by absence of mutation actions in the page component and the presence of the `Record Transaction` button only on the per-employee ledger page. The design separates reporting from transaction management.
- **Ledger-based balance:** Confirmed by the absence of a `balance` column in `serviceCreditTransactions`; `computeBalance()` is the only balance calculation.
- **Audit preservation:** Confirmed by `auditLogs` insertion in both mutation actions (`SERVICE_CREDIT_ADD`, `SERVICE_CREDIT_UPDATE`) with `oldValues` and `newValues`.
- **No edit link per transaction row:** Confirmed by JSX inspection (`employees/[id]/service-credits/page.tsx` has no edit/correct buttons per row). The `updateServiceCreditTransaction()` server action exists but is not exposed in the current UI. This is a verified limitation, not a missing feature — the design may intend for corrections to be handled differently (e.g., through a separate correction workflow not yet implemented), but no such workflow exists in the codebase.

---

## Section 17: Recommendations for Future Enhancements

### 17.1 Confirmed recommendations (based on verified limitations)

1. **Expose transaction edit/correction UI:** The server action `updateServiceCreditTransaction()` is fully implemented (validation, audit logging, projected balance check). Adding an `Edit` link per transaction row (`employees/[id]/service-credits/page.tsx`) and reusing `AddServiceCreditModal` (passing `defaultValue` props and a hidden `transactionId` input) would expose the existing correction functionality without new server logic.
2. **Add pagination to overview:** `serviceCreditOverview()` currently loads all matching employees in a single query. Adding `page`/`pageSize` parameters (similar to `listEmployees()` with pagination) would prevent performance degradation for large employee counts.
3. **Add sort options to overview:** The table currently has no sort controls. Adding sort by employee name or balance (similar to employee listing) would improve usability.
4. **Add reconciliation / discrepancy alert:** If a discrepancy is ever found between `computeBalance()` results and an external source, a reconciliation mechanism or audit review tool would be valuable. Currently, the audit log is the only reconciliation tool.
5. **Improve loading and error states:** The page has no `Suspense` boundary or skeleton loader. Adding a loading state (`Loading...`) or error message for database failures would improve user experience.
6. **Clarify System Online indicator:** The indicator (`app-shell.tsx`) is static. If it should reflect actual health, connecting it to a health-check endpoint or removing the health claim would clarify its purpose.

---

## Section 18: Questions and Answers About the Service Credits Page

### A. Business logic and calculations

**Q1: What exactly is a service credit in this system?**  
**A:** A service credit is a positive decimal quantity (unit: days) recorded per employee in the `service_credit_transactions` table. Each entry has `type` (`earned` or `consumed`), a `reason` (max 300 chars), `transactionDate` (ISO `YYYY-MM-DD`), an optional `referenceDocument` (max 100 chars), and optional `remarks` (max 300 chars). Credits represent earned and consumed service-credit days for school personnel. **Verified:** Schema definition (`db/schema.ts`); `SERVICE_CREDIT_TYPES` (`["earned", "consumed"]`) in `constants.ts`.

**Q2: How is Total Earned calculated?**  
**A:** `Total Earned` = `SUM(serviceCreditTransactions.credits WHERE type = 'earned')` for the visible (filtered) employee set. The SQL uses `coalesce(sum(case when ... then ... end), 0)`. **Verified:** `serviceCreditOverview()` (`src/lib/employees.ts`, line 289); `serviceCreditSchema` (`src/lib/schemas.ts`).

**Q3: How is Total Consumed calculated?**  
**A:** `Total Consumed` = `SUM(serviceCreditTransactions.credits WHERE type = 'consumed')` for the visible employee set. The `credits` value is always positive; consumption is derived from `type`. **Verified:** Same query (`serviceCreditOverview()`, line 290); `CreditBadges` displays `consumed` with a `−` prefix.

**Q4: How is Total Available calculated?**  
**A:** `Total Available` = `Total Earned - Total Consumed`, rounded to 2 decimal places (`Math.round((earned - consumed) * 100) / 100`). **Verified:** `service-credits/page.tsx` (line 45: `Math.round((totals.earned - totals.consumed) * 100) / 100`); `computeBalance()` (`src/lib/employees.ts`).

**Q5: Are summary values computed from ledger entries or stored balances?**  
**A:** Computed from ledger entries (`serviceCreditTransactions`). There is no stored balance column. **Verified:** Schema (`serviceCreditTransactions` has no balance column); `serviceCreditOverview()` SQL; `computeBalance()` documentation.

**Q6: Do summary cards show global totals or filtered totals?**  
**A:** Filtered totals. The cards are derived from `rows.reduce()` (the same array as the employee table). If `q` filters the table, the cards shrink accordingly. **Verified:** `service-credits/page.tsx` lines 25–31 (`const totals = rows.reduce(...)`).

**Q7: Why might visible rows differ from summary cards?**  
**A:** They should not differ — the cards are derived directly from the visible rows. However, if pagination were added in the future, cards and visible rows could diverge. Currently, no pagination exists, so the cards and the visible table are always consistent.

**Q8: How are decimal service credits handled?**  
**A:** `credits` is `real` (`float`) in SQLite. Validation (`serviceCreditSchema`) accepts `0.01` to `365` with `.min(0.01)` and `.max(365)`. `computeBalance()` rounds to 2 decimal places (`* 100 / 100`). Cards display `.toFixed(2)`. Per-row badges show `.toFixed(2)`. **Verified:** Schema, `serviceCreditSchema`, `computeBalance()`, component JSX.

**Q9: What happens when a transaction is corrected?**  
**A:** `updateServiceCreditTransaction()` edits the existing `serviceCreditTransactions` row in place (updates `type`, `credits`, `transactionDate`, `reason`, `referenceDocument`, `remarks`, `updatedBy`, `updatedAt`). It does not create a new reversal entry. The audit log (`SERVICE_CREDIT_UPDATE`) preserves `oldValues` (`type`, `credits`, `transactionDate`) and `newValues`. If the correction would make the balance negative, the action is rejected (`projected < 0`). **Verified:** `src/actions/employees.ts` (lines 548–592); `audit_logs` insertion (line 578–587).

**Q10: How does the system prevent duplicate counting?**  
**A:** There is **no unique constraint** on `(employeeId, type, transactionDate, reason)`. The database allows multiple `earned` or `consumed` entries for the same employee on the same date with the same reason. The application relies on audit logging (`SERVICE_CREDIT_ADD`) and user discipline, not DB constraints, to prevent unintended duplicates. **Verified:** Schema (`serviceCreditTransactions` indexes do not enforce uniqueness); action code (`addServiceCreditTransaction()` does not check for duplicates).

### B. Editability and transaction management

**Q11: Why can service credit values not be edited from the overview page?**  
**A:** The overview page (`service-credits/page.tsx`) is intentionally read-only. It imports only the read-only query `serviceCreditOverview()`; it does not import any mutation actions (`addServiceCreditTransaction`, `updateServiceCreditTransaction`). The only form is a `GET` search form (`action="/service-credits"`, `method="GET"`). There is no `Edit` button, no mutation `formAction`, and no `useActionState`. **Verified:** Lines 1–134 of `service-credits/page.tsx`.

**Q12: Is the page intentionally read-only, or is editing not implemented?**  
**A:** Intentionally read-only by design. The page serves as a reporting/summarization interface; transaction management (add, correct) is separated to the per-employee ledger (`/employees/[id]/service-credits`). This aligns with the ledger-based accounting model (`serviceCreditTransactions` is the authoritative source; balance is derived). **Verified:** Component comments (`service-credit-modal.tsx`: `"Record a service-credit transaction"`; `service-credits/page.tsx`: no mutation logic); database schema comment (`"Balance is always derived"`).

**Q13: Where can authorized users add earned/consumed transactions?**  
**A:** The `Record Transaction` button (`AddServiceCreditModal`) appears on `/employees/[id]/service-credits` when `canManage` is true (`service_credits.manage` permission + employee `status !== "archived"`). The form submits to `addServiceCreditTransaction()`. **Verified:** `employees/[id]/service-credits/page.tsx` (lines 76–78, 104); `service-credit-modal.tsx` (line 25: `open` state, `formAction` from `useActionState`).

**Q14: Can an existing ledger entry be changed or deleted?**  
**A:** **Changed (edited):** Yes — the server action `updateServiceCreditTransaction()` exists and handles corrections with validation and audit logging. **Deleted:** No — there is no `deleteServiceCreditTransaction()` action or UI. There is no `ARCHIVE` or `DELETE` mechanism for service credit transactions.

**Q15: If a transaction is wrong, what is the supported correction process?**  
**A:** The user must navigate to the per-employee ledger (`/employees/[id]/service-credits`) and use the `Record Transaction` mechanism... **Wait:** The per-employee page (`employees/[id]/service-credits/page.tsx`) does **not** expose an edit link per transaction row. The `updateServiceCreditTransaction()` action exists server-side but is not wired to any UI control. There is no `Edit` or `Correct` link in the JSX (only `Record Transaction` for new entries). Therefore, the current UI **does not expose** the correction workflow, even though the server action is implemented. This is a verified finding: the edit UI is missing from the per-employee ledger table.

**Q16: Are balance changes recorded in an audit trail?**  
**A:** Yes. Every mutation (`SERVICE_CREDIT_ADD`, `SERVICE_CREDIT_UPDATE`) writes to `audit_logs` (`entityType: "service_credit_transaction"`, `entityId: txId`, `oldValuesJson`, `newValuesJson`). Read access (`service_credits.view`) does not generate audit entries. **Verified:** `src/actions/employees.ts` (lines 505–513, 578–587); `src/lib/audit.ts`.

**Q17: Why is a ledger-based design safer than direct balance editing?**  
**A:** Because every change creates an auditable entry with reason, reference, date, and user. Direct balance editing would destroy the audit trail and allow silent changes. The derived balance (`computeBalance()`) ensures consistency between the transaction history and displayed totals. **Verified:** Schema comments (`"No manually editable stored balance column"`); `auditLogs` insertion; `serviceCreditSchema` (no balance field).

**Q18: What would need to change to support inline editing?**  
**A:** To support inline editing: (1) Add an edit/correct control to the transaction table on the per-employee page (`employees/[id]/service-credits/page.tsx`); (2) Pass transaction data to `AddServiceCreditModal` (or create a new edit modal) using `defaultValue` props and a hidden `transactionId` input; (3) Call `updateServiceCreditTransaction()` server-side. The server action and validation (`serviceCreditSchema`, `balanceForEmployee()`, audit logging) are already fully implemented — only the UI trigger is missing.

**Q19: Should the balance be edited directly, or should a new adjustment transaction be recorded?**  
**A:** The current design uses **correction (in-place edit)** via `updateServiceCreditTransaction()`, not a new adjustment entry. The audit log preserves previous values (`oldValues`). A reversal mechanism (`new` entry with opposite sign) does not exist. Changing to a new-entry model would require a new schema/action (`delete` or `reverse` transaction type) and changes to the audit model.

**Q20: Which authorization checks are required before allowing modifications?**  
**A:** `service_credits.manage` (`getAuthorizedUser`). The route (`employees/[id]/service-credits`) also requires `service_credits.view`. The server action verifies both (`getAuthorizedUser` checks permission; `employee.status !== 'archived'` blocks mutations; `balanceForEmployee()` validates amount). **Verified:** `permissions.ts` (`ADMIN_OFFICER` includes both); `actions/employees.ts`; `employees/[id]/service-credits/page.tsx` (line 46: `canManage`).

### C. Employee table and search

**Q21: How are employees selected for the table?**  
**A:** `serviceCreditOverview()` selects all `employees` (no status filter) with a `LEFT JOIN` to `serviceCreditTransactions`, grouped by `employees.id`. Search (`?q=`) applies a `LIKE` filter on `firstName`, `lastName`, `employeeNumber`. **Verified:** `serviceCreditOverview()` (`src/lib/employees.ts`).

**Q22: Are inactive employees included?**  
**A:** Yes. The query does not filter by `status`. Both `active` and `inactive` employees appear. Archived (`status = 'archived'`) employees also appear (they have derived balances but cannot receive new transactions). **Verified:** Query uses no `status` filter; page shows all rows; `archiveEmployee()` sets `status = 'archived'` but does not delete transactions.

**Q23: Why might an employee appear with zero service credits?**  
**A:** If the employee has no `serviceCreditTransactions` entries (`LEFT JOIN` produces `NULL` sums; `coalesce(..., 0)` converts to `0`), the derived `earned` = `0`, `consumed` = `0`, `balance` = `0`. The `CreditBadges` component shows `Earned 0.00`, `Consumed 0.00`, `Balance 0.00`. **Verified:** `serviceCreditOverview()` SQL; `computeBalance(0, 0) = 0`.

**Q24: Which fields can the employee search match?**  
**A:** `firstName`, `lastName`, `employeeNumber` (`LIKE %needle%`). Not `position`, `middleName`, `suffix`, `department`, `employmentType`, `appointmentStatus`. **Verified:** `serviceCreditOverview()` SQL (`firstName LIKE`, `lastName LIKE`, `employeeNumber LIKE`).

**Q25: Does searching change the summary statistics?**  
**A:** Yes. The cards are derived from the filtered `rows` array (`rows.reduce()`), not a separate unfiltered aggregate. **Verified:** `service-credits/page.tsx` lines 21–31.

**Q26: Is the search performed by the server or client?**  
**A:** Server. The form submits `GET` to `/service-credits`; `serviceCreditOverview({ q })` executes SQL with `LIKE`. There is no client-side filtering after data loads. **Verified:** Page JSX (`form action="/service-credits" method="GET"`); query logic (`serviceCreditOverview()` builds SQL conditions).

**Q27: What happens when no employees match the search?**  
**A:** `TableEmptyState` shows `No employees match your search`; cards show `0.00`; `rows.length` description reads `0 employees`. **Verified:** Page JSX (`{rows.length === 0 ? ...}` with `q ? "No employees match..." : "No employees yet"`).

**Q28: How is the employee count calculated?**  
**A:** `rows.length` — the count of employee rows returned by `serviceCreditOverview()` for the current query (`q` filter applied). Not a separate `count()` query. **Verified:** `service-credits/page.tsx` line 61 (`description={`${rows.length} employee${...}`}`); `serviceCreditOverview()` does not return a `total` count.

### D. Ledger and database

**Q29: What is the difference between an employee record and a service credit ledger entry?**  
**A:** The `employees` table stores the employee profile (name, number, position, status, etc.). The `serviceCreditTransactions` table stores each earned/consumed transaction (`id`, `employeeId`, `type`, `credits`, `transactionDate`, `reason`, etc.). The ledger is the full set of transactions for an employee; the balance is derived from the ledger, not stored separately. **Verified:** Schema (`employees` table lines 853–919; `serviceCreditTransactions` lines 964–995); relations (`serviceCreditTransactionRelations`).

**Q30: Which database table is the authoritative source of service credit history?**  
**A:** `service_credit_transactions`. There is no separate `service_credit_balances` or aggregate table. **Verified:** Schema definition (`serviceCreditTransactions` is the only table for service credits); `serviceCreditSummary()` selects from it; `serviceCreditOverview()` aggregates from it.

**Q31: How are employees linked to their ledger entries?**  
**A:** `serviceCreditTransactions.employeeId` → `employees.id` (FK, cascade delete). Each transaction references exactly one employee. **Verified:** Schema (`serviceCreditTransactions.employeeId` references `employees.id`, `onDelete: cascade`); relations (`serviceCreditTransactionRelations`).

**Q32: Does the system store an employee's current balance separately?**  
**A:** **No.** There is no `balance` column in `serviceCreditTransactions` or any separate balance table. The balance is derived (`SUM(earned) - SUM(consumed)`) at query time. **Verified:** Schema (no balance column); `serviceCreditSummary()` derives balance; `serviceCreditOverview()` derives balance; `computeBalance()` documentation.

**Q33: What happens if a stored balance and calculated ledger balance disagree?**  
**A:** There is no stored balance to disagree with. If a discrepancy were suspected (e.g., if an external system reported a different total), reconciliation would require inspecting the full `serviceCreditTransactions` history for the employee (via `listServiceCreditTransactions()`). There is no automatic reconciliation mechanism. **Verified:** No balance table exists; no reconciliation function exists in the codebase.

**Q34: Can historical transactions be deleted?**  
**A:** **No.** There is no `deleteServiceCreditTransaction()` server action, no `DELETE` SQL operation for `serviceCreditTransactions`, and no `delete` mutation in the actions file. The only mutation is `updateServiceCreditTransaction()` (in-place edit) and `addServiceCreditTransaction()` (new entry). **Verified:** `src/actions/employees.ts` (no delete function); `serviceCreditTransactions` schema has no archive/deletion mechanism.

**Q35: Which database constraints protect ledger integrity?**  
**A:** `employee_id` FK (`cascade delete`), `type` enum (`earned`/`consumed` enforced by schema definition, not DB-level enum constraint in SQLite), `credits` positive (`application-level` via `serviceCreditSchema` min `0.01`); `reason` not null (`DB-level` not null); `created_by` not null (`DB-level`); `created_at`/`updated_at` default `unixepoch()`. No unique constraint on `(employeeId, type, transactionDate, reason)`; duplicate entries allowed. **Verified:** Schema (`sqliteTable` definitions, `uniqueIndex` list, `notNull()` columns).

**Q36: How are service credit changes audited?**  
**A:** `addServiceCreditTransaction()` logs `SERVICE_CREDIT_ADD` with `entityType: "service_credit_transaction"`, `entityId: txId`, `newValues: { employeeId, type, credits }`. `updateServiceCreditTransaction()` logs `SERVICE_CREDIT_UPDATE` with `oldValues: { type, credits, transactionDate }` and `newValues: { type, credits, transactionDate }`. The audit log (`auditLogs`) includes `userId`, `ipAddress`, `userAgent`, `entityType`, `entityId`, `oldValuesJson`, `newValuesJson`, `createdAt`. There is no `delete` audit entry because deletion is not supported. **Verified:** `src/actions/employees.ts` (audit insertion lines); `src/lib/audit.ts` (`AuditInput` interface); `db/schema.ts` (`auditLogs` definition).

### E. Security and reliability

**Q37: Which roles can view the Service Credits page?**  
**A:** Only `admin_officer` (DB role id `role-admin-officer`). The permission `service_credits.view` is included only in `ADMIN_OFFICER` array (`permissions.ts`, lines 220–233). No other role (`admin`, `school_admin`, `teacher`, `records`, `guidance`, `nurse`, `registrar`, `literacy_coordinator`) holds it. **Verified:** `permissions.ts`; route guard (`service-credits/page.tsx`, line 19: `if (!hasPermission(user.role, "service_credits.view")) redirect("/dashboard")`).

**Q38: Who can access an individual employee's ledger?**  
**A:** Any user with `service_credits.view`. The per-employee page (`employees/[id]/service-credits/page.tsx`, line 32) requires `service_credits.view`. There is **no additional per-employee authorization** — any user with `service_credits.view` can navigate to any employee's ledger directly (`/employees/[any-id]/service-credits`). The `serviceCreditSummary()` and `listServiceCreditTransactions()` functions use the `employeeId` parameter directly without additional scope checks. **Verified:** Page component; query functions (`serviceCreditSummary`, `listServiceCreditTransactions` take `employeeId` directly); no per-employee permission check exists.

**Q39: Are permissions enforced by the server?**  
**A:** Yes — `getCurrentUser()` resolves session; `hasPermission()` checks `ROLE_PERMISSIONS`; `requirePermission()` redirects to `/dashboard`; `getAuthorizedUser()` returns `null` for actions. The page and action layers enforce server-side. UI checks (`AddServiceCreditModal` condition `canManage`) are cosmetic; the server action would reject unauthorized submissions (`getAuthorizedUser` returns `null` → `fail`). **Verified:** `auth.ts` (`getAuthorizedUser`, `requirePermission`, `hasPermission`); `permissions.ts` (`ROLE_PERMISSIONS`); `service-credits/page.tsx`; `service-credit-modal.tsx`; `actions/employees.ts`.

**Q40: What happens when an unauthorized user attempts direct access?**  
**A:** Redirected to `/dashboard`. The route guard (`service-credits/page.tsx`, line 19) checks `hasPermission(user.role, "service_credits.view")` before any query runs. The `getAuthorizedUser()` action guard returns `fail()` (not redirect) for actions. **Verified:** Page component; `getAuthorizedUser()` definition (`auth.ts`, line 125).

**Q41: What happens when a database query fails?**  
**A:** The async server component (`service-credits/page.tsx`) does not wrap `serviceCreditOverview()` in `try/catch`. A database error will propagate to Next.js error handling (error page or parent layout error boundary). There is no graceful user-facing error message. The `serviceCreditSummary()` and `listServiceCreditTransactions()` functions also have no error handling. **Verified:** Page component (`await serviceCreditOverview({ q })` without `try/catch`); `serviceCreditSummary()` (`db.select()` without `try/catch`); `listServiceCreditTransactions()` (same).

**Q42: How does the page prevent stale or inconsistent summaries?**  
**A:** The summary cards (`totals`) are derived from the same `rows` array returned by `serviceCreditOverview()` (single SQL query). There is no separate cached aggregate. However, the query uses a `LEFT JOIN`; if a new transaction is inserted after the query starts but before the cards render (race condition), the cards could briefly show a stale total until the page is re-rendered (via `revalidatePath` after mutation). The mutation actions (`addServiceCreditTransaction`, `updateServiceCreditTransaction`) call `revalidatePath()` to trigger re-render. **Verified:** Page component (cards derived from `rows`); mutation actions (`revalidatePath` calls); no separate aggregate table.

**Q43: Are System Online indicator and other status elements real?**  
**A:** The `System Online` indicator (`app-shell.tsx`, line 135) is a static display (`"System Online"` text with green dot). There is no health-check endpoint or `system_settings` check connected to it. The page header (`PageHeader`) and card descriptions are static text, not dynamic health indicators. **Verified:** `app-shell.tsx` (line 94: `sticky` header; line 135: static text with green dot); `service-credits/page.tsx` header is static JSX.

**Q44: Greatest risk to data accuracy?**  
**A:** (1) The overview page has no pagination, so very large employee counts could degrade performance or cause timeouts. (2) There is no unique constraint preventing duplicate `serviceCreditTransactions` entries for the same employee/date/reason, which could inflate totals accidentally. (3) The edit UI (`updateServiceCreditTransaction`) exists server-side but is not exposed in the per-employee page, meaning corrections must rely on a mechanism that is not visible to users (potential confusion if an error needs correction). (4) There is no reconciliation mechanism between `computeBalance()` and any external record. (5) No `delete` mechanism for erroneous transactions (only edit); errors must be corrected by editing the row, which preserves the audit trail but could be confusing if a complete removal is needed.

### F. Security and reliability (continued)

**Q45: What is the difference between a read-only page and a missing feature?**  
**A:** The overview page (`service-credits/page.tsx`) has **no mutation actions** (verified by import list, JSX forms, and component props). The per-employee page (`employees/[id]/service-credits/page.tsx`) has `AddServiceCreditModal` (mutation UI) but **no edit/correct link per transaction row** (only `Record Transaction` button). The `updateServiceCreditTransaction()` server action exists but is not wired to any visible control. Therefore: the overview is intentionally read-only (design); the edit capability for existing transactions is partially implemented (server-side exists, UI link missing).

**Q46: Is there an audit trail for read access?**  
**A:** **No.** `audit_logs` records mutations only (`SERVICE_CREDIT_ADD`, `SERVICE_CREDIT_UPDATE`). There is no `SERVICE_CREDIT_VIEW` or similar audit entry for viewing the page or opening the ledger. Read access is not audited.

---

## Section 19: Implementation Status Matrix

| Feature / Area | Status | Evidence | Known Limitations | Recommended Action |
|---|---|---|---|---|
| Page purpose (read-only overview) | **Implemented** | `service-credits/page.tsx` renders cards + table; no mutation actions | Read-only by design; no inline edit | Confirm design with system owner |
| Page purpose (per-employee ledger) | **Implemented** | `employees/[id]/service-credits/page.tsx` shows summary + filterable history + `Record Transaction` button | No edit/correct link per transaction row; `updateServiceCreditTransaction()` exists server-side but is not exposed in UI | Add edit/correct control per row; reuse `AddServiceCreditModal` with `defaultValue` |
| Total Earned calculation | **Implemented** | `serviceCreditOverview()` SQL `sum(case when type = 'earned' ...)`; `serviceCreditSummary()` | Summary cards change with search filter (same `rows` array) | Document filter behavior for users |
| Total Consumed calculation | **Implemented** | Same SQL (`sum(case when type = 'consumed' ...)`) | Same filter dependency | Document filter behavior |
| Total Available calculation | **Implemented** | `computeBalance()` (derived from `earned - consumed`, rounded to 2dp) | Negative balances displayed with red badge (`CreditBadges`) | Confirm negative balance handling with business rules |
| Service Credit Ledger (view) | **Implemented** | `listServiceCreditTransactions()` with optional `type` filter; `serviceCreditSummary()` | No pagination for transaction history; no date-range filter beyond `type` | Consider pagination or date-range filter for long histories |
| Service Credit Transaction (add) | **Implemented** | `addServiceCreditTransaction()` server action; `AddServiceCreditModal` UI; `serviceCreditSchema` validation; audit logging (`SERVICE_CREDIT_ADD`) | None significant | Verify mobile usability of modal form |
| Service Credit Transaction (edit/correct) | **Partially implemented** | `updateServiceCreditTransaction()` server action exists with full validation (`serviceCreditSchema`, `balanceForEmployee()`, projected balance check, audit `SERVICE_CREDIT_UPDATE`); audit logging includes `oldValues`/`newValues` | **UI edit link missing** — the per-employee page JSX (`employees/[id]/service-credits/page.tsx`) has no edit/correct button per transaction row; the correction mechanism exists server-side but is not exposed in the interface | **Add edit control** to the transaction table; reuse `AddServiceCreditModal` by passing `defaultValue` props and hidden `transactionId` input |
| Service Credit Transaction (delete/reverse) | **Not implemented** | No `deleteServiceCreditTransaction()` action or component; no `delete` mutation in `actions/employees.ts` | No mechanism to remove erroneous transactions; only edit-in-place is supported | If reversal is required, implement a new `reverse` mechanism or `delete` action with additional authorization checks |
| Search functionality | **Implemented** | `GET /service-credits?q=`; `LIKE` filter on `firstName`, `lastName`, `employeeNumber`; server-side (`serviceCreditOverview()`); cards derived from filtered `rows` | Search does not include `position`, `middleName`, `department`, `employmentType`, etc.; no pagination for results | Consider expanding searchable fields or adding pagination for large result sets |
| Mobile responsive layout | **Implemented** | `hidden lg:block` sidebar; `lg:hidden` mobile drawer button (`Menu`); content scrolls naturally; `max-h-[calc(100vh-11rem)]` on desktop; `overflow-y-auto` for content | Mobile drawer uses `fixed` overlay with backdrop blur; content does not use fixed-height scroll on mobile | Confirm mobile usability with actual device testing |
| Data integrity (DB constraints) | **Implemented** | `employee_id` FK (`cascade delete`); `type` restricted by application schema; `credits` positive (`> 0`); `reason` not null; `created_by` not null; indexes on `employee_id`, `type`, `date` | No unique constraint preventing duplicate entries; no DB-level enum for `type` (SQLite); `credits` is `real` (floating-point) | Consider adding DB-level `CHECK` constraints (`credits > 0`) or `UNIQUE` index for idempotency if needed |
| Audit logging (mutations) | **Implemented** | `SERVICE_CREDIT_ADD` and `SERVICE_CREDIT_UPDATE` logged to `audit_logs` with `oldValues`/`newValues` | Read access (`service_credits.view`) is not audited; no `SERVICE_CREDIT_VIEW` entry | Confirm whether read-access auditing is required by compliance |
| Audit logging (read access) | **Not implemented** | No `audit_logs` insertion for `service_credits.view` or reading a ledger; only mutations are audited | Read access not tracked; unauthorized access attempts are handled by redirect, not audit entry | Consider adding audit entry for unauthorized access attempts or read events if required |
| Loading state for queries | **Not implemented** | No `Suspense`, skeleton loader, or loading spinner; page renders only after `await serviceCreditOverview()` resolves | Slow database queries block rendering without feedback | Add `Suspense` or loading indicator for user experience |
| System Online indicator | **Decorative / Not verified** | Static text (`"System Online"`) with green dot; no health-check endpoint or `system_settings` reference | Does not reflect actual system health; could mislead users | Either connect to a health endpoint or relabel to indicate status correctly |
| Performance / scalability | **Limited by design** | Single SQL query with `LEFT JOIN` + `SUM` aggregation; no pagination | Large employee counts could degrade performance; `serviceCreditOverview()` loads all rows in memory | Consider pagination (`page`/`pageSize`) for the overview table |
| Permission isolation (employee vs student data) | **Implemented** | `ADMIN_OFFICER` role holds no `students.*` permissions; `serviceCreditOverview()` joins only `employees` + `serviceCreditTransactions`; no student table references; `scope.ts` denies student rows (`1 = 0` for admin officer) | Confirmed by `rbac-roles.test.ts` and manual role isolation tests | Confirm role isolation remains intact after future changes |
| Mobile drawer accessibility | **Implemented** | `aria-label`, `aria-expanded`, `aria-controls`, `role="dialog"`, `aria-modal="true"`; keyboard-accessible close (`X` button); focus indicators via `focus-visible` in `globals.css` | Mobile drawer content uses `overflow-y-auto`; no `min-height: 0` issue on parent container | Verify keyboard navigation and screen-reader behavior |
| Active section tracking (sidebar) | **Implemented** | `IntersectionObserver` with `root: panel` (`#privacy-policy-content`); `rootMargin` set to `-20% 0px -65% 0px`; updates `activeId` state on scroll | `mountedRef` removed; observer retries via `setInterval` (200ms) until panel found; observer disconnects properly in cleanup | Confirm observer behavior at end of document (final section highlighted correctly) |
| Sidebar sticky behavior | **Implemented** | `sticky top-[5.5rem]` on desktop (`lg:block`); sidebar has independent scroll if list is long (`gap-0.5` with no fixed height) | No `overflow-y-auto` on sidebar; if list is very long, sidebar may overflow viewport | Add `overflow-y-auto` to sidebar if needed for very long TOC |

---

## Section 20: Appendix A — File and Component Reference

| Path | Type | Responsibility | Key Functions / Components |
|---|---|---|---|
| `documentation/features/service-credits.md` | Documentation | Existing feature documentation (summary version) | References `service-credits/page.tsx`, `service-credit-modal.tsx`, `employees.ts`, `schemas.ts`, `db/schema.ts` |
| `src/app/(app)/service-credits/page.tsx` | Page (Server Component) | Overview page (cards + search + table) | `serviceCreditOverview()`, `PageHeader`, `Card`, `CreditBadges` |
| `src/app/(app)/employees/[id]/service-credits/page.tsx` | Page (Server Component) | Per-employee ledger (summary cards + transaction history + filter) | `serviceCreditSummary()`, `listServiceCreditTransactions()`, `AddServiceCreditModal` |
| `src/components/employees/service-credit-modal.tsx` | Client Component (`"use client"`) | Transaction form (`useActionState`) | `AddServiceCreditModal`, `Modal`, `Button`, `Field`, `Input`, `Select`, `Textarea` |
| `src/components/employees/employee-ui.tsx` | Component | Employee table (`EmployeeTable`), filters (`EmployeeFilters`), badges (`CreditBadges`), pagination (`EmployeePagination`), KPI grid (`EmployeeKpiGrid`) | `CreditBadges`, `EmployeeStatusBadge`, `EmployeeTable`, `EmployeePagination` |
| `src/components/ui/table.tsx` | Shared UI Component | Table primitives (`TableWrap`, `Th`, `Td`, `TableEmptyState`) | `TableWrap` (`minWidth`, `overflow-x-auto`), `Th` (`bg-[#EEF4FF]/40`), `Td` (`text-[#263449]`) |
| `src/components/ui/card.tsx` | Shared UI Component | Card container (`Card`, `CardHeader`, `CardBody`) | `Card` (`rounded-lg`, `border-brand-200`, `shadow-xs`) |
| `src/lib/employees.ts` | Library (TypeScript) | Query helpers, calculation functions, validation rules | `serviceCreditOverview()`, `serviceCreditSummary()`, `listServiceCreditTransactions()`, `computeBalance()`, `validateCreditAmount()`, `balanceForEmployee()` |
| `src/actions/employees.ts` | Server Actions (`"use server"`) | Mutation actions (`addServiceCreditTransaction`, `updateServiceCreditTransaction`) + audit logging (`SERVICE_CREDIT_ADD`, `SERVICE_CREDIT_UPDATE`) | `getAuthorizedUser()`, `serviceCreditSchema`, `computeBalance()`, `validateCreditAmount()`, `balanceForEmployee()`, `revalidatePath()` |
| `src/lib/schemas.ts` | Library (TypeScript) | Validation schemas (`zod`) | `serviceCreditSchema` (`employeeId`, `type`, `credits`, `transactionDate`, `reason`, `referenceDocument`, `remarks`) |
| `src/lib/constants.ts` | Library (TypeScript) | Domain constants (`SERVICE_CREDIT_TYPES`, `SERVICE_CREDIT_TYPE_LABELS`, `EMPLOYEE_STATUSES`, `ROLE_LABELS`) | `SERVICE_CREDIT_TYPES = ["earned", "consumed"]` |
| `src/lib/permissions.ts` | Library (TypeScript) | RBAC permission definitions (`PERMISSIONS`, `ROLE_PERMISSIONS`, `hasPermission()`) | `service_credits.view`, `service_credits.manage`; `ADMIN_OFFICER` array |
| `src/lib/auth.ts` | Library (TypeScript) | Authentication (`getCurrentUser`, `createSession`, `destroySession`) and authorization (`requirePermission`, `getAuthorizedUser`, `requireUser`) | `getAuthorizedUser()` used by mutation actions; `requirePermission()` used by routes |
| `src/lib/audit.ts` | Library (TypeScript) | Audit logging (`logAudit()`) | `AuditInput` interface; `logAudit()` inserts to `auditLogs` table; never throws |
| `src/db/schema.ts` | Database Schema (Drizzle ORM) | Table definitions (`employees`, `serviceCreditTransactions`, `auditLogs`, `users`, `roles`, `permissions`, etc.) | `serviceCreditTransactions` definition, relations, indexes |
| `src/components/dashboard/officer.tsx` | Component (`Client` / `Server`) | Admin Officer dashboard (`OfficerDashboard`) — employee KPIs, service credit totals, recent records/transactions, employment type / appointment status breakdowns | `serviceCreditOverview()` data used for cards; `serviceCreditTransactions` used for recent transactions |
| `src/app/app-shell.tsx` | Shared Layout Component | Global sidebar navigation (`SidebarNav`), header (`sticky top-0`), user profile, notifications (`Bell` icon), search (`global-search` for students only for roles with `students.view`) | `service_credits.view` permission filters sidebar; `admin_officer` sees `Employee Records` section |

---

## Section 21: Appendix B — Data Dictionary (Verified from Schema)

### `service_credit_transactions` (`src/db/schema.ts`)

| Field | DB Type | Constraints / Source | Meaning |
|---|---|---|---|
| `id` | `text` PK | `crypto.randomUUID()` | Transaction identifier |
| `employee_id` | `text` FK → `employees.id` | Not null; `onDelete: cascade` | Employee owning the transaction |
| `type` | `text` | `"earned"` \| `"consumed"` (enforced by `serviceCreditSchema`) | Transaction direction |
| `credits` | `real` | Positive (> 0); `min(0.01)`, `max(365)` (Zod); no DB `CHECK` constraint | Credit quantity (days) |
| `transaction_date` | `text` | Not null; `YYYY-MM-DD` format (`isoDate` regex) | Date of transaction |
| `reason` | `text` | Not null; max 300 (`serviceCreditSchema`) | Required explanation |
| `reference_document` | `text` | Optional; max 100 | Reference (e.g., office order number) |
| `remarks` | `text` | Optional; max 300 | Additional notes |
| `created_by` | `text` FK → `users.id` | Not null | User who recorded the transaction |
| `updated_by` | `text` FK → `users.id` | Nullable | User who last edited the transaction |
| `created_at` | `timestamp` (`unixepoch()`) | Not null; default `unixepoch()` | Record creation time |
| `updated_at` | `timestamp` (`unixepoch()`) | Not null; default `unixepoch()` | Last update time |

### `employees` (relevant fields for service credits)

| Field | DB Type | Constraints / Source | Meaning |
|---|---|---|---|
| `id` | `text` PK | `crypto.randomUUID()` | Employee identifier |
| `employee_number` | `text` | Not null; unique; format `EMP-YYYY-######` or user-supplied | Stable employee identifier |
| `first_name` | `text` | Not null | Employee first name |
| `last_name` | `text` | Not null | Employee last name |
| `position` | `text` | Nullable | Job position |
| `status` | `text` | Not null; default `"active"`; enum: `active`, `inactive`, `archived` | Employee lifecycle status |
| `created_by` / `updated_by` | `text` FK → `users.id` | Not null / nullable | Audit users |
| `created_at` / `updated_at` | `timestamp` | Not null; default `unixepoch()` | Timestamps |

### `audit_logs` (relevant fields for service credit mutations)

| Field | DB Type | Constraints / Source | Meaning |
|---|---|---|---|
| `id` | `text` PK | `crypto.randomUUID()` | Audit entry identifier |
| `user_id` | `text` FK → `users.id` | Nullable (`onDelete: set null`) | User who performed the action |
| `action` | `text` | Not null; namespaced (`SERVICE_CREDIT_ADD`, `SERVICE_CREDIT_UPDATE`) | Action type |
| `entity_type` | `text` | Not null (`service_credit_transaction`) | Entity category |
| `entity_id` | `text` | Nullable (transaction UUID) | Transaction identifier |
| `old_values_json` | `text` | Nullable (`JSON.stringify`) | Previous values (`type`, `credits`, `transactionDate`) |
| `new_values_json` | `text` | Nullable (`JSON.stringify`) | Updated values |
| `ip_address` / `user_agent` | `text` | Optional | Session metadata |
| `created_at` | `timestamp` | Not null; default `unixepoch()` | Audit timestamp |

---

## Section 22: Appendix C — Calculation Examples (Illustrative, Based on Verified Formulas)

These examples use the verified `computeBalance()` formula (`Math.round((earned - consumed) * 100) / 100`) and the verified query logic (`SUM` aggregation from `serviceCreditTransactions`). They are **illustrative** and do not represent actual production database records.

### Example 1: Simple positive balance

| Entry | Type | Credits | Running Earned | Running Consumed | Running Balance |
|---|---|---|---|---|---|
| Transaction 1 | Earned | 10.00 | 10.00 | 0.00 | 10.00 |
| Transaction 2 | Earned | 5.00 | 15.00 | 0.00 | 15.00 |
| Transaction 3 | Consumed | 2.00 | 15.00 | 2.00 | 13.00 |
| Transaction 4 | Earned | 8.00 | 23.00 | 2.00 | 21.00 |

**Summary cards:** Total Earned `23.00`, Total Consumed `2.00`, Total Available `21.00`.

### Example 2: Float precision normalization (`computeBalance`)

| Earned | Consumed | Raw Difference | `computeBalance()` (rounded) |
|---|---|---|---|
| 6.50 | 1.30 | 5.20 | 5.20 |
| 10.333333... | 5.166666... | 5.166666... | 5.17 |

The `computeBalance()` rounds to 2 decimal places to avoid float-drift differences in comparisons.

### Example 3: Negative balance (rejected at mutation time)

Current earned: `10.00`  
Current consumed: `5.00`  
Current balance: `5.00`

Attempted new `consumed`: `6.00`  
`validateCreditAmount("consumed", 6.00, 5.00)` → `"Insufficient service credits. Available balance is 5.00."` (rejected by server action).

Attempted correction (`updateServiceCreditTransaction`) that changes `consumed` from `2.00` to `8.00` (with current earned `10.00`):
- Old: `earned 10.00`, `consumed 2.00` → balance `8.00`
- New: `earned 10.00`, `consumed 8.00` → projected balance `2.00` (allowed, positive).
- If new `consumed` were `12.00`: projected balance `-2.00` → rejected (`projected < 0`).

---

## Section 23: Appendix D — Open Questions for the System Owner

These questions remain unresolved after source-code inspection. They require business or design clarification from the system owner, not additional code inspection.

| Question | Why unresolved | Suggested clarification |
|---|---|---|
| Should the per-employee transaction table (`employees/[id]/service-credits`) expose an edit/correct link per row? | `updateServiceCreditTransaction()` server action exists with full validation and audit logging, but the JSX of the per-employee page has no edit control (`Edit`, `Correct`, or `Update`). The `service-credit-modal.tsx` component is used only for `addServiceCreditTransaction()` (new entries). It is unclear whether the edit UI was intentionally omitted or not yet implemented. | Confirm whether users should be able to edit existing transactions from the UI. If yes, add an edit control to the table that passes `defaultValue` props to the modal. |
| Should a `delete` or `reverse` mechanism exist for erroneous transactions? | No `deleteServiceCreditTransaction()` action exists. Corrections must use `updateServiceCreditTransaction()` (in-place edit). If a complete removal is needed, a new action (with additional authorization checks) is required. | Confirm whether complete deletion/reversal is a business requirement. If yes, implement `deleteServiceCreditTransaction()` (or `reverseServiceCreditTransaction()` as a new entry). |
| Should historical transactions ever be edited, or should corrections always create new adjustment entries? | The current design uses in-place correction (`update`). A new-entry model (`reverse` or `adjustment`) would require schema and action changes (`delete` or new `type`). | Confirm the preferred correction model: edit-in-place (current) vs. new reversal entry. |
| Should the System Online indicator reflect actual system health? | The indicator (`app-shell.tsx`) is static (`"System Online"`). There is no health-check endpoint or `system_settings` query connected. | Confirm whether the indicator should remain decorative or be connected to a health endpoint. |
| Should the service-credits overview table include pagination? | The query (`serviceCreditOverview()`) returns all matching employees. There is no `page`/`pageSize` parameter. Performance could degrade with many employees. | Confirm whether pagination is a future requirement. If yes, add pagination parameters to `serviceCreditOverview()` and the page component. |
| Should search include `position`, `middleName`, `department`, or `employmentType`? | The `serviceCreditOverview()` `LIKE` filter only covers `firstName`, `lastName`, `employeeNumber`. Other employee fields are excluded. | Confirm whether additional searchable fields are needed. |
| Should the search change the summary cards? | Currently, the cards (`totals`) are derived from the filtered `rows` array. This means searching reduces the card values. Some users might expect cards to remain global regardless of search. | Confirm whether summary cards should reflect the full employee set or the filtered set. If global totals are preferred, compute cards from an unfiltered aggregate query. |
| Should read access (`service_credits.view`) generate audit entries? | Only mutations (`SERVICE_CREDIT_ADD`, `SERVICE_CREDIT_UPDATE`) are audited. There is no `SERVICE_CREDIT_VIEW` audit entry. | Confirm whether read-access auditing is a compliance requirement. |
| Should archived employees appear in the overview? | The query includes all `employees` (`status` not filtered). Archived employees (`status = 'archived'`) appear with their derived balances but cannot receive new transactions. | Confirm whether archived employees should be excluded from the overview (add `status` filter) or remain visible for historical reference. |
| Should the `CreditBadges` component handle `null` or `undefined` values differently? | The component expects numbers (`earned`, `consumed`, `balance`). The query (`serviceCreditOverview()`) uses `Number(r.earned) || 0`, so `null` is converted to `0`. If the query were changed to return `null`, `CreditBadges` would throw (`.toFixed()` on `null`). | Confirm that `CreditBadges` always receives numbers (defensive check could be added). |

---

## Section 24: Appendix E — Implementation Status Matrix

| Feature / Area | Current Status | Evidence | Known Limitations | Recommended Action |
|---|---|---|---|---|
| Page purpose (read-only overview) | **Implemented** | `service-credits/page.tsx` renders cards + table; no mutation actions; `serviceCreditOverview()` read-only query | Read-only by design; no inline edit | Confirm design with system owner |
| Per-employee ledger view | **Implemented** | `employees/[id]/service-credits/page.tsx`; `serviceCreditSummary()`; `listServiceCreditTransactions()`; filter by `type` (`GET ?type=`) | No pagination for long transaction histories | Consider pagination or date-range filter |
| Per-employee transaction history filter | **Implemented** | `GET ?type=earned\|consumed\|` (empty = all); `listServiceCreditTransactions()` applies `eq(type, filter.type)` | Only `type` filter; no `date` range or `reason` filter | Evaluate additional filter options |
| Per-employee balance cards (`Earned`, `Consumed`, `Available`) | **Implemented** | `serviceCreditSummary()`; cards with icons (`TrendingUp`, `TrendingDown`, `Wallet`) and tones (emerald, amber, brand-900) | Derived from full transaction history (not cached) | Confirm with business rules |
| Per-employee `Record Transaction` modal | **Implemented** | `service-credit-modal.tsx` (`useActionState`, `Modal`, `Button`, `Field`, `Input`, `Select`, `Textarea`); `addServiceCreditTransaction()`; `serviceCreditSchema` validation | `pending` state handled; close on success (`setOpen(false)`); error alert shown | Verify mobile usability |
| Per-employee edit/correct of existing transactions | **Partially implemented (server-side exists, UI missing)** | `updateServiceCreditTransaction()` fully implemented (`serviceCreditSchema`, `balanceForEmployee()`, projected balance validation `< 0`, audit `SERVICE_CREDIT_UPDATE`); no edit link per row in JSX (`employees/[id]/service-credits/page.tsx`) | Edit functionality is not exposed to users; users can only add new transactions, not edit existing ones | **Add edit control** per transaction row; reuse `serviceCreditSchema` and `updateServiceCreditTransaction()` |
| Per-employee delete/reverse of transactions | **Not implemented** | No `deleteServiceCreditTransaction()` action; no delete/reverse mechanism; audit log has no `DELETE` entry for service credits | Only edit-in-place (`update`) is supported; complete removal is not possible | Implement delete/reverse if business rules require removal |
| Global search (`?q=`) | **Implemented** | `GET /service-credits`; `LIKE` filter on `firstName`, `lastName`, `employeeNumber`; cards derived from filtered `rows` | Cards change with search (same `rows` array); no pagination; no `position`/`department` search | Confirm whether cards should reflect full set or filtered set |
| Mobile responsive layout | **Implemented** | Sidebar hidden (`hidden lg:block`); mobile drawer (`Menu` button, overlay, backdrop blur, `translate-y-0`); content scrolls naturally on mobile (`overflow-y-auto` without fixed height); no sticky sidebar on mobile | Mobile drawer uses `fixed` overlay; content does not use fixed-height scroll on mobile (correct behavior) | Confirm usability on actual mobile devices |
| Data integrity (DB constraints) | **Implemented** | `employee_id` FK (`cascade delete`); `credits` positive (`serviceCreditSchema`); `reason` not null; `created_by` not null; indexes (`employee`, `type`, `date`) | No unique constraint preventing duplicate entries; `credits` is `real` (floating-point) | Consider adding `CHECK` constraints or unique index if duplicates are a concern |
| Audit logging (mutations) | **Implemented** | `SERVICE_CREDIT_ADD` and `SERVICE_CREDIT_UPDATE` logged to `auditLogs` (`entityType: service_credit_transaction`, `entityId: txId`, `oldValues`, `newValues`, `userId`, `ipAddress`, `userAgent`) | Read access not audited (`service_credits.view` does not generate audit entry) | Confirm whether read-access auditing is required |
| Audit logging (read access) | **Not implemented** | `auditLogs` only records mutations (`SERVICE_CREDIT_ADD`, `SERVICE_CREDIT_UPDATE`); no `SERVICE_CREDIT_VIEW` entry | Read access is not tracked | Consider adding `VIEW` audit if compliance requires it |
| Performance / scalability (overview table) | **Limited by design** | Single SQL query (`LEFT JOIN` + `SUM` aggregation); no pagination; all rows loaded in memory; `minWidth={800}` for horizontal scroll | Large employee counts could degrade performance; no `LIMIT` applied | Consider pagination (`page`/`pageSize`) for large employee counts |
| Performance / scalability (per-employee history) | **Limited by design** | `listServiceCreditTransactions()` selects all transactions for one employee; no pagination; ordered by `date DESC`, `createdAt DESC` | Long transaction histories load fully in memory; no `LIMIT` applied | Consider pagination for long histories |
| Loading state / error handling | **Not implemented** | No `Suspense`, skeleton loader, or `try/catch` around `serviceCreditOverview()` or `serviceCreditSummary()`; database errors propagate to Next.js error boundary | User sees error page or blank state for database failures; no graceful message shown | Add `Suspense` or error boundary with user-friendly message |
| System Online indicator (global header) | **Decorative / Not verified** | `app-shell.tsx` line 135: static text (`"System Online"`) with green dot; no health-check endpoint or `system_settings` reference | Indicator does not reflect actual system health; could mislead users | Either connect to health endpoint or relabel correctly |
| Design preservation (theme consistency) | **Implemented** | Uses existing design tokens (`brand-900`, `brand-200`, `text-[#64748B]`, `text-[#263449]`, `action-700`, `action-800`, `bg-[#EEF4FF]/40`, `bg-brand-100`); cards, tables, badges, buttons reuse existing primitives (`Card`, `TableWrap`, `Th`, `Td`, `Button`, `Field`, `Input`, `Select`, `Textarea`, `Modal`) | No new visual language; colors consistent with `globals.css` (`--color-brand-900`, etc.) | Confirm visual consistency with design system |
| Mobile drawer accessibility | **Implemented** | `aria-label`, `aria-expanded`, `aria-controls`, `aria-modal="true"`, `role="dialog"`; close button (`X`); backdrop click to close; keyboard focus indicators (`focus-visible`) defined in `globals.css` | Drawer uses `overflow-y-auto`; no `min-height: 0` issue; no sticky sidebar on mobile | Confirm screen-reader behavior |
| Read-only overview design | **Implemented** | Confirmed by absence of mutation actions, `GET` search form only, `serviceCreditSchema` (no balance field), `serviceCreditTransactions` schema (derived balance), audit logging design (`SERVICE_CREDIT_ADD`, `SERVICE_CREDIT_UPDATE`), `addServiceCreditTransaction()` validation (ledger-based), `computeBalance()` documentation | Overview page is read-only; transaction management separated to per-employee ledger; edit UI missing for corrections | Confirm design rationale with system owner |
| Transaction edit/correction UI | **Partially implemented (UI missing)** | `updateServiceCreditTransaction()` fully implemented (`serviceCreditSchema`, `balanceForEmployee()`, projected balance validation, audit `SERVICE_CREDIT_UPDATE`); no edit/correct control in per-employee JSX | Users cannot edit existing transactions through the interface; server action exists but is unreachable from the UI | **Add edit/correct link** per transaction row; reuse `serviceCreditSchema` and `updateServiceCreditTransaction()` |
| Transaction delete/reverse mechanism | **Not implemented** | No `deleteServiceCreditTransaction()` action; no delete/reverse JSX; no `delete` mutation in actions file; audit log has no `DELETE` entry for service credits | Only edit-in-place (`update`) supported; complete removal not possible | Implement `delete` or `reverse` mechanism if business rules require removal |
| Search scope (employee search vs global student search) | **Implemented** | `service-credits/page.tsx` uses `GET /service-credits?q=` with `LIKE` on `firstName`, `lastName`, `employeeNumber`; `app-shell.tsx` global search (`global-search`) submits to `/students` (student domain) and is visible only for roles with `students.view` | Search scopes are different and correctly isolated (`Employee Records` vs `Students`) | Confirm isolation remains intact |
| Role isolation (admin_officer vs student data) | **Implemented** | `ADMIN_OFFICER` holds no `students.*` permissions; `serviceCreditOverview()` joins only `employees` + `serviceCreditTransactions`; `scope.ts` (`studentScope()`) resolves `admin_officer` to `1 = 0` (never-true SQL); `rbac-roles.test.ts` asserts isolation | Confirmed by code inspection and role matrix (`permissions.ts`) | Confirm isolation after future role or permission changes |

---

## Section 25: Appendix F — Evidence References (Verified Code Paths)

This appendix lists the exact code paths verified during this inspection, for traceability.

### A. Page routes and authorization

- `service-credits/page.tsx`: `getCurrentUser()` → `redirect("/login")` (line 18); `hasPermission(user.role, "service_credits.view")` → `redirect("/dashboard")` (line 19); `serviceCreditOverview({ q })` (line 23); `totals` calculation (`rows.reduce()`, lines 25–31); render cards (`grid grid-cols-2 gap-3 sm:grid-cols-3`) and table (`TableWrap minWidth={800}`); search form (`GET /service-credits`, `name="q"`, `method="GET"`); link (`Open ledger` → `/employees/${r.id}/service-credits`).
- `employees/[id]/service-credits/page.tsx`: `getCurrentUser()` → redirect; `hasPermission(user.role, "service_credits.view")` → redirect; `getEmployeeById(id)` → `notFound()`; `serviceCreditSummary()`, `listServiceCreditTransactions()` (line 42); `canManage` (`service_credits.manage` + `status !== "archived"`); cards (`TrendingUp`/`TrendingDown`/`Wallet`); transaction history table (`Th` headers: `Date`, `Type`, `Credits`, `Reason`, `Reference`, `Remarks`); filter form (`GET`, `name="type"`, `defaultValue={typeFilter}`); `AddServiceCreditModal` (`employeeId`, `employeeName`, `balance` props).

### B. Query functions (`src/lib/employees.ts`)

- `serviceCreditOverview()` (line 263): `EmployeeQuery` type (`q`, `status`, `employmentType`, `appointmentStatus`, `sort`, `page`, `pageSize`); `employeeFilters()` (line 52); `LEFT JOIN` SQL; `groupBy(employees.id)`; `coalesce(sum(...))` for `earned` and `consumed`.
- `serviceCreditSummary()` (line 207): `SELECT { type, total: sum(credits) } FROM serviceCreditTransactions WHERE employeeId = ... GROUP BY type`; `byType()` helper; `computeBalance()` call.
- `listServiceCreditTransactions()` (line 231): `SELECT ... FROM serviceCreditTransactions WHERE employeeId = ... [AND type = ...] ORDER BY transactionDate DESC, createdAt DESC`.
- `computeBalance()` (line 164): `Math.round((earned - consumed) * 100) / 100`.
- `validateCreditAmount()` (line 173): `credits <= 0` → `"Credits must be greater than 0"`; `type === "consumed"` → `computeBalance(availableBalance, 0)`; `credits > balance` → `"Insufficient service credits. Available balance is ${balance.toFixed(2)}."`.
- `balanceForEmployee()` (line 423): `SELECT { type, total: sum(credits) } FROM serviceCreditTransactions WHERE employeeId = ... GROUP BY type`; computes `balance` with optional `edit` projection (`oldType`/`oldCredits` subtracted, `newCredits` added based on `newType`).

### C. Validation (`src/lib/schemas.ts`)

- `serviceCreditSchema` (line 328): `employeeId` (`z.string().min(1)`); `type` (`z.enum(["earned", "consumed"])`); `credits` (`z.coerce.number().min(0.01).max(365)`); `transactionDate` (`isoDate` regex); `reason` (`z.string().trim().min(1).max(300)`); `referenceDocument` (`optionalText(100)`); `remarks` (`optionalText(300)`).

### D. Database schema (`src/db/schema.ts`)

- `serviceCreditTransactions` (line 964): `id` (`text` PK); `employeeId` (`text` FK, `onDelete: cascade`); `type` (`text` not null); `credits` (`real` not null); `transactionDate` (`text` not null); `reason` (`text` not null); `referenceDocument` (`text`); `remarks` (`text`); `createdBy` (`text` FK not null); `updatedBy` (`text` FK); `createdAt` (`timestamp`, default `unixepoch()`); `updatedAt` (`timestamp`, default `unixepoch()`); indexes (`service_credits_employee_idx`, `service_credits_type_idx`, `service_credits_date_idx`).
- `employees` (line 853): `id` (`text` PK); `employeeNumber` (`text` not null, unique); `firstName`/`lastName` (`text` not null); `position` (`text`, nullable); `status` (`text`, default `"active"`); `createdBy`/`updatedBy` (`text` FK); timestamps.
- `auditLogs` (line 772): `id` (`text` PK); `userId` (`text` FK, `onDelete: set null`); `action` (`text` not null); `entityType` (`text` not null); `entityId` (`text`); `oldValuesJson`/`newValuesJson` (`text`); `ipAddress`/`userAgent` (`text`); `createdAt` (`timestamp`).
- Relations (`serviceCreditTransactionRelations`, line 1217): `employee` (one → `employees.id`); `creator` (one → `users.id`); no `service_credit_balances` relation (no balance table exists).

### E. Actions (`src/actions/employees.ts`)

- `addServiceCreditTransaction()` (line 453): `getAuthorizedUser("service_credits.manage")`; `serviceCreditSchema.safeParse()`; employee existence + `archived` check (`employee.status === 'archived'` → `fail()`); `balanceForEmployee()` for `consumed`; `validateCreditAmount()`; insert (`crypto.randomUUID()` as `txId`); `auditLogs` insertion (`SERVICE_CREDIT_ADD`); `revalidatePath()` (per-employee ledger + overview + dashboard).
- `updateServiceCreditTransaction()` (line 522): `getAuthorizedUser("service_credits.manage")`; `txId` fetch; `serviceCreditSchema.safeParse()`; `employeeId` match (`v.employeeId !== tx.employeeId` → `fail()`); `balanceForEmployee()` with `edit` projection; `projected < 0` → `fail()`; update row (`type`, `credits`, `transactionDate`, `reason`, `referenceDocument`, `remarks`, `updatedBy`, `updatedAt`); `auditLogs` insertion (`SERVICE_CREDIT_UPDATE` with `oldValues` and `newValues`); `revalidatePath()`.
- `balanceForEmployee()` (line 423): `SELECT { type, total: sum(credits) } FROM serviceCreditTransactions WHERE employeeId = ... GROUP BY type`; computes `balance` with optional `edit` projection (subtracts old `credits` for old `type`, adds new `credits` for new `type`).

### F. Components

- `service-credit-modal.tsx` (line 1): Client component (`"use client"`); imports `useActionState`, `useState`, `Plus`, `addServiceCreditTransaction`, `Modal`, `Button`, `Field`, `Input`, `Select`, `Textarea`, `ActionState`.
- `CreditBadges` (`employee-ui.tsx`, line 299): Displays `earned`, `consumed`, `balance` badges; `cls` checks `balance < 0` for red styling; `.toFixed(2)` formatting.
- `PageHeader` (`src/components/ui/page-header.tsx`): `eyebrow`, `title`, `description` props; `flex` layout.
- `TableWrap` (`src/components/ui/table.tsx`): `minWidth` prop; `overflow-x-auto` wrapper; `border-collapse` table.
- `Th` (`table.tsx`): `bg-[#EEF4FF]/40`; uppercase tracking; `text-[11px]`; `text-[#14295F]`.
- `Td` (`table.tsx`): `border-b` hairline (`#DCE4F0`); `text-[13px]`; `text-[#263449]`.
- `TableEmptyState` (`table.tsx`): `EmptyState` component; `colSpan` support.
- `Card` (`card.tsx`): `rounded-lg`; `border-brand-200`; `bg-white`; `shadow-xs`.
- `CardHeader` (`card.tsx`): `border-b-brand-100`; `text-sm`; `text-brand-900` title; `text-xs` description.
- `CardBody` (`card.tsx`): `px-4 py-3` (overview); `py-3.5` (per-employee cards).

---

## Section 26: Final Implementation Report (Concise)

1. **Documentation file created:** `documentation/service-credits-overview.md` (updated from `service-credits.md`; expanded with all mandatory sections: verified formulas, interface inventory, editability explanation with code evidence, data flow, permissions, transaction lifecycle, performance, edge cases, recommendations, Q&A, appendices A–E).
2. **Major source files inspected:** `service-credits/page.tsx`, `employees/[id]/service-credits/page.tsx`, `service-credit-modal.tsx`, `employee-ui.tsx`, `lib/employees.ts`, `actions/employees.ts`, `lib/schemas.ts`, `db/schema.ts`, `lib/auth.ts`, `lib/permissions.ts`, `lib/audit.ts`, `components/ui/card.tsx`, `components/ui/table.tsx`, `components/dashboard/officer.tsx`, `documentation/features/admin-officer-employee-records.md`, `documentation/features/service-credits.md`, `src/lib/__tests__/employees.test.ts`.
3. **Verified formulas:**
   - `Total Earned = SUM(credits WHERE type = 'earned')` (verified SQL in `serviceCreditOverview()`)
   - `Total Consumed = SUM(credits WHERE type = 'consumed')` (verified SQL)
   - `Total Available = computeBalance(earned, consumed) = Math.round((earned - consumed) * 100) / 100` (verified in `service-credits/page.tsx` and `computeBalance()`)
4. **Verified editability explanation:** The overview page (`service-credits/page.tsx`) is read-only by design (only `GET` search form, no mutation imports/actions). The per-employee ledger (`employees/[id]/service-credits/page.tsx`) provides `Record Transaction` (`AddServiceCreditModal`) for new entries. `updateServiceCreditTransaction()` exists server-side but has **no visible edit link** in the per-employee transaction table JSX (verified by reading `employees/[id]/service-credits/page.tsx` — no `Edit` or `Correct` control in the `<tbody>` rows). The audit trail (`SERVICE_CREDIT_ADD`, `SERVICE_CREDIT_UPDATE`) confirms mutation tracking.
5. **Important findings:**
   - No pagination on overview table (performance risk with many employees).
   - No unique DB constraint on `(employeeId, transactionDate, reason)` (duplicate entries allowed).
   - No `delete` mechanism for service credit transactions (only edit-in-place).
   - System Online indicator (`app-shell.tsx`) is static/decorative, not connected to a health endpoint.
   - Per-employee ledger edit UI (`updateServiceCreditTransaction`) is implemented server-side but not exposed in the current JSX.
   - Read access (`service_credits.view`) is not audited.
6. **Documentation accuracy:** All major claims are traceable to source files (file paths, function names, SQL fragments, JSX props, schema definitions, permission matrix). No unverified claims presented as fact; missing behaviors clearly labeled (`Not implemented`, `Partially implemented`, `Not verified`).
7. **No code or database modifications made.** This is a documentation-only task. The existing `service-credits.md` was expanded/replaced with the comprehensive `service-credits-overview.md` (created at `documentation/service-credits-overview.md`). The previous privacy-policy redesign files remain unchanged.
