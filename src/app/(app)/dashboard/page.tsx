import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { dashboardStats, dashboardCharts } from "@/lib/queries";

export default async function AppDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [stats, charts] = await Promise.all([
    dashboardStats(user),
    dashboardCharts(user),
  ]);

  const maxBarangay = Math.max(1, ...charts.byBarangay.map((b) => b.value));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-900 tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-brand-500">Child mapping overview for Sta. Magdalena, Sorsogon.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Children" value={stats.total} />
        <MetricCard label="Verified" value={stats.verified} />
        <MetricCard label="Pending Validation" value={stats.pendingValidation} />
        <MetricCard label="Out-of-School" value={stats.osy} />
        <MetricCard label="Enrolled" value={stats.enrolled} />
        <MetricCard label="ECCD Non-Participation" value={stats.eccdNonParticipation} />
        <MetricCard label="With Disability" value={stats.withDisability} />
        <MetricCard label="Open Interventions" value={stats.openInterventions} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-brand-200 bg-white shadow-sm p-5">
          <h3 className="text-sm font-bold text-brand-900 mb-4">Children by Barangay</h3>
          {charts.byBarangay.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-brand-400 text-sm">No data yet.</div>
          ) : (
            <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {charts.byBarangay.map((b) => (
                <li key={b.name} className="flex items-center gap-3 text-xs">
                  <span className="w-44 truncate text-brand-600">{b.name}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-brand-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-action-600"
                      style={{ width: `${Math.round((b.value / maxBarangay) * 100)}%` }}
                    />
                  </div>
                  <span className="numeric font-semibold text-brand-900 w-8 text-right">{b.value}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-brand-200 bg-white shadow-sm p-5">
          <h3 className="text-sm font-bold text-brand-900 mb-4">Record Status</h3>
          {charts.byRecordStatus.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-brand-400 text-sm">No data yet.</div>
          ) : (
            <ul className="space-y-3">
              {charts.byRecordStatus.map((s) => (
                <li key={s.name} className="flex items-center justify-between text-sm border-b border-brand-100 pb-2 last:border-0">
                  <span className="text-brand-600">{s.name}</span>
                  <span className="numeric font-bold text-brand-900">{s.value}</span>
                </li>
              ))}
            </ul>
          )}
          <h3 className="text-sm font-bold text-brand-900 mt-6 mb-4">Education Status</h3>
          <ul className="space-y-2">
            {charts.byEducation.map((e) => (
              <li key={e.name} className="flex items-center justify-between text-sm">
                <span className="text-brand-600">{e.name}</span>
                <span className="numeric font-semibold text-brand-900">{e.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-brand-200 bg-white shadow-sm p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-brand-500">{label}</div>
      <div className="mt-2 text-3xl font-extrabold text-brand-900 tracking-tight numeric">{value}</div>
    </div>
  );
}
