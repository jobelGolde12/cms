

Important note do not ask me a question for clarification. Just do the recommended for you.

# ADMIN OFFICER — EMPLOYEE RECORDS MANAGEMENT IMPLEMENTATION

You are now operating as a **FULL-STACK SYSTEM ARCHITECT, DATABASE ENGINEER, BACKEND DEVELOPER, FRONTEND DEVELOPER, SECURITY ENGINEER, QA ENGINEER, AND DEBUGGING AGENT**.

Your task is to implement a new **Admin Officer account/role** in the current system:

> **Records Management System with Profile and Performance Analytics of Sta. Magdalena National High School**

The Admin Officer is responsible **ONLY for employee/staff records** and must have **ZERO access to student information**.

---

# 1. CRITICAL INSTRUCTIONS

Before modifying anything:

- [ ] Read and understand `AGENTS.md` completely.
- [ ] Follow every instruction, convention, architecture rule, and restriction defined in `AGENTS.md`.
- [ ] Inspect the entire existing project structure.
- [ ] Understand the current authentication system.
- [ ] Understand the current role/permission system.
- [ ] Understand the current database schema.
- [ ] Inspect the existing Admin role and its capabilities.
- [ ] Inspect how users, students, employees, profiles, and records are currently represented.
- [ ] Inspect existing middleware, authorization, API routes, server actions, database queries, and UI navigation.
- [ ] Do not immediately start coding.
- [ ] First understand how the current system works and determine the safest integration strategy.

**Do NOT replace or redesign the existing system unnecessarily.**

The current theme, layout, visual language, components, typography, spacing, navigation patterns, and overall UI design must remain consistent.

You may improve usability where necessary, but **do not introduce an unrelated design system or visual redesign.**

---

# 2. NEW ACCOUNT / ROLE

Create an additional account/role:

> **Admin Officer**

The Admin Officer is an internal school employee-records administrator.

The Admin Officer should be responsible for:

- Employee profiles
- Employee 201 Files
- Employee personal information
- Employment information
- Position/designation information
- Employee documents and records
- Service Credits Earned
- Service Credits Consumed/Used
- Service Credit balance/history
- Other employee-related records that are logically necessary

---

# 3. ABSOLUTE ACCESS RESTRICTION

This is one of the most important requirements.

## Admin Officer MUST NOT have access to student information.

The Admin Officer:

- [ ] MUST NOT view students.
- [ ] MUST NOT search students.
- [ ] MUST NOT filter students.
- [ ] MUST NOT access student profiles.
- [ ] MUST NOT access student grades.
- [ ] MUST NOT access student behavior records.
- [ ] MUST NOT access student reading/literacy records.
- [ ] MUST NOT access student numeracy records.
- [ ] MUST NOT access student analytics.
- [ ] MUST NOT access student dashboards.
- [ ] MUST NOT access student reports.
- [ ] MUST NOT access student APIs.
- [ ] MUST NOT access student database queries.
- [ ] MUST NOT access student-related exports.
- [ ] MUST NOT access student-related routes.
- [ ] MUST NOT access student-related server actions.
- [ ] MUST NOT access student-related navigation items.

Do NOT rely only on hiding UI elements.

The restriction MUST be enforced at the **authorization/backend/database-access level**.

If an Admin Officer manually enters a student URL, API endpoint, route, or record ID, the system must deny access.

Use proper authorization checks on every relevant protected resource.

---

# 4. ROLE SEPARATION

Clearly distinguish between:

### Existing Admin

The existing Admin role continues to manage the functionality it already has.

### New Admin Officer

The Admin Officer is specifically responsible for:

> **EMPLOYEE RECORDS ONLY**

Do not accidentally transfer existing Admin permissions to Admin Officer.

Do not simply clone the Admin role and hide student pages.

Instead, implement a proper permission boundary.

Prefer a permission structure such as:

```text
Admin
├── Existing system administration permissions
└── Existing authorized records access

Admin Officer
├── Employee management
├── Employee profiles
├── 201 Files
├── Employee documents
├── Service Credits
└── Employee reports
```

The exact implementation must follow the project's existing authorization architecture after you inspect it.

---

