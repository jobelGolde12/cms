# Comprehensive Privacy, Legal, Consent, Cookie, and User-Protection Implementation

You are working on an existing production-oriented web application.

Your task is to thoroughly audit the current codebase and then implement a complete, well-structured privacy, legal, consent, cookie, data-protection, and user-notice system throughout the website.

Do NOT immediately start coding.

You MUST first inspect and understand the entire existing project, including its architecture, routes, authentication, forms, database/schema, API endpoints, middleware, components, layouts, navigation, footer, user flows, analytics, cookies, local storage, session handling, and existing documentation.

The implementation must feel native to the existing website rather than looking like an unrelated legal/compliance module.

---

# 1. FIRST: FULL CODEBASE AUDIT

Before modifying anything, inspect the entire project.

Determine:

* Framework and version
* Frontend architecture
* Backend architecture
* Database technology
* ORM/query layer
* Authentication system
* Authorization/roles
* Existing user-registration flow
* Existing login flow
* Password-reset flow
* Profile/account-management flow
* Existing forms
* Existing validation
* Existing API routes
* Existing middleware
* Existing cookies
* Existing localStorage/sessionStorage usage
* Existing analytics
* Existing third-party services
* Existing embedded content
* Existing external APIs
* Existing email services
* Existing file/image upload functionality
* Existing error logging
* Existing monitoring
* Existing security mechanisms
* Existing privacy/legal pages
* Existing footer
* Existing navigation
* Existing settings pages
* Existing account deletion functionality
* Existing data export functionality
* Existing consent mechanisms
* Existing notification systems

Search the codebase for:

* cookie
* cookies
* localStorage
* sessionStorage
* consent
* privacy
* terms
* policy
* analytics
* tracking
* telemetry
* Google Analytics
* Meta Pixel
* third-party scripts
* embedded services
* iframe
* API
* authentication
* registration
* signup
* login
* account
* profile
* delete account
* export data
* email
* newsletter
* marketing
* notification
* upload
* IP address
* user agent
* device information
* location
* logs

Do not assume something does not exist simply because it is not visible in the UI.

---

# 2. CREATE A PLAN BEFORE IMPLEMENTATION

After auditing the project, create a detailed implementation plan inside:

`plan/`

Use a suitable filename such as:

`plan/privacy-legal-compliance.md`

The plan MUST document:

* Current privacy-related behavior
* Existing cookies
* Existing tracking
* Existing personal-data collection
* Existing forms
* Existing consent requirements
* Required new pages
* Required new components
* Required database changes
* Required API changes
* Required middleware changes
* Required validation changes
* Required UI changes
* Required footer/navigation changes
* Required documentation
* Required testing
* Security considerations
* Accessibility considerations
* Mobile considerations
* Future maintenance requirements

Use checkboxes for every implementation task.

Example:

* [ ] Audit cookie usage
* [ ] Create Privacy Policy page
* [ ] Create Terms and Conditions page
* [ ] Create Cookie Policy page
* [ ] Add registration consent
* [ ] Add form privacy notices
* [ ] Implement cookie preferences
* [ ] Add footer legal navigation
* [ ] Test consent persistence

IMPORTANT:

Every task must be marked:

`[x]`

ONLY after that task has actually been implemented and verified.

If a checkbox is already marked `[x]`, do NOT redo that task unless verification shows that it is incomplete or incorrect.

---

# 3. DO NOT INVENT PROJECT-SPECIFIC FACTS

The legal pages must accurately reflect the actual application.

Do NOT invent:

* Company names
* Business addresses
* Contact information
* Data processors
* Third-party services
* Analytics providers
* Cookie types
* Data retention periods
* Legal registrations
* Certifications
* Security certifications
* Government affiliations
* Specific legal claims
* Compliance certifications
* Guarantees

If the project does not contain enough information to determine something, identify it as a configurable placeholder or document it in the implementation plan.

Do not claim that the website is "fully GDPR compliant", "legally compliant", "100% secure", or similar.

The implementation is a technical/legal-information framework, not a substitute for professional legal review.

---

# 4. PRIVACY POLICY PAGE

Create a dedicated Privacy Policy page.

