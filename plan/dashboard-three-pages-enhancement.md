# Three Dashboard Pages Enhancement Plan

**Scope:** Main Dashboard (`/dashboard`), Child Registry (`/children`), Validation (`/validation`)
**Created:** 2026-09-27
**Method:** Codebase-first audit of the actual implementation (files listed per section). Database is the source of truth; no schema changes are proposed.

---

## 1. Scope

IN SCOPE (directly required by the three pages):

- `src/app/(app)/dashboard/page.tsx`, `src/app/(app)/children/page.tsx`, `src/app/(app)/validation/page.tsx`
- Their data layer: `src/lib/queries.ts`, `src/lib/dashboard-data.ts`
- Their mutations: `src/actions/children.ts` (review/create/update/archive paths)
- Their components: `src/components/dashboard/primitives.tsx`, `src/components/registry/registry-ui.tsx`, `src/components/validation/validation-ui.tsx`, `src/components/child-form.tsx`, `src/components/ui/badge.tsx`
- Shared constants/utils used by them: `src/lib/constants.ts`, `src/lib/workflow.ts`, `src/lib/schemas.ts`
- Page-level loading/error boundaries for the three routes
- Vitest unit tests for the query/action logic they depend on

OUT OF SCOPE (must not change):

- Duplicates page internals, Monitoring, Reports, QR, Users, Settings, Notifications pages (except where a cross-page revalidation path requires `revalidatePath` of `/children` — already the case)
- Database schema (tables, columns, indexes, migrations) — **no schema change is needed**
- Theme: `brand-*` / `action-*` palette, typography scale, icons, spacing, AppShell layout
- Auth architecture (`src/lib/auth.ts`), rate limiting, session handling

---

## 2. Existing Architecture (verified)

- Next.js 16.3.5 App Router, React 19.2.8, TypeScript strict, Tailwind v4.
- All three pages are **async Server Components** reading `searchParams` (registry/validation) and fetching via lib functions from `src/lib/queries.ts` / `src/lib/dashboard-data.ts`, which use Drizzle ORM against SQLite/libSQL (`src/db/index.ts`).
- Mutations are **Server Actions** in `src/actions/children.ts` using `useActionState` (child form) or plain `<form action={serverAction}>` (validation queue).
- Auth: `getCurrentUser()` (session cookie → `users` join `roles`); `getAuthorizedUser(permission)` for actions; `requirePermission` for pages. Row-level scope via `childScope()` in `src/lib/scope.ts` (barangay users see own barangay + own created records; LGU/admin municipal-wide).
- Cache invalidation: `revalidatePath("/children" | "/validation" | "/children/:id")` after mutations. `/dashboard` has no dynamic marker; it is re-rendered on navigation since it is not statically cached (it uses `cookies()` via `getCurrentUser`, so it is dynamic).
- Tests: Vitest is in `package.json` (`npm test` → `vitest run`) but **no vitest config and zero test files exist**.

---

## 3. Existing Database Structure (from `src/db/schema.ts` — authoritative; docs are partially outdated)

Tables used by the three pages:

| Table | Key columns for these pages |
|---|---|
| `children` | `id`, `child_code` (unique), `first_name`, `middle_name`, `last_name`, `suffix`, `birth_date` (ISO text), `sex`, `barangay_id` (FK), `status` (`active\|inactive\|archived`), `record_status` (`draft\|pending_validation\|needs_correction\|verified\|marked_duplicate`), `created_by`, `updated_by`, `created_at`, `updated_at` |
| `barangays` | `id`, `name` (unique), `is_active` |
| `schools` | `id`, `name`, `school_type`, `is_active`, `barangay_id` |
| `child_addresses` | `child_id`, `household_address`, `sitio`, `is_current` |
| `child_education` | `child_id`, `school_id`, `education_status`, `grade_level`, `school_year`, `is_current` |
| `child_eccd` | `child_id`, `participation_status` |
| `child_disabilities` | `child_id`, `has_disability` (sensitive) |
| `child_validations` | `child_id`, `submitted_by`, `reviewed_by`, `status` (`pending\|approved\|needs_correction\|rejected`), `remarks`, `submitted_at`, `reviewed_at` |
| `child_duplicate_candidates` | `child_id`, `possible_child_id`, `match_score`, `status` (`pending\|confirmed_duplicate\|not_duplicate\|dismissed`) |
| `child_monitoring` | `child_id`, `monitoring_type`, `status` (`open\|in_progress\|…`) |
| `interventions` | `child_id`, `status` (`planned\|ongoing\|…`) |
| `audit_logs` | `user_id`, `action`, `entity_type`, `entity_id`, `created_at` |
| `notifications` | `user_id`, `type`, `title`, `message`, `link`, `is_read` |

