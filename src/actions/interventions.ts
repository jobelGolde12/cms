"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { children, interventionFollowups, interventions } from "@/db/schema";
import { getAuthorizedUser } from "@/lib/auth";
import { logAudit, notify } from "@/lib/audit";
import { interventionFormSchema, followupFormSchema } from "@/lib/schemas";
import { canAccessChild } from "@/lib/scope";
import { fail, ok, sessionMetadata, zodFieldErrors, type ActionState } from "./helpers";

const scrub = (value: string | null | undefined): string | null =>
  value && value.trim() ? value.trim() : null;

/** Create or update an intervention for a child. */
export async function saveIntervention(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getAuthorizedUser("interventions.create");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission to manage interventions.");

  const parsed = interventionFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  const { childId, interventionType, description, status, priority, startDate, targetDate } =
    parsed.data;

  const childRows = await db.select().from(children).where(eq(children.id, childId)).limit(1);
  const child = childRows[0];
  if (!child) return fail("Child record not found.");
  if (!canAccessChild(user, child)) return fail("This record is outside your scope.");

  const interventionId = String(formData.get("id") ?? "");

  if (interventionId) {
    await db
      .update(interventions)
      .set({
        interventionType,
        description,
        status,
        priority: scrub(priority),
        startDate: scrub(startDate),
        targetDate: scrub(targetDate),
        completedDate: status === "completed" ? new Date().toISOString().slice(0, 10) : null,
        updatedAt: new Date(),
      })
      .where(eq(interventions.id, interventionId));

    await logAudit({
      userId: user.id,
      action: "UPDATE_INTERVENTION",
      entityType: "intervention",
      entityId: interventionId,
      newValues: { childId, status },
      ipAddress: ip,
      userAgent,
    });
  } else {
    const newId = crypto.randomUUID();
    await db.insert(interventions).values({
      id: newId,
      childId,
      interventionType,
      description,
      status,
      priority: scrub(priority),
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
      newValues: { childId, interventionType, status },
      ipAddress: ip,
      userAgent,
    });
  }

  revalidatePath("/monitoring/interventions");
  revalidatePath(`/children/${childId}`);
  return ok("Intervention saved.");
}

/** Record a follow-up activity for an intervention. */
export async function saveFollowup(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getAuthorizedUser("interventions.update");
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

  const childRows = await db
    .select()
    .from(children)
    .where(eq(children.id, intervention.childId))
    .limit(1);
  const child = childRows[0];
  if (!child || !canAccessChild(user, child)) return fail("This record is outside your scope.");

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
      message: `A follow-up was recorded for an intervention (child record ${child.childCode}).`,
      link: `/children/${child.id}`,
    });
  }

  revalidatePath(`/children/${child.id}`);
  revalidatePath("/monitoring/interventions");
  return ok("Follow-up recorded.");
}
