---
name: Civic Mapping & Demographics
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf4'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dde9ff'
  surface-container-highest: '#d5e3fd'
  on-surface: '#0d1c2f'
  on-surface-variant: '#45464d'
  inverse-surface: '#233144'
  inverse-on-surface: '#ebf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#4059aa'
  on-secondary: '#ffffff'
  secondary-container: '#8fa7fe'
  on-secondary-container: '#1d3989'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#001d31'
  on-tertiary-container: '#188ace'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#dce1ff'
  secondary-fixed-dim: '#b6c4ff'
  on-secondary-fixed: '#00164e'
  on-secondary-fixed-variant: '#264191'
  tertiary-fixed: '#cce5ff'
  tertiary-fixed-dim: '#93ccff'
  on-tertiary-fixed: '#001d31'
  on-tertiary-fixed-variant: '#004b73'
  background: '#f8f9ff'
  on-background: '#0d1c2f'
  surface-variant: '#d5e3fd'
typography:
  display-lg:
    fontFamily: IBM Plex Serif
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: IBM Plex Serif
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: IBM Plex Serif
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: IBM Plex Serif
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
  headline-sm:
    fontFamily: IBM Plex Serif
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
  data-mono:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The visual narrative balances authoritative municipal governance with precise civic data stewardship. Operating at the intersection of local government units (LGU) and the Department of Education (DepEd), the interface projects institutional stability, transparency, and public trust.

The design movement is **Corporate / Modern Civic Precision**:
- **Tone:** Dignified, accountable, analytical, and structured.
- **Visual Clarity:** Devoid of decorative startup gradients, neo-brutalist novelties, or playful consumer tropes. The layout emphasizes data density, legibility under varying field display conditions, and immediate situational awareness.
- **Editorial Authority:** Utilizes an editorial serif for constitutional and municipal document hierarchy, coupled with an engineered, high-density sans-serif optimized for tabular child demographics, geographic barangay listings, and student tracking ledgers.

## Colors

The palette adheres strictly to institutional civic authority and functional accessibility:

- **Primary (`#0F172A`):** Deep Navy/Slate Slate-900. Anchors top-level institutional headers, primary command buttons, and core architectural frames.
- **Secondary (`#1E3A8A`):** DepEd/Civic Blue. Expresses public sector service, active navigation nodes, and focused structural accents.
- **Tertiary (`#0284C7`):** Informational Azure. Designates neutral systemic guidance, data filter tags, and operational notifications (paired with `#E0F2FE` background fills).
- **Neutrals:**
  - Background Canvas: `#F8FAFC` (Slate-50) creates a calm, glare-free foundation.
  - Borders & Grid Delimiters: `#E2E8F0` (Slate-200) for structural low-noise separation.
  - Body & Label Copy: `#334155` (Slate-700) and `#0F172A` (Slate-900) ensure WCAG AAA contrast ratios.

### Semantic Status Ensembles
- **Verified / Enrolled:** Text `#15803D` on Surface `#DCFCE7`, Border `#86EFAC`.
- **Pending Validation / Review:** Text `#B45309` on Surface `#FEF3C7`, Border `#FDE68A`.
- **Critical Alert / Out-of-School Youth:** Text `#B91C1C` on Surface `#FEE2E2`, Border `#FCA5A5`.

## Typography

The dual-type strategy separates executive governance from operational data processing:

- **Executive & Administrative Scale (IBM Plex Serif):** Deployed for system titles, municipal barangay reporting headers, official module summaries, and printable compliance views. It conveys institutional presence and the gravity of national education records.
- **Operational & Tabular Scale (Inter):** Serves all administrative forms, dense census tables, filters, status indicators, and tracking metrics.
- **Data Attributes:** All numeric values within tables, Learner Reference Numbers (LRN), household serials, and geo-coordinates must leverage Inter's tabular lining numerals (`font-feature-settings: 'tnum' 1, 'cv05' 1`) to ensure perfect vertical alignment across census columns.

## Layout & Spacing

The layout is built on a responsive 12-column grid system optimized for administrative productivity and variable-screen field usage:

