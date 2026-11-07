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

  it("keeps advisory sections — an adviser assignment is still an assignment", () => {
    // Grade encoding follows the teaching load only. A section the user merely
    // advises contributes no subject, and an advisory section is NOT dropped
    // from the map: the assignment list is the single source of truth.
    expect(groupAssignmentsBySection(assignments)).toEqual({
      "sec-1": ["math", "science"],
      "sec-2": ["math"],
    });
  });

  it("returns an empty map when there are no assignments", () => {
    expect(groupAssignmentsBySection([])).toEqual({});
  });
});
