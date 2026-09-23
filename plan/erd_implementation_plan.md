# Municipal Child Mapping System

## Complete Database & ERD Implementation Plan

> **Purpose:** This document is the authoritative implementation specification for the database layer of the Municipal Child Mapping System.
>
> The implementing AI agent will NOT receive a separate ERD. Therefore, this document contains the complete database structure, entities, fields, relationships, constraints, indexes, statuses, authorization rules, data lifecycle, and implementation requirements needed to build the database correctly.

---

# 1. PRIMARY OBJECTIVE

Implement a production-ready relational database for the Municipal Child Mapping System for the Municipality of Sta. Magdalena, Sorsogon.

The database must support:

* User authentication
* Role-based access control
* Barangay-level access scoping
* Municipality and barangay reference data
* School reference data
* Child registration
* Child demographic information
* Child address information
* Educational information
* ECCD information
* Disability information
* Child validation
* Duplicate detection
* Child monitoring
* Intervention management
* Intervention follow-ups
* QR verification
* Report generation
* Report export tracking
* Notifications
* Audit logging
* System settings

The database must support this lifecycle:

```text
User
  ↓
Authentication
  ↓
Authorization
  ↓
Child Registration
  ↓
Information Validation
  ↓
Duplicate Detection
  ↓
Human Review
  ↓
Verification
  ↓
Active Child Record
  ↓
Monitoring
  ↓
Intervention
  ↓
Follow-up
  ↓
Reporting
```

---

# 2. IMPORTANT IMPLEMENTATION RULES

## 2.1 Do NOT invent a different schema

Implement the database according to the tables and relationships defined in this document.

Do not:

* Rename entities without a documented technical reason.
* Merge unrelated tables.
* Remove tables because the frontend does not immediately use them.
* Put every child field into one giant `children` table.
* Create a `school_users` table.
* Create a `school_user` role.
* Store repeated information as comma-separated strings.
* Store multiple interventions in one child column.
* Store multiple follow-ups in one intervention column.
* Store multiple permissions as JSON inside roles.

---

# 3. TECHNOLOGY

Use the project's existing database stack if already configured.

If the project is using:

* Next.js
* TypeScript
* Turso/libSQL
* Drizzle ORM

then use the existing architecture rather than introducing another ORM.

The database layer should provide:

* Type-safe schema
* Migrations
* Foreign keys
* Indexes
* Constraints
* Transactions
* Seed data
* Validation
* Server-side authorization

Do not replace a working database architecture unnecessarily.

---

# 4. DATABASE ENTITY GROUPS

The database consists of these entities.

## User Management

1. `roles`
2. `permissions`
3. `role_permissions`
4. `users`

## Location and Reference Data

5. `municipalities`
6. `barangays`
7. `schools`

## Child Data

8. `children`
9. `child_addresses`
10. `child_education`
11. `child_eccd`
12. `child_disabilities`

## Validation

13. `child_validations`
14. `child_duplicate_candidates`

## Monitoring and Intervention

15. `child_monitoring`
16. `interventions`
17. `intervention_followups`

## Verification and Reporting

18. `qr_verifications`
19. `reports`
20. `report_exports`

## System Management

21. `notifications`
22. `audit_logs`
23. `system_settings`

The implementation must account for all 23 tables.

---

# 5. ENTITY: municipalities

## Purpose

Stores municipality-level reference information.

## Fields

```text
municipalities
-------------------------
id                  PK
name                UNIQUE
province
region
is_active
created_at
updated_at
```

## Recommended types

```text
id          integer
name        varchar(150)
province    varchar(150)
region      varchar(150)
is_active   boolean
created_at  datetime
updated_at  datetime
```

## Constraints

* `id` primary key.
* `name` unique.
* `is_active` defaults to `true`.

---

# 6. ENTITY: barangays

## Purpose

Stores barangay reference data.

## Fields

```text
barangays
-------------------------
id                  PK
municipality_id     FK
name                UNIQUE
code                UNIQUE
is_active
created_at
updated_at
```

## Relationships

```text
municipalities 1 ──── N barangays
```

Foreign key:

```text
barangays.municipality_id
        ↓
municipalities.id
```

## Indexes

Create indexes for:

* `municipality_id`
* `name`
* `is_active`

---

# 7. ENTITY: schools

## Purpose

Stores school reference information.

Schools are reference entities.

They are NOT application users.

There must NOT be a `school_user` role.

## Fields

```text
schools
-------------------------
id
barangay_id
name
school_code
school_type
address
is_active
created_at
updated_at
```

## Relationships

```text
barangays 1 ──── N schools
```

Foreign key:

```text
schools.barangay_id
        ↓
barangays.id
```

`barangay_id` may be nullable if a school is not assigned to a barangay in the reference data.

---

# 8. ENTITY: roles

## Purpose

Defines system roles.

## Fields

```text
roles
-------------------------
id
name
description
created_at
updated_at
```

## Required roles

Seed exactly these initial roles:

```text
Barangay User
LGU User
System Administrator
```

Do NOT create:

```text
School User
School Administrator
Teacher User
```

unless a future requirement explicitly introduces them.

---

# 9. ENTITY: permissions

## Purpose

Stores granular permissions.

## Fields

```text
permissions
-------------------------
id
name
module
action
description
created_at
```

## Suggested permissions

### Child Registry

```text
children.view
children.create
children.update
children.archive
```

