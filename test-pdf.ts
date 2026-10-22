import { getReportCardData } from "./src/lib/report-card";
import { renderReportCardPdf } from "./src/lib/reports/report-card-pdf";

async function test() {
  try {
    const data = await getReportCardData("910b7f32-d312-4794-b698-3f7686b124d2");
    console.log("Data loaded:", data ? "YES" : "NO");
    if (data) {
      console.log("Student:", data.student.fullName);
      console.log("Enrollment:", data.hasEnrollment);
      console.log("Subjects:", data.subjects.length);
      console.log("Attendance months:", data.attendance.months.length);
      console.log("General average:", data.generalAverage);
    }
  } catch (e: any) {
    console.error("Data load error:", e.message || e);
  }
}

test();
