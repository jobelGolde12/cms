import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { validationQueue } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";

export default async function ValidationPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const queue = await validationQueue(user);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-brand-900 tracking-tight">Validation Queue</h1>
      <div className="rounded-xl border border-brand-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-100/60 text-xs font-semibold uppercase text-brand-600 tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Child Code</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Barangay</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {queue.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-brand-500">No records pending validation.</td></tr>
            ) : queue.map((item) => (
              <tr key={item.id} className="hover:bg-brand-50">
                <td className="px-4 py-3 font-mono text-xs text-brand-700">{item.childCode}</td>
                <td className="px-4 py-3 font-medium text-brand-900">{item.firstName} {item.lastName}</td>
                <td className="px-4 py-3 text-brand-600">{item.barangayName}</td>
                <td className="px-4 py-3"><Badge>Pending</Badge></td>
                <td className="px-4 py-3 text-xs text-brand-500">{item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-PH") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