Canonical status vocabularies (single source: `src/lib/constants.ts`):

- `RecordStatus = draft | pending_validation | needs_correction | verified | marked_duplicate` — the **only** legal values for `children.record_status`.
- `ValidationStatus = pending | approved | needs_correction | rejected` — legal only in `child_validations.status`.
- `workflow.ts` maps record→validation states; `RECORD_STATUS_TRANSITIONS` allows `pending_validation → verified | needs_correction | marked_duplicate`. **`rejected` is NOT a legal `record_status`.**

The existing docs in `documentation/database/SCHEMA.md` describe an older `children` shape (guardian columns, `validation_status`, etc.). The code is authoritative; docs are not trusted in this plan.

---

## 4. Current Data Flow (traced)

### 4.1 Main Dashboard
```
dashboardData(user)  (src/lib/dashboard-data.ts)
 ├─ dashboardStats(user)        → children (+EXISTS subqueries into education/eccd/disabilities/interventions), scoped by childScope()
 ├─ byBarangayRows              → children ⋈ barangays, GROUP BY barangay
 ├─ eduRows                     → child_education (is_current=1) ⋈ children
 ├─ recordRows                  → children GROUP BY record_status (excl. marked_duplicate)
 ├─ duplicateRows               → child_duplicate_candidates (status='pending', NOT scoped)
 ├─ activityRows                → audit_logs LEFT JOIN users, limit 8
 ├─ monitoringByBarangayRows    → children ⋈ barangays + EXISTS(child_education)
 ├─ monitoringTypeRows          → child_monitoring ⋈ children (open/in_progress)
 ├─ activeRow / openMonitoring  → counts
 ↓
components/dashboard/primitives.tsx  → KpiGrid, BarangayDistribution, RecordStatusCard,
                                       EducationDistribution, ValidationQueueCard, RecentActivity…
```

### 4.2 Child Registry
```
listChildren(user, query)  (src/lib/queries.ts)
 ├─ WHERE: childScope + recordStatus != 'marked_duplicate' + q/barangay/status/sex/education/school/ageMin/ageMax
 ├─ COUNT(*) for total (separate query), ORDER BY (name|recent|oldest), LIMIT/OFFSET
 └─ JOIN barangays, child_addresses(current), child_education(current), schools
registryStats(user) → 7 scoped counts + rate   → RegistryKpiGrid
listBarangays/listSchools → filters
cohort chips → listChildren() re-invoked 4× (page:1, pageSize:1) to read `.total`
 ↓
registry-ui.tsx (server component) → table, chips, pagination (GET forms/links)
```

### 4.3 Validation
```
validationQueue(user) → children WHERE record_status='pending_validation' (scoped), JOIN latest pending child_validations, ORDER submitted_at ASC, LIMIT 100
validationStats(user) → scoped counts + unscoped duplicate bands
Filtering: queue filtered in JS by `q` (name/code/barangay) after fetch
Actions: reviewValidationForm → reviewValidation(): revalidates status, writes child_validations + children.record_status, audit, notify creator
 ↓ revalidatePath('/validation'), revalidatePath('/children/:id')
```

