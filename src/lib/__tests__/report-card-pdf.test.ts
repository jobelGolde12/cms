import { describe, it, expect } from "vitest";
import { renderReportCardPdf } from "../reports/report-card-pdf";
import type { ReportCardData } from "../report-card";

const base: ReportCardData = {
  hasEnrollment: true,
  student: { id: "s1", studentNumber: "SM-2026-000001", fullName: "Maria Santos dela Cruz Jr.", age: 17, sex: "female" },
  schoolYear: "2026-2027",
  gradeLevel: "Grade 12",
  section: "Reyes",
  adviser: "HANNA FAE G. FORTE",
  principal: "JOHNBERK B. EVASCO, Ph.D.",
  subjects: [
    { subjectCode: "CORE-01", subjectName: "Contemporary Philippine Arts from the Regions", termGrades: [93, 91, 90], finalGrade: 91, remark: "Benchmarking", descriptor: "Benchmarking" },
    { subjectCode: "SPE-01", subjectName: "Computer Systems Servicing", termGrades: [70, null, null], finalGrade: 70, remark: "Developing", descriptor: "Developing" },
  ],
  terms: ["Term 1", "Term 2", "Term 3"],
  generalAverage: 83,
  attendance: {
    months: [
      { month: "Jun", schoolDays: 18, present: 17, absent: 1 },
      { month: "Jul", schoolDays: 0, present: 0, absent: 0 },
    ],
    totalSchoolDays: 18, totalPresent: 17, totalAbsent: 1,
  },
};

describe("renderReportCardPdf", () => {
  it("produces a non-empty PDF buffer", async () => {
    const bytes = await renderReportCardPdf(base);
    expect(bytes.length).toBeGreaterThan(500);
    expect(Buffer.from(bytes.slice(0, 5)).toString("latin1")).toBe("%PDF-");
  });

  it("renders without enrollment data (empty state path)", async () => {
    const bytes = await renderReportCardPdf({ ...base, hasEnrollment: false, subjects: [], attendance: { months: [], totalSchoolDays: 0, totalPresent: 0, totalAbsent: 0 } });
    expect(Buffer.from(bytes.slice(0, 5)).toString("latin1")).toBe("%PDF-");
  });
});
