import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { monitoringOverview } from "@/lib/queries";
import { MONITORING_TYPES, MONITORING_TYPE_LABELS, type MonitoringType } from "@/lib/constants";

const HREFS: Record<MonitoringType, string> = {
  education: "/monitoring/education",
  out_of_school_youth: "/monitoring/osy",
  eccd: "/monitoring/eccd",
  disability: "/monitoring/disability",
  general: "/monitoring/general",
};

export default async function MonitoringPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const stats = await monitoringOverview(user);

  const counts: Record<MonitoringType, number> = {
    education: stats.education,
    out_of_school_youth: stats.osy,
    eccd: stats.eccd,
    disability: stats.disability,
    general: stats.general,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-900 tracking-tight">Barangay Monitoring</h1>
          <p className="mt-1 text-sm text-brand-500">{stats.openRecords} open monitoring record(s) in your scope.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MONITORING_TYPES.map((t) => (
          <Link
            key={t}
            href={HREFS[t]}
            className="rounded-xl border border-brand-200 bg-white shadow-sm p-5 hover:border-brand-300 transition-colors block"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-brand-500">
              {MONITORING_TYPE_LABELS[t]}
            </div>
            <div className="mt-2 text-3xl font-extrabold text-brand-900 tracking-tight numeric">
              {counts[t]}
            </div>
            <div className="mt-3 text-xs text-action-700 font-medium">View records →</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
