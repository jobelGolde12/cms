# Dashboard Chart — Interactivity, Modernization & Animation Plan

**Project:** Child Mapping System (`child-mapping-system`)  
**Scope:** Dashboard distribution visualizations on `/dashboard`  
**Created:** 2026-10-06  
**Status:** Planning only — **no implementation yet**  
**Method:** Full codebase audit of the cloned repository (`https://github.com/jobelGolde12/cms.git`)

---

## 1. Executive Summary

The dashboard does **not** currently use a chart library for its main distribution visuals. Although `recharts` (^3.10.1) and `framer-motion` (^13.4.5) are listed in `package.json`, **neither is imported anywhere under `src/`**.

Dashboard “charts” are **custom CSS horizontal / stacked bar visualizations** implemented as Server Components inside:

- `src/components/dashboard/primitives.tsx`

Primary chart-like surfaces:

| Component | Role | Current form |
|-----------|------|--------------|
| `BarangayDistribution` | Children by barangay (main chart) | CSS horizontal bars, top 8 |
| `EducationDistribution` | Education status | Stacked bar + legend list |
| `MonitoringCasework` | Open monitoring cases by type | CSS horizontal bars |
| `KpiGrid` progress bars | KPI share indicators | Thin progress tracks |
| `MonitoringBarangayTable` coverage bars | Per-row coverage | Mini CSS bars in table |

**Goal of this plan:** Progressively enhance these visualizations so they become more interactive, modern, polished, informative, responsive, accessible, and smoothly animated — **without** changing the existing design identity, theme tokens (`brand-*` / `action-*`), layout structure, branding, or data/business logic.

**Preferred technical direction (from audit):**

1. Keep CSS-first bar visualizations (they match the civic, compact UI).
2. Introduce **small client islands** only where interaction/animation is required.
3. Prefer **CSS transitions + existing `prefers-reduced-motion` rules** over heavy animation libraries for bar growth.
4. Optionally use **framer-motion** (already installed) for controlled entrance / highlight if CSS proves insufficient — **do not add new packages**.
5. **Do not adopt Recharts** for these distributions unless a future requirement needs axes, dual series, or zoom; current data shapes are single-series rankings and categorical distributions that CSS handles well and keep the Server Component model simple.

All implementation checkboxes start as `- [ ]` and must remain unchecked until implementation is completed and verified.

---

## 2. Codebase Findings

### 2.1 Stack (verified from `package.json` and source)

- **Framework:** Next.js `16.3.5` (App Router), React `19.2.8`, TypeScript
- **Styling:** Tailwind CSS v4 (`@theme` tokens in `src/app/globals.css`)
- **ORM / DB:** Drizzle ORM + `@libsql/client` (SQLite/libSQL)
- **Icons:** `lucide-react`
- **Animation dependency present but unused in dashboard charts:** `framer-motion`
- **Chart dependency present but unused in entire `src/`:** `recharts`
- **Forms / validation:** `react-hook-form`, `zod` (not chart-related)
- **Tests:** Vitest

### 2.2 Project documentation conventions

Existing plan location: **`plan/`**

Examples already present:

- `plan/README.md`
- `plan/dashboard-three-pages-enhancement.md`
- `plan/auth-plan.md`
- `plan/responsiveness.md`
- etc.

This plan belongs at:

```text
plan/dashboard-chart-interactivity-plan.md
```

### 2.3 Design system (must be preserved)

From `src/app/globals.css` `@theme`:

| Token family | Role |
|--------------|------|
| `brand-50` … `brand-950` | Civic navy / slate ramp (backgrounds, text, borders) |
| `action-50` … `action-800` | Governmental blue (links, primary emphasis, focus) |
| `status-*` | Verified / pending / error / info (paired with labels/icons) |

Other established patterns:

- Cards: `rounded-lg border border-brand-200 bg-white shadow-xs`
- Panel header: `border-b border-brand-100 px-4 py-3`, title `text-sm font-semibold text-brand-900`
- Body text: `text-xs` / `text-sm` on `text-brand-500`–`900`
- Numeric values: `.numeric` class (mono ramp)
- Focus: global `:focus-visible` 3px `action-600` outline
- Reduced motion: global CSS already forces near-zero animation/transition duration under `prefers-reduced-motion: reduce`
- Shimmer skeleton: `@keyframes shimmer` + `DashboardPageSkeleton` in `src/components/loading/skeletons.tsx`
- Page fade: `PageTransition` client wrapper in `src/components/loading/page-transition.tsx`

### 2.4 Routing & ownership

| Path | File | Role |
|------|------|------|
| `/dashboard` | `src/app/(app)/dashboard/page.tsx` | Server page; fetches data; composes primitives |
| Loading UI | `src/app/(app)/dashboard/loading.tsx` | Renders `DashboardPageSkeleton` |
| App shell | `src/app/(app)/layout.tsx` → `src/components/app-shell.tsx` | Auth + chrome |

