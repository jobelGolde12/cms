import ExcelJS from "exceljs";
import type { BuiltReport } from "./report-data";
import { MUNI_HEADER } from "./report-data";
import { formatDateTime } from "../utils";

/** Build an .xlsx workbook buffer from a built report. */
export async function renderReportExcel(report: BuiltReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Municipal Child Mapping System";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Report");

  sheet.mergeCells("A1", "F1");
  sheet.getCell("A1").value = MUNI_HEADER.name;
  sheet.getCell("A1").font = { bold: true, size: 14, color: { argb: "FF0F172A" } };

  sheet.mergeCells("A2", "F2");
  sheet.getCell("A2").value = `${MUNI_HEADER.province} · ${MUNI_HEADER.region}`;
  sheet.getCell("A2").font = { size: 9, color: { argb: "FF334155" } };

  sheet.mergeCells("A3", "F3");
  sheet.getCell("A3").value = report.title;
  sheet.getCell("A3").font = { bold: true, size: 12, color: { argb: "FF0369A1" } };

  sheet.mergeCells("A4", "F4");
  sheet.getCell("A4").value = `Generated: ${formatDateTime(report.generatedAt)} · By: ${report.generatedBy}`;
  sheet.getCell("A4").font = { size: 8, color: { argb: "FF475569" } };

  sheet.mergeCells("A5", "F5");
  sheet.getCell("A5").value = `Filters: ${report.filters}`;
  sheet.getCell("A5").font = { size: 8, color: { argb: "FF475569" } };

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

  report.columns.forEach((col, i) => {
    const letter = String.fromCharCode(65 + i);
    sheet.getColumn(letter).width = Math.max(10, Math.min(28, col.length + 6));
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