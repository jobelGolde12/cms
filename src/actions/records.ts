"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  assessments,
  attendanceRecords,
  behaviorRecords,
  studentEnrollments,
  studentGrades,
  students,
} from "@/db/schema";
import { getAuthorizedUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  assessmentFormSchema,
  attendanceFormSchema,
  behaviorFormSchema,
  enrollmentFormSchema,
  gradeFormSchema,
} from "@/lib/schemas";
import { canAccessStudent } from "@/lib/scope";
import type { Permission } from "@/lib/permissions";
import { fail, ok, sessionMetadata, zodFieldErrors, type ActionState } from "./helpers";

const scrub = (value: string | null | undefined): string | null =>
  value && value.trim() ? value.trim() : null;

/**
 * School-record write actions: enrollment, grades, attendance, behavior and
 * assessments. Every action re-checks the student scope server-side so direct
 * calls cannot bypass row-level authorization.
 */

async function studentInScope(
  studentId: string,
  permission: Permission,
): Promise<{ ok: true; studentId: string } | { ok: false; error: string }> {
  const user = await getAuthorizedUser(permission);
  if (!user) return { ok: false, error: "You do not have permission for this action." };
  if (!(await canAccessStudent(user, { studentId }))) {
    return { ok: false, error: "This record is outside your scope." };
  }
  return { ok: true, studentId };
}

/* -------------------------------------------------------------------------- */
/*  Enrollment                                                                */
/* -------------------------------------------------------------------------- */

