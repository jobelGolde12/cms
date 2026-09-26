# TASK: CREATE A MODERN, PRODUCTION-READY WELCOME PAGE

You are working inside an existing Next.js project.

Your task is to **carefully inspect and understand the entire existing codebase first**, then create a modern, polished, production-ready **Welcome / Landing Page** based on the actual website, its existing content, purpose, features, branding, and design system.

The goal is NOT to create a generic AI-generated landing page.

The goal is to create a welcome page that feels like it was intentionally designed for THIS specific website after understanding its existing functionality and audience.

---

## 1. FIRST: READ AND UNDERSTAND THE ENTIRE CODEBASE

Before modifying or creating any code, thoroughly inspect the existing project.

Do NOT immediately start coding.

Analyze:

* `package.json`
* `app/`
* `pages/` if present
* `components/`
* `src/` if present
* `lib/`
* `utils/`
* `hooks/`
* `services/`
* `api/`
* `public/`
* existing layouts
* existing pages
* existing navigation
* authentication
* middleware
* database-related code
* configuration files
* environment variable usage
* existing reusable components
* existing UI components
* existing icons
* existing images
* existing fonts
* existing animations
* existing responsive behavior
* existing color system
* existing Tailwind configuration
* CSS files
* design tokens
* route structure
* user roles
* existing website functionality
* existing documentation
* existing content

Search the project instead of assuming how the application works.

You must understand:

1. What this website is.
2. Who the intended users are.
3. What problem the website solves.
4. What its major features are.
5. What actions users can perform.
6. What pages already exist.
7. What information is already available.
8. What branding and visual language are already established.
9. What routes should be linked from the welcome page.
10. Whether authentication is required before accessing specific features.
11. Whether there are existing reusable components that should be reused instead of recreated.

Do not invent website functionality that does not exist in the codebase.

---

# 2. READ `.opencode` SKILLS AND PROJECT INSTRUCTIONS

Before implementation, inspect the `.opencode` directory and read all relevant skills, instructions, rules, workflows, and project-specific guidance.

Pay particular attention to:

* `.opencode/`
* skills
* agent instructions
* coding conventions
* UI/UX guidelines
* architecture rules
* Next.js conventions
* component conventions
* testing requirements
* documentation requirements

If `.opencode` contains instructions that affect UI implementation, architecture, naming, styling, accessibility, or code quality, follow them.

Do not ignore existing project-specific instructions.

---

# 3. UNDERSTAND THE EXISTING DESIGN SYSTEM

The new Welcome Page must feel like a natural part of the existing website.

Do NOT replace the current visual identity with an unrelated template.

Study the existing:

* colors
* typography
* font families
* font weights
* spacing
* border radius
* shadows
* cards
* buttons
* inputs
* navigation
* icons
* illustrations
* backgrounds
* gradients
* animations
* hover effects
* responsive behavior
* page transitions

Determine the existing visual hierarchy and reuse it.

If the project already has a design system, component library, Tailwind configuration, CSS variables, or shared components, use them.

Do not introduce another design system unnecessarily.

---

# 4. CREATE A WELCOME PAGE BASED ON THE ACTUAL WEBSITE

After understanding the project, design the Welcome Page around the website's actual purpose.

The page should communicate immediately:

* what the website is
* what it does
* who it is for
* why the user should continue
* what the major features are
* how the user can get started

Use the actual terminology and concepts already present in the project.

Do not use generic SaaS copy such as:

> "Empowering the future with next-generation solutions."

Avoid meaningless marketing language.

Instead, derive meaningful content from the existing website.

---

# 5. RECOMMENDED PAGE STRUCTURE

Use the following structure as a guideline, but adapt it according to the actual website.

Do not force sections that do not make sense for the project.

## A. Navigation / Header

Create a clean, modern header.

Include relevant existing:

* logo
* website name
* navigation
* authentication actions
* relevant links

Possible actions:

* Home
* About
* Features
* Services
* Contact
* Login
* Register
* Dashboard

Only include routes that actually exist.

The navigation must be:

* responsive
* accessible
* keyboard-friendly
* visually consistent
* mobile-friendly

Do not create fake routes.

---

# 6. HERO SECTION

The Hero Section should immediately explain the website.

It should contain:

### Primary heading

Use a concise, meaningful heading derived from the website's actual purpose.

### Supporting description

Explain what the platform does in a natural and human-readable way.

### Primary CTA

Use an existing meaningful action such as:

