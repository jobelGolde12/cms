# File Map — Complete Codebase Reference

This file provides a quick reference to every important file in the CMS project. It supports the future implementation of the `enhanced-plan` by making navigation faster.

## Root & Config
- `.env` (secrets — DO NOT READ)
- `.env.example` (required variables: `TURSO_DATABASE_URL`, `DEFAULT_ADMIN_*`, `SESSION_COOKIE_SECURE`)
- `package.json` — dependencies, scripts (`dev`, `build`, `start`, `lint`, `test`, `db:push`, `db:generate`, `db:migrate`, `seed`)
- `tsconfig.json` — TypeScript strict, paths (`@/*` → `src/*`)
- `next.config.ts` — `turbopack`, headers (CSP, `nosniff`, `DENY`), `removeConsole`, `webpack` watch ignore (`local.db` excluded)
- `postcss.config.mjs` — Tailwind CSS v4
- `tailwindcss` v4 (`src/app/globals.css` — theme tokens `@theme`)
- `vitest.config.ts` — test runner

## Source Root (`src/`)
- `db/index.ts` — DB client (`db` instance)
- `db/schema.ts` — Full Drizzle schema (all tables, relations, indexes)
- `proxy.ts` — Cookie presence gate (not fully inspected; referenced in README)

## App Router (`src/app/`)
- `layout.tsx` — Root layout (`Fira_Sans` font, `brand-50` bg, metadata)
- `page.tsx` — Root redirect or welcome
- `global-error.tsx` — Global error boundary
- `error.tsx` — Error component
- `loading.tsx` — Loading component
- `not-found.tsx` — 404 component
- `globals.css` — Theme tokens, focus ring, reduced-motion
- `(app)/layout.tsx` — Protected layout (`AppShell` + redirect on no user)
- `(app)/loading.tsx` — App loading
- `(app)/error.tsx` — App error
- `(app)/dashboard/page.tsx` — Dashboard (`dashboardData`)
- `(app)/children/page.tsx` — Registry (`listChildren`)
- `(app)/children/[id]/page.tsx` — Profile (`getChildProfile`, history queries)
- `(app)/children/[id]/edit/page.tsx` — Edit (`ChildForm` mode edit)
- `(app)/children/new/page.tsx` — Create (`ChildForm` mode create)
- `(app)/validation/page.tsx` — Validation queue (`validationQueue`, `validationStats`)
- `(app)/duplicates/page.tsx` — Duplicate review (`listDuplicates`)
- `(app)/monitoring/page.tsx` — Monitoring overview (`monitoringOverview`)
- `(app)/monitoring/[type]/page.tsx` — Type-specific monitoring
- `(app)/monitoring/interventions/page.tsx` — Interventions
- `(app)/reports/page.tsx` — Reports list
- `(app)/qr/page.tsx` — QR studio
- `(app)/activity-logs/page.tsx` — Audit logs (`listAuditLogs`)
- `(app)/notifications/page.tsx` — Notifications (`recentNotifications`, `unreadNotificationCount`)
- `(app)/users/page.tsx` — User management (`listUsersWithRoles`)
- `(app)/settings/page.tsx` — Settings (`systemSettings`, profile update, password change)
- `login/page.tsx` — Login (`login` action)
- `register/page.tsx` — Registration (`registerUser` action, `getBarangays`)
- `welcome/page.tsx` — Welcome landing
- `logout/route.ts` — Logout handler (`logout` action)
- `verify/page.tsx` — Public QR verification form
- `verify/[token]/page.tsx` — Token lookup (not fully read)
- `verify/result/page.tsx` — Verification result (not fully read)

## API Routes (`src/app/api/`)
- `reports/[type]/route.ts` — Report export (`GET` — PDF/XLSX)

## Components (`src/components/`)
- `app-shell.tsx` — Main layout (sidebar, header, footer)
- `child-form.tsx` — Child registry form (client)
- `sidebar-nav.tsx` — Navigation links (client, `usePathname`)
- `mobile-nav-toggle.tsx` — Mobile drawer toggle
- `nav-icons.tsx` — Icon registry (`lucide-react` components mapped by name)
- `nav-item-client.tsx` — Client nav item (not fully read)
- `archive-child-button.tsx` — Archive form (client)
- `logout-button.tsx` — Logout link
- `welcome/` — Welcome landing sections (`WelcomeHero`, `WelcomeFeatures`, etc.)
- `dashboard/primitives.tsx` — Dashboard cards/grids (`KpiGrid`, `BarangayDistribution`, etc.)
- `registry/registry-ui.tsx` — Registry filters, pagination, table (`ChildRegistryTable`, `RegistryFilters`, etc.)
- `validation/validation-ui.tsx` — Validation queue components (`ValidationKpiGrid`, `RecordComparison`, etc.)
- `validation/review-form.tsx` — Review form (`ValidationReviewForm`)
- `ui/` — Shared primitives (`button`, `card`, `table`, `badge`, `field`, `states`)

