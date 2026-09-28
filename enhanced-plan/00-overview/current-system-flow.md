# Current System Flow (Important User Flows)

## Login Flow
```
GET /login → LoginPage (client) renders form
  → User submits form (email, password, rememberMe checkbox)
  → `login` action (`actions/auth.ts`) → `performLogin`
    → `loginSchema.safeParse()` (email, password)
    → Rate limit check (`rateLimit(addressKey, 10, 60000)`)
    → DB lookup (`db.select().from(users).where(eq(email)).limit(1)`)
    → `verifyPassword()`
    → If valid: `createSession()` → cookie set → audit log `LOGIN`
    → If invalid: audit log `bad-credentials` / `rate-limit` / `deactivated`
    → `redirect("/dashboard")`
```

If `rememberMe` is checked (`String(raw.rememberMe ?? "").toLowerCase() === "on"` or `=== "true"`), session TTL is 7 days (`REMEMBER_ME_TTL_MS`). Otherwise 8 hours (`SESSION_TTL_MS`).

## Child Registry Flow (Create)
```
GET /children/new → NewChildPage (server) fetches barangays + schools
  → ChildForm (client) renders with defaults = {}
  → User fills form, selects `intent=draft` or `intent=submit`
  → `createChild` action (`actions/children.ts`)
    → `getAuthorizedUser("children.create")`
    → `parseChildForm()` (FormData → `withCheckbox` → `childFormSchema.safeParse()`)
    → `nextChildCode()` (sequential code generation with retry on collision)
    → DB transaction:
      - Insert `children` (with `childCode`, `recordStatus` = `draft` or `pending_validation`)
      - If `submit`: insert `childValidations` (`pending` status)
      - Insert `childAddresses` (`isCurrent: true`)
      - Insert `childEducation` (`isCurrent: true`)
      - Insert `childEccd`
      - Insert `childDisabilities` (only if `hasDisability` = true)
    → `refreshDuplicateCandidates()` (detect duplicates, create/update `childDuplicateCandidates`)
    → Audit log (`CREATE_CHILD` or `SUBMIT_VALIDATION`)
    → `revalidatePath()` for `/children`, `/validation`, `/dashboard`
    → `ok("...", redirectUrl)`
```

## Child Registry Flow (Edit)
```
GET /children/[id]/edit → EditChildPage (not fully read, implied by `edit/page.tsx` reference in `children/[id]/page.tsx`)
  → ChildForm with `mode="edit"` + `defaults`
  → `updateChild` action
    → `getAuthorizedUser("children.update")`
    → `canEditChild()` checks scope + `recordStatus !== "verified"` (unless admin)
    → DB transaction:
      - Update `children` (name, birthDate, sex, barangay, recordStatus, updatedBy)
      - Update old `childAddresses` (`isCurrent: false`), insert new
      - Update old `childEducation` (`isCurrent: false`), insert new
      - Insert new `childEccd`
      - Insert new `childDisabilities`
    → If resubmit (`needs_correction` + `submit`): insert `childValidations` (`pending`)
    → If `verified` changed: `deactivateChildTokens()` (revoke QR tokens)
    → `refreshDuplicateCandidates()`
    → Audit log (`UPDATE_CHILD`)
```

## Validation Flow
```
GET /validation → ValidationPage (server) fetches `validationQueue()` + `validationStats()`
  → User sees pending records (`recordStatus = "pending_validation"`)
  → If `canReview`: forms for Approve / Return for correction / Reject (using `reviewValidationForm` wrapper around `reviewValidation`)
  → `reviewValidation` action:
    → `getAuthorizedUser("validation.review")`
    → Check `child.recordStatus === "pending_validation"`
    → Find pending `childValidations` for this child
    → DB transaction: update validation (`status`, `reviewedBy`, `remarks`, `reviewedAt`) + update `children` (`recordStatus` mapped via `REVIEW_DECISION_TO_RECORD_STATUS`)
    → Audit log (`APPROVE_VALIDATION`, `RETURN_VALIDATION`, or `REJECT_VALIDATION`)
    → `notify()` (notification to `child.createdBy` user)
    → `revalidatePath()` for `/validation`, `/children/[id]`, `/children`, `/dashboard`
```

## Duplicate Review Flow
```
GET /duplicates → DuplicatesPage (server) fetches `listDuplicates()` + `validationStats()`
  → Status tabs (`pending`, `confirmed_duplicate`, `not_duplicate`, `dismissed`, `all`)
  → Confidence band filters (`high ≥90`, `moderate 65–89`, `review <65`)
  → Click item → selected conflict panel shows `RecordComparison` (side-by-side child data)
  → If `canReview`: buttons `Confirm duplicate` / `Not a duplicate` / `Dismiss`
  → `reviewDuplicate` action (`actions/duplicates.ts`):
    → Updates `childDuplicateCandidates` (`status`, `reviewedBy`, `reviewNotes`, `updatedAt`)
    → If `confirmed_duplicate`: determines newer record (`createdAt` comparison) and updates `children` (`recordStatus: "marked_duplicate"`)
    → Audit log (`MARK_DUPLICATE` or `DUPLICATE_NOT_DUPLICATE`/`DUPLICATE_DISMISSED`)
    → Notify both record creators (`notify()`)
```

## Monitoring Flow
```
GET /monitoring → MonitoringPage (overview cards by type)
GET /monitoring/[type] → Type-specific page (`monitoring/[type]/page.tsx` — not fully read)
GET /monitoring/interventions → Interventions list page
  → `saveMonitoring` action (create/update `childMonitoring`)
  → `updateMonitoringStatus` action (quick status change)
  → `interventions` + `interventionFollowups` tracking
```

## Report Flow
```
GET /reports → ReportsPage (list of `REPORT_TYPES` cards)
  → Click PDF/XLSX link (`/api/reports/[type]?format=pdf` or `xlsx`)
  → API route checks auth + permission (`reports.export`)
  → `buildReport()` queries DB with `childScope()` + optional `barangayId`
  → `db.insert(reports)` (metadata) + `db.insert(reportExports)` (format/fileReference)
  → `renderReportPdf()` (PDF buffer) or `renderReportExcel()` (XLSX buffer)
  → `new NextResponse()` with download headers (`Content-Disposition: attachment`)
```

## QR Verification Flow
```
Public page: /verify (enter token manually or scan QR code)
  → `GET /verify/result?token=...` (`verify/result/page.tsx` — not fully read, implied by `verify/result/page.tsx` presence)
  → Token lookup in `qrVerifications` table (`verificationToken` unique index)
  → Show minimal information (privacy-preserving display)

Admin/verified flow:
  → Child record verified (`recordStatus: "verified"`)
  → `createChild` / `updateChild` / `reopenChild` calls `deactivateChildTokens()` when status changes from verified or when resubmitted
  → `qr` action or component generates token (`qrVerifications` table with `generate` type)
```

---

This flow documentation references actual files (`actions/auth.ts`, `actions/children.ts`, `lib/auth.ts`, `lib/scope.ts`, `lib/queries.ts`, etc.) and does not invent new behavior.
