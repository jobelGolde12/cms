import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { reportExports, reports } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { buildReport } from "@/lib/reports/report-data";
import { renderReportPdf } from "@/lib/reports/pdf";
import { renderReportExcel } from "@/lib/reports/excel";
import { hasPermission } from "@/lib/permissions";
import { REPORT_TYPES, type ReportType } from "@/lib/constants";

/**
 * Report export route handler. Server-side only:
 * - re-checks authentication and `reports.export`
 * - scopes all rows via childScope
 * - logs GENERATE_REPORT / EXPORT_REPORT
 * - records export metadata (file reference only, never the file bytes)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(user.role, "reports.export")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { type } = await params;
  if (!REPORT_TYPES.includes(type as ReportType)) {
    return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
  }
  const reportType = type as ReportType;

  const format = (request.nextUrl.searchParams.get("format") ?? "pdf").toLowerCase();
  if (format !== "pdf" && format !== "xlsx" && format !== "csv") {
    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  }

  const barangayId = request.nextUrl.searchParams.get("barangay") ?? undefined;

  const built = await buildReport(user, reportType, { barangayId });
  const stamp = new Date().toISOString().slice(0, 10);
  const baseName = `${reportType}-${stamp}`;

  // Record the report metadata row.
  const [reportRow] = await db
    .insert(reports)
    .values({
      id: crypto.randomUUID(),
      name: `${built.title} (${stamp})`,
      reportType,
      generatedBy: user.id,
      scope: built.scope,
      filtersJson: JSON.stringify({ barangayId: barangayId ?? null }),
    })
    .returning();

  await logAudit({
    userId: user.id,
    action: "GENERATE_REPORT",
    entityType: "report",
    entityId: reportRow.id,
    newValues: { reportType, scope: built.scope },
  });

  try {
    if (format === "pdf") {
      const bytes = await renderReportPdf(built);
      const fileReference = `exports/${baseName}.pdf`;
      await db.insert(reportExports).values({
        id: crypto.randomUUID(),
        reportId: reportRow.id,
        format: "PDF",
        fileReference,
        generatedBy: user.id,
      });
      await logAudit({
        userId: user.id,
        action: "EXPORT_REPORT",
        entityType: "report_export",
        entityId: reportRow.id,
        newValues: { format: "PDF" },
      });
      return new NextResponse(bytes as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${baseName}.pdf"`,
        },
      });
    }

    // XLSX
    const buffer = await renderReportExcel(built);
    const fileReference = `exports/${baseName}.xlsx`;
    await db.insert(reportExports).values({
      id: crypto.randomUUID(),
      reportId: reportRow.id,
      format: "XLSX",
      fileReference,
      generatedBy: user.id,
    });
    await logAudit({
      userId: user.id,
      action: "EXPORT_REPORT",
      entityType: "report_export",
      entityId: reportRow.id,
      newValues: { format: "XLSX" },
    });
    return new NextResponse(new Uint8Array(buffer) as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${baseName}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("[reports] export failed", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
