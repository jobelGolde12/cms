# Municipal Child Mapping System

## Complete System Flowchart & Web Application Implementation Plan

> **Purpose:** This document is the authoritative implementation specification for translating the Municipal Child Mapping System flowcharts into a functional web application.
>
> The AI agent will NOT receive the system flowchart images. Therefore, this document explicitly defines every major user flow, decision point, route, permission check, database interaction, success state, failure state, and transition required by the system.

---

# 1. PRIMARY OBJECTIVE

Implement the Municipal Child Mapping System as a real, functional web application.

The system must not merely reproduce the appearance of the flowchart.

Every flowchart process must correspond to an actual:

* route
* page
* component
* server operation
* database operation
* authorization check
* validation rule
* status transition
* notification
* audit event

where applicable.

The implementation must follow this principle:

```text
FLOWCHART
    ↓
USER ACTION
    ↓
UI
    ↓
SERVER
    ↓
AUTHORIZATION
    ↓
DATABASE
    ↓
BUSINESS LOGIC
    ↓
RESULT
    ↓
UI STATE
    ↓
AUDIT / NOTIFICATION
```

---

# 2. SYSTEM USERS

The system has exactly three application roles:

```text
1. Barangay User
2. LGU User
3. System Administrator
```

## Important

There is NO:

```text
School User
Teacher User
School Administrator
```

Schools exist as reference data.

Schools may be associated with child educational records, but school personnel do not have application accounts unless a future requirement explicitly introduces them.

---

# 3. HIGH-LEVEL SYSTEM FLOW

The overall application flow is:

```text
User
 ↓
Login
 ↓
Authentication
 ↓
Identify User Role
 ↓
Check Permissions
 ↓
Check Data Scope
 ↓
Role-Specific Dashboard
 ↓
System Modules
```

After authentication, the user should never be able to access a module simply by manually typing its URL.

Every protected route must perform authorization.

---

# 4. MAIN SYSTEM MODULES

The application must support these modules:

```text
Dashboard
Child Registry
Add Child
Child Profile
Edit Child

Validation
Duplicate Detection

Barangay Monitoring
 ├── Educational Status
 ├── Out-of-School Youth
 ├── ECCD
 ├── Disability
 └── Interventions

Reports
 ├── Report Dashboard
 ├── Report Builder
 └── Report Preview / Export

QR Verification

Notifications

Activity Logs

User Management

Roles & Permissions

Profile

Settings
```

---

# 5. ROUTE STRUCTURE

Use the project's existing architecture where possible.

If using Next.js App Router, the conceptual route structure is:

```text
/login

/dashboard

/children
/children/new
/children/[id]
/children/[id]/edit

/validation
/validation/duplicates

/monitoring
/monitoring/education
/monitoring/out-of-school-youth
/monitoring/eccd
/monitoring/disability
/monitoring/interventions

/reports
/reports/new
/reports/[id]

/verify

/activity-logs

/users
/users/[id]

/roles-permissions

/profile

/settings
```

Do not create unnecessary duplicate routes.

---

# 6. GLOBAL AUTHENTICATION FLOW

Every protected page follows:

```text
Open Protected Route
        ↓
Check Session
        ↓
Authenticated?
     /       \
   No         Yes
   ↓           ↓
/login    Identify User
              ↓
         Check Role
              ↓
       Check Permission
              ↓
       Check Data Scope
              ↓
          Allow Access
```

If the user is not authenticated:

```text
Protected Route
      ↓
No Session
      ↓
Redirect /login
```

If authenticated but unauthorized:

```text
Protected Route
      ↓
Permission Denied
      ↓
403 / Access Denied
```

Do not silently redirect unauthorized users to unrelated pages if doing so would hide a permission problem.

---

# 7. LOGIN FLOW

## User Flow

```text
Login Page
    ↓
Enter Email
    ↓
Enter Password
    ↓
Submit
    ↓
Server Validation
    ↓
Find User
    ↓
Check Password
    ↓
Check Account Status
    ↓
Create Session
    ↓
Record Last Login
    ↓
Create Audit Log
    ↓
Identify Role
    ↓
Redirect Dashboard
```

## Failure cases

### Invalid credentials

```text
Login
 ↓
Invalid credentials
 ↓
Show generic authentication error
 ↓
Remain on login
```

Do not reveal whether the email exists.

### Disabled account

```text
Login
 ↓
Account inactive
 ↓
Deny authentication
 ↓
Show appropriate account-status message
```

### Validation failure

```text
Empty email
Empty password
Invalid email
```

Show field-level errors.

---

# 8. ROLE ROUTING

After authentication:

```text
Authenticated User
       ↓
Read Role
       ↓
 ┌─────────────┬─────────────┬─────────────────────┐
 ↓             ↓             ↓
Barangay      LGU           System
User          User          Administrator
 ↓             ↓             ↓
Barangay     Municipal      System
Dashboard    Dashboard      Dashboard
```

The dashboard must be generated based on permissions.

Do not rely only on role names in the frontend.

---

# 9. BARANGAY USER FLOW

Barangay Users are scoped to their assigned barangay.

Conceptually:

```text
Barangay User
      ↓
users.barangay_id
      ↓
Authorized Barangay
      ↓
Authorized Child Records
```

The server must enforce this scope.

A Barangay User must not access another barangay's records simply by changing:

