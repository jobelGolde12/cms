# MASTER SYSTEM MIGRATION & IMPLEMENTATION PLANNING PROMPT

## PROJECT: RECORDS MANAGEMENT SYSTEM WITH PROFILE AND PERFORMANCE ANALYTICS OF STA. MAGDALENA NATIONAL HIGH SCHOOL

---

# 0. IMPORTANT EXECUTION MODE

YOU ARE CURRENTLY IN:

PLANNING AND SYSTEM ANALYSIS MODE

DO NOT START IMPLEMENTING THE ACTUAL SYSTEM CHANGES YET.

Your first responsibility is to thoroughly inspect the existing codebase and create a complete, production-oriented implementation plan.

The final plan must be detailed enough that another AI coding agent can implement the entire migration without needing to see the original ERD or relying on undocumented assumptions.

The plan must identify:

- exact folders
- exact files
- database tables
- database fields
- relationships
- routes
- components
- pages
- API/server actions
- authentication
- authorization
- analytics
- charts
- forms
- validation
- reports
- QR functionality
- audit logs
- security
- privacy
- testing
- documentation
- migration strategy

Every implementation task MUST contain a checkbox.

Example:

- [ ] Inspect current student registry
- [ ] Update student registry terminology
- [ ] Implement student search
- [ ] Test student search
- [ ] Document student search

When a task is actually completed during the future implementation phase, it may become:

- [x] Inspect current student registry
- [x] Update student registry terminology

NEVER mark a task as completed merely because it is planned.

---

# 1. NEW OFFICIAL SYSTEM IDENTITY

The previous project concept was:

"Integrated Web-Based Child Mapping System"

That concept is now OUTDATED for this project.

The NEW official title is:

"Records Management System with Profile and Performance Analytics of Sta. Magdalena National High School"

Use this title consistently throughout the new documentation, system terminology, metadata, page titles, and user-facing content where appropriate.

The system is now specifically designed for:

STA. MAGDALENA NATIONAL HIGH SCHOOL

The system is NOT a municipality-wide child mapping platform.

---

# 2. MAJOR SCOPE CHANGE

The old system was designed around:

- Municipality
- Barangays
- LGU
- Schools
- Community volunteers
- Multi-agency users
- Child mapping
- House-to-house surveys
- Municipality-wide reports
- Barangay-level reports
- Inter-agency coordination

THIS SCOPE HAS BEEN REMOVED.

The new system is SCHOOL-ONLY.

The system should focus on:

- students
- school personnel
- student profiles
- enrollment
- academic records
- grades
- attendance
- behavior
- reading
- literacy
- numeracy
- student development
- interventions
- performance analytics
- student monitoring
- school reports
- school-level administration
- school-level record management

---

# 3. ABSOLUTE SCOPE BOUNDARY

The system MUST NOT be designed as:

- municipality management system
- barangay management system
- LGU management system
- community management system
- public child registry
- multi-agency platform
- public student directory
- nationwide student database
- third-party data-sharing platform

The system is an:

INTERNAL SCHOOL RECORDS MANAGEMENT AND STUDENT PERFORMANCE ANALYTICS PLATFORM.

The system should assume that all authorized users belong to or are officially associated with the school.

---

# 4. PRIMARY SYSTEM OBJECTIVE

The primary objective is to centralize student information and provide authorized school personnel with a reliable platform to:

1. Manage student profiles.
2. Manage enrollment records.
3. Maintain academic records.
4. Monitor grades.
5. Monitor attendance.
6. Monitor behavior.
7. Monitor reading performance.
8. Monitor literacy performance.
9. Monitor numeracy performance.
10. Record interventions.
11. Identify students who may require additional support.
12. Analyze student performance.
13. Compare performance across periods.
14. Generate school reports.
15. Maintain historical records.
16. Maintain an audit trail.
17. Protect sensitive student information.

---

# 5. CORE SYSTEM PHILOSOPHY

The new application should follow this conceptual model:

SCHOOL
    ↓
USERS
    ↓
STUDENTS
    ↓
ENROLLMENT
    ↓
STUDENT PROFILE
    ↓
ACADEMIC PERFORMANCE
    ↓
ATTENDANCE
    ↓
BEHAVIOR
    ↓
READING
    ↓
LITERACY
    ↓
NUMERACY
    ↓
INTERVENTIONS
    ↓
ANALYTICS
    ↓
REPORTS

The student is now the central entity.