### Validation

```text
validation.view
validation.submit
validation.review
validation.approve
validation.reject
validation.correct
```

### Duplicate Detection

```text
duplicates.view
duplicates.review
duplicates.confirm
duplicates.dismiss
```

### Monitoring

```text
monitoring.view
monitoring.create
monitoring.update
```

### Interventions

```text
interventions.view
interventions.create
interventions.update
interventions.complete
interventions.followup
```

### Reports

```text
reports.view
reports.generate
reports.export
```

### QR

```text
qr.verify
```

### Users

```text
users.view
users.create
users.update
users.disable
```

### Audit

```text
audit_logs.view
```

### Settings

```text
settings.view
settings.manage
```

The final permission list may be expanded if the existing application already defines additional modules.

---

# 10. ENTITY: role_permissions

## Purpose

Connect roles to permissions.

## Fields

```text
role_permissions
-------------------------
role_id
permission_id
created_at
```

Composite primary key:

```text
(role_id, permission_id)
```

## Relationship

```text
roles N ──── N permissions
       │
       └── role_permissions
```

---

# 11. ENTITY: users

## Purpose

Stores authenticated application users.

## Fields

```text
users
-------------------------
id
role_id
barangay_id
first_name
middle_name
last_name
email
password_hash
phone
is_active
last_login_at
created_at
updated_at
```

## Types

```text
id              integer
role_id         integer
barangay_id     integer nullable
first_name      varchar(100)
middle_name     varchar(100) nullable
last_name       varchar(100)
email           varchar(255)
password_hash   varchar(255)
phone           varchar(30) nullable
is_active       boolean
last_login_at   datetime nullable
created_at      datetime
updated_at      datetime
```

## Relationships

```text
roles 1 ──── N users

barangays 1 ──── N users
```

## Important rules

Email must be unique.

Password must never be stored as plaintext.

`password_hash` must contain only a secure password hash.

Barangay Users should have a `barangay_id`.

LGU Users may have no barangay restriction.

System Administrators may have no barangay restriction.

---

# 12. ENTITY: children

This is the central database entity.

## Purpose

Stores the core child identity and demographic record.

## Fields

```text
children
-------------------------
id
child_code
first_name
middle_name
last_name
suffix
birth_date
sex
civil_status
birth_place
barangay_id
status
record_status
created_by
updated_by
created_at
updated_at
```

## Types

```text
id              integer
child_code      varchar(50)
first_name      varchar(100)
middle_name     varchar(100) nullable
last_name       varchar(100)
suffix          varchar(20) nullable
birth_date      date
sex             varchar(30)
civil_status    varchar(50) nullable
birth_place     varchar(255) nullable
barangay_id     integer
status          varchar(30)
record_status   varchar(40)
created_by      integer
updated_by      integer nullable
created_at      datetime
updated_at      datetime
```

## Child code

Generate unique codes such as:

```text
CM-2026-000001
CM-2026-000002
CM-2026-000003
```

The code must be unique.

Do not rely on the frontend to generate it.

Generate it server-side.

---

# 13. CHILD STATUS

Use a controlled set of values.

Recommended:

```text
active
inactive
archived
```

---

# 14. CHILD RECORD STATUS

This represents the workflow state.

Use:

```text
draft
pending_validation
needs_correction
verified
marked_duplicate
```

The record lifecycle should be:

```text
draft
  ↓
pending_validation
  ↓
verified
  ↓
active
```

Correction:

```text
pending_validation
  ↓
needs_correction
  ↓
edit
  ↓
pending_validation
```

Duplicate:

```text
pending_validation
  ↓
marked_duplicate
```

Do not automatically mark a record as duplicate based only on name similarity.

---

# 15. CHILD RELATIONSHIPS

The `children` entity is related to:

```text
children
 ├── child_addresses
 ├── child_education
 ├── child_eccd
 ├── child_disabilities
 ├── child_validations
 ├── child_duplicate_candidates
 ├── child_monitoring
 ├── interventions
 └── qr_verifications
```

---

# 16. ENTITY: child_addresses

## Purpose

Stores current and historical residence information.

## Fields

```text
child_addresses
-------------------------
id
child_id
barangay_id
household_address
sitio
is_current
created_at
updated_at
```

## Relationships

```text
children 1 ──── N child_addresses

barangays 1 ──── N child_addresses
```

A child may have multiple historical addresses.

Only one address should normally be marked as current.

---

# 17. ENTITY: child_education

## Purpose

Stores educational information.

## Fields

```text
child_education
-------------------------
id
child_id
school_id
education_status
grade_level
school_year
enrollment_status
is_current
created_at
updated_at
```

## Relationships

```text
children 1 ──── N child_education

schools 1 ──── N child_education
```

## Education status values

Recommended:

```text
enrolled
out_of_school
not_yet_in_school
graduated
unknown
```

Do not store school names directly in `children`.

Use:

```text
child_education.school_id
        ↓
schools.id
```

---

# 18. ENTITY: child_eccd

## Purpose

Stores Early Childhood Care and Development information.

## Fields

```text
child_eccd
-------------------------
id
child_id
participation_status
program_name
provider
start_date
end_date
remarks
created_at
updated_at
```

## Relationship

```text
children 1 ──── N child_eccd
```

---

# 19. ENTITY: child_disabilities

## Purpose

Stores disability and support information.

