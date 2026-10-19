import { describe, it, expect } from "vitest";
import {
  computeFinalGrade,
  mapGradeToDescriptor,
  aggregateAttendanceByMonth,
  summarizeAttendance,
  REPORT_CARD_MONTHS,
} from "../report-card";

describe("mapGradeToDescriptor (CARD.docx scale)", () => {
  it("maps the official ranges", () => {
    expect(mapGradeToDescriptor(95)).toEqual({ descriptor: "Advancing", remark: "Passed" });
    expect(mapGradeToDescriptor(90)).toEqual({ descriptor: "Advancing", remark: "Passed" });
    expect(mapGradeToDescriptor(85)).toEqual({ descriptor: "Benchmarking", remark: "Passed" });
    expect(mapGradeToDescriptor(80)).toEqual({ descriptor: "Benchmarking", remark: "Passed" });
    expect(mapGradeToDescriptor(77)).toEqual({ descriptor: "Connecting", remark: "Passed" });
    expect(mapGradeToDescriptor(75)).toEqual({ descriptor: "Connecting", remark: "Passed" });
    expect(mapGradeToDescriptor(70)).toEqual({ descriptor: "Developing", remark: "Failed" });
    expect(mapGradeToDescriptor(65)).toEqual({ descriptor: "Developing", remark: "Failed" });
    expect(mapGradeToDescriptor(50)).toEqual({ descriptor: "Emerging", remark: "Failed" });
    expect(mapGradeToDescriptor(0)).toEqual({ descriptor: "Emerging", remark: "Failed" });
  });

  it("rounds fractional grades before mapping", () => {
    // 89.5 rounds to 90 → Advancing
    expect(mapGradeToDescriptor(89.5)?.descriptor).toBe("Advancing");
    // 79.4 rounds to 79 → Connecting
    expect(mapGradeToDescriptor(79.4)?.descriptor).toBe("Connecting");
  });

  it("returns null for missing, non-finite and out-of-range grades", () => {
    expect(mapGradeToDescriptor(null)).toBeNull();
    expect(mapGradeToDescriptor(undefined)).toBeNull();
    expect(mapGradeToDescriptor(Number.NaN)).toBeNull();
    expect(mapGradeToDescriptor(101)).toBeNull();
    expect(mapGradeToDescriptor(-5)).toBeNull();
  });
});

describe("computeFinalGrade", () => {
  it("averages all provided terms", () => {
    expect(computeFinalGrade([93, 90, 85])).toBe(89);
    expect(computeFinalGrade([90, 91, 92, 90])).toBe(91);
  });

  it("computes from available terms only (partial grades)", () => {
    expect(computeFinalGrade([93, null, null])).toBe(93);
    expect(computeFinalGrade([93, 90, null])).toBe(92);
  });

  it("returns null when no grades exist (never 0)", () => {
    expect(computeFinalGrade([null, null, null])).toBeNull();
    expect(computeFinalGrade([])).toBeNull();
  });
});

describe("aggregateAttendanceByMonth", () => {
  const SY = "2026-2027";

  it("covers all eleven CARD.docx months in order", () => {
    const months = aggregateAttendanceByMonth([], SY);
    expect(months.map((m) => m.month)).toEqual([...REPORT_CARD_MONTHS]);
    expect(months.every((m) => m.schoolDays === 0)).toBe(true);
  });

  it("buckets records by calendar month into the school-year span", () => {
    const months = aggregateAttendanceByMonth(
      [
        { date: "2026-06-15", status: "present" },
        { date: "2026-06-16", status: "present" },
        { date: "2026-06-17", status: "late" },
        { date: "2026-06-18", status: "absent_excused" },
        { date: "2027-01-10", status: "present" },
        { date: "2027-02-20", status: "absent_unexcused" },
        // Outside the school-year span — ignored
        { date: "2026-05-01", status: "present" },
        { date: "2027-05-01", status: "present" },
      ],
      SY,
    );
    const jun = months.find((m) => m.month === "Jun")!;
    expect(jun.schoolDays).toBe(4);
    expect(jun.present).toBe(3); // present + late
    expect(jun.absent).toBe(1);

    const jan = months.find((m) => m.month === "Jan")!;
    expect(jan.schoolDays).toBe(1);
    expect(jan.present).toBe(1);

    const feb = months.find((m) => m.month === "Feb")!;
    expect(feb.absent).toBe(1);
  });

  it("treats late as present and both absent kinds as absent", () => {
    const months = aggregateAttendanceByMonth(
      [
        { date: "2026-06-01", status: "late" },
        { date: "2026-06-02", status: "present" },
        { date: "2026-06-03", status: "absent_unexcused" },
      ],
      SY,
    );
    const jun = months.find((m) => m.month === "Jun")!;
    expect(jun.present).toBe(2);
    expect(jun.absent).toBe(1);
    expect(jun.schoolDays).toBe(3);
  });

  it("returns [] for malformed school-year strings", () => {
    expect(aggregateAttendanceByMonth([], "garbage")).toEqual([]);
    expect(aggregateAttendanceByMonth([], "")).toEqual([]);
  });
});

describe("summarizeAttendance", () => {
  it("totals presentation/absence across months", () => {
    const summary = summarizeAttendance(
      [
        { date: "2026-06-01", status: "present" },
        { date: "2026-06-02", status: "absent_excused" },
        { date: "2026-07-01", status: "late" },
      ],
      "2026-2027",
    );
    expect(summary.totalSchoolDays).toBe(3);
    expect(summary.totalPresent).toBe(2);
    expect(summary.totalAbsent).toBe(1);
  });
});