---

# 6. FIRST TASK: COMPLETE CODEBASE AUDIT

Before proposing changes, inspect the entire repository.

Do NOT guess.

Do NOT assume that the existing implementation matches previous descriptions.

Inspect the actual code.

Create a codebase audit containing:

## Project architecture

Inspect:

- package.json
- lock file
- Next.js configuration
- TypeScript configuration
- Tailwind configuration
- database configuration
- authentication configuration
- middleware
- route handlers
- server actions
- API endpoints
- components
- layouts
- pages
- utilities
- hooks
- state management
- validation
- schemas
- database migrations
- seed files
- tests

---

# 7. INSPECT CURRENT FOLDER STRUCTURE

Document the current structure.

For example:

- app/
- components/
- lib/
- db/
- hooks/
- public/
- styles/
- documentation/
- tests/

Do NOT assume these exact directories exist.

Use the actual project structure.

For every important folder explain:

1. purpose
2. important files
3. dependencies
4. whether it requires modification
5. reason for modification

---

# 8. INSPECT CURRENT ROUTES

Create a complete route inventory.

For every route document:

- route path
- page file
- purpose
- current terminology
- current data source
- current user permissions
- whether route should be retained
- whether route should be modified
- whether route should be removed
- whether route should be repurposed

Example:

| Route | Current Purpose | New Purpose | Action |
|---|---|---|---|
| /dashboard | Municipality dashboard | School dashboard | Rewrite |
| /children | Child registry | Student registry | Rewrite |
| /children/create | Add child | Add student | Rewrite |
| /validation | Child validation | Student record verification | Rewrite |
| /barangays | Barangay management | Not required | Remove |
| /reports | Municipal reports | School reports | Rewrite |

Create the actual table based on the codebase.

---

# 9. INSPECT CURRENT TERMINOLOGY

Search the entire codebase for old terminology.

Search for:

- child
- children
- child mapping
- municipality
- municipal
- barangay
- barangays
- LGU
- community
- volunteer
- multi-agency
- school-community
- municipal report
- barangay report
- municipal statistics
- barangay statistics
- out-of-school youth
- child protection
- child registry
- mapping
- household
- Annex
- community survey

For every occurrence determine:

- obsolete
- needs renaming
- still relevant
- needs contextual review
- can be retained

DO NOT perform a blind global search-and-replace.

---

# 10. CURRENT DESIGN MUST BE PRESERVED

This is extremely important.

The existing design was already created and approved.

DO NOT redesign the application from scratch.

The existing:

- theme
- colors
- typography
- visual identity
- spacing
- navigation
- dashboard style
- component style
- overall layout
- Stitch-inspired visual direction

must remain the visual foundation.

The migration should primarily change:

- content
- terminology
- information architecture
- data
- functionality
- workflows
- analytics
- roles
- permissions

NOT the fundamental visual identity.

---

# 11. UI UX PRO MAX REQUIREMENT

The project already uses UI UX Pro Max through:

uipro init --ai opencode

You MUST inspect and use the installed UI UX Pro Max skill where appropriate.

Use it to evaluate:

- usability
- accessibility
- information hierarchy
- dashboard composition
- form usability
- table usability
- responsive design
- interaction design
- empty states
- loading states
- error states
- data visualization
- student profile UX
- analytics UX
- search and filtering
- confirmation dialogs
- feedback messages

However:

UI UX Pro Max must NOT be used as an excuse to replace the approved design.

Use:

"Enhance the existing design"

NOT:

"Create a completely new design."

---

# 12. DESIGN PRESERVATION ACCEPTANCE CRITERIA

The final implementation should visually feel like the SAME APPLICATION after migration.

The user should recognize the existing design.

Only the system's purpose and functionality should become different.

Avoid unnecessary:

- gradients
- glassmorphism
- excessive shadows
- excessive borders
- excessive cards
- decorative animations
- unrelated colors
- random icon styles
- excessive rounded components
- completely new layouts

Maintain consistency.

---

# 13. NEW USER ROLE ARCHITECTURE

The old multi-agency role system must be reviewed and redesigned.

Potential roles should be evaluated:

## System Administrator

Responsibilities:

- user management
- roles
- permissions
- system configuration
- audit logs
- database/system administration

## School Administrator

Responsibilities:

- school-wide student records
- academic monitoring
- reports
- analytics
- enrollment monitoring
- student monitoring

## Teacher / Adviser

