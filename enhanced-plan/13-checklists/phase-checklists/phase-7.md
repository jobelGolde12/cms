# Phase 7 Checklist — Code Quality & Architecture

- [ ] Confirm `src/actions/*.ts` all start with `getAuthorizedUser()` or `getCurrentUser()` (read each file)
- [ ] Confirm no server action lacks authorization (compare `actions/auth.ts`, `children.ts`, `duplicates.ts`, `monitoring.ts`, `interventions.ts`, `notifications.ts`, `qr.ts`, `register.ts`, `reports/*.ts`, `settings.ts`, `users.ts`, `get-barangays.ts`)
- [ ] Confirm `ActionState` type (`helpers.ts`) is consistent (`ok: true/false`, `message`, `redirectTo`, `error`, `fieldErrors`)
- [ ] Confirm `useActionState()` usage in client components (`login/page.tsx`, `register/page.tsx`, `child-form.tsx`, `archive-child-button.tsx`) binds to correct action
- [ ] Confirm TypeScript passes (`npx tsc --noEmit` or `npm run build` — `ignoreBuildErrors: false` in `next.config.ts`)
- [ ] Confirm lint passes (`npm run lint`)
- [ ] Confirm no `any` types in critical paths (`lib/auth.ts`, `actions/children.ts`, `db/schema.ts` — audit did not find unsafe assertions)