Chart-owning UI file:

```text
src/components/dashboard/primitives.tsx
```

Data layer:

```text
src/lib/dashboard-data.ts
```

Supporting:

- `src/lib/queries.ts` (`dashboardStats`, etc.)
- `src/lib/scope.ts` (`childScope`)
- `src/lib/constants.ts` (labels)
- `src/lib/auth.ts` / `src/lib/permissions.ts`
- `src/components/ui/states.tsx` (`EmptyState`)
- `src/components/loading/skeletons.tsx`
- `src/app/globals.css`

---

## 3. Current Chart Architecture

### 3.1 Rendering model

- **Server-rendered** React Server Components.
- No `"use client"` in `primitives.tsx`.
- No chart configuration object; styles are Tailwind + inline `style={{ width: ... }}`.
- No shared chart config module.
- No client state for filters/date ranges on the dashboard chart itself (cycle year is display-only text).

### 3.2 Component map (chart-relevant)

```text
AppDashboardPage (server)
  ├─ KpiGrid                    → progress tracks (optional)
  ├─ BarangayDistribution       → PRIMARY horizontal bars
  ├─ MonitoringBarangayTable    → mini coverage bars
  ├─ MonitoringCasework         → horizontal bars
  ├─ EducationDistribution      → stacked bar + list
  └─ RecordStatusCard           → list + dots (not a bar chart)
```

`Panel` is the shared card shell used by all of the above.

### 3.3 Interaction today

| Capability | Present? |
|------------|----------|
| Hover on bars | No (native `title` only on education segments) |
| Custom tooltip | No |
| Click / drill-down | Partial — panel header links only |
| Legend toggle | No |
| Series highlight | No |
| Keyboard focus on data points | No |
| Animated bar entrance | No (static width on paint) |
| Update animation | N/A (full page server render) |
| Touch-specific behavior | No |
| Reduced-motion specific chart logic | Inherited global CSS only |

---

## 4. Chart Data Flow (traced)

```text
SQLite / libSQL (Drizzle)
      ↓
src/lib/dashboard-data.ts → dashboardData(user)
      ├─ dashboardStats(user)          [src/lib/queries.ts]
      ├─ byBarangayRows                children ⋈ barangays, GROUP BY
      ├─ eduRows                       child_education (is_current) ⋈ children
      ├─ recordRows                    children GROUP BY record_status
      ├─ monitoringByBarangayRows      children ⋈ barangays + education EXISTS
      ├─ monitoringTypeRows            child_monitoring (open/in_progress)
      └─ activity / validation counts
      ↓
src/app/(app)/dashboard/page.tsx
      ↓
props into primitives (BarangayRow[], DistributionRow[], …)
      ↓
CSS bar widths = value / max or value / total
      ↓
Static HTML (no client chart state)
```

### 4.1 Answers to required trace questions

1. **Origin:** Database tables `children`, `barangays`, `child_education`, `child_monitoring`, `audit_logs`, `child_duplicate_candidates`, etc.
2. **Endpoints:** No HTTP chart API — server function `dashboardData(user)` only.
3. **Retrieve:** `dashboardData` in `src/lib/dashboard-data.ts` (+ `dashboardStats` in `src/lib/queries.ts`).
4. **Transform:** Label maps + ordered full category sets in `dashboard-data.ts` (education/record status always show full label set).
5. **Receives data:** `AppDashboardPage` → child components in `primitives.tsx`.
6. **Renders chart:** `BarangayDistribution`, `EducationDistribution`, `MonitoringCasework`, etc.
7. **Library:** None in use (CSS). `recharts` installed unused.
8. **Options:** Inline Tailwind + computed `%` width.
9. **State:** None on the client for charts.
10. **Filters:** Scoped by `childScope(user)` server-side; no UI chart filters.
11. **SSR vs CSR:** Server-rendered HTML.
12. **Dynamic updates:** Only on full navigation / revalidation, not live.
13. **Unnecessary renders:** Not applicable (RSC); client islands must be scoped carefully if added.
14. **Performance problems:** Not observed for current data sizes (top 8 barangays, small category sets).
15. **Animations:** Page-level `PageTransition` only; bars do not animate.
16. **Accessibility:** Panel titles, some `role="img"` / `aria-label` on education stacked bar; list items lack per-bar accessible names; no keyboard operable data points.

### 4.2 Data types (do not change without cause)

```ts
// src/lib/dashboard-data.ts
BarangayRow = { name: string; value: number }
DistributionRow = { label: string; value: number }
MonitoringBarangayRow = { barangay; registered; enrolled; outOfSchool }
```

**Constraint:** Chart enhancements must consume these shapes as-is.

---

## 5. Current Behavior (detail)

### 5.1 `BarangayDistribution`

