import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { duplicateCandidates, students } from "@/db/schema";
import { normalizeName } from "./utils";

export type DuplicateMatch = {
  possibleStudentId: string;
  possibleStudentNumber: string;
  first: string;
  last: string;
  birthDate: string;
  sex: string;
  reasons: string[];
  score: number;
};

export type DuplicateInput = {
  firstName: string;
  lastName: string;
  middleName?: string | null;
  birthDate: string;
  sex: string;
  excludeStudentId?: string | null;
};

/**
 * Finds potential duplicate student records. A candidate is flagged when at
 * least two identifying fields agree (name + birth date, or name + sex with a
 * same-last-name). Matching NEVER marks a student as a duplicate by itself —
 * it only creates review candidates for human verification.
 */
export async function detectDuplicates(
  input: DuplicateInput,
): Promise<DuplicateMatch[]> {
  const rows = await db
    .select({
      id: students.id,
      studentNumber: students.studentNumber,
      firstName: students.firstName,
      lastName: students.lastName,
      middleName: students.middleName,
      birthDate: students.birthDate,
      sex: students.sex,
      recordStatus: students.recordStatus,
    })
    .from(students)
    .where(
      or(
        eq(students.lastName, input.lastName),
        eq(students.firstName, input.firstName),
        eq(students.birthDate, input.birthDate),
      ),
    );

  const matches: DuplicateMatch[] = [];

  for (const row of rows) {
    if (row.id === input.excludeStudentId) continue;
    // Records already marked duplicates are out of scope for review.
    if (row.recordStatus === "marked_duplicate") continue;

    const reasons: string[] = [];
    let score = 0;

    const sameName =
      normalizeName(`${row.lastName} ${row.firstName}`) ===
      normalizeName(`${input.lastName} ${input.firstName}`);
    if (sameName) {
      reasons.push("name");
      score += 40;
    }

    const sameMiddle =
      sameName &&
      Boolean(row.middleName && input.middleName) &&
      normalizeName(row.middleName ?? "") === normalizeName(input.middleName ?? "");
    if (sameMiddle) {
      reasons.push("middle_name");
      score += 10;
    }

    if (row.birthDate === input.birthDate) {
      reasons.push("birth_date");
      score += 35;
    }
    if (row.sex === input.sex) {
      reasons.push("sex");
      score += 15;
    }

    // Require at least two independent identifiers.
    const strongMatch =
      (sameName && (reasons.includes("birth_date") || reasons.includes("sex"))) ||
      (!sameName && reasons.includes("birth_date") && reasons.includes("sex"));

    if (!strongMatch || reasons.length < 2) continue;

    matches.push({
      possibleStudentId: row.id,
      possibleStudentNumber: row.studentNumber,
      first: row.firstName,
      last: row.lastName,
      birthDate: row.birthDate,
      sex: row.sex,
      reasons,
      score: Math.min(score, 100),
    });
  }

  return matches;
}

/**
 * Refresh pending/not_duplicate review candidates for a student. Rows already
 * reviewed (confirmed_duplicate) are left untouched. Existing pending rows
 * that no longer match are dismissed. This never changes `record_status`.
 */
export async function refreshDuplicateCandidates(
  studentId: string,
  input: DuplicateInput,
): Promise<void> {
  const existing = await db
    .select({
      id: duplicateCandidates.id,
      possibleStudentId: duplicateCandidates.possibleStudentId,
      status: duplicateCandidates.status,
    })
    .from(duplicateCandidates)
    .where(eq(duplicateCandidates.studentId, studentId));

  const matches = await detectDuplicates({ ...input, excludeStudentId: studentId });
  const matchIds = new Set(matches.map((m) => m.possibleStudentId));

  // Dismiss stale pending candidates that no longer match.
  for (const row of existing) {
    if (
      !matchIds.has(row.possibleStudentId) &&
      (row.status === "pending" || row.status === "not_duplicate")
    ) {
      await db
        .update(duplicateCandidates)
        .set({ status: "dismissed", updatedAt: new Date() })
        .where(eq(duplicateCandidates.id, row.id));
    }
  }

  // Insert new pending candidates (pair-unique).
  for (const m of matches) {
    const already = existing.find((e) => e.possibleStudentId === m.possibleStudentId);
    if (already) {
      if (already.status === "not_duplicate") {
        await db
          .update(duplicateCandidates)
          .set({
            status: "pending",
            matchScore: m.score,
            matchReason: JSON.stringify(m.reasons),
            updatedAt: new Date(),
          })
          .where(eq(duplicateCandidates.id, already.id));
      }
      continue;
    }
    await db
      .insert(duplicateCandidates)
      .values({
        id: crypto.randomUUID(),
        studentId,
        possibleStudentId: m.possibleStudentId,
        matchScore: m.score,
        matchReason: JSON.stringify(m.reasons),
        status: "pending",
      })
      .onConflictDoNothing();
  }
}