* Get Started
* Explore
* Login
* Register
* Access Dashboard

Only use an action if the corresponding route or functionality exists.

### Secondary CTA

Only add one if it provides meaningful value.

### Visual element

Use existing:

* images
* illustrations
* screenshots
* icons
* graphics

when appropriate.

Do NOT generate unnecessary decorative graphics just to fill space.

The hero should have strong visual hierarchy without becoming excessively large.

---

# 7. WEBSITE FEATURES SECTION

Identify the actual major features from the codebase.

For each feature, explain:

* feature name
* what it does
* why it matters to the user

Do not simply list technical implementation details.

For example, do not write:

> "Built with Next.js and TypeScript."

unless the website itself is specifically about its technology.

Instead, communicate the user-facing functionality.

Use reusable feature components.

Example architecture:

```text
components/
└── welcome/
    ├── WelcomePage.tsx
    ├── WelcomeHeader.tsx
    ├── WelcomeHero.tsx
    ├── WelcomeFeatures.tsx
    ├── WelcomeFeatureCard.tsx
    ├── WelcomeAbout.tsx
    ├── WelcomeHowItWorks.tsx
    ├── WelcomeCTA.tsx
    └── WelcomeFooter.tsx
```

Adapt the structure to the existing project conventions.

Do not create unnecessary components merely to increase the number of files.

---

# 8. HOW IT WORKS / USER FLOW

If the website has a meaningful workflow, explain it visually.

For example:

```text
Step 01
Create an account

Step 02
Complete your information

Step 03
Use the platform

Step 04
Manage your activity
```

However, the actual steps must come from the existing application.

Do not invent workflows.

Use simple visual progression instead of excessive decoration.

---

# 9. ABOUT / PURPOSE SECTION

Create a concise section explaining the website's purpose.

Derive the content from:

* existing pages
* project documentation
* database structure
* existing UI text
* README
* feature implementation
* existing descriptions

The content should sound like a real organization or project wrote it.

Avoid obvious AI-generated phrases.

---

# 10. TRUST / INFORMATION SECTION

If appropriate for the website, include relevant information such as:

* organization
* community
* system purpose
* supported users
* services
* coverage
* statistics

Only use statistics that actually exist in the application or source code.

Never fabricate:

* user counts
* success rates
* percentages
* organizations
* awards
* testimonials
* reviews
* partnerships

---

# 11. CALL-TO-ACTION SECTION

End the main content with a strong but simple CTA.

The CTA should guide users toward an actual next step.

Examples:

* Create an Account
* Explore the Platform
* Sign In
* Get Started
* View Services

Again, use only actions that exist.

---

# 12. FOOTER

Create a clean footer using actual project information.

Potential content:

* website name
* short description
* navigation links
* contact information
* organization information
* legal links
* social links

Do not create fake contact information or social media accounts.

If the project already has footer information, reuse it.

---

# 13. MODERN NEXT.JS IMPLEMENTATION

Use modern Next.js practices appropriate for the project's existing version.

Before implementing, determine whether the project uses:

* App Router
* Pages Router
* Server Components
* Client Components
* Server Actions
* route handlers
* existing data-fetching patterns

Follow the architecture already established by the project.

Do NOT unnecessarily convert the application from one architecture to another.

---

# 14. COMPONENT ARCHITECTURE

The Welcome Page must NOT become one giant component.

Break the UI into logical reusable components.

Prefer something similar to:

```text
components/
└── welcome/
    ├── WelcomePage.tsx
    ├── WelcomeHero.tsx
    ├── WelcomeFeatures.tsx
    ├── WelcomeFeatureCard.tsx
    ├── WelcomeHowItWorks.tsx
    ├── WelcomeAbout.tsx
    ├── WelcomeCTA.tsx
    └── WelcomeFooter.tsx
```

However, follow the project's existing component organization if it uses another structure.

Component responsibilities should be clear.

Avoid:

```tsx
export default function WelcomePage() {
    // 1000+ lines
}
```

Prefer smaller, focused components.

---

# 15. DATA-DRIVEN COMPONENTS

Where appropriate, use arrays/objects for repeated content.

For example:

```tsx
const features = [
    {
        title: "...",
        description: "...",
        icon: ...
    },
    ...
];
```

Then render reusable cards.

This makes the page easier to maintain.

Do not duplicate large blocks of JSX unnecessarily.

---

# 16. DESIGN QUALITY

The page should feel:

* modern
* intentional
* professional
* clean
* responsive
* accessible
* visually balanced
* production-ready

Avoid excessive:

* gradients
* glassmorphism
* glowing effects
* huge text
* floating blobs
* random animations
* unnecessary cards
* excessive rounded containers
* decorative icons
* emoji
* generic illustrations
* AI-style visual patterns

Use visual effects only when they support the existing design language.

The page should look like a professionally designed website rather than an AI-generated template.

---

# 17. MAKE IT LOOK HUMAN-DESIGNED

This is extremely important.

Do not produce a stereotypical AI-generated landing page.

Avoid patterns such as:

* "Welcome to the future of..."
* "Empowering communities through innovation..."
* excessive gradient text
* repetitive three-card layouts everywhere
* random statistics
* fake testimonials
* fake company logos
* unnecessary glowing backgrounds
* excessive glassmorphism
* meaningless buzzwords
* generic stock imagery
* excessive use of icons
* every section centered
* every card having identical dimensions
* excessive rounded corners
* excessive animations

Instead:

* use meaningful content
* establish a strong hierarchy
* use intentional whitespace
* vary layouts when appropriate
* prioritize readability
* use real application concepts
* use real routes
* use existing project assets
* use subtle interaction
* keep animations purposeful
* maintain consistency with the existing site

The result should feel like a developer/designer who actually understood the product created it.

---

# 18. RESPONSIVE DESIGN

The Welcome Page must work properly on:

* mobile phones
* tablets
* laptops
* desktops
* large screens

Test at least conceptually against:

```text
320px
375px
425px
768px
1024px
1280px
1440px
1920px
```

Pay attention to:

* navigation
* hero layout
* typography
* cards
* spacing
* images
* CTA buttons
* footer
* horizontal overflow
* touch targets

There must be no unwanted horizontal scrolling.

---

# 19. ACCESSIBILITY

Follow modern accessibility practices.

Ensure:

* semantic HTML
* proper heading hierarchy
* accessible buttons
* accessible links
* meaningful alt text
* keyboard navigation
* visible focus states
* sufficient contrast
* appropriate ARIA only when necessary
* no interaction that depends exclusively on hover

Do not use `<div>` elements as buttons when a real `<button>` is appropriate.

---

# 20. PERFORMANCE

Keep the page performant.

Use:

* optimized Next.js images where applicable
* appropriate lazy loading
* minimal client-side JavaScript
* Server Components where appropriate
* existing optimized assets
* lightweight animations

Do not turn the entire page into a Client Component unless necessary.

Avoid unnecessary dependencies.

Do not install a package simply to solve something that can already be implemented using the project's existing dependencies.

---

# 21. ANIMATIONS

If the project already uses an animation library, reuse it.

If animations are appropriate, use subtle animations such as:

* fade-in
* slight slide
* staggered feature appearance
* hover transitions
* button transitions

Avoid:

* excessive motion
* constant floating animations
* distracting parallax
* long loading animations
* unnecessary page transitions

Respect:

```css
prefers-reduced-motion
```

where applicable.

---

# 22. ICONS AND IMAGES

Reuse existing project icons and images whenever possible.

Before adding new assets, inspect:

```text
public/
```

and existing components.

Do not replace existing assets without a clear reason.

Do not introduce a new icon library if an existing icon library is already used.

Keep the visual language consistent.

---

# 23. ROUTING

Inspect the existing route structure before adding navigation links.

Every link on the Welcome Page must point to a real route.

Do not invent:

```text
/about
/features
/pricing
/testimonials
```

unless those routes actually exist or you are explicitly implementing them.

If the project has authentication:

* understand the authentication flow
* determine which routes are public
* ensure protected routes remain protected
* do not bypass middleware
* do not expose sensitive information

---

# 24. SECURITY

Do not expose:

* `.env`
* API keys
* authentication secrets
* database credentials
* tokens
* private configuration
* server-only data

Do not import server-only modules into client components.

Do not expose sensitive environment variables through the client.

Do not hardcode secrets.

---

# 25. DO NOT BREAK EXISTING FUNCTIONALITY

This is an existing project.

Therefore:

### DO NOT:

* rewrite unrelated pages
* change existing database schemas
* modify authentication unnecessarily
* remove existing routes
* delete existing components without reason
* replace the existing theme
* change existing business logic
* rename unrelated files
* remove existing content
* change API behavior
* modify environment variables unnecessarily

The Welcome Page should integrate into the existing application rather than destabilize it.

