"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { students } from "@/db/schema";
import { getAuthorizedUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { QR_ELIGIBLE_RECORD_STATUSES, type RecordStatus } from "@/lib/constants";
import { canAccessStudent } from "@/lib/scope";
import { createQrToken, deactivateStudentTokens } from "@/lib/qr";
import { fail, ok, sessionMetadata, type ActionState } from "./helpers";

/** Issue (rotate) an active QR verification token for a verified student. */
export async function generateQr(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("qr.verify");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission to manage QR codes.");

  const studentId = String(formData.get("studentId") ?? "");
  const rows = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
  const student = rows[0];
  if (!student) return fail("Record not found.");
  if (!(await canAccessStudent(user, { studentId }))) return fail("This record is outside your scope.");

  if (!QR_ELIGIBLE_RECORD_STATUSES.includes(student.recordStatus as RecordStatus)) {
    return fail("QR codes can only be generated for verified records.");
  }

  // The token is an opaque random reference — no personal information.
  await createQrToken(student.id, user.id, { ipAddress: ip, userAgent });

  await logAudit({
    userId: user.id,
    action: "VERIFY_QR",
    entityType: "student",
    entityId: student.id,
    newValues: { verificationType: "generate", studentNumber: student.studentNumber },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath(`/students/${student.id}`);
  revalidatePath("/qr");
  return ok("QR token generated. Any previous token is now superseded.");
}

/** Revoke all active QR tokens for a student (emergency revocation). */
export async function deactivateQr(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("qr.verify");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission.");

  const studentId = String(formData.get("studentId") ?? "");
  const rows = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
  const student = rows[0];
  if (!student) return fail("Record not found.");
  if (!(await canAccessStudent(user, { studentId }))) return fail("This record is outside your scope.");

  await deactivateStudentTokens(student.id, user.id);

  await logAudit({
    userId: user.id,
    action: "VERIFY_QR",
    entityType: "student",
    entityId: student.id,
    newValues: { verificationType: "revoke" },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath(`/students/${student.id}`);
  revalidatePath("/qr");
  return ok("QR tokens revoked.");
}