- Sorts implicitly by query order; shows **top 8**, footer link for remainder.
- Bar width = `value / max * 100`.
- Empty: centered “No records yet.”
- No percentage labels, no hover detail, no animation, no focusable rows.

### 5.2 `EducationDistribution`

- Stacked full-width bar of non-zero segments + list with count and %.
- Segment `title` attribute only.
- Colors from `EDU_BAR` map keyed by display label.

### 5.3 `MonitoringCasework`

- Same pattern as barangay bars; amber fill; empty state message.

### 5.4 KPI / table mini-bars

- Static width; decorative `role="presentation"` on KPI tracks.

---

## 6. Problems Identified

| Area | Issue |
|------|--------|
| Visual polish | Bars appear instantly; no entrance feedback; thin tracks can feel sparse on large monitors |
| Information | Hover gives no structured tooltip (count, %, rank, share of total) |
| Interaction | Rows are not interactive; users cannot emphasize a barangay/category |
| Mobile | Long barangay names truncate; no touch affordance beyond scrolling |
| Accessibility | Data encoded mainly in visual width; limited text alternatives per bar |
| Consistency | Native `title` tooltips look browser-default, not brand UI |
| Animation | No purposeful motion communicating “data loaded” or value magnitude |
| Empty/error | Empty text is plain; does not reuse `EmptyState` from `src/components/ui/states.tsx` |
| Library debt | `recharts` dependency unused — either use later for true charts or leave as optional; **do not force adoption** for this plan |

---

## 7. Recommended Improvements (scoped)

Only improvements that fit this municipal dashboard and existing CSS charts:

### Include

1. **Accessible, branded tooltips** on distribution bars (count, percentage, optional rank).
2. **Hover / focus emphasis** on the active row (background wash + bar brightness) using existing brand colors.
3. **CSS width entrance animation** on first paint (with `prefers-reduced-motion` respect).
4. **Percentage + total context** on barangay rows where space allows (desktop).
5. **Keyboard focusable rows** (`tabIndex={0}` or real buttons/links where drill-down makes sense).
6. **Touch-friendly hit targets** (≥ 44px row height on small screens where interactive).
7. **Reuse `EmptyState`** for empty datasets.
8. **Screen-reader summary** (visually hidden or `aria-describedby`) stating totals and top categories.
9. **Optional client island** for tooltip positioning only — keep data fetch on the server.
10. **Subtle staggered entrance** for list rows (CSS or light framer-motion), capped and interruptible.

### Explicitly exclude (for this plan)

- Replacing the dashboard layout or KPI grid structure
- New color palette / glassmorphism / heavy shadows
- Date-range picker or time-series charts (no time-series data in current dashboard chart queries)
- Drill-down modal charts
- Live websocket updates
- Virtualization (dataset is tiny)
- New npm dependencies
- Mandatory migration of these bars to Recharts
- Changing `dashboardData` calculations or permission scoping

---

## 8. File / Folder Impact Analysis

### Modify

| File | Why |
|------|-----|
| `src/components/dashboard/primitives.tsx` | Primary chart UI: bars, empty states, a11y attributes; may import small client subcomponents |
| `src/app/globals.css` | Optional keyframes for bar-grow if not using Tailwind animate utilities; must respect reduced-motion (already global) |
| `src/components/loading/skeletons.tsx` | Align skeleton bar shapes with any new bar height/spacing if changed |
| `src/app/(app)/dashboard/page.tsx` | Only if passing additional presentational props (e.g. totals already available) — **prefer computing inside primitives** |

### Create (only if needed)

| File | Why |
|------|-----|
| `src/components/dashboard/distribution-bar.tsx` | **Client** component island: animated bar track + tooltip + focus/hover. Keeps `primitives.tsx` mostly server-friendly. |
| `src/components/dashboard/chart-tooltip.tsx` | Optional shared branded tooltip UI if reused by multiple distributions |

Paths must live under `src/components/dashboard/` to match existing organization.

### Do not create

- New theme files
- New chart config packages
- API routes for chart data
- Parallel dashboard page

### Do not remove

- Existing `Panel`, KPI, activity, validation cards
- `recharts` from `package.json` in this plan (out of scope cleanup; optional later dependency audit)

### Reuse (do not reinvent)

| Existing | Reuse for |
|----------|-----------|
| `Panel` | Card chrome |
| `PanelLink` | Header actions |
| `EmptyState` (`src/components/ui/states.tsx`) | Empty datasets |
| `cn` (`src/lib/utils.ts`) | Class composition |
| `DashIcon` / lucide | Icons only if needed for empty states |
| Global focus ring | Keyboard focus |
| Global reduced-motion | Animation disable |
| `DashboardPageSkeleton` | Loading parity |
| `PageTransition` | Page-level fade (already exists) |
| Brand / action / status tokens | All colors |
| `BarangayRow` / `DistributionRow` types | Props contracts |

