/**
 * Canonical grade-level policy for the Junior High School records system.
 *
 * Grade levels are fixed reference data, not user-configurable rows. Keep the
 * identifiers and names together so application validation, database checks,
 * imports, queries, reports, and document promotion cannot drift apart.
 */

export const GRADE_LEVEL_DEFINITIONS = [
  { id: "gl-7", name: "Grade 7", grade: 7, orderIndex: 1 },
  { id: "gl-8", name: "Grade 8", grade: 8, orderIndex: 2 },
  { id: "gl-9", name: "Grade 9", grade: 9, orderIndex: 3 },
  { id: "gl-10", name: "Grade 10", grade: 10, orderIndex: 4 },
] as const;

export const GRADE_LEVELS = ["Grade 7", "Grade 8", "Grade 9", "Grade 10"] as const;
export const SUPPORTED_GRADE_LEVEL_IDS = ["gl-7", "gl-8", "gl-9", "gl-10"] as const;

export const UNSUPPORTED_GRADE_LEVEL_MESSAGE = "Grade levels are limited to Grades 7–10.";

export class UnsupportedGradeLevelError extends Error {
  constructor(message = UNSUPPORTED_GRADE_LEVEL_MESSAGE) {
    super(message);
    this.name = "UnsupportedGradeLevelError";
  }
}

const supportedIdSet = new Set<string>(SUPPORTED_GRADE_LEVEL_IDS);
const supportedNameSet = new Set<string>(GRADE_LEVELS);

export function isSupportedGradeLevelId(id: string | null | undefined): boolean {
  return typeof id === "string" && supportedIdSet.has(id);
}

export function assertSupportedGradeLevelId(
  id: string | null | undefined,
): asserts id is (typeof SUPPORTED_GRADE_LEVEL_IDS)[number] {
  if (!isSupportedGradeLevelId(id)) throw new UnsupportedGradeLevelError();
}

export function isSupportedGradeLevelName(name: string | null | undefined): boolean {
  return typeof name === "string" && supportedNameSet.has(name);
}

/**
 * Return the next JHS grade, or null when the current grade cannot advance.
 * Grade 10 is the final supported year and must never produce Grade 11.
 */
export function nextPromotableGradeLevelName(
  gradeLevelName: string | null | undefined,
): string | null {
  if (!isSupportedGradeLevelName(gradeLevelName)) return null;

  const current = GRADE_LEVEL_DEFINITIONS.find((level) => level.name === gradeLevelName);
  if (!current) return null;

  const next = GRADE_LEVEL_DEFINITIONS.find((level) => level.grade === current.grade + 1);
  return next?.name ?? null;
}
