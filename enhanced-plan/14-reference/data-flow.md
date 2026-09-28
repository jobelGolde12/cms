# Data Flow — Important Entities

This document describes how the key entities in this CMS move through the system (frontend → backend → validation → database → response → frontend). It is based on actual code inspection (`actions/*.ts`, `lib/queries.ts`, `components/*.tsx`).

---

## Child (Central Entity)

### Creation (`/children/new` → `createChild`)
1. **UI:** `ChildForm` (`client`) collects data (Basic Info, Address, Education, ECCD, Disability checkbox).
2. **Client:** `useActionState(createChild, initial)` binds form action.
3. **Server Action (`actions/children.ts`):**
   - `getAuthorizedUser("children.create")` (auth check)
   - `parseChildForm()` (FormData → `withCheckbox` for `hasDisability` → `childFormSchema.safeParse()`)
   - `nextChildCode()` (sequential code generation with retry)
   - DB transaction (`db.transaction`):
     - `tx.insert(children)` (new record, `recordStatus` = `draft` or `pending_validation` based on `intent`)
     - `tx.insert(childValidations)` (only if `submit` — `pending` status)
     - `tx.insert(childAddresses)` (`isCurrent: true`)
     - `tx.insert(childEducation)` (`isCurrent: true`)
     - `tx.insert(childEccd)`
     - `tx.insert(childDisabilities)` (only if `hasDisability` = true)
   - `refreshDuplicateCandidates()` (detect duplicates, insert/update `childDuplicateCandidates`)
   - `logAudit()` (`CREATE_CHILD` or `SUBMIT_VALIDATION`)
   - `revalidatePath()` (`/children`, `/validation`, `/dashboard`)
4. **Response:** `ok("Record saved.", redirectUrl)` or `fail(...)` — displayed by `ChildForm` via `state.ok` and `state.error`.

### Edit (`/children/[id]/edit` → `updateChild`)
1. **UI:** `ChildForm` (`mode="edit"`) with `defaults` fetched by page (`getChildProfile` + related queries — implied by `ChildFormDefaults` type).
2. **Client:** `useActionState(updateChild, initial)`.
3. **Server Action:**
   - `getAuthorizedUser("children.update")` + `canEditChild()` (scope + `verified` lock)
   - `parseChildForm()` (same as create)
   - DB transaction:
     - Update `children` (fields + `updatedBy`, `updatedAt`)
     - Update old `childAddresses` (`isCurrent: false`), insert new current address
     - Update old `childEducation` (`isCurrent: false`), insert new current education
     - Insert new `childEccd`
     - Insert new `childDisabilities`
     - If `isResubmit`: insert `childValidations` (`pending`)
   - `deactivateChildTokens()` (if resubmit or `verified` changed — QR tokens revoked)
   - `refreshDuplicateCandidates()`
   - `logAudit()` (`UPDATE_CHILD`)
4. **Response:** `ok("Record updated.", redirectUrl)` or `fail(...)`.

### Archive (`archiveChild` via `ArchiveChildButton`)
1. **UI:** `archive-child-button.tsx` renders a form with hidden `childId`.
2. **Server Action:**
   - `getAuthorizedUser("children.delete")` + `canAccessChild()`
   - DB transaction: `tx.update(children).set({ status: "archived", updatedBy, updatedAt })`
   - `deactivateChildTokens()`
   - `logAudit()` (`ARCHIVE_CHILD`)
   - `revalidatePath()`
3. **Response:** `ok("Record archived.")` — button is conditionally rendered (`canArchive` checks `children.delete` permission + `status === "active"`).

---

## Validation (History Table `child_validations`)

### Submit (`createChild` with `intent=submit` or `updateChild` with `intent=submit` when `needs_correction`)
- `tx.insert(childValidations)` creates new row (`submittedBy`, `status: "pending"`, `remarks`, `submittedAt`).
- `children.recordStatus` updated to `pending_validation` (new) or `pending_validation` (resubmit from `needs_correction`).

