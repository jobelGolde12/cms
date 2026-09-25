"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { childMonitoring, children } from "@/db/schema";
import { getAuthorizedUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { monitoringFormSchema } from "@/lib/schemas";
import { canAccessChild } from "@/lib/scope";
import { fail, ok, sessionMetadata, zodFieldErrors, type ActionState } from "./helpers";

/** Create or update a monitoring record for a child. */
export async function saveMonitoring(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getAuthorizedUser("monitoring.update");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission to manage monitoring.");

  const parsed = monitoringFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  const { childId, monitoringType, status, observedAt, remarks } = parsed.data;

  const childRows = await db.select().from(children).where(eq(children.id, childId)).limit(1);
  const child = childRows[0];
  if (!child) return fail("Child record not found.");
  if (!canAccessChild(user, child)) return fail("This record is outside your scope.");

  const recordId = String(formData.get("id") ?? "");

  if (recordId) {
    await db
      .update(childMonitoring)
      .set({
        monitoringType,
        status,
        observedAt: new Date(`${observedAt}T00:00:00Z`),
        remarks: remarks || null,
        updatedAt: new Date(),
      })
      .where(eq(childMonitoring.id, recordId));

    await logAudit({
      userId: user.id,
      action: "UPDATE_MONITORING",
      entityType: "child_monitoring",
      entityId: recordId,
      newValues: { childId, monitoringType, status },
      ipAddress: ip,
      userAgent,
    });
  } else {
    const newId = crypto.randomUUID();
    await db.insert(childMonitoring).values({
      id: newId,
      childId,
      monitoringType,
      status,
      observedAt: new Date(`${observedAt}T00:00:00Z`),
      recordedBy: user.id,
      remarks: remarks || null,
    });

    await logAudit({
      userId: user.id,
      action: "CREATE_MONITORING",
      entityType: "child_monitoring",
      entityId: newId,
      newValues: { childId, monitoringType, status },
      ipAddress: ip,
      userAgent,
    });
  }

  revalidatePath("/monitoring");
  revalidatePath(`/children/${childId}`);
  return ok("Monitoring record saved.");
}

/** Quickly move a monitoring record between statuses. */
export async function updateMonitoringStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getAuthorizedUser("monitoring.update");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission.");

  const recordId = String(formData.get("id") ?? "");
  const rawStatus = String(formData.get("status") ?? "");
  if (!["open", "in_progress", "resolved", "closed"].includes(rawStatus)) {
    return fail("Invalid status.");
  }

  const rows = await db
    .select()
    .from(childMonitoring)
    .where(eq(childMonitoring.id, recordId))
    .limit(1);
  const record = rows[0];
  if (!record) return fail("Monitoring record not found.");

  await db
    .update(childMonitoring)
    .set({ status: rawStatus, updatedAt: new Date() })
    .where(eq(childMonitoring.id, record.id));

  await logAudit({
    userId: user.id,
    action: "UPDATE_MONITORING",
    entityType: "child_monitoring",
    entityId: record.id,
    oldValues: { status: record.status },
    newValues: { status: rawStatus },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/monitoring");
  return ok("Status updated.");
}
