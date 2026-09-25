# TASK: Implement the Complete Municipal Child Mapping System ERD in the Existing Next.js Project

You are working inside an **existing Next.js project**.

Your task is to inspect the entire existing codebase first, understand its current architecture, and then implement the provided **Municipal Child Mapping System database architecture and ERD** into the project.

The database specification is the source of truth for the database structure.

The system is for the **Municipality of Sta. Magdalena, Sorsogon** and must support:

* Child registration
* Child demographic information
* Household/address information
* Educational information
* School information
* ECCD monitoring
* Disability information
* Child validation
* Duplicate detection
* Barangay monitoring
* Intervention tracking
* Follow-up activities
* QR verification
* Reports and report exports
* User accounts
* Role-based permissions
* Notifications
* Audit logs
* System settings

The complete child lifecycle is:

```text
Add Child
→ Information Validation
→ Duplicate Detection
→ Human Review
→ Submission
→ Verification
→ Active Child Record
→ Monitoring
→ Intervention
→ Follow-up
→ Reporting
```

---

# 1. FIRST: INSPECT THE EXISTING PROJECT

Before modifying anything, thoroughly inspect the current project.

Do NOT immediately create new files or replace the existing architecture.

Determine:

1. Next.js version
2. App Router or Pages Router
3. TypeScript configuration
4. Existing authentication implementation
5. Existing authorization/role system
6. Existing database implementation
7. Existing ORM/database library
8. Existing Turso/libSQL configuration
9. Existing `.env` and `.env.example`
10. Existing migrations/schema
11. Existing seed scripts
12. Existing API routes/server actions
13. Existing models/types/interfaces
14. Existing middleware
15. Existing UI pages
16. Existing dashboard modules
17. Existing documentation structure
18. Existing testing setup
19. Existing package manager
20. Existing scripts in `package.json`

Search the project before implementing anything.

Pay particular attention to:

```text
package.json
.env
.env.example
src/
app/
lib/
server/
db/
database/
drizzle/
prisma/
middleware.*
documentation/
docs/
scripts/
```

Use the project's existing architecture whenever it is appropriate.

Do NOT introduce a second ORM, second authentication system, or duplicate database abstraction if the project already has one.

If the project already uses Drizzle ORM, continue using Drizzle.

If it uses another appropriate ORM/database abstraction, evaluate whether it can correctly support Turso/libSQL before changing anything.

---

# 2. TURSO DATABASE CONFIGURATION

Configure the existing project to use Turso/libSQL.

Use these values for the initial local configuration:

```env
TURSO_DATABASE_URL="libsql://cms-sirjobel.aws-ap-northeast-1.turso.io"
TURSO_AUTH_TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTAyNTQ4NzksImlkIjoiMDFhMGQzN2QtYjgwMS03MTMyLTgwMGMtZmM0ZGZkN2Q4MzcyIiwia2lkIjoiM0xsVVhEcmItdkRrOU1mMGlwN0ZKLXNmeFl1dE92QjNGWnprVHBxUThSQSIsInJpZCI6Ijk2NDdjMGUyLTRkZGYtNGU2My1iNjk0LTczMTY2YTY2YzYzMiJ9.tXRFrjLGgK3_cphlgPSoUqOKhB-uBBiZMc4OihVUwJqWA2xmyv-9JZeekFSBeg4jmO9nx9MQXFrC5jX6PaxJAQ"
```

Requirements:

* Never expose `TURSO_AUTH_TOKEN` to client-side code.
* Never prefix the Turso token with `NEXT_PUBLIC_`.
* Database access must remain server-side.
* Add the required variables to `.env`.
* Update `.env.example` with placeholders, NOT the real token.

`.env.example` should contain something similar to:

```env
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
```

If the project already has differently named Turso variables, preserve compatibility where reasonable but standardize the implementation.

---

# 3. DATABASE TECHNOLOGY

Use the database technology already established by the project if it is compatible with Turso/libSQL.

If the project does not yet have a database layer, use a Turso-compatible modern solution appropriate for Next.js, preferably:

```text
Turso/libSQL
+
Drizzle ORM
```

Do not introduce unnecessary dependencies.

The implementation must support:

* schema definitions
* migrations
* foreign keys
* indexes
* unique constraints
* seed data
* transactions where appropriate
* server-side queries
* type-safe database access

---

# 4. IMPLEMENT THE COMPLETE ERD

Create the following logical database entities.

## USER MANAGEMENT

```text
users
roles
permissions
role_permissions
```

## LOCATION / REFERENCE DATA

```text
municipalities
barangays
schools
```

## CHILD DATA

```text
children
child_addresses
child_education
child_eccd
child_disabilities
```

## VALIDATION

```text
child_validations
child_duplicate_candidates
```

