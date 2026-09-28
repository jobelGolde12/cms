# Accessibility Audit

## Evidence From Actual Codebase

### Positive Accessibility Patterns
- **Labels:** Every form field (`Field` component in `src/components/ui/field.tsx`) has `htmlFor` linked to input `id`. `login/page.tsx` uses `label htmlFor={emailId}` with `input id={emailId}`.
- **Screen-reader only text:** `sr-only` class used for hidden labels (`global-search` in `app-shell.tsx`, `Search` input in `children/page.tsx`).
- **Focus rings:** `globals.css` lines 68–74 (`outline: 3px solid var(--color-action-600)`, `outline-offset: 2px`, `border-radius: 2px`) — visible, high-contrast focus state.
- **Aria labels:** `aria-label` on buttons (`Bell`, `Search`, `Help` link), `aria-current={active ? "page" : undefined}` in `sidebar-nav.tsx`.
- **Semantic HTML:** `main`, `aside`, `nav`, `header`, `footer`, `section`, `article` used correctly in `app-shell.tsx`, `dashboard/primitives.tsx`, `login/page.tsx`.
- **Reduced motion:** `globals.css` lines 50–59 (`prefers-reduced-motion`) — animations and transitions reduced.

### Gaps / Issues Discovered
- **Register checkbox (`agreed`):** No `aria-required` on the checkbox; client-side validation message (`!agreed ? ...`) is present but `aria-required` missing. (Documented in `02-database/` — no, actually `07-ui-logic/accessibility/`)
- **Form error linking:** Some forms (`register/page.tsx`) display errors via `Field` component (`error={state.ok === false ? state.fieldErrors?.firstName ?? undefined : undefined}`) but do not explicitly link `aria-describedby` from the input to the error message element. `login/page.tsx` does this correctly (`aria-describedby={hasError ? `${emailHintId} ${errorId}` : emailHintId}`).
- **Empty state icons:** `EmptyState` (`states.tsx`) uses `icon` prop (e.g., `<ShieldCheck className="h-10 w-10" />`). No `aria-label` on the icon; it is decorative (`aria-hidden` not explicitly set but `lucide-react` icons default to no `aria-label` unless passed). This is acceptable since the text (`title`, `description`) provides full context.
- **Table accessibility:** Registry table (`ChildRegistryTable` in `registry-ui.tsx`) uses `<table>` with `thead`/`tbody` but does not include `scope="col"` or `scope="row"` attributes. Not a critical failure but should be added for full WCAG compliance.
- **Keyboard navigation:** `sidebar-nav.tsx` links are focusable (`tabindex` not overridden) and have focus-visible styling. Mobile drawer (`mobile-nav-toggle.tsx`) not fully inspected but follows same link pattern.

---

References: `src/app/globals.css` (focus ring, reduced motion), `src/components/ui/field.tsx` (Field component), `src/app/login/page.tsx` (label/error linking), `src/app/register/page.tsx` (checkbox), `src/components/sidebar-nav.tsx` (`aria-current`), `src/components/dashboard/primitives.tsx` (`Panel`, `KpiGrid`), `src/components/ui/states.tsx` (`EmptyState`).
