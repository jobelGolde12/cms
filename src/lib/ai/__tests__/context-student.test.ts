/**
 * Unit tests for the pure AI context builders.
 *
 * These builders compute the authoritative "facts" that are (a) rendered
 * verbatim in the UI as database facts and (b) passed to the model as
 * authoritative context. Hallucination prevention starts here: every number
 * the model could get wrong must be computed deterministically on the server.
 */
import { describe, expect, it } from "vitest";
import {
  ageFrom,
  buildFactLines,
  studentIdentityHeader,
  summarizeAssessments,
  summarizeAttendance,
  summarizeBehavior,
  summarizeGrades,
  summarizeInterventions,
} from "@/lib/ai/context-student";

/* ----------------------------------- grades ---------------------------------- */

describe("summarizeGrades", () => {
  it("computes overall average and per-period averages", () => {
    const s = summarizeGrades([
      { id: "g1", grade: 80, remarks: null, subjectName: "Math", subjectCode: "MATH", periodName: "1st", schoolYear: "2026-2027", status: "submitted" },
      { id: "g2", grade: 70, remarks: null, subjectName: "Math", subjectCode: "MATH", periodName: "2nd", schoolYear: "2026-2027", status: "submitted" },
      { id: "g3", grade: 60, remarks: null, subjectName: "Filipino", subjectCode: "FIL", periodName: "1st", schoolYear: "2026-2027", status: "submitted" },
    ]);
    expect(s.totalGrades).toBe(3);
    expect(s.overallAverage).toBe(70);
    expect(s.byPeriod.find((p) => p.period === "1st")?.average).toBe(70);
    expect(s.byPeriod.find((p) => p.period === "2nd")?.average).toBe(70);
  });

  it("counts below-75 per subject and drafts separately (drafts still graded)", () => {
    const s = summarizeGrades([
      { id: "g1", grade: 74, remarks: null, subjectName: "Math", subjectCode: "MATH", periodName: "1st", schoolYear: "2026-2027", status: "draft" },
      { id: "g2", grade: 88, remarks: null, subjectName: "Math", subjectCode: "MATH", periodName: "1st", schoolYear: "2026-2027", status: "submitted" },
      { id: "g3", grade: 75, remarks: null, subjectName: "English", subjectCode: "ENG", periodName: "1st", schoolYear: "2026-2027", status: "submitted" },
    ]);
    const math = s.bySubject.find((b) => b.subject === "Math");
    expect(math?.below75).toBe(1);
    // 75 itself is not below threshold.
    expect(s.bySubject.find((b) => b.subject === "English")?.below75).toBe(0);
    expect(s.draftCount).toBe(1);
  });

  it("handles a single grade row and empty input", () => {
    expect(summarizeGrades([]).overallAverage).toBeNull();
    const one = summarizeGrades([{ id: "g1", grade: 90, remarks: null, subjectName: "S", subjectCode: "S", periodName: "1st", schoolYear: "Y", status: "submitted" }]);
    expect(one.overallAverage).toBe(90);
    expect(one.bySubject).toHaveLength(1);
  });
});

/* --------------------------------- attendance -------------------------------- */

describe("summarizeAttendance", () => {
  it("tallies statuses and reports the covered window", () => {
    const rows = [
      { id: "a1", date: "2026-01-05", status: "present", schoolYear: "2026-2027" },
      { id: "a2", date: "2026-01-06", status: "late", schoolYear: "2026-2027" },
      { id: "a3", date: "2026-01-07", status: "absent_excused", schoolYear: "2026-2027" },
      { id: "a4", date: "2026-01-08", status: "absent_unexcused", schoolYear: "2026-2027" },
      { id: "a5", date: "2026-01-09", status: "unknown_status", schoolYear: "2026-2027" },
    ];
    const s = summarizeAttendance(rows, 30);
    expect(s.present).toBe(1);
    expect(s.late).toBe(1);
    expect(s.absentExcused).toBe(1);
    expect(s.absentUnexcused).toBe(1);
    expect(s.countedDays).toBe(5);
    expect(s.truncationNote).toBeNull();
  });

  it("adds an explicit truncation note when the query window was hit", () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({
      id: `a${i}`,
      date: `2026-01-${String(i + 1).padStart(2, "0")}`,
      status: "present",
      schoolYear: "2026-2027",
    }));
    const s = summarizeAttendance(rows, 30);
    expect(s.truncationNote).toContain("30 recorded days");
  });

  it("reports zero data without inventing a rate", () => {
    const s = summarizeAttendance([], 30);
    expect(s.countedDays).toBe(0);
    expect(s.truncationNote).toBeNull();
  });
});