# 5. EMPLOYEE RECORD MANAGEMENT

Create or enhance an employee-management module appropriate for the school.

The module should allow authorized Admin Officers to:

- [ ] View employee list
- [ ] Search employees
- [ ] Filter employees
- [ ] Sort employees
- [ ] View employee profile
- [ ] Create employee record
- [ ] Edit employee record
- [ ] Archive/deactivate employee when appropriate
- [ ] View employment information
- [ ] View employee documents
- [ ] Manage 201 File information
- [ ] Manage service credits
- [ ] View service credit history
- [ ] Calculate service credit balance
- [ ] View employee record activity/history where appropriate

Use the existing UI patterns in the project.

---

# 6. EMPLOYEE PROFILE

Design the employee profile around actual employee-record requirements.

Consider appropriate sections such as:

### Personal Information

- Employee ID
- First name
- Middle name
- Last name
- Suffix
- Date of birth
- Sex
- Civil status
- Address
- Contact number
- Email
- Emergency contact

### Employment Information

- Employee number
- Position
- Designation
- Employment status
- Date hired
- Date of appointment
- Department/office
- Employment type
- Salary grade where applicable
- Step where applicable
- Current status

### Government / Personnel Information

Where appropriate:

- GSIS information
- PhilHealth information
- Pag-IBIG information
- TIN
- PRC information
- Eligibility
- License information

Do not blindly add sensitive fields without first inspecting the existing requirements and database architecture.

---

# 7. 201 FILE MANAGEMENT

Implement an appropriate **201 File management section**.

The 201 File should function as the employee's personnel record.

Depending on the existing system requirements, support categories such as:

- Personal information
- Appointment/employment records
- Eligibility documents
- Training and seminars
- Performance-related records
- Leave-related records if applicable
- Government documents
- Certificates
- Memoranda
- Other personnel documents

Allow the Admin Officer to:

- [ ] Add records
- [ ] Edit records
- [ ] View records
- [ ] Categorize records
- [ ] Track record dates
- [ ] Add document descriptions
- [ ] Upload documents if file uploads are already supported or can be safely introduced
- [ ] Download/view authorized documents
- [ ] Archive records where appropriate

Do not expose employee documents to unauthorized roles.

---

# 8. SERVICE CREDITS

Implement a proper **Service Credits Management** feature.

The system must distinguish between:

> **Service Credits Earned**

and

> **Service Credits Consumed/Used**

The system should maintain an auditable history instead of storing only a manually editable balance.

For example:

```text
Employee
    ↓
Service Credit Account
    ↓
Service Credit Transactions
    ├── Earned
    └── Consumed
```

Each transaction should contain appropriate information such as:

- Employee
- Transaction type
- Number of credits
- Date
- Reason
- Reference/document
- Remarks
- Created by
- Created date
- Updated by
- Updated date

Use the existing database conventions.

---

# 9. SERVICE CREDIT CALCULATION

Implement a reliable balance calculation.

Conceptually:

```text
Current Balance
=
Total Earned
-
Total Consumed
```

Do not allow the system to produce an invalid negative balance unless the existing business rules explicitly allow it.

Add appropriate validation.

Example:

```text
Total Earned:     15.00
Total Consumed:    5.00
------------------------
Available:        10.00
```

The UI should clearly show:

- Total Earned
- Total Consumed
- Current Available Balance
- Recent Transactions

---

# 10. SERVICE CREDIT HISTORY

Create a transaction/history interface.

The Admin Officer should be able to:

- [ ] View all transactions for an employee
- [ ] Filter by Earned/Consumed
- [ ] Filter by date
- [ ] Search transactions
- [ ] View transaction details
- [ ] Add new transaction
- [ ] Correct transactions according to proper authorization rules
- [ ] Maintain an audit trail

Avoid silently overwriting historical transactions when an auditable transaction model is more appropriate.

---

# 11. DATABASE IMPLEMENTATION

Before modifying the database:

- [ ] Inspect the existing schema.
- [ ] Inspect relationships involving users and roles.
- [ ] Inspect existing student tables.
- [ ] Inspect whether employee tables already exist.
- [ ] Inspect whether staff/personnel data already exists.
- [ ] Inspect existing audit fields.
- [ ] Inspect migrations/schema conventions.