---

## 9. Implementation Phases (checkbox overview)

### Phase 0 — Pre-implementation verification

- [ ] Re-read `src/components/dashboard/primitives.tsx` end-to-end
- [ ] Re-read `src/lib/dashboard-data.ts` type exports and `dashboardData` return shape
- [ ] Confirm `recharts` still unused before deciding against it
- [ ] Confirm `framer-motion` still unused in dashboard (optional utility only)
- [ ] Confirm empty-state and skeleton patterns

### Phase 1 — Architecture & client boundary

- [ ] Decide client island boundary (`distribution-bar.tsx` vs inline)
- [ ] Keep `dashboardData` and page data flow unchanged
- [ ] Document props contract for animated bar row

### Phase 2 — Visual & informational polish (server-safe first)

- [ ] Improve barangay row information hierarchy (value + % where useful)
- [ ] Align education/monitoring bar tracks for consistent height/radius
- [ ] Switch empty messages to `EmptyState` where appropriate
- [ ] Add visually hidden chart summaries for screen readers

### Phase 3 — Interactivity

- [ ] Branded tooltip on hover/focus
- [ ] Row highlight on hover/focus
- [ ] Keyboard focus order for interactive rows
- [ ] Touch target sizing
- [ ] Optional click → existing registry filtered link (only if query params already supported; do not invent filters)

### Phase 4 — Animation

- [ ] Bar width entrance (CSS transform/width with reduced-motion fallback)
- [ ] Optional short stagger on list items
- [ ] Tooltip fade consistent with existing transitions
- [ ] Verify global `prefers-reduced-motion` still wins

### Phase 5 — Responsive

- [ ] Desktop tooltip placement (no overflow)
- [ ] Tablet touch + hover coexistence
- [ ] Mobile: readable labels, no horizontal page overflow, stacked meta if needed

### Phase 6 — Accessibility

- [ ] Per-row accessible names
- [ ] Focus visible states (use global ring; do not remove)
- [ ] Color-independent values (always show numbers)
- [ ] Reduced motion verification

### Phase 7 — Testing & acceptance

- [ ] Functional, visual, responsive, a11y, performance, regression checks
- [ ] Update this plan checkboxes only after verification

---

## 10. Detailed Tasks

### [ ] Task 0.1 — Baseline audit confirmation

**Objective:** Lock the implementation target before coding.  
**Files:**  
- `src/components/dashboard/primitives.tsx`  
- `src/lib/dashboard-data.ts`  
- `src/app/(app)/dashboard/page.tsx`  
- `package.json`  

**Current behavior:** CSS bars, RSC, unused recharts.  
**Required change:** None to code; confirm findings still true at implementation start.  
**Constraints:** No edits in this task.  
**Acceptance criteria:** Implementer can quote current bar components and data types.  
**Verification:** Open files; `rg recharts src` returns no matches.  
**Status:** - [ ] Not completed

---

### [ ] Task 1.1 — Introduce client distribution bar island (if interaction requires it)

**Objective:** Enable hover/focus/tooltip/animation without converting the entire dashboard to a client component.  

**Files:**  
- **Create:** `src/components/dashboard/distribution-bar.tsx` (`"use client"`)  
- **Modify:** `src/components/dashboard/primitives.tsx` (compose the island inside list rows)

**Current behavior:** Entire primitives file is server-compatible; bars are plain `div`s.  

**Required change:** Extract a presentational client component that receives pure props:

```ts
{
  label: string
  value: number
  max: number
  total?: number
  rank?: number
  barClassName: string // e.g. bg-action-600
  href?: string        // optional drill-down
}
```

**Implementation approach:**

1. Server components still map over `rows` and pass serializable props.
2. Client island owns: hover state, focus state, tooltip visibility, CSS animation class on mount.
3. Do **not** fetch data in the client island.

**Dependencies:** `cn` from `@/lib/utils`; existing Tailwind tokens.  
**Constraints:**  
- Do not change `dashboardData`.  
- Do not wrap the whole page in `"use client"`.  
- Do not introduce Recharts here.

**Acceptance criteria:**  
- Dashboard page remains a Server Component.  
- Bars still reflect the same numeric widths.  
- No hydration errors.

**Verification:** Load `/dashboard`; view source / React tree; confirm server page + client bar nodes.  
**Status:** - [ ] Not completed

---

### [ ] Task 1.2 — Shared branded tooltip (optional extract)

**Objective:** Replace native `title` tooltips with UI matching `Panel` / brand language.  

**Files:**  
- **Create (optional):** `src/components/dashboard/chart-tooltip.tsx`  
- **Or** colocate tooltip markup inside `distribution-bar.tsx`

**Current behavior:** Browser default `title` on education segments only.  