- **Desktop (1200px+):** Fixed 12-column layout with a static 260px civic navigation rail. Gutters are fixed at `1.25rem` (20px), outer margins at `2rem` (32px). Maximizes horizontal scan efficiency for large multi-column demographic tables.
- **Tablet (768px - 1199px):** 8-column layout. Side navigation collapses into a persistent high-contrast top rail. Outer canvas margin shrinks to `1.5rem`.
- **Mobile (< 768px):** 4-column fluid single-stack container layout. Outer canvas margins reduce to `1rem`, gutters to `0.75rem`. Tabular grids reflow systematically into field-ready census cards.
- **Spacing Rhythm:** Based on a rigid 4px base increment. Data entry inputs and compact table rows prioritize tight vertical density (`space-xs` and `space-sm`) to maximize visible records per viewport.

## Elevation & Depth

Visual hierarchy relies on structured containment, low-contrast structural outlines, and subdued civic elevation rather than heavy, atmospheric dropshadows.

- **Level 0 (Flat Canvas):** `#F8FAFC` background without elevation or border.
- **Level 1 (Card & Module Foundation):** Pure white `#FFFFFF` surface bounded by a crisp 1px `#E2E8F0` border. Paired with an ultra-subtle ambient shadow: `0 1px 2px 0 rgba(15, 23, 42, 0.04)`.
- **Level 2 (Popovers, Filter Menus & Dropdowns):** `#FFFFFF` surface, 1px `#CBD5E1` border, layered with directional grounding: `0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Modal Dialogs & Census Verification Drawers):** High-priority focus layered above a semi-translucent backdrop (`#0F172A` at 45% opacity). Elevation cast: `0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.06)`.

## Shapes

The design system maintains a **Soft (`1`)** shape language:

- Base interface elements (buttons, inputs, select triggers, table cells) feature a disciplined `0.25rem` (4px) corner radius.
- Cards, data containers, and modal sheets use `rounded-lg` (`0.5rem` / 8px).
- Status tags, demographic badges, and verified indicators use compact rounded containers rather than playful pill geometries, reinforcing an orderly bureaucratic aesthetic.

## Components

### Buttons
- **Primary:** Solid `#0F172A` fill with crisp white text. In active/hover states, shifts to `#1E3A8A`. Strict 0.25rem border radius; 36px height for data operations, 44px for field entry.
- **Secondary / Outline:** Transparent background with 1px border (`#CBD5E1`) and `#0F172A` text. Hover shifts background to `#F1F5F9`.
- **Destructive:** Solid `#B91C1C` fill with white text for irreversible child mapping deletions or record cancellations.

### Status Badges
- High-contrast 20px tall tags with 2px horizontal padding and an uppercase `label-sm` font.
- Must display both color and a reinforcing icon:
  - *Verified:* Green checkmark icon on `#DCFCE7` with `#15803D` text.
  - *Pending:* Amber clock icon on `#FEF3C7` with `#B45309` text.
  - *Out of School:* Red alert shield on `#FEE2E2` with `#B91C1C` text.

### Civic Data Tables
- Multi-row density with explicit 1px `#E2E8F0` horizontal borders.
- Header row styled in `#F1F5F9` with uppercase `label-sm` text in `#334155`.
- Alternating row zebra banding is prohibited; hover row background shifts to `#F8FAFC`.
- Learner Reference Numbers and household codes strictly set in tabular numerals.

### Form Fields & Step Indicators
- **Input Fields:** `#FFFFFF` background, 1px `#CBD5E1` border, 0.25rem radius. Focus state utilizes a solid `#1E3A8A` border with a 2px offset ring of `rgba(30, 58, 138, 0.15)`.
- **Step Indicators:** Linear progress track displaying explicit numbered stages ("1. Household Details", "2. Child Demographics", "3. Educational Attainment", "4. DepEd Validation"). Completed steps use filled `#0F172A` circles with white checks; active steps use `#1E3A8A` with a prominent outer ring.

### Privacy & Data Protection Banners
- Dedicated card component featuring a localized data privacy shield icon.
- Background in `#F8FAFC` bordered with `#CBD5E1` and left-accented with a 3px vertical strip of `#1E3A8A`. Text reinforces compliance with the Philippine Data Privacy Act of 2012 regarding minor records.