Do not create duplicate tables if an appropriate employee structure already exists.

If employee functionality already exists partially, extend it instead of creating competing implementations.

Create/update the schema following the existing project's database conventions.

Make sure relationships are correct.

Potential conceptual structure:

```text
users
  ↓
roles / permissions

employees
  ↓
employee_201_records

employees
  ↓
service_credit_transactions
```

The actual schema must be determined after inspecting the current database.

---

# 12. DATABASE SECURITY

This feature must have strict data isolation.

Verify that Admin Officer database queries cannot retrieve student records.

Do not implement security using frontend filtering alone.

For example, this is NOT sufficient:

```text
Hide Students menu for Admin Officer
```

Instead, authorization must also prevent:

```text
Admin Officer → GET /students
Admin Officer → GET /students/:id
Admin Officer → student search API
Admin Officer → student analytics API
Admin Officer → student database query
```

Every protected backend operation must validate the authenticated user's permissions.

---

# 13. NAVIGATION

Add an appropriate Admin Officer navigation experience.

For example:

```text
Dashboard

Employees
├── All Employees
├── Add Employee
└── Employee Records

201 Files

Service Credits
├── Overview
├── Earned
├── Consumed
└── History
```

Only include pages that are actually implemented.

Do NOT show:

```text
Students
Student Analytics
Grades
Behavior
Reading
Literacy
Numeracy
Student Reports
```

to the Admin Officer.

If the existing dashboard is shared between roles, make sure the dashboard itself does not expose student information to Admin Officer.

---

# 14. ADMIN OFFICER DASHBOARD

Create an appropriate dashboard if the existing architecture supports role-specific dashboards.

The dashboard should focus exclusively on employee records.

Possible metrics:

- Total Employees
- Active Employees
- Inactive Employees
- Employees by Position
- Employees by Employment Status
- Total Service Credits Earned
- Total Service Credits Consumed
- Total Available Service Credits
- Recent Employee Records
- Recent Service Credit Transactions
- Missing/Incomplete Employee Records

Do not display student statistics.

---

# 15. SEARCH AND FILTERING

Employee management should have reliable search and filtering.

Support appropriate searches such as:

- Employee name
- Employee ID
- Position
- Employment status
- Department/office

Potential filters:

- Active/Inactive
- Employment type
- Position
- Date hired
- Other relevant employee attributes

Ensure search does not reload the entire page unnecessarily if the current application architecture supports client/server-side dynamic filtering.

Provide user-friendly loading states/skeletons consistent with the existing application.

---

# 16. VALIDATION

Implement strong validation for employee records.

Validate:

- Required fields
- Date formats
- Contact information
- Employee ID uniqueness
- Email format
- Service credit amounts
- Transaction type
- Required transaction information

Prevent duplicate or malformed records.

Use the project's existing validation approach.

---

# 17. AUDITABILITY

Employee records are sensitive administrative records.

Where the existing architecture supports auditing, record:

- Created by
- Created at
- Updated by
- Updated at

For service credit transactions, preserve who performed the transaction.

For important modifications, avoid destroying historical information unnecessarily.

---

# 18. AUTHENTICATION

Create an appropriate default Admin Officer account for testing if the project uses seeded/default accounts.

Follow the existing authentication conventions.

The password stored in the database MUST be hashed.

The login form must use the normal non-hashed password.

Do not expose plaintext passwords in the database.

If default credentials are created, document them securely in the project's documentation according to existing project conventions.

---

# 19. EXISTING ROLES MUST NOT BREAK

After implementing Admin Officer:

- [ ] Existing Admin login still works.
- [ ] Existing Admin permissions still work.
- [ ] Existing student functionality still works.
- [ ] Existing teacher/other roles still work.
- [ ] Student authorization remains correct.
- [ ] Employee authorization is correctly restricted.
- [ ] No existing role accidentally gains Admin Officer permissions.

Do not modify existing permissions unless required to support the new architecture.

---

# 20. UI / DESIGN REQUIREMENT

**DO NOT CHANGE THE CURRENT WEBSITE THEME OR DESIGN.**

