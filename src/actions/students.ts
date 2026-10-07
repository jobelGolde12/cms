"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  duplicateCandidates,
  guardians,
  recordVerifications,
  studentGuardians,
  students,
  type NewStudent,
} from "@/db/schema";
import { getAuthorizedUser, getCurrentUser } from "@/lib/auth";
import { logAudit, notify } from "@/lib/audit";
import { nextStudentNumber } from "@/lib/student-number";
import { canAccessStudent, canEditStudent } from "@/lib/scope";
import { studentFormSchema, verificationReviewSchema } from "@/lib/schemas";
import { refreshDuplicateCandidates } from "@/lib/duplicates";
import { deactivateStudentTokens } from "@/lib/qr";
import type { RecordStatus } from "@/lib/constants";
import { REVIEW_DECISION_TO_RECORD_STATUS } from "@/lib/workflow";
import { fail, ok, sessionMetadata, zodFieldErrors, type ActionState } from "./helpers";

const scrub = (value: string | undefined | null | ""): string | null =>
  value && String(value).trim() ? String(value).trim() : null;

function parseStudentForm(formData: FormData) {
  const entries = Object.fromEntries(formData.entries());
  return {
    intent: entries.intent === "submit" ? ("submit" as const) : ("draft" as const),
    parsed: studentFormSchema.safeParse(entries),
  };
}

/** Guardian payload present in the submission (first+last name required). */
function guardianFromForm(v: {
  guardianFirstName?: string;
  guardianMiddleName?: string;
  guardianLastName?: string;
  guardianRelationship?: string;
  guardianContactNumber?: string;
  guardianEmail?: string;
}) {
  const first = v.guardianFirstName?.trim();
  const last = v.guardianLastName?.trim();
  if (!first || !last) return null;
  return {
    firstName: first,
    middleName: scrub(v.guardianMiddleName),
    lastName: last,
    relationship:
      v.guardianRelationship === "mother" ||
      v.guardianRelationship === "father" ||
      v.guardianRelationship === "guardian"
        ? v.guardianRelationship
        : "guardian",
    contactNumber: scrub(v.guardianContactNumber),
    email: scrub(v.guardianEmail),
  };
}