```text
/children/123
```

or:

```text
?barangay_id=other
```

---

# 10. BARANGAY USER MAIN FLOW

```text
Login
 ↓
Barangay Dashboard
 ↓
 ├── Child Registry
 ├── Add Child
 ├── Validation
 ├── Monitoring
 ├── Interventions
 ├── Reports
 ├── QR Verification
 ├── Notifications
 └── Profile
```

Only modules permitted by the user's permissions should appear.

---

# 11. LGU USER FLOW

LGU Users operate at the municipal level according to their permissions.

```text
Login
 ↓
LGU Dashboard
 ↓
Municipality-wide authorized data
 ↓
 ├── Child Registry
 ├── Validation
 ├── Duplicate Detection
 ├── Barangay Monitoring
 ├── Interventions
 ├── Reports
 ├── QR Verification
 └── Notifications
```

LGU access must still be permission-controlled.

---

# 12. SYSTEM ADMINISTRATOR FLOW

```text
Login
 ↓
Administrator Dashboard
 ↓
 ├── Users
 ├── Roles & Permissions
 ├── Barangays
 ├── Schools
 ├── Child Registry
 ├── Validation
 ├── Monitoring
 ├── Reports
 ├── QR Verification
 ├── Activity Logs
 └── Settings
```

The administrator must still use server-side authorization.

Do not treat the administrator interface as inherently trusted.

---

# 13. DASHBOARD FLOW

After login:

```text
Dashboard
 ↓
Load User Scope
 ↓
Load Authorized Metrics
 ↓
Load Recent Activity
 ↓
Load Pending Actions
 ↓
Render Dashboard
```

Potential dashboard information:

```text
Total Children
Verified Children
Pending Validation
Needs Correction
Potential Duplicates
Out-of-School Youth
ECCD Monitoring
Disability Monitoring
Active Interventions
Completed Interventions
```

All metrics must come from actual database queries.

No permanent hardcoded statistics.

---

# 14. CHILD REGISTRY FLOW

```text
Child Registry
 ↓
Load Authorized Records
 ↓
Display Table
```

Support:

* Search
* Pagination
* Sorting
* Barangay filtering
* Education filtering
* Record status filtering
* Verification filtering
* Date filtering

For Barangay Users:

```text
Query
 ↓
Apply user's barangay scope
 ↓
Return authorized records
```

For LGU/Admin:

```text
Query
 ↓
Apply permission scope
 ↓
Return authorized records
```

Use server-side pagination.

---

# 15. CHILD REGISTRY SEARCH FLOW

```text
User enters search
       ↓
Debounce
       ↓
Server request
       ↓
Validate query
       ↓
Apply authorization scope
       ↓
Query database
       ↓
Return paginated results
       ↓
Update table
```

Do not fetch the entire child database into the browser.

---

# 16. ADD CHILD FLOW

The flow is:

```text
Add Child
    ↓
Enter Basic Information
    ↓
Enter Address
    ↓
Enter Education
    ↓
Enter ECCD
    ↓
Enter Disability Information
    ↓
Review
    ↓
Validate
    ↓
Duplicate Detection
    ↓
Submit
```

Use a multi-step form if that matches the existing UI.

Do not change the established UX unnecessarily.

---

# 17. ADD CHILD — STEP 1

Collect core information:

```text
First Name
Middle Name
Last Name
Suffix
Birth Date
Sex
Civil Status
Birth Place
Barangay
```

Validate:

* required fields
* valid date
* reasonable date range
* valid enumerated values
* authorized barangay

---

# 18. ADD CHILD — STEP 2

Collect address information:

```text
Barangay
Household Address
Sitio
```

Create:

```text
child_addresses
```

Do not duplicate the complete address into `children`.

---

# 19. ADD CHILD — STEP 3

Collect education information:

```text
Education Status
School
Grade Level
School Year
Enrollment Status
```

Create:

```text
child_education
```

School must come from the `schools` reference table.

Do not allow arbitrary school text where a valid school relationship is required.

---

# 20. ADD CHILD — STEP 4

Collect ECCD information.

Create or update:

```text
child_eccd
```

---

# 21. ADD CHILD — STEP 5

Collect disability information.

Create or update:

```text
child_disabilities
```

Sensitive fields must only be available to authorized users.

---

# 22. ADD CHILD — REVIEW

Before submission:

```text
Review
 ↓
Display entered information
 ↓
Allow Edit
 ↓
Confirm Submission
```

Do not submit until the user confirms.

---

# 23. ADD CHILD — SERVER PROCESS

On submission:

```text
Receive request
 ↓
Authenticate user
 ↓
Check create permission
 ↓
Validate input
 ↓
Validate barangay scope
 ↓
Generate child code
 ↓
Create child
 ↓
Create address
 ↓
Create education
 ↓
Create ECCD
 ↓
Create disability record
 ↓
Run duplicate detection
 ↓
Create validation record
 ↓
Create audit log
 ↓
Create notification if needed
 ↓
Return result
```

Use a transaction for operations that must succeed together.

---

# 24. CHILD CODE GENERATION

Generate codes server-side.

Example:

```text
CM-2026-000001
CM-2026-000002
CM-2026-000003
```

The code must be unique.

The client must never be allowed to choose an arbitrary child code.

---