Reuse:

- Existing colors
- Existing typography
- Existing components
- Existing cards
- Existing tables
- Existing buttons
- Existing forms
- Existing sidebar/navigation
- Existing modal/dialog patterns
- Existing loading states
- Existing responsive behavior

The new employee-management pages should look like they naturally belong to the existing application.

Do not introduce an unrelated UI library.

Do not redesign existing pages merely because you are adding this feature.

---

# 21. RESPONSIVE DESIGN

Ensure employee-management functionality works properly on:

- Desktop
- Laptop
- Tablet
- Mobile

Employee tables should remain usable on smaller screens.

Do not sacrifice important information merely to make the table fit.

Use the project's existing responsive patterns.

---

# 22. ERROR HANDLING

Implement proper error handling.

Examples:

- Unauthorized access
- Employee not found
- Duplicate employee ID
- Invalid service credit amount
- Insufficient service credits
- Failed document upload
- Database failure
- Invalid transaction
- Expired/deleted employee record

Errors should be understandable to normal users.

Do not expose raw database errors or stack traces in the UI.

---

# 23. SECURITY TESTING

Explicitly test role isolation.

Attempt to access student functionality while authenticated as Admin Officer.

Test:

```text
Student list
Student profile
Student search
Student filters
Student APIs
Student analytics
Student grades
Student behavior
Student reading
Student literacy
Student numeracy
Student reports
Direct student URLs
Direct student API endpoints
```

Every unauthorized attempt must be rejected appropriately.

Also test the opposite:

```text
Admin Officer → Employee records
Admin Officer → 201 files
Admin Officer → Service credits
```

These must work correctly.

---

# 24. TESTING REQUIREMENT

Do NOT consider the implementation complete immediately after coding.

You MUST test the entire feature.

Run the project's available:

- Linter
- Type checker
- Unit tests
- Integration tests
- End-to-end tests
- Build
- Database validation
- Authentication tests

Use the project's existing commands discovered from `AGENTS.md`, `package.json`, documentation, and configuration files.

If tests fail:

1. Investigate the root cause.
2. Fix the implementation.
3. Run the test again.
4. Continue until the result is stable.

Do not simply suppress errors.

---

# 25. MANUAL QA CHECKLIST

Perform a complete manual verification.

### Authentication

- [ ] Admin Officer can log in.
- [ ] Invalid credentials are rejected.
- [ ] Session works correctly.
- [ ] Logout works.
- [ ] Unauthorized roles cannot access Admin Officer functionality.

### Employee Records

- [ ] Employee list loads.
- [ ] Search works.
- [ ] Filters work.
- [ ] Employee profile works.
- [ ] Add employee works.
- [ ] Edit employee works.
- [ ] Validation works.
- [ ] Employee records persist correctly.

### 201 Files

- [ ] 201 File opens.
- [ ] Records can be added.
- [ ] Records can be edited.
- [ ] Records can be viewed.
- [ ] Documents work correctly if implemented.
- [ ] Unauthorized users cannot access employee records.

### Service Credits

- [ ] Earned credits work.
- [ ] Consumed credits work.
- [ ] Balance calculation is correct.
- [ ] Transaction history works.
- [ ] Validation works.
- [ ] Audit information is preserved.

### Student Isolation

- [ ] Admin Officer cannot view students.
- [ ] Admin Officer cannot search students.
- [ ] Admin Officer cannot access student profiles.
- [ ] Admin Officer cannot access student analytics.
- [ ] Admin Officer cannot access student APIs.
- [ ] Direct URL access is blocked.
- [ ] Direct API access is blocked.

---

# 26. DATA INTEGRITY TESTING

Test realistic scenarios.

Example:

```text
Employee A
Earned: 10
Consumed: 3
Balance: 7
```

Then:

```text
Earn another 5
Consumed another 2
```

Expected:

```text
Total Earned: 15
Total Consumed: 5
Balance: 10
```

Test:

- Multiple transactions
- Same-day transactions
- Decimal values if supported
- Invalid values
- Zero values
- Excessive consumption
- Editing transactions
- Deleting/archiving records
- Concurrent changes where applicable

---

