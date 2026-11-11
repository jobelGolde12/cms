import { describe, expect, it } from "vitest";
import {
  computeSubmissionStatus,
  endOfSchoolDay,
} from "@/lib/grade-submissions";

const at = (iso: string) => new Date(iso);

describe("grade submission deadline logic", () => {
  const deadline = "2026-11-15";

  it("treats the deadline as end-of-day Asia/Manila", () => {
    // 23:59:59.999+08:00 === 15:59:59.999Z
    expect(endOfSchoolDay(deadline)?.toISOString()).toBe("2026-11-15T15:59:59.999Z");
    expect(endOfSchoolDay("not-a-date")).toBeNull();
  });

  it("is Not Yet Due before the deadline with no submission", () => {
    expect(
      computeSubmissionStatus({
        deadline,
        periodEndDate: null,
        submittedAt: null,
        now: at("2026-11-14T12:00:00+08:00"),
      }),
    ).toBe("not_yet_due");
  });

  it("is Submitted On Time when submitted before the deadline", () => {
    expect(
      computeSubmissionStatus({
        deadline,
        periodEndDate: null,
        submittedAt: at("2026-11-15T10:00:00+08:00"),
        now: at("2026-11-15T11:00:00+08:00"),
      }),
    ).toBe("submitted_on_time");
  });

  it("is Submitted Late when submitted after the deadline", () => {
    expect(
      computeSubmissionStatus({
        deadline,
        periodEndDate: null,
        submittedAt: at("2026-11-16T08:00:00+08:00"),
        now: at("2026-11-17T08:00:00+08:00"),
      }),
    ).toBe("submitted_late");
  });

  it("is Overdue after the deadline while the period is still open", () => {
    expect(
      computeSubmissionStatus({
        deadline,
        periodEndDate: "2026-11-30",
        submittedAt: null,
        now: at("2026-11-20T08:00:00+08:00"),
      }),
    ).toBe("overdue");
  });

  it("is Missing once the grading period itself has ended", () => {
    expect(
      computeSubmissionStatus({
        deadline,
        periodEndDate: "2026-11-20",
        submittedAt: null,
        now: at("2026-12-01T08:00:00+08:00"),
      }),
    ).toBe("missing");
  });

  it("reports plain Submitted when no deadline is configured", () => {
    expect(
      computeSubmissionStatus({
        deadline: null,
        periodEndDate: null,
        submittedAt: at("2026-09-01T08:00:00+08:00"),
      }),
    ).toBe("submitted");
    expect(
      computeSubmissionStatus({
        deadline: null,
        periodEndDate: null,
        submittedAt: null,
      }),
    ).toBe("not_yet_due");
  });

  it("never marks a submission late because of browser time (Date input is authoritative)", () => {
    // Same submittedAt, different "now" values must produce the same status.
    const submittedAt = at("2026-11-15T23:00:00+08:00");
    const first = computeSubmissionStatus({
      deadline,
      periodEndDate: null,
      submittedAt,
      now: at("2026-11-16T08:00:00+08:00"),
    });
    const second = computeSubmissionStatus({
      deadline,
      periodEndDate: null,
      submittedAt,
      now: at("2027-01-01T08:00:00+08:00"),
    });
    expect(first).toBe("submitted_on_time");
    expect(second).toBe("submitted_on_time");
  });
});