## MONITORING

```text
child_monitoring
interventions
intervention_followups
```

## QR

```text
qr_verifications
```

## REPORTING

```text
reports
report_exports
```

## SYSTEM

```text
notifications
audit_logs
system_settings
```

The uploaded ERD specification is authoritative for the relationships and purpose of these entities.

---

# 5. IMPORTANT ROLE REQUIREMENT

The system must support exactly these application roles initially:

```text
Barangay User
LGU User
System Administrator
```

Do NOT create:

```text
School User
school_user
```

Schools are reference entities only.

A school must NOT be treated as an authenticated application role.

This distinction must be reflected in:

* database seed data
* permissions
* authentication
* authorization
* documentation
* UI
* API/server actions

The original ERD explicitly requires that there is no `school_user` role.

---

# 6. USERS TABLE

Implement:

```text
users
-------------------------
id                  PK
role_id             FK
barangay_id         FK nullable
first_name
middle_name         nullable
last_name
email               UNIQUE
password_hash
phone               nullable
is_active
last_login_at       nullable
created_at
updated_at
```

Requirements:

* Email must be unique.
* Passwords must NEVER be stored as plaintext.
* Store password hashes only.
* Barangay Users normally require `barangay_id`.
* LGU Users may have `barangay_id = NULL`.
* System Administrators may have `barangay_id = NULL`.
* Authorization must be enforced server-side.

Add appropriate indexes:

```text
email
role_id
barangay_id
is_active
```

---

# 7. ROLES TABLE

Implement:

```text
roles
-------------------------
id                  PK
name                UNIQUE
description
created_at
updated_at
```

Seed:

```text
Barangay User
LGU User
System Administrator
```

Do not rely exclusively on hard-coded frontend role checks.

The database must contain the role definitions.

---

# 8. PERMISSIONS

Implement:

```text
permissions
-------------------------
id                  PK
name                UNIQUE
description
module
action
created_at
```

Seed appropriate permissions including at minimum:

```text
children.view
children.create
children.update
children.delete

validation.view
validation.review

duplicates.view
duplicates.review

monitoring.view
monitoring.update

interventions.view
interventions.create
interventions.update

reports.view
reports.generate
reports.export

qr.verify

users.view
users.create
users.update
users.disable

audit_logs.view
settings.manage
```

You may add additional permissions if the existing project requires them, but do not remove the required permissions.

---

# 9. ROLE PERMISSIONS

Implement:

```text
role_permissions
-------------------------
role_id             PK, FK
permission_id       PK, FK
created_at
```

Use a composite primary key:

```text
(role_id, permission_id)
```

Seed sensible permission mappings for the three roles.

Do not implement an arbitrary or insecure permission structure.

Document exactly which permissions each seeded role receives.

---

# 10. MUNICIPALITIES

The ERD plan includes municipalities as a location/reference entity.

Implement a municipality reference table if the current application architecture does not already provide one.

The system is intended for:

```text
Sta. Magdalena, Sorsogon
```

Do not duplicate municipality strings throughout child records.

Use relational references where appropriate.

If the existing project already has a municipality reference table, reuse it rather than creating a duplicate.

---

# 11. BARANGAYS

Implement:

```text
barangays
-------------------------
id                  PK
name                UNIQUE
code                UNIQUE nullable
is_active
created_at
updated_at
```

Do not store barangay names directly in `children`.

Use:

```text
children.barangay_id
        ↓
barangays.id
```

Seed the actual barangays of Sta. Magdalena, Sorsogon if reliable reference data is already available inside the project.

If the project does not contain authoritative barangay data, create clearly identified seed/reference records rather than inventing official data.

---

# 12. SCHOOLS

Implement:

```text
schools
-------------------------
id                  PK
barangay_id         FK nullable
name
school_code         UNIQUE nullable
school_type
address             nullable
is_active
created_at
updated_at
```

Relationship:

```text
barangays 1 ──── N schools
```

Schools are reference entities.

Do NOT create school accounts.

---

# 13. CHILDREN

This is the central entity.

Implement:

```text
children
-------------------------
id                  PK
child_code          UNIQUE
first_name
middle_name         nullable
last_name
suffix              nullable
birth_date
sex
civil_status        nullable
birth_place         nullable
barangay_id         FK
status
record_status
created_by          FK → users.id
updated_by          FK → users.id
created_at
updated_at
```

Generate application child codes such as:

```text
CM-2026-000001
CM-2026-000002
CM-2026-000003
```

The child code must be generated by the application.

Recommended `status`:

```text
active
inactive
archived
```

Recommended `record_status`:

```text
draft
pending_validation
needs_correction
verified
marked_duplicate
```

Do not physically delete important child records merely because their status changes.