export async function saveEnrollment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = enrollmentFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  const { studentId, schoolYearId, gradeLevelId, sectionId, status, enrollmentDate } = parsed.data;

  const guard = await studentInScope(studentId, "enrollment.manage");
  if (!guard.ok) return fail(guard.error);
  const { ip, userAgent } = await sessionMetadata();

  // One enrollment per student per school year (unique index backed).
  const existing = await db
    .select({ id: studentEnrollments.id })
    .from(studentEnrollments)
    .where(
      and(eq(studentEnrollments.studentId, studentId), eq(studentEnrollments.schoolYearId, schoolYearId)),
    )
    .limit(1);

  try {
    if (existing[0]) {
      await db
        .update(studentEnrollments)
        .set({
          gradeLevelId,
          sectionId,
          status,
          enrollmentDate: scrub(enrollmentDate),
          updatedAt: new Date(),
        })
        .where(eq(studentEnrollments.id, existing[0].id));
    } else {
      const user = (await getAuthorizedUser("enrollment.manage"))!;
      await db.insert(studentEnrollments).values({
        id: crypto.randomUUID(),
        studentId,
        schoolYearId,
        gradeLevelId,
        sectionId,
        status,
        enrollmentDate: scrub(enrollmentDate) ?? new Date().toISOString().slice(0, 10),
        recordedBy: user.id,
      });
    }
  } catch (error) {
    console.error("[saveEnrollment] failed", error);
    return fail("Could not save the enrollment. Please try again.");
  }

  await logAudit({
    action: "SAVE_ENROLLMENT",
    entityType: "student_enrollment",
    entityId: existing[0]?.id ?? studentId,
    newValues: { studentId, schoolYearId, gradeLevelId, sectionId, status },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/students");
  return ok("Enrollment saved.");
}

/* -------------------------------------------------------------------------- */
/*  Grades                                                                    */
/* -------------------------------------------------------------------------- */

export async function saveGrade(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = gradeFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  const { enrollmentId, subjectId, gradingPeriodId, grade, remarks } = parsed.data;

  const user = await getAuthorizedUser("grades.write");
  if (!user) return fail("You do not have permission to record grades.");

  const enrollmentRows = await db
    .select({ studentId: studentEnrollments.studentId })
    .from(studentEnrollments)
    .where(eq(studentEnrollments.id, enrollmentId))
    .limit(1);
  const enrollment = enrollmentRows[0];
  if (!enrollment) return fail("Enrollment not found.");
  if (!(await canAccessStudent(user, { studentId: enrollment.studentId }))) {
    return fail("This record is outside your scope.");
  }

  const { ip, userAgent } = await sessionMetadata();
  const existing = await db
    .select({ id: studentGrades.id })
    .from(studentGrades)
    .where(
      and(
        eq(studentGrades.enrollmentId, enrollmentId),
        eq(studentGrades.subjectId, subjectId),
        eq(studentGrades.gradingPeriodId, gradingPeriodId),
      ),
    )
    .limit(1);

  try {
    if (existing[0]) {
      await db
        .update(studentGrades)
        .set({ grade, remarks: scrub(remarks), recordedBy: user.id, updatedAt: new Date() })
        .where(eq(studentGrades.id, existing[0].id));
    } else {
      await db.insert(studentGrades).values({
        id: crypto.randomUUID(),
        enrollmentId,
        subjectId,
        gradingPeriodId,
        grade,
        remarks: scrub(remarks),
        recordedBy: user.id,
      });
    }
  } catch (error) {
    console.error("[saveGrade] failed", error);
    return fail("Could not save the grade. Please try again.");
  }

  await logAudit({
    userId: user.id,
    action: "SAVE_GRADE",
    entityType: "student_grade",
    entityId: existing[0]?.id ?? enrollmentId,
    newValues: { studentId: enrollment.studentId, subjectId, gradingPeriodId, grade },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath(`/students/${enrollment.studentId}`);
  revalidatePath("/performance");
  return ok("Grade saved.");
}

/* -------------------------------------------------------------------------- */
/*  Attendance                                                                */
/* -------------------------------------------------------------------------- */

export async function saveAttendance(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = attendanceFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  const { enrollmentId, date, status, remarks } = parsed.data;

  const user = await getAuthorizedUser("attendance.write");
  if (!user) return fail("You do not have permission to record attendance.");

  const enrollmentRows = await db
    .select({ studentId: studentEnrollments.studentId })
    .from(studentEnrollments)
    .where(eq(studentEnrollments.id, enrollmentId))
    .limit(1);
  const enrollment = enrollmentRows[0];
  if (!enrollment) return fail("Enrollment not found.");
  if (!(await canAccessStudent(user, { studentId: enrollment.studentId }))) {
    return fail("This record is outside your scope.");
  }

  const { ip, userAgent } = await sessionMetadata();
  const existing = await db
    .select({ id: attendanceRecords.id })
    .from(attendanceRecords)
    .where(and(eq(attendanceRecords.enrollmentId, enrollmentId), eq(attendanceRecords.date, date)))
    .limit(1);

  try {
    if (existing[0]) {
      await db
        .update(attendanceRecords)
        .set({ status, remarks: scrub(remarks), recordedBy: user.id, updatedAt: new Date() })
        .where(eq(attendanceRecords.id, existing[0].id));
    } else {
      await db.insert(attendanceRecords).values({
        id: crypto.randomUUID(),
        enrollmentId,
        date,
        status,
        remarks: scrub(remarks),
        recordedBy: user.id,
      });
    }
  } catch (error) {
    console.error("[saveAttendance] failed", error);
    return fail("Could not save the attendance record. Please try again.");
  }

  await logAudit({
    userId: user.id,
    action: "SAVE_ATTENDANCE",
    entityType: "attendance_record",
    entityId: existing[0]?.id ?? enrollmentId,
    newValues: { studentId: enrollment.studentId, date, status },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath(`/students/${enrollment.studentId}`);
  revalidatePath("/performance");
  return ok("Attendance saved.");
}

/* -------------------------------------------------------------------------- */
/*  Behavior                                                                  */
/* -------------------------------------------------------------------------- */

export async function saveBehavior(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = behaviorFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  const { studentId, categoryId, date, description, severity, followUp, status } = parsed.data;

  const guard = await studentInScope(studentId, "behavior.write");
  if (!guard.ok) return fail(guard.error);
  const user = (await getAuthorizedUser("behavior.write"))!;
  const { ip, userAgent } = await sessionMetadata();

  const recordId = String(formData.get("id") ?? "");

  try {
    if (recordId) {
      await db
        .update(behaviorRecords)
        .set({
          categoryId,
          date,
          description,
          severity: scrub(severity),
          followUp: scrub(followUp),
          status,
          updatedAt: new Date(),
        })
        .where(eq(behaviorRecords.id, recordId));
    } else {
      await db.insert(behaviorRecords).values({
        id: crypto.randomUUID(),
        studentId,
        categoryId,
        date,
        description,
        severity: scrub(severity),
        followUp: scrub(followUp),
        status,
        recordedBy: user.id,
      });
    }
  } catch (error) {
    console.error("[saveBehavior] failed", error);
    return fail("Could not save the behavior record. Please try again.");
  }

  await logAudit({
    userId: user.id,
    action: "SAVE_BEHAVIOR",
    entityType: "behavior_record",
    entityId: recordId || studentId,
    newValues: { studentId, categoryId, status },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/development/behavior");
  return ok("Behavior record saved.");
}

/* -------------------------------------------------------------------------- */
/*  Assessments                                                               */
/* -------------------------------------------------------------------------- */

export async function saveAssessment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = assessmentFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  const { studentId, domain, assessmentType, skillArea, date, level, score, notes } = parsed.data;

  const guard = await studentInScope(studentId, "assessments.write");
  if (!guard.ok) return fail(guard.error);
  const user = (await getAuthorizedUser("assessments.write"))!;
  const { ip, userAgent } = await sessionMetadata();

  const recordId = String(formData.get("id") ?? "");

  try {
    if (recordId) {
      await db
        .update(assessments)
        .set({
          domain,
          assessmentType: scrub(assessmentType),
          skillArea: scrub(skillArea),
          date,
          level: scrub(level),
          score: typeof score === "number" ? score : null,
          notes: scrub(notes),
          updatedAt: new Date(),
        })
        .where(eq(assessments.id, recordId));
    } else {
      await db.insert(assessments).values({
        id: crypto.randomUUID(),
        studentId,
        domain,
        assessmentType: scrub(assessmentType),
        skillArea: scrub(skillArea),
        date,
        level: scrub(level),
        score: typeof score === "number" ? score : null,
        assessorId: user.id,
        notes: scrub(notes),
      });
    }
  } catch (error) {
    console.error("[saveAssessment] failed", error);
    return fail("Could not save the assessment. Please try again.");
  }

  await logAudit({
    userId: user.id,
    action: "SAVE_ASSESSMENT",
    entityType: "assessment",
    entityId: recordId || studentId,
    newValues: { studentId, domain, date },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/development/assessments");
  revalidatePath("/performance");
  return ok("Assessment saved.");
}

/** Sanity helper used by tests: verify a student exists and is not archived. */
export async function studentIsActive(studentId: string): Promise<boolean> {
  const rows = await db
    .select({ status: students.status })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);
  return rows[0]?.status === "active";
}
