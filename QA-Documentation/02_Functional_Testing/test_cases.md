# Test Cases

Execution statuses and evidence live in `execution_results.md`. Cases marked **E2E-BLOCKED** could
not be driven through a browser (no credentials/HTTPS cookie) and are covered instead at the
server-action level by the integration/unit suites listed in the evidence column.

## A. Public / unauthenticated surface

| Test ID | Feature | Description | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|---|
| FT-001 | Root routing | Anonymous visit to `/` | No session | `GET /` | Redirect (307) to a public page; no protected content | High |
| FT-002 | Landing page | `/welcome` renders | No session | `GET /welcome` | 200 with institutional landing content | Medium |
| FT-003 | Login page | `/login` renders | No session | `GET /login` | 200, form with email/password/remember-me | High |
| FT-004 | Registration page | `/register` renders and states approval is required | No session | `GET /register` | 200, pending-approval messaging | Medium |
| FT-005 | QR verification entry | `/verify` renders lookup form | No session | `GET /verify` | 200 | Medium |
| FT-006 | QR verification (invalid token) | `/verify/<short-invalid-token>` | No session | `GET /verify/badtoken123` | 200, "Record not found", no data leak | High |
| FT-007 | QR verification (bad characters) | Token with illegal characters | No session | `GET /verify/..%2fetc` | Rendered "Invalid token format" path; no 500 | High |
| FT-008 | Not found | Unknown route | No session | `GET /nonexistent-page` | 404 with friendly page | Medium |
| FT-009 | Password recovery pages | `/forgot-password`, `/reset-password` render | No session | `GET` both | 200 | Medium |

## B. Authentication & session

| Test ID | Feature | Description | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|---|
| FT-010 | Login validation | Wrong credentials produce one generic error | Valid account | Submit bad password | "Invalid email or password." — no account enumeration | High |
| FT-011 | Login rate limit | >10 attempts/minute per IP | — | 11 rapid submissions | Blocked with "Too many attempts" + audit row `reason: rate-limit` | High |
| FT-012 | Deactivated account | Login on `isActive=false` | — | Submit valid password | Rejected with deactivation message | High |
| FT-013 | Pending registration | Login before approval | status=pending | Submit valid password | Rejected with pending-approval message | High |
| FT-014 | MFA challenge | Password ok + MFA enabled | mfaEnabled | Submit password | No session yet; redirect to `/login/mfa`; challenge cookie only | High |
| FT-015 | Logout | `/logout` destroys session | Signed in | `GET /logout` | Session row deleted, cookie cleared, redirect `/login` | High |
| FT-016 | Session expiry | Expired session row | Session past `expiresAt` | Request protected page | Redirect to `/login` | High |
| FT-017 | Password change | Requires current password | Signed in | Submit wrong current password | Rejected, audited `CHANGE_PASSWORD` with `wrong-current-password` | High |
| FT-018 | Password reset token | Token single-use, 30-minute TTL, hashed at rest | Issued token | Consume, then reuse | Second use rejected; sessions of the account revoked | High |

## C. Authorization (server-enforced)

| Test ID | Feature | Description | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|---|
| FT-019 | Protected page guard | Anonymous `/dashboard`, `/students` | No session | `GET` both | 307 → `/login` | Critical |
| FT-020 | Protected API guard | Anonymous API access | No session | `GET /api/reports/student_master_list`, `/api/form137/abc`, `/api/report-card/abc`, `/api/forecasts` | JSON 401 each | Critical |
| FT-021 | Report export RBAC | Role without `reports.export` | Signed in as nurse/teacher | `GET /api/reports/...` | 403 (proxy pre-check) and handler re-check | Critical |
| FT-022 | Cross-student behavior write | Adviser posts an existing record id belonging to another student | Adviser of section A; record of student B | `saveBehavior({studentId: A, id: recordOfB})` | Rejected; record unchanged | Critical |
| FT-023 | Grade without assignment | Subject teacher posts a subject not in their teaching load | Assignment (A, Math) only | `saveGrade(enrollmentA, Science)` | Rejected "not assigned to teach this subject" | Critical |
| FT-024 | Grade with assignment | Subject teacher posts their assigned subject | Assignment (A, Math) | `saveGrade(enrollmentA, Math)` | Saved | High |
| FT-025 | Guidance domain isolation (edit) | Guidance posts a classroom (non-confidential) behavior record of another student | Guidance user | `saveGuidanceIncident` | Rejected; record unchanged | High |
| FT-026 | Guidance domain isolation (delete) | Guidance deletes a classroom behavior record | Guidance user | `removeGuidanceIncident(recordOfClassroom)` | Rejected; record still present | High |
| FT-027 | Admin guidance write | Admin records a confidential incident | Admin | `saveGuidanceIncident` | Created with `confidential=true` | Medium |
| FT-028 | Student create RBAC | Nurse creates a student | Nurse session | `createStudent` | Rejected "permission"; no row written | High |
| FT-029 | Enrollment section scope | Adviser enrolls into another adviser's section | Adviser of A | `saveEnrollment(sectionB)` | Rejected (section outside authorized scope) | Critical |
| FT-030 | Form 137 IDOR | Teacher requests a print/API document for a student outside their section | Teacher of A, student of B | `GET /api/form137/<idOfB>` | 403 | Critical |
| FT-031 | Record-status gate | Print official document for a draft record | draft record | `GET /api/form137/<id>` | 409 "not verified yet" | High |
| FT-032 | Verified-only QR | Generate QR for a non-verified record | draft record | `generateQr` | Rejected | High |
| FT-033 | Notification ownership | Mark another user's notifications read | Two users | `markNotificationsRead([otherUserIds])` | No rows updated for the other user | High |
| FT-034 | Settings allow-list | Update a non-editable setting key | `settings.manage` | `updateSystemSetting(key=…unknown)` | "Unknown or protected setting." | High |
| FT-035 | Duplicate review RBAC | Teacher reviews a duplicate candidate | Teacher session | `reviewDuplicate` | Rejected (no `duplicates.review`) | High |

