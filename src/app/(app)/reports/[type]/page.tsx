import { redirect } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { buildReport } from "@/lib/reports/report-data";
import { REPORT_TYPES, REPORT_TYPE_LABELS, type ReportType } from "@/lib/constants";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { TableWrap, Th, Td } from "@/components/ui/table";
import { buttonStyles } from "@/components/ui/button";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, "reports.view")) redirect("/dashboard");

  const { type } = await params;
  if (!REPORT_TYPES.includes(type as ReportType)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Report Not Found" eyebrow="Error" />
        <Card>
          <CardBody>
            <p className="text-sm text-[#64748B]">
              Unknown report type: {type}.{" "}
              <Link href="/reports" className="text-action-700 hover:underline">
                Back to Reports
              </Link>
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const reportType = type as ReportType;
  const canExport = hasPermission(user.role, "reports.export");

  let built;
  try {
    built = await buildReport(user, reportType, {});
  } catch {
    return (
      <div className="space-y-6">
        <PageHeader title={REPORT_TYPE_LABELS[reportType]} eyebrow="Reports & Exports" />
        <Card>
          <CardBody className="space-y-4">
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              We could not load this report. Please try again or contact support.
            </div>
            <Link href="/reports" className={buttonStyles("outline", "sm")}>
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Reports
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/reports" className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-brand-900 mb-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Reports
          </Link>
          <PageHeader
            eyebrow="Reports & Exports"
            title={REPORT_TYPE_LABELS[reportType]}
            description={built.filters || `Live query over verified records in your scope.`}
          />
        </div>
        <div className="flex flex-wrap gap-2 shrink-0 pt-1">
          {canExport ? (
            <>
              <a href={`/api/reports/${reportType}?format=pdf`} className={buttonStyles("primary", "sm")}>
                <FileText aria-hidden="true" className="h-3.5 w-3.5" /> PDF
              </a>
              <a href={`/api/reports/${reportType}?format=xlsx`} className={buttonStyles("outline", "sm")}>
                <FileText aria-hidden="true" className="h-3.5 w-3.5" /> XLSX
              </a>
            </>
          ) : (
            <span className="text-xs italic text-[#64748B]">Export requires Records / Registrar role</span>
          )}
        </div>
      </div>

      {!canExport && (
        <p className="border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-900 rounded-md">
          You can view this section, but file exports are restricted to Admin, School Admin, Records and Registrar accounts.
        </p>
      )}

      <Card>
        <CardHeader
          title={REPORT_TYPE_LABELS[reportType]}
          description={`${built.scope} · ${built.columns.length} columns · ${built.rows.length} rows`}
        />
        <CardBody className="p-0">
          {built.rows.length === 0 ? (
            <div className="px-4 py-10">
              <div className="text-center">
                <FileText className="mx-auto h-10 w-10 text-brand-200 mb-3" />
                <h3 className="text-sm font-semibold text-brand-900">No records found</h3>
                <p className="text-xs text-[#64748B] mt-1">No data matches the current filters or scope for this report.</p>
              </div>
            </div>
          ) : (
            <TableWrap minWidth={720} className="rounded-b-lg">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr>
                    {built.columns.map((col) => (
                      <Th key={String(col)}>{col}</Th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-100">
                  {built.rows.map((row, idx) => (
                    <tr key={idx} className="transition-colors hover:bg-brand-50/70">
                      {built.columns.map((col) => (
                        <Td key={String(col)}>
                          {row[col] !== null && row[col] !== undefined ? String(row[col]) : "—"}
                        </Td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </CardBody>
      </Card>

      {built.summary && built.summary.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {built.summary.map((item) => (
            <Card key={String(item.label)} className="p-4">
              <p className="text-xs text-[#64748B]">{item.label}</p>
              <p className="text-xl font-semibold text-brand-900 mt-1">{item.value}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
