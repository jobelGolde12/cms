# MASTER PROMPT: Website-Wide UI Color Standardization, Sidebar Redesign, Logo Consistency, and Visual Quality Enhancement

## 1. Project Objective

Act as a senior UI/UX designer and experienced Next.js frontend developer. Inspect the entire existing codebase and improve the website's visual design, color consistency, typography, sidebar, navigation, logo presentation, and overall user experience.

The system is a **School Records Management System for Sta. Magdalena National High School**. Its interface must look professional, modern, organized, accessible, and suitable for an actual school or government institution.

Use the provided dashboard screenshot as the visual reference, particularly its blue color, professional layout, clean white surfaces, subtle borders, rounded cards, and organized navigation.

The system requires blue as its primary brand color. However, **do not apply blue text indiscriminately to every heading, paragraph, label, description, and content element.** Instead, use blue strategically as a primary background color for the sidebar, selected navigation items, primary buttons, and other appropriate interface elements.

The goal is to create a balanced visual hierarchy where blue establishes the system's identity, white provides readability, and neutral colors make the content comfortable to read.

## 2. Mandatory Instructions Before Making Changes

Before editing any code:

1. Read `AGENTS.md` and follow all applicable project instructions.
2. Inspect the entire Next.js codebase, including the application routes, shared layouts, components, stylesheets, design tokens, authentication pages, dashboards, forms, tables, modals, and reusable navigation components.
3. Identify whether the project uses Tailwind CSS, Bootstrap, CSS Modules, global CSS, a component library, or a combination of styling approaches.
4. Identify the existing logo files and determine how logos are currently displayed across different pages.
5. Identify all occurrences of hard-coded blue text, blue backgrounds, inconsistent colors, conflicting CSS rules, and repeated component styles.
6. Identify shared components that can be improved once and reused throughout the application.
7. Review the current responsive behavior of the sidebar, headers, page content, tables, cards, forms, and authentication pages.

Do not immediately replace the existing theme or rewrite the application. Understand the current implementation first and make targeted, maintainable improvements.

**Preservation requirements:**
- Preserve existing functionality, business logic, authentication, authorization, API integrations, database operations, routes, and permissions.
- Preserve existing page content and system-specific features unless a small change is necessary for visual consistency.
- Do not modify the database schema or backend logic for a frontend styling task.
- Do not remove existing navigation items or hide important functionality to simplify the design.
- Avoid unnecessary dependency installation and large-scale architectural changes.
- Keep the existing system identity and use blue as the primary brand color.

## 3. Establish a Consistent Website-Wide Color System

Create or improve a centralized design token system so that the same colors are reused throughout the application.

Use CSS custom properties, Tailwind theme variables, or the existing project's preferred theming approach. Do not scatter arbitrary hexadecimal color values across individual components.

Use the following palette as the recommended starting point. Adjust individual shades only when necessary to maintain consistency, accessibility, and compatibility with the existing application.

### Primary brand palette

- Primary blue: `#315EF7`
- Dark brand blue: `#14295F`
- Sidebar background: `#14295F`
- Sidebar hover background: `#203B7A`
- Sidebar active background: `#315EF7`
- Light blue surface: `#EEF4FF`
- Pale blue border: `#C9D8FF`
- Primary button background: `#315EF7`
- Primary button hover: `#2449D8`
- Focus ring: `#7EA2FF`

The primary blue should closely resemble the vivid blue used for text in the supplied screenshot. The dark navy shade should provide a deeper background for the sidebar without losing the blue identity.

### Neutral palette

- Main page background: `#F4F7FC`
- Card and panel background: `#FFFFFF`
- Main body text: `#263449`
- Main heading text: `#14295F`
- Secondary text: `#64748B`
- Muted or helper text: `#7B879B`
- Standard border: `#DCE4F0`
- Divider: `#E8EDF5`
- Disabled text: `#94A3B8`

### Semantic colors

Use semantic colors only for their intended meanings.

- Success: `#059669`
- Success background: `#D1FAE5`
- Warning: `#D97706`
- Warning background: `#FEF3C7`
- Error: `#DC2626`
- Error background: `#FEE2E2`
- Informational background: `#E0EAFF`

Do not use the primary blue for every status. Verification, pending records, errors, successful operations, and warnings should remain visually distinguishable.

### Recommended design tokens