## Actions (`src/actions/`)
- `helpers.ts` — `ActionState`, `fail`, `ok`, `zodFieldErrors`, `sessionMetadata`, `ROLE_IDS`, `notifyValidators`, `roleLabelFor`
- `auth.ts` — `login`, `logout`, `changePassword`, `updateProfile`, `updateProfileForm`, `changePasswordForm`
- `children.ts` — `createChild`, `updateChild`, `reviewValidation`, `archiveChild`, `reopenChild`, `archiveChildForm`, `reviewValidationForm`
- `register.ts` — `registerUser`
- `get-barangays.ts` — `getBarangays`
- `duplicates.ts` — `reviewDuplicate`, `reviewDuplicateForm`
- `monitoring.ts` — `saveMonitoring`, `updateMonitoringStatus`
- `interventions.ts` — Not fully read (implied by `interventions` table and `interventions/page.tsx`)
- `notifications.ts` — `markAllNotificationsRead` (implied by usage in `notifications/page.tsx`)
- `qr.ts` — `deactivateChildTokens` (referenced in `children.ts`), other QR actions not fully read
- `users.ts` — `createUser`, `updateUser`, `deactivateUser`
- `settings.ts` — `updateSystemSettingForm` (implied by `settings/page.tsx` usage)
- `reports/*.ts` — Not fully read (report generation actions may exist separately from `buildReport` service)

## Library (`src/lib/`)
- `constants.ts` — Domain constants (`MUNICIPALITY`, `ROLES`, statuses, labels)
- `auth.ts` — Authentication (`getCurrentUser`, `requireUser`, `requirePermission`, `createSession`, `destroySession`, `hashPassword`, `verifyPassword`, `countOtherActiveAdmins`)
- `permissions.ts` — RBAC (`PERMISSIONS`, `ROLE_PERMISSIONS`, `hasPermission`)
- `scope.ts` — Row-level authorization (`childScope`, `canAccessChild`, `canEditChild`)
- `schemas.ts` — Zod validation (`childFormSchema`, `loginSchema`, `userFormSchema`, `changePasswordSchema`, `validationReviewSchema`, `duplicateReviewSchema`, `monitoringFormSchema`, `interventionFormSchema`, etc.)
- `utils.ts` — Utilities (`cn`, `formatDate`, `formatDateTime`, `ageFromBirthDate`, `fullName`, `normalizeName`, `maskName`, `escapeHtml`, `randomToken`)
- `queries.ts` — Database queries (`listBarangays`, `listSchools`, `listChildren`, `getChildProfile`, `getCurrentAddress`, `getEducationHistory`, `getEccdHistory`, `getDisabilityRecords`, `getValidationHistory`, `getChildDuplicates`, `getMonitoringRecords`, `getInterventionsForChild`, `getQrEvents`, `dashboardStats`, `validationQueue`, `listDuplicates`, `monitoringOverview`, `listInterventions`, `listUsersWithRoles`, `listAuditLogs`, `unreadNotificationCount`, `recentNotifications`)
- `dashboard-data.ts` — Dashboard aggregates (`dashboardData`, `activityTitle`, `formatRelativeTime`, etc.)
- `audit.ts` — Audit and notifications (`logAudit`, `notify`)
- `duplicates.ts` — Duplicate detection (`detectDuplicates`, `refreshDuplicateCandidates`)
- `workflow.ts` — Status transition mapping (`REVIEW_DECISION_TO_RECORD_STATUS` — referenced but not fully read)
- `child-code.ts` — Child code generation (`nextChildCode`)
- `rate-limit.ts` — Rate limiting (`rateLimit`)
- `env-validation.ts` — Production env validation (`validateProductionEnv`)
- `default-credentials.ts` — Default accounts (`DEFAULT_CREDENTIALS`)
- `qr.ts` — QR utilities (`deactivateChildTokens` — implied)
- `reports/report-data.ts` — Report data builder (`buildReport`, `BuiltReport`, `ReportRow`, `MUNI_HEADER`)
- `reports/pdf.tsx` — PDF renderer (`renderReportPdf` — `@react-pdf/renderer` JSX component)
- `reports/excel.ts` — Excel renderer (`renderReportExcel` — `exceljs` buffers)

## Tests (`src/lib/__tests__/`)
- `queries-filters.test.ts`
- `utils.test.ts`
- `scope.test.ts`
- `schemas.test.ts`
- `workflow.test.ts`

---

This file map is evidence-based (derived from `find src -type f | sort` and direct file inspection). It is intended for quick navigation during future implementation of this plan, not as a design document.
