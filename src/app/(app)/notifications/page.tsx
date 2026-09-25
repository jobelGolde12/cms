import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { recentNotifications } from "@/lib/queries";
import { markAllNotificationsRead } from "@/actions/notifications";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const notifications = await recentNotifications(user.id, 30);
  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-900 tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-brand-500">{unread} unread</p>
        </div>
        {unread > 0 ? (
          <form action={markAllNotificationsRead}>
            <Button type="submit" variant="outline" size="sm">Mark all read</Button>
          </form>
        ) : null}
      </div>
      <div className="rounded-xl border border-brand-200 bg-white shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="h-5 w-5 text-action-700" />
          <h2 className="text-base font-bold text-brand-900">Recent</h2>
        </div>
        {notifications.length === 0 ? (
          <p className="text-sm text-brand-500">No notifications.</p>
        ) : (
          <ul className="divide-y divide-brand-100">
            {notifications.map((n) => (
              <li key={n.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  {n.link ? (
                    <a href={n.link} className="text-sm font-medium text-brand-900 hover:text-action-700">{n.title}</a>
                  ) : (
                    <span className="text-sm font-medium text-brand-900">{n.title}</span>
                  )}
                  {!n.isRead && <span className="text-[10px] font-bold uppercase tracking-wide text-action-700">New</span>}
                </div>
                <p className="text-xs text-brand-500 mt-1">{n.message ?? "—"}</p>
                <p className="text-[10px] text-brand-400 mt-0.5">{formatDateTime(n.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
