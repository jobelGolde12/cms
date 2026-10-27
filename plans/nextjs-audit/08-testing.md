# Testing Review

## Existing Tests
- `vitest.config.ts` exists; testing framework is `vitest`.
- `src/lib/__tests__/` contains tests for forecasting, grade validation, queries, schemas, security validation, utilities, workflow, performance filters, scope, reports, etc.
- Test coverage appears focused on library logic (`lib/`) rather than components or end-to-end workflows.

## Missing Tests
- No component tests (`components/`) observed; interactive components (`AppShell`, forms, charts) should have behavior tests.
- No API/route handler tests (`src/app/api/`); route handlers should be tested with mock requests.
- No action tests (`src/actions/`); server actions are critical for mutations and should have integration tests with mock DB.
- No end-to-end tests (`e2e/` or Playwright/Cypress) observed.
- No visual regression or accessibility tests.

## Testing Strategy (recommended)
- Unit tests for `lib/` utilities (already partially present).
- Integration tests for `actions/` using a test database or in-memory DB.
- Component tests for critical interactive components (`LoginForm`, `GradeForm`, `AppShell`) using React Testing Library.
- API route tests using `next/headers` and mock DB connections.
- No need to add hundreds of tests; prioritize critical workflows (login, student creation, grade submission, authorization denial).