Use the existing application's design system.

The page should be professional, readable, responsive, accessible, and easy to navigate.

Include relevant sections based on what the application actually does.

Potential sections include:

1. Introduction
2. Scope
3. Information We Collect
4. Information You Provide
5. Automatically Collected Information
6. Account Information
7. Device and Technical Information
8. Usage Information
9. Cookies and Similar Technologies
10. How We Use Information
11. Legal Basis / Permitted Uses where applicable
12. How Information Is Shared
13. Third-Party Services
14. Data Storage
15. Data Retention
16. Data Security
17. User Rights
18. Account Deletion
19. Data Access / Correction
20. Data Export
21. Children's Privacy
22. International Data Transfers where applicable
23. Changes to This Privacy Policy
24. Contact Information

Only include sections that are relevant to the actual application.

Make the wording:

* Clear
* Human-readable
* Specific
* Non-deceptive
* Consistent with the actual implementation

Avoid unnecessary legal jargon.

---

# 5. TERMS AND CONDITIONS PAGE

Create a dedicated Terms and Conditions / Terms of Service page.

Include appropriate sections such as:

1. Acceptance of Terms
2. Eligibility
3. Account Registration
4. Account Responsibilities
5. Acceptable Use
6. Prohibited Activities
7. User-Submitted Content
8. Intellectual Property
9. Third-Party Services
10. Service Availability
11. Modifications to the Service
12. Account Suspension or Termination
13. User Responsibilities
14. Disclaimers
15. Limitation of Liability
16. Privacy Reference
17. Governing Law / Jurisdiction where appropriate
18. Changes to the Terms
19. Contact Information

Do not create aggressive or unreasonable clauses simply for the sake of having more legal text.

Terms must reflect the actual functionality and purpose of the application.

---

# 6. COOKIE POLICY

Create a dedicated Cookie Policy page.

Document the application's actual cookie behavior.

Explain:

* What cookies are
* Why cookies are used
* Essential cookies
* Authentication/session cookies
* Preference cookies
* Analytics cookies if actually present
* Functional cookies if actually present
* Third-party cookies if actually present
* Cookie duration where known
* How users can manage cookies
* What happens when non-essential cookies are rejected
* How cookie preferences can be changed later

Do NOT claim the application uses analytics or marketing cookies unless the code actually uses them.

---

# 7. COOKIE CONSENT SYSTEM

If the application uses non-essential cookies or tracking technologies, implement a proper consent mechanism.

Create a cookie consent banner that:

* Appears when appropriate
* Does not repeatedly appear after a valid preference is saved
* Works on desktop
* Works on mobile
* Is keyboard accessible
* Has clear actions
* Does not use deceptive design
* Does not hide the reject option
* Does not force unnecessary consent
* Clearly distinguishes essential and optional technologies

Recommended controls:

* Accept All
* Reject Non-Essential
* Customize Preferences

The customization interface should allow users to understand the categories being enabled.

---

# 8. COOKIE PREFERENCE CENTER

Create a reusable Cookie Preferences interface.

Users should be able to reopen it after the initial decision.

Possible categories:

### Strictly Necessary

Always enabled when required for:

* Authentication
* Security
* Session management
* Core application functionality

### Functional

Optional technologies that improve functionality.

### Analytics

Only if analytics are actually implemented.

### Marketing

Only if marketing/tracking technologies are actually implemented.

Do not present categories that are not actually used.

Persist the user's preference appropriately.

---

# 9. CONSENT WORDING IN FORMS

Audit EVERY user-facing form.

This includes:

* Registration
* Login if applicable
* Contact forms
* Feedback forms
* Profile forms
* Application forms
* Data submission forms
* Newsletter forms
* Upload forms
* Survey forms
* Administrative forms where applicable

Determine whether each form collects personal information.

Where appropriate, add concise privacy/consent wording near the submission action.

The wording must clearly explain:

* What is being submitted
* Why it is collected
* How it will be used
* Where the user can learn more

Example pattern:

"I understand that the information I provide will be processed as described in the Privacy Policy."

Provide a link to the Privacy Policy.

Do NOT automatically add consent checkboxes to every form.

