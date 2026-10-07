# Implement Grade Management, Academic Progression & Performance Analytics

You are working on the existing project:

**Records Management System with Profile and Performance Analytics of Sta. Magdalena National High School**

Your task is to implement the complete grade-management, academic-year progression, enrollment, promotion, historical-record, and performance-analytics system based on the implementation plan located at:

```text
grade-plan/main.md
```

## CRITICAL INSTRUCTION

**READ `grade-plan/main.md COMPLETELY BEFORE MODIFYING ANY CODE.**

Do not start implementation immediately.

First, thoroughly inspect:

1. `grade-plan/main.md`
2. The entire existing project structure
3. Existing database schema/migrations
4. Existing models/entities
5. Existing API/server actions/controllers
6. Existing authentication and authorization
7. Existing student/profile functionality
8. Existing dashboard
9. Existing analytics/chart components
10. Existing school year, grade level, section, subject, or enrollment functionality
11. Existing UI components and design system
12. Existing validation logic
13. Existing audit/logging mechanisms
14. Existing tests
15. Existing seeders/sample data
16. Existing routing/navigation
17. Existing loading/error/empty states

Do not assume that the project is empty.

The existing codebase is the source of truth for what already exists.

---

# 1. Primary Objective

Implement the grade-management architecture described in:

```text
grade-plan/main.md
```

The final system must correctly support:

* Students
* Academic years
* Grade levels
* Sections
* Subjects
* Curriculum
* Enrollment
* Quarterly grades
* Final grades
* Grade validation
* Grade finalization
* Grade correction workflow
* Promotion
* Retention
* Graduation
* Transfer/inactive students
* Historical academic records
* Student performance analytics
* Subject analytics
* Section analytics
* Grade-level analytics
* School-wide analytics
* Performance trends
* At-risk detection
* Audit history
* Academic-year transitions

Do not implement only the visible UI.

Implement the complete underlying data relationships, business logic, APIs/server logic, validation, authorization, and analytics required to make the feature production-ready.

---

# 2. MOST IMPORTANT ARCHITECTURAL RULE

The system must treat:

> **Student Profile**

and

> **Student Enrollment**

as separate concepts.

A student's profile should contain relatively permanent identity/profile information.

The student's:

* School Year
* Grade Level
* Section
* Adviser
* Enrollment Status

must belong to an academic enrollment record.

Do NOT create a design where changing the student's current grade level or section overwrites historical academic information.

---

# 3. Historical Grade Integrity

Grades must belong to an enrollment/academic-year context.

The conceptual relationship should be:

```text
Student
   ↓
Enrollment
   ↓
School Year
   ↓
Grade Level
   ↓
Section
   ↓
Subjects
   ↓