### Review (`reviewValidation`)
- `getAuthorizedUser("validation.review")`
- Find `pending_validation` child + `pending` validation row (`and(eq(childValidations.childId, childId), eq(childValidations.status, "pending"))`)
- DB transaction:
  - Update `childValidations` (`status`, `reviewedBy`, `remarks`, `reviewedAt`, `updatedAt`)
  - Update `children` (`recordStatus` mapped by `REVIEW_DECISION_TO_RECORD_STATUS` from `lib/workflow.ts`)
- `notify()` sends notification to `child.createdBy`.
- `logAudit()` (`APPROVE_VALIDATION`, `RETURN_VALIDATION`, or `REJECT_VALIDATION`).

---

## Monitoring & Interventions

### Create / Update (`saveMonitoring`)
- `getAuthorizedUser("monitoring.update")`
- `monitoringFormSchema.safeParse()`
- `tx.update(childMonitoring)` (existing `id`) or `tx.insert(childMonitoring)` (new `id`)
- `observedAt` set to `new Date(`${observedAt}T00:00:00Z")` (UTC conversion from date input)
- `logAudit()` (`CREATE_MONITORING` or `UPDATE_MONITORING`)

### Status Update (`updateMonitoringStatus`)
- Quick action (`formData.get("status")`) — updates `childMonitoring.status` and `updatedAt`.
- `logAudit()` (`UPDATE_MONITORING`)

---

## Duplicate Candidates (`child_duplicate_candidates`)

### Detection (`refreshDuplicateCandidates` called by `createChild` / `updateChild`)
- `detectDuplicates()` queries `children` with `OR` filter (`lastName`, `firstName`, `birthDate`, `barangayId`).
- For each match (`excludeChildId` = current child), calculates score and reasons (`normalizeName`, `sameName`, `sameMiddle`, `birthDate`, `barangay`).
- Strong match rules (`(sameName && (birth_date || barangay))` or `(!sameName && birth_date && barangay)`) + at least 2 reasons.
- Updates existing `pending` / `not_duplicate` rows: dismisses stale ones (`status: "dismissed"`), updates `not_duplicate` back to `pending` if new match found, inserts new pairs (`pending`, `matchScore`, `matchReason` JSON).

### Human Review (`reviewDuplicate`)
- Updates `childDuplicateCandidates` (`status`, `reviewedBy`, `reviewNotes`, `updatedAt`).
- If `confirmed_duplicate`: determines newer record (`createdAt` comparison), updates `children.recordStatus` (`marked_duplicate`).
- `notify()` both record creators.
- `logAudit()` (`MARK_DUPLICATE`, `DUPLICATE_NOT_DUPLICATE`, `DUPLICATE_DISMISSED`).

---

## Notifications (`notifications`)

### Creation (`notify` in `lib/audit.ts`)
- `db.insert(notifications)` (`userId`, `type`, `title`, `message`, `link`, `isRead: false`).
- Best-effort: failures caught and logged (`console.error`), never thrown.

### Read (`notifications/page.tsx`)
- Fetches `recentNotifications()` (limit 30) — displays title, message, link, `isRead`, `createdAt`.
- `unread` filter counts unread.
- `markAllNotificationsRead` action updates all unread for user to `isRead: true`.

---

## Audit Trail (`audit_logs`)

### Logging (`logAudit` in `lib/audit.ts`)
- `db.insert(auditLogs)` (`id`, `userId`, `action`, `entityType`, `entityId`, `oldValuesJson`, `newValuesJson`, `ipAddress`, `userAgent`, `createdAt`).
- `oldValuesJson` / `newValuesJson` serialized only when provided; never include `passwordHash`.
- Append-only: no edit or delete paths for audit rows.

---

This data-flow documentation is derived from actual file inspection (`actions/*.ts`, `lib/queries.ts`, `lib/auth.ts`, `lib/audit.ts`, `components/*.tsx`). No behavior was invented.
