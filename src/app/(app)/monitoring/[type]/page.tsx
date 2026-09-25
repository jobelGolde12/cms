import { redirect } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { monitoringList } from "@/lib/queries";
import {
  MONITORING_TYPES,
  MONITORING_TYPE_LABELS,
  MONITORING_STATUSES,
  type MonitoringType,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { ageFromBirthDate, formatDateTime } from "@/lib/utils";

const ALIASES: Record<string, MonitoringType> = {
  osy: "out_of_school_youth",
  education: "education",
  eccd: "eccd",
  disability: "disability",
  general: "general",
};

export default async function MonitoringTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { type } = await params;

  const monitoringType = ALIASES[type];
  if (!monitoringType || !MONITORING_TYPES.includes(monitoringType)) notFound();

  const list = await monitoringList(user, monitoringType);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/monitoring" className="text-brand-500 hover:text-brand-800"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-xl font-extrabold text-brand-900">{MONITORING_TYPE_LABELS[monitoringType]}</h1>
      </div>
      <div className="rounded-xl border border-brand-200 bg-white shadow-sm overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-brand-100/60 text-xs font-semibold uppercase text-brand-600 tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Barangay</th>
              <th className="px-4 py-3 text-left">Observed</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {list.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-brand-500">No monitoring records found.</td></tr>
            ) : (
              list.map((item) => (
                <tr key={item.id} className="hover:bg-brand-50">
                  <td className="px-4 py-3 font-mono text-xs text-brand-700">
                    <Link href={`/children/${item.childId}`}>{item.childCode}</Link>
                  </td>
                  <td className="px-4 py-3">{item.lastName}, {item.firstName}</td>
                  <td className="px-4 py-3 text-brand-500 text-xs">{item.barangayName}</td>
                  <td className="px-4 py-3 text-xs text-brand-600">{formatDateTime(item.observedAt)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={item.status === "open" ? "pending" : item.status === "in_progress" ? "info" : "verified"}>
                      {item.status.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-brand-500 max-w-56 truncate">{item.remarks ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