Grade Records
```

Example:

```text
2026–2027
Grade 7
Rizal
Mathematics
Quarter 1 = 88
Quarter 2 = 89
Quarter 3 = 90
Quarter 4 = 91
Final = 90
```

If the student becomes:

```text
2027–2028
Grade 8
Bonifacio
```

the previous Grade 7 records must remain untouched.

The student's new enrollment must reference the new academic year and new grade/section.

---

# 4. DO NOT USE CURRENT PROFILE DATA FOR HISTORICAL GRADES

Do not build grade queries such as:

```text
student_id + subject_id
```

when this can cause historical records to collide.

The grade system must preserve the academic context.

Prefer a structure conceptually equivalent to:

```text
enrollment_id
subject_id
grading_period
grade
```

or the equivalent architecture already established by the existing project.

Follow the exact database design specified in:

```text
grade-plan/main.md
```

---

# 5. Read Before Designing

Before writing migrations or modifying existing tables, determine:

* Which student tables already exist?
* Which user tables already exist?
* Which role system already exists?
* Are school years already implemented?
* Are sections already implemented?
* Are subjects already implemented?
* Is there an enrollment table?
* Is there an existing grade table?
* Is there an existing performance table?
* How are relationships currently modeled?
* What database technology is already being used?
* What ORM/query layer is already being used?
* How does the application currently validate data?
* How does the frontend communicate with the backend?

Do not duplicate existing functionality.

If something already exists, extend it safely rather than creating a competing implementation.

---

# 6. Implementation Strategy

Implement the feature in logical phases.

Do not make one enormous uncontrolled modification.

Recommended implementation order:

## Phase 1 — Existing Codebase Audit

Read the codebase and identify:

* existing student architecture
* existing academic architecture
* existing database relationships
* existing UI patterns
* existing analytics patterns
* existing authorization
* existing validation
* existing reusable components

Create or update an implementation checklist if appropriate.

---

## Phase 2 — Database Architecture

Implement or update the required entities/tables from:

```text
grade-plan/main.md
```

Potential concepts include:

```text
students
school_years
grade_levels
sections
subjects
curriculums
curriculum_subjects
enrollments
grade_records
grading_periods
grading_configurations
promotion_records
performance_snapshots
grade_change_logs
audit_logs
```

Do NOT blindly create every table above.

Use:

```text
grade-plan/main.md
```

and the existing codebase to determine exactly which are required.

Avoid unnecessary duplication.

---

# 7. Database Constraints

Add appropriate database-level protections.

Examples:

* Unique student enrollment per academic year where appropriate
* Unique subject assignment within an enrollment
* Unique grade record per enrollment/subject/period
* Foreign key relationships
* Appropriate cascade/restrict behavior
* Required fields
* Valid status values
* Appropriate indexes
* Efficient lookup indexes

Be especially careful with historical records.

Do not use cascading deletes that could accidentally destroy academic history.

---

# 8. Academic Year Management

Implement academic-year management according to the plan.

The system should support:

```text
Upcoming
Active
Closed
Archived
```

or the exact states defined in the plan.

There must be only one appropriate active academic year if the business rules require this.

When an academic year is closed:

* finalized grades remain available
* historical records remain searchable
* ordinary users cannot casually modify finalized historical records
* analytics continue to work
* the next academic year can be prepared

---

# 9. Enrollment System

Implement enrollment as the source of truth for a student's academic placement.

Enrollment should be able to represent:

* School Year
* Grade Level
* Section
* Adviser where applicable
* Enrollment Status
* Enrollment date
* Completion status
* Promotion status

Possible statuses include:

```text
Enrolled
Promoted
Retained
Transferred
Graduated
Dropped
Inactive
```

Use the exact statuses defined in the plan where applicable.

---

# 10. Curriculum and Subject Assignment

Implement automatic subject assignment where required.

The workflow should conceptually be:

```text
Student Enrollment
       ↓
Grade Level
       ↓
Curriculum
       ↓
Curriculum Subjects
       ↓
Student Grade Records
```

Avoid requiring an administrator to manually create every subject-grade relationship for every student.

However, do not hard-code curriculum assumptions.

Curriculum should be maintainable and versionable.

---

# 11. Curriculum Versioning

Historical students must not unexpectedly inherit a new curriculum.

For example:

```text
2026–2027 Curriculum
```

and:

```text
2028–2029 Curriculum
```

must be independently maintainable when curriculum requirements change.

Historical academic records must remain associated with the curriculum/context that applied when those records were created.

---

# 12. Gradebook

Implement a usable gradebook.

The user should be able to select:

```text
School Year
Grade Level
Section
Subject
Grading Period
```

and receive the appropriate student list automatically.

Example:

```text
2026–2027
Grade 7
Rizal
Mathematics
Quarter 1
```

Then:

```text
Student              Grade
Juan Dela Cruz        89
Maria Santos          92
Pedro Reyes           87
```

Do not require the user to manually search and connect every student.

The system should derive the correct students from enrollment.

---

# 13. Grade Validation

Implement robust validation.

Prevent:

* Invalid numeric values
* Grades outside configured limits
* Invalid grading periods
* Duplicate grade records
* Grades assigned to the wrong enrollment
* Grades assigned to subjects outside the student's curriculum where prohibited
* Grades assigned to inactive/invalid enrollments
* Unauthorized grade modifications

Validation must exist at both:

* frontend/user interface level
* backend/server/database level where appropriate

Never rely solely on frontend validation.

---

# 14. Grade Calculation

Implement configurable grade calculations.

Do not permanently hard-code one formula unless the existing plan explicitly requires it.

The system should support the configured grading method.

For example:

```text
Q1
Q2
Q3
Q4
     ↓