Responsibilities may include:

- assigned students
- academic records
- grades
- attendance
- behavior
- assessments
- interventions where permitted

## Records Personnel

Responsibilities:

- student records
- enrollment
- profile verification
- historical records
- document-related records

## Guidance / Student Support Personnel

Potential access:

- behavior
- interventions
- student support information
- selected student development information

IMPORTANT:

Do not automatically implement every proposed role.

First inspect the existing system and determine which roles make sense.

Document:

- final role list
- role responsibilities
- permissions
- restricted data
- accessible modules

---

# 14. ROLE/PERMISSION MATRIX

Create:

documentation/security/role-permission-matrix.md

Include a matrix similar to:

| Feature | Admin | School Admin | Teacher | Records | Guidance |
|---|---:|---:|---:|---:|---:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Student Registry | ✓ | ✓ | Assigned | ✓ | Limited |
| Student Profile | ✓ | ✓ | Assigned | ✓ | Limited |
| Grades | ✓ | ✓ | ✓ | View | View |
| Behavior | ✓ | ✓ | Limited | No/limited | ✓ |
| Attendance | ✓ | ✓ | ✓ | View | View |
| Reading | ✓ | ✓ | ✓ | View | ✓ |
| Literacy | ✓ | ✓ | ✓ | View | ✓ |
| Numeracy | ✓ | ✓ | ✓ | View | ✓ |
| Interventions | ✓ | ✓ | Limited | No | ✓ |
| Users | ✓ | ✓/limited | No | No | No |
| Audit Logs | ✓ | ✓/limited | No | No | No |

This is only an example.

Generate the actual matrix based on the project.

---

# 15. DATABASE MIGRATION

The database must be redesigned around the new school-only architecture.

Do NOT assume the previous ERD is still valid.

Create:

documentation/database/

and include:

- database-overview.md
- database-migration-plan.md
- schema-design.md
- data-dictionary.md
- relationship-map.md
- indexing-strategy.md
- constraints.md
- migration-risks.md

---

# 16. CORE DATABASE ENTITIES

Evaluate the need for the following.

Do not blindly create tables.

## users

Authenticated school users.

Potential fields:

- id
- name
- email
- password_hash
- role_id
- employee identifier if required
- status
- last_login
- created_at
- updated_at

---

## roles

School-specific roles.

---

## permissions

Fine-grained permissions.

---

## role_permissions

Role-to-permission relationship.

---

## students

Central student record.

Potential fields:

- id
- student_number
- first_name
- middle_name
- last_name
- suffix
- birth_date
- sex
- contact information if necessary
- status
- profile metadata
- created_at
- updated_at

---

## guardians

Parent/guardian information if required.

---

## student_guardians

Student-to-guardian relationship.

---

## school_years

Academic year.

---

## grade_levels

Grade level definitions.

---

## sections

School sections.

---

## student_enrollments

Student historical enrollment.

Relationships should support:

Student
→ School Year
→ Grade Level
→ Section

Do NOT overwrite historical enrollment.

---

# 17. ACADEMIC DATABASE

Evaluate:

## subjects

Subject definitions.

## grading_periods

Quarter/period definitions.

## student_grades

Student grade records.

Relationships:

Student
→ School Year
→ Grading Period
→ Subject
→ Grade

Support historical academic records.

---

# 18. ACADEMIC ANALYTICS

Plan analytics for:

- general average
- subject average
- quarterly performance
- yearly performance
- performance trend
- subject strengths
- subject weaknesses
- students with concerning performance
- grade-level performance
- section performance
- school-year comparison

Every analytics feature must document:

1. data source
2. calculation
3. database query
4. permissions
5. visualization
6. filters
7. empty state
8. privacy rules

---

# 19. ATTENDANCE SYSTEM

Evaluate an attendance module.

Possible records:

- present
- absent
- late
- excused
- unexcused

Analytics:

- attendance percentage
- absence count
- late count
- monthly trend
- quarterly trend
- yearly trend
- students with repeated absences

Do not create arbitrary "at-risk" rules without documenting them.

---

# 20. BEHAVIOR SYSTEM

Evaluate:

## behavior_categories

Examples:

- positive behavior
- participation
- leadership
- cooperation
- classroom concern
- disciplinary concern

## behavior_records

Potential:

- student
- date
- category
- description
- severity
- recorded_by
- follow_up
- status

Behavior data must be permission-controlled.

