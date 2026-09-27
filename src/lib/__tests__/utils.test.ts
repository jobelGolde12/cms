import { describe, it, expect } from "vitest";
import { ageFromBirthDate, formatDate, formatDateTime, maskName, normalizeName } from "../utils";

describe("ageFromBirthDate", () => {
  it("computes age correctly at a fixed date", () => {
    // At the reference date, someone born 2019-03-05 is 7 years old.
    expect(ageFromBirthDate("2019-03-05", new Date("2026-09-27T00:00:00Z"))).toBe(7);
  });

  it("handles pre-birthday dates", () => {
    expect(ageFromBirthDate("2019-12-05", new Date("2026-09-27T00:00:00Z"))).toBe(6);
  });

  it("never returns negative ages", () => {
    expect(ageFromBirthDate("2030-01-01", new Date("2026-09-27T00:00:00Z"))).toBe(0);
  });

  it("returns null for malformed input", () => {
    expect(ageFromBirthDate("")).toBeNull();
    expect(ageFromBirthDate("garbage")).toBeNull();
  });
});

describe("formatDate (ISO date, no timezone drift)", () => {
  it("formats ISO dates in UTC", () => {
    expect(formatDate("2019-03-05")).toMatch(/Mar 5, 2019/);
  });

  it("returns a dash for empty input", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("")).toBe("—");
  });

  it("echoes unparseable input instead of throwing", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});

describe("formatDateTime", () => {
  it("formats Date objects", () => {
    expect(formatDateTime(new Date("2026-09-27T04:30:00Z"))).toMatch(/2026/);
  });

  it("returns a dash for null", () => {
    expect(formatDateTime(null)).toBe("—");
  });
});

describe("name helpers", () => {
  it("maskName keeps first name and last initial", () => {
    expect(maskName("Maria", "Santos")).toBe("Maria S.");
  });

  it("normalizeName lowercases and collapses whitespace", () => {
    expect(normalizeName("  Juan   Dela   Cruz ")).toBe("juan dela cruz");
  });
});