# 27. PERFORMANCE

Do not load the entire employee dataset unnecessarily.

Use the existing pagination/data-fetching architecture.

Search and filtering should remain performant.

Avoid unnecessary database queries.

Watch for:

- N+1 queries
- Repeated API requests
- Duplicate database calls
- Excessive client-side processing

---

# 28. DOCUMENTATION

After the implementation is complete, create/update documentation describing:

- Admin Officer role
- Permissions
- Employee management
- 201 Files
- Service Credits
- Database changes
- Authentication
- Default credentials if applicable
- Security restrictions
- Testing performed
- Important implementation decisions

Place documentation in the project's existing `documentation` structure.

Follow the conventions specified in `AGENTS.md`.

---

# 29. IMPLEMENTATION WORKFLOW

Follow this order:

## Phase 1 — Understand

- [ ] Read `AGENTS.md`
- [ ] Inspect project architecture
- [ ] Inspect authentication
- [ ] Inspect roles/permissions
- [ ] Inspect database
- [ ] Inspect existing employee functionality
- [ ] Inspect existing UI patterns

## Phase 2 — Plan

- [ ] Determine role architecture
- [ ] Determine permission architecture
- [ ] Determine employee schema
- [ ] Determine 201 File schema
- [ ] Determine service credit schema
- [ ] Determine routes/API/server actions
- [ ] Determine UI pages
- [ ] Determine security boundaries

## Phase 3 — Database

- [ ] Implement required schema changes
- [ ] Implement relationships
- [ ] Implement indexes where appropriate
- [ ] Implement constraints
- [ ] Run migrations safely
- [ ] Verify database integrity

## Phase 4 — Backend

- [ ] Implement authorization
- [ ] Implement employee APIs/actions
- [ ] Implement 201 File APIs/actions
- [ ] Implement service credit APIs/actions
- [ ] Implement validation
- [ ] Implement error handling

## Phase 5 — Frontend

- [ ] Add Admin Officer navigation
- [ ] Add employee pages
- [ ] Add employee profile
- [ ] Add 201 File UI
- [ ] Add service credit UI
- [ ] Add loading states
- [ ] Add error states
- [ ] Add empty states
- [ ] Preserve existing design

## Phase 6 — Security

- [ ] Test role restrictions
- [ ] Test direct URL access
- [ ] Test API access
- [ ] Test database authorization
- [ ] Confirm Admin Officer cannot access student data

## Phase 7 — Testing

- [ ] Run lint
- [ ] Run type checking
- [ ] Run tests
- [ ] Run build
- [ ] Test authentication
- [ ] Test employee CRUD
- [ ] Test 201 Files
- [ ] Test service credits
- [ ] Test responsive UI
- [ ] Test student isolation

## Phase 8 — Documentation

- [ ] Document implementation
- [ ] Document permissions
- [ ] Document database changes
- [ ] Document default credentials
- [ ] Document testing results
- [ ] Document any important limitations

---

# 30. FINAL REQUIREMENT

Do not stop after implementing the first working version.

**Think broadly, inspect the existing system carefully, implement the feature properly, test it, debug it, and verify it from both the user and security perspectives.**

If you discover existing code that conflicts with the new employee-record architecture:

1. Understand why it exists.
2. Determine whether it can be safely reused.
3. Refactor only where necessary.
4. Preserve existing functionality.
5. Test everything affected by the change.

The final result must provide a reliable **Admin Officer Employee Records Management system** while maintaining a strict security boundary:

```text
                    SCHOOL SYSTEM
                         │
              ┌──────────┴──────────┐
              │                     │
            ADMIN              ADMIN OFFICER
              │                     │
        Existing Access       EMPLOYEE RECORDS
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
               Employee         201 Files      Service Credits
                Profiles                         │
                                                │
                                      ┌─────────┴─────────┐
                                      │                   │
                                    Earned             Consumed
```

**Critical security rule:**

> `ADMIN OFFICER ≠ STUDENT ADMIN`

The Admin Officer must have **no ability to view, search, modify, export, or retrieve student information**, while having complete authorized functionality for the employee records assigned to the role.

Do not mark the task complete until the implementation has been fully tested and verified.

