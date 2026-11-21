import { describe, expect, it } from "vitest";
import {
  assertSupportedGradeLevelId,
  GRADE_LEVEL_DEFINITIONS,
  GRADE_LEVELS,
  isSupportedGradeLevelId,
  isSupportedGradeLevelName,
  nextPromotableGradeLevelName,
  SUPPORTED_GRADE_LEVEL_IDS,
  UnsupportedGradeLevelError,
} from "../grade-levels";

describe("Grade 7–10 grade-level policy", () => {
  it("defines exactly the four supported grade levels", () => {
    expect(GRADE_LEVEL_DEFINITIONS).toEqual([
      { id: "gl-7", name: "Grade 7", grade: 7, orderIndex: 1 },
      { id: "gl-8", name: "Grade 8", grade: 8, orderIndex: 2 },
      { id: "gl-9", name: "Grade 9", grade: 9, orderIndex: 3 },
      { id: "gl-10", name: "Grade 10", grade: 10, orderIndex: 4 },
    ]);
    expect(GRADE_LEVELS).toEqual(["Grade 7", "Grade 8", "Grade 9", "Grade 10"]);
    expect(SUPPORTED_GRADE_LEVEL_IDS).toEqual(["gl-7", "gl-8", "gl-9", "gl-10"]);
  });

  it("accepts only the canonical grade-level ids", () => {
    for (const id of SUPPORTED_GRADE_LEVEL_IDS) {
      expect(isSupportedGradeLevelId(id)).toBe(true);
    }

    expect(isSupportedGradeLevelId("gl-11")).toBe(false);
    expect(isSupportedGradeLevelId("gl-12")).toBe(false);
    expect(isSupportedGradeLevelId("grade-10")).toBe(false);
    expect(isSupportedGradeLevelId("")).toBe(false);
  });

  it("accepts only the canonical grade-level names", () => {
    for (const grade of GRADE_LEVEL_DEFINITIONS) {
      expect(isSupportedGradeLevelName(grade.name)).toBe(true);
    }

    expect(isSupportedGradeLevelName("Grade 11")).toBe(false);
    expect(isSupportedGradeLevelName("Grade 12")).toBe(false);
    expect(isSupportedGradeLevelName("grade 10")).toBe(false);
    expect(isSupportedGradeLevelName("")).toBe(false);
  });

  it("throws a typed error for unsupported grade-level ids", () => {
    expect(() => assertSupportedGradeLevelId("gl-7")).not.toThrow();
    expect(() => assertSupportedGradeLevelId("gl-11")).toThrow(UnsupportedGradeLevelError);
    expect(() => assertSupportedGradeLevelId("gl-12")).toThrow(/Grades 7–10/i);
  });

  it("promotes only Grade 7 through Grade 9", () => {
    expect(nextPromotableGradeLevelName("Grade 7")).toBe("Grade 8");
    expect(nextPromotableGradeLevelName("Grade 8")).toBe("Grade 9");
    expect(nextPromotableGradeLevelName("Grade 9")).toBe("Grade 10");
  });

  it("does not promote Grade 10 or any unsupported grade", () => {
    expect(nextPromotableGradeLevelName("Grade 10")).toBeNull();
    expect(nextPromotableGradeLevelName("Grade 11")).toBeNull();
    expect(nextPromotableGradeLevelName("Grade 12")).toBeNull();
    expect(nextPromotableGradeLevelName("Grade 6")).toBeNull();
    expect(nextPromotableGradeLevelName(undefined)).toBeNull();
  });
});