Create a centralized token structure similar to the following, adapted to the existing project:

```css
:root {
  --color-primary: #315EF7;
  --color-primary-hover: #2449D8;
  --color-primary-light: #EEF4FF;
  --color-primary-border: #C9D8FF;

  --color-sidebar: #14295F;
  --color-sidebar-hover: #203B7A;
  --color-sidebar-active: #315EF7;

  --color-page: #F4F7FC;
  --color-surface: #FFFFFF;
  --color-heading: #14295F;
  --color-text: #263449;
  --color-muted: #64748B;
  --color-border: #DCE4F0;

  --color-success: #059669;
  --color-warning: #D97706;
  --color-danger: #DC2626;

  --radius-card: 10px;
  --radius-control: 7px;
}
```

Treat this as a proposed starting point, not a reason to duplicate existing tokens. If the project already has a design system, extend or correct it instead of introducing a competing system.

## 4. Redesign the Sidebar: Make Blue a Background, Not the Default Text Color

This is one of the highest-priority changes.

The current interface uses blue prominently in many text elements. Instead, move the strongest brand color into the sidebar background and retain readable, mostly white or neutral content in the main workspace.

### A. Sidebar background

Use a solid dark navy blue background such as `#14295F`.

The sidebar should provide a clear visual anchor for the application and contrast with the white top header and light main content background.

Recommended appearance:

- Sidebar background: dark navy blue.
- Sidebar title and brand text: white or near-white.
- Sidebar section headings: muted light blue, such as `#AFC4FF`.
- Default navigation labels: `#E7EDFF`.
- Default navigation icons: `#D7E2FF`.
- Hover background: `#203B7A`.
- Hover text and icons: white.
- Active navigation background: `#315EF7`.
- Active navigation text and icons: white.
- Sidebar separators: subtle translucent white borders.
- Secondary navigation descriptions: muted blue-white.
- Sidebar footer: consistent with the sidebar background.

Ensure the active item is identifiable even without relying exclusively on color. You may add a subtle left indicator, stronger font weight, or another restrained visual cue.

### B. Navigation item behavior

Every sidebar item must have consistent default, hover, focus, active, and disabled states.

For example:

- Dashboard: dark navy background, white text and icon when active, with a brighter blue active surface.
- Students: light text and icon on the navy sidebar when inactive.
- Performance: same consistent inactive treatment.
- Student Development: same consistent inactive treatment.
- Health & Nutrition: same consistent inactive treatment.
- Verification: same consistent inactive treatment.
- Duplicate Review: same consistent inactive treatment.
- Reports: same consistent inactive treatment.
- Employees and other modules: same consistent navigation treatment.

Apply these styles dynamically according to the current route. Do not hard-code Dashboard as permanently active.

Use the existing navigation configuration and route-matching logic whenever possible. Ensure nested routes correctly highlight their parent navigation item.

### C. Sidebar section labels

Group related navigation items under readable section labels, such as:

- CORE MODULES
- EMPLOYEE RECORDS
- OPERATIONS & TOOLS
- SYSTEM MANAGEMENT

Retain the existing sections and labels if they differ. Improve spacing, typography, and contrast without removing functional menu items.

### D. Sidebar scrolling and layout

- Keep the sidebar navigation vertically scrollable when its contents exceed the available height.
- Keep the logo and brand area visually separated from the navigation.
- Keep the account information or user profile footer consistent with the existing design.
- Prevent overlapping scrollbars, clipped menu labels, and hidden navigation items.
- Avoid making the sidebar excessively wide.
- Support desktop, tablet, and mobile layouts.
- On mobile, use the existing drawer or collapsible navigation pattern when available.

## 5. Stop Applying Blue Text to Every Page Element

Audit the entire application and correct the misuse of blue text.

Blue should identify primary actions, selected states, links, and selected data—not every element on the page.

### A. Main headings

Use dark navy or a similarly dark neutral shade for:

- Page titles
- Section headings
- Dashboard headings
- Card headings
- Modal titles
- Form section headings
- Table section titles

Recommended color: `#14295F` or another accessible dark neutral.

Do not make every heading bright blue.

### B. Body content

Use dark slate or neutral gray for:

- Paragraphs
- Descriptions
- Instructions
- Form labels
- Table cell values
- General information
- Student details
- Employee details
- Record descriptions
- Empty-state explanations