---

# 14. CHILD ADDRESSES

Implement:

```text
child_addresses
-------------------------
id                  PK
child_id            FK
barangay_id         FK
household_address
sitio                nullable
is_current
created_at
updated_at
```

Relationship:

```text
children 1 ──── N child_addresses
barangays 1 ──── N child_addresses
```

This must support address history.

---

# 15. CHILD EDUCATION

Implement:

```text
child_education
-------------------------
id                  PK
child_id            FK
school_id           FK nullable
education_status
grade_level         nullable
school_year         nullable
enrollment_status   nullable
is_current
created_at
updated_at
```

Education status values:

```text
enrolled
out_of_school
not_yet_in_school
graduated
unknown
```

Relationship:

```text
children 1 ──── N child_education
schools 1 ──── N child_education
```

---

# 16. CHILD ECCD

Implement:

```text
child_eccd
-------------------------
id                  PK
child_id            FK
participation_status
program_name        nullable
provider            nullable
start_date          nullable
end_date            nullable
remarks             nullable
created_at
updated_at
```

Relationship:

```text
children 1 ──── N child_eccd
```

---

# 17. CHILD DISABILITIES

Implement:

```text
child_disabilities
-------------------------
id                  PK
child_id            FK
has_disability
disability_type     nullable
description         nullable
support_needed      nullable
assistance_status   nullable
verified             boolean
created_at
updated_at
```

This is sensitive information.

Ensure server-side authorization protects it.

---

# 18. CHILD VALIDATIONS

Implement:

```text
child_validations
-------------------------
id                  PK
child_id            FK
submitted_by        FK → users.id
reviewed_by         FK → users.id nullable
status
remarks             nullable
submitted_at
reviewed_at         nullable
created_at
updated_at
```

Status:

```text
pending
approved
needs_correction
rejected
```

Preserve validation history.

Do NOT replace validation history with a single boolean such as:

```text
is_verified
```

---

# 19. DUPLICATE CANDIDATES

Implement:

```text
child_duplicate_candidates
-------------------------
id                  PK
child_id            FK
possible_child_id   FK
match_score         nullable
match_reason        nullable
status
reviewed_by         FK → users.id nullable
review_notes        nullable
created_at
updated_at
```

Status:

```text
pending
confirmed_duplicate
not_duplicate
dismissed
```

CRITICAL:

Do not automatically mark a child as a duplicate solely because names are similar.

Duplicate candidates require authorized human review.

Do NOT create a unique constraint on:

```text
first_name
last_name
birth_date
```

unless there is a demonstrably safe reason.

The source ERD explicitly requires human review for possible duplicates.

---

# 20. CHILD MONITORING

Implement:

```text
child_monitoring
-------------------------
id                  PK
child_id            FK
monitoring_type
status
observed_at
recorded_by         FK → users.id
remarks             nullable
created_at
updated_at
```

Monitoring types:

```text
education
out_of_school_youth
eccd
disability
general
```

---

# 21. INTERVENTIONS

Implement:

```text
interventions
-------------------------
id                  PK
child_id            FK
intervention_type
description
status
priority             nullable
start_date           nullable
target_date          nullable
completed_date       nullable
assigned_to          FK → users.id nullable
created_by           FK → users.id
created_at
updated_at
```

Status:

```text
planned
ongoing
completed
cancelled
```

---

# 22. INTERVENTION FOLLOW-UPS

Implement:

```text
intervention_followups
-------------------------
id                  PK
intervention_id     FK
follow_up_date
status
notes               nullable
recorded_by         FK → users.id
created_at
updated_at
```

Relationship:

```text
interventions 1 ──── N intervention_followups
```

---

# 23. QR VERIFICATION

Implement:

```text
qr_verifications
-------------------------
id                  PK
child_id            FK
verification_token
verified_by         FK nullable
verification_type
result
verified_at
ip_address          nullable
user_agent           nullable
```

The QR code MUST NOT contain the child's personal information.

Do not encode:

```text
Full name
Birth date
Address
Disability information
Contact information
```

Instead, QR should contain a secure reference/token.

The backend must resolve that token to authorized information.

Never expose unnecessary child information through the QR itself.

---

# 24. REPORTS

Implement:

```text
reports
-------------------------
id                  PK
name
report_type
generated_by        FK → users.id
scope
filters_json
created_at
```

Support report types such as:

```text
child_registry
educational_status
out_of_school_youth
eccd
disability
intervention
barangay_summary
municipal_summary
```

---

# 25. REPORT EXPORTS

Implement:

```text
report_exports
-------------------------
id                  PK
report_id           FK
format
file_reference
generated_by         FK → users.id
created_at
expires_at           nullable
```

Supported formats:

```text
PDF
XLSX
CSV
```