# 25. DUPLICATE DETECTION FLOW

After child creation or submission:

```text
Child Record
     ↓
Duplicate Matching
     ↓
Potential Match?
   /          \
 No            Yes
 ↓              ↓
Continue      Create Candidate
                 ↓
          Human Review Queue
```

Potential matching can consider:

* first name
* middle name
* last name
* birth date
* sex
* barangay
* school

Do not rely solely on name.

---

# 26. DUPLICATE REVIEW FLOW

```text
Duplicate Queue
      ↓
Open Candidate
      ↓
Compare Records
      ↓
Human Decision
      ↓
 ┌──────────────┬───────────────┬──────────┐
 ↓              ↓               ↓
Duplicate    Not Duplicate    Dismiss
 ↓              ↓
Record         Continue
decision
 ↓
Audit
```

The system must preserve the decision.

Never silently merge records.

---

# 27. VALIDATION FLOW

The validation lifecycle is:

```text
Draft
 ↓
Pending Validation
 ↓
Reviewer
 ↓
Review
```

Decision:

```text
        Review
           ↓
 ┌─────────┼─────────┐
 ↓         ↓         ↓
Approve  Correction Reject
 ↓         ↓         ↓
Verified  Edit      Rejected
           ↓
      Resubmit
           ↓
Pending Validation
```

---

# 28. VALIDATION QUEUE

The validation page should show records requiring review.

Display:

* Child Code
* Child Name
* Barangay
* Submission Date
* Submitted By
* Record Status
* Validation Status

Actions:

* Review
* Approve
* Request Correction
* Reject

Actions must be permission-controlled.

---

# 29. REQUEST CORRECTION FLOW

```text
Reviewer
 ↓
Request Correction
 ↓
Enter Remarks
 ↓
Save
 ↓
child_validation = needs_correction
 ↓
children.record_status = needs_correction
 ↓
Notification
 ↓
Audit Log
```

The original validation record should remain.

---

# 30. APPROVAL FLOW

```text
Reviewer
 ↓
Approve
 ↓
Confirm
 ↓
Update validation
 ↓
Set child record to verified
 ↓
Create audit log
 ↓
Notify relevant user
```

Do not directly manipulate status from the client.

---

# 31. CHILD PROFILE FLOW

```text
Child Registry
 ↓
Select Child
 ↓
Authorization Check
 ↓
Load Child Profile
 ↓
Display Related Information
```

The profile should aggregate:

```text
children
child_addresses
child_education
child_eccd
child_disabilities
child_validations
child_monitoring
child_duplicate_candidates
interventions
intervention_followups
qr_verifications
```

Only display sensitive sections to authorized users.

---

# 32. EDIT CHILD FLOW

```text
Child Profile
 ↓
Edit
 ↓
Authorization
 ↓
Load Current Data
 ↓
Edit
 ↓
Validate
 ↓
Submit
 ↓
Server Validation
 ↓
Update Database
 ↓
Audit Log
 ↓
Refresh Profile
```

Important changes should be recorded in audit logs.

---

# 33. ARCHIVE CHILD FLOW

Prefer archiving rather than destructive deletion.

```text
Child Profile
 ↓
Archive
 ↓
Permission Check
 ↓
Confirmation
 ↓
Set status = archived
 ↓
Audit Log
```

Do not physically delete the entire child record unless there is an explicitly approved data-retention process.

---

# 34. MONITORING MAIN FLOW

```text
Monitoring
 ↓
Select Monitoring Category
 ↓
 ┌──────────────┬─────────────┬──────────────┬─────────────┐
 ↓              ↓             ↓              ↓
Education       OSY           ECCD        Disability
```

Each category uses child-related data.

---

# 35. EDUCATIONAL STATUS FLOW

```text
Educational Monitoring
 ↓
Select Filters
 ↓
Load Child Education Data
 ↓
Display Results
 ↓
View Child
 ↓
Optional Monitoring Update
 ↓
Save
 ↓
Audit
```

---

# 36. OUT-OF-SCHOOL YOUTH FLOW

```text
OSY Monitoring
 ↓
Query child_education
 ↓
education_status = out_of_school
 ↓
Apply authorized scope
 ↓
Display OSY records
 ↓
Identify intervention needs
 ↓
Create intervention if required
```

Do not manually duplicate OSY children into another table.

---

# 37. ECCD FLOW

```text
ECCD Monitoring
 ↓
Query child_eccd
 ↓
Filter participation status
 ↓
Display affected children
 ↓
View child
 ↓
Create/update monitoring
 ↓
Possible intervention
```

---

# 38. DISABILITY MONITORING FLOW

```text
Disability Monitoring
 ↓
Authorization Check
 ↓
Query child_disabilities
 ↓
Display authorized information
 ↓
Identify support needs
 ↓
Create intervention
```

Because this is sensitive information, authorization must be enforced on the server.

---

# 39. INTERVENTION FLOW

```text
Child
 ↓
Create Intervention
 ↓
Enter:
- Type
- Description
- Priority
- Start Date
- Target Date
- Assigned User
 ↓
Validate
 ↓
Save
 ↓
Audit
 ↓
Notification
```

---

# 40. INTERVENTION STATUS FLOW

```text
Planned
 ↓
Ongoing
 ↓
Completed
```

Alternative:

```text
Planned
 ↓
Cancelled
```

