"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { gradingPeriods } from "@/db/schema";
import { getAuthorizedUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { fail, ok, sessionMetadata, type ActionState } from "./helpers";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** FormData-only wrapper for plain <form action={…}> usage. */
export async function setSubmissionDeadlineForm(formData: FormData): Promise<void> {
  await setSubmissionDeadline({ ok: false, error: "" }, formData);
}

/**
 * Configure the authoritative grade-submission deadline for a grading period.
 * Only `academics.config` (system/school administrator) may set it; the value
 * is a calendar date interpreted as end-of-day Asia/Manila by the monitoring
 * engine. Passing an empty value clears the deadline.
 */
export async function setSubmissionDeadline(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getAuthorizedUser("academics.config");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission to configure deadlines.");

  const periodId = String(formData.get("gradingPeriodId") ?? "");
  const deadlineRaw = String(formData.get("deadline") ?? "").trim();
  if (!periodId) return fail("Select a grading period.");

  const deadline = deadlineRaw === "" ? null : deadlineRaw;
  if (deadline && !ISO_DATE.test(deadline)) {
    return fail("Enter a valid deadline date (YYYY-MM-DD).", {
      deadline: "Enter a valid date",
    });
  }
  if (deadline) {
    const parsed = new Date(`${deadline}T23:59:59.999+08:00`);
    if (Number.isNaN(parsed.getTime())) {
      return fail("Enter a real calendar date.", { deadline: "Enter a real date" });
    }
  }

  const rows = await db
    .select({
      id: gradingPeriods.id,
      name: gradingPeriods.name,
      submissionDeadline: gradingPeriods.submissionDeadline,
    })
    .from(gradingPeriods)
    .where(eq(gradingPeriods.id, periodId))
    .limit(1);
  const period = rows[0];
  if (!period) return fail("Grading period not found.");

  await db
    .update(gradingPeriods)
    .set({ submissionDeadline: deadline, updatedAt: new Date() })
    .where(eq(gradingPeriods.id, periodId));

  await logAudit({
    userId: user.id,
    action: "SET_GRADE_SUBMISSION_DEADLINE",
    entityType: "grading_period",
    entityId: periodId,
    oldValues: { deadline: period.submissionDeadline },
    newValues: { deadline },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/grades/monitoring");
  return ok(
    deadline
      ? `Deadline for ${period.name} set to ${deadline} (end of day, Asia/Manila).`
      : `Deadline for ${period.name} cleared.`,
  );
}
