# Runtime Bottlenecks

## Measured production smoke test

`npm start` (production build) at 390×844, `/welcome`:

| Metric | Value |
|---|---|
| TTFB | 126 ms |
| FCP | 208 ms |
| LCP | 568 ms (hero image via `/_next/image`) |
| CLS | 0 |
| React hydration | ~23 ms |
| `WelcomeHeader` hydration | ~32 ms |

These are local-loopback measurements, not field data or a remote-Turso benchmark.

## Observations

| ID | Observation | Impact | Evidence | Status |
|---|---|---|---|---|
| PERF-001 | Hero source `public/school1.jpg` is **10,265,444 bytes**, 4624×3472 px | Large repo/deploy artifact and first-time optimizer CPU work; delivered bytes are optimized | `ls -la`, `file` | OPEN (mitigated by next/image) |
| PERF-002 | Optimized delivery at 640 px is ~50 KB; at 1080 px ~148 KB | Acceptable mobile transfer; LCP 568 ms locally | `curl` size_download on `/_next/image` | INFORMATIONAL |
| PERF-003 | `/welcome` is fully static; only the header/drawer and scroll hook add client JS | Good render strategy; no server work per request | Build route table; source `use client` | INFORMATIONAL |
| PERF-004 | Authenticated screens use dynamic server rendering and scoped Drizzle queries | Appropriate; no N+1 confirmed in reviewed query helpers | Query source review | NOT TESTED at scale |
| PERF-005 | Rate limiting is in-memory per process | Not a user-facing performance issue; scaling consideration | `src/lib/rate-limit.ts` | INFORMATIONAL |

## Recommendations not implemented

1. Replace the 10 MB hero source with a ~2500–3200 px, quality-80 JPEG/WebP (keeps visual fidelity, cuts repository and cold-optimizer cost). Not changed because it alters a content asset and delivered bytes are already optimized.
2. Consider AVIF/WebP `formats` configuration in `next.config.ts` if broader browser support is acceptable.
3. Add real-user monitoring for LCP/CLS on the deployed origin; local numbers cannot represent school-network conditions.

No unverified speedup is claimed: the navbar rewrite changed markup and client-side interactions, not measured load performance.
