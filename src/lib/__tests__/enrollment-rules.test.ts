import { describe, expect, it } from "vitest";
import {
  checkSectionPlacement,
  isReassignment,
  reassignmentNotice,
  type PlacementSection,
} from "@/lib/enrollment-rules";

const section: PlacementSection = {
  id: "sec-7-rizal",
  schoolYearId: "sy-2026-2027",
  gradeLevelId: "gl-7",
  isActive: true,
};

describe("checkSectionPlacement", () => {
  it("accepts a matching, active section", () => {
    expect(checkSectionPlacement(section, "sy-2026-2027", "gl-7")).toEqual({ ok: true });
  });

  it("rejects a missing section", () => {
    const result = checkSectionPlacement(null, "sy-2026-2027", "gl-7");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/select a valid section/i);
  });

  it("rejects an inactive section", () => {
    const result = checkSectionPlacement(
      { ...section, isActive: false },
      "sy-2026-2027",
      "gl-7",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/inactive/i);
  });

  it("rejects a section from a different school year", () => {
    const result = checkSectionPlacement(section, "sy-2025-2026", "gl-7");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/school year/i);
  });

  it("rejects a section from a different grade level", () => {
    const result = checkSectionPlacement(section, "sy-2026-2027", "gl-8");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/grade level/i);
  });

  it("checks the school year before the grade level", () => {
    // Both mismatched — the school-year reason is reported first.
    const result = checkSectionPlacement(section, "sy-other", "gl-other");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/school year/i);
  });
});

describe("reassignment helpers", () => {
  it("detects an existing enrollment as a reassignment", () => {
    expect(isReassignment({ gradeLevelId: "gl-7", sectionId: "sec-1" })).toBe(true);
    expect(isReassignment(null)).toBe(false);
    expect(isReassignment(undefined)).toBe(false);
  });

  it("describes the conflict in user-facing language", () => {
    const notice = reassignmentNotice("2026-2027", "Grade 7", "Rizal");
    expect(notice).toMatch(/2026-2027/);
    expect(notice).toMatch(/Grade 7 — Rizal/);
    expect(notice).toMatch(/update/i);
  });
});