Final Grade
```

The calculation should be centralized so the same logic is used by:

* gradebook
* student profile
* analytics
* reports
* promotion logic
* dashboards

Avoid implementing the same calculation separately in multiple frontend components.

---

# 15. Grade Status Workflow

Implement appropriate grade states.

For example:

```text
Draft
Submitted
Reviewed
Finalized
Locked
```

Use the states from the plan where defined.

The system should prevent unauthorized changes after finalization.

---

# 16. Grade Correction Workflow

Do not simply overwrite finalized grades.

Implement a controlled correction mechanism.

Conceptually:

```text
Finalized Grade
      ↓
Correction Request
      ↓
Reason
      ↓
Old Grade
      ↓
Proposed New Grade
      ↓
Authorization/Approval
      ↓
Updated Grade
```

Maintain the original value and change history.

Every correction should record information such as:

* Who made the change
* Previous grade
* New grade
* Reason
* Timestamp
* Approval information where applicable

---

# 17. Automatic Promotion Logic

Implement promotion logic based on the rules in:

```text
grade-plan/main.md
```

The system should be able to evaluate:

```text
Current Enrollment
       ↓
Final Grades
       ↓
Promotion Rules
       ↓
Promotion Result
```

Possible outcomes:

```text
Promoted
Retained
Graduated
Requires Review
```

Do not make assumptions about school policy if the plan does not specify them.

Make promotion rules configurable where practical.

---

# 18. Automatic Next-Year Enrollment

When a student is promoted:

```text
Grade 7
2026–2027
      ↓
Promoted
      ↓
Grade 8
2027–2028
```

The new enrollment must be created without modifying the old enrollment.

The previous enrollment becomes historical.

---

# 19. Section Assignment

Do NOT blindly assume that:

```text
Grade 7 Rizal
```

must become:

```text
Grade 8 Rizal
```

unless the school configuration explicitly defines this behavior.

Support the possibility of:

```text
Previous Section
       ↓
Section Assignment Rules
       ↓
New Section
```

If automatic assignment is enabled, follow configured rules.

If manual approval is required, the system should generate a recommendation rather than silently making an administrative decision.

---

# 20. Retention

If a student is retained:

```text
Grade 7
2026–2027
      ↓
Retained
      ↓
Grade 7
2027–2028
```

The new enrollment must still be a separate academic-year record.

Do not reuse the previous enrollment.

---

# 21. Graduation

For graduating students:

```text
Final Grade
     ↓
Completion Requirements
     ↓
Graduated
```

The system should stop normal promotion/enrollment creation once graduation is confirmed.

Historical records remain accessible.

---

# 22. Transfers

If a student transfers:

Do not delete their profile or academic history.

Instead update the appropriate enrollment/status.

Historical records should remain available according to the system's authorization rules.

---

# 23. Student Performance Analytics

Implement the analytics described in the plan.

At minimum, consider:

### Student-level

* Current average
* Previous average
* Overall trend
* Subject averages
* Highest subject
* Lowest subject
* Failed/low-performing subjects
* Quarter-to-quarter change
* Year-to-year change
* Performance classification

### Section-level

* Number of students
* Average performance
* Passing percentage
* At-risk count
* Highest/lowest performance
* Subject performance

### Grade-level

* Average performance
* Passing rate
* At-risk students
* Subject comparison
* Performance trends

### School-level

* Total students
* Overall average
* Passing rate
* At-risk count
* Grade-level comparison
* Subject performance
* Year-over-year trends

---

# 24. Performance Trend Detection

Do not only display averages.

Calculate meaningful trends.

For example:

```text
Q1 → Q2 → Q3 → Q4
```

and:

```text
2025–2026 → 2026–2027
```

Identify:

```text
Improving
Stable
Declining
```

Use the thresholds and logic defined in the plan.

Avoid false conclusions when there is insufficient data.

For example, do not classify a student as "declining" if only one quarter has data.

---

# 25. At-Risk Detection

Implement automated performance flags.

Potential factors:

* Low average
* Failed subject
* Multiple low grades
* Significant decline
* Repeated low performance
* Missing grades

The logic should be transparent and configurable.

Do not create a black-box score that administrators cannot understand.

When a student is flagged, the interface should explain **why**.

Example:

```text
Needs Attention