The system must preserve status history where required by the audit design.

---

# 41. INTERVENTION FOLLOW-UP FLOW

```text
Intervention
 ↓
Add Follow-up
 ↓
Date
 ↓
Status
 ↓
Notes
 ↓
Save
 ↓
Audit
```

Multiple follow-ups can belong to one intervention.

---

# 42. NOTIFICATION FLOW

Notifications can be generated from important events.

Example:

```text
Validation Submitted
       ↓
Find appropriate reviewer
       ↓
Create Notification
```

Other events:

```text
Correction Requested
Duplicate Review Required
Validation Approved
Intervention Assigned
Follow-up Required
System Notification
```

Notifications should belong to a specific user.

---

# 43. REPORTING FLOW

Main flow:

```text
Reports
 ↓
Select Report Type
 ↓
Select Scope
 ↓
Select Filters
 ↓
Permission Check
 ↓
Query Database
 ↓
Generate Report
 ↓
Preview
 ↓
Export
```

---

# 44. REPORT BUILDER

Allow authorized users to select:

```text
Report Type
Barangay
Date Range
Education Status
ECCD Status
Disability Status
Monitoring Status
Intervention Status
```

Only expose filters appropriate for the selected report.

---

# 45. REPORT GENERATION

```text
Generate Report
 ↓
Authenticate
 ↓
Check report permission
 ↓
Validate filters
 ↓
Apply user data scope
 ↓
Execute server-side query
 ↓
Generate report
 ↓
Create reports record
 ↓
Display preview
```

Do not allow client-provided filters to bypass authorization.

---

# 46. REPORT EXPORT

```text
Report Preview
 ↓
Export
 ↓
Select Format
 ↓
Permission Check
 ↓
Generate File
 ↓
Create report_exports
 ↓
Return download/reference
 ↓
Audit Log
```

Supported formats may include:

```text
PDF
XLSX
CSV
```

---

# 47. QR VERIFICATION FLOW

```text
Verify
 ↓
Scan QR
 ↓
Extract Secure Token
 ↓
Send Token to Server
 ↓
Validate Token
 ↓
Check Status
 ↓
Check Authorization
 ↓
Return Minimum Necessary Information
 ↓
Record Verification
 ↓
Audit Log
```

---

# 48. QR DECISION

```text
Secure Token
      ↓
Valid?
   /       \
 No         Yes
 ↓           ↓
Error      Authorized?
             /    \
           No      Yes
           ↓        ↓
         Deny     Show Safe Information
                     ↓
                Record Verification
```

Never expose full child information through a public verification endpoint.

---

# 49. ACTIVITY LOG FLOW

Every important action:

```text
User Action
 ↓
Server Operation
 ↓
Database Mutation
 ↓
Audit Log
```

Example:

```text
Approve Child
 ↓
Update child
 ↓
Update validation
 ↓
Create audit_logs
```

The user ID must come from the authenticated server session.

Never trust:

```text
request.user_id
```

from the browser for audit attribution.

---

# 50. ACTIVITY LOG PAGE

Authorized users can view:

* User
* Action
* Entity
* Entity ID
* Timestamp
* Relevant change information

Support:

* Search
* Action filtering
* User filtering
* Entity filtering
* Date filtering

Do not allow ordinary users to edit audit records.

---

# 51. USER MANAGEMENT FLOW

System Administrator:

```text
Users
 ↓
View Users
 ↓
Create User
 ↓
Assign Role
 ↓
Assign Barangay if applicable
 ↓
Save
 ↓
Audit
```

---

# 52. CREATE USER FLOW

```text
Create User
 ↓
Enter Name
 ↓
Enter Email
 ↓
Enter Phone
 ↓
Select Role
 ↓
Select Barangay if required
 ↓
Set Initial Password / Invitation
 ↓
Validate
 ↓
Create User
 ↓
Audit
```

Never expose password hashes.

---

# 53. USER DISABLE FLOW

```text
User Management
 ↓
Select User
 ↓
Disable
 ↓
Confirm
 ↓
is_active = false
 ↓
Audit Log
```

Do not delete users merely to remove access.

Historical audit records must remain connected to the user.

---

# 54. ROLE AND PERMISSION FLOW

Administrator:

```text
Roles & Permissions
 ↓
Select Role
 ↓
View Permissions
 ↓
Modify
 ↓
Save
 ↓
Audit
```

Permission checks must happen server-side.

Frontend visibility is only a convenience.

---

# 55. SCHOOL MANAGEMENT FLOW

Because schools are reference entities rather than user roles:

```text
Schools
 ↓
View Schools
 ↓
Add / Edit / Activate / Deactivate
```

School data is used by:

```text
child_education
```

Do not create school authentication.

---

# 56. SETTINGS FLOW

```text
Settings
 ↓
Load Authorized Settings
 ↓
Edit
 ↓
Validate
 ↓
Save
 ↓
Audit
```

Only non-secret settings should be stored here.

---

# 57. ERROR FLOW

Every major operation must have a defined failure state.

General pattern:

```text
Action
 ↓
Validate
 ↓
Valid?
 ├── No → Show Validation Error
 └── Yes
       ↓
Authorization
       ↓
Allowed?
 ├── No → Access Denied
 └── Yes
       ↓
Database Operation
       ↓
Success?
 ├── No → Server Error / Retry
 └── Yes → Success State
```

