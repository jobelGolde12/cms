"use server";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import {
  gradeSubmissions,
  gradingPeriods,
  sections,
  studentEnrollments,
  studentGrades,
  students,
} from "@/db/schema";
import { logAudit } from "@/lib/audit";
import {
  canWriteGradesInSection,
  collectGradeIssues,
  getGradeWriter,
  MAX_GRADE,
  MIN_GRADE,
} from "@/lib/grades";
import { invalidateForecasts } from "@/lib/forecasting/storage";
import { fail, sessionMetadata, zodFieldErrors, ok, type ActionState } from "./helpers";

/**
 * Grade-mutating server actions. Every action re-establishes the full chain
 * server-side (never trusting the client):
 *
 *   role(teacher) + grades.write  →  community "who may encode"
 *   section is the caller's advisory  →  row-level "who may encode here"
 *   grading period ∈ section's school year  →  context integrity
 *   student is actively enrolled in that section  →  roster integrity
 *   latest ledger row not "submitted"  →  submission lock
 *
 * The unique index (enrollment, subject, grading_period) plus upsert keeps
 * duplicate rows impossible under concurrency.
 */

const entrySchema = z.object({
  studentId: z.string().min(1),
  grade: z.coerce
    .number()
    .min(MIN_GRADE, `Grades below ${MIN_GRADE} are invalid`)
    .max(MAX_GRADE, `Grades above ${MAX_GRADE} are invalid`),
  remarks: z.string().max(200).optional(),
});

const sheetSchema = z.object({
  sectionId: z.string().min(1),
  subjectId: z.string().min(1),
  gradingPeriodId: z.string().min(1),
  entries: z.array(entrySchema).max(200),
});

const contextSchema = z.object({
  sectionId: z.string().min(1),
  subjectId: z.string().min(1),
  gradingPeriodId: z.string().min(1),
});

const removeSchema = z.object({
  studentId: z.string().min(1),
  subjectId: z.string().min(1),
  gradingPeriodId: z.string().min(1),
});

type SheetInput = z.infer<typeof sheetSchema>;
type ContextInput = z.infer<typeof contextSchema>;
type RemoveInput = z.infer<typeof removeSchema>;

/** Shared context integrity check for (section, subject, grading period). */
async function verifyContext(
  sectionId: string,
  gradingPeriodId: string,
): Promise<{ schoolYearId: string } | { error: string }> {
  const sectionRows = await db
    .select({ schoolYearId: sections.schoolYearId, isActive: sections.isActive })
    .from(sections)
    .where(eq(sections.id, sectionId))
    .limit(1);
  const section = sectionRows[0];
  if (!section) return { error: "Section not found." };
  if (!section.isActive) return { error: "This section is no longer active." };

  const periodRows = await db
    .select({ schoolYearId: gradingPeriods.schoolYearId })
    .from(gradingPeriods)
    .where(eq(gradingPeriods.id, gradingPeriodId))
    .limit(1);
  const period = periodRows[0];
  if (!period) return { error: "Grading period not found." };
  if (period.schoolYearId !== section.schoolYearId) {
    return { error: "That grading period does not belong to this section's school year." };
  }
  return { schoolYearId: section.schoolYearId };
}

/** Active roster enrollment ids of a section (roster integrity boundary). */
async function sectionRoster(sectionId: string) {
  return db
    .select({
      enrollmentId: studentEnrollments.id,
      studentId: studentEnrollments.studentId,
      firstName: students.firstName,
      lastName: students.lastName,
    })
    .from(studentEnrollments)
    .innerJoin(students, eq(students.id, studentEnrollments.studentId))
    .where(
      and(
        eq(studentEnrollments.sectionId, sectionId),
        eq(studentEnrollments.status, "active"),
        eq(students.status, "active"),
      ),
    )
    .orderBy(asc(students.lastName), asc(students.firstName));
}

function displayName(r: { firstName: string; lastName: string }): string {
  return `${r.firstName} ${r.lastName}`;
}