## Fields

```text
child_disabilities
-------------------------
id
child_id
has_disability
disability_type
description
support_needed
assistance_status
verified
created_at
updated_at
```

## Relationship

```text
children 1 ──── N child_disabilities
```

## Security

This information is sensitive.

Access must be permission-controlled.

Do not expose disability information unnecessarily in:

* QR results
* URLs
* browser local storage
* notifications
* audit logs
* public reports

---

# 20. ENTITY: child_validations

## Purpose

Tracks the validation workflow.

## Fields

```text
child_validations
-------------------------
id
child_id
submitted_by
reviewed_by
status
remarks
submitted_at
reviewed_at
created_at
updated_at
```

## Relationships

```text
children 1 ──── N child_validations

users 1 ──── N child_validations
```

`submitted_by` and `reviewed_by` both reference `users.id`.

`reviewed_by` may be nullable until review occurs.

---

# 21. VALIDATION STATUS

Use:

```text
pending
approved
needs_correction
rejected
```

Validation should never simply overwrite historical validation records.

Each important validation action should be traceable.

---

# 22. ENTITY: child_duplicate_candidates

## Purpose

Stores potential duplicate child records.

## Fields

```text
child_duplicate_candidates
-------------------------
id
child_id
possible_child_id
match_score
match_reason
status
reviewed_by
review_notes
created_at
updated_at
```

## Relationships

There are TWO relationships to `children`.

```text
child_id
    ↓
children.id

possible_child_id
    ↓
children.id
```

This is a self-referencing relationship.

`reviewed_by` references:

```text
users.id
```

---

# 23. DUPLICATE STATUS

Use:

```text
pending
confirmed_duplicate
not_duplicate
dismissed
```

Duplicate detection must be a **human-reviewed process**.

Do not automatically merge records based only on:

* same first name
* same last name
* similar spelling
* same birthday

Use multiple matching attributes and require authorized review.

---

# 24. ENTITY: child_monitoring

## Purpose

Stores ongoing monitoring activities.

## Fields

```text
child_monitoring
-------------------------
id
child_id
monitoring_type
status
observed_at
recorded_by
remarks
created_at
updated_at
```

## Relationships

```text
children 1 ──── N child_monitoring

users 1 ──── N child_monitoring
```

## Monitoring types

```text
education
out_of_school_youth
eccd
disability
general
```

This allows future monitoring categories without modifying the `children` table.

---

# 25. ENTITY: interventions

## Purpose

Stores interventions provided or planned for children.

## Fields

```text
interventions
-------------------------
id
child_id
intervention_type
description
status
priority
start_date
target_date
completed_date
assigned_to
created_by
created_at
updated_at
```

## Relationships

```text
children 1 ──── N interventions

users 1 ──── N interventions
```

Both:

```text
assigned_to
created_by
```

reference:

```text
users.id
```

---

# 26. INTERVENTION STATUS

Use:

```text
planned
ongoing
completed
cancelled
```

---

# 27. ENTITY: intervention_followups

## Purpose

Stores follow-up activities for interventions.

## Fields

```text
intervention_followups
-------------------------
id
intervention_id
follow_up_date
status
notes
recorded_by
created_at
```

## Relationship

```text
interventions 1 ──── N intervention_followups
```

`recorded_by` references:

```text
users.id
```

---

# 28. ENTITY: qr_verifications

## Purpose

Records QR verification events.

## Fields

```text
qr_verifications
-------------------------
id
child_id
verification_token
verified_by
verification_type
result
verified_at
ip_address
user_agent
```

## Relationships

```text
children 1 ──── N qr_verifications

users 1 ──── N qr_verifications
```

`verified_by` may be nullable if the verification is performed through a public verification endpoint.

---

# 29. QR SECURITY

Never place the entire child record inside the QR code.

Do NOT encode:

```text
full name
birth date
address
disability information
phone number
email
```

Instead encode a secure reference/token.

Example concept:

```text
QR
 ↓
Secure Token
 ↓
Server
 ↓
Validate Token
 ↓
Authorization
 ↓
Return Minimum Necessary Information
 ↓
Create QR Verification Log
```

The token should be unpredictable and protected.

---

# 30. ENTITY: reports

## Purpose

Stores generated report definitions/history.

## Fields

```text
reports
-------------------------
id
name
report_type
generated_by
scope
filters_json
created_at
```

## Relationship

```text
users 1 ──── N reports
```

`filters_json` may store report filter configuration where appropriate.

Do not store sensitive data unnecessarily in the JSON.

---

# 31. ENTITY: report_exports

## Purpose

Tracks generated report files.

## Fields

```text
report_exports
-------------------------
id
report_id
format
file_reference
generated_by
created_at
expires_at
```

## Relationships

```text
reports 1 ──── N report_exports

users 1 ──── N report_exports
```

Supported formats may include:

```text
PDF
XLSX
CSV
```

---

# 32. ENTITY: notifications

## Purpose

Stores in-app notifications.

## Fields

```text
notifications
-------------------------
id
user_id
type
title
message
link
is_read
created_at
read_at
```

## Relationship

```text
users 1 ──── N notifications
```

Examples:

```text
Validation request
Correction required
Duplicate review required
Intervention follow-up
System notification
```

---

# 33. ENTITY: audit_logs

## Purpose

Provides the system audit trail.

## Fields

