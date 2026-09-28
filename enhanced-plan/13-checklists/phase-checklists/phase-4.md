# Phase 4 Checklist — Form & Validation Improvements

- [ ] Inspect `src/components/ui/field.tsx` — confirm `Field` component supports `error` prop and links to input
- [ ] Read `src/app/login/page.tsx` — confirm `aria-describedby` links `emailHintId` and `errorId`
- [ ] Read `src/app/register/page.tsx` — add `aria-required="true"` to `agreed` checkbox (preserve theme/style)
- [ ] Confirm `register/page.tsx` checkbox server validation remains intact (`registerUser` checks `agreed`)
- [ ] Read `src/components/child-form.tsx` — confirm all inputs have `id` and `label htmlFor` linked; confirm error messages have `aria-describedby` linking to input
- [ ] Confirm `Field` component error display does not break layout (`text-sm font-medium text-red-800` — consistent with theme)
- [ ] Test `login` form with invalid email (client validation) and invalid password (server validation) — confirm `aria-invalid` and `aria-describedby` work together