Mathematics: 73
Science: 76
Overall average declined by 6.2 points.
```

---

# 26. Analytics Must Handle Missing Data

This is extremely important.

Do not treat:

```text
Missing grade
```

as:

```text
0
```

unless the school explicitly defines that behavior.

Analytics must distinguish between:

```text
No grade yet
Missing
Incomplete
Zero
Failed
Not applicable
```

Do not distort averages because of missing records.

---

# 27. Performance Snapshots

If the plan recommends performance snapshots, implement them carefully.

Snapshots can improve analytics performance for large datasets, but:

> The underlying grade records remain the source of truth.

Do not allow analytics snapshots to become the authoritative academic record.

---

# 28. Dashboard Integration

Integrate the grade analytics into the existing dashboard without redesigning the entire application.

Preserve:

* Existing theme
* Existing typography
* Existing spacing system
* Existing navigation
* Existing component patterns
* Existing colors
* Existing responsive behavior

The new analytics should feel native to the existing system.

---

# 29. Interactive Analytics

Where appropriate, add:

* Tooltips
* Hover states
* Click-to-filter
* Drill-down
* Date/academic-year filtering
* Grade-level filtering
* Section filtering
* Subject filtering
* Student filtering
* Empty states
* Loading states
* Error states

For example:

```text
School Average
      ↓ click
Grade-level breakdown
      ↓ click
Section breakdown
      ↓ click
Student list
      ↓ click
Student performance profile
```

Avoid adding interaction merely for decoration.

Every interaction should provide useful information.

---

# 30. Student Profile Integration

The student profile should eventually provide an academic section containing:

```text
Current Enrollment
Academic History
Current Average
Subject Performance
Quarterly Performance
Yearly Performance
Performance Trend
Promotion History
```

Example:

```text
Juan Dela Cruz

Current:
Grade 8 – Bonifacio
2027–2028

Performance:
Current Average: 89.2

Trend:
↑ Improving
```

Then:

```text
Academic History

2026–2027
Grade 7 – Rizal
Average: 86.4