/** Create a new student record. `intent=draft` saves; `intent=submit` queues for verification. */
export async function createStudent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("students.create");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission to create records.");

  const form = parseStudentForm(formData);
  if (!form.parsed.success) {
    return fail("Please fix the highlighted fields.", zodFieldErrors(form.parsed.error.issues));
  }
  const v = form.parsed.data;

  const targetStatus: RecordStatus = form.intent === "submit" ? "pending_validation" : "draft";
  const studentId = crypto.randomUUID();
  const guardian = guardianFromForm(v);

  // Sequential number generation with a single retry on (rare) collision.
  let number = await nextStudentNumber();
  let inserted = false;
  for (let attempt = 0; attempt < 2 && !inserted; attempt++) {
    if (attempt > 0) number = await nextStudentNumber();
    try {
      await db.transaction(async (tx) => {
        const values: NewStudent = {
          id: studentId,
          studentNumber: number,
          firstName: v.firstName,
          middleName: scrub(v.middleName),
          lastName: v.lastName,
          suffix: scrub(v.suffix),
          birthDate: v.birthDate,
          sex: v.sex,
          contactNumber: scrub(v.contactNumber),
          address: scrub(v.address),
          status: "active",
          recordStatus: targetStatus,
          createdBy: user.id,
          updatedBy: user.id,
        };
        await tx.insert(students).values(values);

        // Current verification record (history table, not a boolean).
        if (form.intent === "submit") {
          await tx.insert(recordVerifications).values({
            id: crypto.randomUUID(),
            studentId,
            submittedBy: user.id,
            status: "pending",
            remarks: "Submitted for verification",
            submittedAt: new Date(),
          });
        }

        // Primary guardian (optional on the form).
        if (guardian) {
          const guardianId = crypto.randomUUID();
          await tx.insert(guardians).values({ id: guardianId, ...guardian });
          await tx.insert(studentGuardians).values({ studentId, guardianId, isPrimary: true });
        }
      });
      inserted = true;
    } catch (error) {
      console.error("[createStudent] insert failed", error);
      inserted = false;
    }
  }
  if (!inserted) return fail("Could not create the record. Please try again.");

  // Duplicate candidates are proposals only — human review decides.
  await refreshDuplicateCandidates(studentId, {
    firstName: v.firstName,
    lastName: v.lastName,
    middleName: v.middleName || null,
    birthDate: v.birthDate,
    sex: v.sex,
  });

  await logAudit({
    userId: user.id,
    action: form.intent === "submit" ? "SUBMIT_VERIFICATION" : "CREATE_STUDENT",
    entityType: "student",
    entityId: studentId,
    newValues: { studentNumber: number, recordStatus: targetStatus },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/students");
  revalidatePath("/verification");
  revalidatePath("/dashboard");
  return ok(
    form.intent === "submit" ? "Record submitted for verification." : "Draft saved.",
    `/students/${studentId}`,
  );
}

/** Update an existing student record (draft/needs_correction are editable). */
export async function updateStudent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("students.update");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission to edit records.");

  const studentId = String(formData.get("studentId") ?? "");
  if (!studentId) return fail("Missing record identifier.");

  const rows = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
  const student = rows[0];
  if (!student) return fail("Record not found.");
  if (!(await canEditStudent(user, { studentId }))) return fail("You cannot edit this record.");

  const form = parseStudentForm(formData);
  if (!form.parsed.success) {
    return fail("Please fix the highlighted fields.", zodFieldErrors(form.parsed.error.issues));
  }
  const v = form.parsed.data;

  const isResubmit = student.recordStatus === "needs_correction" && form.intent === "submit";
  const isSubmitFromDraft = student.recordStatus === "draft" && form.intent === "submit";
  const targetStatus: RecordStatus = isResubmit || isSubmitFromDraft
    ? "pending_validation"
    : (student.recordStatus as RecordStatus);

  const guardian = guardianFromForm(v);

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(students)
        .set({
          firstName: v.firstName,
          middleName: scrub(v.middleName),
          lastName: v.lastName,
          suffix: scrub(v.suffix),
          birthDate: v.birthDate,
          sex: v.sex,
          contactNumber: scrub(v.contactNumber),
          address: scrub(v.address),
          recordStatus: targetStatus,
          updatedBy: user.id,
          updatedAt: new Date(),
        })
        .where(eq(students.id, studentId));

      // Guardian: supersede the primary link with a new guardian row when the
      // form provides one — previous links are preserved as history.
      if (guardian) {
        const guardianId = crypto.randomUUID();
        await tx.insert(guardians).values({ id: guardianId, ...guardian });
        await tx
          .update(studentGuardians)
          .set({ isPrimary: false })
          .where(eq(studentGuardians.studentId, studentId));
        await tx.insert(studentGuardians).values({ studentId, guardianId, isPrimary: true });
      }

      if (isResubmit || isSubmitFromDraft) {
        await tx.insert(recordVerifications).values({
          id: crypto.randomUUID(),
          studentId,
          submittedBy: user.id,
          status: "pending",
          remarks: isResubmit ? "Resubmitted after corrections" : "Submitted for verification",
          submittedAt: new Date(),
        });
      }
    });
  } catch (error) {
    console.error("[updateStudent] update failed", error);
    return fail("Could not update the record. Please try again.");
  }

  // Edit invalidates previously issued QR tokens (data changed).
  if (isResubmit || student.recordStatus === "verified") {
    await deactivateStudentTokens(studentId, user.id);
  }

  await refreshDuplicateCandidates(studentId, {
    firstName: v.firstName,
    lastName: v.lastName,
    middleName: v.middleName || null,
    birthDate: v.birthDate,
    sex: v.sex,
  });

  await logAudit({
    userId: user.id,
    action: "UPDATE_STUDENT",
    entityType: "student",
    entityId: studentId,
    oldValues: { recordStatus: student.recordStatus },
    newValues: { recordStatus: targetStatus },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
  return ok("Record updated.", isResubmit ? "/verification" : `/students/${studentId}`);
}

/** Verifier decision on a queued record. Writes verification history. */
export async function reviewVerification(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("verification.review");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission to verify records.");

  const parsed = verificationReviewSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail("Invalid review.", zodFieldErrors(parsed.error.issues));
  const { studentId, decision, remarks } = parsed.data;

  const rows = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
  const student = rows[0];
  if (!student) return fail("Record not found.");
  if (!(await canAccessStudent(user, { studentId }))) return fail("This record is outside your scope.");
  if (student.recordStatus !== "pending_validation") {
    return fail("This record is not in the verification queue.");
  }

  const verificationRows = await db
    .select()
    .from(recordVerifications)
    .where(and(eq(recordVerifications.studentId, studentId), eq(recordVerifications.status, "pending")))
    .limit(1);
  const verification = verificationRows[0];
  if (!verification) return fail("No pending verification found for this record.");

  // `rejected` is a verification-history status only — the student row gets the
  // canonical record_status via the workflow map (marked_duplicate).
  const nextRecordStatus: RecordStatus = REVIEW_DECISION_TO_RECORD_STATUS[decision];

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(recordVerifications)
        .set({
          status: decision,
          reviewedBy: user.id,
          remarks: remarks || null,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(recordVerifications.id, verification.id));

      await tx
        .update(students)
        .set({
          recordStatus: nextRecordStatus,
          updatedBy: user.id,
          updatedAt: new Date(),
        })
        .where(eq(students.id, studentId));
    });
  } catch (error) {
    console.error("[reviewVerification] failed", error);
    return fail("Could not record the review. Please try again.");
  }

  await logAudit({
    userId: user.id,
    action: decision === "approved" ? "APPROVE_VERIFICATION" : decision === "rejected" ? "REJECT_VERIFICATION" : "RETURN_VERIFICATION",
    entityType: "student",
    entityId: studentId,
    oldValues: { recordStatus: student.recordStatus },
    newValues: { recordStatus: nextRecordStatus },
    ipAddress: ip,
    userAgent,
  });

  // Notify the encoder (no sensitive data in the message body).
  await notify({
    userId: student.createdBy,
    type: decision === "approved" ? "approved" : "correction",
    title: decision === "approved" ? "Record approved" : `Record ${decision.replace(/_/g, " ")}`,
    message: `Record ${student.studentNumber} was ${decision === "approved" ? "approved" : decision.replace(/_/g, " ")}${remarks ? `: ${remarks}` : ""}.`,
    link: `/students/${studentId}`,
  });

  revalidatePath("/verification");
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/students");
  revalidatePath("/dashboard");
  return ok(decision === "approved" ? "Record approved." : `Record marked ${decision.replace(/_/g, " ")}.`);
}

