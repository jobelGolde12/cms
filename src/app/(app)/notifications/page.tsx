import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { recentNotifications } from "@/lib/queries";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const notifications = await recentNotifications(user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-brand-900 tracking-tight">Notifications</h1>
      <div className="rounded-xl border border-brand-200 bg-white shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2"><Bell className="h-5 w-5 text-action-700" /><h2 className="text-base font-bold text-brand-900">Recent</h2></div>
        {notifications.length === 0 ? <p className="text-sm text-brand-500">No notifications.</p> : (
          <ul className="divide-y divide-brand-100">
            {notifications.map((n) => (
              <li key={n.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-brand-900">{n.title}</div>
                  {!n.isRead && <span className="text-[10px] font-bold uppercase tracking-wide text-action-700">New</span>}
                </div>
                <p className="text-xs text-brand-500 mt-1">{n.body ?? "—"}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