Do not expose raw database errors to users.

---

# 58. LOADING STATES

Every asynchronous page must handle:

```text
Loading
Success
Empty
Error
Unauthorized
```

Example:

```text
Child Registry
 ├── Loading skeleton
 ├── Results
 ├── No records
 └── Error state
```

Do not leave blank screens during loading.

---

# 59. EMPTY STATES

Examples:

```text
No children found
No pending validations
No duplicate candidates
No interventions
No notifications
No reports
No audit records
```

Each empty state should explain what is happening without exposing technical errors.

---

# 60. CONCURRENCY / STALE DATA

Important workflows should handle stale records.

Example:

```text
Reviewer A opens validation
Reviewer B approves it
Reviewer A tries to approve it again
```

The server should detect the current state and prevent invalid duplicate transitions.

Do not trust the UI's old state.

---

# 61. STATUS TRANSITION VALIDATION

The server should enforce legal state transitions.

Example:

```text
draft
 ↓
pending_validation
 ↓
verified
```

Do not allow arbitrary transitions such as:

```text
verified → draft
```

unless explicitly supported.

Implement centralized workflow rules.

---

# 62. CENTRALIZED BUSINESS LOGIC

Do not scatter status transitions across UI components.

Create reusable server-side workflow functions.

Conceptually:

```text id="0v4myh"
submitChild()
approveChild()
requestCorrection()
rejectChild()

reviewDuplicate()
confirmDuplicate()
dismissDuplicate()

createIntervention()
completeIntervention()
```

These functions should:

* verify authentication
* verify permission
* verify scope
* validate current state
* update database
* create audit log
* create notification where necessary

---

# 63. TRANSACTIONAL WORKFLOWS

Use transactions for operations containing multiple dependent database writes.

Example:

```text
Approve Validation
       ↓
Update child
       ↓
Update validation
       ↓
Create notification
       ↓
Create audit log
```

If the operation requires atomicity, treat it as one transaction.

---

# 64. DATA CONSISTENCY RULES

Never allow:

```text
child_education.child_id
```

to reference a nonexistent child.

Never allow:

```text
intervention_followups.intervention_id
```

to reference a nonexistent intervention.

Never allow:

```text
child_education.school_id
```

to reference a nonexistent school.

Use foreign keys.

---

# 65. FLOWCHART → DATABASE MAPPING

Every major flow should map to the following entities.

| Flow                 | Main tables                                                                |
| -------------------- | -------------------------------------------------------------------------- |
| Login                | users, roles                                                               |
| Permissions          | roles, permissions, role_permissions                                       |
| User scope           | users, barangays                                                           |
| Add Child            | children, child_addresses, child_education, child_eccd, child_disabilities |
| Duplicate Detection  | child_duplicate_candidates                                                 |
| Validation           | child_validations                                                          |
| Child Profile        | all child-related tables                                                   |
| Education Monitoring | child_education, child_monitoring                                          |
| OSY                  | child_education, child_monitoring                                          |
| ECCD                 | child_eccd, child_monitoring                                               |
| Disability           | child_disabilities, child_monitoring                                       |
| Intervention         | interventions                                                              |
| Follow-up            | intervention_followups                                                     |
| QR                   | qr_verifications                                                           |
| Reports              | reports, report_exports                                                    |
| Notifications        | notifications                                                              |
| Audit                | audit_logs                                                                 |
| User Management      | users, roles, permissions                                                  |
| School Management    | schools                                                                    |
| Settings             | system_settings                                                            |

---

# 66. FLOWCHART → ROUTE MAPPING

| Flow                | Route                             |
| ------------------- | --------------------------------- |
| Login               | `/login`                          |
| Dashboard           | `/dashboard`                      |
| Child Registry      | `/children`                       |
| Add Child           | `/children/new`                   |
| Child Profile       | `/children/[id]`                  |
| Edit Child          | `/children/[id]/edit`             |
| Validation          | `/validation`                     |
| Duplicate Detection | `/validation/duplicates`          |
| Monitoring          | `/monitoring`                     |
| Education           | `/monitoring/education`           |
| OSY                 | `/monitoring/out-of-school-youth` |
| ECCD                | `/monitoring/eccd`                |
| Disability          | `/monitoring/disability`          |
| Interventions       | `/monitoring/interventions`       |
| Reports             | `/reports`                        |
| Report Builder      | `/reports/new`                    |
| Report Preview      | `/reports/[id]`                   |
| QR                  | `/verify`                         |
| Activity Logs       | `/activity-logs`                  |
| Users               | `/users`                          |
| User Profile        | `/users/[id]`                     |
| Roles               | `/roles-permissions`              |
| Profile             | `/profile`                        |
| Settings            | `/settings`                       |

---

# 67. NAVIGATION RULE

Navigation should reflect authorization.

Example:

```text
User Permission
      ↓
Allowed?
 ├── Yes → Show navigation item
 └── No → Hide navigation item
```

However:

**Hiding a navigation item is NOT authorization.**

The server must still block unauthorized direct URLs.

---

# 68. SECURITY FLOW

Every protected action follows:

```text
Request
 ↓
Authentication
 ↓
Role
 ↓
Permission
 ↓
Data Scope
 ↓
Input Validation
 ↓
Business Rule Validation
 ↓
Database Operation
 ↓
Audit
```