**Required change:** Absolute-positioned tooltip: label, value, percentage, optional rank; `text-xs`; `bg-brand-900 text-white` or `bg-white border border-brand-200 shadow-xs` — pick the style that already appears in dense UI (prefer white card for light dashboard consistency).  

**Implementation approach:**  
- Show on pointer enter / focus; hide on leave / blur.  
- Clamp position to avoid viewport overflow (simple CSS or getBoundingClientRect).  
- `role="tooltip"` + `id` referenced by `aria-describedby` on the trigger.

**Constraints:** No new dependency (no floating-ui unless already present — it is not). Keep positioning simple.  

**Acceptance criteria:** Tooltip matches brand; readable on mobile (tap/focus); does not clip awkwardly off-screen on desktop.  

**Verification:** Hover and keyboard focus each bar type.  
**Status:** - [ ] Not completed

---

### [ ] Task 2.1 — BarangayDistribution informational upgrade

**Objective:** Make the primary chart communicate share and magnitude without clutter.  

**Files:**  
- `src/components/dashboard/primitives.tsx` (`BarangayDistribution`)  
- Possibly `src/components/dashboard/distribution-bar.tsx`

**Current behavior:** Name + bar + integer value; top 8; footer for hidden count.  

**Required change:**  
- Compute `total` from all `rows` (not only visible) for percentage context.  
- Show `%` next to value on `sm+` breakpoints.  
- Keep truncation + `title` on long names.  
- Preserve “+ N more barangays” footer and registry link.

**Implementation approach:** Pure presentational math in the component; no query changes.  

**Constraints:** Do not change which barangays are returned by SQL; do not add client-side sorting that contradicts server order unless documented.  

**Acceptance criteria:** Percentages match `value / total`; empty state still works; layout does not overflow.  

**Verification:** Fixture with known totals; narrow and wide viewports.  
**Status:** - [ ] Not completed

---

### [ ] Task 2.2 — EducationDistribution tooltip + segment clarity

**Objective:** Stacked bar segments become inspectable and keyboard-friendly where practical.  

**Files:**  
- `src/components/dashboard/primitives.tsx` (`EducationDistribution`)

**Current behavior:** Stacked bar with `title`; list below with counts/%.  

**Required change:**  
- Enhance segment accessibility (`aria-label` per segment with count and %).  
- Prefer list rows as the interactive surface on mobile (larger targets); segments can remain visual with richer labels.  
- Optional: highlight list row when corresponding segment is hovered (requires client island or CSS-only if structure allows).

**Constraints:** Keep `EDU_BAR` color map keys aligned with `EDUCATION_STATUS_LABELS` display strings. Do not drop zero categories from the list (canonical order is intentional).  

**Acceptance criteria:** Screen reader can announce each category value; visual colors unchanged in meaning.  

**Verification:** VoiceOver/NVDA or accessibility tree inspection; visual compare.  
**Status:** - [ ] Not completed

---

### [ ] Task 2.3 — MonitoringCasework parity

**Objective:** Same interaction/animation language as barangay bars.  

**Files:**  
- `src/components/dashboard/primitives.tsx` (`MonitoringCasework`)  
- Shared bar island if created

**Current behavior:** Amber bars, label, value.  

**Required change:** Reuse the same distribution bar primitive for consistency (hover, focus, tooltip, animation).  

**Constraints:** Permission gating stays in `page.tsx` (`canMonitor`); do not show casework to unauthorized roles.  

**Acceptance criteria:** Visual language matches barangay chart; data unchanged.  

**Verification:** Login as role with/without `monitoring.view`.  
**Status:** - [ ] Not completed

---

### [ ] Task 2.4 — Empty states reuse

**Objective:** Consistent empty UI.  

**Files:**  
- `src/components/dashboard/primitives.tsx`  
- Reuse `src/components/ui/states.tsx` → `EmptyState`

**Current behavior:** Plain centered `<p>` messages.  

**Required change:** Use `EmptyState` with short title/description; optional lucide icon at low emphasis (`text-brand-300`).  

**Constraints:** Do not add primary marketing CTAs that fight existing `PanelLink` actions.  

**Acceptance criteria:** Empty dashboard sections look consistent with registry empty tables.  

**Verification:** Empty database or scoped user with zero children.  
**Status:** - [ ] Not completed

---

### [ ] Task 2.5 — Screen-reader chart summary

**Objective:** Non-visual users get the distribution story.  

**Files:**  
- `src/components/dashboard/primitives.tsx`

**Current behavior:** Education stacked bar has a single `aria-label`; barangay list is only individual truncations.  

**Required change:** Add a visually hidden summary, e.g. “8 barangays shown of 12. Highest: X with N children (P%).”  

**Implementation approach:** `<p className="sr-only">` or existing clip pattern if the project has one; if no `sr-only` utility, use Tailwind `sr-only` (available in Tailwind) or equivalent.  

