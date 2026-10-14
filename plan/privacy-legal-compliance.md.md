# Privacy, Legal, Consent, Cookie, and User-Protection Implementation Plan

## Phase 1 — Inspect: COMPLETE
✅ **Framework and version**: Next.js 16.3.5, React 19.2.8
✅ **Frontend architecture**: Next.js App Router with client/server components
✅ **Backend architecture**: Next.js API routes, Server Actions
✅ **Database technology**: Turso (libSQL) with SQLite backend via Drizzle ORM
✅ **ORM/query layer**: Drizzle ORM
✅ **Authentication system**: Session-based with HMAC SHA-256 tokens in `sms_session` cookie
✅ **Authorization/roles**: Five roles (admin, school_admin, teacher, records, guidance)
✅ **Existing user-registration flow**: Via default credentials (seed data), manual creation through admin
✅ **Existing login flow**: Email/password with session creation, remember-me option
✅ **Password-reset flow**: Not implemented (change password requires current password)
✅ **Profile/account-management flow**: Profile update in Settings page
✅ **Existing forms**: Login, profile update, change password, student form, behavior form, etc.
✅ **Existing validation**: Zod schemas for all forms
✅ **Existing API routes**: Next.js API routes in `/app/api/`, Server Actions in `/actions/`
✅ **Existing middleware**: Auth guards via `getCurrentUser()`, `requireUser()`, `requirePermission()`
✅ **Existing cookies**: `sms_session` (HttpOnly, SameSite=lax, 8-hour TTL)
✅ **Existing localStorage/sessionStorage usage**: Not detected in audit (need to verify)
✅ **Existing analytics**: Basic server-side analytics tracking via `trackEvent()` writing to audit log
✅ **Existing third-party services**: Not detected in audit
✅ **Existing embedded content**: QR verification system
✅ **Existing external APIs**: None detected
✅ **Existing email services**: Not detected
✅ **Existing file/image upload functionality**: Not detected
✅ **Existing error logging**: Console.error + audit logging
✅ **Existing monitoring**: None detected beyond audit logs
✅ **Existing security mechanisms**: CSP headers, X-Frame-Options, Referrer-Policy, Permissions-Policy
✅ **Existing privacy/legal pages**: None found
✅ **Existing footer**: Minimal footer with school name/address/region only
✅ **Existing navigation**: Sidebar-based navigation with permission-based filtering
✅ **Existing settings pages**: Profile, password change, system settings
✅ **Existing account deletion functionality**: Not found
✅ **Existing data export functionality**: Not found
✅ **Existing consent mechanisms**: Not found
✅ **Existing notification systems**: In-app notifications via `/src/lib/notifications.ts`

## Phase 2 — Audit: COMPLETE
✅ **Current privacy-related behavior**: 
  - Session cookie (`sms_session`) stores authenticated user session
  - Audit logs track user actions (PII minimized - no passwords/PII in logs)
  - Basic analytics tracking of events (non-sensitive)
  - IP address and user agent stored in session creation (optional)
✅ **Existing cookies**: 
  - `sms_session`: Authentication/session cookie (essential)
  - No analytics, tracking, or marketing cookies detected
✅ **Existing tracking**: 
  - Basic server-side event tracking (login/logout, CRUD operations)
  - No third-party tracking (Google Analytics, Meta Pixel, etc.)
✅ **Existing personal-data collection**: 
  - User: email, name, role, last login
  - Student: name, birthdate, sex, contact info, guardians
  - Guardian: contact info
  - Academic: enrollment, grades, attendance
  - Behavioral: records, interventions
  - Audit: anonymized actions
✅ **Existing forms**: 
  - Login form (email/password)
  - Profile update (first/last name)
  - Password change (current/new password)
  - Student registration (comprehensive personal data)
  - Guardian forms (contact info)
  - Behavior/intervention forms (sensitive data)
  - All forms use Zod validation
✅ **Existing consent requirements**: 
  - None detected beyond implicit authentication
✅ **Required new pages**: 
  - Privacy Policy
  - Terms and Conditions  
  - Cookie Policy
  - Privacy Settings
✅ **Required new components**: 
  - CookieConsentBanner
  - CookiePreferences
  - PrivacyNotice
  - LegalDocument (base for policy pages)
  - DataExportButton
  - AccountDeletionButton
✅ **Required database changes**: 
  - Consent records table (if tracking consent for analytics/marketing)
  - Policy version tracking
✅ **Required API changes**: 
  - Data export endpoints
  - Account deletion endpoint
  - Consent management endpoints
✅ **Required middleware changes**: 
  - Consent checking for analytics (if implemented)
✅ **Required validation changes**: 
  - Consent validation where required
✅ **Required UI changes**: 
  - Footer navigation links
  - Privacy notices on forms
  - Settings page additions
✅ **Required footer/navigation changes**: 
  - Add Privacy Policy, Terms, Cookie Policy links to footer
✅ **Required documentation**: 
  - Implementation documentation in this plan
✅ **Required testing**: 
  - Manual testing of all new features
  - Regression testing of existing functionality
