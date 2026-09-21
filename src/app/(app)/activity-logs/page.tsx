import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { Badge } from "@/components/ui/badge";

export default async function ActivityLogsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "lgu") redirect("/dashboard");

  const rows = await db.select({
    id: auditLogs.id,
    action: auditLogs.action,
    entity: auditLogs.entity,
    result: auditLogs.result,
    userRole: auditLogs.userRole,
    createdAt: auditLogs.createdAt,
    metadata: auditLogs.metadata,
  }).from(auditLogs).orderBy(auditLogs.createdAt).limit(100);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-brand-900 tracking-tight">Activity Logs</h1>
      <div className="rounded-xl border border-brand-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-100/60 text-xs font-semibold uppercase text-brand-600 tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Entity</th>
              <th className="px-4 py-3 text-left">Result</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-brand-500">No audit entries.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="hover:bg-brand-50">
                <td className="px-4 py-3 text-xs font-mono text-brand-700">{r.action}</td>
                <td className="px-4 py-3 text-brand-700">{r.entity}</td>
                <td className="px-4 py-3"><Badge tone={r.result === "success" ? "verified" : r.result === "denied" ? "pending" : "neutral"}>{r.result}</Badge></td>
                <td className="px-4 py-3 text-xs text-brand-600">{r.userRole || "—"}</td>
                <td className="px-4 py-3 text-xs text-brand-500">{r.createdAt ? new Date(r.createdAt).toLocaleString("en-PH") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