Only add explicit consent where consent is actually an appropriate legal/technical basis.

---

# 10. REGISTRATION CONSENT

If the application has registration:

Review the registration process carefully.

Provide appropriate acknowledgment of:

* Terms and Conditions
* Privacy Policy

Where legally appropriate, use separate acknowledgments rather than combining unrelated permissions.

Avoid pre-checking optional consent.

Do not make marketing consent mandatory for basic account creation unless there is a legitimate reason and the implementation supports it.

Recommended conceptual structure:

[ ] I agree to the Terms and Conditions and acknowledge the Privacy Policy.

For optional marketing:

[ ] I would like to receive optional updates and communications.

Keep these conceptually separate.

---

# 11. PRIVACY NOTICE NEXT TO SENSITIVE FORMS

For forms collecting potentially sensitive or important personal information, add a contextual privacy notice.

The notice should be concise and should not overwhelm the form.

Example structure:

"Your information is used to process this request and is handled according to our Privacy Policy."

Then provide:

`Privacy Policy`

and, where appropriate:

`Cookie Policy`

---

# 12. CONSENT RECORDING

If explicit consent is required, design an appropriate mechanism to record consent.

Consider storing:

* User ID where applicable
* Consent type
* Consent status
* Timestamp
* Policy/version identifier
* Privacy Policy version
* Terms version
* Cookie preference version
* Relevant consent category
* Optional technical metadata only where justified

Do not store unnecessary personal information merely for consent tracking.

Consent records should be immutable or auditable where appropriate.

---

# 13. POLICY VERSIONING

Implement policy versioning where appropriate.

For example:

* Privacy Policy version
* Terms version
* Cookie Policy version

If users must acknowledge a materially updated policy, the application should be capable of determining whether the user's acknowledgment is still current.

Do not automatically force every existing user to reaccept policies unless the application's requirements justify it.

---

# 14. ACCOUNT SETTINGS / PRIVACY SETTINGS

If the application has an account/settings area, consider adding:

## Privacy Settings

Possible controls:

* Cookie Preferences
* Communication Preferences
* Data Export
* Account Deletion
* Privacy Policy
* Terms and Conditions
* Current consent status

Only implement features that are compatible with the application's existing architecture.

---

# 15. DATA EXPORT

Audit whether the application should support user data export.

If practical, provide a mechanism for users to request or download relevant personal information associated with their account.

Potential information:

* Profile information
* Account information
* User-generated content
* Preferences
* Relevant activity records

Do not expose:

* Password hashes
* Security tokens
* Private system data
* Internal credentials
* Other users' data
* Administrative-only information

If a complete automated export is outside the current scope, document it as a future capability rather than creating a misleading button.

---

# 16. ACCOUNT DELETION

Audit the existing account deletion mechanism.

Ensure that:

* Users can understand what deletion means
* Important consequences are explained
* Confirmation is required
* The operation cannot easily be triggered accidentally
* Authentication/authorization is checked
* Related personal data is handled consistently
* User-generated content is treated according to the application's requirements
* Administrative/audit records are handled appropriately

Do not silently delete data that must be retained for legitimate operational reasons.

Do not promise immediate or complete deletion if the system cannot actually provide it.

---

# 17. DATA RETENTION

Review how long different categories of data are stored.

Identify:

* Account data
* Form submissions
* Uploaded files
* Logs
* Audit records
* Consent records
* Deleted-account data
* Analytics data

Where retention periods cannot be determined from the existing system, document configurable retention policies rather than inventing arbitrary numbers.

---

# 18. THIRD-PARTY SERVICES

Audit all third-party dependencies and services.

Examples:

* Authentication providers
* Hosting
* Database providers
* Analytics
* Email providers
* Payment providers
* Maps
* Captcha
* Cloud storage
* AI APIs
* Monitoring
* Error tracking
* Social media embeds

Document relevant third-party data processing in the Privacy Policy.

Only mention services actually used by the application.

---

# 19. EXTERNAL LINKS

Review external links.

For external services:

* Clearly indicate when appropriate
* Avoid misleading users into thinking an external service is part of the application
* Ensure legal pages correctly describe relevant third-party interactions