This must be implemented server-side.

---

# 69. PRIVACY FLOW

Sensitive child information must follow:

```text
Request
 ↓
Identify User
 ↓
Check Permission
 ↓
Check Data Scope
 ↓
Return Minimum Necessary Data
```

Do not expose unnecessary child information to:

* dashboard cards
* QR verification
* notifications
* URLs
* browser storage
* logs
* reports

---

# 70. RESPONSIVE FLOW

The flow remains the same across devices.

Desktop:

```text
Sidebar
 ↓
Module
 ↓
Content
```

Mobile:

```text
Bottom Navigation
 ↓
Module
 ↓
Content
```

Do not create a separate business process for mobile.

Only the presentation/navigation changes.

---

# 71. ACCESSIBILITY

Every workflow must support:

* Keyboard navigation
* Visible focus
* Accessible labels
* Semantic buttons
* Accessible forms
* Error announcements where appropriate
* Sufficient contrast
* Screen-reader-friendly status information

Do not use color as the only way to communicate status.

---

# 72. FRONTEND COMPONENT ARCHITECTURE

Create reusable components where appropriate.

Conceptually:

```text
components/
├── auth/
├── dashboard/
├── children/
├── validation/
├── duplicates/
├── monitoring/
├── interventions/
├── reports/
├── qr/
├── notifications/
├── users/
├── audit/
└── shared/
```

Do not duplicate the same form, table, modal, or permission logic across pages.

---

# 73. FORM ARCHITECTURE

Use:

* React Hook Form if already appropriate
* Zod validation
* Reusable field components
* Server-side validation

Every form needs:

```text
Initial
 ↓
Editing
 ↓
Submitting
 ↓
Success / Error
```

Prevent accidental double submission.

---

# 74. API / SERVER ACTION RULES

Every mutation endpoint/server action must independently perform:

```text
Authentication
Authorization
Scope Check
Validation
Business Rule Check
Database Mutation
Audit
Notification
```

Do not rely on the calling page to perform these checks.

---

# 75. DO NOT TRUST CLIENT DATA

The server must not trust:

```text
role
user_id
barangay_id
permissions
record_status
verified status
```

sent by the browser.

Obtain authoritative values from:

* authenticated session
* database
* server-side permission system

---

# 76. IMPLEMENTATION PHASES

## Phase 1 — Project Audit

Before coding:

* Inspect existing project
* Inspect routes
* Inspect components
* Inspect authentication
* Inspect database
* Inspect existing forms
* Inspect existing navigation
* Inspect existing design system
* Inspect current flow implementation

Do not rewrite the project unnecessarily.

---

## Phase 2 — Architecture Plan

Create:

```text
IMPLEMENTATION_PLAN.md
IMPLEMENTATION_PROGRESS.md
ARCHITECTURE.md
FLOW_IMPLEMENTATION.md
```

Document discovered architecture.

---

## Phase 3 — Authentication

Implement:

* Login
* Logout
* Session
* Account status
* Role identification
* Protected routes

---

## Phase 4 — Authorization

Implement:

* Permission system
* Role permissions
* Barangay scope
* Server-side authorization
* Route protection
* Mutation protection

---

## Phase 5 — Dashboard

Implement:

* Role-specific dashboard
* Real database metrics
* Pending actions
* Recent activity
* Notifications

---

## Phase 6 — Child Registry

Implement:

* List
* Search
* Pagination
* Filtering
* Sorting
* Add Child
* Profile
* Edit
* Archive

---

## Phase 7 — Duplicate Detection

Implement:

* Matching
* Candidate records
* Review
* Decision
* Audit

---

## Phase 8 — Validation

Implement:

* Queue
* Review
* Approve
* Reject
* Correction
* Resubmission
* Notifications
* Audit

---

## Phase 9 — Monitoring

Implement:

* Educational monitoring
* OSY
* ECCD
* Disability
* General monitoring

---

## Phase 10 — Interventions

Implement:

* Create
* Assign
* Update
* Complete
* Follow-up
* Notifications
* Audit

---

## Phase 11 — QR

Implement:

* Token generation
* QR display
* Scan
* Verification
* Safe result
* Verification log

---

## Phase 12 — Reports

Implement:

* Report dashboard
* Builder
* Filters
* Preview
* Export
* Report history

---

## Phase 13 — Administration

Implement:

* Users
* Roles
* Permissions
* Barangays
* Schools
* Settings
* Audit logs

---

## Phase 14 — Error and Edge Cases

Test:

* Unauthorized access
* Missing records
* Deleted/archived records
* Duplicate submissions
* Stale records
* Invalid IDs
* Invalid status transitions
* Expired sessions
* Disabled users
* Database failures
* Network failures

---

## Phase 15 — Security Testing

Test:

* Direct URL access
* Cross-barangay access
* Role escalation
* Permission bypass
* IDOR
* SQL injection protection
* XSS protection
* CSRF where applicable
* Session security
* QR token security
* Sensitive data exposure

---

## Phase 16 — Responsive QA

Test:

```text
1440px
1280px
1024px
768px
600px
480px
390px
375px
```

Verify:

* Navigation
* Forms
* Tables
* Modals
* Filters
* Dashboards
* Reports
* QR pages

---

## Phase 17 — Flow Verification

