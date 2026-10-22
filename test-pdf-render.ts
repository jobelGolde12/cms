import { renderReportCardPdf } from "./src/lib/reports/report-card-pdf";
import type { ReportCardData } from "./src/lib/report-card";

const mockData: ReportCardData = {
  hasEnrollment: true,
  student: {
    id: "test-id",
    studentNumber: "TEST-001",
    lrn: "123456789012",
    fullName: "Maria Clara Santos",
    age: 16,
    sex: "female",
  },
  schoolYear: "2025-2026",
  gradeLevel: "Grade 10",
  section: "Stargazer",
  adviser: "Juan Dela Cruz",
  principal: "Ana Reyes",
  subjects: [
    {
      subjectCode: "ENG",
      subjectName: "English",
      termGrades: [85, 88, 90],
      finalGrade: 88,
      remark: "Passed",
      descriptor: "Benchmarking",
    },
    {
      subjectCode: "SCI",
      subjectName: "Science",
      termGrades: [78, 80, 82],
      finalGrade: 80,
      remark: "Passed",
      descriptor: "Benchmarking",
    },
  ],
  terms: ["Term 1", "Term 2", "Term 3"],
  generalAverage: 84,
  attendance: {
    months: [
      { month: "Jun", schoolDays: 22, present: 20, absent: 2 },
      { month: "Jul", schoolDays: 22, present: 21, absent: 1 },
      { month: "Aug", schoolDays: 20, present: 20, absent: 0 },
      { month: "Sep", schoolDays: 21, present: 21, absent: 0 },
      { month: "Oct", schoolDays: 22, present: 21, absent: 1 },
      { month: "Nov", schoolDays: 20, present: 20, absent: 0 },
      { month: "Dec", schoolDays: 15, present: 14, absent: 1 },
      { month: "Jan", schoolDays: 22, present: 20, absent: 2 },
      { month: "Feb", schoolDays: 20, present: 19, absent: 1 },
      { month: "Mar", schoolDays: 22, present: 21, absent: 1 },
      { month: "Apr", schoolDays: 20, present: 20, absent: 0 },
    ],
    totalSchoolDays: 228,
    totalPresent: 216,
    totalAbsent: 12,
  },
};

async function test() {
  try {
    console.log("Starting PDF render...");
    const bytes = await renderReportCardPdf(mockData);
    console.log("PDF render succeeded! Bytes:", bytes.length);
  } catch (e: any) {
    console.error("PDF render FAILED:", e.message || e);
    console.error("Stack:", e.stack);
  }
}

test();