**Acceptance criteria:** Summary present in accessibility tree; not visible.  

**Verification:** Accessibility tree / screen reader.  
**Status:** - [ ] Not completed

---

### [ ] Task 3.1 — Hover and focus emphasis

**Objective:** Active row feedback.  

**Files:**  
- Client bar island and/or `primitives.tsx`

**Current behavior:** No highlight.  

**Required change:** On hover/focus-within: subtle `bg-brand-50` row background; bar opacity or brightness slight increase; do not shift layout.  

**Constraints:** Use brand tokens only; no new colors.  

**Acceptance criteria:** Highlight visible but restrained; focus ring remains visible for keyboard users.  

**Verification:** Mouse and keyboard.  
**Status:** - [ ] Not completed

---

### [ ] Task 3.2 — Keyboard interaction

**Objective:** Operable without a pointer.  

**Files:**  
- Client bar island

**Current behavior:** Rows not in tab order.  

**Required change:** Interactive rows focusable; Enter/Space activates link if `href` provided; tooltip via `aria-describedby` on focus.  

**Constraints:** Do not trap focus; do not override global focus styles.  

**Acceptance criteria:** Tab reaches rows; screen reader announces name, value, percent.  

**Verification:** Keyboard-only pass.  
**Status:** - [ ] Not completed

---

### [ ] Task 3.3 — Touch targets

**Objective:** Mobile usability.  

**Files:**  
- `primitives.tsx` / distribution bar

**Current behavior:** Compact `space-y-2.5` rows (~small height).  

**Required change:** Increase interactive row min-height on small screens (e.g. `min-h-11` when interactive) without making desktop sparse.  

**Acceptance criteria:** Rows easy to tap; no accidental horizontal scroll on `320px` width.  

**Verification:** Mobile viewport emulation.  
**Status:** - [ ] Not completed

---

### [ ] Task 4.1 — Bar entrance animation

**Objective:** Communicate load completion with subtle motion.  

**Files:**  
- `src/app/globals.css` (optional `@keyframes bar-grow`)  
- Client island or CSS class on bar fill

**Current behavior:** Instant width.  

**Required change:** Animate width or `scaleX` from 0→1 on mount, ~300–500ms, ease-out. Honor reduced motion (width final state immediately).  

**Implementation approach:** Prefer `transform: scaleX` with `transform-origin: left` for better performance than animating `width`. Initial class without animation if `prefers-reduced-motion: reduce` (global CSS already crushes durations — still set final state correctly).  

**Constraints:** No infinite animations; no bounce that feels playful vs civic product.  

**Acceptance criteria:** Visible on first paint of data; disabled/meaningless under reduced motion; no layout thrash.  

**Verification:** Hard reload; OS reduced-motion setting.  
**Status:** - [ ] Not completed

---

### [ ] Task 4.2 — Optional list stagger

**Objective:** Light sequential appearance for up to 8 rows.  

**Files:**  
- Client island or CSS `animation-delay` per index

**Required change:** Stagger ≤ 40ms per row; total delay cap ~300ms.  

**Constraints:** Optional; skip if it fights reduced-motion or feels slow on low-end devices.  

**Acceptance criteria:** Not distracting; total time still feels snappy.  

**Verification:** Visual review.  
**Status:** - [ ] Not completed

---

### [ ] Task 4.3 — Tooltip transition

**Objective:** Soft appearance consistent with `PageTransition` durations (~200–300ms).  

**Files:** Tooltip component / island  

**Acceptance criteria:** Opacity/translate transition; instant under reduced motion.  

**Status:** - [ ] Not completed

---

### [ ] Task 5.1 — Responsive layout pass

**Objective:** Desktop / tablet / mobile all usable.  

**Files:** Chart components under `src/components/dashboard/`

**Required change:**  
- Desktop: full tooltip, % labels  
- Tablet: touch + hover  
- Mobile: prioritize list readability; avoid hover-only information (tooltip also on focus/tap)

**Acceptance criteria:** No horizontal overflow of page; bars remain proportional; labels truncate with full name in tooltip/`title`.  

**Verification:** 320, 375, 768, 1024, 1440 widths.  

**Status:** - [ ] Not completed

---

### [ ] Task 6.1 — Accessibility completion checklist

**Objective:** Meet the a11y bar for non-canvas CSS charts.  

**Files:** Chart components  

**Required change:** Complete labels, focus, summaries, contrast (existing tokens already high-contrast).  

**Acceptance criteria:** Values understandable without color; keyboard path works; reduced motion works.  

**Status:** - [ ] Not completed

---

### [ ] Task 7.1 — Skeleton alignment

**Objective:** Loading placeholder matches final bar geometry.  

**Files:**  
- `src/components/loading/skeletons.tsx` (`DashboardPageSkeleton`)

**Required change:** If bar row height/spacing changes, update skeleton rows to match.  

