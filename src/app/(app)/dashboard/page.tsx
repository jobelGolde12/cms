import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function AppDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-900 tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-brand-500">Child mapping overview for Sta. Magdalena, Sorsogon.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Children" value="247" />
        <MetricCard label="Verified" value="198" />
        <MetricCard label="Pending Validation" value="32" />
        <MetricCard label="Out-of-School" value="14" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-brand-200 bg-white shadow-sm p-5">
          <h3 className="text-sm font-bold text-brand-900 mb-4">Children by Barangay</h3>
          <div className="h-56 flex items-center justify-center text-brand-400 text-sm">Chart area</div>
        </div>
        <div className="rounded-xl border border-brand-200 bg-white shadow-sm p-5">
          <h3 className="text-sm font-bold text-brand-900 mb-4">Validation Status</h3>
          <div className="h-56 flex items-center justify-center text-brand-400 text-sm">Chart area</div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-brand-200 bg-white shadow-sm p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-brand-500">{label}</div>
      <div className="mt-2 text-3xl font-extrabold text-brand-900 tracking-tight numeric">{value}</div>
    </div>
  );
}
