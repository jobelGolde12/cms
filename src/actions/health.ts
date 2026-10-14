"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { clinicalRecords, healthRecords, schoolYears, students } from "@/db/schema";
import { getAuthorizedUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { canAccessStudent } from "@/lib/scope";
import { clinicalRecordSchema, healthRecordSchema } from "@/lib/schemas";
import { fail, ok, sessionMetadata, zodFieldErrors, type ActionState } from "./helpers";

/**
 * Nurse-domain write actions. Every action re-checks authentication,
 * the `health.write`/`health.view` permission, and the student's row-level
 * scope server-side, so direct calls cannot bypass authorization.
 *
 * IMPORTANT: these actions can never modify a student's general personal
 * information — that is a `students.update` escalation the Nurse role does not
 * hold (see the permission matrix in documented/security).
 */

/** Convert decimal strings to numbers; blank/invalid → undefined. */
const num = (v: FormDataEntryValue | null): number | null => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/** BMI (kg/m²) — computed only when both fields are present and realistic. */
function computeBmi(weightKg: number | null, heightCm: number | null): number | null {
  if (weightKg == null || heightCm == null || heightCm <= 0) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

async function healthyContext(studentId: string, permission: "health.view" | "health.write") {
  const user = await getAuthorizedUser(permission);
  if (!user) return null;
  if (!(await canAccessStudent(user, { studentId }))) return null;
  return user;
}

async function currentSchoolYearId(): Promise<string | null> {
  const rows = await db
    .select({ id: schoolYears.id })
    .from(schoolYears)
    .where(eq(schoolYears.isCurrent, true))
    .limit(1);
  return rows[0]?.id ?? null;
}

/** Create or update a nutritional status record (health.write). */
export async function saveHealthRecord(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = healthRecordSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  }
  const { studentId, measurementDate, remarks } = parsed.data;

  const user = await healthyContext(studentId, "health.write");
  if (!user) return fail("You do not have permission to record health data.");
  const { ip, userAgent } = await sessionMetadata();

  const weightKg = num(formData.get("weightKg"));
  const heightCm = num(formData.get("heightCm"));
  if (weightKg != null && (weightKg < 5 || weightKg > 200)) {
    return fail("Weight must be between 5 and 200 kg.");
  }
  if (heightCm != null && (heightCm < 60 || heightCm > 250)) {
    return fail("Height must be between 60 and 250 cm.");
  }

  const nutritionalStatusRaw = String(formData.get("nutritionalStatus") ?? "").trim();
  const nutritionalStatus =
    nutritionalStatusRaw === "normal" ||
    nutritionalStatusRaw === "wasted" ||
    nutritionalStatusRaw === "severely_wasted" ||
    nutritionalStatusRaw === "overweight" ||
    nutritionalStatusRaw === "obese"
      ? nutritionalStatusRaw
      : null;

  if (weightKg == null && heightCm == null && !nutritionalStatus) {
    return fail("Provide at least weight, height, or a nutritional status.");
  }

  const recordId = String(formData.get("id") ?? "").trim();
  const bmi = computeBmi(weightKg, heightCm);

  // Duplicate guard: reject a second measurement for the same student on the
  // same date (edit the existing record instead). Guarded only on create —
  // updates already target a specific record id.
  const studentExists = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);
  if (!studentExists[0]) return fail("Invalid student reference.");

  if (!recordId) {
    const duplicate = await db
      .select({ id: healthRecords.id })
      .from(healthRecords)
      .where(and(eq(healthRecords.studentId, studentId), eq(healthRecords.measurementDate, measurementDate)))
      .limit(1);
    if (duplicate[0]) {
      return fail("A health record already exists for this student and date. Edit it instead.");
    }
  }

  try {
    if (recordId) {
      const existing = await db
        .select()
        .from(healthRecords)
        .where(eq(healthRecords.id, recordId))
        .limit(1);
      if (!existing[0]) return fail("Record not found.");
      if (existing[0].studentId !== studentId) return fail("Record mismatch.");

      await db
        .update(healthRecords)
        .set({
          measurementDate,
          weightKg,
          heightCm,
          bmi,
          nutritionalStatus,
          remarks: remarks || null,
          updatedAt: new Date(),
        })
        .where(eq(healthRecords.id, recordId));
    } else {
      await db.insert(healthRecords).values({
        id: crypto.randomUUID(),
        studentId,
        schoolYearId: await currentSchoolYearId(),
        measurementDate,
        weightKg,
        heightCm,
        bmi,
        nutritionalStatus,
        remarks: remarks || null,
        recordedBy: user.id,
      });
    }
  } catch (error) {
    console.error("[saveHealthRecord] failed", error);
    return fail("Could not save the health record. Please try again.");
  }

  await logAudit({
    userId: user.id,
    action: recordId ? "UPDATE_HEALTH_RECORD" : "CREATE_HEALTH_RECORD",
    entityType: "health_record",
    entityId: recordId || studentId,
    newValues: { studentId, measurementDate, nutritionalStatus },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/health");
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/dashboard");
  return ok("Health record saved.");
}

/** Create or update a clinical record (health.write). */
export async function saveClinicalRecord(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = clinicalRecordSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  }
  const { studentId, date, category, description, assessment, actionTaken, remarks } = parsed.data;

  const user = await healthyContext(studentId, "health.write");
  if (!user) return fail("You do not have permission to record clinical data.");
  const { ip, userAgent } = await sessionMetadata();

  const recordId = String(formData.get("id") ?? "").trim();

  try {
    if (recordId) {
      const existing = await db
        .select()
        .from(clinicalRecords)
        .where(eq(clinicalRecords.id, recordId))
        .limit(1);
      if (!existing[0]) return fail("Record not found.");
      if (existing[0].studentId !== studentId) return fail("Record mismatch.");

      await db
        .update(clinicalRecords)
        .set({
          date,
          category,
          description,
          assessment: assessment || null,
          actionTaken: actionTaken || null,
          remarks: remarks || null,
          updatedAt: new Date(),
        })
        .where(eq(clinicalRecords.id, recordId));
    } else {
      await db.insert(clinicalRecords).values({
        id: crypto.randomUUID(),
        studentId,
        date,
        category,
        description,
        assessment: assessment || null,
        actionTaken: actionTaken || null,
        remarks: remarks || null,
        recordedBy: user.id,
      });
    }
  } catch (error) {
    console.error("[saveClinicalRecord] failed", error);
    return fail("Could not save the clinical record. Please try again.");
  }

  await logAudit({
    userId: user.id,
    action: recordId ? "UPDATE_CLINICAL_RECORD" : "CREATE_CLINICAL_RECORD",
    entityType: "clinical_record",
    entityId: recordId || studentId,
    newValues: { studentId, date, category },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/health");
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/dashboard");
  return ok("Clinical record saved.");
}
