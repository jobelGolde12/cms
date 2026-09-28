# Final Verification Checklist (Post-Implementation)

This checklist must be completed before any future implementation is considered finished. It verifies that all planned work has been implemented correctly and that existing functionality is preserved.

---

## Development & Build
- [ ] `npm run dev` starts development server (`NODE_OPTIONS` from `package.json` applied)
- [ ] `npm run build` completes (`turbopack`, `webpack` watch ignores `local.db` and other excluded files)
- [ ] `npm run start` runs production server successfully
- [ ] `npm run lint` passes (ESLint with `eslint-config-next`)
- [ ] `npm run test` passes (all existing + new tests)
- [ ] `npx tsc --noEmit` passes (`ignoreBuildErrors: false` in `next.config.ts`)

## Database & Data Integrity
- [ ] Database connectivity works (`local.db` or `TURSO_DATABASE_URL`)
- [ ] Schema matches `src/db/schema.ts` (no missing columns or relationships)
- [ ] `db:push` creates expected tables and indexes (if schema changed)
- [ ] `db:migrate` applies cleanly (if migrations generated)
- [ ] `seed` script produces deterministic reference data and fictional demo children (no real data)

## Authentication & Authorization
- [ ] `getCurrentUser()` returns user when cookie present and session not expired; returns `null` when missing/expired/inactive
- [ ] `/login` redirects unauthenticated users to `/login` (tested via browser without cookie)
- [ ] `/dashboard` and all `(app)` pages redirect unauthenticated users to `/login`
- [ ] `getAuthorizedUser("permission.name")` returns `null` for unauthorized actions (tested via direct server action call)
- [ ] `childScope()` filters correctly for `admin`/`lgu` (all records) and `barangay` (own barangay + created records)
- [ ] `canAccessChild()` returns `true` for records within scope; `false` otherwise (test with different user roles)
- [ ] `canEditChild()` prevents non-admin from editing `verified` records
- [ ] Rate limit (`lib/rate-limit.ts`) applies correctly (`login` action rate-limited; other actions not rate-limited unless added)
- [ ] Session cookie flags (`httpOnly`, `sameSite: "lax"`, `secure` when `NODE_ENV=production`) verified in browser dev tools or server response

## Core User Flows
- [ ] Login (`email` + `password`) succeeds with valid credentials; fails with invalid; displays `fail("Invalid email or password.")`
- [ ] Registration (`registerUser`) creates user; fails on duplicate email; validates `agreed` checkbox; validates `password === confirmPassword`
- [ ] Child Registry (`/children`) — list displays, filters work (`q`, `barangay`, `status`, `sex`, `education`, `school`, `ageMin`, `ageMax`, `sort`, `page`, `pageSize`), pagination works (`next`/`prev` links), add button (`/children/new`) visible for `children.create`
- [ ] Child Profile (`/children/[id]`) — displays all sections (Basic Info, Address, Education, ECCD, Disability restricted with `EyeOff` icon), validation history, QR events, record meta (created/updated by, dates)
- [ ] Child Edit (`/children/[id]/edit`) — updates fields; supersedes address/education; inserts new `childEccd` and `childDisabilities`; validates form; prevents editing verified records (non-admin)
- [ ] Child Create (`/children/new`) — creates record; generates `childCode` (`CM-YYYY-000001` format); inserts all related records (`childAddresses`, `childEducation`, `childEccd`, `childDisabilities` if `hasDisability`); creates `pending_validation` validation if `submit`
- [ ] Child Archive (`archiveChild`) — updates `children.status` to `"archived"` (soft delete); revokes QR tokens; audit log created; hidden from active registry list (filter excludes `archived` by default — `active` filter defaults to `"active"`)
- [ ] Validation Queue (`/validation`) — lists `pending_validation` records with submitter info; `approval` updates `recordStatus` to `verified`; `needs_correction` updates `recordStatus` to `needs_correction`; `rejected` updates `recordStatus` to `marked_duplicate` (wait — audit confirms `REVIEW_DECISION_TO_RECORD_STATUS` maps `rejected` to `marked_duplicate`? Actually `rejected` maps to `marked_duplicate` per `workflow.ts` reference in `actions/children.ts`; confirm this is correct — yes, the code uses `REVIEW_DECISION_TO_RECORD_STATUS` which maps `rejected` to `marked_duplicate`)
- [ ] Validation Review (`reviewValidation`) — validates `pending_validation` status; updates `childValidations` history; updates `children.recordStatus`; sends notification; creates audit log
- [ ] Duplicate Review (`/duplicates`) — lists pending candidates; confidence chips (`high`, `moderate`, `review`) display correctly; resolution forms update candidate status; `confirmed_duplicate` updates newer record to `marked_duplicate`
- [ ] Monitoring (`/monitoring`) — overview cards display counts; `monitoring/interventions` page lists interventions; monitoring forms create/update records; status updates work
- [ ] Reports (`/reports`) — report cards show all `REPORT_TYPES`; PDF and XLSX links generate downloads (`/api/reports/[type]`); download headers correct (`Content-Type`, `Content-Disposition`)
- [ ] Notifications (`/notifications`) — unread count correct; list displays; `Mark all read` updates `isRead` for all unread
- [ ] Activity Logs (`/activity-logs`) — recent audit entries displayed (`action`, `entityType`, `actor`, `createdAt`)
- [ ] QR Verification (`/verify`) — public form accepts token; `verify/result` displays minimal information (privacy-preserving)
- [ ] User Management (`/users`) — table lists users with roles, barangays, status, last login; `users.create` creates accounts; `users.update` updates profiles; `users.disable` deactivates (with last-admin guard via `countOtherActiveAdmins`)
- [ ] Settings (`/settings`) — profile update works; password change validates current password; system settings editable by `settings.manage`

