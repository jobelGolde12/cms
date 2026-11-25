# Functional Test Cases

Preconditions unless stated: application running at `http://localhost:3000` (or automated Vitest environment), clean browser state.

## Welcome navbar / layout (requested scope)

| Test ID | Feature | Description | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|---|
| NAV-001 | Mobile header | Brand and menu trigger fit at 320 px | Viewport 320×720, `/welcome` | Load page; measure `scrollWidth` vs viewport | No horizontal overflow; brand mark-only; hamburger fully visible | High |
| NAV-002 | Mobile header | Brand wordmark at 390 px | Viewport 390×844 | Load `/welcome` | Mark + “Records Management System” visible, no clipping | High |
| NAV-003 | Tablet header | Compact header at 768 px | Viewport 768×1024 | Load `/welcome` | Brand lockup and hamburger fit; no desktop nav crowding | High |
| NAV-004 | Desktop nav | Navigation present at ≥1024 px | Viewport 1440×900 | Load page | Section links, Verify, Sign In button visible and aligned | High |
| NAV-005 | Drawer open | Drawer is opaque and bounded | Viewport 390 px | Click hamburger | Panel opaque white, width ≤ viewport−48 px, close button visible | High |
| NAV-006 | Drawer close | Backdrop click closes drawer | Drawer open | Click backdrop | Drawer closes, focus returns to trigger | High |
| NAV-007 | Drawer close | Escape closes drawer | Drawer open, focus inside | Press Escape | Drawer closes, `aria-expanded=false`, focus restored | High |
| NAV-008 | Keyboard | Focus is trapped in dialog | Drawer open | Tab repeatedly / Shift+Tab from first item | Focus cycles inside panel only | High |
| NAV-009 | Accessibility | Background inert while drawer open | Drawer open at 390 px | Inspect `#main-content` / footer | `inert` true while open, false after close | Medium |
| NAV-010 | Anchors | Section links scroll correctly | Desktop viewport | Click “How it works” | Hash `#how-it-works`; section top sits below sticky header | Medium |
| NAV-011 | Touch targets | Header controls ≥44 px | Viewport 390 px | Measure trigger/close/link boxes | Trigger and close are 44×44 px; menu rows ≥44 px tall | Medium |
| NAV-012 | Contrast | Drawer helper text readable | Drawer open | Check colour contrast | 11 px labels use `brand-600` on white (AA pass) | Medium |
| NAV-013 | Copy accuracy | Grade range matches product scope | — | Load `/welcome` and read purpose section | Says “Grades 7–10”, not 7–12 | Medium |
| NAV-014 | No overflow | All tested viewports | 320/390/768/1024/1440 | Measure document width | `scrollWidth ≤ innerWidth` | High |

## Application / API / security-relevant automated cases (existing suite)

| Test ID | Feature | Description | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|---|
| AUTH-001 | Login | Valid credentials create session | Seeded test user | Run auth/action tests | Session cookie set; redirect to role dashboard | High |
| AUTH-002 | Login | Invalid credentials rejected | — | Submit wrong password | Safe error, no user enumeration | High |
| AUTH-003 | Login | Brute-force throttling | — | Exceed 10 attempts/min from one address | “Too many attempts” response | High |
| AUTH-004 | Sessions | Expired/revoked session denied | Stale cookie | Request protected route | Redirect to `/login`, cookie cleared | High |
| AUTH-005 | Password reset | Reset flow validation and single-use token | Test DB | Run `password-reset-flow` tests | Invalid/expired tokens rejected; valid reset works | High |
| AUTHZ-001 | Proxy gate | Unauthenticated route access | No cookie | Request `/students` | Redirect to `/login` | High |
| AUTHZ-002 | Proxy gate | Role-restricted route | Authenticated low-privilege user | Request forbidden module | Redirect with denial, module not rendered | High |
| AUTHZ-003 | Row scope | Subject teacher cannot read another section’s student | Test data | Call AI action with foreign `studentId` | “You do not have access…” error | High |
| AUTHZ-004 | Guidance AI | Teacher/adviser cannot summarize confidential guidance case | Teacher session | Call `summarizeGuidanceCase` | Restricted error, no provider call | High |
| AUTHZ-005 | Guidance AI | Teacher cannot draft guidance follow-up | Teacher session | Call `draftGuidanceFollowUp` | `ok:false`, no draft produced | High |
| AUTHZ-006 | Guidance AI | Guidance/admin/school_admin allowed | Allowed role session | Call both guidance AI actions | Success; audit row written | High |
| AI-001 | Confidentiality | Confidential incident not sent to model for unauthorised role | Registrar session | Summarize student | Payload lacks confidential text | High |
| AI-002 | Injection | Prompt-injection record framed as data | Admin session | Summarize student with poisoned record | System contract present; text enclosed as data | High |
| AI-003 | Cost control | AI rate limit | Same user | 9 requests in window | 9th blocked before provider call | Medium |
| AI-004 | Integrity | AI actions do not mutate domain tables | Any role | Compare row counts before/after | Only audit rows added | High |
| TEST-001 | Grade scope | Only Grades 7–10 accepted | — | Write unsupported grade | Rejected with “Grades 7–10” message | High |
| BUILD-001 | Build | Production compilation | Clean tree | `npm run build` | Exit 0, all routes compiled | High |
| LINT-001 | Quality | ESLint | — | `npm run lint` | Exit 0 | Medium |
| TS-001 | Quality | TypeScript | — | `npx tsc --noEmit` | Exit 0 | High |
| DEP-001 | Dependencies | Production vulnerability scan | — | `npm audit --omit=dev` | No high/critical advisories | Medium |
