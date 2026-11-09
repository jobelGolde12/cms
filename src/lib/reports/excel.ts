import ExcelJS from "exceljs";
import type { BuiltReport } from "./report-data";
import { SCHOOL_HEADER } from "./report-data";
import { formatDateTime } from "../utils";

/** Build an .xlsx workbook buffer from a built report. */
export async function renderReportExcel(report: BuiltReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sta. Magdalena National High School Records Management System";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Report");

  // The header block spans the report's full width. Derive it from the actual
  // column count instead of hardcoding column F (breaks on 4-column reports
  // just as much as on 26+ column ones).
  const colCount = Math.max(1, report.columns.length);
  const mergeTitleRow = (row: number, value: string, font: Partial<ExcelJS.Font>) => {
    if (colCount > 1) sheet.mergeCells(row, 1, row, colCount);
    const cell = sheet.getCell(row, 1);
    cell.value = value;
    cell.font = font;
  };

  mergeTitleRow(1, SCHOOL_HEADER.name, { bold: true, size: 14, color: { argb: "FF0F172A" } });
  mergeTitleRow(2, `${SCHOOL_HEADER.address} · ${SCHOOL_HEADER.region}`, {
    size: 9,
    color: { argb: "FF334155" },
  });
  mergeTitleRow(3, report.title, { bold: true, size: 12, color: { argb: "FF0369A1" } });
  mergeTitleRow(
    4,
    `Generated: ${formatDateTime(report.generatedAt)} · By: ${report.generatedBy}`,
    { size: 8, color: { argb: "FF475569" } },
  );
  mergeTitleRow(5, `Filters: ${report.filters}`, { size: 8, color: { argb: "FF475569" } });

  const headerRowNumber = 7;
  const headerRow = sheet.getRow(headerRowNumber);
  report.columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col;
    cell.font = { bold: true, color: { argb: "FF1E293B" }, size: 9 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    cell.border = { bottom: { style: "thin", color: { argb: "FF0F172A" } } };
  });
  headerRow.height = 20;

  report.rows.forEach((row, ri) => {
    const excelRow = sheet.getRow(headerRowNumber + 1 + ri);
    report.columns.forEach((col, ci) => {
      const cell = excelRow.getCell(ci + 1);
      cell.value = row[col] == null ? "—" : row[col];
      cell.font = { size: 9, color: { argb: "FF0F172A" } };
    });
  });

  // Numeric column index avoids the A–Z ceiling of String.fromCharCode.
  report.columns.forEach((col, i) => {
    sheet.getColumn(i + 1).width = Math.max(10, Math.min(28, col.length + 6));
  });

  sheet.autoFilter = {
    from: { row: headerRowNumber, column: 1 },
    to: { row: Math.max(headerRowNumber, headerRowNumber + report.rows.length), column: report.columns.length },
  };

  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.mergeCells("A1", "B1");
  summarySheet.getCell("A1").value = "Report Summary";
  summarySheet.getCell("A1").font = { bold: true, size: 12 };
  report.summary.forEach((s, i) => {
    summarySheet.getCell(`A${i + 3}`).value = s.label;
    summarySheet.getCell(`B${i + 3}`).value = s.value;
    summarySheet.getCell(`B${i + 3}`).numFmt = "#,##0";
  });
  summarySheet.getColumn("A").width = 28;
  summarySheet.getColumn("B").width = 14;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}