Avoid unnecessarily stigmatizing language.

---

# 21. READING SYSTEM

Evaluate a structured reading assessment system.

Potential:

- assessment
- date
- reading level
- score
- proficiency
- assessor
- notes
- intervention status

Analytics:

- reading proficiency
- reading distribution
- reading trend
- grade-level comparison
- improvement
- students needing support

Do not invent official assessment standards.

Make assessment categories configurable where appropriate.

---

# 22. LITERACY SYSTEM

Evaluate whether literacy should be:

1. separate from reading, or
2. represented as a broader assessment category.

Document the decision.

Potential analytics:

- literacy proficiency
- literacy trend
- grade-level literacy
- intervention progress
- students needing support

Avoid duplicating data unnecessarily.

---

# 23. NUMERACY / "HUMIRACY"

The project description mentions:

"humiracy"

Do NOT silently assume what this means.

Investigate the intended meaning.

If the intended concept is:

"Numeracy"

use NUMERACY consistently.

If it means something else, document the distinction.

Potential numeracy analytics:

- score
- proficiency
- skill area
- trend
- grade-level comparison
- intervention progress
- students needing support

---

# 24. OTHER ANALYTICS TO EVALUATE

Evaluate whether the school needs:

## Enrollment analytics

- total enrollment
- enrollment by grade
- enrollment by section
- enrollment trend
- transfers
- active/inactive students

## Academic analytics

- general average
- subject averages
- grade trends
- high performers
- struggling students

## Attendance analytics

- attendance rate
- absence trend
- lateness
- repeated absences

## Reading analytics

- reading proficiency
- reading trend
- reading intervention

## Literacy analytics

- literacy proficiency
- literacy trend

## Numeracy analytics

- numeracy proficiency
- numeracy trend
- skill gaps

## Behavior analytics

- behavior category distribution
- positive behavior
- behavior concerns
- repeated concerns

## Intervention analytics

- active interventions
- completed interventions
- intervention outcomes
- students receiving support

## Student development

Evaluate:

- achievements
- extracurricular activities
- leadership
- participation
- awards

Only implement features supported by actual requirements.

---

# 25. STUDENT PROFILE ARCHITECTURE

The student profile should be one of the most important pages.

Design the information architecture as:

STUDENT PROFILE

├── Overview
├── Personal Information
├── Enrollment
├── Academic Performance
├── Grades
├── Attendance
├── Behavior
├── Reading
├── Literacy
├── Numeracy
├── Interventions
├── Achievements
└── Activity History

Only include sections that are actually required.

---

# 26. STUDENT PROFILE UX

The profile should allow authorized users to quickly understand:

- who the student is
- current enrollment
- current grade level
- academic performance
- attendance
- assessments
- behavior
- interventions
- historical progression

Avoid overwhelming the user.

Use:

- tabs
- sections
- expandable areas
- summary metrics
- charts
- timelines

where appropriate.

Preserve the existing visual style.

---

# 27. SCHOOL DASHBOARD

Replace old municipality analytics.

The dashboard should be school-level.

Potential metrics:

- Total Students
- Active Students
- Current Enrollment
- Average General Grade
- Attendance Rate
- Reading Proficiency
- Literacy Proficiency
- Numeracy Proficiency
- Students Needing Support
- Active Interventions

Potential charts:

- enrollment by grade
- performance by subject
- grade trend
- attendance trend
- reading distribution
- literacy distribution
- numeracy distribution
- intervention status

All metrics must come from the database.

No hardcoded production statistics.

---

# 28. ANALYTICS QUALITY RULE

Every chart must answer a real question.

Examples:

GOOD:

"How is academic performance changing over the grading periods?"

"Which subjects have the lowest average performance?"

"How many students are below the target reading proficiency?"

"How is attendance changing?"

BAD:

"Number of records created"

"Number of subjects"

"Number of random database entries"

Analytics must support actual school decision-making.

---

# 29. AT-RISK STUDENT SYSTEM

Evaluate a configurable student-support indicator system.

Possible indicators:

- low academic performance
- declining grades
- repeated absences
- repeated lateness
- low reading performance
- low literacy performance
- low numeracy performance
- repeated behavior concerns
- incomplete intervention

IMPORTANT:

Do not automatically diagnose or label students.

Use neutral terminology such as:

"Requires Attention"

"Needs Monitoring"

"Academic Support Recommended"

where appropriate.

Document the rules.

---

