/**
 * Pure grade validation helpers — importable from both server code and client
 * components (no database / next/headers dependencies on purpose).
 */

export const MIN_GRADE = 60;
export const MAX_GRADE = 100;

export type GradeValidationIssue =
  | { studentId: string; studentName: string; kind: "missing" | "invalid"; detail: string };

/**
 * Pure completeness validator for a grade sheet (unit-testable, no DB).
 * - missing  → roster student with no entry (or only empty entries)
 * - unexpected → entry for a student who is not on the section roster
 * - missing  → roster student with no entry (or only empty entries)
 * - invalid  → entry outside the 60–100 scale, non-numeric, or duplicate
 */
export function collectGradeIssues(
  roster: { studentId: string; studentName: string }[],
  entries: { studentId: string; grade: number | null }[],
): GradeValidationIssue[] {
  const issues: GradeValidationIssue[] = [];
  const rosterIds = new Set(roster.map((r) => r.studentId));

  // Entries for students who are not on this section's roster (wrong section /
  // stale client state) must never pass validation silently.
  for (const e of entries) {
    if (!rosterIds.has(e.studentId)) {
      issues.push({
        studentId: e.studentId,
        studentName: "(not on roster)",
        kind: "invalid",
        detail: "Entry for a student not on this section roster",
      });
    }
  }

  // Group entries per student (preserving order) to catch duplicates.
  const grouped = new Map<string, { grade: number | null }[]>();
  for (const e of entries) {
    const list = grouped.get(e.studentId) ?? [];
    list.push({ grade: e.grade });
    grouped.set(e.studentId, list);
  }
  for (const r of roster) {
    const list = grouped.get(r.studentId) ?? [];
    const withValue = list.find((e) => e.grade !== null);
    if (list.length > 1) {
      issues.push({
        studentId: r.studentId,
        studentName: r.studentName,
        kind: "invalid",
        detail: "Duplicate grade entry",
      });
      continue;
    }
    if (!withValue) {
      issues.push({ studentId: r.studentId, studentName: r.studentName, kind: "missing", detail: "No grade entered" });
      continue;
    }
    const grade = withValue.grade as number;
    if (!Number.isFinite(grade) || grade < MIN_GRADE || grade > MAX_GRADE) {
      issues.push({
        studentId: r.studentId,
        studentName: r.studentName,
        kind: "invalid",
        detail: `${Number.isFinite(grade) ? grade : "—"} is not a valid grade (${MIN_GRADE}–${MAX_GRADE})`,
      });
    }
  }
  return issues;
}