Do not store large generated files directly inside Turso unless there is a specific architectural reason.

Use a file reference/object-storage abstraction where appropriate.

---

# 26. NOTIFICATIONS

Implement:

```text
notifications
-------------------------
id                  PK
user_id             FK
type
title
message
link                nullable
is_read
created_at
read_at             nullable
```

Examples:

```text
Validation request
Correction required
Duplicate review required
Intervention follow-up
System notification
```

Do not include unnecessary sensitive child information in notification messages.

---

# 27. AUDIT LOGS

Implement:

```text
audit_logs
-------------------------
id                  PK
user_id             FK nullable
action
entity_type
entity_id
old_values_json     nullable
new_values_json     nullable
ip_address          nullable
user_agent          nullable
created_at
```

Important actions should generate audit entries:

```text
LOGIN
LOGOUT
CREATE_CHILD
UPDATE_CHILD
SUBMIT_VALIDATION
APPROVE_VALIDATION
REJECT_VALIDATION
MARK_DUPLICATE
CREATE_INTERVENTION
UPDATE_INTERVENTION
VERIFY_QR
GENERATE_REPORT
EXPORT_REPORT
CREATE_USER
UPDATE_USER
DISABLE_USER
```

Audit logs should generally be append-only.

Ordinary users must not be able to edit or delete audit logs.

For sensitive changes record:

```text
who
what
when
which record
previous value
new value
```

Do not store unnecessary sensitive data inside audit logs.

---

# 28. SYSTEM SETTINGS

Implement:

```text
system_settings
-------------------------
id                  PK
key                 UNIQUE
value
description         nullable
updated_by          FK → users.id nullable
updated_at
```

Seed settings such as:

```text
system_name
child_code_prefix
default_school_year
maintenance_mode
```

NEVER store:

```text
passwords
API secrets
database credentials
Turso tokens
other sensitive secrets
```

inside `system_settings`.

---

# 29. FOREIGN KEY REQUIREMENTS

Explicitly define foreign keys.

At minimum:

```text
users.role_id
    → roles.id

users.barangay_id
    → barangays.id

children.barangay_id
    → barangays.id

child_education.child_id
    → children.id

child_education.school_id
    → schools.id

child_validations.child_id
    → children.id

interventions.child_id
    → children.id

intervention_followups.intervention_id
    → interventions.id
```

Also implement every other relationship required by the ERD.

Use safe delete behavior.

For important historical child data prefer:

```text
RESTRICT
SET NULL
SOFT DELETE / ARCHIVE
```

where appropriate.

Avoid dangerous cascading deletes.

---

# 30. INDEXES

Implement indexes for frequently queried fields.

At minimum:

### children

```text
child_code
last_name
first_name
birth_date
barangay_id
record_status
status
created_at
```

### users

```text
email
role_id
barangay_id
is_active
```

### child_education

```text
child_id
school_id
education_status
school_year
```

### child_validations

```text
child_id
status
submitted_at
```

### child_monitoring

```text
child_id
monitoring_type
observed_at
```

### interventions

```text
child_id
status
target_date
```

### audit_logs

```text
user_id
entity_type
entity_id
created_at
```

Do not blindly index every column.

---

# 31. UNIQUE CONSTRAINTS

Implement appropriate unique constraints:

```text
users.email
roles.name
permissions.name
barangays.name
barangays.code
schools.school_code
children.child_code
system_settings.key
```

Do NOT make child names unique.

---

# 32. NORMALIZATION

Target approximately 3NF.

Do not put repeated information into `children`.

Avoid structures such as:

```text
children
    barangay_name
    school_name
    intervention1
    intervention2
    intervention3
```

Instead use:

```text
children
    ↓
barangays

children
    ↓
child_education
    ↓
schools

children
    ↓
interventions
    ↓
intervention_followups
```

The uploaded ERD specifically requires this normalized approach.

---

# 33. BARANGAY DATA SCOPING

Implement server-side authorization.

Barangay User:

```text
users.barangay_id
        ↓
children.barangay_id
        ↓
authorized records
```

Barangay Users must NOT be able to access another barangay's child records simply by changing:

```text
URL
query parameter
child ID
API payload
frontend state
```

LGU Users can have municipality-wide access according to their permissions.

System Administrators can manage system-wide data according to their authorization.

The frontend must NEVER be the sole security boundary.

Every protected server-side operation must verify:

1. authenticated user
2. role
3. permission
4. barangay scope when applicable
5. requested resource ownership/scope

---

# 34. AUTHENTICATION

Inspect the current authentication system first.

If authentication already exists, integrate the new database users/roles/permissions into it.

If authentication does not exist, implement an appropriate secure Next.js authentication architecture.

Requirements:

* Passwords hashed using a modern secure password hashing algorithm.
* Never store plaintext passwords.
* Never expose password hashes to client components.
* Server-side session validation.
* Server-side authorization.
* Login auditing.
* Last login tracking.
* Disabled users cannot authenticate.
* Role and permission checks must happen server-side.

Do not create a second authentication implementation if one already exists.

---

# 35. DEFAULT CREDENTIALS FOR EVERY ROLE

Create seeded default accounts for:

```text
Barangay User
LGU User
System Administrator
```

Use the project's authentication requirements and create secure password hashes.

The seed must create credentials for each role.

IMPORTANT:

* Do not store plaintext passwords in the database.
* Do not expose password hashes to the frontend.
* Do not hard-code credentials inside UI components.
* Keep seed credentials centralized in the seed implementation.
* Make it obvious in the documentation that these are DEVELOPMENT/INITIAL credentials.
* Require credentials to be changed before production deployment if the architecture supports this.
* Never commit production secrets.

If the project already contains an authentication/credential configuration convention, follow that convention rather than creating conflicting files.

---

# 36. SEED DATA

Create a complete database seed system.

The seed process must create realistic development/test data for all major entities.

At minimum seed:

## Roles

```text
Barangay User
LGU User
System Administrator
```

## Permissions

All required permissions.

## Role permissions

Appropriate mappings.

## Municipality

Sta. Magdalena, Sorsogon.

## Barangays

Populate the municipality's barangay reference data when reliable data is available in the project/source material.

## Schools

Create representative development records.

## Users

Create at least one default account for each role.

## Children

Create multiple realistic test child records.

Include children with different:

```text
record_status
education_status
ECCD status
disability status
monitoring records
validation states
interventions
```

## Addresses

Create child address records.

## Education

Create educational records linked to schools.

## ECCD

Create sample ECCD records.

## Disability

Create sample disability records while keeping sensitive fields realistic and minimal.

## Validation

Create validation history.

## Duplicate candidates

Create representative duplicate candidates.

Include both:

```text
pending
not_duplicate
```

and/or other legitimate review states.

Do not automatically mark children as duplicates simply because names are similar.

## Monitoring

Create monitoring records.

## Interventions

Create sample interventions.

## Follow-ups

Create sample follow-up records.

## QR

Create safe verification-token records.

Never put personal information in QR tokens.

## Reports

Create representative report records if appropriate.

## Report exports

Create metadata records rather than fake large files.

## Notifications

Create notifications for seeded users.

## Audit logs

Create representative audit events.

## System settings

Seed:

```text
system_name
child_code_prefix
default_school_year
maintenance_mode
```

---

# 37. SEEDING MUST BE IDEMPOTENT

The seed process should be safely repeatable during development.

Avoid creating duplicate records every time the developer runs:

```bash
npm run db:seed
```

Use deterministic identifiers or safe lookup/upsert strategies where appropriate.

Document whether the seed command:

```text
inserts
upserts
resets
```

and how developers can reset the database.

Never implement a destructive reset as the default seed behavior.

---

# 38. DATABASE MIGRATIONS

Create proper migrations.

Do NOT simply create tables manually through an ad-hoc script without migration history.

The migration system must be reproducible.

The project should support a flow similar to:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

Use the project's existing naming conventions if different.

Add useful database scripts to `package.json`.

For example:

```text
db:generate
db:migrate
db:seed
db:studio
db:reset
```

Only add commands that are actually supported by the chosen database tooling.

---

# 39. TRANSACTIONS

Use database transactions for operations that modify multiple related entities.

Examples:

```text
Create child
+
Create address
+
Create education
+
Create audit log
```

and:

```text
Approve validation
+
Update child record_status
+
Create audit log
+
Create notification
```

If one part fails, avoid leaving the database in an inconsistent state.

---

# 40. AUDITING IMPLEMENTATION

Create a reusable server-side audit mechanism.

Avoid manually duplicating audit logic everywhere.

Create a consistent approach for:

```text
create
update
validation actions
duplicate review
intervention actions
QR verification
report generation
report export
user administration
```

Audit records should contain enough context to understand:

```text
who
what
when
which entity
previous value
new value
```

while minimizing sensitive information.

---

# 41. TYPE SAFETY

Use TypeScript types generated from or aligned with the database schema.

Avoid:

```typescript
any
```

for database entities unless genuinely unavoidable.

Create reusable types for:

```text
User
Role
Permission
Barangay
School
Child
ChildAddress
ChildEducation
ChildEccd
ChildDisability
ChildValidation
ChildDuplicateCandidate
ChildMonitoring
Intervention
InterventionFollowup
QrVerification
Report
ReportExport
Notification
AuditLog
SystemSetting
```

