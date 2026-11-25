# Regression Testing

Run after all implementation work. Source changes were limited to the welcome header/logo/section wrappers, landing copy and guidance AI gating.

| Area | Test | Result | Notes |
|---|---|---|---|
| Full automated suite | `npm test` | PASS | 40 files, 464/464 tests |
| Welcome header mobile | 320 px render, overflow, brand | PASS | Mark-only brand below 360; `scrollWidth` 305 ≤ 320 |
| Welcome header phone | 390 px render, drawer open/close | PASS | Opaque drawer; close visible |
| Welcome header tablet | 768 px render | PASS | Hamburger; no overflow |
| Welcome header desktop | 1024 / 1440 px render | PASS | Nav, Verify, Sign In fit |
| Keyboard navigation | Tab cycle, Shift+Tab, Escape | PASS | Focus trapped in dialog; restored to trigger |
| Background inert | Open/close drawer | PASS | `#main-content` inert true/false |
| Anchor navigation | How it works | PASS | Hash set; offset increased after measurement |
| Hero/other sections | Page render at all widths | PASS | No horizontal overflow |
| Logo component | Other usages compile/render | PASS | New props opt-in; defaults unchanged; typecheck/lint pass |
| Landing copy | Grades 7–10 | PASS | Grep confirms |
| Grade-scope enforcement | Enrollment/student/query tests | PASS | Included in full suite |
| Authentication | Auth/session/password-reset tests | PASS | Included in full suite |
| Authorization | AI role matrix, IDOR tests | PASS | Included in full suite |
| Guidance AI narrow gate | Teacher denied; guidance/admin allowed | PASS | Previously 2 failures |
| Database operations | Throwaway DB migrations + CRUD tests | PASS | No production data touched |
| Production build | `npm run build` | PASS | Exit 0, 13.9 s |
| Production runtime | `npm start` + `/welcome` | PASS | TTFB 126 ms, LCP 568 ms, CLS 0 |
| Lint / types | `npm run lint`, `npx tsc --noEmit` | PASS | Exit 0 each |

## Not regression-tested

| Area | Status | Reason |
|---|---|---|
| Every authenticated page via browser | BLOCKED | No credentials; static/authz review and automated tests used instead |
| Email/password-reset delivery | BLOCKED | Mailgun credentials/service not used |
| Real AI providers | NOT TESTED | Mocked |
| Production database under load | NOT TESTED | Out of scope / destructive risk |
