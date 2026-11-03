import { describe, expect, it } from "vitest";
import {
  diffTeachingLoads,
  parseTeachingLoads,
  teachingLoadKey,
  type TeachingLoad,
} from "@/lib/teaching-loads";

describe("parseTeachingLoads", () => {
  it("parses section|subject values into pairs", () => {
    expect(parseTeachingLoads(["sec-1|sub-fil"])).toEqual([
      { sectionId: "sec-1", subjectId: "sub-fil" },
    ]);
  });

  it("drops malformed and blank values", () => {
    expect(parseTeachingLoads(["", "   ", "no-separator", "|sub-fil", "sec-1|"])).toEqual([]);
  });

  it("collapses duplicates", () => {
    expect(parseTeachingLoads(["sec-1|sub-fil", "sec-1|sub-fil"])).toEqual([
      { sectionId: "sec-1", subjectId: "sub-fil" },
    ]);
  });

  it("keeps distinct pairs in submission order", () => {
    const parsed = parseTeachingLoads(["sec-2|sub-sci", "sec-1|sub-fil"]);
    expect(parsed.map((p) => teachingLoadKey(p.sectionId, p.subjectId))).toEqual([
      "sec-2|sub-sci",
      "sec-1|sub-fil",
    ]);
  });
});

describe("diffTeachingLoads", () => {
  const current: TeachingLoad[] = [
    { sectionId: "sec-1", subjectId: "sub-fil" },
    { sectionId: "sec-1", subjectId: "sub-sci" },
  ];

  it("reports added and removed loads", () => {
    const next: TeachingLoad[] = [
      { sectionId: "sec-1", subjectId: "sub-sci" },
      { sectionId: "sec-2", subjectId: "sub-math" },
    ];
    const diff = diffTeachingLoads(current, next);
    expect(diff.added).toEqual([{ sectionId: "sec-2", subjectId: "sub-math" }]);
    expect(diff.removed).toEqual([{ sectionId: "sec-1", subjectId: "sub-fil" }]);
  });

  it("reports nothing when the load set is unchanged", () => {
    const diff = diffTeachingLoads(current, [...current]);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  it("treats a reordered list as unchanged", () => {
    const diff = diffTeachingLoads(current, [...current].reverse());
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
  });
});
