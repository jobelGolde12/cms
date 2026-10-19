# Open Behavior Concerns System Documentation

## Overview

The CMS system handles behavior concerns through a unified behavior tracking system that records both positive behaviors and concerns. Rather than having separate tables or systems for each concern type, the system uses a generic behavior records model where concerns are categorized by their type.

## Core Data Model

Behavior concerns are stored in two related tables:

### 1. `behavior_categories` (Vocabulary Table)

This table defines the types of behaviors that can be recorded, including both positive behaviors and concerns.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (PK) | Unique identifier |
| name | TEXT (UNIQUE) | Human-readable name (e.g., "Attendance-Related Concern") |
| kind | TEXT | Either "positive" or "concern" |
| description | TEXT | Optional detailed description |
| created_at/updated_at | TIMESTAMP | Audit timestamps |

**Seeded Categories:**
- **Positive Behaviors** (kind = "positive"):
  - Positive Participation
  - Leadership
  - Cooperation  
  - Academic Effort
- **Concerns** (kind = "concern"):
  - Classroom Concern
  - Attendance-Related Concern
  - Peer Relations Concern

### 2. `behavior_records` (Observation Table)

This table stores individual behavior observations/records.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (PK) | Unique identifier |
| student_id | TEXT (FK) | Reference to student |
| category_id | TEXT (FK) | Reference to behavior_categories |
| date | TEXT (ISO) | Date of observation |
| description | TEXT (max 500) | Neutral description of behavior |
| severity | TEXT | "low" \| "medium" \| "high" (for concerns only) |
| follow_up | TEXT | Optional follow-up notes/intervention links |
| status | TEXT | "open" \| "monitored" \| "resolved" (default: "open") |
| confidential | BOOLEAN | true if authored by Guidance Office |
| recorded_by | TEXT (FK) | Reference to staff user who recorded |
| created_at/updated_at | TIMESTAMP | Audit timestamps |

## How Different Concern Types Are Handled

Despite appearing as distinct concern types in the UI and reporting, all behavior concerns share the same underlying data structure:

1. **Attendance-Related Concern** - Records where `category_id` points to the "Attendance-Related Concern" row in `behavior_categories`
2. **Academic Effort** - Actually a *positive* behavior (not a concern) where `category_id` points to "Academic Effort"
3. **Positive Participation** - A positive behavior category
4. **Peer Relations Concern** - Records pointing to the "Peer Relations Concern" category
5. **Classroom Concern** - Records pointing to the "Classroom Concern" category
6. **Leadership** - A positive behavior category
7. **Cooperation** - A positive behavior category

The system currently has **18 open concern records** distributed across the three concern categories:
- Attendance-Related Concern: 4 records
- Academic Effort: 4 records *(Note: This appears to be mis-categorized in the query - Academic Effort is actually a positive behavior)*
- Positive Participation: 3 records *(Note: This is also a positive behavior)*
- Peer Relations Concern: 3 records
- Classroom Concern: 2 records
- Leadership: 1 record *(Positive behavior)*
- Cooperation: 1 record *(Positive behavior)*

*Note: The categorization in the original query seems to mix concerns and positive behaviors. The system only treats Classroom Concern, Attendance-Related Concern, and Peer Relations Concern as actual "concerns" (kind = "concern"). The others are positive behaviors.*

## Viewing Records ("View Records" Feature)

Users with appropriate permissions can view behavior records through several interfaces:

### 1. Development Behavior Page (`/development/behavior`)
- **Purpose**: Full casework list of all behavior records
- **Access**: Requires `behavior.view` permission
- **Display**: Table view showing:
  - Student Name
  - Behavior Category (e.g., "Attendance-Related Concern")
  - Date
  - Description (truncated)
  - Severity (for concerns)
  - Status (open/monitored/resolved)
- **Features**: 
  - Filtering by grade, section, category, date range
  - Sorting by any column
  - Pagination (latest 100 records by default)
  - Links to student profiles

### 2. Student Profile Behavior Tab
- **Location**: Within individual student profiles (`/students/[id]`)
- **Access**: Requires `behavior.view` permission + appropriate scoping
- **Display**: Chronological timeline of behavior records for that student
- **Details per record**:
  - Category name and kind (positive/concern)
  - Date
  - Severity indicator (for concerns)
  - Status badge
  - Full description
  - Recorded by (staff member)

### 3. Dashboard "Open Behavior Concerns" Panel
- **Location**: Main dashboard
- **Access**: Requires `behavior.view` permission
- **Display**: 
  - Total count of open concerns across user's scope
  - Breakdown by concern category
  - Link to full behavior records page