### 4.4 Cross-page consistency mechanism (existing)
`reviewValidation` → updates DB → `revalidatePath('/validation')` + `revalidatePath('/children/{id}')`.
Gaps found: `/children` list page is NOT revalidated after review (only the detail page), and `/dashboard` is never revalidated after validation mutations.

---

## 5. Main Dashboard Audit

| Item | Finding |
|---|---|
| KPI cards (8) | All DB-driven via `dashboardStats`. ✓ |
| KPI "Total Children" progress bar | Shows verified/total %, described as "Registered records" — mildly misleading but consistent. Keep. |
| `OperationalBanner` "Registered children" | `data.system.totalRecords` = stats.total (active, non-duplicate). ✓ |
| `byBarangay` chart | `GROUP BY barangay`, scoped. Counts **all** non-duplicate statuses (incl. drafts) — same basis as stats.total? No: stats.total also excludes archived; the chart includes archived rows. **Inconsistency (C1).** |
| `EducationDistribution` | scoped + `is_current=1`. ✓ consistent with registry stats. |
| `RecordStatusCard` | Excludes `marked_duplicate` only; includes archived rows. Basis differs from KPI total. (C1) |
| `ValidationQueueCard` | verified/pending/needsCorrection/duplicateFlags. ✓ |
| `RecentActivity` | audit_logs, unscoped (intentional, operational log). Labels map covers all 25 actions actually written by actions (verified by grep). ✓ |
| `SystemStatusCard` | `databaseOnline: true` hard-coded (defensible: page can't render otherwise). Counts scoped. OK. |
| Monitoring cards | Behind `monitoring.view` permission; correct scoping. |
| Notifications preview | Per-user; ✓. |
| Loading state | None — page has no `loading.tsx`; the (app) layout has none either. |
| Error state | Global `error.tsx` exists (checked); route-level error not present. |
| Stale data | After validation actions, `/dashboard` not revalidated; acceptable for RSC navigation but cheap to add. |

### Bugs found (Dashboard)

- **D1 (consistency):** `byBarangay`, `recordStatus`, `monitoringByBarangay` include `status='archived'`/`inactive` rows while KPI "total" excludes them. Chart totals ≠ KPI total for the same user. Fix: add `status='active'` to those scope conditions (matching `dashboardStats.total`).
- **D2 (correctness):** `dashboardData` uses `scopedCount(scope, …)` helper where `scope` may be `undefined` (LGU/admin) — handled with `scope ?? sql\`1=1\``. Not a bug, but fragile; unify with `countWith` from queries.ts.
- **D3 (dead code):** `dashboardCharts()` in queries.ts is unused. Remove (it also duplicates EDU/RECORD label maps that exist in constants.ts).

## 6. Child Registry Audit

| Item | Finding |
|---|---|
| Search `q` | Matches `first_name`, `last_name`, `child_code` via LIKE. **Does not search middle name or sitio/household — acceptable; documented.** Case-insensitivity: SQLite LIKE is ASCII case-insensitive ✓. |
| **R1 (bug): School filter** | `RegistryFilters` renders the School `<select>` with **hard-coded `value=""`** — the chosen school is never pre-selected after applying (state lost in UI), though the query param IS applied server-side. Fix: bind `value={values.school}` and include `school` in `filterValues` (currently missing → also breaks the ActiveFilterChips display for school? No — chips get school separately; but the hidden cohort input preserves cohort only). |
| **R2 (bug): cohort chips vs filters** | Cohort links set `ageMin/ageMax` but drop `school`, `education`, `sex`, `pageSize` (keeps q/barangay/status). Partially inconsistent; also **drops `page`? Yes (good — resets page)**. Fix: carry all current params except `page`; set ageMin/ageMax. |
| **R3 (bug): pageSize change resets filters?** | Pagination pageSize form preserves all params except page/pageSize ✓ good. But `parseInt(str("pageSize"),10) || 10` accepts arbitrary values like 7 → `listChildren` falls back to 10 only if not in allowed list ✓ safe. |
| **R4 (bug): `q` reset on filter apply?** | The filter form does not include the search input on submit? It does — the search field is inside the same form ✓. But **the cohort `<input type="hidden" name="cohort">` sends `cohort=""` even when a cohort is active via ageMin/ageMax params — applying filters while a cohort is active silently drops it** (cohort chips work by URL, not by form field). Minor UX inconsistency; fix by syncing `cohort` from ageMin/ageMax server-side. |
| **R5 (perf): cohort counts** | 4 extra `listChildren()` calls (each = COUNT + SELECT with joins) per page render → 8 wasted queries. Fix: dedicated lightweight `cohortCounts()` count-only query (4 COUNT(*) queries, no joins). |
| **R6 (empty state)** | Table empty state shows "Try adjusting your search or filters" even when the DB has zero records. Differentiate. |
| **R7 (KPI vs table basis)** | KPI stats are `status='active'`-only; the table shows archived/inactive rows too (when no `active` filter). Totals can disagree with the "Showing X of Y" line. Fix: default list to `active` records (matching KPI), keep an explicit "Archived" option via `active` param — the query layer already supports `q.active`; the page simply never passes it. |
| **R8 (sorting)** | Server-side sort exists (`name|recent|oldest`); **no sort UI is exposed** (table headers are not clickable). Add safe header sort links (only the 3 supported keys). |
| **R9 (status filter missing `marked_duplicate`)** | Intentional (registry hides duplicates) ✓ documented. |
| **R10 (Create/Edit/Archive UI)** | Create link gated by `children.create` ✓; Edit gated by `children.update` + `canEditChild` on the edit page ✓; **Archive action exists server-side (`archiveChild`) but is never surfaced in UI** — admins/LGU cannot archive from the registry. Add a gated archive button with confirm on the child detail page (server-enforced anyway). |
| **R11 (form validation)** | Client + server share `childFormSchema` ✓; server re-checks scope + permissions ✓. Duplicate child-code handled by retry ✓. |
| **R12 (loading)** | No `loading.tsx` for the route; table has no skeleton. Add route-level loading using existing `TableSkeleton`. |
| **R13 (Edit link for un-editable records)** | Table shows Edit for any record when `canEdit` — verified records are locked by `canEditChild` server-side and the edit page redirects, but the UI still offers a dead link. Gate the Edit icon per-row by editable statuses (`draft`, `needs_correction`). |

## 7. Validation Page Audit

| Item | Finding |
|---|---|
| **V1 (CRITICAL bug): Reject writes an illegal status** | `reviewValidation()` maps `decision:"rejected"` → `nextRecordStatus = "rejected"` — **not a member of `RecordStatus`** (legal: draft/pending_validation/needs_correction/verified/marked_duplicate). The DB row then holds an out-of-vocabulary status that no query, badge, or dashboard count recognizes (it silently vanishes from every stat and shows a raw badge). Per the project's own workflow (`workflow.ts`: `pending_validation → marked_duplicate`), a hard reject of a queued record must mark the record `marked_duplicate` (or, better per DepEd flow, `needs_correction` with remarks) — and `child_validations.status='rejected'` preserves the reviewer's intent in history. Fix mapping: approved→`verified`, needs_correction→`needs_correction`, rejected→`marked_duplicate`. |
| **V2 (IDOR-ish scope gap in queue actions)** | `reviewValidation` checks `canAccessChild` ✓ server-side. OK. But the **queue list itself** renders Approve/Return/Reject forms with auto-generated remarks; a stray double-click can double-submit (two server actions run; second fails gracefully with "not in the validation queue" ✓ — non-destructive but noisy). Fix: `useActionState`-based client submit buttons with pending-disable would change architecture; instead keep server forms and make the action idempotent (it already is — the status guard rejects re-entry). Add `aria-busy` + disable-via-CSS is not possible server-only; document. Acceptable: server guard is the real protection. |
| **V3 (hidden-remarks UX)** | Approve/Return/Reject submit canned remarks; reviewer cannot type remarks from the queue. The detail page has no review UI either. Fix: add a review form on the child profile page (visible to `validation.review` holders for pending records) with a remarks textarea + three decisions; keep queue quick-actions. |
| **V4 (queue cap)** | `validationQueue` LIMIT 100 with no pagination/count notice. Show total pending count from stats next to the list ("showing first 100 of N"). |
| **V5 (JS-side search)** | Queue search filters the fetched 100 rows in JS. Fine for ≤100 items (documented), but pagination resets: form GET has no page param ✓ single-page. OK. |
| **V6 (stats inconsistency)** | `validationStats.totalActive` counts all active regardless of record_status ✓ fine. Bands query is unscoped (duplicate candidates are global) — matches the Duplicates page ✓ documented. |
| **V7 (bad statuses in history)** | Child profile validation history renders `h.status.replace(...)` raw — fine for the 4 legal validation statuses ✓. |
| **V8 (scope of queue for barangay users)** | Barangay users can view `/validation` (permission `validation.view`) and see their own pending records but get no action buttons (canReview=false) ✓ correct. |
| **V9 (loading)** | No route `loading.tsx`. Add one. |
| **V10 (empty state)** | Already differentiates no-records vs no-search-results ✓ keep. |

## 8. Cross-Page Data Relationships (documented)

```
children.barangay_id ─→ barangays.name            → registry column, dashboard byBarangay, queue row
children.record_status                             → badges, filters, dashboard RecordStatus/ValidationQueue, validation queue membership
child_education (is_current) ─→ schools.name       → registry school column/filter, dashboard education chart + enrollment coverage
child_validations (status='pending')               → queue submitter/submitted_at; history on profile
child_duplicate_candidates (status='pending')      → dashboard Duplicate Flags, validation stats bands
audit_logs.action/entity_type                      → dashboard Recent Activity
notifications.user_id                              → dashboard preview, shell badge
```

Status lifecycle (authoritative — `workflow.ts`):
```
draft → pending_validation → verified
                   ↓              ↓ (admin re-open → pending_validation)
          needs_correction ──────→ pending_validation (resubmit)
                   ↓
          marked_duplicate (terminal; from duplicate review or reject)
```

## 9. Feature Gaps (summary)

1. No review-with-remarks UI (V3).
2. No archive UI (R10).
3. No sort UI (R8).
4. No route-level loading/error states for the three pages (R12, V9, D-loading).
5. No per-row edit gating (R13).
6. Cohort counts computed wastefully (R5).
7. `/children` + `/dashboard` not revalidated after validation decisions (§4.4).

## 10. Logic Problems
- **L1 = V1** illegal record_status on reject (data-integrity).
- **L2 = R1** school select never reflects applied filter.
- **L3 = R4/R2** cohort age-range vs `cohort` param drift.
- **L4 = D1** chart/stat basis mismatch (active vs all statuses).

## 11. Data Consistency Problems
- **C1 = D1.**
- **C2:** After reject (today), the child disappears from every count (illegal status). Fixed by L1; records already in this broken state need a one-off data repair — **requires approval**, see §31.
- **C3:** Registry KPI says "Total Records" (active) while the table can list archived rows (R7).

## 12. UI/UX Problems
- Missing loading skeletons on three data-heavy pages.
- Empty state conflation (R6).
- Dead Edit links on locked records (R13).
- No feedback that the queue is capped at 100 (V4).
- Filter chips don't reflect the school filter binding issue (R1).

## 13. Proposed Improvements (numbered, referenced by implementation)
1. **F1** Fix reject mapping (L1) + audit action naming.
2. **F2** Revalidate `/children` and `/dashboard` in `reviewValidation`, `reopenChild`, `archiveChild`, and `reviewDuplicate` (last one already does `/children`; add dashboard).
3. **F3** Registry: bind school select (R1), pass `school`+`active` through, default `active=active` (R7), cohort param sync (R4/R2), safe sort links (R8), per-row edit gating (R13), better empty state (R6).
4. **F4** `cohortCounts()` count-only helper (R5).
5. **F5** Review form with remarks on child profile (V3) using existing `reviewValidation` (useActionState) — new small client component `ValidationReviewForm`.
6. **F6** Archive button on profile for `children.delete` holders with confirm dialog (R10) using existing `archiveChild`.
7. **F7** Queue count notice (V4) + dashboard active-basis fix (D1).
8. **F8** `loading.tsx` (using existing `TableSkeleton`/`Skeleton`) + `error.tsx` for the `(app)` group (covers all three pages; generic, design-preserving).
9. **F9** Remove dead `dashboardCharts()` (D3).
10. **F10** Vitest setup + unit tests for: reject mapping (workflow/review logic), child filters builder, cohort counts, queue ordering, stats consistency (§41).

## 14–16. Implementation Notes Per Page

### Main Dashboard (F2, F7, F9)
- `dashboard-data.ts`: add `eq(children.status, 'active')` to byBarangay/recordStatus/monitoringByBarangay queries; keep `RecordStatusCard` order; delete `dashboardCharts` from queries.ts (unused).
- `children.ts` actions: add `revalidatePath("/dashboard")`.
- No visual changes to primitives; numbers only become consistent.

### Child Registry (F3, F4, F6, F8)
- `children/page.tsx`: parse `school`, `active` (default `"active"`); pass into `listChildren`; pass `school` into `filterValues` and the select; map ageMin/ageMax→cohort for the hidden input & chips; pass `canEditChild`-style per-row flag (`recordStatus` editable check in the component using `isEditable` from workflow.ts).
- `registry-ui.tsx`: bind school value; add sortable headers (Name→`sort=name`, Registered→`sort=recent`/`oldest`) preserving other params; add `Rows per page` unchanged; empty-state text switches on `hasFilters` prop; Edit link only when `isEditable(recordStatus)`.
- `queries.ts`: add `cohortCounts(user)` returning `{"", "0-4", "5-11", "12-15", "16-17"} → n` via four `COUNT(*)` queries scoped + active + non-duplicate.
- Profile page (`children/[id]/page.tsx`): archive button (form → `archiveChild` server action via small client wrapper with `confirm()`), visible when `children.delete` and `status==='active'`; review form (F5) when record is pending and user holds `validation.review`.

### Validation (F1, F5, F7, F8)
- `children.ts` `reviewValidation`: map decision→`verified|needs_correction|marked_duplicate`; keep `child_validations.status = decision` (history preserves "rejected"); keep audit actions `APPROVE_VALIDATION | REJECT_VALIDATION | RETURN_VALIDATION`; notify message unchanged.
- `validation/page.tsx`: header shows "Showing first 100 of {stats.pendingReview}" when queue length hits the cap; quick-action forms unchanged.
- New `src/components/validation/review-form.tsx` (client): remarks textarea + decision select + submit with `useActionState(reviewValidation)` + pending disable; used on the profile page.

## 17. Cross-Page Synchronization (target state)
```
reviewValidation (approve/return/reject)
  → DB: child_validations + children.record_status
  → revalidatePath: /validation, /children/{id}, /children, /dashboard
  → Registry badge & filters update; Dashboard KPI/queue/record-status update; Queue shrinks
archiveChild / reopenChild / createChild / updateChild: same set (already mostly present; add /dashboard + /children where missing)
```

## 18. Database Query Strategy
- All list endpoints remain server-side paginated/filtered (no client-side datasets).
- Counts via `COUNT(*)` only; no `SELECT *` additions; keep EXISTS subqueries.
- `cohortCounts` replaces 4 full `listChildren` calls (8 queries → 4 light counts).
- No new indexes required (existing: children record_status, status, barangay, created; validations status/submitted).

## 19. Validation Rules
- Server: `validationReviewSchema` (existing) + record-status guard (existing) + scope check (existing) + NEW decision→status mapping via `workflow.ts` constant `REVIEW_DECISION_TO_RECORD_STATUS` so UI, action, and tests share one map.
- Client: remarks max 500 (same schema), decision restricted to the 3 enum values in the form.

## 20. Error Handling
- Route `error.tsx` in `(app)`: generic message + "Try again" (reset()), design-consistent, no internals (rule 29/17).
- Actions already return safe messages; keep.

## 21. Loading States
- `(app)/loading.tsx` with `TableSkeleton`-style pulse using existing classes; page-specific `loading.tsx` for `/children`, `/dashboard`, `/validation` (small, consistent).

## 22. Empty States
- Registry: "no records exist" vs "no search results" (uses `hasFilters`).
- Validation: existing differentiated states kept.
- Dashboard panels: existing per-panel empty texts kept.

## 23. Permission / Authorization
- Server-side enforcement unchanged (`getAuthorizedUser`, `canAccessChild`, `canEditChild`).
- New UI affordances (archive button, review form) are gated by the same permissions the actions already enforce — UI is cosmetic per architecture.
- Registry default `active` filter does not weaken scope (scope SQL still applied first).

## 24. Performance
- Cohort counts (F4) — net −4 queries/page.
- No new client JS except the small review form and confirm-archive wrapper.
- Debounced search: not needed (GET-form pattern is the app's convention).

## 25. Security
- Reject-mapping fix removes the data-integrity hole (V1).
- No new inputs beyond remarks (schema-validated, length-capped, rendered as text — no XSS surface; React escapes).
- IDOR: reviewed — queue actions check scope server-side ✓; profile pages fetch by id and render to anyone authenticated — **finding (documented, out of scope):** `/children/[id]` does not call `canAccessChild`; a barangay user could fetch another barangay's child id directly. This is a real pre-existing gap but the fix belongs to the profile/detail module; we will apply the minimal guard on the detail page + edit page only if approved (edit page already guards). **Decision: add `canAccessChild` redirect on the profile page — it is directly required by the Registry page's View action (this is in-scope as the registry's read path).**

## 26. Responsive Behavior
- No layout changes; existing grids (`grid-cols-2 md:grid-cols-3 xl:…`, `overflow-x-auto` tables) preserved. Loading/empty states inherit the same containers.

## 27. Testing Strategy (F10)
- Add `vitest.config.ts` (node environment, path alias `@`).
- `src/lib/__tests__/workflow.test.ts` — transition/decision mapping incl. reject→marked_duplicate.
- `src/lib/__tests__/queries-filters.test.ts` — `childFilters` SQL builder: scope always applied, marked_duplicate excluded, school/education EXISTS, age bounds, sort whitelist (pure-function tests; db not required).
- `src/lib/__tests__/dashboard-consistency.test.ts` — dashboardData basis: active-only (imports mocked db) or, lighter: extract the status-condition into a shared `activeNonDuplicate` SQL fragment and test the fragment builder.
- `src/actions/__tests__/review-mapping.test.ts` — decision→status mapping (pure map test).
- Manual flow test (§47) via seeded dev DB.

## 28. Acceptance Criteria
- [ ] Rejecting a queued record leaves `children.record_status` within `RECORD_STATUSES` (marked_duplicate) and the record appears consistently in registry/dashboard counts.
- [ ] Every dashboard chart total equals the dashboard KPI total for the same scope.
- [ ] Registry school filter round-trips (applied value stays selected).
- [ ] Cohort chips preserve other filters; applying filters preserves an active cohort.
- [ ] Registry defaults to active records; archived records visible only via explicit filter.
- [ ] Sorting works for name/recent/oldest with no unsafe SQL (whitelisted keys only).
- [ ] Edit link hidden for non-editable records; server still enforces.
- [ ] Archive available from profile for authorized roles with confirmation.
- [ ] Reviewers can approve/return/reject with typed remarks from the profile page.
- [ ] After any validation decision, registry and dashboard reflect the change without a full reload workaround.
- [ ] Loading and error states exist for all three pages.
- [ ] Empty registry distinguishes "no data" from "no results".
- [ ] Queue shows total-pending when capped at 100.
- [ ] No fake data anywhere; all numbers trace to SQL in this plan.
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` pass.
- [ ] No schema changes; no unrelated pages modified; theme intact.

## 29. Files Expected to Change
- `src/actions/children.ts` (F1, F2)
- `src/lib/workflow.ts` (F1 map), `src/lib/queries.ts` (F3 active filter support already exists; F4 cohortCounts; F9 remove dead fn), `src/lib/dashboard-data.ts` (F7)
- `src/app/(app)/children/page.tsx`, `src/app/(app)/validation/page.tsx`, `src/app/(app)/dashboard/page.tsx` (minor)
- `src/app/(app)/children/[id]/page.tsx` (F5, F6, §25 read guard)
- `src/components/registry/registry-ui.tsx` (F3), `src/components/validation/review-form.tsx` (new), `src/components/child-archive-button.tsx` (new, tiny)
- `src/app/(app)/loading.tsx` (new), `src/app/(app)/error.tsx` (new)
- Tests (new): `src/lib/__tests__/*.test.ts`, `src/actions/__tests__/*.test.ts`, `vitest.config.ts`

## 30. Files That Must NOT Change
- `src/db/schema.ts`, `drizzle/*` (no schema/migrations)
- `src/lib/auth.ts`, `src/lib/scope.ts`, `src/lib/permissions.ts`, `src/proxy.ts`
- `src/components/app-shell.tsx`, `src/components/ui/*` (except none needed)
- Monitoring/Reports/QR/Users/Settings/Notifications/Duplicates pages
- Theme files (`globals.css`), Tailwind setup
- `scripts/seed.mts`

## 31. Risks and Constraints
- **Existing bad rows:** any `children` rows already written with `record_status='rejected'` (produced by the old bug) will not be visible anywhere. Repair requires a one-off SQL update (`rejected → marked_duplicate`) — **explicit approval required**; not executed by default. Provide the statement in the final report.
- Registry defaulting to `active` changes what some users currently see (archived rows hidden until filtered) — matches KPI basis and the "archive hides from active lists" business rule (archiveChild's own message).
- Reject→`marked_duplicate` changes reviewer semantics slightly (record hidden from registry as a duplicate). Alternative (needs_correction) would contradict "reject". Chosen mapping follows `workflow.ts` transitions exactly.

## 32. Implementation Order
1. F1 (workflow map + action fix) — foundation.
2. F9, F7 (dashboard data basis, dead code).
3. F4, F3 (registry query layer, then UI).
4. F5, F6 (profile review + archive UI), §25 read guard.
5. F2 (revalidation set).
6. F8 (loading/error).
7. F10 (tests) + full verification.

## 33. Final Verification Checklist
- [ ] `npx tsc --noEmit` clean
- [ ] `npm run lint` clean (no new warnings)
- [ ] `npm test` green
- [ ] `npm run build` succeeds
- [ ] Manual: create (draft) → submit → queue → approve → registry badge verified → dashboard verified+1
- [ ] Manual: reject path → record becomes marked_duplicate, excluded from registry (not invisible-with-unknown-status), dashboard counts consistent
- [ ] Manual: return-for-correction → encoder can edit → resubmit → re-queued
- [ ] Manual: barangay user cannot see other barangay's child via direct URL
- [ ] Manual: school filter round-trip; cohort + filters combined; pagination reset on filter change
- [ ] `git diff` review: only files in §29 changed