---

# 20. FOOTER LEGAL NAVIGATION

Update the global footer.

Add appropriate links such as:

* Privacy Policy
* Terms and Conditions
* Cookie Policy
* Cookie Preferences
* Accessibility
* Contact
* Security, if applicable

Do not add pages that do not actually exist.

The footer must remain:

* Clean
* Responsive
* Accessible
* Consistent with the current design

---

# 21. LEGAL PAGE NAVIGATION

For long legal documents, implement a useful navigation experience.

Consider:

* Table of contents
* Section anchors
* Sticky section navigation on desktop
* Mobile-friendly section navigation
* Back-to-top control
* Current section indicator where appropriate

Do not overdesign legal pages.

Prioritize readability.

---

# 22. "LAST UPDATED" INFORMATION

Each policy page should display:

* Effective date
* Last updated date
* Current policy version where applicable

Do not automatically update the date simply because the page was rendered.

The date should represent an intentional policy/document revision.

---

# 23. ACCESSIBILITY

All privacy/legal components must follow accessible UX practices.

Ensure:

* Semantic HTML
* Correct heading hierarchy
* Keyboard navigation
* Visible focus states
* Accessible form controls
* Proper labels
* Accessible modal/dialog behavior
* Screen-reader-friendly buttons
* Sufficient contrast
* No inaccessible cookie banners
* No keyboard traps

Legal information must remain usable with keyboard and assistive technologies.

---

# 24. MOBILE RESPONSIVENESS

Test every legal/privacy component on:

* Small phones
* Large phones
* Tablets
* Laptops
* Large desktop displays

Cookie banners and consent dialogs must not cover critical content unnecessarily.

Cookie preference dialogs must remain usable on small screens.

---

# 25. SECURITY REVIEW

While implementing these features, review for security issues involving:

* Consent tampering
* Unauthorized consent updates
* Cross-user access
* IDOR vulnerabilities
* CSRF
* XSS
* Injection
* Unsafe redirects
* Cookie configuration
* Session handling
* Sensitive data exposure
* API authorization
* Privacy-policy version manipulation

Never trust consent values coming directly from the client.

Validate important operations server-side.

---

# 26. COOKIE SECURITY

Review cookies used by the application.

Where appropriate, evaluate:

* Secure
* HttpOnly
* SameSite
* Appropriate expiration
* Domain/path scope

Do not change cookie behavior blindly.

Ensure authentication/session cookies continue working after security improvements.

---

# 27. FORM VALIDATION

Audit all relevant forms.

Ensure:

* Required fields are correctly identified
* Optional fields are clearly identified
* Consent fields are validated where required
* Server-side validation exists
* Client-side validation does not replace server-side validation
* Invalid consent cannot bypass the form
* Error messages are understandable
* Validation errors are accessible

---

# 28. DATABASE DESIGN

If consent records require database storage, inspect the existing database architecture first.

Do not create duplicate or conflicting tables.

Design appropriate entities such as a conceptual:

`consents`

or equivalent structure only if needed.

Potential fields may include:

* id
* user_id
* consent_type
* status
* policy_version
* granted_at
* revoked_at
* created_at
* updated_at

Adapt this to the project's actual ORM/database conventions.

Do not blindly copy this schema if the existing architecture requires a different design.

---

# 29. ADMINISTRATIVE CONSENT MANAGEMENT

If the application has an administrative dashboard, determine whether administrators need to view consent information.

If implemented, administrators should be able to see appropriate audit information without exposing unnecessary sensitive data.

Potential information:

* User
* Consent type
* Status
* Policy version
* Timestamp

Do not allow administrators to arbitrarily fabricate user consent.

If consent records are changed administratively, preserve an appropriate audit trail.

---

# 30. CONSENT REVOCATION

Where consent is optional, users should have a practical way to withdraw it.

Examples:

* Cookie Preferences
* Communication Preferences
* Account Settings

Revoking optional consent should actually affect the relevant processing where technically possible.

Do not create a UI that says consent has been withdrawn while the corresponding optional technology continues running.

---

# 31. ANALYTICS AND TRACKING