## D. Validation, errors, data integrity

| Test ID | Feature | Description | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|---|
| FT-036 | Student form validation | Empty required fields | `students.create` | Submit draft with blank first name | Field errors, nothing written | High |
| FT-037 | Grade bounds | Grade outside 60–100 | Subject teacher | `saveGrade(grade=120)` | Validation error, nothing written | Medium |
| FT-038 | Enrollment duplicate | Second enrollment for the same student/SY | Existing enrollment | `saveEnrollment` again | Idempotent upsert, no duplicate row (unique index) | Medium |
| FT-039 | Health duplicate | Same student + same measurement date | Existing health record | `saveHealthRecord` | Rejected with "edit instead" | Low |
| FT-040 | Verification workflow | Illegal record-status transition | `pending_validation` | Review with illegal status | Guarded by `canTransition` / mapping table | High |
| FT-041 | Audit trail | Sensitive mutation logs an audit row | Any authorized mutation | Perform mutation | `audit_logs` row without secrets/PII payloads | High |
| FT-042 | Error masking | Internal error in an API route | — | Force failure path (code review) | Generic JSON error, details only in server log | Medium |

## E. Exports & documents

| Test ID | Feature | Description | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|---|
| FT-043 | CSV export | RFC 4180 quoting for commas/quotes/newlines | `reports.export` | Render report CSV | Fields quoted and quotes doubled | Medium |
| FT-044 | CSV/XLSX formula injection | Cell beginning with `=`, `+`, `-`, `@`, TAB, CR | Free-text field with `=HYPERLINK(...)` | Render CSV/XLSX | Value neutralized with a leading apostrophe; never evaluated | High |
| FT-045 | XLSX export | Workbook builds from arbitrary column counts | `reports.export` | Render XLSX | Valid buffer, header block merged over real column count | Medium |
| FT-046 | PDF export | Report/Form 137/report card PDFs | `reports.export` / `documents.print` | Render PDF | Valid PDF bytes; `Cache-Control: private, no-store` on document routes | Medium |

## F. Settings, configuration, reliability

| Test ID | Feature | Description | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|---|
| FT-047 | System settings persist | Save an editable setting | `settings.manage` | Update `student_number_prefix` | Value persisted + audited (`UPDATE_SETTING`) | Medium |
| FT-048 | Maintenance mode enforcement | Admin enables maintenance | `maintenance_mode=true`, non-admin session | Open any `(app)` route | Maintenance notice rendered; admin unaffected | High |
| FT-049 | Notifications | Mark-all-read | Signed in | `markAllNotificationsRead` | Only the caller's rows updated | Low |
| FT-050 | 404/empty states | Empty registry / empty lists render guidance | No rows | Open `/students` with filters | Empty-state component, no crash | Low |

## G. Blocked / not executed

| Test ID | Feature | Description | Status |
|---|---|---|---|
| FT-051 | Authenticated browser walkthrough of all modules | Requires credentials and an interactive browser session | E2E-BLOCKED |
| FT-052 | Email delivery (password reset) | Mailgun credentials unavailable | BLOCKED |
| FT-053 | AI assistance features | `AI_API_KEY` unavailable | BLOCKED |
| FT-054 | Load/performance measurement under concurrency | No load tooling in environment | NOT TESTED |
| FT-055 | Lighthouse / axe automated accessibility score | Tooling unavailable | NOT TESTED |
| FT-056 | Remote Drizzle migration / drift check | Destructive against configured DB; no remote credentials | NOT TESTED |
