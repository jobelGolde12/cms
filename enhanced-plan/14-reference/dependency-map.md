# Dependency Map — Feature & System Relationships

This dependency map shows how major parts of the CMS depend on each other. It guides implementation order.

## System Dependencies

### Authentication System
```
login/page.tsx (client form)
  → actions/auth.ts (performLogin)
    → lib/auth.ts (hashToken, verifyPassword, createSession)
      → lib/constants.ts (SESSION_COOKIE_NAME, SESSION_TTL_MS)
      → db/schema.ts (users, sessions, roles)
    → lib/audit.ts (logAudit — audit logs)
    → lib/rate-limit.ts (rateLimit — rate limiting)
    → lib/default-credentials.ts (findDefaultCredential — dev accounts)
```

### Registry System
```
(app)/children/page.tsx (list + filters)
  → lib/queries.ts (listChildren, registryStats, cohortCounts)
    → lib/scope.ts (childScope — authorization)
    → db/schema.ts (children, barangays, childAddresses, childEducation, schools)
  → components/registry/registry-ui.tsx (table, pagination, filters)

(app)/children/new/page.tsx (create)
  → components/child-form.tsx (form UI)
    → actions/children.ts (createChild)
      → lib/auth.ts (getAuthorizedUser, sessionMetadata)
      → lib/schemas.ts (childFormSchema)
      → lib/scope.ts (childScope, canEditChild)
      → lib/workflow.ts (REVIEW_DECISION_TO_RECORD_STATUS)
      → lib/duplicates.ts (refreshDuplicateCandidates)
      → lib/qr.ts (deactivateChildTokens)
      → lib/audit.ts (logAudit, notify)
```

### Validation System
```
(app)/validation/page.tsx (queue + stats)
  → lib/queries.ts (validationQueue, validationStats)
    → lib/scope.ts (childScope)
  → components/validation/validation-ui.tsx (queue UI)
  → actions/children.ts (reviewValidation, reopenChild)
    → lib/auth.ts (getAuthorizedUser)
    → lib/schemas.ts (validationReviewSchema)
```

### Duplicate System
```
(app)/duplicates/page.tsx (conflict queue + review panel)
  → lib/queries.ts (listDuplicates)
  → actions/duplicates.ts (reviewDuplicate)
    → lib/auth.ts (getAuthorizedUser)
    → lib/schemas.ts (duplicateReviewSchema)
    → lib/duplicates.ts (detectDuplicates, refreshDuplicateCandidates)
  → components/validation/validation-ui.tsx (reused: MatchEvidence, RecordComparison)
```

### Monitoring System
```
(app)/monitoring/page.tsx (overview)
  → lib/queries.ts (monitoringOverview)
(app)/monitoring/[type]/page.tsx
  → lib/queries.ts (monitoringList)
(app)/monitoring/interventions/page.tsx
  → lib/queries.ts (listInterventions, getFollowupsForIntervention)
  → actions/monitoring.ts (saveMonitoring, updateMonitoringStatus)
  → actions/interventions.ts (not fully read)
```

### Report System
```
(app)/reports/page.tsx (list)
  → db/schema.ts (reports)
  → lib/constants.ts (REPORT_TYPES, REPORT_TYPE_LABELS)
/api/reports/[type]/route.ts (export)
  → lib/auth.ts (getCurrentUser, hasPermission)
  → lib/reports/report-data.ts (buildReport)
  → lib/reports/pdf.tsx (renderReportPdf)
  → lib/reports/excel.ts (renderReportExcel)
  → lib/scope.ts (childScope — scoping in buildReport)
  → lib/audit.ts (logAudit)
```

### Notification System
```
(app)/notifications/page.tsx
  → lib/queries.ts (recentNotifications, unreadNotificationCount)
  → actions/notifications.ts (markAllNotificationsRead — implied)
  → lib/audit.ts (notify — notification creation)
```

### User Management System
```
(app)/users/page.tsx
  → lib/queries.ts (listUsersWithRoles)
  → actions/users.ts (createUser, updateUser, deactivateUser)
  → lib/auth.ts (getAuthorizedUser, countOtherActiveAdmins, hashPassword)
```

---

## Cross-System Dependencies

- **Auth is foundational:** Every protected page/action depends on `lib/auth.ts` (session cookie resolution). Without `middleware.ts`, the dependency is explicitly called per page/action.
- **Scope (`lib/scope.ts`) is foundational:** Every query/action that reads `children` applies `childScope()` or `canAccessChild()`.
- **Audit (`lib/audit.ts`) is cross-cutting:** Every sensitive action (`login`, `createChild`, `updateChild`, `archiveChild`, `reviewValidation`, `reopenChild`, `reviewDuplicate`, `saveMonitoring`, `updateMonitoringStatus`, `createUser`, `updateUser`, `deactivateUser`, `logout`, `reports` export) logs an audit entry via `logAudit()`.
- **Notification (`lib/audit.ts` — `notify`) is cross-cutting:** Validation approvals, duplicate reviews, user creation, and some monitoring events create notifications.
- **Database (`db/`) is universal:** Every feature depends on `db/index.ts` and `db/schema.ts`.

---

This dependency map is derived from file imports (`import` statements) and function usage patterns observed during the audit.
