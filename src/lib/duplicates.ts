import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { children } from "@/db/schema";
import { normalizeName } from "./utils";

export type DuplicateMatch = {
  candidateId: string;
  candidateCode: string;
  first: string;
  last: string;
  birthDate: string;
  barangayId: string;
  reasons: string[];
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
 * identifying fields agree (full name + middle name, name + birth date, or
 * name + barangay). Pure name similarity alone never auto-merges anything.
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

    const reasons: string[] = [];
    const sameName =
      normalizeName(`${row.lastName} ${row.firstName}`) ===
      normalizeName(`${input.lastName} ${input.firstName}`);
    if (sameName) reasons.push("name");

    const sameMiddle =
      sameName &&
      Boolean(row.middleName && input.middleName) &&
      normalizeName(row.middleName ?? "") === normalizeName(input.middleName ?? "");
    if (sameMiddle) reasons.push("middle_name");

    if (row.birthDate === input.birthDate) reasons.push("birth_date");
    if (row.barangayId === input.barangayId) reasons.push("barangay");

    // Require either (name + middle + 1 more) or (name + birth/barangay) or
    // (last-name + birth date + barangay, i.e. two identifiers plus location).
    const strongMatch =
      (sameName && (reasons.includes("birth_date") || reasons.includes("barangay"))) ||
      (!sameName && reasons.includes("birth_date") && reasons.includes("barangay"));

    if (!strongMatch || reasons.length < 2) continue;

    matches.push({
      candidateId: row.id,
      candidateCode: row.childCode,
      first: row.firstName,
      last: row.lastName,
      birthDate: row.birthDate,
      barangayId: row.barangayId,
      reasons,
    });
  }

  return matches;
}