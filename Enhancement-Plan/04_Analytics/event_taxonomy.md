# Event Taxonomy

## Naming Convention
- Snake_case
- Verb + noun (`action_target` or `action_completed`)
- Consistent prefixes: `page_`, `login_`, `child_`, `report_`, `intervention_`, `duplicate_`, `notification_`, `error_`, `feature_`

## Categories
- **Navigation**: `page_viewed`
- **Authentication**: `login_completed`, `login_failed`, `logout_completed`
- **Registry**: `child_created`, `child_updated`, `child_deleted`, `child_archived`
- **Validation**: `validation_submitted`, `validation_approved`, `validation_needs_correction`
- **Duplicates**: `duplicate_review_started`, `duplicate_review_completed`
- **Monitoring**: `intervention_started`, `intervention_completed`, `monitoring_recorded`
- **Notifications**: `notification_read`, `notification_deleted`
- **Reports**: `report_generated`, `export_completed`
- **QR**: `qr_generated`, `qr_verified`, `qr_revoked`
- **System**: `settings_updated`, `user_role_changed`
- **Errors**: `error_occurred`
- **Features**: `search_performed`, `filter_applied`, `export_completed`
