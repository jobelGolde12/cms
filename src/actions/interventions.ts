"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { interventionFollowups, interventions, students } from "@/db/schema";
import { getAuthorizedUser } from "@/lib/auth";
import { logAudit, notify } from "@/lib/audit";
import { interventionFormSchema, followupFormSchema } from "@/lib/schemas";
import { canAccessStudent } from "@/lib/scope";
import { fail, ok, sessionMetadata, zodFieldErrors, type ActionState } from "./helpers";

const scrub = (value: string | null | undefined): string | null =>
  value && value.trim() ? value.trim() : null;

/** Create or update an intervention for a student. */
export async function saveIntervention(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getAuthorizedUser("interventions.write");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission to manage interventions.");

  const parsed = interventionFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  const { studentId, interventionType, description, status, startDate, targetDate, outcome } =
    parsed.data;

  const studentRows = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
  const student = studentRows[0];
  if (!student) return fail("Student record not found.");
  if (!(await canAccessStudent(user, { studentId }))) return fail("This record is outside your scope.");

  const interventionId = String(formData.get("id") ?? "");

  if (interventionId) {
    await db
      .update(interventions)
      .set({
        interventionType,
        description,
        status,
        startDate: scrub(startDate),
        targetDate: scrub(targetDate),
        outcome: scrub(outcome),
        completedDate: status === "completed" ? new Date().toISOString().slice(0, 10) : null,
        updatedAt: new Date(),
      })
      .where(eq(interventions.id, interventionId));

    await logAudit({
      userId: user.id,
      action: "UPDATE_INTERVENTION",
      entityType: "intervention",
      entityId: interventionId,
      newValues: { studentId, status },
      ipAddress: ip,
      userAgent,
    });
  } else {
    const newId = crypto.randomUUID();
    await db.insert(interventions).values({
      id: newId,
      studentId,
      interventionType,
      description,
      status,
      startDate: scrub(startDate),
      targetDate: scrub(targetDate),
      assignedTo: user.id,
      createdBy: user.id,
    });

    await logAudit({
      userId: user.id,
      action: "CREATE_INTERVENTION",
      entityType: "intervention",
      entityId: newId,
      newValues: { studentId, interventionType, status },
      ipAddress: ip,
      userAgent,
    });
  }

  revalidatePath("/development/interventions");
  revalidatePath(`/students/${studentId}`);
  return ok("Intervention saved.");
}

/** Record a follow-up activity for an intervention. */
export async function saveFollowup(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getAuthorizedUser("interventions.write");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission to record follow-ups.");

  const parsed = followupFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  const { interventionId, followUpDate, status, notes } = parsed.data;

  const rows = await db
    .select()
    .from(interventions)
    .where(eq(interventions.id, interventionId))
    .limit(1);
  const intervention = rows[0];
  if (!intervention) return fail("Intervention not found.");

  const studentRows = await db
    .select()
    .from(students)
    .where(eq(students.id, intervention.studentId))
    .limit(1);
  const student = studentRows[0];
  if (!student || !(await canAccessStudent(user, { studentId: student.id }))) {
    return fail("This record is outside your scope.");
  }

  const newId = crypto.randomUUID();
  await db.insert(interventionFollowups).values({
    id: newId,
    interventionId,
    followUpDate,
    status,
    notes: scrub(notes),
    recordedBy: user.id,
  });

  await logAudit({
    userId: user.id,
    action: "CREATE_FOLLOWUP",
    entityType: "intervention_followup",
    entityId: newId,
    newValues: { interventionId, status, followUpDate },
    ipAddress: ip,
    userAgent,
  });

  // Notify the assigned user (if any) about the follow-up.
  if (intervention.assignedTo && intervention.assignedTo !== user.id) {
    await notify({
      userId: intervention.assignedTo,
      type: "followup",
      title: "Intervention follow-up recorded",
      message: `A follow-up was recorded for an intervention (student ${student.studentNumber}).`,
      link: `/students/${student.id}`,
    });
  }

  revalidatePath(`/students/${student.id}`);
  revalidatePath("/development/interventions");
  return ok("Follow-up recorded.");
}