Do not duplicate types unnecessarily.

---

# 42. SERVER-SIDE DATA ACCESS

All database access must be server-side.

Do NOT:

* expose Turso credentials
* query Turso directly from browser code
* put secrets in `NEXT_PUBLIC_*`
* return unnecessary database fields
* expose password hashes
* expose sensitive child information to unauthorized users

Use:

```text
Server Components
Server Actions
Route Handlers
server-only database modules
```

according to the project's existing architecture.

---

# 43. PRIVACY REQUIREMENTS

The system handles sensitive child information.

Follow data minimization.

Do not put unnecessary personal information into:

```text
QR tokens
URLs
audit logs
notifications
report filenames
localStorage
browser-visible identifiers
```

Protect disability and other sensitive child data using server-side authorization.

Never assume hiding a UI button is sufficient authorization.

---

# 44. APPLICATION MODULE INTEGRATION

After implementing the database, inspect the existing application pages and determine which existing modules should consume the new schema.

Do not blindly rebuild the entire UI.

Preserve useful existing UI and application logic where possible.

Integrate the database into existing modules such as:

```text
Authentication
Dashboard
Children
Child Details
Validation
Duplicate Review
Monitoring
Interventions
Follow-ups
QR Verification
Reports
Notifications
User Management
Audit Logs
Settings
```

If a module does not exist yet, create only the foundational server/API/data layer needed for the database implementation unless the existing project clearly requires the UI too.

---

# 45. DO NOT BREAK EXISTING FUNCTIONALITY

This is an existing Next.js project.

Do NOT unnecessarily:

* replace the frontend framework
* replace the UI library
* rewrite all pages
* remove existing routes
* remove existing components
* remove existing features
* replace existing authentication without reason
* replace the package manager
* delete existing documentation
* remove existing environment variables

Before modifying existing functionality, understand how it works.

If a conflict exists between the current implementation and this ERD, document the conflict and implement the safest compatible architecture.

---

# 46. DOCUMENTATION REQUIREMENT

You are REQUIRED to create detailed documentation inside:

```text
documentation/
```

Create a dedicated database/ERD documentation subfolder:

```text
documentation/database/
```

If `documentation/` already exists, preserve its current structure and add the new database documentation there.

At minimum create:

```text
documentation/database/README.md
documentation/database/ERD.md
documentation/database/SCHEMA.md
documentation/database/RELATIONSHIPS.md
documentation/database/ROLES-AND-PERMISSIONS.md
documentation/database/SEED-DATA.md
documentation/database/MIGRATIONS.md
documentation/database/SECURITY-AND-PRIVACY.md
documentation/database/AUDIT-LOGGING.md
documentation/database/TURSO-SETUP.md
documentation/database/DEVELOPMENT-CREDENTIALS.md
```

If additional documentation is useful, create it.

---

# 47. DOCUMENTATION: README

`documentation/database/README.md` must explain:

* database architecture
* chosen database technology
* Turso/libSQL
* ORM
* schema organization
* migration process
* seed process
* role structure
* security model
* documentation index
* development workflow

Include a database architecture overview.

---

# 48. DOCUMENTATION: ERD

`documentation/database/ERD.md` must contain the complete ERD explanation.

Document:

```text
User Management
Location / References
Child Data
Validation
Monitoring
QR
Reporting
System
```

Explain every table and its purpose.

Include relationships and cardinality.

Use Mermaid ERD if appropriate.

For example:

```mermaid
erDiagram
    ROLES ||--o{ USERS : has
    BARANGAYS ||--o{ USERS : scopes
    BARANGAYS ||--o{ CHILDREN : contains
    CHILDREN ||--o{ CHILD_ADDRESSES : has
    CHILDREN ||--o{ CHILD_EDUCATION : has
    SCHOOLS ||--o{ CHILD_EDUCATION : referenced_by
```

Continue this for the complete schema.

Make sure the Mermaid ERD actually matches the implemented schema.

Do not create a diagram that differs from the real database.

---

# 49. DOCUMENTATION: SCHEMA

`documentation/database/SCHEMA.md` must document every table.

For each table document:

```text
Table name
Purpose
Columns
Data types
Nullable fields
Primary key
Foreign keys
Unique constraints
Indexes
Status values
Delete behavior
Security considerations
```

---

# 50. DOCUMENTATION: RELATIONSHIPS

Document:

```text
Role 1 → N Users
Barangay 1 → N Users
Barangay 1 → N Schools
Barangay 1 → N Children
Child 1 → N Addresses
Child 1 → N Education Records
School 1 → N Education Records
Child 1 → N ECCD Records
Child 1 → N Disability Records
Child 1 → N Validation Records
Child 1 → N Duplicate Candidates
Child 1 → N Monitoring Records
Child 1 → N Interventions
Intervention 1 → N Follow-ups
Child 1 → N QR Verification Events
User 1 → N Notifications
User 1 → N Audit Logs
```