# 30. INTERVENTION MANAGEMENT

Evaluate:

## interventions

Potential fields:

- student
- intervention type
- reason
- assigned personnel
- start date
- target date
- status
- outcome
- notes

Statuses:

- planned
- active
- completed
- discontinued

Analytics:

- active interventions
- completed interventions
- intervention outcomes
- students requiring follow-up

---

# 31. VALIDATION SYSTEM

The old child-mapping validation workflow must be transformed.

New purpose:

STUDENT RECORD VERIFICATION

Possible checks:

- duplicate student
- missing student number
- incomplete profile
- invalid enrollment
- missing grade records
- inconsistent school year
- invalid assessment data

Validation should not automatically destroy or merge records.

---

# 32. DUPLICATE DETECTION

Potential duplicate matching:

- student number
- name
- birth date
- sex
- enrollment information

Workflow:

Possible Duplicate
       ↓
Review
       ↓
Confirm Duplicate
       OR
Mark as Different

Never automatically merge student records without human confirmation.

---

# 33. QR SYSTEM

Review existing QR functionality.

If retained:

QR should represent:

SECURE STUDENT IDENTIFIER

NOT:

complete student information.

Recommended flow:

QR
 ↓
Secure Token
 ↓
Server Validation
 ↓
Permission Check
 ↓
Limited Student Information

Document security considerations.

---

# 34. REPORTING SYSTEM

Replace municipality reports with school reports.

Evaluate:

- Student Master List
- Enrollment Report
- Grade Report
- Subject Performance Report
- Attendance Report
- Behavior Report
- Reading Report
- Literacy Report
- Numeracy Report
- Intervention Report
- Student Profile Report
- At-Risk/Needs Monitoring Report
- Grade-Level Performance Report
- Section Performance Report
- School-Year Comparison Report

Every report requires:

- authorization
- filters
- date/school-year selection
- appropriate privacy controls
- error handling
- empty state

---

# 35. NAVIGATION

Evaluate a school-focused navigation structure such as:

Dashboard

Students
├── Student Registry
├── Add Student
└── Student Profiles

Performance
├── Academic
├── Attendance
├── Reading
├── Literacy
└── Numeracy

Student Development
├── Behavior
├── Interventions
└── Monitoring

Reports

Administration
├── Users
├── Roles & Permissions
├── Activity Logs
└── Settings

Do not blindly implement this structure.

Match it to the existing application.

---

# 36. PAGE-BY-PAGE MIGRATION

Create a complete page migration table.

For EVERY page document:

1. current page
2. current purpose
3. new purpose
4. content changes
5. data changes
6. UI changes
7. backend changes
8. permissions
9. validation
10. testing
11. documentation

---

# 37. COMPONENT MIGRATION

Inspect reusable components.

For each component:

- retain
- modify
- replace
- remove
- create new

Examples:

- dashboard cards
- charts
- data tables
- filters
- forms
- modals
- dialogs
- dropdowns
- badges
- tabs
- student avatar/profile components
- activity timeline
- analytics cards

Do not duplicate components unnecessarily.

---

# 38. DATABASE QUERY ARCHITECTURE

Plan queries carefully.

Avoid:

- loading all students into the client
- calculating large analytics entirely in JavaScript
- unnecessary repeated queries
- N+1 queries
- exposing sensitive records

Prefer:

- server-side aggregation
- indexed queries
- filtered queries
- pagination
- database-level calculations where appropriate

---

# 39. TURSO

The application uses Turso.

Maintain Turso.

Do not replace it unless there is a documented technical reason.

Plan:

- migrations
- indexes
- foreign keys
- constraints
- transactions
- aggregation queries
- connection handling
- error handling

Document all database changes.

---

# 40. NEXT.JS

Preserve the existing Next.js architecture.

Use appropriate:

- Server Components
- Client Components
- Server Actions
- Route Handlers
- Middleware
- Server-side authorization
- Loading states
- Error boundaries
- caching

Do not convert everything into client-side rendering.

---

# 41. TAILWIND

Continue using the existing Tailwind implementation.

Preserve:

- design tokens
- existing utility patterns
- spacing
- typography
- colors

Avoid random inline styling when reusable classes/components already exist.

---

# 42. RESPONSIVE DESIGN

Test:

- desktop
- laptop
- tablet
- mobile

Critical pages:

- dashboard
- registry
- student profile
- grades
- assessments
- reports
- forms