```text
audit_logs
-------------------------
id
user_id
action
entity_type
entity_id
old_values_json
new_values_json
ip_address
user_agent
created_at
```

## Relationship

```text
users 1 ──── N audit_logs
```

`user_id` may be nullable for system-generated events.

---

# 34. AUDIT LOG RULES

Important actions must generate audit records.

Examples:

```text
LOGIN
LOGOUT

CREATE_CHILD
UPDATE_CHILD
ARCHIVE_CHILD

SUBMIT_VALIDATION
APPROVE_VALIDATION
REJECT_VALIDATION
REQUEST_CORRECTION

CREATE_DUPLICATE_REVIEW
CONFIRM_DUPLICATE
DISMISS_DUPLICATE

CREATE_MONITORING
UPDATE_MONITORING

CREATE_INTERVENTION
UPDATE_INTERVENTION
COMPLETE_INTERVENTION

VERIFY_QR

GENERATE_REPORT
EXPORT_REPORT

CREATE_USER
UPDATE_USER
DISABLE_USER

UPDATE_SETTINGS
```

Audit logs should be append-only.

Ordinary users must not be able to edit or delete audit records.

---

# 35. ENTITY: system_settings

## Purpose

Stores configurable non-secret system settings.

## Fields

```text
system_settings
-------------------------
id
key
value
description
updated_by
updated_at
```

## Relationships

```text
users 1 ──── N system_settings
```

`updated_by` references `users.id`.

Do NOT store:

* database passwords
* API keys
* authentication secrets
* private keys
* session secrets

in this table.

---

# 36. COMPLETE RELATIONSHIP MAP

The complete database relationship structure is:

```text
MUNICIPALITIES
      │
      └────< BARANGAYS
                 │
                 ├────< USERS
                 │
                 ├────< SCHOOLS
                 │
                 ├────< CHILDREN
                 │          │
                 │          ├────< CHILD_ADDRESSES
                 │          │
                 │          ├────< CHILD_EDUCATION >──── SCHOOLS
                 │          │
                 │          ├────< CHILD_ECCD
                 │          │
                 │          ├────< CHILD_DISABILITIES
                 │          │
                 │          ├────< CHILD_VALIDATIONS
                 │          │
                 │          ├────< CHILD_DUPLICATE_CANDIDATES
                 │          │
                 │          ├────< CHILD_MONITORING
                 │          │
                 │          ├────< INTERVENTIONS
                 │          │          │
                 │          │          └────< INTERVENTION_FOLLOWUPS
                 │          │
                 │          └────< QR_VERIFICATIONS
                 │
                 └────< CHILD_ADDRESSES


ROLES
  │
  ├────< USERS
  │
  └────< ROLE_PERMISSIONS >──── PERMISSIONS


USERS
  │
  ├────< CHILD_VALIDATIONS
  ├────< CHILD_DUPLICATE_CANDIDATES
  ├────< CHILD_MONITORING
  ├────< INTERVENTIONS
  ├────< INTERVENTION_FOLLOWUPS
  ├────< QR_VERIFICATIONS
  ├────< REPORTS
  ├────< REPORT_EXPORTS
  ├────< NOTIFICATIONS
  ├────< AUDIT_LOGS
  └────< SYSTEM_SETTINGS


REPORTS
  │
  └────< REPORT_EXPORTS
```

---

# 37. COMPLETE TABLE RELATIONSHIP REFERENCE

The implementation must establish these relationships.

| Parent         | Child                      | Relationship |
| -------------- | -------------------------- | ------------ |
| municipalities | barangays                  | 1:N          |
| barangays      | users                      | 1:N          |
| barangays      | schools                    | 1:N          |
| barangays      | children                   | 1:N          |
| barangays      | child_addresses            | 1:N          |
| roles          | users                      | 1:N          |
| roles          | role_permissions           | 1:N          |
| permissions    | role_permissions           | 1:N          |
| children       | child_addresses            | 1:N          |
| children       | child_education            | 1:N          |
| schools        | child_education            | 1:N          |
| children       | child_eccd                 | 1:N          |
| children       | child_disabilities         | 1:N          |
| children       | child_validations          | 1:N          |
| users          | child_validations          | 1:N          |
| children       | child_duplicate_candidates | 1:N          |
| users          | child_duplicate_candidates | 1:N          |
| children       | child_monitoring           | 1:N          |
| users          | child_monitoring           | 1:N          |
| children       | interventions              | 1:N          |
| users          | interventions              | 1:N          |
| interventions  | intervention_followups     | 1:N          |
| users          | intervention_followups     | 1:N          |
| children       | qr_verifications           | 1:N          |
| users          | qr_verifications           | 1:N          |
| users          | reports                    | 1:N          |
| reports        | report_exports             | 1:N          |
| users          | report_exports             | 1:N          |
| users          | notifications              | 1:N          |
| users          | audit_logs                 | 1:N          |
| users          | system_settings            | 1:N          |

---

# 38. SELF-REFERENCING DUPLICATE RELATIONSHIP

`child_duplicate_candidates` contains two foreign keys pointing to the same table.

```text
child_duplicate_candidates.child_id
              ↓
          children.id

child_duplicate_candidates.possible_child_id
              ↓
          children.id
```

This means:

```text
Child A
   │
   └── possible duplicate ──→ Child B
```

Do not accidentally create a separate duplicate-child table.

---

