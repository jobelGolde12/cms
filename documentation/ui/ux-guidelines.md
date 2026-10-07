# UX Guidelines — Design Preservation

> STATUS: **PLAN**. The approved design is the foundation. The migration changes
> purpose and content — not the visual identity (TODO §10–§12).

## What stays exactly as-is

- **Tokens:** `brand-*` civic navy, `action-*` governmental blue, `status-*`
  semantic pairs (`src/app/globals.css`).
- **Typography:** Fira Sans / Fira Code; `.numeric` for codes/counts; `.eyebrow`
  micro-labels; sizes/tracking as used in current pages.
- **Layout:** 240px fixed sidebar, sticky 64px header, `max-w-7xl` main,
  footer; mobile drawer; `space-y-5` page rhythm.
- **Components:** `ui/*` primitives, KPI cards, `distribution-bar`,
  registry kit, skeletons, `PageHeader`.
- **Motion:** entrance `.bar-grow`/`.row-fade`/`.stagger-*`, shimmer skeletons,
  `prefers-reduced-motion` global collapse.

## What changes

- Labels/copy (child→student, municipality→school), page metadata, navigation
  groups, data behind every card/chart, form fields.

## Explicitly avoided (TODO §12)

Unnecessary gradients · glassmorphism · excessive shadows/borders/cards ·
decorative animations · unrelated colors · random icon styles · oversized
radii · entirely new layouts.

## Page Standards

| Aspect | Standard |
|---|---|
| Page header | `PageHeader` (eyebrow/title/description) with action slots |
| Tables | `TableWrap` + `Th/Td`, `TableEmptyState`; hover row tint; sortable where useful |
| Forms | `Field`+`Input/Select/Textarea`; inline errors; hint text; pending state on submit |
| Confirmations | dialog for archive/duplicate-confirm/revoke; destructive action styled distinctly |
| Feedback | success message/toast after mutations (existing action-state pattern) |
| Loading | route-level skeletons matching real layout; `aria-busy` |
| Empty | explanatory + next-step CTA |
| Error | boundary with retry; no technical details |

## Responsive Strategy

- Desktop-first existing layout retained; verify 360px, 768px, 1024px, 1440px.
- Tables → horizontal scroll on tablet; key pages (registry, rosters) get
  card-list variant on phones.
- Filters collapse into a disclosure panel on mobile (existing registry pattern).
- Critical pages to test: dashboard, registry, student profile, grade entry,
  attendance roster, report filter forms.

## Accessibility Checklist

- [ ] Keyboard-navigable everything; visible focus (3px action ring).
- [ ] Semantic landmarks (`nav`, `main`), `aria-current` on nav (existing).
- [ ] Labels tied to inputs; errors announced (`role="alert"` where present).
- [ ] Tables: caption/th scope where added.
- [ ] Charts: `aria-label` descriptions; never color-only status.
- [ ] Contrast: tokens already WCAG-first; new components must match.
- [ ] Screen reader pass on new pages (tab labels, dialog roles).
