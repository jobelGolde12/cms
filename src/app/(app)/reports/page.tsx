import { redirect } from "next/navigation";
import { FileText, Download } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-brand-900 tracking-tight">Reports</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { title: "School Report", desc: "Per-school consolidated data" },
          { title: "Barangay Report", desc: "Per-barangay consolidated data" },
          { title: "Municipal Consolidated", desc: "Full municipality summary" },
          { title: "Child Mapping Summary", desc: "Overview and statistics" },
          { title: "Educational Planning", desc: "Planning and projections" },
          { title: "Monitoring Reports", desc: "OSY, ECCD, Disability" },
        ].map((r) => (
          <div key={r.title} className="rounded-xl border border-brand-200 bg-white shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <FileText className="h-5 w-5 text-action-700" />
              <h3 className="text-sm font-bold text-brand-900">{r.title}</h3>
            </div>
            <p className="text-xs text-brand-500 mb-4">{r.desc}</p>
            <button className="inline-flex items-center gap-2 rounded-lg bg-action-700 px-3 py-2 text-xs font-medium text-white hover:bg-action-800">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
