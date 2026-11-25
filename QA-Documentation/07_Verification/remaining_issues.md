# Remaining Issues

Only issues still genuinely open are listed. Fixed findings are marked VERIFIED in their reports and are not repeated here.

## ISSUE-001 — Moderate transitive uuid advisory via ExcelJS

```text
Issue ID:          ISSUE-001
Description:       exceljs@4.4.0 depends on uuid@8.3.2, which is covered by a moderate
                   buffer-bounds advisory (GHSA-w5hq-g745-h8pq).
Severity:          Low in this deployment (advisory severity: moderate)
Reason Not Fixed:  npm's only available fix downgrades ExcelJS to 3.4.0 (semver-major),
                   risking spreadsheet/export regressions; no upstream compatible
                   release is installed. The vulnerable uuid API path is not used.
Blocked By:        Upstream ExcelJS release.
Recommended Next:  Upgrade ExcelJS when it ships uuid >= 11.1.1; re-run npm audit in CI.
```

## ISSUE-002 — Global editorial microcopy contrast

```text
Issue ID:          ISSUE-002
Description:       .eyebrow (brand-400) and footer copyright/status lines use a light
                   blue token on white/tinted backgrounds at small sizes (~2.7:1),
                   below WCAG AA 4.5:1.
Severity:          Minor
Reason Not Fixed:  Changing the global editorial token would alter the established
                   visual identity across the whole landing page, beyond the requested
                   navbar scope. The navbar's own helper text was darkened to brand-600.
Blocked By:        Product/design decision on the editorial palette.
Recommended Next:  Darken the eyebrow token or restrict it to large/decorative text;
                   review all small informational text against 4.5:1.
```

## ISSUE-003 — Oversized hero source image

```text
Issue ID:          ISSUE-003
Description:       public/school1.jpg is 10.2 MB, 4624×3472 px.
Severity:          Low (delivered bytes are optimized by next/image: ~50 KB at 640 px,
                   ~148 KB at 1080 px)
Reason Not Fixed:  Replacing the source photograph is a content-asset change; runtime
                   delivery is already optimized and measured LCP is good locally.
Blocked By:        Asset/content approval.
Recommended Next:  Re-encode to ~2500–3200 px, quality ~80 (WebP/AVIF optional) and
                   confirm visual fidelity; this cuts deploy and cold-cache cost.
```

## ISSUE-004 — Authenticated browser E2E coverage

```text
Issue ID:          ISSUE-004
Description:       Authenticated role workflows were not exercised in a real browser
                   because no usable test-account credentials were provided.
Severity:          Informational (verification gap, not a confirmed defect)
Reason Not Fixed:  Missing credentials and external email/AI services.
Blocked By:        Test accounts / staging environment.
Recommended Next:  Seed a staging account set and run Playwright/agent-browser flows for
                   login, role redirects, CRUD, exports and MFA.
```

## ISSUE-005 — In-memory rate limiting is per instance

```text
Issue ID:          ISSUE-005
Description:       Login/AI rate limits live in process memory, so horizontally scaled
                   instances enforce independent limits.
Severity:          Low
Reason Not Fixed:  Current deployment is a single instance; changing the limiter requires
                   a shared store (new dependency/infrastructure).
Blocked By:        Deployment architecture decision.
Recommended Next:  Move to a shared rate-limit store if the app is scaled horizontally.
```
