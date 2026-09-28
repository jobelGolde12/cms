# Security Findings

## Evidence-Based Findings (From Actual Codebase)

### 1. No Middleware-Based Authorization (Critical — Documented)
- **Evidence:** `find src/app -name 'middleware*'` returns nothing; `next.config.ts` has headers but no middleware.
- **Impact:** Every protected route relies solely on `getCurrentUser()` inside `page.tsx` or `layout.tsx`. A missing check = unprotected route.
- **Root cause:** Middleware file was never created.
- **Remediation (plan only, not implemented):** Create `src/app/middleware.ts` that validates session cookie and applies authorization for protected route groups. Preserve existing header configuration in `next.config.ts`.

### 2. Rate Limit Not Shared (Medium — Documented)
- **Evidence:** `src/lib/rate-limit.ts` uses simple in-memory `limit` counter per key (`ip + "|login"`).
- **Impact:** Horizontal scaling (multiple instances) breaks rate limiting; attackers could distribute attempts across instances.
- **Root cause:** Single-instance municipal deployment assumption.
- **Remediation:** Document limitation. If scaled horizontally, replace with DB-backed or Redis-backed rate limit store.

### 3. CSP Allows `unsafe-inline` and `unsafe-eval` (Medium — Documented)
- **Evidence:** `next.config.ts` CSP value: `script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';`
- **Impact:** Reduces XSS protection; `unsafe-eval` allows dynamic script evaluation.
- **Root cause:** Required for React hydration or some libraries (not confirmed which).
- **Remediation:** Document. If removed in future, verify all client components still work (no dynamic `eval` usage found during audit).

### 4. No CSRF Token Mechanism (Low — Documented)
- **Evidence:** Server actions (`src/actions/*.ts`) use `useActionState()` without CSRF tokens. Cookie is `sameSite: "lax"`.
- **Impact:** Acceptable for this application's threat model (authenticated users, no external form submissions). Should be documented.
- **Remediation:** Document. If higher assurance needed, add double-submit cookie or synchronizer token pattern without redesigning UI/theme.

### 5. Sensitive Data Exposure in Audit Logs (Low — Confirmed Safe)
- **Evidence:** `src/lib/audit.ts` (`logAudit`) explicitly avoids password hashes in `oldValues`/`newValues`. `auditLogs` table stores `oldValuesJson` and `newValuesJson`. No sensitive fields (passwordHash) are included in audit entries.
- **Confirmation:** Safe by design.

### 6. No Middleware-Level Route Restriction for `/api/reports/[type]`
- **Evidence:** `src/app/api/reports/[type]/route.ts` has `getCurrentUser()` and `hasPermission()` checks inside handler.
- **Impact:** Handler-level authorization is sufficient but middleware-level would be more efficient (reject earlier).
- **Remediation:** Optional middleware addition (see Phase 2 checklist).

---

References: `next.config.ts` (security headers, CSP), `src/app/api/reports/[type]/route.ts` (auth checks), `src/lib/auth.ts` (cookie config), `src/lib/rate-limit.ts`, `src/lib/audit.ts`.