**Constraints:** Keep shimmer tokens (`brand-200/40` etc.).  

**Acceptance criteria:** Minimal layout shift from skeleton → content.  

**Status:** - [ ] Not completed

---

### [ ] Task 7.2 — Regression guard on data layer

**Objective:** Ensure no accidental business logic drift.  

**Files:**  
- `src/lib/dashboard-data.ts` (read-only unless bug found)  
- `src/app/(app)/dashboard/page.tsx`

**Required change:** None expected. If a display-only total is needed, compute in UI from existing arrays.  

**Acceptance criteria:** SQL, scopes, permissions unchanged.  

**Verification:** Diff excludes `dashboard-data.ts` query logic; manual role checks.  

**Status:** - [ ] Not completed

---

## 11. Interaction Specification

| Input | Behavior |
|-------|----------|
| Pointer hover on row | Highlight row; show tooltip (label, value, %) |
| Pointer leave | Hide tooltip; remove highlight |
| Focus (keyboard) | Same as hover; visible focus ring |
| Blur | Hide tooltip |
| Tap (touch) | Show tooltip or navigate if row is a link; second tap can follow link if implemented as progressive disclosure — prefer single-tap navigate only when entire row is clearly a link |
| Legend click | Not required (single series) |
| Filter controls | Out of scope (no chart-level filters in current product) |

Drill-down recommendation: only link to `/children` (existing) or barangay-filtered registry **if** `listChildren` already accepts a barangay query param (verify in `src/lib/queries.ts` / children page before wiring). If not supported, **do not invent** server filters in this plan — keep `PanelLink` to registry as today.

---

## 12. Animation Specification

| Moment | Motion | Duration | Easing | Reduced motion |
|--------|--------|----------|--------|----------------|
| First data paint | Bar fill `scaleX` 0→1 | 300–450ms | `ease-out` | Show final width immediately |
| Row stagger | Opacity/translateY optional | ≤40ms delay/row | ease-out | No stagger |
| Hover highlight | Background color | 150ms | ease | Instant ok |
| Tooltip | Opacity + 4px translateY | 150–200ms | ease-out | Instant show/hide |

No looping animations on charts. No parallax.

---

## 13. Responsive Specification

| Viewport | Chart behavior |
|----------|----------------|
| ≥1280px | Full labels width `sm:w-40`, % visible, hover tooltips |
| 768–1279px | Slightly tighter label column; touch targets comfortable |
| <768px | Label column may shrink; value+% stack or hide % in tooltip only; min row height increased; no page-level horizontal scroll |
| Landscape phone | Ensure panel doesn’t force awkward clipping |

---

## 14. Accessibility Specification

- Always show numeric values (color is supplementary).  
- Provide text alternative for stacked bar (`aria-label` / list).  
- Tooltips wired with `aria-describedby` when visible.  
- Focus order: logical top-to-bottom within panel.  
- Do not remove global focus outline.  
- Respect `prefers-reduced-motion` (project already sets near-zero durations globally).  
- Empty states announced as text content.  
- Decorative dots/bars: `aria-hidden` where redundant with text.

---

## 15. Performance Considerations

- Dataset size is small (≤ tens of barangays, ≤ 5 education categories) — **no virtualization, no memoization drive-by**.  
- Client islands only per interactive row group, not per pixel.  
- Prefer CSS transform animations over JS driven width loops.  
- Do not add `useEffect` data fetching.  
- Avoid importing all of `framer-motion` into the dashboard if CSS suffices; if used, import only `motion`/`AnimatePresence` as needed.  
- Bundle: do **not** add new packages. Recharts remains unused (tree-shaken if never imported).

---

## 16. Edge Cases (checkbox tasks)

- [ ] **No data (`rows.length === 0`):** `EmptyState`; no animation errors  
- [ ] **Single data point:** Bar at 100% width; tooltip still correct  
- [ ] **All zeros (education):** Empty or zero list; avoid divide-by-zero (already guarded with `total === 0`)  
- [ ] **Very large values:** Numeric display remains readable; bar max normalization holds  
- [ ] **Long barangay names:** Truncate + tooltip/title full name  
- [ ] **Hidden barangays count:** Footer still accurate when `rows.length > 8`  
- [ ] **Unauthorized monitoring:** Casework not rendered (`canMonitor`) — unchanged  
- [ ] **Slow navigation:** Skeleton already exists; ensure no FOUC on bar animation  
- [ ] **Reduced motion:** Final state only  
- [ ] **Keyboard only:** Full comprehension  
- [ ] **Narrow 320px viewport:** No overflow  

---

## 17. Testing Strategy

### Functional

- [ ] Chart values match `dashboardData` output  
- [ ] Top 8 truncation + footer  
- [ ] Education percentages sum to ~100% (rounding)  
- [ ] Tooltips show correct numbers  
- [ ] Links still navigate  