Recommended color: `#263449`.

Use muted gray for secondary descriptions, timestamps, helper text, and supplementary information.

### C. Where blue text is appropriate

Reserve bright primary blue for elements such as:

- Interactive text links
- Selected tabs
- Small informational highlights
- Important clickable values, when appropriate
- Active pagination items
- Focused controls
- Small brand accents
- Selected filters or view modes

Avoid making long paragraphs, full descriptions, or all table data bright blue.

### D. Avoid excessive blue decoration

Do not add blue borders, blue text, blue icons, and blue backgrounds to every component simultaneously.

Instead, use a restrained hierarchy:

1. Dark navy for headings and the sidebar.
2. White for cards, forms, tables, and the top header.
3. Dark neutral text for content.
4. Bright blue for primary actions and selected states.
5. Muted gray for supporting information.
6. Green, amber, and red for appropriate status indicators.

The interface should feel like a professional records management system, not a page where every element competes for attention.

## 6. Standardize the Logo Width and Presentation on Every Page

Every page that displays the school logo or system logo must use consistent dimensions and alignment.

Audit all pages and shared components, including:

- Main dashboard
- Student registry
- Student profile and details
- Validation and verification
- Performance
- Student development
- Health and nutrition
- Duplicate review
- Reports
- Employee records
- Service credits
- Settings and system management
- Login page
- Registration page
- Welcome page
- Password recovery pages
- Error pages, where the logo is present

Include additional routes discovered in the codebase.

### A. Create one reusable logo component

If the project does not already have an appropriate reusable logo component, create one. For example:

`components/branding/SchoolLogo.tsx`

Adapt the location and filename to the existing project structure.

The component should support:

- Consistent logo dimensions
- A configurable image source when necessary
- Optional school name and subtitle
- Appropriate alternative text
- Responsive sizing
- Consistent alignment
- An optional compact variant
- Proper image aspect ratio

Reuse the existing official logo asset. Do not generate a replacement logo, distort the image, or substitute a generic icon for the actual school logo.

### B. Recommended logo dimensions

Use these as starting dimensions, adjusting for the actual logo asset and layout.

| Location | Recommended logo dimensions |
|---|---|
| Desktop sidebar branding | 40 × 40 px to 44 × 44 px |
| Compact sidebar | 36 × 36 px |
| Login page | 56 × 56 px to 72 × 72 px |
| Registration page | 48 × 48 px to 64 × 64 px |
| Welcome page | 44 × 44 px to 64 × 64 px |
| Mobile header | 32 × 32 px to 36 × 36 px |
| Footer branding | 28 × 28 px to 36 × 36 px |

Use a fixed width and height for the logo's image container, with `object-fit: contain` to preserve the original proportions.

If the source logo is rectangular or has a different aspect ratio, adapt the container rather than stretching the image.

### C. Consistent branding layout

Where the logo appears beside school information:

- Align the logo vertically with the school name.
- Use consistent spacing, such as 10–12 px.
- Use a consistent school-name font weight and size.
- Keep secondary information smaller and less prominent.
- Avoid excessive whitespace or oversized branding.
- Ensure the logo does not push the title outside the header.
- Use a consistent text alignment and line height.
- Ensure the logo and accompanying text remain readable at smaller widths.

For dark navy backgrounds, ensure the logo is visible against the background. Use a restrained white or light surface behind the logo only when the original asset requires it.

### D. Prevent inconsistent logo implementations

Do not leave separate pages using arbitrary logo sizes or unrelated styling.

Update existing shared layouts and logo references to use the standardized component where practical. Avoid duplicating logo markup and conflicting CSS rules.

Do not change the actual logo artwork, official school name, or existing brand content without authorization.

## 7. Improve the Main Application Header

The top header should complement the navy sidebar and the light main content.

Recommended appearance:

- White background.
- Subtle bottom border.
- Dark navy page or application title.
- Search input with a white background and a light neutral border.
- Primary blue focus ring.
- Muted icons by default.
- Blue hover states for interactive icons.
- Clear notification, help, and account controls.
- Consistent vertical alignment.
- Consistent height across application pages.

Avoid bright blue text for every header element.

Ensure that:

- Long page titles do not overlap search or profile controls.
- Search inputs resize appropriately.
- Buttons have accessible names.
- Account information remains readable.
- Notification indicators are visually restrained.
- Mobile layouts collapse or rearrange header elements correctly.