Walk through every flow manually.

### Authentication

```text
Login
→ Role
→ Dashboard
```

### Child

```text
Add
→ Validate
→ Duplicate Check
→ Submit
→ Review
→ Verify
→ Monitor
```

### Correction

```text
Review
→ Correction
→ Edit
→ Resubmit
→ Review
```

### Duplicate

```text
Potential Duplicate
→ Human Review
→ Decision
```

### Monitoring

```text
Child
→ Monitoring
→ Intervention
→ Follow-up
```

### Reporting

```text
Report
→ Filters
→ Authorization
→ Generate
→ Preview
→ Export
```

### QR

```text
Scan
→ Token
→ Validation
→ Authorization
→ Safe Result
→ Audit
```

---

# 77. AUTOMATED TEST PLAN

Create automated tests for:

## Authentication

* Valid login
* Invalid login
* Disabled account
* Session expiration
* Logout

## Authorization

* Barangay access
* LGU access
* Admin access
* Unauthorized module
* Direct URL attack
* Cross-barangay access

## Child

* Create
* Read
* Update
* Archive
* Invalid data

## Validation

* Submit
* Approve
* Reject
* Correction
* Resubmit

## Duplicate

* Candidate creation
* Review
* Confirm
* Dismiss

## Monitoring

* Create
* Update
* Filter

## Intervention

* Create
* Assign
* Complete
* Follow-up

## QR

* Valid token
* Invalid token
* Unauthorized verification
* Audit creation

## Reports

* Permission
* Scope
* Generation
* Export

---

# 78. BUILD VERIFICATION

After implementation run the project's appropriate commands.

At minimum:

```text
npm run lint
npm run build
```

Also run the project's test suite.

If scripts differ, inspect `package.json` and use the project's actual commands.

Fix all errors before declaring the phase complete.

---

# 79. VISUAL QA

The implementation must preserve the existing Stitch-inspired design and current project direction.

Do not redesign working pages merely because the backend was implemented.

Verify:

* spacing
* typography
* tables
* cards
* forms
* buttons
* dialogs
* navigation
* responsive layouts
* empty states
* loading states
* error states

The flow should be implemented **without unnecessarily changing the existing visual design**.

---

# 80. FLOWCHART CONSISTENCY CHECK

Before final completion, verify:

```text
Every flowchart process
        ↓
Has a corresponding implementation
```

For every flowchart decision:

```text
Every decision
        ↓
Has both success and failure handling
```

For every protected process:

```text
Authentication
+
Authorization
+
Scope
```

For every important mutation:

```text
Database update
+
Audit log
```

For important user-facing events:

```text
Database event
+
Notification where appropriate
```

---

# 81. DOCUMENTATION REQUIREMENTS

Update:

```text
README.md
ARCHITECTURE.md
DATABASE.md
SECURITY.md
FLOW_IMPLEMENTATION.md
IMPLEMENTATION_PLAN.md
IMPLEMENTATION_PROGRESS.md
```

`FLOW_IMPLEMENTATION.md` must contain:

* Authentication flow
* Role routing
* Child flow
* Validation flow
* Duplicate flow
* Monitoring flow
* Intervention flow
* QR flow
* Reporting flow
* Administration flow
* Error flows
* Security flow

---

# 82. IMPLEMENTATION PROGRESS

Maintain a checklist:

```text
## Authentication
- [ ] Login
- [ ] Logout
- [ ] Sessions
- [ ] Role routing

## Authorization
- [ ] Permissions
- [ ] Route protection
- [ ] Barangay scope

## Child Registry
- [ ] List
- [ ] Search
- [ ] Add
- [ ] Profile
- [ ] Edit
- [ ] Archive

## Validation
- [ ] Queue
- [ ] Review
- [ ] Approve
- [ ] Reject
- [ ] Correction

## Duplicate Detection
- [ ] Matching
- [ ] Review
- [ ] Decision

## Monitoring
- [ ] Education
- [ ] OSY
- [ ] ECCD
- [ ] Disability

## Intervention
- [ ] Create
- [ ] Assignment
- [ ] Status
- [ ] Follow-up

## QR
- [ ] Generate
- [ ] Scan
- [ ] Verify
- [ ] Audit

## Reports
- [ ] Dashboard
- [ ] Builder
- [ ] Preview
- [ ] Export

## Administration
- [ ] Users
- [ ] Roles
- [ ] Permissions
- [ ] Schools
- [ ] Barangays
- [ ] Settings
- [ ] Audit Logs
```

Mark each item `[x]` only after it is actually implemented and tested.

---

# 83. IMPORTANT AI AGENT RULES

The implementing agent must:

1. Inspect the existing project before changing it.
2. Preserve existing working functionality.
3. Follow the existing architecture where reasonable.
4. Implement the flow incrementally.
5. Never replace working features with placeholders.
6. Never use fake database data once the real database is available.
7. Never bypass server-side authorization.
8. Never trust client-provided roles or permissions.
9. Never expose sensitive child information unnecessarily.
10. Never encode full child information in QR codes.
11. Never automatically merge possible duplicate children.
12. Never physically delete important historical child records without an explicit requirement.
13. Create audit records for important mutations.
14. Create notifications for important workflow events where required.
15. Test each flow after implementation.
16. Update implementation progress after every completed phase.
17. Fix errors before moving to the next phase.

