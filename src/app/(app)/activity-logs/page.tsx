import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listAuditLogs } from "@/lib/queries";
import { hasPermission } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

export default async function ActivityLogsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, "audit_logs.view")) redirect("/dashboard");

  const rows = await listAuditLogs(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-brand-900 tracking-tight">Activity Logs</h1>
        <p className="mt-1 text-sm text-brand-500">
          Append-only audit trail. Entries cannot be edited or deleted through the application.
        </p>
      </div>
      <div className="rounded-xl border border-brand-200 bg-white shadow-sm overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-brand-100/60 text-xs font-semibold uppercase text-brand-600 tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Entity</th>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-brand-500">No audit entries.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-brand-50">
                  <td className="px-4 py-3 text-xs font-mono text-brand-700">{r.action}</td>
                  <td className="px-4 py-3 text-xs text-brand-700">
                    {r.entityType}
                    {r.entityId ? <span className="text-brand-400"> · {r.entityId.slice(0, 8)}…</span> : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-brand-600">
                    {r.userFirst ? `${r.userFirst} ${r.userLast}` : "system"}
                  </td>
                  <td className="px-4 py-3 text-xs text-brand-500">{formatDateTime(r.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
