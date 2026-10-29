"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { behaviorCategories, behaviorRecords, students } from "@/db/schema";
import { getAuthorizedUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { behaviorFormSchema } from "@/lib/schemas";
import { fail, ok, sessionMetadata, zodFieldErrors, type ActionState } from "./helpers";

/**
 * Guidance Counselor incident actions.
 *
 * Authorization chain (re-established server-side on every call — never
 * trusted from the client):
 *
 *   behavior.write + role ∈ (guidance | admin | school_admin)  →  who may record
 *   student active in the registry                              →  roster integrity
 *   category exists (data-driven incident types)                →  vocabulary integrity
 *
 * Confidentiality: incidents recorded through the Guidance Office module are
 * ALWAYS confidential — they are readable only by the guidance role and the
 * admin tier, enforced by `confidentialBehaviorFilter` in every query, so no
 * teacher/adviser/registrar/nurse view (or direct API call) can reach them.
 */

function incidentAuthor(user: { role: string } | null): boolean {
  return (
    user?.role === "guidance" ||
    user?.role === "admin" ||
    user?.role === "school_admin"
  );
}

async function guardIncidentAuthor() {
  const user = await getAuthorizedUser("behavior.write");
  if (!user) {
    return { ok: false as const, error: "You do not have permission to manage incident records." };
  }
  if (!incidentAuthor(user)) {
    return { ok: false as const, error: "Only the Guidance Counselor (or an administrator) can manage incident records." };
  }
  return { ok: true as const, user };
}

export async function saveGuidanceIncident(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = behaviorFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  }
  const { studentId, categoryId, date, description, severity, followUp, status } = parsed.data;

  const guard = await guardIncidentAuthor();
  if (!guard.ok) return fail(guard.error);
  const user = guard.user;

  // Roster integrity: the incident must attach to a real, active student.
  const studentRows = await db
    .select({ id: students.id, status: students.status })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);
  const student = studentRows[0];
  if (!student) return fail("Student not found.");
  if (student.status !== "active") {
    return fail("Incidents can only be recorded for active students.");
  }

  // Vocabulary integrity: incident types are data rows, never free text ids.
  const categoryRows = await db
    .select({ id: behaviorCategories.id, kind: behaviorCategories.kind })
    .from(behaviorCategories)
    .where(eq(behaviorCategories.id, categoryId))
    .limit(1);
  if (!categoryRows[0]) return fail("Select a valid incident type.");

  const recordId = String(formData.get("id") ?? "");
  const { ip, userAgent } = await sessionMetadata();

  try {
    if (recordId) {
      const existing = await db
        .select({ id: behaviorRecords.id })
        .from(behaviorRecords)
        .where(eq(behaviorRecords.id, recordId))
        .limit(1);
      if (!existing[0]) return fail("Incident not found.");

      await db
        .update(behaviorRecords)
        .set({
          categoryId,
          date,
          description,
          severity: severity?.trim() ? severity.trim() : null,
          followUp: followUp?.trim() ? followUp.trim() : null,
          status,
          updatedAt: new Date(),
        })
        .where(eq(behaviorRecords.id, recordId));

      await logAudit({
        userId: user.id,
        action: "SAVE_GUIDANCE_INCIDENT",
        entityType: "behavior_record",
        entityId: recordId,
        newValues: { studentId, categoryId, date, status, updated: true },
        ipAddress: ip,
        userAgent,
      });
    } else {
      await db.insert(behaviorRecords).values({
        id: crypto.randomUUID(),
        studentId,
        categoryId,
        date,
        description,
        severity: severity?.trim() ? severity.trim() : null,
        followUp: followUp?.trim() ? followUp.trim() : null,
        status,
        // Guidance Office records are confidential by default (spec): only
        // guidance + the admin tier can ever read them back.
        confidential: true,
        recordedBy: user.id,
      });

      await logAudit({
        userId: user.id,
        action: "SAVE_GUIDANCE_INCIDENT",
        entityType: "behavior_record",
        entityId: studentId,
        newValues: { studentId, categoryId, date, status, confidential: true },
        ipAddress: ip,
        userAgent,
      });
    }
  } catch (error) {
    console.error("[saveGuidanceIncident] failed", error);
    return fail("Could not save the incident record. Please try again.");
  }

  revalidatePath("/guidance");
  revalidatePath(`/guidance/incidents/`);
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/development/behavior");
  return ok(recordId ? "Incident updated." : "Incident recorded.");
}

/** Remove an incident draft — admin-tier + guidance only, never teachers. */
export async function removeGuidanceIncident(formData: FormData): Promise<ActionState> {
  const recordId = String(formData.get("id") ?? "");
  if (!recordId) return fail("Invalid remove request.");

  const guard = await guardIncidentAuthor();
  if (!guard.ok) return fail(guard.error);
  const user = guard.user;

  const rows = await db
    .select({ id: behaviorRecords.id, studentId: behaviorRecords.studentId })
    .from(behaviorRecords)
    .where(eq(behaviorRecords.id, recordId))
    .limit(1);
  const row = rows[0];
  if (!row) return fail("Incident not found.");

  const { ip, userAgent } = await sessionMetadata();
  try {
    await db.delete(behaviorRecords).where(eq(behaviorRecords.id, recordId));
  } catch (error) {
    console.error("[removeGuidanceIncident] failed", error);
    return fail("Could not remove the incident record. Please try again.");
  }

  await logAudit({
    userId: user.id,
    action: "REMOVE_GUIDANCE_INCIDENT",
    entityType: "behavior_record",
    entityId: recordId,
    newValues: { studentId: row.studentId },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/guidance");
  revalidatePath(`/students/${row.studentId}`);
  return ok("Incident record removed.");
}
