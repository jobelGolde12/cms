import { redirect } from "next/navigation";
import { FileText, Download } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { reports } from "@/db/schema";
import { desc } from "drizzle-orm";
import { REPORT_TYPES, REPORT_TYPE_LABELS, type ReportType } from "@/lib/constants";
import { hasPermission } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const recent = await db
    .select({
      id: reports.id,
      name: reports.name,
      reportType: reports.reportType,
      scope: reports.scope,
      createdAt: reports.createdAt,
    })
    .from(reports)
    .orderBy(desc(reports.createdAt))
    .limit(10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-brand-900 tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-brand-500">Generate and export municipal and barangay reports.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {REPORT_TYPES.map((t) => (
          <div key={t} className="rounded-xl border border-brand-200 bg-white shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <FileText className="h-5 w-5 text-action-700" />
              <h3 className="text-sm font-bold text-brand-900">{REPORT_TYPE_LABELS[t]}</h3>
            </div>
            <p className="text-xs text-brand-500 mb-4">
              Live query over verified and pending records in your scope.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={`/api/reports/${t}?format=pdf`}
                className="inline-flex items-center gap-2 rounded-lg bg-action-700 px-3 py-2 text-xs font-medium text-white hover:bg-action-800"
              >
                <Download className="h-3.5 w-3.5" /> PDF
              </a>
              <a
                href={`/api/reports/${t}?format=xlsx`}
                className="inline-flex items-center gap-2 rounded-lg border border-brand-300 px-3 py-2 text-xs font-medium text-brand-700 hover:bg-brand-100"
              >
                <Download className="h-3.5 w-3.5" /> XLSX
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-brand-200 bg-white shadow-sm overflow-x-auto">
        <div className="px-5 py-4 border-b border-brand-100">
          <h2 className="text-sm font-bold text-brand-900">Recently generated</h2>
        </div>
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-brand-100/60 text-xs font-semibold uppercase text-brand-600 tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Scope</th>
              <th className="px-4 py-3 text-left">Generated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {recent.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-brand-500">No reports generated yet.</td></tr>
            ) : (
              recent.map((r) => (
                <tr key={r.id} className="hover:bg-brand-50">
                  <td className="px-4 py-3 font-medium text-brand-900">{r.name}</td>
                  <td className="px-4 py-3 text-xs text-brand-600">{REPORT_TYPE_LABELS[r.reportType as ReportType] ?? r.reportType}</td>
                  <td className="px-4 py-3 text-xs capitalize text-brand-600">{r.scope}</td>
                  <td className="px-4 py-3 text-xs text-brand-500">{formatDateTime(r.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