Keep the existing header functionality and search behavior intact.

## 8. Improve Dashboard and Main Content Styling

Apply the same design language to dashboard cards, charts, data tables, and summary sections.

### Dashboard cards

- White background.
- Subtle neutral or pale blue border.
- Consistent corner radius.
- Consistent internal spacing.
- Dark navy headings.
- Dark neutral values and descriptions.
- Small icons inside restrained tinted backgrounds.
- Subtle progress indicators where applicable.
- Consistent card heights when cards share a row.

Do not give every card a solid blue background. Reserve solid blue surfaces for intentional emphasis.

### Tables and record lists

- White surface.
- Dark readable text.
- Clear column headings.
- Subtle row separators.
- Consistent padding.
- Restrained hover backgrounds.
- Visible keyboard focus.
- Accessible pagination and selection states.
- Consistent empty, loading, and error states.

Use blue for interactive links, selected rows, and primary actions rather than all table content.

### Forms

- White or light neutral backgrounds.
- Dark readable labels.
- Neutral input borders.
- Blue focus rings.
- Clear required-field indicators.
- Consistent input heights.
- Accessible validation messages.
- Distinct disabled and read-only states.

Do not use bright blue for every label, placeholder, and input value.

### Buttons

Establish reusable button variants:

- Primary: blue background with white text.
- Secondary: white background, dark text, neutral border.
- Outline: transparent or white background with a blue border and readable text.
- Ghost: transparent background with neutral text and an appropriate hover surface.
- Danger: red treatment for destructive actions.

Ensure hover, focus, active, disabled, and loading states are consistent. Preserve existing action handlers and permissions.

## 9. Improve Color Consistency Across Every Route

Create an inventory of all application pages and verify that each follows the shared design system.

Pay special attention to pages that may have independent styles or older implementations.

For every route:

1. Use the standardized page background.
2. Use consistent content surfaces.
3. Use dark neutral body text.
4. Use dark navy headings.
5. Use the shared primary blue for interactive elements.
6. Use the standardized logo component where a logo is displayed.
7. Use consistent spacing, typography, borders, and corner radii.
8. Preserve page-specific content and functionality.
9. Keep status colors semantically meaningful.
10. Ensure there are no unexpected blue text styles inherited from global CSS.

Inspect authentication pages separately because their layout may intentionally differ from the dashboard. They should still use the same branding, logo sizing principles, and color palette.

Avoid a superficial fix that changes only the dashboard while leaving other pages inconsistent.

## 10. Typography and Visual Hierarchy

Use the existing font family if it already suits the system. Do not introduce a new font unnecessarily.

Establish a consistent hierarchy:

- Main page title: approximately 26–32 px on desktop.
- Section heading: approximately 18–22 px.
- Card title: approximately 13–15 px, with appropriate emphasis.
- Body text: approximately 14–16 px.
- Helper text and metadata: approximately 12–14 px.
- Sidebar section label: approximately 10–12 px, uppercase if appropriate.

Adapt these sizes to the existing interface and accessibility requirements.

Use font weights intentionally. Avoid making every element bold or using uppercase for all body text.

Maintain readable line heights, consistent letter spacing, and proper wrapping for long school names, page titles, and descriptions.

## 11. Accessibility and Contrast Requirements

Do not sacrifice readability to achieve the desired color scheme.

- Ensure white text on the dark navy sidebar has sufficient contrast.
- Ensure inactive and active navigation items remain readable.
- Check contrast for bright blue text against white backgrounds.
- Use dark text on pale blue surfaces where appropriate.
- Avoid relying exclusively on color to communicate status.
- Provide visible keyboard focus indicators.
- Preserve keyboard navigation and screen-reader labels.
- Provide meaningful alternative text for the school logo.
- Respect reduced-motion preferences when adding or modifying transitions.
- Do not hide important labels merely to make the design cleaner.

Target WCAG 2.2 AA contrast requirements where applicable, including 4.5:1 for normal text and 3:1 for large text.

If the chosen primary blue does not meet contrast requirements for normal-sized text on a white background, use a darker accessible shade for that specific text usage while retaining the bright blue for backgrounds, borders, icons, or other appropriate accents.

## 12. Responsive Design