# 39. FOREIGN KEY DELETE STRATEGY

Be extremely careful with deletion.

Do not configure dangerous cascading deletes on core child information.

For important relationships, prefer:

```text
RESTRICT
SET NULL
SOFT DELETE
```

depending on the relationship.

Example:

Deleting a user should NOT automatically delete:

* children
* validations
* interventions
* audit logs
* reports

Historical records must remain available.

If a user is no longer active, prefer:

```text
users.is_active = false
```

instead of deleting the user.

---

# 40. INDEXING PLAN

Implement indexes for frequently queried fields.

## users

```text
email
role_id
barangay_id
is_active
last_login_at
```

## barangays

```text
municipality_id
name
is_active
```

## schools

```text
barangay_id
name
school_code
is_active
```

## children

```text
child_code
last_name
first_name
birth_date
barangay_id
status
record_status
created_at
```

## child_addresses

```text
child_id
barangay_id
is_current
```

## child_education

```text
child_id
school_id
education_status
school_year
is_current
```

## child_eccd

```text
child_id
participation_status
```

## child_disabilities

```text
child_id
has_disability
verified
```

## child_validations

```text
child_id
status
submitted_at
submitted_by
reviewed_by
```

## duplicate candidates

```text
child_id
possible_child_id
status
reviewed_by
```

## monitoring

```text
child_id
monitoring_type
status
observed_at
recorded_by
```

## interventions

```text
child_id
status
priority
target_date
assigned_to
```

## follow-ups

```text
intervention_id
follow_up_date
status
recorded_by
```

## QR

```text
child_id
verification_token
verified_by
result
verified_at
```

## reports

```text
report_type
generated_by
created_at
```

## audit logs

```text
user_id
action
entity_type
entity_id
created_at
```

---

# 41. UNIQUE CONSTRAINTS

Implement unique constraints for:

```text
roles.name

permissions.name

users.email

municipalities.name

barangays.name
```

For barangays, consider a composite uniqueness rule if the application could eventually support multiple municipalities:

```text
(municipality_id, name)
```

Schools:

```text
school_code
```

Children:

```text
child_code
```

QR:

```text
verification_token
```

System settings:

```text
key
```

Do NOT make a child's name unique.

Multiple children can legitimately have the same name.

---

# 42. DATA VALIDATION

Database constraints are not enough.

Use three validation layers:

```text
Frontend Validation
       ↓
Server Validation
       ↓
Database Constraints
```

Use Zod or the project's existing validation library for server-side validation.

The server must never trust frontend validation.

---

# 43. TRANSACTIONS

Use database transactions for multi-table operations.

Example:

Creating a complete child record may involve:

```text
children
+
child_addresses
+
child_education
+
child_eccd
+
child_disabilities
+
audit_logs
```

If one critical operation fails, the transaction should roll back where appropriate.

Another example:

```text
Approve Validation
        ↓
Update child.record_status
        ↓
Create validation history
        ↓
Create notification
        ↓
Create audit log
```

These related operations should be handled consistently.

---

# 44. CHILD CREATION FLOW

Implement:

```text
Add Child
    ↓
Validate Input
    ↓
Create Child
    ↓
Generate Child Code
    ↓
Create Related Information
    ↓
Run Duplicate Detection
    ↓
Create Validation Record
    ↓
Create Audit Log
    ↓
Notify Appropriate Reviewer
```

Do not perform all of this solely in client-side JavaScript.

---

# 45. VALIDATION FLOW

```text
Child Record
     ↓
Submit
     ↓
child.record_status =
pending_validation
     ↓
Create child_validations record
     ↓
Reviewer Opens Queue
     ↓
Review
     ↓
 ┌───────────────┬─────────────────┐
 ↓               ↓                 ↓
Approve      Needs Correction    Reject
 ↓               ↓                 ↓
Verified     Edit Required      Rejected
 ↓               ↓
Active         Resubmit
```

Every important transition must be auditable.

---

# 46. DUPLICATE DETECTION FLOW

```text
New Child
   ↓
Potential Match Search
   ↓
Possible Match Found?
   ↓
 ┌───────────────┐
 │      No       │────→ Continue
 └───────────────┘

        OR

Possible Match
   ↓
Create child_duplicate_candidates
   ↓
Human Review
   ↓
 ┌───────────────┬────────────────┐
 ↓               ↓                ↓
Duplicate    Not Duplicate      Dismiss
```

Never automatically merge child records.

---

# 47. BARANGAY DATA SCOPING

This is critical.

For Barangay Users:

```text
users.barangay_id
        ↓
children.barangay_id
```

The server must enforce this relationship.

Example:

```text
Barangay A User
      ↓
Only authorized Barangay A records
```

A malicious user must not be able to modify:

```text
?barangay_id=other_barangay
```

and gain access.

Never rely on hidden frontend fields.

---

# 48. LGU ACCESS

LGU Users may have municipality-wide access according to their assigned permissions.

Conceptually:

```text
LGU User
   ↓
Municipality
   ↓
Barangays
   ↓
Children
```

The authorization layer should determine exactly which operations the LGU User can perform.

---

# 49. SYSTEM ADMINISTRATOR

The System Administrator manages system-level entities.

Potential access includes:

```text
Users
Roles
Permissions
Barangays
Schools
Settings
Audit Logs
System Configuration
```

Administrative permissions must still be checked server-side.

