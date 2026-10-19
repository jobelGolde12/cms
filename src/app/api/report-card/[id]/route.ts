import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { canAccessStudent } from "@/lib/scope";
import { getReportCardData } from "@/lib/report-card";
import { renderReportCardPdf } from "@/lib/reports/report-card-pdf";
import { logAudit } from "@/lib/audit";

/**
 * Report Card download route (Registrar domain).
 *
 * Server-side only:
 * - re-checks authentication and `documents.print` (never trusts URL secrecy)
 * - enforces row-level access via canAccessStudent (adviser scope for teachers)
 * - logs a PRINT_REPORT_CARD audit entry (no student data in the log payload)
 * - sets Cache-Control: private, no-store so the sensitive document is
 *   never cached by shared proxies/CDNs
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(user.role, "documents.print")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  // Row-level check identical to the preview page — direct URL manipulation of
  // the student id cannot bypass the adviser/school scope.
  if (!(await canAccessStudent(user, { studentId: id }))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await getReportCardData(id);
  if (!data) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  try {
    const bytes = await renderReportCardPdf(data);
    await logAudit({
      userId: user.id,
      action: "PRINT_REPORT_CARD",
      entityType: "report_card",
      entityId: id,
      newValues: { schoolYear: data.schoolYear },
    });
    return new NextResponse(bytes as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report-card-${data.student.studentNumber}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[report-card] PDF generation failed", error);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