Brainstorm every decisions before implementation, read first the AGENTS.md, commit and push to the current branch, then ensure that there's no error in current branch deployment use the Vercel cli for that.

Additional TODOS after that todos at the top. Note do fist the todo at the top before this:


You are now operating as a FULL-STACK WEBSITE IMPROVEMENT AGENT with multiple specialized roles. You will embody ALL of these roles simultaneously and work CONTINUOUSLY without stopping until the website is fully optimized, tested, and bug-free.

## YOUR ROLES (Execute ALL Simultaneously):
1. **Business Analyst** - Analyze requirements, identify gaps, and propose solutions
2. **UX Researcher** - Evaluate user flows, identify friction points, improve usability
3. **UI/UX Designer** - Enhance visual design, create consistent styling, improve aesthetics
4. **Frontend Developer** - Write clean HTML, CSS, JavaScript with modern best practices
5. **Backend Developer** - Optimize server-side code, APIs, database queries if applicable
6. **SEO Specialist** - Implement search engine optimization best practices
7. **Performance Engineer** - Optimize loading speeds, resource usage, and rendering
8. **Accessibility Expert** - Ensure WCAG 2.1 AA compliance and inclusive design
9. **Security Specialist** - Identify and fix security vulnerabilities
10. **QA Tester** - Test all features, identify bugs, verify fixes
11. **Debugger** - Troubleshoot and resolve all errors and issues
12. **DevOps Engineer** - Ensure deployment readiness and compatibility
13. **Content Strategist** - Improve copy, messaging, and content structure
14. **Project Manager** - Track progress, prioritize tasks, ensure completion

## OPERATING MODE:
- Work CONTINUOUSLY and NON-STOP until all tasks are complete
- Do NOT pause for confirmation between tasks
- Automatically move to the next task after completing the current one
- If you encounter errors, debug them immediately and continue
- Maintain a running log of all actions, tests, and fixes

## 1. INITIAL ASSESSMENT PHASE
- Explore the entire project structure and identify all website files
- List all installed skills and capabilities available to you
- Analyze the current state of the website comprehensively:
  - HTML structure and semantics
  - CSS architecture and responsiveness
  - JavaScript functionality and performance
  - Assets (images, fonts, icons) optimization status
  - Forms and interactive elements
  - Navigation and user flows
  - Console errors and warnings
  - Broken links and missing resources
- Document ALL findings, issues, and improvement opportunities

## 2. IMPROVEMENT STRATEGY & EXECUTION
Using ALL relevant skills and roles, improve the website in these areas:

### Design & User Experience:
- Enhance visual appeal, consistency, spacing, typography, color scheme
- Implement modern design patterns (glassmorphism, neumorphism, etc. where appropriate)
- Add micro-interactions, hover effects, and smooth animations
- Improve navigation with active states, breadcrumbs, and clear CTAs
- Add dark mode toggle with localStorage persistence
- Implement skeleton loaders and progressive enhancement

### Responsiveness & Cross-Browser:
- Ensure perfect mobile-first responsive design (320px to 4K screens)
- Test and fix issues in Chrome, Firefox, Safari, and Edge
- Implement responsive images with srcset and picture elements
- Fix any overflow, spacing, or stacking issues

### Performance Optimization:
- Optimize all images (compress, convert to WebP where supported)
- Minify CSS, JavaScript, and HTML
- Implement lazy loading for images and iframes
- Add resource hints (preload, prefetch, preconnect)
- Optimize fonts loading with font-display: swap
- Implement code splitting where applicable

### Accessibility (WCAG 2.1 AA):
- Add proper ARIA labels, roles, and landmarks
- Ensure sufficient color contrast ratios
- Implement full keyboard navigation with visible focus states
- Add skip-to-content links
- Provide alt text for all images
- Make forms accessible with proper labels and error messages
- Ensure screen reader compatibility

### SEO Optimization:
- Optimize meta titles, descriptions, and Open Graph tags
- Implement proper heading hierarchy (H1, H2, H3)
- Add structured data (Schema.org JSON-LD)
- Create/update sitemap.xml and robots.txt
- Add canonical tags
- Implement Twitter Cards and social sharing meta tags
- Optimize URL structure