---

# 84. FILE RESTRICTIONS

The agent must NOT read, expose, modify, or rewrite:

```text
.env
.env.local
.env.production
.env.development
.env.*
```

Only:

```text
.env.example
```

may be inspected or updated for environment documentation.

Never expose secrets in:

* source code
* logs
* documentation
* screenshots
* commits
* generated reports

---

# 85. FINAL ACCEPTANCE CRITERIA

The system flow implementation is complete only when:

### Authentication

* [ ] Login works.
* [ ] Logout works.
* [ ] Sessions work.
* [ ] Disabled users cannot authenticate.
* [ ] Roles are correctly identified.

### Authorization

* [ ] Permissions work.
* [ ] Protected routes work.
* [ ] Direct URL access is protected.
* [ ] Barangay scope is enforced server-side.
* [ ] LGU access is correctly scoped.
* [ ] Administrator permissions work.

### Child Lifecycle

* [ ] Child can be created.
* [ ] Child code is generated.
* [ ] Related child data is stored.
* [ ] Duplicate detection occurs.
* [ ] Validation workflow works.
* [ ] Correction workflow works.
* [ ] Verification works.
* [ ] Child profile works.
* [ ] Monitoring works.
* [ ] Intervention works.
* [ ] Follow-up works.
* [ ] Reports use child data.

### Validation

* [ ] Pending validation works.
* [ ] Approval works.
* [ ] Rejection works.
* [ ] Correction works.
* [ ] Resubmission works.

### Duplicate Detection

* [ ] Potential duplicates are detected.
* [ ] Candidates are stored.
* [ ] Human review is required.
* [ ] Decisions are recorded.

### Monitoring

* [ ] Education monitoring works.
* [ ] OSY monitoring works.
* [ ] ECCD monitoring works.
* [ ] Disability monitoring works.

### Intervention

* [ ] Interventions can be created.
* [ ] Interventions can be assigned.
* [ ] Status changes work.
* [ ] Follow-ups work.

### QR

* [ ] Secure token works.
* [ ] Verification works.
* [ ] Unauthorized information is not exposed.
* [ ] Verification is logged.

### Reports

* [ ] Reports use real database data.
* [ ] Filters work.
* [ ] Authorization is enforced.
* [ ] Preview works.
* [ ] Export works.

### Administration

* [ ] Users work.
* [ ] Roles work.
* [ ] Permissions work.
* [ ] Schools work.
* [ ] Barangays work.
* [ ] Settings work.
* [ ] Audit logs work.

### Quality

* [ ] No TypeScript errors.
* [ ] No lint errors.
* [ ] Production build succeeds.
* [ ] Automated tests pass.
* [ ] No critical browser console errors.
* [ ] No unauthorized API requests succeed.
* [ ] Responsive layouts work.
* [ ] Existing design remains intact.

---

# 86. FINAL SYSTEM FLOW

The completed application should ultimately implement this complete lifecycle:

```text
USER
  ↓
LOGIN
  ↓
AUTHENTICATION
  ↓
ROLE IDENTIFICATION
  ↓
PERMISSION CHECK
  ↓
DATA SCOPE CHECK
  ↓
ROLE-SPECIFIC DASHBOARD
  ↓
┌─────────────────────────────────────────────────────┐
│                                                     │
│  CHILD REGISTRY                                     │
│       ↓                                             │
│  ADD CHILD                                          │
│       ↓                                             │
│  ENTER INFORMATION                                  │
│       ↓                                             │
│  VALIDATE                                            │
│       ↓                                             │
│  DUPLICATE DETECTION                                │
│       ↓                                             │
│  SUBMIT                                             │
│       ↓                                             │
│  VALIDATION QUEUE                                   │
│       ↓                                             │
│  HUMAN REVIEW                                       │
│       ↓                                             │
│  ┌───────────────┬────────────────┐                │
│  ↓               ↓                ↓                │
│ APPROVE      CORRECTION         REJECT             │
│  ↓               ↓                                 │
│ VERIFIED       EDIT                                │
│  ↓               ↓                                 │
│ ACTIVE       RESUBMIT                              │
│  ↓               │                                 │
│  └───────────────┘                                 │
│       ↓                                             │
│  MONITORING                                         │
│       ↓                                             │
│  EDUCATION / OSY / ECCD / DISABILITY               │
│       ↓                                             │
│  INTERVENTION                                      │
│       ↓                                             │
│  FOLLOW-UP                                          │
│       ↓                                             │
│  REPORTING                                          │
│                                                     │
└─────────────────────────────────────────────────────┘

Supporting flows:

QR VERIFICATION
     ↓
SECURE TOKEN
     ↓
AUTHORIZATION
     ↓
SAFE RESULT
     ↓
AUDIT LOG

IMPORTANT SYSTEM ACTION
     ↓
AUDIT LOG
     ↓
NOTIFICATION WHEN REQUIRED

ADMINISTRATION
     ↓
USERS
ROLES
PERMISSIONS
SCHOOLS
BARANGAYS
SETTINGS
AUDIT LOGS
```

This is the target behavioral model for the web application.

The final implementation should be a **real, connected system where the UI, server logic, database, authorization, workflow states, notifications, audit trail, reports, and QR verification all follow this flow**, rather than merely presenting screens that look like the flowchart.