Also document the many-to-many relationship:

```text
Roles N ↔ N Permissions
through role_permissions
```

---

# 51. DOCUMENTATION: ROLES AND PERMISSIONS

Document:

```text
Barangay User
LGU User
System Administrator
```

Explain:

* scope
* permissions
* barangay restrictions
* municipality-wide access
* administrative capabilities

Explicitly document:

```text
There is NO School User role.
```

Explain that schools are reference entities.

---

# 52. DOCUMENTATION: SEED DATA

Document:

* seed command
* seeded roles
* seeded permissions
* role-permission mappings
* seeded municipality
* barangays
* schools
* users
* children
* sample records
* default development credentials
* idempotency behavior
* reset procedure

Clearly label all credentials as:

```text
DEVELOPMENT / INITIAL CREDENTIALS
```

Do not represent them as production credentials.

---

# 53. DOCUMENTATION: DEVELOPMENT CREDENTIALS

Create:

```text
documentation/database/DEVELOPMENT-CREDENTIALS.md
```

Document the default credentials created by the seed process.

Include:

```text
Role
Username/email
Initial password
Purpose
Required action before production
```

Do not expose credentials anywhere else unnecessarily.

If the project supports forced password change, document that.

---

# 54. DOCUMENTATION: TURSO SETUP

Document:

* Turso database URL configuration
* required environment variables
* server-only secret handling
* migration commands
* seed commands
* local development process
* production deployment considerations

Never place the actual Turso authentication token in documentation.

Use:

```env
TURSO_DATABASE_URL=<your-turso-database-url>
TURSO_AUTH_TOKEN=<your-turso-auth-token>
```

---

# 55. DOCUMENTATION: SECURITY AND PRIVACY

Document:

* password hashing
* authentication
* server-side authorization
* role-based permissions
* barangay data scoping
* sensitive child information
* QR security
* audit logs
* secret management
* database credentials
* environment variables
* data minimization
* dangerous cascade prevention

---

# 56. DOCUMENTATION: AUDIT LOGGING

Document:

* what events are logged
* log fields
* who can access logs
* append-only behavior
* sensitive-data minimization
* how application actions generate audit events

---

# 57. VERIFY DATABASE INTEGRITY

After implementation, verify:

## Primary Keys

Every table has a valid primary key.

## Foreign Keys

Every relationship has an explicit foreign key.

## Cardinality

Relationships match the ERD.

## Nullable Fields

Nullable fields match the specification.

## Unique Constraints

Verify:

```text
users.email
roles.name
permissions.name
barangays.name
barangays.code
schools.school_code
children.child_code
system_settings.key
```

## Indexes

Verify required indexes.

## Delete Behavior

Verify dangerous cascades are not present.

## Status Values

Verify all status fields accept only intended values.

## Audit Requirements

Verify important mutations create audit records.

## Privacy

Verify sensitive fields are not unnecessarily exposed.

---

# 58. RUN VALIDATION

After implementation, run the project's available:

```bash
npm run lint
npm run typecheck
npm run build
```

and database-related commands.

If scripts do not exist, inspect `package.json` and use the project's actual equivalent commands.

Also test:

```text
Database connection
Migration
Seed
Authentication
Authorization
Role permissions
Barangay scoping
Child creation
Child update
Validation
Duplicate review
Monitoring
Intervention
Follow-up
QR verification
Reports
Notifications
Audit logging
```

Fix errors rather than simply reporting them.

---

# 59. TEST SECURITY BOUNDARIES

Explicitly test that:

### Barangay User

Cannot access another barangay's child records.

### LGU User

Can access authorized municipality-wide records.

### System Administrator

Can perform authorized system management.

### Unauthorized User

Cannot access protected modules.

### Disabled User

Cannot authenticate.

### QR

Does not expose sensitive child data.

### Client

Cannot directly access Turso credentials.

### Audit Logs

Cannot be modified by ordinary users.

---

# 60. VERIFY THE REAL DATABASE AGAINST THE DOCUMENTATION

This is extremely important.

After implementing everything:

1. Inspect the actual schema.
2. Inspect migrations.
3. Inspect seed data.
4. Inspect relationships.
5. Inspect indexes.
6. Inspect unique constraints.
7. Inspect role permissions.
8. Inspect authentication.
9. Inspect authorization.
10. Compare everything against `documentation/database/`.

The documentation must describe what the code ACTUALLY implements.

Do not write documentation first and assume implementation matches it.

---

# 61. FINAL PROJECT STRUCTURE

Aim for a clean structure compatible with the existing project.