---

# 50. REPORT DATA ACCESS

Reports must respect authorization.

Never allow:

```text
POST /reports
{
  "barangay_id": "another-barangay"
}
```

to bypass authorization.

Report scope must be determined and validated server-side.

---

# 51. QR VERIFICATION FLOW

```text
Scan QR
   ↓
Extract Secure Token
   ↓
Server Receives Token
   ↓
Find qr_verifications / token reference
   ↓
Validate Token
   ↓
Check Authorization
   ↓
Retrieve Minimum Necessary Child Information
   ↓
Display Verification Result
   ↓
Create QR Verification Log
   ↓
Create Audit Event
```

Do not expose sensitive child information simply because someone has a QR code.

---

# 52. AUDIT LOGGING ARCHITECTURE

Important database mutations should use a consistent audit helper.

Conceptually:

```text
performAction()
      ↓
database mutation
      ↓
audit log
```

The implementation should avoid every page manually constructing audit records differently.

Create a reusable server-side audit utility.

Example conceptual API:

```text
createAuditLog({
  userId,
  action,
  entityType,
  entityId,
  oldValues,
  newValues
})
```

Never trust the browser to submit the audit user ID.

Use the authenticated server session.

---

# 53. SOFT DELETION / ARCHIVING

Because child records are important historical data, avoid destructive deletion.

Prefer statuses such as:

```text
active
inactive
archived
```

For users:

```text
is_active = false
```

For children:

```text
status = archived
```

For historical records, retain the database record when possible.

---

# 54. DATABASE MIGRATION PLAN

Create migrations in dependency order.

## Migration 001

Create:

```text
municipalities
roles
permissions
```

## Migration 002

Create:

```text
barangays
role_permissions
```

## Migration 003

Create:

```text
users
schools
```

## Migration 004

Create:

```text
children
child_addresses
child_education
child_eccd
child_disabilities
```

## Migration 005

Create:

```text
child_validations
child_duplicate_candidates
```

## Migration 006

Create:

```text
child_monitoring
interventions
intervention_followups
```

## Migration 007

Create:

```text
qr_verifications
```

## Migration 008

Create:

```text
reports
report_exports
```

## Migration 009

Create:

```text
notifications
audit_logs
system_settings
```

Run migrations in dependency order.

---

# 55. SEED DATA

Create a development seed script.

Seed:

### Municipality

```text
Sta. Magdalena
```

### Roles

```text
Barangay User
LGU User
System Administrator
```

### Permissions

Seed all required permissions.

### Barangays

Use fictional/demo data if actual administrative data is not available.

### Schools

Use fictional/demo schools.

### Users

Create development-only accounts.

Do NOT place real passwords or real child information into the repository.

---

# 56. DEMO DATA RULE

Never seed real children's information.

Use clearly fictional records.

Example:

```text
Juan Demo
Maria Sample
Pedro Test
```

Do not use actual:

* names
* addresses
* birth dates
* disability information
* phone numbers
* school records

in development seed data.

---

# 57. FRONTEND DATABASE INTEGRATION

After creating the schema, replace static/mock data progressively.

The frontend should obtain real data from the database through the application's server architecture.

Do not:

```text
Dashboard → hardcoded numbers
Registry → static array
Reports → fake generated data
```

after the database is implemented.

Use real queries.

---

# 58. CHILD REGISTRY INTEGRATION

The Child Registry must support:

* Search
* Pagination
* Barangay filtering
* Educational status filtering
* Record status filtering
* Verification status
* Date filtering
* Sorting

Do not load thousands of child records into the browser.

Use server-side pagination.

---

# 59. CHILD PROFILE INTEGRATION

The child profile should combine information from:

```text
children
child_addresses
child_education
child_eccd
child_disabilities
child_validations
child_monitoring
interventions
child_duplicate_candidates
qr_verifications
```

Do not duplicate these values into a second "profile" table unless there is a specific architectural requirement.

---

# 60. DASHBOARD QUERIES

Dashboard metrics should be derived from real data.

Potential metrics:

```text
Total Children

Verified Children

Pending Validation

Needs Correction

Potential Duplicates

Out-of-School Youth

ECCD Non-Participation

Children with Disability

Active Interventions

Completed Interventions
```

All metrics must respect the current user's authorization scope.

---

# 61. BARANGAY MONITORING

Monitoring pages should query:

```text
children
child_education
child_eccd
child_disabilities
child_monitoring
interventions
```

Examples:

```text
OSY
ECCD
Disability
Interventions
Educational Status
```

Barangay Users must only see authorized records.

LGU Users can view municipality-level data according to their permissions.

---

# 62. REPORTING

Report queries should be built from normalized tables.

For example:

### OSY Report

Use:

```text
children
+
child_education
+
barangays
```

### ECCD Report

Use:

```text
children
+
child_eccd
+
barangays
```

### Disability Report

Use:

```text
children
+
child_disabilities
+
barangays
```

### Intervention Report

Use:

```text
children
+
interventions
+
intervention_followups
+
barangays
```

Do not create duplicate reporting tables containing copies of the entire child registry.

---

# 63. PERFORMANCE REQUIREMENTS

The database implementation should remain performant as records grow.

Use:

* Proper indexes
* Server-side pagination
* Filtered queries
* Select only required columns
* Avoid N+1 queries
* Query batching where appropriate
* Database transactions
* Appropriate joins
* Debounced search
* Query caching only where safe

