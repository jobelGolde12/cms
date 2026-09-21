import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");

  const rows = await db.select({
    id: users.id,
    email: users.email,
    firstName: users.firstName,
    lastName: users.lastName,
    role: users.role,
    isActive: users.isActive,
  }).from(users).orderBy(users.createdAt);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-brand-900 tracking-tight">User Management</h1>
        <Link href="/users/new" className="inline-flex items-center gap-1.5 rounded-lg bg-action-700 px-3 py-2 text-xs font-medium text-white hover:bg-action-800 shadow-sm"><Plus className="h-3.5 w-3.5" /> Create User</Link>
      </div>
      <div className="rounded-xl border border-brand-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-100/60 text-xs font-semibold uppercase text-brand-600 tracking-wide">
            <tr><th className="px-4 py-3 text-left">Name</th><th className="px-4 py-3 text-left">Email</th><th className="px-4 py-3 text-left">Role</th><th className="px-4 py-3 text-left">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-brand-50">
                <td className="px-4 py-3 font-medium text-brand-900">{r.firstName} {r.lastName}</td>
                <td className="px-4 py-3 text-brand-600">{r.email}</td>
                <td className="px-4 py-3 text-xs uppercase text-brand-500">{r.role}</td>
                <td className="px-4 py-3 text-xs text-brand-600">{r.isActive ? "Active" : "Inactive"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
