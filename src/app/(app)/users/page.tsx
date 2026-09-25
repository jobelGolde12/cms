import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listUsersWithRoles } from "@/lib/queries";
import { hasPermission } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, "users.view")) redirect("/dashboard");

  const rows = await listUsersWithRoles();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-900 tracking-tight">User Management</h1>
          <p className="mt-1 text-sm text-brand-500">
            Barangay User, LGU User and System Administrator accounts. There is no school login — schools are reference data only.
          </p>
        </div>
        {hasPermission(user.role, "users.create") ? (
          <span className="text-xs text-brand-400">Use “Create User” in the admin console (server action available).</span>
        ) : null}
      </div>
      <div className="rounded-xl border border-brand-200 bg-white shadow-sm overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-brand-100/60 text-xs font-semibold uppercase text-brand-600 tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Barangay</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Last login</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-brand-50">
                <td className="px-4 py-3 font-medium text-brand-900">{r.firstName} {r.lastName}</td>
                <td className="px-4 py-3 text-brand-600">{r.email}</td>
                <td className="px-4 py-3 text-xs text-brand-700">{r.roleLabel}</td>
                <td className="px-4 py-3 text-xs text-brand-500">{r.barangayName ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge tone={r.isActive ? "verified" : "error"}>{r.isActive ? "Active" : "Disabled"}</Badge>
                </td>
                <td className="px-4 py-3 text-xs text-brand-500">{r.lastLoginAt ? formatDateTime(r.lastLoginAt) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
