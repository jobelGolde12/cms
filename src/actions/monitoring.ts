"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { children, monitoringFollowups } from "@/db/schema";
import { getAuthorizedUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { followupFormSchema } from "@/lib/schemas";
import { canAccessChild } from "@/lib/scope";
import type { FollowupStatus } from "@/lib/constants";
import { fail, ok, sessionMetadata, zodFieldErrors, type ActionState } from "./helpers";

/** Create or update a monitoring follow-up on a child record. */
export async function saveFollowup(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getAuthorizedUser("monitoring.manage");
  const { ip } = await sessionMetadata();
  if (!user) return fail("You do not have permission to manage monitoring.");

  const parsed = followupFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  const { childId, category, status, notes, followupDate } = parsed.data;

  const childRows = await db.select().from(children).where(eq(children.id, childId)).limit(1);
  const child = childRows[0];
  if (!child) return fail("Child record not found.");
  if (!canAccessChild(user, child)) return fail("This record is outside your scope.");

  const followupId = String(formData.get("id") ?? "");
  const resolvedAt = status === "resolved" ? new Date() : null;

  if (followupId) {
    await db
      .update(monitoringFollowups)
      .set({
        category,
        status,
        notes: notes || null,
        followupDate: followupDate || null,
        resolvedAt,
        updatedAt: new Date(),
      })
      .where(eq(monitoringFollowups.id, followupId));

    await logAudit({
      userId: user.id,
      userRole: user.role,
      action: "monitoring.update",
      entity: "monitoring_followup",
      entityId: followupId,
      result: "success",
      metadata: { childId, status },
      ip,
    });
  } else {
    const newId = crypto.randomUUID();
    await db.insert(monitoringFollowups).values({
      id: newId,
      childId,
      category,
      status,
      notes: notes || null,
      followupDate: followupDate || null,
      assignedTo: user.id,
      resolvedAt,
      createdBy: user.id,
    });

    await logAudit({
      userId: user.id,
      userRole: user.role,
      action: "monitoring.create",
      entity: "monitoring_followup",
      entityId: newId,
      result: "success",
      metadata: { childId, category, status },
      ip,
    });
  }

  revalidatePath("/monitoring");
  revalidatePath(`/children/${childId}`);
  return ok("Follow-up saved.");
}

/** Quickly move a follow-up between statuses (open/in_progress/follow_up/resolved). */
export async function updateFollowupStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getAuthorizedUser("monitoring.manage");
  const { ip } = await sessionMetadata();
  if (!user) return fail("You do not have permission.");

  const followupId = String(formData.get("id") ?? "");
  const rawStatus = String(formData.get("status") ?? "");
  const rows = await db.select().from(monitoringFollowups).where(eq(monitoringFollowups.id, followupId)).limit(1);
  const row = rows[0];
  if (!row) return fail("Follow-up not found.");

  const status = rawStatus as FollowupStatus;
  await db
    .update(monitoringFollowups)
    .set({
      status,
      resolvedAt: status === "resolved" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(monitoringFollowups.id, row.id));

  await logAudit({
    userId: user.id,
    userRole: user.role,
    action: "monitoring.status",
    entity: "monitoring_followup",
    entityId: row.id,
    result: "success",
    metadata: { status },
    ip,
  });

  revalidatePath("/monitoring");
  return ok("Status updated.");
}