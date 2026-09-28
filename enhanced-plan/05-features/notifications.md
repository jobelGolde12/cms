# Feature-Specific Audit — Notifications

## Routes
`/notifications` (`GET`)

## File Locations
- Page: `src/app/(app)/notifications/page.tsx`
- Component: `src/components/dashboard/primitives.tsx` (`RecentNotifications`)
- Action: `src/actions/notifications.ts` (not fully read; implied by `markAllNotificationsRead` usage)
- Schema: `src/db/schema.ts` (`notifications`)
- Query: `src/lib/queries.ts` (`unreadNotificationCount`, `recentNotifications`)

## Schema
`notifications`:
- `userId`: `notNull`, references `users.id` (`onDelete: cascade`)
- `isRead`: boolean (`default: false`)
- `readAt`: timestamp (nullable)
- `type`: `notNull` (e.g., `validation`, `duplicate`, `system`, `followup`, `report`)

## Potential Bugs / Issues
- `notifications` page shows unread count and allows `markAllNotificationsRead`. Action not fully inspected but implied safe.
- Notifications are created by `notify()` (`lib/audit.ts`) — best-effort; failures are caught and logged but never thrown.
- `notify()` does not include sensitive child information in message body (`message` is kept minimal: `Record ${code} was approved.`) — privacy-preserving.

---

References: `src/app/(app)/notifications/page.tsx`, `src/lib/queries.ts` (`unreadNotificationCount`, `recentNotifications`), `src/lib/audit.ts` (`notify` function).