A possible structure is:

```text
project/
├── app/
├── components/
├── lib/
│   ├── db/
│   │   ├── index.*
│   │   ├── schema/
│   │   └── queries/
│   ├── auth/
│   ├── permissions/
│   └── audit/
├── drizzle/
│   └── migrations/
├── scripts/
│   └── seed.*
├── documentation/
│   └── database/
│       ├── README.md
│       ├── ERD.md
│       ├── SCHEMA.md
│       ├── RELATIONSHIPS.md
│       ├── ROLES-AND-PERMISSIONS.md
│       ├── SEED-DATA.md
│       ├── MIGRATIONS.md
│       ├── SECURITY-AND-PRIVACY.md
│       ├── AUDIT-LOGGING.md
│       ├── TURSO-SETUP.md
│       └── DEVELOPMENT-CREDENTIALS.md
├── .env
├── .env.example
└── package.json
```

Do not force this exact structure if the existing project already has an established architecture. Adapt it intelligently.

---

# 62. IMPORTANT IMPLEMENTATION PRINCIPLES

Follow these principles throughout the implementation:

### Do not over-engineer.

Only add architecture that has a clear purpose.

### Do not duplicate existing systems.

Reuse existing authentication, database, utility, UI, and API patterns where appropriate.

### Do not trust frontend authorization.

Authorization must happen server-side.

### Do not expose secrets.

Turso credentials remain server-side.

### Do not store plaintext passwords.

Only secure password hashes.

### Do not create School Users.

Schools are reference data.

### Do not automatically classify duplicate children.

Possible duplicates require human review.

### Do not delete historical child records casually.

Prefer archive/soft-delete/status approaches.

### Do not put personal information in QR codes.

Use secure tokens.

### Do not put secrets in system settings.

Use environment variables/secret management.

### Do not blindly cascade delete.

Protect historical records.

### Do not create fake official data.

If authoritative reference data is unavailable, clearly identify development/sample data.

---

# 63. REQUIRED FINAL REPORT FROM THE AI AGENT

After completing the implementation, provide a final implementation report.

The report must include:

## Database

```text
Database:
ORM:
Connection:
Migration system:
```

## Tables

List every implemented table.

## Authentication

Explain the implemented authentication system.

## Roles

List:

```text
Barangay User
LGU User
System Administrator
```

Confirm:

```text
No School User role exists.
```

## Permissions

Summarize permission implementation.

## Seed

Explain:

```text
seed command
seeded users
seeded roles
seeded permissions
sample records
```

## Migrations

List migration commands.

## Documentation

List every file created under:

```text
documentation/database/
```

## Security

Explain:

```text
password hashing
server-side authorization
barangay scoping
QR security
audit logging
secret handling
```

## Verification

Report the results of:

```text
lint
typecheck
build
database migration
database seed
authentication test
authorization test
```

If something could not be verified, explicitly state why.

---

# 64. FINAL ACCEPTANCE CRITERIA

Do not consider this task complete until ALL of the following are true:

* Existing project architecture was inspected first.
* Turso/libSQL is configured correctly.
* Turso credentials are server-side only.
* `.env.example` contains placeholders.
* Database schema is implemented.
* All required entities exist.
* Primary keys exist.
* Foreign keys exist.
* Relationships are correct.
* Cardinalities are correct.
* Unique constraints exist.
* Required indexes exist.
* Safe delete behavior is implemented.
* Roles are seeded.
* Permissions are seeded.
* Role permissions are seeded.
* No School User role exists.
* Municipality/reference data exists.
* Barangays exist as reference entities.
* Schools exist as reference entities.
* Child registry exists.
* Address history exists.
* Education history exists.
* ECCD records exist.
* Disability records exist.
* Validation history exists.
* Duplicate candidate review exists.
* Monitoring exists.
* Interventions exist.
* Follow-ups exist.
* QR verification exists.
* Reports exist.
* Report exports exist.
* Notifications exist.
* Audit logs exist.
* System settings exist.
* Default development credentials exist for every role.
* Passwords are hashed.
* Seed data exists for all major entities.
* Seed process is repeatable/idempotent.
* Child codes are generated correctly.
* Barangay scoping is enforced server-side.
* Sensitive child information is protected.
* QR codes do not contain personal information.
* Audit logs are append-only.
* Documentation exists under `documentation/database/`.
* Documentation matches the actual implementation.
* Existing functionality has not been unnecessarily destroyed.
* TypeScript passes.
* Lint passes.
* Production build passes.
* Database migrations execute successfully.
* Database seed executes successfully.

Do not stop after creating the schema.

Implement the complete database foundation, integrate it with the existing Next.js architecture, seed the development environment, verify the implementation, and document everything thoroughly.


