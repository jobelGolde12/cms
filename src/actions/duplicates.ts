"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { duplicateCandidates, students } from "@/db/schema";
import { getAuthorizedUser } from "@/lib/auth";
import { logAudit, notify } from "@/lib/audit";
import { duplicateReviewSchema } from "@/lib/schemas";
import { fail, ok, sessionMetadata, zodFieldErrors, type ActionState } from "./helpers";

/**
 * Human review of a duplicate candidate. Detection never marks a student as a
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
    .from(duplicateCandidates)
    .where(eq(duplicateCandidates.id, id))
    .limit(1);
  const candidate = rows[0];
  if (!candidate) return fail("Duplicate candidate not found.");

  await db
    .update(duplicateCandidates)
    .set({
      status: decision,
      reviewedBy: user.id,
      reviewNotes: notes || null,
      updatedAt: new Date(),
    })
    .where(eq(duplicateCandidates.id, candidate.id));

  if (decision === "confirmed_duplicate") {
    // Mark the newer record (the candidate that triggered detection) as duplicate.
    const studentRows = await db
      .select({ createdAt: students.createdAt })
      .from(students)
      .where(eq(students.id, candidate.studentId))
      .limit(1);
    const possibleRows = await db
      .select({ createdAt: students.createdAt })
      .from(students)
      .where(eq(students.id, candidate.possibleStudentId))
      .limit(1);

    const newerId =
      (studentRows[0]?.createdAt ?? 0) >= (possibleRows[0]?.createdAt ?? 0)
        ? candidate.studentId
        : candidate.possibleStudentId;

    await db
      .update(students)
      .set({ recordStatus: "marked_duplicate", updatedBy: user.id, updatedAt: new Date() })
      .where(eq(students.id, newerId));

    await logAudit({
      userId: user.id,
      action: "MARK_DUPLICATE",
      entityType: "duplicate_candidate",
      entityId: candidate.id,
      newValues: { markedStudentId: newerId, notes },
      ipAddress: ip,
      userAgent,
    });
  } else {
    await logAudit({
      userId: user.id,
      action: decision === "not_duplicate" ? "DUPLICATE_NOT_DUPLICATE" : "DUPLICATE_DISMISSED",
      entityType: "duplicate_candidate",
      entityId: candidate.id,
      newValues: { decision, notes },
      ipAddress: ip,
      userAgent,
    });
  }

  // Inform both record creators (no sensitive details in the message).
  for (const studentId of [candidate.studentId, candidate.possibleStudentId]) {
    const studentRows = await db
      .select({ createdBy: students.createdBy, studentNumber: students.studentNumber })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);
    const student = studentRows[0];
    if (student) {
      await notify({
        userId: student.createdBy,
        type: "duplicate",
        title: `Duplicate review: ${decision.replace(/_/g, " ")}`,
        message: `Record ${student.studentNumber} was reviewed (${decision.replace(/_/g, " ")}).`,
        link: `/students/${studentId}`,
      });
    }
  }

  revalidatePath("/duplicates");
  revalidatePath("/students");
  revalidatePath("/dashboard");
  return ok(`Marked as ${decision.replace(/_/g, " ")}.`);
}
