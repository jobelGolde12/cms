import { describe, expect, it } from "vitest";
import { groupAssignmentsBySection } from "@/lib/grades";

describe("groupAssignmentsBySection", () => {
  const assignments = [
    { sectionId: "sec-1", subjectId: "math" },
    { sectionId: "sec-1", subjectId: "science" },
    { sectionId: "sec-2", subjectId: "math" },
    { sectionId: "sec-2", subjectId: "math" }, // duplicate — must collapse
  ];

  it("groups assignments by section and deduplicates subjects", () => {
    expect(groupAssignmentsBySection(assignments)).toEqual({
      "sec-1": ["math", "science"],
      "sec-2": ["math"],
    });
  });

  it("drops advisory sections (they may encode every subject already)", () => {
    expect(groupAssignmentsBySection(assignments, ["sec-1"])).toEqual({
      "sec-2": ["math"],
    });
  });

  it("returns an empty map when there are no assignments", () => {
    expect(groupAssignmentsBySection([])).toEqual({});
  });
});
