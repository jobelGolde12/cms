import { redirect } from "next/navigation";
import { FileText, Download } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { reports } from "@/db/schema";
import { desc } from "drizzle-orm";
import { REPORT_TYPES, REPORT_TYPE_LABELS, type ReportType } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TableEmptyState, TableWrap, Td, Th } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";

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
      <PageHeader
        eyebrow="Reports & Exports"
        title="Reports"
        description="Generate and export municipal and barangay reports as PDF or Excel."
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {REPORT_TYPES.map((t) => (
          <Card key={t} className="flex flex-col">
            <CardHeader
              title={REPORT_TYPE_LABELS[t]}
              icon={<FileText aria-hidden="true" className="h-4 w-4 text-action-700" />}
              className="border-b-0"
            />
            <CardBody className="flex flex-1 flex-col justify-between gap-4">
              <p className="text-xs leading-relaxed text-brand-500">
                Live query over verified and pending records in your scope.
              </p>
              <div className="flex flex-wrap gap-2">
                <a href={`/api/reports/${t}?format=pdf`} className={buttonStyles("primary", "sm")}>
                  <Download aria-hidden="true" className="h-3.5 w-3.5" />
                  PDF
                </a>
                <a href={`/api/reports/${t}?format=xlsx`} className={buttonStyles("outline", "sm")}>
                  <Download aria-hidden="true" className="h-3.5 w-3.5" />
                  XLSX
                </a>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Recently generated"
          description="The last ten reports produced across the system."
        />
        <TableWrap minWidth={560}>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Type</Th>
              <Th>Scope</Th>
              <Th>Generated</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {recent.length === 0 ? (
              <TableEmptyState
                colSpan={4}
                icon={<FileText className="h-10 w-10" />}
                title="No reports generated yet"
                description="Pick a report type above and download it as PDF or Excel — generated reports are listed here."
              />
            ) : (
              recent.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-brand-50/70">
                  <Td className="font-medium text-brand-900">{r.name}</Td>
                  <Td className="text-brand-600">
                    {REPORT_TYPE_LABELS[r.reportType as ReportType] ?? r.reportType}
                  </Td>
                  <Td className="capitalize text-brand-600">{r.scope}</Td>
                  <Td className="text-brand-500">{formatDateTime(r.createdAt)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  );
}
