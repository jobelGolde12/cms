import { describe, expect, it } from "vitest";
import { renderReportCsv } from "@/lib/reports/csv";
import type { BuiltReport } from "@/lib/reports/report-data";

function makeReport(overrides: Partial<BuiltReport> = {}): BuiltReport {
  return {
    type: "student_master_list",
    title: "Student Master List",
    filters: "School-wide (2026-2027)",
    generatedAt: new Date("2026-11-09T00:00:00.000Z"),
    generatedBy: "Ada Admin (admin)",
    scope: "school",
    columns: ["Student No.", "Full Name", "Note"],
    rows: [
      { "Student No.": "SM-2026-000001", "Full Name": "Peña, Maria", Note: "ok" },
      { "Student No.": "SM-2026-000002", "Full Name": "Dela Cruz, Ana", Note: null },
    ],
    summary: [{ label: "Total students", value: 2 }],
    ...overrides,
  };
}

describe("renderReportCsv", () => {
  it("emits a UTF-8 BOM so Excel preserves accented names", () => {
    const csv = renderReportCsv(makeReport());
    expect(csv.startsWith("\uFEFF")).toBe(true);
  });

  it("includes the report title, column header and data rows", () => {
    const csv = renderReportCsv(makeReport());
    expect(csv).toContain("Student Master List");
    expect(csv).toContain("Student No.,Full Name,Note");
    expect(csv).toContain("Peña, Maria");
  });

  it("quotes fields containing commas, quotes or newlines (RFC 4180)", () => {
    const csv = renderReportCsv(
      makeReport({
        columns: ["Name", "Remarks"],
        rows: [{ Name: 'Doe, "Jane"', Remarks: "line1\nline2" }],
        summary: [],
      }),
    );
    expect(csv).toContain('"Doe, ""Jane"""');
    expect(csv).toContain('"line1\nline2"');
  });

  it("renders null/undefined cells as empty fields", () => {
    const csv = renderReportCsv(makeReport());
    // Second data row: note is null -> trailing empty field (name is quoted
    // because it contains a comma).
    expect(csv).toContain('SM-2026-000002,"Dela Cruz, Ana",\r\n');
  });

  it("appends a summary block when present", () => {
    const csv = renderReportCsv(makeReport());
    expect(csv).toContain("Summary");
    expect(csv).toContain("Total students,2");
  });
});