Audit whether analytics/tracking are currently present.

If they exist:

* Identify them
* Determine what data they collect
* Determine when they load
* Determine whether they require consent
* Integrate them with the consent mechanism where appropriate

Do not load optional tracking before the user's required preference has been established.

If analytics do not exist, do not add them merely because this prompt mentions them.

---

# 32. MARKETING CONSENT

If the application sends marketing communications:

Create a clear distinction between:

* Required service communications
* Optional marketing communications

Do not mix these together.

Users should understand what they are agreeing to.

---

# 33. EMAIL COMMUNICATIONS

If email functionality exists, review:

* Account verification
* Password reset
* Security notifications
* Service notifications
* Marketing emails

Document these appropriately.

Do not require marketing consent for transactional/security emails unless there is a genuine application requirement.

---

# 34. DATA MINIMIZATION

Review forms and database fields for unnecessary personal information.

Ask for each field:

* Is it necessary?
* Why is it collected?
* Is it actually used?
* Can it be optional?
* Is it displayed unnecessarily?
* Is it retained longer than necessary?

Do not remove required business fields simply because they are personal information.

---

# 35. CHILDREN AND MINORS

Determine whether the application is intended for or may be used by children.

If relevant, ensure the Privacy Policy explains:

* Intended audience
* Age requirements
* Appropriate handling of children's information
* Relevant parental/guardian considerations

Do not invent an age restriction without understanding the application's actual purpose and requirements.

---

# 36. ACCESSIBILITY STATEMENT

Consider adding an Accessibility Statement page if appropriate.

Include:

* Commitment to accessibility
* Supported accessibility practices
* Known limitations if any
* Contact method for accessibility feedback

Do not claim full compliance with a specific accessibility standard unless it has actually been evaluated.

---

# 37. SECURITY / RESPONSIBLE DISCLOSURE PAGE

Consider adding a Security page if the application is public-facing.

Possible sections:

* Security practices
* Account security
* Reporting security vulnerabilities
* Responsible disclosure contact
* Security limitations

Do not publicly expose sensitive implementation details.

---

# 38. CONTACT / PRIVACY REQUEST CHANNEL

Determine how users can contact the application regarding:

* Privacy questions
* Data requests
* Account problems
* Policy questions
* Security concerns

Use the application's actual contact mechanism.

Do not invent an email address.

If no appropriate mechanism exists, create a clearly documented configurable placeholder and identify it in the plan.

---

# 39. CONSISTENCY ACROSS THE APPLICATION

Legal/privacy terminology must be consistent.

For example, do not call something:

"Privacy Policy"

on one page and:

"Privacy Notice"

somewhere else unless there is a deliberate distinction.

Ensure:

* Navigation labels match
* Links work
* Policy names are consistent
* Version numbers match
* Dates match
* Consent wording matches the actual policies

---

# 40. UI/UX REQUIREMENTS

Follow the existing design system.

Do not redesign the entire website.

Legal/privacy UI should:

* Match existing typography
* Match existing spacing
* Match existing colors
* Match existing components
* Match existing buttons
* Match existing cards
* Match existing navigation
* Match existing responsive behavior

Use modern UX patterns while preserving the existing visual identity.

Avoid:

* Excessive cards
* Unnecessary animations
* Huge legal-document headings
* Clutter
* Dark patterns
* Confusing consent interfaces
* Hidden rejection controls
* Forced scrolling to enable/disable consent

---

# 41. COMPONENT ARCHITECTURE

Create reusable components where appropriate.

Possible components:

* `CookieConsentBanner`
* `CookiePreferences`
* `ConsentCheckbox`
* `PrivacyNotice`
* `LegalDocument`
* `LegalTableOfContents`
* `PolicyVersion`
* `DataPrivacySettings`
* `ConsentStatus`
* `PrivacyRequestForm`

Do not create unnecessary components.

Follow the project's existing naming conventions.

---

# 42. ROUTING

Add appropriate routes for:

* Privacy Policy
* Terms and Conditions
* Cookie Policy
* Cookie Preferences
* Accessibility Statement, if implemented
* Security, if implemented
* Privacy Settings, if applicable