---

# 26. REUSE EXISTING COMPONENTS

Before creating a new component, search for existing equivalents.

For example, if the project already has:

```text
Button
Card
Navbar
Footer
Modal
Container
Section
Icon
```

reuse them where appropriate.

Do not create duplicate components with slightly different implementations.

---

# 27. CONTENT RULES

Content should be based on actual project information.

Inspect:

* README
* existing page content
* database models
* API routes
* documentation
* UI labels
* navigation
* feature names

Use that information to understand the website.

Do not fabricate:

* statistics
* user testimonials
* organizations
* reviews
* awards
* certifications
* partnerships
* social media accounts
* locations
* claims about impact

If information is unavailable, keep the section simple rather than inventing content.

---

# 28. SEO

Implement appropriate metadata according to the existing Next.js architecture.

Use:

* meaningful title
* description
* appropriate metadata
* Open Graph metadata if the project already supports it
* relevant keywords only where appropriate

Do not stuff keywords.

The title and description must describe the actual website.

---

# 29. ERROR CHECKING

After implementation:

Run the project's existing validation commands.

Inspect `package.json` first to determine available commands.

Run appropriate:

```bash
npm run lint
npm run typecheck
npm run build
```

or the project's equivalent commands.

Do not assume all three commands exist.

Fix:

* TypeScript errors
* ESLint errors
* build errors
* import errors
* broken routes
* invalid component usage
* responsive issues
* hydration issues

Do not hide errors using `any`, disabling ESLint rules, or suppressing TypeScript errors unless there is a legitimate project-specific reason.

---

# 30. REVIEW THE FINAL IMPLEMENTATION

After coding, perform another review.

Ask yourself:

### Architecture

* Are components properly separated?
* Is the code maintainable?
* Are existing components reused?

### UI

* Does it match the existing theme?
* Does it look intentionally designed?
* Is spacing consistent?
* Is typography consistent?

### Content

* Is all content based on the actual project?
* Did I invent anything?

### UX

* Is the purpose immediately clear?
* Are CTAs meaningful?
* Are navigation links valid?

### Responsiveness

* Does it work on mobile?
* Does it work on desktop?
* Is there horizontal overflow?

### Accessibility

* Are headings structured?
* Are buttons and links accessible?
* Are images properly described?

### Performance

* Are unnecessary client components avoided?
* Are assets optimized?
* Are unnecessary dependencies avoided?

### Code quality

* Is there duplicated JSX?
* Are names meaningful?
* Are components appropriately sized?
* Is the implementation idiomatic for the current Next.js version?

---

# 31. IMPORTANT: PRESERVE THE CURRENT THEME

The goal is to create a **Welcome Page that belongs to the existing website**.

Do NOT redesign the entire application.

Do NOT change the existing global theme merely to make the Welcome Page look different.

If improvements are necessary, keep them isolated to the Welcome Page unless the existing design system clearly requires a reusable improvement.

The current project's:

* colors
* fonts
* icons
* visual identity
* spacing system
* component style

should remain the foundation.

---

# 32. BEFORE CODING: CREATE AN IMPLEMENTATION PLAN

Before making changes, first inspect the entire codebase and `.opencode` skills.

Then create a concise internal implementation plan containing:

1. Existing application purpose
2. Existing audience
3. Existing design system
4. Existing reusable components
5. Existing routes
6. Existing relevant content
7. Welcome Page structure
8. Components to create
9. Components to reuse
10. Files that will be modified
11. Files that will be created
12. Validation/testing strategy

Do not modify unrelated files.

Once the codebase has been understood, implement the plan.

---

# 33. FINAL EXPECTATION

The final result should be a **modern, polished, responsive, production-ready Welcome Page** that:

* is specifically designed around this application
* uses the existing website information
* follows the existing theme
* follows modern Next.js practices
* uses clean component architecture
* avoids unnecessary duplication
* is responsive
* is accessible
* is performant
* uses real routes
* uses real content
* does not fabricate information
* does not expose sensitive information
* does not break existing functionality
* follows the `.opencode` skills and project instructions
* looks professionally designed
* does NOT look like a generic AI-generated landing page

Most importantly:

**READ FIRST. UNDERSTAND SECOND. PLAN THIRD. CODE FOURTH. VALIDATE LAST.**

Do not start writing the Welcome Page until you have actually inspected the existing project and `.opencode` instructions.

Do not make assumptions about the application when the answer can be determined by reading the codebase.