/* ---------------------------------- behavior --------------------------------- */

describe("summarizeBehavior", () => {
  const row = (over: Partial<Parameters<typeof summarizeBehavior>[0][number]>) => ({
    id: "b",
    date: "2026-02-01",
    description: "x",
    severity: null,
    status: "open",
    categoryName: "Classroom",
    categoryKind: "concern",
    ...over,
  });

  it("groups by category/status and counts high severity", () => {
    const s = summarizeBehavior([
      row({ id: "b1", severity: "high", date: "2026-03-02", categoryName: "Classroom" }),
      row({ id: "b2", severity: "high", date: "2026-03-01", categoryName: "Attendance concern" }),
      row({ id: "b3", severity: "low", date: "2026-02-20", categoryName: "Classroom", status: "resolved" }),
    ]);
    expect(s.total).toBe(3);
    expect(s.highSeverity).toBe(2);
    expect(s.byCategory.find((c) => c.category === "Classroom")?.count).toBe(2);
    expect(s.byStatus).toEqual({ open: 2, resolved: 1 });
    expect(s.recent[0].date).toBe("2026-03-02"); // most recent first
    expect(s.truncationNote).toBeNull();
  });

  it("truncates beyond 20 rows with a disclosure", () => {
    const s = summarizeBehavior(Array.from({ length: 25 }, (_, i) => row({ id: `b${i}`, date: `2026-01-${String(i + 1).padStart(2, "0")}` })));
    expect(s.recent).toHaveLength(20);
    expect(s.truncationNote).toContain("20 behavior entries are included of 25 total");
  });
});

/* --------------------------------- assessments -------------------------------- */

describe("summarizeAssessments", () => {
  it("groups domain × level", () => {
    const s = summarizeAssessments([
      { id: "a1", domain: "reading", assessmentType: "Phil-IRI", skillArea: null, date: "2026-01-02", level: "Non-reader", score: null },
      { id: "a2", domain: "reading", assessmentType: null, skillArea: null, date: "2026-02-02", level: "Instructional", score: 55 },
      { id: "a3", domain: "numeracy", assessmentType: null, skillArea: "Fractions", date: "2026-02-02", level: "Emerging", score: null },
    ]);
    expect(s.total).toBe(3);
    // The truncated test string is exact: reading has Non-reader x1 and Instructional x1 entries,
    // while numeracy has Emerging x1.
    expect(s.byDomainLevel.find((d) => d.domain.includes("Reading") && d.level === "Non-reader")?.count).toBe(1);
    expect(s.byDomainLevel.find((d) => d.domain.includes("Reading") && d.level === "Instructional")?.count).toBe(1);
    expect(s.byDomainLevel.find((d) => d.domain.includes("Numeracy") && d.level === "Emerging")?.count).toBe(1);
    expect(s.recent).toHaveLength(3);
  });

  it("handles null levels as 'unassessed'", () => {
    const s = summarizeAssessments([{ id: "a1", domain: "literacy", assessmentType: null, skillArea: null, date: "2026-01-02", level: null, score: null }]);
    expect(s.byDomainLevel[0]?.level).toBe("unassessed");
  });
});

/* -------------------------------- interventions ------------------------------- */

describe("summarizeInterventions", () => {
  it("labels statuses and truncates to 15", () => {
    const rows = Array.from({ length: 18 }, (_, i) => ({
      id: `i${i}`,
      interventionType: "Reading Support",
      description: "d",
      status: i % 2 ? "active" : "planned",
      outcome: null,
      startDate: "2026-01-01",
      targetDate: "2026-02-01",
    }));
    const s = summarizeInterventions(rows);
    expect(s.total).toBe(18);
    expect(s.items).toHaveLength(15);
    expect(s.truncationNote).toContain("15 interventions are included of 18 total");
    expect(Object.keys(s.byStatus)).toEqual(expect.arrayContaining(["Planned", "Active"]));
  });

  it("is honest about no interventions", () => {
    const s = summarizeInterventions([]);
    expect(s.total).toBe(0);
    expect(s.items).toHaveLength(0);
    expect(s.truncationNote).toBeNull();
  });
});