Do not fetch entire tables just to calculate dashboard metrics in the browser.

---

# 64. SECURITY REQUIREMENTS

Implement:

* Password hashing
* Secure authentication
* Server-side authorization
* Role-based permissions
* Barangay-level data scoping
* Input validation
* SQL injection protection through ORM/parameterized queries
* Secure session handling
* Rate limiting where appropriate
* Secure headers
* Audit logging
* Minimal data exposure
* Secure QR tokens
* Safe report generation

Never expose database credentials.

---

# 65. ENVIRONMENT FILE RULE

The AI agent must NOT read or modify:

```text
.env
.env.local
.env.production
.env.development
.env.*
```

The only allowed environment configuration file to inspect or modify is:

```text
.env.example
```

Never expose secrets in source code, logs, documentation, screenshots, or commits.

---

# 66. API / SERVER ARCHITECTURE

Database operations must happen on the server.

Use the project's existing Next.js architecture.

Appropriate mechanisms may include:

```text
Server Components
Server Actions
Route Handlers
Server-side service functions
```

depending on the existing codebase.

Do not expose raw database credentials or direct database access to client components.

---

# 67. DATABASE SERVICE LAYER

Avoid putting complex database queries directly into UI components.

Create a structured data-access layer.

Conceptually:

```text
lib/
├── db/
│   ├── schema/
│   ├── migrations/
│   ├── queries/
│   └── index
│
├── services/
│   ├── children
│   ├── validation
│   ├── monitoring
│   ├── interventions
│   ├── reports
│   └── qr
│
└── auth/
```

Follow the existing project's architecture if it already has an equivalent structure.

---

# 68. DATABASE QUERY SERVICES

Create reusable server-side services for:

```text
createChild()
getChild()
updateChild()
archiveChild()

submitChildValidation()
reviewChildValidation()

findPotentialDuplicates()
reviewDuplicate()

createMonitoringRecord()
updateMonitoringRecord()

createIntervention()
updateIntervention()
createFollowUp()

verifyQrToken()

generateReport()
createReportExport()

createNotification()

createAuditLog()
```

Do not duplicate the same database logic across pages.

---

# 69. TESTING PLAN

Create database tests for:

### User

* Create user
* Duplicate email rejected
* Disable user
* Role assignment

### Child

* Create child
* Unique child code
* Update child
* Archive child
* Invalid data rejected

### Validation

* Submit validation
* Approve
* Reject
* Request correction

### Duplicate Detection

* Create candidate
* Review candidate
* Confirm duplicate
* Mark not duplicate

### Monitoring

* Create monitoring record
* Update monitoring record

### Intervention

* Create intervention
* Update status
* Create follow-up

### QR

* Valid token
* Invalid token
* Expired/revoked token if implemented
* Verification audit log

### Authorization

Test:

```text
Barangay A user
    ↓
Barangay A child → allowed

Barangay A user
    ↓
Barangay B child → denied
```

This is one of the most important security tests.

---

# 70. MIGRATION TESTING

After migrations:

```text
Run migrations
        ↓
Verify tables
        ↓
Verify foreign keys
        ↓
Verify indexes
        ↓
Run seed
        ↓
Run application
        ↓
Test CRUD
```

Make sure the database can be recreated from migrations without manually editing the database.

---

# 71. DATABASE DOCUMENTATION

Create:

```text
DATABASE.md
```

It should document:

* Database architecture
* All 23 tables
* Every relationship
* Important fields
* Status values
* Indexes
* Constraints
* Migration process
* Seed process
* Data-scoping rules
* Security rules
* Audit logging
* QR security
* Backup/recovery considerations

The documentation must match the actual schema.

---

# 72. IMPLEMENTATION PHASES

## PHASE 1 — Existing Project Audit

Before modifying anything:

* Inspect package.json
* Inspect Next.js version
* Inspect database configuration
* Inspect Drizzle configuration if present
* Inspect existing schema
* Inspect migrations
* Inspect authentication
* Inspect authorization
* Inspect existing API/server actions
* Inspect existing components
* Inspect existing routes

Do not destroy existing functionality.

---

## PHASE 2 — Database Architecture

Create:

* Database configuration
* Schema organization
* Migration strategy
* Seed strategy
* Database utilities

---

## PHASE 3 — Reference Tables

Implement:

* municipalities
* barangays
* schools
* roles
* permissions
* role_permissions

Seed initial reference data.

---

## PHASE 4 — Authentication

Implement:

* users
* password hashing
* sessions
* login
* logout
* user activation/deactivation

Connect users to roles and barangays.

---

## PHASE 5 — Child Registry

Implement:

* children
* child_addresses
* child_education
* child_eccd
* child_disabilities

Connect the UI to real database queries.

---

## PHASE 6 — Validation

Implement:

* child_validations
* validation queue
* approval
* rejection
* correction workflow
* audit logging

---

## PHASE 7 — Duplicate Detection

Implement:

* child_duplicate_candidates
* duplicate matching
* duplicate review
* confirmation
* dismissal
* audit logging

---

## PHASE 8 — Monitoring

Implement:

* child_monitoring
* monitoring dashboards
* OSY
* ECCD
* disability
* education monitoring

---

## PHASE 9 — Interventions

Implement:

* interventions
* intervention_followups
* intervention status
* follow-up tracking
* notifications

