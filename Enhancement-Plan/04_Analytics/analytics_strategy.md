# Analytics Strategy

## Purpose
Track meaningful product milestones, not surveillance.

## Event Taxonomy (Proposed)
| Event Name | Properties | When |
|---|---|---|
| `page_viewed` | `route`, `user_role` | Page load (server-side) |
| `login_completed` | `method` (default/email) | Successful login |
| `login_failed` | `reason` (bad-credentials/deactivated/rate-limit) | Failed login |
| `child_created` | `status` (draft/pending) | Child record created |
| `child_updated` | `fields_changed` (count) | Child edit saved |
| `duplicate_review_completed` | `result` (confirmed/not_duplicate) | Duplicate review finalized |
| `intervention_started` | `priority` | Intervention created |
| `report_generated` | `report_type`, `scope` | Report created |
| `qr_verified` | `result` (valid/invalid/expired/revoked) | QR scan completed |
| `notification_read` | `notification_type` | User marks notification read |
| `error_occurred` | `route`, `error_category` (db/auth/network) | Unhandled/server error |
| `feature_used` | `feature` (search/filter/export) | User activates feature |

## Privacy Strategy
- No PII in event properties (only role, feature, status, result)
- No session tokens, passwords, API keys, or private messages
- Events logged server-side where possible; no client-side analytics library required unless needed
- No user-level tracking beyond role/feature usage (aggregate analytics acceptable)