/* ------------------------------- identity header ------------------------------ */

describe("studentIdentityHeader (data minimization)", () => {
  const profile = {
    studentNumber: "SM-2026-000001",
    lrn: "136000123456",
    birthDate: "2011-05-04",
    sex: "female",
    recordStatus: "verified",
  };

  it("never includes the student's name, birth date, or address", () => {
    const identity = studentIdentityHeader(profile, null);
    const serialized = JSON.stringify(identity);
    expect(serialized).not.toContain("2011-05-04");
    expect(serialized).not.toContain("Maria");
    expect(identity.studentNumber).toBe("SM-2026-000001");
    expect(identity).not.toHaveProperty("address");
  });

  it("derives age in whole years, never the exact date", () => {
    const identity = studentIdentityHeader(profile, null);
    expect(identity.ageYears).toBeGreaterThan(10);
    expect(identity.ageYears).toBeLessThan(25);
    expect(identity).not.toHaveProperty("birthDate");
  });

  it("returns null age for missing/absurd birth dates", () => {
    expect(ageFrom(null)).toBeNull();
    expect(ageFrom("not-a-date")).toBeNull();
    expect(studentIdentityHeader({ ...profile, birthDate: null }, null).ageYears).toBeNull();
  });

  it("includes current enrollment context when available", () => {
    const identity = studentIdentityHeader(
      profile,
      { gradeLevelName: "Grade 7", sectionName: "Sampaguita", schoolYear: "2026-2027" },
    );
    expect(identity.gradeLevelName).toBe("Grade 7");
    expect(identity.sectionName).toBe("Sampaguita");
    expect(identity.schoolYear).toBe("2026-2027");
  });
});

/* --------------------------------- fact lines --------------------------------- */

describe("buildFactLines", () => {
  it("says nothing when there is literally nothing (insufficient data scenario)", () => {
    expect(buildFactLines({ grades: null, attendance: null, behavior: null, assessments: null, interventions: null, health: null })).toEqual([]);
  });

  it("reports empty datasets as insufficiency, never invents patterns", () => {
    const facts = buildFactLines({
      grades: summarizeGrades([]),
      attendance: summarizeAttendance([], 30),
      behavior: summarizeBehavior([]),
      assessments: summarizeAssessments([]),
      interventions: summarizeInterventions([]),
      health: null,
    });
    expect(facts.some((f) => f.includes("no grade records"))).toBe(true);
    expect(facts.some((f) => f.includes("no attendance records"))).toBe(true);
    expect(facts.some((f) => f.includes("no behavior records"))).toBe(true);
    expect(facts.some((f) => f.includes("no assessment records"))).toBe(true);
    expect(facts.some((f) => f.includes("none on file"))).toBe(true);
  });

  it("carries real numbers from the summaries", () => {
    const facts = buildFactLines({
      grades: summarizeGrades([
        { id: "g1", grade: 68, remarks: null, subjectName: "Math", subjectCode: "MATH", periodName: "1st", schoolYear: "2026-2027", status: "submitted" },
      ]),
      attendance: null,
      behavior: null,
      assessments: null,
      interventions: null,
      health: null,
    });
    expect(facts.join("\n")).toContain("68");
    // Subject-level detail is decision-relevant here because the grade is below 75.
    expect(facts.join("\n")).toContain("Math");
    expect(facts.join("\n")).toContain("below the 75 passing mark");
  });

  it("includes health facts when present", () => {
    const facts = buildFactLines({
      grades: null,
      attendance: null,
      behavior: null,
      assessments: null,
      interventions: null,
      health: { measurements: 2, latest: { bmi: 17.2, nutritionalStatus: "normal", heightCm: 150, weightKg: 38 } },
    });
    expect(facts.join("\n")).toContain("BMI 17.2");
    expect(facts.join("\n")).toContain("normal");
  });
});
