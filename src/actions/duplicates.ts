"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { children, duplicateCandidates } from "@/db/schema";
import { getAuthorizedUser } from "@/lib/auth";
import { logAudit, notify } from "@/lib/audit";
import { duplicateReviewSchema } from "@/lib/schemas";
import { canAccessChild } from "@/lib/scope";
import { fullName } from "@/lib/utils";
import { fail, ok, sessionMetadata, zodFieldErrors, type ActionState } from "./helpers";

/**
 * Resolve the given duplicate candidate pair based on a validator decision.
 *
 * - confirmed: both records flagged as confirmed duplicates (awaiting manual merge)
 * - dismissed: wrong match; both records cleared back to "no duplicates"
 * - resolved: pair closed; records marked resolved
 */
export async function reviewDuplicate(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getAuthorizedUser("duplicates.review");
  const { ip } = await sessionMetadata();
  if (!user) return fail("You do not have permission to review duplicates.");

  const parsed = duplicateReviewSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail("Invalid review.", zodFieldErrors(parsed.error.issues));
  const { id, decision, notes } = parsed.data;

  const rows = await db.select().from(duplicateCandidates).where(eq(duplicateCandidates.id, id)).limit(1);
  const pair = rows[0];
  if (!pair) return fail("Duplicate pair not found.");

  await db
    .update(duplicateCandidates)
    .set({
      status: decision,
      reviewedBy: user.id,
      reviewedAt: new Date(),
      reviewNotes: notes || null,
    })
    .where(eq(duplicateCandidates.id, pair.id));

  const targetChildStatus = decision === "confirmed" ? "confirmed" : "resolved";
  const pairIds = [pair.childId, pair.candidateId];

  if (decision === "dismissed") {
    // Only clear a record's duplicate flag if it has no other active candidate.
    for (const childId of pairIds) {
      const other = await db
        .select({ id: duplicateCandidates.id })
        .from(duplicateCandidates)
        .where(
          and(
            inArray(duplicateCandidates.childId, [childId]),
            eq(duplicateCandidates.status, "potential"),
          ),
        )
        .limit(1);
      if (other.length === 0) {
        await db.update(children).set({ duplicateStatus: "none" }).where(eq(children.id, childId));
      }
    }
  } else {
    await db
      .update(children)
      .set({ duplicateStatus: targetChildStatus })
      .where(inArray(children.id, pairIds));
  }

  await logAudit({
    userId: user.id,
    userRole: user.role,
    action: `duplicate.${decision}`,
    entity: "duplicate_candidate",
    entityId: pair.id,
    result: "success",
    metadata: { childId: pair.childId, candidateId: pair.candidateId, notes },
    ip,
  });

  // Inform the collector who flagged the record.
  for (const childId of pairIds) {
    const childRows = await db.select().from(children).where(eq(children.id, childId)).limit(1);
    const child = childRows[0];
    if (child) {
      await notify({
        userId: child.createdBy,
        type: "duplicate",
        title: `Duplicate ${decision}`,
        body: `${fullName(child)} (${child.childCode}) — duplicate review marked as ${decision}.`,
        link: `/children/${child.id}`,
      });
    }
  }

  revalidatePath("/duplicates");
  revalidatePath("/children");
  return ok(`Marked as ${decision}.`);
}