### Security:
- Check for XSS, CSRF, and injection vulnerabilities
- Add Content Security Policy headers
- Implement secure form validation
- Sanitize all user inputs
- Add rel="noopener" to external links
- Ensure secure cookie settings if applicable

### Content & Conversion:
- Improve headline copy and messaging
- Add missing sections (About, Services, Testimonials, FAQ, Contact)
- Optimize CTAs for conversion
- Add social proof elements
- Improve form UX and validation
- Add FAQ accordion if relevant

## 3. TESTING PHASE (CRITICAL - DO NOT SKIP)
After implementing improvements, you MUST:

### Functional Testing:
- Test ALL navigation links work correctly
- Test ALL forms (submission, validation, error states, success states)
- Test ALL buttons and interactive elements
- Test ALL modals, dropdowns, and accordions
- Test ALL animations and transitions
- Test responsive design at ALL breakpoints (320px, 375px, 425px, 768px, 1024px, 1440px, 1920px)
- Test in both light and dark modes
- Test with JavaScript disabled (graceful degradation)
- Test all media queries and breakpoints

### Debug Process:
- Check browser console for ANY errors or warnings
- Fix ALL JavaScript errors immediately
- Fix ALL CSS issues and layout breaks
- Fix ALL HTML validation errors
- Verify all external resources load correctly
- Test all API calls and data fetching
- Debug and fix any issues found
- Re-test after fixing to confirm resolution

### Performance Testing:
- Run Lighthouse audit (Performance, Accessibility, Best Practices, SEO)
- Aim for scores of 90+ in all categories
- Test page load times (target: under 3 seconds)
- Check for render-blocking resources
- Verify image optimization
- Test Core Web Vitals (LCP, FID, CLS)

### Cross-Browser Testing:
- Verify functionality in Chrome, Firefox, Safari, Edge
- Test on different operating systems (Windows, macOS, Linux)
- Test on mobile browsers (iOS Safari, Android Chrome)
- Fix any browser-specific issues

### Regression Testing:
- Verify no existing features broke during improvements
- Test all user flows end-to-end
- Ensure backward compatibility
- Validate all forms still submit correctly

## 4. CONTINUOUS OPERATION PROTOCOL
- After completing all improvements and initial testing
- Perform a FULL RE-TEST of everything
- If ANY bugs or issues are found:
  - Debug immediately
  - Fix the issue
  - Re-test the fix
  - Continue scanning for more issues
- Repeat this cycle until ZERO bugs remain
- Do NOT stop until all tests pass

## 5. FINAL DELIVERABLES
When everything is complete and tested:

1. **Updated Website Files** - All modified and new files
2. **Comprehensive Report** including:
   - Initial issues found
   - All improvements made
   - All skills and roles utilized
   - Testing results summary
   - Bugs found and fixed
   - Before/after performance metrics
   - Recommendations for future improvements
3. **Documentation**:
   - Setup/installation instructions
   - New dependencies or requirements
   - Code documentation and comments
   - Testing checklist used

## 6. CONSTRAINTS
- Maintain backward compatibility where possible
- Preserve existing branding unless broken
- Ensure all improvements are production-ready
- Document any new dependencies
- All code must be clean, commented, and maintainable

## 7. COMMITMENT
You are committed to:
- Working NON-STOP until the website is perfect
- Testing EVERY feature thoroughly
- Debugging ALL issues immediately
- Not stopping until ZERO bugs exist
- Delivering a production-ready, high-quality website

BEGIN NOW. Execute all roles. Improve everything. Test everything. Debug everything. Do not stop until complete.
```

---

**Key Enhancements Added:**

1. **15 Specialized Roles** - The AI must embody multiple expert personas
2. **Continuous Operation** - Explicitly instructed to work non-stop without pausing for confirmation
3. **Comprehensive Testing** - Functional, performance, cross-browser, and regression testing
4. **Auto-Debug Loop** - Test → Find bugs → Debug → Fix → Re-test until zero bugs
5. **Specific Test Targets** - Lighthouse scores, load times, breakpoints to test
6. **Detailed Deliverables** - Comprehensive reporting requirements