/** Parse rows into grade values keyed by enrollment id (draft-agnostic). */
async function existingGrades(context: ContextInput, sectionId: string) {
  const roster = await sectionRoster(sectionId);
  const enrollmentIds = roster.map((r) => r.enrollmentId);
  if (enrollmentIds.length === 0) return { roster, grades: [] as { enrollmentId: string; status: string; grade: number }[] };
  const grades = await db
    .select({
      enrollmentId: studentGrades.enrollmentId,
      status: studentGrades.status,
      grade: studentGrades.grade,
    })
    .from(studentGrades)
    .where(
      and(
        inArray(studentGrades.enrollmentId, enrollmentIds),
        eq(studentGrades.subjectId, context.subjectId),
        eq(studentGrades.gradingPeriodId, context.gradingPeriodId),
      ),
    );
  return { roster, grades };
}

/* ------------------------------ save draft -------------------------------- */

/**
 * Stage one or more draft grades for a section sheet. Any submitted (locked)
 * rows in the payload are rejected — the sheet must be reopened first.
 */
export async function saveSectionGradeDraft(input: SheetInput): Promise<ActionState> {
  const parsed = sheetSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error.issues));
  }

  const user = await getGradeWriter();
  if (!user) return fail("Only teachers/advisers can encode grades.");

  const ctx = parsed.data;
  if (!(await canWriteGradesInSection(user, ctx.sectionId, ctx.subjectId))) {
    return fail("You can only encode grades for sections you advise or subjects assigned to you.");
  }
  const context = await verifyContext(ctx.sectionId, ctx.gradingPeriodId);
  if ("error" in context) return fail(context.error);

  const roster = await sectionRoster(ctx.sectionId);
  const byStudent = new Map(roster.map((r) => [r.studentId, r]));
  const enrollmentIds = roster.map((r) => r.enrollmentId);

  // Roster integrity: every payload student must be actively enrolled here.
  const unknown = ctx.entries.filter((e) => !byStudent.has(e.studentId));
  if (unknown.length > 0) {
    return fail("Some students are not enrolled in this section. Refresh the page and try again.");
  }

  const existing = enrollmentIds.length
    ? await db
        .select({
          enrollmentId: studentGrades.enrollmentId,
          id: studentGrades.id,
          status: studentGrades.status,
        })
        .from(studentGrades)
        .where(
          and(
            inArray(studentGrades.enrollmentId, enrollmentIds),
            eq(studentGrades.subjectId, ctx.subjectId),
            eq(studentGrades.gradingPeriodId, ctx.gradingPeriodId),
          ),
        )
    : [];
  const byEnrollmentId = new Map(existing.map((g) => [g.enrollmentId, g]));

  // Submission lock: submitted rows are read-only for the teacher.
  const lockedEnrollments = new Set(
    existing.filter((g) => g.status === "submitted").map((g) => g.enrollmentId),
  );

  const { ip, userAgent } = await sessionMetadata();
  const changed: string[] = [];

  try {
    await db.transaction(async (tx) => {
      for (const entry of ctx.entries) {
        const rosterEntry = byStudent.get(entry.studentId)!;
        const prior = byEnrollmentId.get(rosterEntry.enrollmentId);
        if (prior && lockedEnrollments.has(prior.enrollmentId)) {
          continue; // locked row — silently skipped, surfaced by validation summary
        }
        const values = {
          grade: entry.grade,
          remarks: entry.remarks?.trim() ? entry.remarks.trim() : null,
          recordedBy: user.id,
          status: "draft" as const,
          submittedAt: null,
          submissionId: null,
          updatedAt: new Date(),
        };
        if (prior && prior.status === "draft") {
          await tx.update(studentGrades).set(values).where(eq(studentGrades.id, prior.id));
        } else {
          await tx.insert(studentGrades).values({
            id: crypto.randomUUID(),
            enrollmentId: rosterEntry.enrollmentId,
            subjectId: ctx.subjectId,
            gradingPeriodId: ctx.gradingPeriodId,
            ...values,
          });
        }
        changed.push(entry.studentId);
      }
    });
  } catch (error) {
    console.error("[saveSectionGradeDraft] failed", error);
    return fail("Could not save the draft. Please try again.");
  }

  if (changed.length === 0) {
    return fail("These grades were already submitted. Reopen the sheet to make corrections.");
  }

  await logAudit({
    userId: user.id,
    action: "SAVE_GRADE_DRAFT",
    entityType: "student_grade",
    entityId: `${ctx.sectionId}:${ctx.subjectId}:${ctx.gradingPeriodId}`,
    newValues: { entries: changed.length },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/grades");
  revalidatePath("/performance");
  return ok(
    changed.length === ctx.entries.length
      ? "Draft saved."
      : `Draft saved for ${changed.length} of ${ctx.entries.length} entries (submitted grades were skipped).`,
  );
}

/* -------------------------------- submit ---------------------------------- */

/**
 * Submit a sheet: validates completeness/validity, then commits every draft
 * row for the context as `submitted` and writes the submission ledger row.
 * Students without a grade can be confirmed (e.g. transferred mid-quarter) by
 * passing their ids in `missingConfirmed` — anyone else blocks submission.
 */
export async function submitSectionGradeSheet(
  input: ContextInput & { missingConfirmed?: string[] },
): Promise<
  | { ok: true; submitted: number; roster: number; missingConfirmed: number }
  | { ok: false; error: string; issues?: { kind: "missing" | "invalid"; studentName: string; detail: string }[] }
> {
  const parsed = contextSchema.extend({ missingConfirmed: z.array(z.string()).optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid submission request." };

  const user = await getGradeWriter();
  if (!user) return { ok: false, error: "Only teachers/advisers can submit grades." };

  const ctx = parsed.data;
  if (!(await canWriteGradesInSection(user, ctx.sectionId, ctx.subjectId))) {
    return { ok: false, error: "You can only submit grades for sections you advise or subjects assigned to you." };
  }
  const integrity = await verifyContext(ctx.sectionId, ctx.gradingPeriodId);
  if ("error" in integrity) return { ok: false, error: integrity.error };

  const { roster, grades } = await existingGrades(ctx, ctx.sectionId);
  if (roster.length === 0) return { ok: false, error: "This section has no active students." };

  const byStudent = new Map(roster.map((r) => [r.studentId, r]));
  const draftEntries = grades
    .filter((g) => g.status === "draft")
    .map((g) => {
      const rosterEntry = [...byStudent.values()].find((r) => r.enrollmentId === g.enrollmentId);
      return { studentId: rosterEntry?.studentId ?? "", grade: g.grade };
    })
    .filter((e) => e.studentId);

  const issues = collectGradeIssues(
    roster.map((r) => ({ studentId: r.studentId, studentName: displayName(r) })),
    draftEntries,
  );

  const blocking = issues.filter(
    (i) => i.kind === "invalid" || !(ctx.missingConfirmed ?? []).includes(i.studentId),
  );
  if (blocking.length > 0) {
    return {
      ok: false,
      error:
        blocking.length === 1
          ? `${blocking[0].studentName}: ${blocking[0].detail}.`
          : `${blocking.length} issues found before submission — review the highlighted students.`,
      issues: blocking.map((i) => ({ kind: i.kind, studentName: i.studentName, detail: i.detail })),
    };
  }

  // Lock check: refuse re-submission while a submitted state is the latest.
  const lock = await latestSubmissionLock(ctx);
  if (lock.locked) {
    return { ok: false, error: "These grades were already submitted. Reopen the sheet to make corrections." };
  }

  const submittedAt = new Date();
  const submissionId = crypto.randomUUID();
  const { ip, userAgent } = await sessionMetadata();
  const draftEnrollmentIds = grades.filter((g) => g.status === "draft").map((g) => g.enrollmentId);

  try {
    await db.transaction(async (tx) => {
      await tx.insert(gradeSubmissions).values({
        id: submissionId,
        schoolYearId: integrity.schoolYearId,
        sectionId: ctx.sectionId,
        subjectId: ctx.subjectId,
        gradingPeriodId: ctx.gradingPeriodId,
        status: "submitted",
        submittedBy: user.id,
        submittedAt,
        entryCount: draftEnrollmentIds.length,
        rosterCount: roster.length,
        warningsJson: JSON.stringify({
          missingConfirmed: (ctx.missingConfirmed ?? []).length,
        }),
      });

      if (draftEnrollmentIds.length > 0) {
        await tx
          .update(studentGrades)
          .set({ status: "submitted", submittedAt, submissionId, updatedAt: submittedAt })
          .where(inArray(studentGrades.enrollmentId, draftEnrollmentIds));
      }
    });
  } catch (error) {
    console.error("[submitSectionGradeSheet] failed", error);
    return { ok: false, error: "Could not submit the grades. Please try again." };
  }

  await logAudit({
    userId: user.id,
    action: "SUBMIT_GRADE_SHEET",
    entityType: "grade_submission",
    entityId: submissionId,
    newValues: {
      sectionId: ctx.sectionId,
      subjectId: ctx.subjectId,
      gradingPeriodId: ctx.gradingPeriodId,
      entries: draftEnrollmentIds.length,
      missingConfirmed: (ctx.missingConfirmed ?? []).length,
    },
    ipAddress: ip,
    userAgent,
  });

  try {
    await invalidateForecasts([
      { type: "school", scopeLevel: "school" },
      { type: "subject", scopeLevel: ctx.subjectId },
    ]);
  } catch (error) {
    console.error("[submitSectionGradeSheet] forecast invalidation failed", error);
  }

  revalidatePath("/grades");
  revalidatePath("/performance");
  revalidatePath("/reports");

  return { ok: true, submitted: draftEnrollmentIds.length, roster: roster.length, missingConfirmed: (ctx.missingConfirmed ?? []).length };
}

/** Shared lock helper: latest ledger row must not be `submitted`. */
async function latestSubmissionLock(context: ContextInput): Promise<{ locked: boolean }> {
  const rows = await db
    .select({ status: gradeSubmissions.status, submittedAt: gradeSubmissions.submittedAt })
    .from(gradeSubmissions)
    .where(
      and(
        eq(gradeSubmissions.sectionId, context.sectionId),
        eq(gradeSubmissions.subjectId, context.subjectId),
        eq(gradeSubmissions.gradingPeriodId, context.gradingPeriodId),
      ),
    )
    .orderBy(desc(gradeSubmissions.submittedAt), desc(gradeSubmissions.createdAt))
    .limit(1);
  const latest = rows[0];
  return { locked: latest?.status === "submitted" };
}

/* -------------------------------- reopen ---------------------------------- */

/**
 * Reopen a submitted sheet for correction. Allowed only while the caller is
 * the section's current adviser; every submitted row for the context flips
 * back to `draft` and the reopen event is appended to the ledger.
 */
export async function reopenSectionGradeSheet(input: ContextInput): Promise<ActionState> {
  const parsed = contextSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid reopen request.");

  const user = await getGradeWriter();
  if (!user) return fail("Only teachers/advisers can reopen grade sheets.");

  const ctx = parsed.data;
  if (!(await canWriteGradesInSection(user, ctx.sectionId, ctx.subjectId))) {
    return fail("You can only reopen grade sheets for your sections/subjects.");
  }
  const integrity = await verifyContext(ctx.sectionId, ctx.gradingPeriodId);
  if ("error" in integrity) return fail(integrity.error);

  const lock = await latestSubmissionLock(ctx);
  if (!lock.locked) return fail("This sheet is not submitted — continue editing the drafts.");

  const submittedRows = await db
    .select({ id: studentGrades.id })
    .from(studentGrades)
    .innerJoin(studentEnrollments, eq(studentEnrollments.id, studentGrades.enrollmentId))
    .where(
      and(
        eq(studentEnrollments.sectionId, ctx.sectionId),
        eq(studentGrades.subjectId, ctx.subjectId),
        eq(studentGrades.gradingPeriodId, ctx.gradingPeriodId),
        eq(studentGrades.status, "submitted"),
      ),
    );
  const ids = submittedRows.map((r) => r.id);

  const { ip, userAgent } = await sessionMetadata();
  const submittedByRow = await db
    .select({ submittedBy: gradeSubmissions.submittedBy })
    .from(gradeSubmissions)
    .where(
      and(
        eq(gradeSubmissions.sectionId, ctx.sectionId),
        eq(gradeSubmissions.subjectId, ctx.subjectId),
        eq(gradeSubmissions.gradingPeriodId, ctx.gradingPeriodId),
      ),
    )
    .orderBy(desc(gradeSubmissions.submittedAt), desc(gradeSubmissions.createdAt))
    .limit(1);
  const originalSubmitter = submittedByRow[0]?.submittedBy ?? user.id;

  try {
    await db.transaction(async (tx) => {
      await tx.insert(gradeSubmissions).values({
        id: crypto.randomUUID(),
        schoolYearId: integrity.schoolYearId,
        sectionId: ctx.sectionId,
        subjectId: ctx.subjectId,
        gradingPeriodId: ctx.gradingPeriodId,
        status: "reopened",
        submittedBy: user.id,
        submittedAt: new Date(),
        reopenedAt: new Date(),
        reopenedBy: user.id,
        entryCount: ids.length,
        rosterCount: 0,
        warningsJson: JSON.stringify({ originalSubmitter }),
      });
      if (ids.length > 0) {
        await tx
          .update(studentGrades)
          .set({ status: "draft", submittedAt: null, submissionId: null, updatedAt: new Date() })
          .where(inArray(studentGrades.id, ids));
      }
    });
  } catch (error) {
    console.error("[reopenSectionGradeSheet] failed", error);
    return fail("Could not reopen the sheet. Please try again.");
  }

  await logAudit({
    userId: user.id,
    action: "REOPEN_GRADE_SHEET",
    entityType: "grade_submission",
    entityId: `${ctx.sectionId}:${ctx.subjectId}:${ctx.gradingPeriodId}`,
    newValues: { reopenedRows: ids.length, originalSubmitter },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/grades");
  revalidatePath("/performance");
  return ok("Sheet reopened for correction — the grades are back in draft.");
}

/* -------------------------------- remove ---------------------------------- */

/** Remove a single draft row (drafts only — submitted rows are never deleted). */
export async function removeSectionGrade(input: RemoveInput): Promise<ActionState> {
  const parsed = removeSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid remove request.");

  const user = await getGradeWriter();
  if (!user) return fail("Only teachers/advisers can remove grades.");

  const { studentId, subjectId, gradingPeriodId } = parsed.data;

  const enrollmentRows = await db
    .select({ enrollmentId: studentEnrollments.id, sectionId: studentEnrollments.sectionId })
    .from(studentEnrollments)
    .where(and(eq(studentEnrollments.studentId, studentId), eq(studentEnrollments.status, "active")))
    .limit(1);
  const enrollment = enrollmentRows[0];
  if (!enrollment) return fail("The student has no active enrollment.");
  if (!(await canWriteGradesInSection(user, enrollment.sectionId, subjectId))) {
    return fail("You can only remove grades from sheets you own (adviser or assigned subject).");
  }
  const integrity = await verifyContext(enrollment.sectionId, gradingPeriodId);
  if ("error" in integrity) return fail(integrity.error);

  const rows = await db
    .select({ id: studentGrades.id, status: studentGrades.status })
    .from(studentGrades)
    .where(
      and(
        eq(studentGrades.enrollmentId, enrollment.enrollmentId),
        eq(studentGrades.subjectId, subjectId),
        eq(studentGrades.gradingPeriodId, gradingPeriodId),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return fail("No grade row found for this student.");
  if (row.status !== "draft") {
    return fail("Submitted grades cannot be deleted. Reopen the sheet first if a correction is needed.");
  }

  const { ip, userAgent } = await sessionMetadata();
  try {
    await db.delete(studentGrades).where(eq(studentGrades.id, row.id));
  } catch (error) {
    console.error("[removeSectionGrade] failed", error);
    return fail("Could not remove the draft. Please try again.");
  }

  await logAudit({
    userId: user.id,
    action: "REMOVE_GRADE_DRAFT",
    entityType: "student_grade",
    entityId: row.id,
    newValues: { studentId, subjectId, gradingPeriodId },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/grades");
  revalidatePath("/performance");
  return ok("Draft removed.");
}
