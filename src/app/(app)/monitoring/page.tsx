import { redirect } from "next/navigation";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { monitoringOverview } from "@/lib/queries";
import { MONITORING_LABELS } from "@/lib/constants";

export default async function MonitoringPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const stats = await monitoringOverview(user);

  const cards = [
    { label: MONITORING_LABELS.osy, value: stats.osy },
    { label: MONITORING_LABELS.eccd, value: stats.eccd },
    { label: MONITORING_LABELS.disability, value: stats.disability },
    { label: MONITORING_LABELS.intervention, value: stats.intervention },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-brand-900 tracking-tight">Barangay Monitoring</h1>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-brand-200 bg-white shadow-sm p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-brand-500">{c.label}</div>
            <div className="mt-2 text-3xl font-extrabold text-brand-900 tracking-tight numeric">{c.value}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Link href="/monitoring/osy" className="rounded-xl border border-brand-200 bg-white shadow-sm p-6 hover:border-brand-300 transition-colors block">
          <h3 className="text-base font-bold text-brand-900">Out-of-School Youth</h3>
          <p className="mt-2 text-sm text-brand-500">Monitor youth not currently enrolled.</p>
        </Link>
        <Link href="/monitoring/eccd" className="rounded-xl border border-brand-200 bg-white shadow-sm p-6 hover:border-brand-300 transition-colors block">
          <h3 className="text-base font-bold text-brand-900">ECCD Non-Participation</h3>
          <p className="mt-2 text-sm text-brand-500">Identify children not in ECCD programs.</p>
        </Link>
        <Link href="/monitoring/disability" className="rounded-xl border border-brand-200 bg-white shadow-sm p-6 hover:border-brand-300 transition-colors block">
          <h3 className="text-base font-bold text-brand-900">Disability Support</h3>
          <p className="mt-2 text-sm text-brand-500">Track disability status and referrals.</p>
        </Link>
        <Link href="/monitoring/interventions" className="rounded-xl border border-brand-200 bg-white shadow-sm p-6 hover:border-brand-300 transition-colors block">
          <h3 className="text-base font-bold text-brand-900">Interventions</h3>
          <p className="mt-2 text-sm text-brand-500">Monitor educational interventions.</p>
        </Link>
      </div>
    </div>
  );
}
