import { describe, expect, it } from "vitest";
import { collectGradeIssues, MAX_GRADE, MIN_GRADE } from "@/lib/grade-validation";

const roster = [
  { studentId: "s1", studentName: "Dela Cruz, Ana" },
  { studentId: "s2", studentName: "Santos, Ben" },
  { studentId: "s3", studentName: "Reyes, Carl" },
];

describe("collectGradeIssues", () => {
  it("flags roster students without any entry as missing", () => {
    const issues = collectGradeIssues(roster, [{ studentId: "s1", grade: 85 }]);
    const missing = issues.filter((i) => i.kind === "missing");
    expect(missing.map((i) => i.studentId)).toEqual(["s2", "s3"]);
  });

  it("flags empty entries as missing", () => {
    const issues = collectGradeIssues(roster, [
      { studentId: "s1", grade: 85 },
      { studentId: "s2", grade: null },
      { studentId: "s3", grade: 80 },
    ]);
    const missing = issues.filter((i) => i.kind === "missing");
    expect(missing.map((i) => i.studentId)).toEqual(["s2"]);
  });

  it("accepts the full valid grade scale", () => {
    expect(collectGradeIssues(roster, [{ studentId: "s1", grade: MIN_GRADE }, { studentId: "s2", grade: MAX_GRADE }, { studentId: "s3", grade: 90 }])).toEqual([]);
  });

  it("flags out-of-scale values as invalid", () => {
    const issues = collectGradeIssues(roster, [
      { studentId: "s1", grade: 59 },
      { studentId: "s2", grade: 101 },
      { studentId: "s3", grade: null },
    ]);
    expect(issues.map((i) => i.kind)).toContain("invalid");
    expect(issues.map((i) => i.studentId)).toContain("s1");
    expect(issues.map((i) => i.studentId)).toContain("s2");
  });

  it("treats NaN as invalid", () => {
    const issues = collectGradeIssues(roster, [
      { studentId: "s1", grade: Number.NaN },
      { studentId: "s2", grade: 90 },
      { studentId: "s3", grade: 90 },
    ]);
    expect(issues.some((i) => i.studentId === "s1" && i.kind === "invalid")).toBe(true);
  });

  it("flags entries for students not on the roster as unexpected/invalid", () => {
    const issues = collectGradeIssues(roster, [
      { studentId: "s1", grade: 85 },
      { studentId: "s2", grade: 90 },
      { studentId: "s3", grade: 80 },
      { studentId: "intruder", grade: 99 },
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0].studentId).toBe("intruder");
    expect(issues[0].detail).toContain("roster");
  });

  it("reports nothing for a fully complete valid sheet", () => {
    const entries = roster.map((r, i) => ({ studentId: r.studentId, grade: 75 + i * 5 }));
    expect(collectGradeIssues(roster, entries)).toEqual([]);
  });
});
