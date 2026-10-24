import { describe, it, expect } from "vitest";
import { renderForm137Pdf } from "../reports/form137-pdf";
import type { Form137Data } from "../form137";

const base: Form137Data = {
  student: {
    id: "s1",
    studentNumber: "SM-2026-000001",
    lrn: null,
    firstName: "Maria",
    lastName: "Santos",
    middleName: "dela Cruz",
    suffix: "Jr.",
    name: "Maria Santos dela Cruz Jr.",
    sex: "female",
    birthDate: "2009-05-14",
    birthPlace: "Sta. Magdalena, Sorsogon",
    age: 17,
  },
  blocks: [
    {
      enrollmentId: "e1",
      schoolYear: "2025-2026",
      gradeLevel: "Grade 9",
      section: "Molave",
      adviser: "Teacher Demo",
      promotionStatus: "Promoted",
      subjects: [
        {
          subjectCode: "FIL",
          subjectName: "Filipino",
          quarters: [88, 90, null, null],
          finalGrade: 89,
          remark: "Passed",
        },
        {
          subjectCode: "SPE-01",
          subjectName: "Computer Systems Servicing",
          quarters: [70, null, null, null],
          finalGrade: 70,
          remark: "Failed",
        },
        {
          subjectCode: "EMPTY-1",
          subjectName: "Physical Education and Health 03",
          quarters: [null, null, null, null],
          finalGrade: null,
          remark: null,
        },
      ],
      generalAverage: 80,
    },
    {
      enrollmentId: "e2",
      schoolYear: "2026-2027",
      gradeLevel: "Grade 10",
      section: "Ilang-Ilang",
      adviser: null,
      promotionStatus: null,
      subjects: [],
      generalAverage: null,
    },
  ],
  principal: "Karing Magdalena",
  eligibility: {
    certificate: "Elementary School Certificate",
    previousSchoolName: "Sta. Magdalena Central Elementary School",
    previousSchoolAddress: "Sta. Magdalena, Sorsogon",
    previousGeneralAverage: 88,
    previousGradeLevel: "Grade 6",
    promotionStatus: "Promoted",
    academicDistinction: null,
  },
};

describe("renderForm137Pdf", () => {
  it("produces a non-empty PDF buffer", async () => {
    const bytes = await renderForm137Pdf(base);
    expect(bytes.length).toBeGreaterThan(500);
    expect(Buffer.from(bytes.slice(0, 5)).toString("latin1")).toBe("%PDF-");
  });

  it("renders with no academic history (empty path)", async () => {
    const bytes = await renderForm137Pdf({
      ...base,
      blocks: [],
      principal: "Karing Magdalena",
    });
    expect(Buffer.from(bytes.slice(0, 5)).toString("latin1")).toBe("%PDF-");
  });

  it("renders long learner/subject/section names without error", async () => {
    const bytes = await renderForm137Pdf({
      ...base,
      student: {
        ...base.student,
        name: "Maria Angelica Consolacion Concepcion de la Santisima Trinidad del Rosario Nieto-Llamas Jr.",
      },
      blocks: [
        {
          ...base.blocks[0],
          section: "Sampaguita-Jasmine Sunflower Chrysanthemum Rose Tulip",
          subjects: [
            {
              subjectCode: "LONG-1",
              subjectName:
                "Introduction to the Philosophy of the Human Person/Pambungad sa Pilosopiya ng Tao",
              quarters: [90, null, null, null],
              finalGrade: 90,
              remark: "Passed",
            },
          ],
        },
      ],
    });
    expect(Buffer.from(bytes.slice(0, 5)).toString("latin1")).toBe("%PDF-");
  });
});