Follow the existing routing architecture.

Do not create conflicting routes.

Ensure all routes work on direct navigation and page refresh.

---

# 43. SEO

For public legal pages, implement appropriate metadata.

Examples:

* Page title
* Description
* Canonical URL if the application uses canonical metadata
* Appropriate robots behavior

Do not unnecessarily expose private account/privacy settings pages to search engines.

Follow the existing SEO architecture.

---

# 44. NOINDEX PRIVATE PAGES

If privacy settings, consent management, or user-specific legal acknowledgment pages exist, determine whether they should be excluded from indexing.

Do not expose user-specific information through publicly indexable pages.

---

# 45. ERROR HANDLING

Ensure privacy/consent functionality fails safely.

For example:

If consent storage fails:

* Do not silently assume optional consent
* Do not enable optional tracking by default
* Show an appropriate fallback where necessary

If a consent API fails:

* Preserve application functionality where possible
* Do not create an inconsistent consent state

---

# 46. TESTING

After implementation, perform a complete test.

Test:

## Legal Pages

* Privacy Policy opens
* Terms opens
* Cookie Policy opens
* Accessibility page opens if implemented
* Security page opens if implemented

## Navigation

* Footer links work
* Header links work where applicable
* Direct URLs work
* Browser refresh works
* Mobile navigation works

## Consent

* First-time user sees appropriate consent interface
* Accept works
* Reject works
* Customize works
* Preferences persist
* Preferences can be reopened
* Revocation works
* Optional technologies respect preferences

## Forms

* Required consent is validated
* Optional consent is optional
* Privacy links work
* Validation errors work
* Keyboard navigation works

## Database

* Consent records are correct
* No duplicate records are unintentionally created
* User isolation works
* Unauthorized users cannot access another user's consent data

## Security

* Consent endpoints are protected
* Server-side authorization works
* No sensitive information leaks
* Cookies are configured appropriately
* XSS/injection risks are reviewed

## Responsive

Test:

* Mobile
* Tablet
* Desktop
* Large screens

---

# 47. BUILD AND LINT

Run the project's appropriate:

* Type checking
* Linting
* Unit tests
* Integration tests
* Build
* Database validation/migrations
* Existing test suite

Fix all errors introduced by your implementation.

Do not hide warnings simply to make the build pass.

Do not modify unrelated parts of the project merely to silence warnings.

---

# 48. REGRESSION TEST

After completing the privacy/legal implementation, verify that existing features still work.

Specifically check:

* Login
* Registration
* Logout
* Dashboard
* Navigation
* Existing forms
* Database operations
* API requests
* Authentication
* Authorization
* File uploads
* User profiles
* Existing settings
* Existing responsive behavior

The legal implementation must not break existing business functionality.

---

# 49. DOCUMENTATION

Update the project documentation where appropriate.

Document:

* New legal routes
* Consent architecture
* Cookie architecture
* Database changes
* Consent storage
* Configuration requirements
* Policy versioning
* How to update policies
* How to update consent wording
* How to add/remove cookie categories
* How to test consent behavior

Do not expose secrets.

---

# 50. ENVIRONMENT VARIABLES

If configuration is required, update `.env.example` only.

Examples of potentially configurable values:

* Application name
* Privacy contact
* Legal contact
* Effective dates
* Policy versions
* Public URLs

IMPORTANT:

NEVER read, modify, print, expose, or edit `.env`.

Only work with `.env.example` or the project's documented configuration mechanism.

---

# 51. PRESERVE EXISTING FUNCTIONALITY

This is critical.

Do NOT:

* Rewrite the entire application
* Replace the framework
* Replace the database
* Replace the authentication system
* Remove existing features
* Remove existing business logic
* Change unrelated UI
* Change existing routes unnecessarily
* Modify unrelated database tables
* Delete existing user data

Only make changes necessary for this privacy/legal/consent implementation and required supporting infrastructure.

---

# 52. HANDLE EXISTING IMPLEMENTATIONS

If the project already contains:

* Privacy Policy
* Terms
* Cookies
* Consent
* Settings
* Legal footer links
* Data deletion
* Data export

DO NOT create duplicate implementations.