Tables require a deliberate mobile strategy.

---

# 43. ACCESSIBILITY

Plan:

- keyboard navigation
- focus states
- semantic elements
- accessible labels
- form errors
- accessible tables
- chart descriptions
- contrast
- screen-reader considerations

---

# 44. SECURITY

Document:

- authentication
- authorization
- session management
- secure cookies
- password hashing
- input validation
- SQL injection prevention
- XSS prevention
- CSRF protection where applicable
- rate limiting
- audit logs
- sensitive-data protection

Authorization must be enforced server-side.

Never trust frontend role checks alone.

---

# 45. DATA PRIVACY

Student information is sensitive.

The plan must address:

- data minimization
- access control
- audit trails
- secure QR verification
- report permissions
- sensitive notes
- guardian information
- browser exposure
- API responses
- logs
- backups

Never expose unnecessary personal information.

---

# 46. AUDIT LOG

Track:

- login
- logout
- student creation
- student updates
- student archive
- enrollment changes
- grade changes
- attendance changes
- behavior records
- assessments
- interventions
- report generation
- user creation
- role changes
- permission changes
- settings changes

Document:

- actor
- action
- entity
- entity ID
- timestamp
- metadata

---

# 47. ENVIRONMENT SECURITY

NEVER read or modify actual secret files:

- .env
- .env.local
- .env.production
- .env.development

Only inspect/update:

.env.example

Never expose:

- database credentials
- authentication secrets
- API keys
- tokens
- passwords

in documentation.

---

# 48. GIT SAFETY

Before modifications:

- inspect git status
- inspect branch
- inspect recent commits
- understand existing changes

Do NOT:

- reset user work
- delete unrelated files
- force push
- overwrite unrelated changes

---

# 49. MIGRATION SAFETY

Do not immediately delete old tables.

For every obsolete table:

1. identify it
2. determine whether it contains data
3. determine whether it is referenced
4. determine whether data should be migrated
5. determine whether it can be archived
6. document the decision
7. only then propose removal

---

# 50. DOCUMENTATION ARCHITECTURE

Create or update:

documentation/

├── README.md
│
├── project/
│   ├── project-overview.md
│   ├── system-scope.md
│   ├── requirements.md
│   └── glossary.md
│
├── migration/
│   ├── master-migration-plan.md
│   ├── scope-change.md
│   ├── old-vs-new.md
│   ├── removed-features.md
│   ├── retained-features.md
│   ├── repurposed-features.md
│   ├── migration-risks.md
│   └── rollback-plan.md
│
├── database/
│   ├── database-overview.md
│   ├── schema.md
│   ├── data-dictionary.md
│   ├── relationships.md
│   ├── indexing.md
│   ├── constraints.md
│   ├── migration.md
│   └── erd/
│
├── features/
│   ├── students.md
│   ├── enrollment.md
│   ├── academic.md
│   ├── attendance.md
│   ├── behavior.md
│   ├── reading.md
│   ├── literacy.md
│   ├── numeracy.md
│   ├── interventions.md
│   ├── analytics.md
│   ├── reports.md
│   └── qr-verification.md
│
├── security/
│   ├── authentication.md
│   ├── authorization.md
│   ├── privacy.md
│   └── audit-logging.md
│
├── ui/
│   ├── design-system.md
│   ├── page-migration.md
│   ├── navigation.md
│   └── ux-guidelines.md
│
└── testing/
    ├── test-plan.md
    ├── database-tests.md
    ├── authorization-tests.md
    ├── analytics-tests.md
    ├── ui-tests.md
    └── acceptance-tests.md

Adapt this structure to the existing project instead of unnecessarily duplicating documentation.

---

# 51. MASTER IMPLEMENTATION PLAN

Create:

documentation/migration/master-migration-plan.md

This must be the authoritative implementation roadmap.

It must contain:

## Phase 1
Codebase audit

## Phase 2
Requirements and scope migration

## Phase 3
Architecture migration

## Phase 4
Database migration

## Phase 5
ERD migration

## Phase 6
Authentication and roles

## Phase 7
Student records

## Phase 8
Enrollment

## Phase 9
Academic records

## Phase 10
Attendance

## Phase 11
Behavior

## Phase 12
Reading

## Phase 13
Literacy

## Phase 14
Numeracy

## Phase 15
Interventions

## Phase 16
Analytics

## Phase 17
Reports

## Phase 18
QR verification