## Error Handling
- [ ] Missing child ID (`/children/[id]` with invalid UUID) redirects to `/children` (confirmed by `if (!child) redirect("/children")` in profile page)
- [ ] Missing record (`updateChild`, `archiveChild`, `reviewValidation`, `reopenChild`) returns `fail("Record not found.")`
- [ ] Unauthorized access (`getAuthorizedUser()` returns `null`) returns `fail("You do not have permission...")` — action-level error displayed in form
- [ ] Scope violation (`canAccessChild()` false) returns `fail("This record is outside your scope.")`
- [ ] Invalid form data (`safeParse` fails) returns `fail("Please fix the highlighted fields.", zodFieldErrors(...))` — errors linked to fields
- [ ] Database errors caught and logged (e.g., `console.error("[createChild] insert failed", error)`); user sees `fail("Could not create the record. Please try again.")`
- [ ] Empty states (`EmptyState` component) display correctly for empty lists (validation queue, duplicate conflicts, notifications, registry with no results)
- [ ] Not-found (`not-found.tsx`) and error (`error.tsx`) pages function correctly

## Responsive & Accessibility
- [ ] Mobile sidebar (`mobile-nav-toggle.tsx`) toggles visible; header (`app-shell.tsx`) remains sticky (`sticky top-0 z-30`)
- [ ] Desktop sidebar (`aside`) visible (`hidden lg:flex`); main content (`lg:pl-60`) avoids overlap
- [ ] Registry table (`ChildRegistryTable`) scrolls horizontally on small screens (`overflow-x-auto` container)
- [ ] Form sections (`ChildForm`) stack vertically on mobile (`grid-cols-1 sm:grid-cols-2`)
- [ ] Focus ring (`outline: 3px solid var(--color-action-600)`) visible on all interactive elements (`a`, `button`, `input`, `select`, `textarea`, `[tabindex]`)
- [ ] `prefers-reduced-motion` media query (`globals.css` lines 50–59) disables animations and transitions
- [ ] `sr-only` labels present for hidden inputs (`global-search`, `queue-search`)
- [ ] All buttons have `aria-label` where icon-only (`Bell`, `Search`, `Plus`, `ArrowLeft`, `Archive`)
- [ ] `aria-current={"page"}` applied to active sidebar links
- [ ] Numeric data uses `.numeric` class (`font-family: var(--font-mono)`)

## Security & Data Integrity
- [ ] Session cookie (`cms_session`) present after login; deleted after logout (`destroySession()` deletes DB row + clears cookie)
- [ ] No secrets in source (`grep -r "API_KEY\|PASSWORD\|SECRET" src/ --exclude-dir=node_modules` — only `.env` file references, no hardcoded secrets)
- [ ] Audit logs created for all sensitive actions (`LOGIN`, `LOGOUT`, `CREATE_CHILD`, `UPDATE_CHILD`, `ARCHIVE_CHILD`, `APPROVE_VALIDATION`, `REJECT_VALIDATION`, `RETURN_VALIDATION`, `REOPEN_VALIDATION`, `MARK_DUPLICATE`, `CONFIRM_DUPLICATE`, `CREATE_USER`, `UPDATE_USER`, `DISABLE_USER`, `CHANGE_PASSWORD`, `UPDATE_PROFILE`)
- [ ] Notification messages do not contain sensitive child details (only `Record ${code}` and decision results)
- [ ] `archiveChild` updates `status` (soft delete) — does not delete DB rows; historical records preserved
- [ ] `deactivateChildTokens()` revokes QR tokens when data changes (`updateChild` when `verified` changed or resubmit; `archiveChild`)
- [ ] `childAddresses.isCurrent` and `childEducation.isCurrent` correctly maintained (old records marked false, new records inserted)
- [ ] `system_settings` keys unique (`system_settings_key_uq` index); updates only through `updateSystemSettingForm` (if implemented in future)
- [ ] Database transactions complete (`db.transaction` in `createChild`, `updateChild`, `reviewValidation`, `archiveChild`, `reopenChild`); no partial updates possible (transaction rolls back on error)

## UI / Theme Preservation
- [ ] Theme colors (`brand-*`, `action-*`, `status-*`) preserved (compare to `globals.css` tokens)
- [ ] Typography (`Fira_Sans`, `Fira_Code`) preserved
- [ ] Branding (`Child Mapping System — Sta. Magdalena`, `Sta. Magdalena, Sorsogon`, `Region V — Bicol`) preserved
- [ ] Layout (`max-w-7xl`, `space-y-5`, `rounded-xl border-brand-200 bg-white shadow-xs`) preserved
- [ ] Navigation grouping (Core Modules, Operations & Tools, System) preserved
- [ ] Logo/icon treatment (`UsersRound` in sidebar, navy background) preserved
- [ ] Focus ring (`outline: 3px solid var(--color-action-600)`) preserved
- [ ] Reduced-motion preference preserved
- [ ] Component styling (`Panel` header, `KpiGrid`, `RecordStatusCard`, `ValidationQueueCard`) preserved
- [ ] Footer and header design preserved

---

This checklist must be completed for every future implementation phase. Check items only when the work is actually complete and verified.