Instead:

1. Audit the existing implementation.
2. Determine what is incomplete.
3. Improve it.
4. Preserve working functionality.
5. Integrate it into the new architecture.

---

# 53. FINAL AUDIT

After implementation, perform another complete audit.

Ask:

### Legal

* Are all relevant policies present?
* Do they accurately reflect the application?
* Are dates/version numbers consistent?

### Consent

* Is consent clear?
* Is optional consent genuinely optional?
* Can users withdraw optional consent?
* Is consent stored appropriately?

### Cookies

* Are cookies documented?
* Are optional cookies controlled appropriately?
* Can users modify preferences?

### Forms

* Are privacy notices present where appropriate?
* Are consent requirements correctly implemented?

### Security

* Can users access only their own privacy information?
* Can consent be manipulated?
* Are cookies secure?
* Is sensitive data protected?

### UX

* Is everything responsive?
* Is everything accessible?
* Does everything match the existing design?
* Are legal pages readable?

### Engineering

* Is the implementation reusable?
* Is the code maintainable?
* Are database changes clean?
* Are tests passing?
* Is the production build successful?

---

# 54. REQUIRED FINAL REPORT

When everything is completed, provide a final implementation report.

Include:

## Implemented

List every completed feature.

## Files Created

List every newly created file.

## Files Modified

List every modified file.

## Database Changes

List all migrations, tables, columns, indexes, and relationships added or changed.

## Routes Added

List every new route.

## Components Added

List reusable components.

## Consent Flow

Explain exactly how consent works.

## Cookie Flow

Explain exactly how cookies/preferences work.

## Security Review

Explain what security protections were added or reviewed.

## Testing

List:

* Lint result
* Type-check result
* Test result
* Build result
* Manual testing result

## Remaining Items

Clearly identify anything that requires:

* Real business information
* Legal review
* Configuration
* External service configuration
* Future implementation

Do not claim that unfinished items are complete.

---

# 55. IMPLEMENTATION DISCIPLINE

Follow this exact workflow:

### Phase 1 — Inspect

Read and understand the entire codebase.

### Phase 2 — Audit

Identify all privacy, cookie, consent, form, authentication, and data-processing behavior.

### Phase 3 — Plan

Create/update the detailed plan in `plan/privacy-legal-compliance.md`.

### Phase 4 — Implement

Implement the plan incrementally.

### Phase 5 — Verify

Test every implemented feature.

### Phase 6 — Update Checkboxes

Only mark a task `[x]` after implementation and verification.

### Phase 7 — Regression Test

Confirm that existing features still work.

### Phase 8 — Final Audit

Review the complete implementation for consistency, security, accessibility, and maintainability.

### Phase 9 — Final Report

Provide a concise but complete summary of what was implemented and what remains.

---

# 56. IMPORTANT AGENT RULES

You MUST:

* Read the existing codebase before making architectural decisions.
* Read existing documentation before creating new documentation.
* Reuse existing components where appropriate.
* Follow the project's existing conventions.
* Preserve the current design language.
* Preserve existing business logic.
* Preserve existing database behavior.
* Use server-side validation for security-sensitive operations.
* Avoid collecting unnecessary personal information.
* Avoid inventing legal/business information.
* Keep optional consent separate from required service functionality.
* Make privacy controls understandable.
* Make all legal pages responsive.
* Make all consent interfaces accessible.
* Test all changes.
* Mark completed plan tasks only after verification.

You MUST NOT:

* Assume the application uses a service that you did not find in the codebase.
* Invent privacy practices.
* Invent retention periods.
* Invent legal contacts.
* Invent company information.
* Claim legal compliance without appropriate verification.
* Add unnecessary tracking.
* Add unnecessary cookies.
* Use dark patterns.
* Hide rejection controls.
* Pre-select optional consent.
* Break existing functionality.
* Modify `.env`.
* Expose secrets.
* Delete unrelated code.
* Skip the planning phase.

The goal is not simply to create several legal pages.

The goal is to build a coherent, maintainable, technically accurate privacy and consent framework that is integrated into the existing application's architecture, database, forms, authentication, UI, security model, and user experience.
