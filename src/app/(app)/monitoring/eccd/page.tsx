import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { monitoringList } from "@/lib/queries";
import { MONITORING_LABELS } from "@/lib/constants";

export default async function ECCDPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const list = await monitoringList(user, "eccd");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/monitoring" className="text-brand-500 hover:text-brand-800"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-xl font-extrabold text-brand-900">{MONITORING_LABELS.eccd}</h1>
      </div>
      <div className="rounded-xl border border-brand-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-100/60 text-xs font-semibold uppercase text-brand-600 tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Barangay</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {list.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-brand-500">No ECCD non-participation records found.</td></tr>
            ) : list.map((item) => (
              <tr key={item.id} className="hover:bg-brand-50">
                <td className="px-4 py-3 font-mono text-xs text-brand-700">{item.childCode}</td>
                <td className="px-4 py-3">{item.firstName} {item.lastName}</td>
                <td className="px-4 py-3 text-brand-500 text-xs">{item.barangayName}</td>
                <td className="px-4 py-3 text-xs text-brand-600">{item.followupStatus ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
