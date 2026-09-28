# Phase 8 Checklist — Content & Consistency

- [ ] Confirm `RECORD_STATUS_LABELS`, `CHILD_STATUS_LABELS`, `EDUCATION_STATUS_LABELS`, `MONITORING_TYPE_LABELS`, `INTERVENTION_STATUS_LABELS`, `DUPLICATE_STATUS_LABELS`, `VALIDATION_STATUS_LABELS` exist in `constants.ts`
- [ ] Confirm page titles match navigation labels (`Dashboard`, `Child Registry`, `Validation`, `Duplicate Review`, `Monitoring`, `Reports`, `QR Studio`, `Activity Logs`, `Notifications`, `Users`, `Settings`)
- [ ] Confirm `EmptyState` messages are appropriate (`No records pending validation`, `No conflicts in this view`, `No notifications yet.`)
- [ ] Confirm `system_settings` labels (`system_name`, `child_code_prefix`, `default_school_year`, `maintenance_mode`) match `EDITABLE_LABELS` (`constants.ts` implied through settings page code)
- [ ] Confirm footer text (`Sta. Magdalena Child Mapping System — Municipal Government of Sta. Magdalena, Sorsogon`) consistent across `app-shell.tsx` and `dashboard/primitives.tsx`
