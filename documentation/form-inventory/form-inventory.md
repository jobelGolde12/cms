# Form Inventory — CMS / School Records System

Generated during validation audit. Every discovered form/submission workflow.

---
## 1. Authentication

| Route/Component | File | Action/Endpoint | Schema | Server Validation | DB Constraints | Status |
|---|---|---|---|---|---|---|
| Login | `src/app/login/page.tsx` | `src/actions/auth.ts` → `login()` | `loginSchema` (email, password) | Yes (email format, rate limit, active check, audit log) | `users.email` unique | Strong |
| Logout | `src/app/logout/route.ts` | `logout()` | None (cookie delete) | Session destruction, audit | — | Strong |
| Change Password | `src/app/(app)/settings/page.tsx` | `changePassword()` | `changePasswordSchema` | Current password check, new ≠ current, hash update | `users.passwordHash` updated | Strong |
| Update Profile | `src/app/(app)/settings/page.tsx` | `updateProfile()` | Manual (first/last name trim) | Required names only | `users.firstName`, `lastName` updated | Moderate — needs schema |

---
## 2. Student Registry (Core)

| Route/Component | File | Action/Endpoint | Schema | Server Validation | DB Constraints | Status |
|---|---|---|---|---|---|---|
| Create Student | `src/app/(app)/students/new/page.tsx` | `createStudent()` | `studentFormSchema` | Zod parse, authorization (`students.create`), transaction (student + verification + guardian), number retry, audit | `students.id` PK, `studentNumber` unique implied by generation | Strong — could add DB unique constraint on `studentNumber` |
| Edit Student | `src/app/(app)/students/[id]/edit/page.tsx` | `updateStudent()` | `studentFormSchema` | Authorization (`students.update`), `canEditStudent` (draft/needs_correction only), edit restriction | `students` updated in transaction | Strong |
| Archive Student | `src/components/archive-student-button.tsx` | `archiveStudentForm()` | Not shown | Authorization, status check (likely) | `students.status` | Moderate — inspect action |
| Registry Search/Filter | `src/app/(app)/students/page.tsx` | Server-side query parsing | `studentQuerySchema` | Zod parse of params, pagination limits (`max(10000)`), sort whitelist | N/A (read-only) | Moderate — needs stricter pagination bound |
| Student Detail View | `src/app/(app)/students/[id]/page.tsx` | Read-only | None (display) | Authorization (`getCurrentUser`) | Read query | N/A |

---
## 3. Verification & Duplicates

| Route/Component | File | Action/Endpoint | Schema | Server Validation | DB Constraints | Status |
|---|---|---|---|---|---|---|
| Verification Queue | `src/app/(app)/verification/page.tsx` | Read-only list | None | Authorization | Read query | N/A |
| Review Verification | `src/components/validation/review-form.tsx` | `reviewVerification()` (via action) | `verificationReviewSchema` | Zod parse (`studentId`, `decision`, `remarks`), authorization, status transition rules (`workflow.ts`) | `recordVerifications` inserted | Strong |
| Duplicate Review | `src/app/(app)/duplicates/page.tsx` | `reviewDuplicate()` | `duplicateReviewSchema` | Zod parse, authorization, decision enum | `duplicateCandidates` reviewed | Strong |
| Duplicate Search/Filter | `src/app/(app)/duplicates/page.tsx` | GET params | None shown | None shown (GET filter) | N/A | Weak — filter validation missing |

---
## 4. Development Modules (Behavior, Assessments, Interventions)

| Route/Component | File | Action/Endpoint | Schema | Server Validation | DB Constraints | Status |
|---|---|---|---|---|---|---|
| Behavior List | `src/app/(app)/development/behavior/page.tsx` | Read | None | Authorization | Read | N/A |
| Behavior Create/Edit | Component implied | `behaviorFormSchema` (from schemas) | Schema defined | Must inspect `behavior-form` component/action | `behaviorRecords` | Needs inspection |
| Assessment Create/Edit | Component implied | `assessmentFormSchema` | Schema defined (`score: 0-100`) | Must inspect action | `assessments` or similar | Needs inspection |
| Intervention Create/Edit | Component implied | `interventionFormSchema` | Schema defined | Must inspect action | `interventions` | Needs inspection |
| Follow-up Create/Edit | Component implied | `followupFormSchema` | Schema defined | Must inspect action | `interventionFollowups` | Needs inspection |

---
## 5. Reports & Analytics