Ensure that the new theme and standardized logo work across desktop, tablet, and mobile devices.

Test at widths around 320 px, 375 px, 425 px, 768 px, 1024 px, and 1440 px.

Check for:

- Sidebar overflow.
- Logo and school-name collisions.
- Header wrapping.
- Unreadable navigation labels.
- Horizontal page overflow.
- Oversized cards.
- Broken dashboard grids.
- Tables exceeding the viewport.
- Buttons that become too narrow.
- Excessive blue backgrounds on small screens.
- Text that is difficult to read against the sidebar.
- Inconsistent logo dimensions between responsive breakpoints.

Use the existing mobile navigation pattern when possible. On smaller screens, make the sidebar collapsible or use a drawer if the application already supports that interaction.

Keep primary actions accessible without allowing the header or logo to dominate the available screen space.

## 13. Implementation Quality

Follow the project's existing coding conventions and modern Next.js patterns.

- Prefer shared components and design tokens over duplicated styles.
- Reuse the existing icon library.
- Preserve existing icon meanings.
- Avoid introducing unnecessary dependencies.
- Avoid broad CSS selectors that accidentally change unrelated elements.
- Avoid excessive `!important` declarations.
- Remove obsolete styles only after confirming that they are no longer used.
- Avoid duplicating global styles across pages.
- Keep client components limited to cases that need client-side behavior.
- Do not add unnecessary animations or visual effects.
- Use subtle transitions for navigation hover, buttons, and focus states.
- Preserve server-side rendering and existing data-fetching behavior.

Do not change application logic merely to achieve a visual result.

## 14. Testing and Verification

After implementation, run the project's available linting, type checking, and build commands. Use the package manager and scripts defined in the existing project.

Inspect the rendered application, if the available environment supports it, and verify:

- The sidebar uses the intended dark navy background.
- Navigation text and icons are readable.
- Active navigation states use the brighter blue appropriately.
- Main body text is no longer unnecessarily bright blue.
- Headings use dark navy or neutral colors consistently.
- Cards and page surfaces remain clean and readable.
- Primary buttons are visually identifiable.
- The logo uses standardized dimensions on every applicable page.
- The logo preserves its aspect ratio.
- Login, registration, welcome, dashboard, and internal pages remain visually consistent.
- Responsive layouts do not overflow.
- Existing routes and interactions still work.
- No new hydration, console, lint, or build errors have been introduced.

Do not claim a test passed unless it was actually executed.

If you encounter pre-existing errors, distinguish them from any new issues caused by your changes.

## 15. Acceptance Criteria

The task is complete only when all the following conditions are met:

- [ ] Blue remains the primary brand color.
- [ ] The sidebar uses a dark navy blue background.
- [ ] Active navigation items use a clear brighter blue treatment.
- [ ] Sidebar text and icons have sufficient contrast.
- [ ] Main page body text is primarily dark neutral rather than bright blue.
- [ ] Page headings use a consistent dark navy or neutral color.
- [ ] Primary blue is reserved for appropriate interactive elements and highlights.
- [ ] The color palette is centralized and consistently reused.
- [ ] The header, dashboard, forms, tables, and cards follow the same design language.
- [ ] Every page that uses the school logo follows standardized logo sizing and alignment.
- [ ] The logo is not stretched, distorted, or unnecessarily replaced.
- [ ] The design remains responsive.
- [ ] Accessibility and contrast have been considered.
- [ ] Existing application functionality has been preserved.
- [ ] Available lint, type-check, and build commands have been executed and their results reported.

## 16. Final Deliverable

Complete the implementation directly in the existing codebase.

When finished, provide a concise implementation report containing:

1. The shared color palette established.
2. The sidebar and navigation changes made.
3. The pages and components updated.
4. How the logo dimensions were standardized.
5. The shared components and design tokens created or modified.
6. Any responsive or accessibility improvements.
7. The tests and build commands executed, with their actual results.
8. Any remaining inconsistencies or issues that could not be resolved.

Do not merely provide suggestions or a list of proposed changes. Inspect the codebase, implement the improvements, and verify the results to the extent supported by the available environment.

**Final design direction:** A professional school records management interface with a dark navy sidebar, white header, light neutral workspace, dark readable text, consistent school branding, and carefully controlled bright blue accents. The result must be visually cohesive across the entire website rather than limited to the dashboard.