## Phase 19
UI/page migration

## Phase 20
Security

## Phase 21
Performance

## Phase 22
Testing

## Phase 23
Documentation

## Phase 24
Final audit

---

# 52. EVERY TASK MUST INCLUDE FILE PATHS

Do not write vague tasks such as:

- [ ] Update dashboard

Instead write:

- [ ] Inspect `actual/path/to/dashboard/page.tsx`
- [ ] Identify municipality-specific metrics
- [ ] Replace municipality metrics with school-level metrics
- [ ] Update data-fetching logic
- [ ] Update chart configuration
- [ ] Preserve existing dashboard layout
- [ ] Add loading state
- [ ] Add empty state
- [ ] Add error handling
- [ ] Test dashboard
- [ ] Document dashboard migration

Use ACTUAL paths discovered from the repository.

---

# 53. EVERY DATABASE TASK MUST SPECIFY

For each table:

- table name
- purpose
- columns
- data types
- primary key
- foreign keys
- nullable fields
- unique constraints
- indexes
- relationships
- cascade behavior
- timestamps
- soft deletion if appropriate

Also document why the table exists.

---

# 54. EVERY RELATIONSHIP MUST BE DOCUMENTED

For example:

students
    1
    |
    | many
    ↓
student_enrollments

Document:

- cardinality
- foreign key
- reason
- deletion behavior
- historical implications

Do this for EVERY relationship.

---

# 55. EVERY ANALYTICS TASK MUST SPECIFY

For every chart/metric:

- name
- purpose
- source table
- source fields
- calculation
- filters
- date range
- school year
- user permissions
- chart type
- empty state
- error state
- loading state
- privacy considerations
- performance considerations

---

# 56. EVERY PAGE TASK MUST SPECIFY

For every page:

- current route
- new route
- current purpose
- new purpose
- UI sections
- data required
- database queries
- actions
- permissions
- validation
- loading
- empty state
- error state
- responsive behavior
- accessibility
- tests
- documentation

---

# 57. NO HARD-CODED DATA

The future implementation must NOT use fake production data.

Do not hardcode:

- student counts
- grade averages
- attendance rates
- reading percentages
- literacy percentages
- numeracy percentages
- behavior statistics

Development seed data is allowed only if clearly identified as development data.

---

# 58. NO UNNECESSARY REWRITE

The migration must be incremental.

For each file:

1. inspect
2. identify required changes
3. preserve unrelated logic
4. modify only necessary portions
5. test
6. document

Do not rewrite the entire application unnecessarily.

---

# 59. TESTING PLAN

Create tests for:

## Authentication

- [ ] login
- [ ] logout
- [ ] session
- [ ] invalid login
- [ ] disabled user

## Authorization

- [ ] admin
- [ ] school administrator
- [ ] teacher
- [ ] records personnel
- [ ] guidance personnel
- [ ] unauthorized access

## Students

- [ ] create
- [ ] view
- [ ] edit
- [ ] archive
- [ ] search
- [ ] filter
- [ ] duplicate detection

## Enrollment

- [ ] create enrollment
- [ ] update enrollment
- [ ] historical records

## Grades

- [ ] create
- [ ] edit
- [ ] calculate
- [ ] historical performance

## Assessments

- [ ] reading
- [ ] literacy
- [ ] numeracy

## Attendance

- [ ] record
- [ ] calculate
- [ ] analytics

## Behavior

- [ ] record
- [ ] update
- [ ] permissions

## Intervention

- [ ] create
- [ ] update
- [ ] complete

## Analytics

- [ ] calculations
- [ ] filters
- [ ] charts
- [ ] empty datasets

## Reports

- [ ] authorization
- [ ] filters
- [ ] generation
- [ ] empty reports

---

# 60. PERFORMANCE PLAN

Evaluate:

- database indexes
- pagination
- search
- filtering
- server-side aggregation
- caching
- dashboard loading
- chart loading
- report generation

Avoid N+1 queries.

Avoid loading unnecessary student records.

---

# 61. LOADING / ERROR / EMPTY STATES

Every major page must have:

### Loading

Skeleton or appropriate loading UI matching the existing design.

### Empty

Helpful message explaining what to do next.

### Error

Clear error message without exposing technical details.

### Success

Clear feedback after important operations.

Preserve existing UI language.

---

# 62. FINAL MIGRATION CHECKLIST

The master plan must end with:

## Scope

