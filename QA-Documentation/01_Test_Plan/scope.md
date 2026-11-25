# Test Scope

## In scope and tested

### Public routes

| Route | Notes |
|---|---|
| `/` | Entry redirect/landing logic |
| `/welcome` | **Primary UI focus** — navbar, drawer, hero, sections, anchors |
| `/login` | Page rendered; login action reviewed and covered by tests |
| `/login/mfa` | Page/guard reviewed |
| `/register` | Page rendered/guarded |
| `/forgot-password`, `/reset-password` | Flows reviewed; new password-reset test file executed |
| `/verify`, `/verify/[token]`, `/verify/result` | Public record verification |
| `/privacy`, `/terms`, `/cookie-policy` | Static policy pages |
| `/logout` | Route handler reviewed |
| `robots.txt`, icons | Metadata routes from build |

### Authenticated application routes (inventoried; static + proxy review)

`/dashboard`, `/students`, `/students/new`, `/students/[id]`, `/students/[id]/edit`, print routes (card, Form 137, report card), `/verification`, `/duplicates`, `/development`, `/development/behavior`, `/performance`, `/grades`, `/grades/monitoring`, `/guidance`, `/guidance/incidents/new`, `/guidance/incidents/[id]/edit`, `/health`, `/employees`, `/employees/[id]`, `/employees/[id]/201`, `/employees/[id]/service-credits`, `/service-credits`, `/sections`, `/assignments`, `/qr`, `/reports`, `/reports/[type]`, `/activity-logs`, `/users`, `/notifications`, `/settings`, `/settings/mfa`.

### APIs

- `GET /api/reports/[type]`, `/api/forecasts`, `/api/form137/[id]`, `/api/report-card/[id]`
- Proxy/middleware auth and role gate for protected prefixes; `/api/reports` returns JSON 401/403 instead of redirects.

### Features and domains

Student registry and enrollment, grades and grading monitoring, attendance, assessments, interventions, guidance incidents, health/nutrition, employees and service credits, sections and assignments, QR verification, duplicates, reports/exports, notifications, audit logs, user/settings/MFA, AI assistance.

### Database

Drizzle schema/migrations reviewed; row-level scope (`scope.ts`), permission matrix (`permissions.ts`), session handling and authorization helpers reviewed. Tests run against disposable SQLite/libSQL files.

## Out of scope / not tested

| Area | Status | Reason |
|---|---|---|
| Production Turso data mutations | NOT TESTED | Destructive against live data; AGENTS.md restricts to Turso but no authorization to mutate production |
| Mailgun email delivery (password reset, notifications) | BLOCKED | External mail service and credentials; no real emails sent |
| Real AI provider responses | NOT TESTED | Tests mock `fetch`; no live provider call |
| Full authenticated browser E2E for every role | BLOCKED | No usable test-account credentials supplied |
| Load / stress testing | NOT TESTED | No performance environment or baseline |
| Automated axe/WCAG scan | NOT TESTED | Tool not installed; manual accessibility review performed |
| Third-party OAuth/SSO | NOT APPLICABLE | Not used by the application |

## Change scope implemented

- Welcome navbar (desktop + mobile drawer), logo responsiveness, anchor navigation and landing-page copy.
- Guidance AI authorization narrowing (confirmed defect from failing tests).
- Accessibility contrast and touch-target fixes in the navbar.
