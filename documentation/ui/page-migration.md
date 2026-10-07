# UI — Page Migration Plan

> STATUS: **PLAN**. Design preservation is mandatory: same tokens
> (`src/app/globals.css`), same layout (`src/components/app-shell.tsx`), same
> primitives (`src/components/ui/*`, dashboard/registry kits, skeletons).
> Content, data bindings, and information architecture change — visuals do not.

## Page-by-Page Table (TODO §36 fields per row)

| # | Current route | New route | Current → New purpose | Content/data changes | UI changes | Backend | Permissions | Validation | States | Tests |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `/` | `/` | Landing → Landing (school) | New title/copy; remove LGU/barangay wording | Keep editorial design | none (redirect logic kept) | public | — | existing | visual QA |
| 2 | `/welcome` | `/welcome` | Census pitch → school platform pitch | Rewrite sections copy | Keep design system | none | public | — | existing | visual QA |
| 3 | `/login` | `/login` | Login → Login | Relabel ("School Personnel Portal") | Keep | unchanged | public | unchanged | existing | auth tests |
| 4 | `/register` | **removed** | Self-registration | — | — | delete page+action; update proxy matcher | — | — | — | route 404s |
| 5 | `/dashboard` | `/dashboard` | Municipal overview → school analytics | New KPIs + charts (see analytics doc) | Same grid/cards | rewrite `dashboard-data.ts` | `dashboard.view` | — | skeleton/empty/error | metric tests |
| 6 | `/children` | `/students` | Child registry → student registry | New filters (grade/section/enrollment) | Same registry kit | `listStudents` | `students.view` | query schema | existing patterns | filter/scope tests |
| 7 | `/children/new` | `/students/new` | Create child → create student | Identity+guardian+enrollment form | Same form layout | `createStudent` | `students.create` | `studentFormSchema` | inline errors | action tests |
| 8 | `/children/[id]` | `/students/[id]` | Child profile → student profile (tabbed IA) | New tabs per TODO §25 | Same tab/card styling | profile queries per tab | scope-checked | — | per-tab Suspense | tab data tests |
| 9 | `/children/[id]/edit` | `/students/[id]/edit` | Edit | New form | same | `updateStudent` | `students.update` + scope | schema | existing | action tests |
| 10 | `/validation` | `/verification` | Child validation → record verification | New checks/labels | same queue UI | new actions/queries | `verification.*` | review schema | existing | workflow tests |
| 11 | `/duplicates` | `/duplicates` | Child duplicates → student duplicates | student fields | same | retargeted detector | `duplicates.*` | review schema | existing | detector tests |
| 12 | `/monitoring` | **removed** (folded into `/development`) | OSY/ECCD/disability casework | replaced | — | — | — | — | — | — |
| 13 | `/monitoring/interventions` | `/development/interventions` | Interventions | student-scoped | same list UI | reworked actions | `interventions.*` | schema | existing | lifecycle tests |
| 14 | `/monitoring/[type]` | **removed** | Type-filtered monitoring | replaced by behavior/assessment pages | — | — | — | — | — | — |
| 15 | — | `/development/behavior` | — behavior casework | new | new page, same primitives | behavior actions | `behavior.*` | schema | new | permission tests |
| 16 | — | `/performance/academic` | — academic analytics | new | new, reuse chart kit | analytics queries | `grades.view` | — | new | metric tests |
| 17 | — | `/performance/attendance` | — attendance | new | new | attendance actions/queries | `attendance.*` | roster schema | new | calc tests |
| 18 | — | `/performance/reading` `/literacy` `/numeracy` | — assessments | new, component-shared | new | assessment actions | `assessments.*` | schema | new | calc tests |
| 19 | `/reports` | `/reports` | Municipal reports → school reports | New catalog cards | same grid | new builders | `reports.*` | filter form | existing | builder tests |
| 20 | `/qr` | `/qr` | QR studio | student wording | same | retarget | `qr.verify` | — | existing | token tests |
| 21 | `/verify/*` | `/verify/*` | Public verification | school wording | same card style | retarget to students | public (limited) | — | existing | token tests |
| 22 | `/users` | `/users` | User management | new roles; drop Barangay column → Assignment | same table | role catalog | `users.*` | user schema | existing | role tests |
| 23 | `/activity-logs` | `/activity-logs` | Audit viewer | new vocabulary labels | same | unchanged | `audit_logs.view` | — | existing | — |
| 24 | `/notifications` | `/notifications` | Notifications | wording | same | unchanged | `children.view`→`dashboard.view` | — | existing | — |
| 25 | `/settings` | `/settings` | Profile/password + system config | school profile, academic structure, scales/levels/rules | same layout + new sections | settings actions | `settings.manage` | settings schemas | existing | config tests |
| 26 | `/api/reports/[type]` | `/api/reports/[type]` | Export | school builders | — | rewrite builders | `reports.export` | type/format check | JSON errors | export tests |
| 27 | `/logout` | `/logout` | Session destroy | — | — | unchanged | public | — | — | auth tests |

## Navigation Migration (TODO §35 — matched to existing shell)

```
Dashboard
Students
  ├── Student Registry (/students)
  └── Add Student (/students/new)          [permission-gated]
Performance
  ├── Academic (/performance/academic)
  ├── Attendance (/performance/attendance)
  ├── Reading (/performance/reading)
  ├── Literacy (/performance/literacy)
  └── Numeracy (/performance/numeracy)
Student Development
  ├── Behavior (/development/behavior)
  └── Interventions (/development/interventions)
Reports
Administration
  ├── Verification (/verification)
  ├── Duplicate Review (/duplicates)
  ├── QR Studio (/qr)
  ├── Users (/users)
  ├── Activity Logs (/activity-logs)
  └── Settings (/settings)
```

Implemented by editing `navLinks` + `NAV_SECTIONS` in
`src/components/app-shell.tsx` (and `nav-icons.tsx` names); permission-filtered
as today. Sidebar/mobile drawer keep identical styling.

## Component Migration (TODO §37)

| Component | Action |
|---|---|
| `ui/*` (button, card, field, table, badge, states, page-header, tooltip) | retain unchanged |
| `dashboard/primitives.tsx`, `distribution-bar.tsx` | retain; feed new data |
| `registry/registry-ui.tsx` | retain; new filters/columns |
| `loading/*` skeletons | retain; add academic/assessment variants |
| `child-form.tsx` | replace with `student-form.tsx` (same styling) |
| `archive-child-button.tsx` | replace with archive-student equivalent |
| `welcome/*` | retain structure; rewrite copy |
| `app-shell.tsx`, `sidebar-nav.tsx`, `nav-icons.tsx`, `logo.tsx` | retain; relabel |
| Charts (Recharts installed) | add line/stacked-bar wrappers reusing dashboard styles |

## UX Guidelines (TODO §11–§12, §42–§43)

- Tables: sticky header, horizontal scroll wrapper (`TableWrap`), row links;
  mobile → card-list variant for registry/rosters.
- Forms: field-level errors, required markers, disabled-submit while pending,
  success toasts (existing patterns).
- Confirmation dialogs before archive/duplicate-confirm/revocation.
- Chart accessibility: `role="img"` + descriptive `aria-label`; data table
  alternative where practical; icon+text status (never color-only).
- Keyboard: natural tab order, visible 3px focus ring (global CSS), Esc closes dialogs.
- Empty/loading/error/success on every page (existing kit + patterns in §61 of TODO).