- [ ] Municipality scope removed
- [ ] Barangay scope removed
- [ ] LGU scope removed
- [ ] Multi-agency scope removed
- [ ] School-only scope confirmed

## Database

- [ ] New student-centered schema
- [ ] Enrollment history
- [ ] Academic records
- [ ] Attendance
- [ ] Behavior
- [ ] Reading
- [ ] Literacy
- [ ] Numeracy
- [ ] Interventions
- [ ] Roles
- [ ] Permissions
- [ ] Audit logs

## UI

- [ ] Existing design preserved
- [ ] Navigation updated
- [ ] Dashboard updated
- [ ] Student registry updated
- [ ] Student profile updated
- [ ] Forms updated
- [ ] Reports updated

## Analytics

- [ ] Academic
- [ ] Attendance
- [ ] Behavior
- [ ] Reading
- [ ] Literacy
- [ ] Numeracy
- [ ] Intervention
- [ ] Enrollment

## Security

- [ ] Authentication
- [ ] Authorization
- [ ] Privacy
- [ ] Audit
- [ ] QR security

## Testing

- [ ] Unit
- [ ] Integration
- [ ] Database
- [ ] Authorization
- [ ] Analytics
- [ ] UI
- [ ] Responsive

## Documentation

- [ ] Architecture
- [ ] Database
- [ ] ERD
- [ ] Features
- [ ] Security
- [ ] Migration
- [ ] Testing

---

# 63. FINAL OUTPUT REQUIRED FROM YOU

After inspecting the codebase, DO NOT implement the changes yet.

Instead generate the complete implementation plan.

The response must contain:

1. Executive summary
2. Existing architecture analysis
3. Existing database analysis
4. Existing route analysis
5. Existing UI analysis
6. Existing authentication analysis
7. Existing authorization analysis
8. Old functionality inventory
9. New system scope
10. New architecture
11. New role architecture
12. Permission matrix
13. New database design
14. Complete table list
15. Complete field recommendations
16. Complete relationships
17. ERD migration plan
18. Page migration plan
19. Navigation migration
20. Student profile plan
21. Academic performance plan
22. Attendance plan
23. Behavior plan
24. Reading plan
25. Literacy plan
26. Numeracy plan
27. Intervention plan
28. Analytics plan
29. Dashboard plan
30. Report plan
31. QR plan
32. Validation plan
33. Duplicate detection plan
34. Security plan
35. Privacy plan
36. Audit logging plan
37. Performance plan
38. Testing plan
39. Documentation plan
40. Migration risks
41. Rollback strategy
42. Complete checkbox implementation roadmap

---

# 64. FINAL IMPORTANT INSTRUCTION

DO NOT lose the existing design.

DO NOT redesign the application unnecessarily.

DO NOT preserve obsolete municipality functionality just because it already exists.

DO NOT blindly rename tables.

DO NOT blindly rename "child" to "student".

DO NOT invent DepEd policies.

DO NOT invent assessment standards.

DO NOT invent grading thresholds.

DO NOT invent student risk criteria without documenting them.

DO NOT expose sensitive student information.

DO NOT use hardcoded production analytics.

DO NOT modify `.env` files.

DO NOT delete database tables without migration analysis.

DO NOT implement before creating the complete plan.

The objective is:

OLD SYSTEM

Integrated Web-Based Child Mapping System
        ↓
Municipality
        ↓
Barangay
        ↓
LGU
        ↓
School
        ↓
Community
        ↓
Child Mapping

MIGRATE TO:

NEW SYSTEM

Records Management System with Profile and Performance Analytics
of Sta. Magdalena National High School

        ↓

School
        ↓
School Users
        ↓
Students
        ↓
Enrollment
        ↓
Academic Records
        ↓
Attendance
        ↓
Behavior
        ↓
Reading
        ↓
Literacy
        ↓
Numeracy
        ↓
Interventions
        ↓
Analytics
        ↓
Reports

The final system should feel like an evolution of the existing application, not an unrelated new project.

PRESERVE THE DESIGN.

MODERNIZE THE FUNCTIONALITY.

RESTRUCTURE THE DATABASE.

REBUILD THE ANALYTICS AROUND STUDENTS.

KEEP THE SYSTEM SCHOOL-ONLY.

DOCUMENT EVERYTHING.

CHECK EVERY TASK.

PLAN FIRST.

IMPLEMENT ONLY AFTER THE PLAN IS COMPLETE.