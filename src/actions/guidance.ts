"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { behaviorCategories, behaviorRecords, students } from "@/db/schema";
import { getAuthorizedUser, type SessionUser } from "@/lib/auth";
import { canAccessStudent } from "@/lib/scope";
import { logAudit } from "@/lib/audit";
import { behaviorFormSchema } from "@/lib/schemas";
import { fail, ok, sessionMetadata, zodFieldErrors, type ActionState } from "./helpers";
import type { Role } from "@/lib/constants";

/**
 * Guidance Office incident actions.
 *
 * Authorization chain (re-established server-side on every call — never
 * trusted from the client):
 *
 *   behavior.write + role ∈ (guidance | admin | school_admin | teacher)  →  who
 *   incident student inside the caller's own section scope                 →  row scope
 *   student active in the registry                                        →  roster integrity
 *   category exists (data-driven incident types)                          →  vocabulary integrity
 *
 * Confidentiality: incidents recorded through the Guidance Office module are
 * ALWAYS confidential — they are readable only by the guidance, admin and
 * adviser (teacher) roles, enforced by `confidentialBehaviorFilter` in every
 * query, so no other teacher/registrar/nurse view (or direct API call) can reach
 * them.
 *
 * The Adviser (teacher) role holds the Guidance Office page as the same
 * module the Guidance Counselor opens — but for the students of THEIR OWN
 * advised sections only (row-scoped through student scope).
 */

/**
 * The Guidance Office module is open to the Guidance Counselor and to the
 * Adviser (teacher) — the adviser may manage incidents of the students in
 * THEIR OWN advised sections only (row scope enforced by `canAccessStudent`).
 * The admin tier may additionally manage anything.
 */
const GUIDANCE_OFFICE_ROLES: readonly Role[] = ["guidance", "teacher"];

function holdsRole(user: SessionUser | null, roles: readonly Role[]): boolean {
  if (!user) return false;
  const held = user.roles.length > 0 ? user.roles : [user.role];
  return roles.some((role) => held.includes(role));
}

function incidentAuthor(user: SessionUser | null): boolean {
  return holdsRole(user, [...GUIDANCE_OFFICE_ROLES, "admin", "school_admin"]);
}

async function guardIncidentAuthor() {
  const user = await getAuthorizedUser("behavior.write");
  if (!user) {
    return { ok: false as const, error: "You do not have permission to manage incident records." };
  }
  if (!incidentAuthor(user)) {
    return { ok: false as const, error: "Only the Guidance Counselor, the Adviser, or an administrator can manage incident records." };
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
  // Row scope: the Adviser may only record an incident for a student inside
  // one of their own advised sections — the registry search cannot reach other
  // sections and a crafted form post is rejected here (school-wide roles pass).
  if (!(await canAccessStudent(user, { studentId }))) {
    return fail("This student is outside your scope.");
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
      // The stored record decides which student it belongs to: the submitted
      // studentId is never trusted for an update, so a caller cannot rewrite a
      // record that belongs to another student by passing its id.
      const existing = await db
        .select({
          id: behaviorRecords.id,
          studentId: behaviorRecords.studentId,
          confidential: behaviorRecords.confidential,
        })
        .from(behaviorRecords)
        .where(eq(behaviorRecords.id, recordId))
        .limit(1);
      if (!existing[0]) return fail("Incident not found.");
      if (existing[0].studentId !== studentId) {
        return fail("That incident belongs to a different student. Refresh the page and try again.");
      }
      // The Guidance Office module only manages its own confidential
      // incidents — a classroom behavior observation is edited in
      // /development/behavior by the teacher who owns it (admin tier excepted).
      if (!existing[0].confidential && holdsRole(user, GUIDANCE_OFFICE_ROLES)) {
        return fail("This is a classroom behavior record, not a Care Center incident.");
      }

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
        // guidance, the adviser (own sections) and the admin tier can ever read
        // them back.
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

/**
 * Remove an incident — Guidance Office roles only (the adviser manages the
 * incidents of the students they advise; the admin tier excepted).
 */
export async function removeGuidanceIncident(formData: FormData): Promise<ActionState> {
  const recordId = String(formData.get("id") ?? "");
  if (!recordId) return fail("Invalid remove request.");

  const guard = await guardIncidentAuthor();
  if (!guard.ok) return fail(guard.error);
  const user = guard.user;

  const rows = await db
    .select({
      id: behaviorRecords.id,
      studentId: behaviorRecords.studentId,
      confidential: behaviorRecords.confidential,
    })
    .from(behaviorRecords)
    .where(eq(behaviorRecords.id, recordId))
    .limit(1);
  const row = rows[0];
  if (!row) return fail("Incident not found.");
  // Row scope: an Adviser may remove only incidents belonging to students in
  // their own advised sections. Guidance and the admin tier retain school-wide
  // access. This check runs before deletion so a crafted record id cannot
  // reach another Adviser's section.
  if (!(await canAccessStudent(user, { studentId: row.studentId }))) {
    return fail("This incident is outside your scope.");
  }
  // Same domain rule as the update path: the Guidance Counselor (and the
  // Adviser managing the incidents of their own advised students) may only
  // remove confidential incidents of the Guidance Office module.
  if (!row.confidential && holdsRole(user, GUIDANCE_OFFICE_ROLES)) {
    return fail("This is a classroom behavior record, not a Care Center incident.");
  }

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
