"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { childDuplicateCandidates, children } from "@/db/schema";
import { getAuthorizedUser } from "@/lib/auth";
import { logAudit, notify } from "@/lib/audit";
import { duplicateReviewSchema } from "@/lib/schemas";
import { canAccessChild } from "@/lib/scope";
import { fail, ok, sessionMetadata, zodFieldErrors, type ActionState } from "./helpers";

/**
 * Human review of a duplicate candidate. Detection never marks a child as a
 * duplicate by itself — only an authorized reviewer decision here does.
 *
 * - confirmed_duplicate: the newer record is marked `marked_duplicate`
 * - not_duplicate: candidate cleared; both records keep their status
 * - dismissed: review closed without prejudice
 */
export async function reviewDuplicate(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getAuthorizedUser("duplicates.review");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission to review duplicates.");

  const parsed = duplicateReviewSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail("Invalid review.", zodFieldErrors(parsed.error.issues));
  const { id, decision, notes } = parsed.data;

  const rows = await db
    .select()
    .from(childDuplicateCandidates)
    .where(eq(childDuplicateCandidates.id, id))
    .limit(1);
  const candidate = rows[0];
  if (!candidate) return fail("Duplicate candidate not found.");

  await db
    .update(childDuplicateCandidates)
    .set({
      status: decision,
      reviewedBy: user.id,
      reviewNotes: notes || null,
      updatedAt: new Date(),
    })
    .where(eq(childDuplicateCandidates.id, candidate.id));

  if (decision === "confirmed_duplicate") {
    // Mark the newer record (the candidate that triggered detection) as duplicate.
    const childRows = await db
      .select({ createdAt: children.createdAt })
      .from(children)
      .where(eq(children.id, candidate.childId))
      .limit(1);
    const possibleRows = await db
      .select({ createdAt: children.createdAt })
      .from(children)
      .where(eq(children.id, candidate.possibleChildId))
      .limit(1);

    const newerId =
      (childRows[0]?.createdAt ?? 0) >= (possibleRows[0]?.createdAt ?? 0)
        ? candidate.childId
        : candidate.possibleChildId;

    await db
      .update(children)
      .set({ recordStatus: "marked_duplicate", updatedBy: user.id, updatedAt: new Date() })
      .where(eq(children.id, newerId));

    await logAudit({
      userId: user.id,
      action: "MARK_DUPLICATE",
      entityType: "child_duplicate_candidate",
      entityId: candidate.id,
      newValues: { markedChildId: newerId, notes },
      ipAddress: ip,
      userAgent,
    });
  } else {
    await logAudit({
      userId: user.id,
      action: decision === "not_duplicate" ? "DUPLICATE_NOT_DUPLICATE" : "DUPLICATE_DISMISSED",
      entityType: "child_duplicate_candidate",
      entityId: candidate.id,
      newValues: { decision, notes },
      ipAddress: ip,
      userAgent,
    });
  }

  // Inform both record creators (no sensitive details in the message).
  for (const childId of [candidate.childId, candidate.possibleChildId]) {
    const childRows = await db
      .select({ createdBy: children.createdBy, childCode: children.childCode })
      .from(children)
      .where(eq(children.id, childId))
      .limit(1);
    const child = childRows[0];
    if (child) {
      await notify({
        userId: child.createdBy,
        type: "duplicate",
        title: `Duplicate review: ${decision.replace(/_/g, " ")}`,
        message: `Record ${child.childCode} was reviewed (${decision.replace(/_/g, " ")}).`,
        link: `/children/${childId}`,
      });
    }
  }

  revalidatePath("/duplicates");
  revalidatePath("/children");
  return ok(`Marked as ${decision.replace(/_/g, " ")}.`);
}
