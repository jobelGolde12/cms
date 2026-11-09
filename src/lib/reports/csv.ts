import type { BuiltReport } from "./report-data";
import { SCHOOL_HEADER } from "./report-data";
import { formatDateTime } from "../utils";

/**
 * Escape a single CSV field per RFC 4180: fields containing a comma, quote,
 * CR/LF (or leading/trailing whitespace worth preserving) are wrapped in double
 * quotes and any embedded quote is doubled.
 */
function escapeCsvField(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function toCsvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(escapeCsvField).join(",");
}

/**
 * Build a UTF-8 CSV string from a built report.
 *
 * Mirrors the PDF/XLSX exports: an institutional header block, the applied
 * filters, then the report table (one row per record). A leading BOM keeps
 * Excel from mangling accented names (e.g. "Peña") on open.
 */
export function renderReportCsv(report: BuiltReport): string {
  const lines: string[] = [];

  lines.push(toCsvRow([SCHOOL_HEADER.name]));
  lines.push(toCsvRow([`${SCHOOL_HEADER.address} · ${SCHOOL_HEADER.region}`]));
  lines.push(toCsvRow([report.title]));
  lines.push(
    toCsvRow([`Generated: ${formatDateTime(report.generatedAt)} · By: ${report.generatedBy}`]),
  );
  lines.push(toCsvRow([`Filters: ${report.filters}`]));
  lines.push("");

  lines.push(toCsvRow(report.columns));
  for (const row of report.rows) {
    lines.push(toCsvRow(report.columns.map((col) => row[col])));
  }

  if (report.summary.length > 0) {
    lines.push("");
    lines.push(toCsvRow(["Summary"]));
    for (const item of report.summary) {
      lines.push(toCsvRow([item.label, item.value]));
    }
  }

  // CRLF line endings are the safest across spreadsheet tools.
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
