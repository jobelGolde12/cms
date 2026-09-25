import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { childDuplicateCandidates, children } from "@/db/schema";
import { normalizeName } from "./utils";

export type DuplicateMatch = {
  possibleChildId: string;
  possibleChildCode: string;
  first: string;
  last: string;
  birthDate: string;
  barangayId: string;
  reasons: string[];
  score: number;
};

export type DuplicateInput = {
  firstName: string;
  lastName: string;
  middleName?: string | null;
  birthDate: string;
  barangayId: string;
  excludeChildId?: string | null;
};

/**
 * Finds potential duplicate records. A candidate is flagged when at least two
 * identifying fields agree (name + birth date, name + barangay, or birth date
 * + barangay with a same-last-name). Matching NEVER marks a child as a
 * duplicate by itself — it only creates review candidates.
 */
export async function detectDuplicates(
  input: DuplicateInput,
): Promise<DuplicateMatch[]> {
  const rows = await db
    .select({
      id: children.id,
      childCode: children.childCode,
      firstName: children.firstName,
      lastName: children.lastName,
      middleName: children.middleName,
      birthDate: children.birthDate,
      barangayId: children.barangayId,
      recordStatus: children.recordStatus,
    })
    .from(children)
    .where(
      or(
        eq(children.lastName, input.lastName),
        eq(children.firstName, input.firstName),
        eq(children.birthDate, input.birthDate),
        eq(children.barangayId, input.barangayId),
      ),
    );

  const matches: DuplicateMatch[] = [];

  for (const row of rows) {
    if (row.id === input.excludeChildId) continue;
    // Archived records are out of scope for duplicate review.
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
    if (row.barangayId === input.barangayId) {
      reasons.push("barangay");
      score += 15;
    }

    // Require at least two independent identifiers.
    const strongMatch =
      (sameName && (reasons.includes("birth_date") || reasons.includes("barangay"))) ||
      (!sameName && reasons.includes("birth_date") && reasons.includes("barangay"));

    if (!strongMatch || reasons.length < 2) continue;

    matches.push({
      possibleChildId: row.id,
      possibleChildCode: row.childCode,
      first: row.firstName,
      last: row.lastName,
      birthDate: row.birthDate,
      barangayId: row.barangayId,
      reasons,
      score: Math.min(score, 100),
    });
  }

  return matches;
}

/**
 * Refresh pending/not_duplicate review candidates for a child. Rows already
 * reviewed (confirmed_duplicate) are left untouched. Existing pending rows
 * that no longer match are dismissed. This never changes `record_status`.
 */
export async function refreshDuplicateCandidates(
  childId: string,
  input: DuplicateInput,
): Promise<void> {
  const existing = await db
    .select({
      id: childDuplicateCandidates.id,
      possibleChildId: childDuplicateCandidates.possibleChildId,
      status: childDuplicateCandidates.status,
    })
    .from(childDuplicateCandidates)
    .where(eq(childDuplicateCandidates.childId, childId));

  const matches = await detectDuplicates({ ...input, excludeChildId: childId });
  const matchIds = new Set(matches.map((m) => m.possibleChildId));

  // Dismiss stale pending candidates that no longer match.
  for (const row of existing) {
    if (
      !matchIds.has(row.possibleChildId) &&
      (row.status === "pending" || row.status === "not_duplicate")
    ) {
      await db
        .update(childDuplicateCandidates)
        .set({ status: "dismissed", updatedAt: new Date() })
        .where(eq(childDuplicateCandidates.id, row.id));
    }
  }

  // Insert new pending candidates (pair-unique).
  for (const m of matches) {
    const already = existing.find((e) => e.possibleChildId === m.possibleChildId);
    if (already) {
      if (already.status === "not_duplicate") {
        await db
          .update(childDuplicateCandidates)
          .set({
            status: "pending",
            matchScore: m.score,
            matchReason: JSON.stringify(m.reasons),
            updatedAt: new Date(),
          })
          .where(eq(childDuplicateCandidates.id, already.id));
      }
      continue;
    }
    await db
      .insert(childDuplicateCandidates)
      .values({
        id: crypto.randomUUID(),
        childId,
        possibleChildId: m.possibleChildId,
        matchScore: m.score,
        matchReason: JSON.stringify(m.reasons),
        status: "pending",
      })
      .onConflictDoNothing();
  }
}