### Visual

- [ ] Brand colors unchanged in meaning  
- [ ] Panel layout alignment with adjacent cards  
- [ ] Animation subtle  

### Responsive

- [ ] Desktop / tablet / mobile / touch  

### Accessibility

- [ ] Keyboard  
- [ ] Focus visible  
- [ ] Screen reader summary  
- [ ] Reduced motion  

### Performance

- [ ] No extra network calls for charts  
- [ ] Smooth animation on typical hardware  

### Regression

- [ ] KPI grid, validation queue, activity, system status unaffected  
- [ ] Permissions unchanged  
- [ ] `pnpm lint` / `pnpm test` / `pnpm build` succeed  

---

## 18. Acceptance Criteria (product)

- [ ] Same website identity; chart feels more polished and professional  
- [ ] Existing theme tokens preserved  
- [ ] Existing dashboard structure preserved  
- [ ] Data accuracy preserved  
- [ ] Interaction improved (hover/focus/tooltip)  
- [ ] Animations purposeful and subtle  
- [ ] Mobile and desktop both work  
- [ ] Accessibility considered and verified for CSS charts  
- [ ] Reduced-motion safe  
- [ ] Loading skeleton still coherent  
- [ ] Empty states coherent  
- [ ] No new npm dependencies  
- [ ] No unrelated file churn  
- [ ] No business logic / SQL changes unless a proven bug  

---

## 19. Definition of Done

- [ ] All tasks in sections 9–16 either completed `[x]` or explicitly deferred with reason  
- [ ] Plan checkboxes updated only after verification  
- [ ] Build, lint, and tests pass  
- [ ] Manual keyboard + mobile pass recorded  
- [ ] No Recharts forced adoption without a separate decision  
- [ ] Documentation: this file remains the source of truth for the chart enhancement  

---

## 20. Implementation Notes

1. **Prefer progressive enhancement:** Server-rendered numbers must remain correct even if client JS fails (tooltip/animation degrade gracefully).  
2. **Serializable props only** across the RSC → client boundary.  
3. **Do not** mark tasks complete because files were opened.  
4. **Color maps** (`EDU_BAR`, `RECORD_TONES`, `KPI_TONES`) stay authoritative for category colors.  
5. **Municipality copy** and Sta. Magdalena branding strings stay untouched.  
6. If implementers later want true Cartesian charts (axes, brush, multi-series), open a **separate** plan to evaluate Recharts against these same design constraints.

---

## 21. Risks and Mitigation

| Risk | Mitigation |
|------|------------|
| Hydration mismatch from random IDs / locale dates in client | Use stable props; avoid `Date.now()` in bar island |
| Tooltip overflow on mobile | Prefer below-row inline detail on very small screens |
| Over-animation | Cap duration; civic tone; reduced-motion |
| Accidental query changes | Treat `dashboard-data.ts` as read-only by default |
| Scope creep into full dashboard redesign | This plan lists exclusions explicitly |
| Unused `recharts` confusion | Document decision; optional later dependency cleanup ticket |

---

## 22. Final Verification Checklist

- [ ] Every task above has a checkbox  
- [ ] Every implementation task lists real paths from this repo  
- [ ] Current vs proposed behavior distinguished  
- [ ] Acceptance criteria and testing included  
- [ ] Accessibility, responsive, performance, animation covered  
- [ ] Design system protected  
- [ ] No unnecessary features or dependencies proposed  
- [ ] Data/business logic safety emphasized  
- [ ] Implementation **not** started in the planning phase  

---

## Appendix A — Key source anchors

```text
src/app/(app)/dashboard/page.tsx
src/app/(app)/dashboard/loading.tsx
src/components/dashboard/primitives.tsx
  - Panel
  - KpiGrid
  - BarangayDistribution
  - EducationDistribution
  - RecordStatusCard
  - MonitoringBarangayTable
  - MonitoringCasework
src/lib/dashboard-data.ts
src/lib/queries.ts
src/app/globals.css
src/components/ui/states.tsx
src/components/loading/skeletons.tsx
src/components/loading/page-transition.tsx
package.json  (recharts, framer-motion present; unused in src for charts)
plan/dashboard-three-pages-enhancement.md  (prior related plan; complementary, not replaced)
```

## Appendix B — Decision log (planning)

| Decision | Rationale |
|----------|-----------|
| Keep CSS bars vs migrate to Recharts | Data is categorical ranking/distribution; CSS matches UI density; avoids client-heavy charts; Recharts unused today |
| Allow optional framer-motion | Already installed; use only if CSS insufficient |
| No new dependencies | Sufficient tooling already present |
| Client islands only for interaction | Preserve RSC data loading and permissions model |
| Plan path `plan/dashboard-chart-interactivity-plan.md` | Matches existing `plan/` convention |

---

**End of plan — implementation must not begin until explicitly instructed.**