/** FormData-only wrapper for plain <form action={…}> usage. */
export async function reviewVerificationForm(formData: FormData): Promise<void> {
  await reviewVerification({ ok: false, error: "" }, formData);
}

/** FormData-only wrapper so client components can bind archiveStudent to a form. */
export async function archiveStudentForm(formData: FormData): Promise<void> {
  await archiveStudent({ ok: false, error: "" }, formData);
}

/** Admin only: re-open a verified record back into the verification queue. */
export async function reopenStudent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("verification.review");
  const { ip, userAgent } = await sessionMetadata();
  if (!user || user.role !== "admin") return fail("Only administrators can re-open verified records.");

  const studentId = String(formData.get("studentId") ?? "");
  const rows = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
  const student = rows[0];
  if (!student) return fail("Record not found.");
  if (student.recordStatus !== "verified") return fail("Only verified records can be re-opened.");

  await db.transaction(async (tx) => {
    await tx
      .update(students)
      .set({ recordStatus: "pending_validation", updatedBy: user.id, updatedAt: new Date() })
      .where(eq(students.id, studentId));

    await tx.insert(recordVerifications).values({
      id: crypto.randomUUID(),
      studentId,
      submittedBy: user.id,
      status: "pending",
      remarks: "Re-opened for re-verification",
      submittedAt: new Date(),
    });
  });

  await logAudit({
    userId: user.id,
    action: "REOPEN_VERIFICATION",
    entityType: "student",
    entityId: studentId,
    oldValues: { recordStatus: "verified" },
    newValues: { recordStatus: "pending_validation" },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/students");
  revalidatePath("/verification");
  revalidatePath("/dashboard");
  return ok("Record re-opened for verification.", "/verification");
}

/**
 * Archive (soft delete) a record. Historical records are never physically
 * deleted — `status` flips to archived and QR tokens are revoked.
 */
export async function archiveStudent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("students.archive");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission to archive records.");

  const studentId = String(formData.get("studentId") ?? "");
  const rows = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
  const student = rows[0];
  if (!student) return fail("Record not found.");
  if (!(await canAccessStudent(user, { studentId }))) return fail("This record is outside your scope.");

  await db
    .update(students)
    .set({ status: "archived", updatedBy: user.id, updatedAt: new Date() })
    .where(eq(students.id, studentId));

  await deactivateStudentTokens(studentId, user.id);

  await logAudit({
    userId: user.id,
    action: "ARCHIVE_STUDENT",
    entityType: "student",
    entityId: studentId,
    oldValues: { status: student.status },
    newValues: { status: "archived" },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/dashboard");
  return ok("Record archived. It is retained for history but hidden from active lists.");
}

/** Convenience for UI: current user context check used by client forms. */
export async function canCurrentUserCreateStudents(): Promise<boolean> {
  const user = await getCurrentUser();
  return Boolean(user && user.role);
}

// Re-export for form components needing the duplicate pair count for a student.
export async function pendingDuplicateCount(studentId: string): Promise<number> {
  const rows = await db
    .select({ id: duplicateCandidates.id })
    .from(duplicateCandidates)
    .where(
      and(
        eq(duplicateCandidates.studentId, studentId),
        eq(duplicateCandidates.status, "pending"),
      ),
    );
  return rows.length;
}
