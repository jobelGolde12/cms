# Privacy Strategy

## What is Collected
- Route/page name
- Feature/action name
- Status/result category (success/failure/reason)
- User role (admin/lgu/barangay)
- Duration (optional, aggregate only)

## What is NOT Collected
- Child names, birth dates, addresses, or any PII about minors
- User emails, phone numbers, or names
- Session cookies or tokens
- Passwords or hashes
- Private remarks, notes, or messages
- IP addresses linked to individual events (IP can be logged in audit log only for security, not analytics)

## Retention
- Analytics events kept for product improvement only; no long-term user profiling
- No external analytics provider required; events can be written to `audit_logs` or a separate `analytics_events` table if needed
- Server-side only where possible; no client-side tracking scripts