2027–2028
Grade 8 – Bonifacio
Average: 89.2
```

---

# 31. Authorization

Do not assume all authenticated users can modify grades.

Inspect the existing role/permission architecture first.

Implement permissions appropriate to the existing project.

Examples:

```text
View grades
Enter grades
Edit draft grades
Submit grades
Review grades
Finalize grades
Correct finalized grades
Manage curriculum
Manage academic years
Manage sections
Manage promotion
View analytics
```

Use the project's existing authorization mechanism rather than creating an unrelated permission system.

---

# 32. Audit Logging

Academic records require strong traceability.

Record important events such as:

```text
Grade created
Grade updated
Grade submitted
Grade finalized
Grade corrected
Enrollment created
Enrollment changed
Student promoted
Student retained
Student graduated
Academic year opened
Academic year closed
```

Do not log sensitive information unnecessarily.

Follow the existing audit architecture if one already exists.

---

# 33. Performance and Query Optimization

Do not implement analytics using inefficient repeated queries.

Inspect the existing database/query patterns.

Avoid:

```text
N + 1 queries
```

for student/grade/subject analytics.

Use:

* Proper indexes
* Efficient joins
* Aggregation queries
* Appropriate eager loading
* Pagination
* Caching where justified
* Memoization where appropriate
* Server-side aggregation for large datasets

Do not introduce caching that can cause stale academic data unless invalidation is correctly implemented.

---

# 34. Concurrency and Data Integrity

Consider situations where two authorized users edit grades at the same time.

Prevent:

* Duplicate grade records
* Lost updates
* Accidental overwrites
* Finalized grade modification
* Conflicting promotion operations

Use transactions for multi-step operations such as:

```text
Promotion
+
New Enrollment
+
Subject Assignment
```

where appropriate.

---

# 35. Automatic Operations Must Be Safe

"Automatic" does not mean "uncontrolled."

Any automatic process must be:

* Deterministic
* Validated
* Idempotent
* Auditable
* Reversible where appropriate
* Protected against duplicate execution

For example, running a promotion process twice should NOT create two enrollments for the same student and academic year.

---

# 36. UI/UX Requirements

Follow the existing design system.

Do not introduce:

* Random colors
* Excessive cards
* Unnecessary borders
* AI-looking dashboard decorations
* Unrelated gradients
* Inconsistent typography
* Unnecessary animations

Use the existing project's visual language.

Prioritize:

* Clarity
* Readability
* Information hierarchy
* Fast scanning
* Responsive design
* Accessibility
* Keyboard usability
* Clear feedback

---

# 37. Loading States

Every new grade-management page should have appropriate:

* Skeleton loading
* Loading indicators
* Disabled states during mutations
* Empty states
* Error states
* Success feedback

Do not make users wonder whether an operation succeeded.

---

# 38. Error Handling

Implement meaningful error messages.

Avoid exposing:

* Database errors
* Stack traces
* Internal implementation details
* Sensitive information

Errors should tell users:

1. What happened
2. Why it happened when appropriate
3. What they can do next

---

# 39. Testing

Add/update tests for critical business logic.

At minimum test:

### Enrollment

* Student can have one appropriate enrollment per academic year
* Historical enrollments remain unchanged
* Current enrollment is resolved correctly

### Grades

* Grade creation
* Grade validation
* Duplicate prevention
* Grade calculation
* Finalization
* Grade locking
* Correction workflow

### Promotion

* Promoted student
* Retained student
* Graduating student
* Transfer
* Duplicate promotion prevention
* Re-running promotion safely

### Analytics

* Correct averages
* Missing-grade handling
* Trend calculations
* At-risk detection
* Historical comparisons

---

# 40. Migration Safety

Before changing existing database structures:

1. Inspect current migrations.
2. Inspect existing production assumptions.
3. Avoid destructive migrations unless absolutely necessary.
4. Preserve existing data.
5. Provide migration paths for existing records.
6. Test migrations against realistic existing data.

Never casually delete or rename existing columns/tables.

---

# 41. Seed/Data Compatibility

Update seeders where appropriate.

Create realistic development data containing:

* Multiple school years
* Multiple grade levels
* Multiple sections
* Multiple subjects
* Students with complete grades
* Students with missing grades
* Students with declining performance
* Students with improving performance
* Promoted students
* Retained students
* Graduated students
* Transferred students

This is necessary to properly test analytics.

Do not use real personal student information.

---

# 42. Documentation

Update relevant documentation after implementation.

Document:

* Database relationships
* Enrollment behavior
* Grade lifecycle
* Promotion rules
* Grade calculation rules
* Analytics formulas
* Permission rules
* Automatic processes
* Important assumptions

If the project already has documentation conventions, follow them.

---

# 43. Environment Safety

Follow the project's existing environment rules.

**NEVER read, expose, modify, rewrite, or commit `.env` files.**

Only use:

```text
.env.example
```

when environment configuration needs to be inspected.

Do not place secrets in source code.

---

# 44. Preserve Existing Functionality

This is a critical requirement.

Do not break:

* Authentication
* Login
* Registration
* Student management
* Existing dashboard
* Existing navigation
* Existing profile functionality
* Existing analytics
* Existing API behavior
* Existing database relationships

Before modifying shared components, determine what depends on them.

---

# 45. Do Not Overengineer

Implement what is required by:

```text
grade-plan/main.md
```

and what is necessary for a reliable production implementation.

Do not introduce unnecessary:

* Libraries
* Frameworks
* Abstractions
* Services
* Database tables
* Dependencies
* Design patterns

Reuse existing project architecture whenever possible.

---

# 46. Implementation Checklist

Maintain a detailed checklist while implementing.

Use checkboxes such as:

```text
- [ ] Database architecture
- [ ] Academic years
- [ ] Grade levels
- [ ] Sections
- [ ] Subjects
- [ ] Curriculum
- [ ] Enrollment
- [ ] Grade records
- [ ] Grade calculation
- [ ] Grade validation
- [ ] Grade finalization
- [ ] Grade correction
- [ ] Promotion
- [ ] Retention
- [ ] Graduation
- [ ] Transfers
- [ ] Performance analytics
- [ ] At-risk detection
- [ ] Student analytics
- [ ] Section analytics
- [ ] Grade-level analytics
- [ ] School analytics
- [ ] Audit logging
- [ ] Authorization
- [ ] Tests
- [ ] Loading states
- [ ] Error states
- [ ] Responsive UI
- [ ] Documentation
```

Mark items as complete **only after they are actually implemented and verified**.

---

# 47. Verification Requirements

After implementation, run the appropriate:

* Type checks
* Linting
* Unit tests
* Integration tests
* Build
* Database migration checks
* Existing test suite

Fix all regressions introduced by your implementation.

Do not declare the task complete simply because the application builds.

---

# 48. Final Verification Scenarios

Manually or automatically verify these scenarios:

### Scenario A — Normal Promotion

```text
Juan
2026–2027
Grade 7
Rizal