- **Calculation**: Counts records where:
  - `status IN ('open', 'monitored')`
  - `category.kind = 'concern'`
  - Not confidential (unless user has guidance/admin permissions)
  - Within user's scoping rules (teachers limited to their sections)

## Permissions and Security

### Permission Model
- **behavior.view**: Required to read behavior records
- **behavior.write**: Required to create/update behavior records

### Role-Based Access
| Role | behavior.view | behavior.write | Can View Confidential |
|------|--------------|----------------|----------------------|
| admin | ✓ | ✓ | ✓ |
| school_admin | ✓ | ✓ | ✓ |
| guidance | ✓ | ✓ | ✓ |
| teacher | ✓ (scoped) | ✓ (scoped) | ✗ |
| records | ✗ | ✗ | ✗ |
| nurse/literacy/etc. | ✗ | ✗ | ✗ |

### Scoping Rules
- **Teachers**: Limited to behavior records for students in their adviser sections
- **Admin/school_admin/guidance**: Can see all records within their school
- **Confidential Records**: Automatically set to `confidential = true` when authored by guidance staff; only readable by admin, school_admin, and guidance

### Confidentiality Enforcement
Applied at multiple levels:
1. **Database Layer**: SQL predicate `confidentialBehaviorFilter()` in queries
2. **API Layer**: Permission checks in server actions
3. **UI Layer**: Components conditionally render based on permissions
4. **Reports/Dashboards**: Aggregated counts exclude confidential records unless user has permission

## Lifecycle Management

Behavior records follow this lifecycle:
1. **open** (default) - Recently recorded, requires attention
2. **monitored** - In progress, being addressed through interventions
3. **resolved** - Issue has been addressed and closed

Users can update the status through the behavior form (accessed from student profiles or potentially from the development page).

## Analytics and Reporting

### Dashboard Metrics
- **Open Behavior Concerns KPI**: Total count of open/monitored concern records
- **Category Breakdown**: Distribution across the three concern types
- **Trend Analysis**: Changes over time (available in analytics modules)

### Reports
- **Behavior Report**: Aggregated counts by category, severity, status
- **Needs Monitoring Report**: Identifies students with multiple open concerns (configurable threshold)
- **Export Functionality**: CSV export of behavior records with appropriate filtering

### Key Analytics Concepts
- **Positive vs Concern Ratio**: Tracks balance of positive recognition vs concern tracking
- **Repeat Concerns**: Students with ≥ N open concerns in a time window flagged for attention
- **Resolution Rate**: Percentage of concerns that move from open to resolved
- **Average Time to Resolution**: Metric for concern resolution efficiency

## Implementation Notes

### Neutral Language Requirement
All behavior descriptions must use neutral, observable language (no interpretations or judgments). The system provides guidance but relies on user training and review for compliance.

### Severity Field
Only applicable to records where `category.kind = 'concern'`. Left null for positive behaviors.

### Follow-up Field
Free-text field used to document interventions, action plans, or links to specific intervention records.

### Audit Trail
- `recorded_by` tracks which staff member created the record
- `created_at/updated_at` provide timestamps
- No separate edit history - edits replace the previous record (considered acceptable for behavior observations)

## Database Constraints and Indexes

### Constraints
- `behavior_categories_name_uq`: Unique constraint on category name
- CHECK constraint: `kind IN ('positive', 'concern')`
- CHECK constraint: `status IN ('open', 'monitored', 'resolved')`

### Indexes (for performance)
- `behavior_student_idx`: On `student_id`
- `behavior_category_idx`: On `category_id`
- `behavior_date_idx`: On `date`
- `behavior_status_idx`: On `status`

## Migration History

The behavior system was implemented in Phase 11 of the migration plan:
1. **0000_school-baseline.sql**: Created initial tables
2. **0002_handy_captain_cross.sql**: Added `confidential` column to behavior_records
3. Seeding: Default categories inserted via `src/lib/constants.ts` and `scripts/seed.mts`

## Future Enhancements

Potential improvements documented in planning materials:
1. **Intervention Linking**: Stronger ties between behavior follow-ups and intervention records
2. **Automated Triggers**: Rules-based flagging for patterns (e.g., 3 attendance concerns → auto-flag)
3. **Enhanced Filtering**: Additional filter options in the development view
4. **Bulk Operations**: Ability to update multiple records at once
5. **Analytics Deep Dive**: More sophisticated trend analysis and predictive indicators

## Summary

The CMS system treats behavior concerns as instances of a generic behavior observation model, differentiated only by their associated category. This approach provides flexibility while maintaining consistent data structure, permissions, and user experience across all behavior types. The "View Records" feature provides multiple entry points to access this data, tailored to different user roles and workflow needs.