import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { recentNotifications } from "@/lib/queries";
import { markAllNotificationsRead } from "@/actions/notifications";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const notifications = await recentNotifications(user.id, 30);
  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Your Alerts"
        title="Notifications"
        description={
          unread > 0
            ? `You have ${unread} unread notification${unread === 1 ? "" : "s"}.`
            : "You're all caught up."
        }
        actions={
          unread > 0 ? (
            <form action={markAllNotificationsRead}>
              <Button type="submit" variant="outline" size="sm">
                Mark all read
              </Button>
            </form>
          ) : null
        }
      />

      <Card>
        {notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-10 w-10" />}
            title="No notifications"
            description="Alerts about validations, duplicate conflicts, and record updates addressed to you will appear here."
          />
        ) : (
          <ul className="divide-y divide-brand-100">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "px-4 py-3 transition-colors sm:px-5",
                  !n.isRead && "bg-action-50/60",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        n.isRead ? "bg-brand-200" : "bg-action-600",
                      )}
                    />
                    {n.link ? (
                      <a
                        href={n.link}
                        className={cn(
                          "truncate text-sm hover:text-action-700",
                          n.isRead ? "font-medium text-brand-700" : "font-semibold text-brand-900",
                        )}
                      >
                        {n.title}
                      </a>
                    ) : (
                      <span
                        className={cn(
                          "truncate text-sm",
                          n.isRead ? "font-medium text-brand-700" : "font-semibold text-brand-900",
                        )}
                      >
                        {n.title}
                      </span>
                    )}
                  </span>
                  {!n.isRead && (
                    <span className="shrink-0 rounded-full bg-action-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-action-800">
                      New
                    </span>
                  )}
                </div>
                <p className="mt-1 pl-3.5 text-xs text-brand-500">{n.message ?? "—"}</p>
                <p className="mt-0.5 pl-3.5 text-[11px] text-brand-400">{formatDateTime(n.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