Final Average: 88

↓

Promoted

↓

2027–2028
Grade 8
Bonifacio
```

Verify that Grade 7 grades remain unchanged.

---

### Scenario B — Section Change

```text
Grade 7 – Rizal
        ↓
Grade 8 – Bonifacio
```

Verify that Grade 7 remains Rizal.

---

### Scenario C — Retention

```text
Grade 7
2026–2027

↓

Retained

↓

Grade 7
2027–2028
```

Verify separate enrollments.

---

### Scenario D — Grade Correction

```text
Original: 84

Correction:
84 → 86

Reason: Encoding error
```

Verify audit history.

---

### Scenario E — Historical Analytics

Verify:

```text
Grade 7 Average
Grade 8 Average
Overall Trend
```

remain correct after the student advances.

---

### Scenario F — Missing Grade

Verify that a missing grade does not automatically become zero unless configured by the school.

---

### Scenario G — Duplicate Promotion

Run the promotion process twice.

Verify that only one next-year enrollment exists.

---

# 49. Final Code Quality Requirements

Before declaring completion:

* Remove dead code introduced during implementation.
* Remove unnecessary imports.
* Remove temporary debugging statements.
* Ensure naming is consistent.
* Ensure relationships are correctly typed.
* Ensure validation is centralized where appropriate.
* Ensure calculations are not duplicated.
* Ensure database queries are efficient.
* Ensure components are reusable.
* Ensure mobile layouts work.
* Ensure accessibility is not ignored.
* Ensure errors are handled.
* Ensure authorization is enforced server-side.
* Ensure historical grades cannot be accidentally overwritten.

---

# 50. Final Deliverable

At the end of the implementation, provide a concise implementation report containing:

## Implemented

List the major features completed.

## Database Changes

List:

* New tables
* Modified tables
* Relationships
* Important indexes/constraints

## Business Logic

Explain:

* Enrollment
* Grade calculation
* Promotion
* Retention
* Graduation
* Grade finalization
* Correction workflow

## Analytics

List the implemented analytics and how they are calculated.

## Security

Explain:

* Authorization
* Validation
* Audit logging
* Historical record protection

## Testing

Report:

* Tests run
* Build status
* Lint status
* Type-check status
* Any remaining issues

## Files Changed

List the important files/folders modified and briefly explain their purpose.

## Remaining Work

Only list genuinely unfinished items.

---

# FINAL COMMAND

Start by reading:

```text
grade-plan/main.md
```

**completely.**

Then inspect the existing codebase.

Then compare the plan against the existing implementation.

Then create an implementation strategy based on what actually exists.

Only after this analysis should you begin modifying the code.

**Do not rewrite the project from scratch.**

**Do not replace the existing design.**

**Do not change unrelated functionality.**

**Do not make assumptions when the codebase or `grade-plan/main.md` already provides the answer.**

The final implementation must make the grade system behave as a reliable academic record system where students can move between school years, grade levels, and sections without destroying or altering their historical grades.