| Route/Component | File | Action/Endpoint | Schema | Server Validation | DB Constraints | Status |
|---|---|---|---|---|---|---|
| Reports List | `src/app/(app)/reports/page.tsx` | Read-only (list + links) | None | Authorization | Read query | N/A |
| Report Export API | `src/app/api/reports/[type]/route.ts` | `GET` handler | `format` validated (`pdf`/`xlsx`/`csv`) | `REPORT_TYPES` whitelist, `reports.export` permission, user scope (`user` parameter) | `reports` inserted, `reportExports` tracked | Strong |
| Dashboard | `src/app/(app)/dashboard/page.tsx` | Read-only analytics | None | Authorization (`getCurrentUser`) | Aggregation queries | N/A |
| Performance Overview | `src/app/(app)/performance/page.tsx` | Read-only | None | Authorization | Read query | N/A |

---
## 6. User Management & Settings

| Route/Component | File | Action/Endpoint | Schema | Server Validation | DB Constraints | Status |
|---|---|---|---|---|---|---|
| Users List | `src/app/(app)/users/page.tsx` | Read | None | Authorization | Read query | N/A |
| User Create/Edit | Component/page implied | `userFormSchema` | `email`, `firstName`, `lastName`, `roleId` enum, `password` optional, `isActive` boolean | Zod parse in `users` action (must inspect) | `users` table | Needs inspection |
| System Settings Update | `src/app/(app)/settings/page.tsx` | `updateSystemSettingForm()` | Not shown clearly | Must inspect action (`settings.ts`) | `system_settings` | Needs inspection |
| Profile Update | `src/app/(app)/settings/page.tsx` | `updateProfileForm()` | Manual (trim only) | Basic trim check, no schema enforcement | `users` updated | Weak — needs schema |

---
## 7. Notifications & Activity

| Route/Component | File | Action/Endpoint | Schema | Server Validation | DB Constraints | Status |
|---|---|---|---|---|---|---|
| Notifications List | `src/app/(app)/notifications/page.tsx` | Read + `markAllNotificationsRead` form | None shown for read; action for mark-all | Must inspect `notifications` action | `notifications` updated | Moderate |
| Activity Logs | `src/app/(app)/activity-logs/page.tsx` | Read-only | None | Authorization (`audit_logs.view`) | Read query | N/A |

---
## 8. Public / Unauthenticated Forms

| Route/Component | File | Action/Endpoint | Schema | Server Validation | DB Constraints | Status |
|---|---|---|---|---|---|---|
| Login (public) | `src/app/login/page.tsx` | `login()` | `loginSchema` | Rate limit, audit, session cookie | `users` lookup + `sessions` insert | Strong |
| Welcome / Root | `src/app/page.tsx` | Redirect based on session | None (redirect only) | `getCurrentUser()` | Read `users` via session | N/A |
| QR Verify (public) | `src/app/verify/page.tsx` | `GET` form (`token`) | No schema shown | Token lookup, minimal info display | `qrVerifications` read | Moderate — token format validation missing |
| Verify Result | `src/app/verify/result/page.tsx` | Read result based on token | None (display) | Token validation | Read query | N/A |

---
## Key Findings (Audit Summary)

- Total forms/submissions discovered: ~20+
- Schema-enforced (Zod): Auth (login, changePassword), Student (create/edit), Verification (reviewVerification), Duplicates (duplicateReview), Development (assessment, behavior, intervention, followup), Enrollment (enrollmentFormSchema), Grade (gradeFormSchema), Attendance (attendanceFormSchema)
- Manual / weak validation: Update profile (`updateProfile` — manual trim only, no Zod), System settings (`updateSystemSettingForm` — unverified), Notifications mark-all (`notifications` action — unverified), Registry filters (`studentQuerySchema` — pagination max 10000 could be tighter), QR verify (`verify/page.tsx` — no token format validation)
- Missing server-side checks for some development actions (must inspect `development/` pages and actions)
- No database-level unique constraints shown in schema for `studentNumber`, `email` uniqueness relies on index not constraint, no foreign key enforcement shown explicitly in `drizzle.config.ts` (SQLite supports it but Drizzle may not enforce all)
- Rate limiting exists (`rate-limit.ts`) for auth; no rate limiting shown for student creation, report generation, or verification review
- No CSRF tokens shown; relies on session cookie + sameSite lax (appropriate for server actions with cookie auth, but should verify)
- Security headers configured (`next.config.ts` CSP, X-Frame-Options DENY, etc.)