---

## PHASE 10 — QR

Implement:

* secure QR token generation
* QR verification
* minimal information display
* verification history
* audit logging

---

## PHASE 11 — Reporting

Implement:

* reports
* report_exports
* filtering
* scope restrictions
* PDF
* XLSX/CSV where required

---

## PHASE 12 — System Management

Implement:

* notifications
* audit_logs
* system_settings
* user management
* permission management

---

# 73. UI TO DATABASE MAPPING

Map application screens to database entities.

## Dashboard

Uses:

```text
children
child_education
child_eccd
child_disabilities
child_monitoring
interventions
```

## Child Registry

Uses:

```text
children
barangays
```

## Add Child

Uses:

```text
children
child_addresses
child_education
child_eccd
child_disabilities
```

## Child Profile

Uses:

```text
children
child_addresses
child_education
child_eccd
child_disabilities
child_validations
child_monitoring
interventions
child_duplicate_candidates
```

## Validation

Uses:

```text
child_validations
children
users
```

## Duplicate Detection

Uses:

```text
child_duplicate_candidates
children
users
```

## Monitoring

Uses:

```text
child_monitoring
child_education
child_eccd
child_disabilities
```

## Intervention

Uses:

```text
interventions
intervention_followups
children
users
```

## QR Verification

Uses:

```text
qr_verifications
children
users
```

## Reports

Uses:

```text
reports
report_exports
```

plus the relevant child/monitoring tables.

## Notifications

Uses:

```text
notifications
users
```

## Activity Logs

Uses:

```text
audit_logs
users
```

## User Management

Uses:

```text
users
roles
permissions
role_permissions
barangays
```

---

# 74. IMPORTANT DATA FLOW

The final implementation should follow this conceptual architecture:

```text
                 AUTHENTICATED USER
                         │
                         ↓
                ROLE / PERMISSION
                         │
                         ↓
                  DATA SCOPE CHECK
                         │
                         ↓
                   APPLICATION
                         │
                         ↓
                  SERVICE LAYER
                         │
                         ↓
                    DATABASE
                         │
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
     CHILDREN       MONITORING       REPORTING
        │                │                │
        ↓                ↓                ↓
 VALIDATION         INTERVENTION       EXPORT
        │                │
        ↓                ↓
 DUPLICATE           FOLLOW-UP
```

---

# 75. ACCEPTANCE CRITERIA

The database implementation is considered complete only when:

## Schema

* [ ] All 23 required tables exist.
* [ ] Every table has a primary key.
* [ ] Foreign keys are correctly implemented.
* [ ] Relationships match this document.
* [ ] Indexes are implemented.
* [ ] Unique constraints are implemented.
* [ ] Nullable fields are intentional.
* [ ] Delete behavior is safe.

## Authentication

* [ ] Users are stored securely.
* [ ] Passwords are hashed.
* [ ] Email is unique.
* [ ] Roles work.
* [ ] Permissions work.
* [ ] Barangay scoping works.

## Child Registry

* [ ] Child codes are generated server-side.
* [ ] Child records are normalized.
* [ ] Address records work.
* [ ] Education records work.
* [ ] ECCD records work.
* [ ] Disability records work.

## Validation

* [ ] Validation history is preserved.
* [ ] Review workflow works.
* [ ] Correction workflow works.
* [ ] Audit logs are created.

## Duplicate Detection

* [ ] Potential duplicates can be stored.
* [ ] Human review is required.
* [ ] Duplicate decisions are recorded.

## Monitoring

* [ ] Monitoring records are persisted.
* [ ] OSY monitoring works.
* [ ] ECCD monitoring works.
* [ ] Disability monitoring works.
* [ ] Education monitoring works.

## Intervention

* [ ] Interventions are persisted.
* [ ] Intervention status works.
* [ ] Follow-ups are persisted.

## QR

* [ ] Secure token is used.
* [ ] Sensitive information is not encoded directly.
* [ ] Verification events are logged.

## Reports

* [ ] Reports use actual database data.
* [ ] Scope restrictions are enforced.
* [ ] Export history is stored.

## Audit

* [ ] Important mutations are logged.
* [ ] Logs cannot be modified by ordinary users.
* [ ] User, action, entity, and timestamp are captured.

## Security

* [ ] Server-side authorization exists.
* [ ] Barangay data isolation is enforced.
* [ ] Sensitive information is protected.
* [ ] No secrets are stored in the database schema.
* [ ] No `.env` files were read or modified.

---

# 76. FINAL IMPLEMENTATION RULE

The AI agent must treat this document as the **database specification**.

Do not wait for an ERD image.

Do not infer missing relationships.

Do not create a simplified schema just to make the UI work.

Implement the complete relational structure described here.

However, implementation must remain incremental:

```text
Audit
 ↓
Plan
 ↓
Migration
 ↓
Schema
 ↓
Seed
 ↓
Service Layer
 ↓
Authorization
 ↓
UI Integration
 ↓
Testing
 ↓
Security Review
 ↓
Production Verification
```

After every phase:

1. Run the project's checks.
2. Verify migrations.
3. Verify TypeScript.
4. Verify database queries.
5. Verify authorization.
6. Verify existing functionality.
7. Update implementation progress.
8. Fix discovered issues before continuing.

The final application must have a real relational database behind the UI, not mock data disguised as database functionality.
