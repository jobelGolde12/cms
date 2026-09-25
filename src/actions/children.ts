"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  childAddresses,
  childDisabilities,
  childDuplicateCandidates,
  childEducation,
  childEccd,
  childValidations,
  children,
  type NewChild,
} from "@/db/schema";
import {
  getAuthorizedUser,
  getCurrentUser,
} from "@/lib/auth";
import { logAudit, notify } from "@/lib/audit";
import { nextChildCode } from "@/lib/child-code";
import { canAccessChild, canEditChild } from "@/lib/scope";
import { childFormSchema, validationReviewSchema, type ChildFormValues } from "@/lib/schemas";
import { refreshDuplicateCandidates } from "@/lib/duplicates";
import { deactivateChildTokens } from "@/lib/qr";
import type { RecordStatus } from "@/lib/constants";
import { fail, ok, sessionMetadata, zodFieldErrors, type ActionState } from "./helpers";

const scrub = (value: string | undefined | null | ""): string | null =>
  value && String(value).trim() ? String(value).trim() : null;

function parseChildForm(formData: FormData) {
  const entries = Object.fromEntries(formData.entries());
  const withCheckbox = {
    ...entries,
    hasDisability: formData.get("hasDisability") ? "on" : "",
  };
  return {
    intent: entries.intent === "submit" ? ("submit" as const) : ("draft" as const),
    parsed: childFormSchema.safeParse(withCheckbox),
  };
}

/** Insert the normalized side-table rows for a child inside a transaction. */
async function writeChildDetails(
  childId: string,
  v: ChildFormValues,
  updatedBy: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.insert(childAddresses).values({
      id: crypto.randomUUID(),
      childId,
      barangayId: v.barangayId,
      householdAddress: v.householdAddress,
      sitio: scrub(v.sitio),
      isCurrent: true,
    });

    await tx.insert(childEducation).values({
      id: crypto.randomUUID(),
      childId,
      schoolId: scrub(v.schoolId),
      educationStatus: v.educationStatus,
      gradeLevel: scrub(v.gradeLevel),
      schoolYear: scrub(v.schoolYear),
      enrollmentStatus: scrub(v.enrollmentStatus),
      isCurrent: true,
    });

    await tx.insert(childEccd).values({
      id: crypto.randomUUID(),
      childId,
      participationStatus: v.eccdStatus,
      programName: scrub(v.eccdProgramName),
      provider: scrub(v.eccdProvider),
      remarks: scrub(v.eccdRemarks),
    });

    await tx.insert(childDisabilities).values({
      id: crypto.randomUUID(),
      childId,
      hasDisability: v.hasDisability,
      disabilityType: v.hasDisability ? scrub(v.disabilityType) : null,
      description: v.hasDisability ? scrub(v.disabilityDescription) : null,
      supportNeeded: v.hasDisability ? scrub(v.disabilitySupportNeeded) : null,
      assistanceStatus: v.hasDisability ? scrub(v.assistanceStatus) : null,
      verified: false,
    });

    await tx.insert(childValidations).values({
      id: crypto.randomUUID(),
      childId,
      submittedBy: updatedBy,
      status: "pending",
      remarks: "Record created",
      submittedAt: new Date(),
    });
  });
}

/** Create a new child record. `intent=draft` saves; `intent=submit` queues for validation. */
export async function createChild(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("children.create");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission to create records.");

  const form = parseChildForm(formData);
  if (!form.parsed.success) {
    return fail("Please fix the highlighted fields.", zodFieldErrors(form.parsed.error.issues));
  }
  const v = form.parsed.data;

  const targetStatus: RecordStatus = form.intent === "submit" ? "pending_validation" : "draft";
  const childId = crypto.randomUUID();

  // Sequential code generation with a single retry on (rare) collision.
  let code = await nextChildCode();
  let inserted = false;
  for (let attempt = 0; attempt < 2 && !inserted; attempt++) {
    if (attempt > 0) code = await nextChildCode();
    try {
      await db.transaction(async (tx) => {
        const childValues: NewChild = {
          id: childId,
          childCode: code,
          firstName: v.firstName,
          middleName: scrub(v.middleName),
          lastName: v.lastName,
          suffix: scrub(v.suffix),
          birthDate: v.birthDate,
          sex: v.sex,
          civilStatus: scrub(v.civilStatus),
          birthPlace: scrub(v.birthPlace),
          barangayId: v.barangayId,
          status: "active",
          recordStatus: targetStatus,
          createdBy: user.id,
          updatedBy: user.id,
        };
        await tx.insert(children).values(childValues);

        // Current validation record (history table, not a boolean).
        if (form.intent === "submit") {
          await tx.insert(childValidations).values({
            id: crypto.randomUUID(),
            childId,
            submittedBy: user.id,
            status: "pending",
            remarks: "Submitted for validation",
            submittedAt: new Date(),
          });
        }

        await tx.insert(childAddresses).values({
          id: crypto.randomUUID(),
          childId,
          barangayId: v.barangayId,
          householdAddress: v.householdAddress,
          sitio: scrub(v.sitio),
          isCurrent: true,
        });

        await tx.insert(childEducation).values({
          id: crypto.randomUUID(),
          childId,
          schoolId: scrub(v.schoolId),
          educationStatus: v.educationStatus,
          gradeLevel: scrub(v.gradeLevel),
          schoolYear: scrub(v.schoolYear),
          enrollmentStatus: scrub(v.enrollmentStatus),
          isCurrent: true,
        });

        await tx.insert(childEccd).values({
          id: crypto.randomUUID(),
          childId,
          participationStatus: v.eccdStatus,
          programName: scrub(v.eccdProgramName),
          provider: scrub(v.eccdProvider),
          remarks: scrub(v.eccdRemarks),
        });

        await tx.insert(childDisabilities).values({
          id: crypto.randomUUID(),
          childId,
          hasDisability: v.hasDisability,
          disabilityType: v.hasDisability ? scrub(v.disabilityType) : null,
          description: v.hasDisability ? scrub(v.disabilityDescription) : null,
          supportNeeded: v.hasDisability ? scrub(v.disabilitySupportNeeded) : null,
          assistanceStatus: v.hasDisability ? scrub(v.assistanceStatus) : null,
          verified: false,
        });
      });
      inserted = true;
    } catch (error) {
      console.error("[createChild] insert failed", error);
      inserted = false;
    }
  }
  if (!inserted) return fail("Could not create the record. Please try again.");

  // Duplicate candidates are proposals only — human review decides.
  await refreshDuplicateCandidates(childId, {
    firstName: v.firstName,
    lastName: v.lastName,
    middleName: v.middleName || null,
    birthDate: v.birthDate,
    barangayId: v.barangayId,
  });

  await logAudit({
    userId: user.id,
    action: form.intent === "submit" ? "SUBMIT_VALIDATION" : "CREATE_CHILD",
    entityType: "child",
    entityId: childId,
    newValues: { childCode: code, recordStatus: targetStatus },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/children");
  revalidatePath("/validation");
  return ok(
    form.intent === "submit" ? "Record submitted for validation." : "Draft saved.",
    `/children/${childId}`,
  );
}

/** Update an existing child record (draft/needs_correction are editable). */
export async function updateChild(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("children.update");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission to edit records.");

  const childId = String(formData.get("childId") ?? "");
  if (!childId) return fail("Missing record identifier.");

  const rows = await db.select().from(children).where(eq(children.id, childId)).limit(1);
  const child = rows[0];
  if (!child) return fail("Record not found.");
  if (!canEditChild(user, child)) return fail("You cannot edit this record.");

  const form = parseChildForm(formData);
  if (!form.parsed.success) {
    return fail("Please fix the highlighted fields.", zodFieldErrors(form.parsed.error.issues));
  }
  const v = form.parsed.data;

  const isResubmit = child.recordStatus === "needs_correction" && form.intent === "submit";
  const targetStatus: RecordStatus = isResubmit
    ? "pending_validation"
    : child.recordStatus === "draft" && form.intent === "submit"
      ? "pending_validation"
      : child.recordStatus;

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(children)
        .set({
          firstName: v.firstName,
          middleName: scrub(v.middleName),
          lastName: v.lastName,
          suffix: scrub(v.suffix),
          birthDate: v.birthDate,
          sex: v.sex,
          civilStatus: scrub(v.civilStatus),
          birthPlace: scrub(v.birthPlace),
          barangayId: v.barangayId,
          recordStatus: targetStatus,
          updatedBy: user.id,
          updatedAt: new Date(),
        })
        .where(eq(children.id, childId));

      // Address history: mark old current address as historical, add the new one.
      await tx
        .update(childAddresses)
        .set({ isCurrent: false, updatedAt: new Date() })
        .where(and(eq(childAddresses.childId, childId), eq(childAddresses.isCurrent, true)));

      await tx.insert(childAddresses).values({
        id: crypto.randomUUID(),
        childId,
        barangayId: v.barangayId,
        householdAddress: v.householdAddress,
        sitio: scrub(v.sitio),
        isCurrent: true,
      });

      // Education: supersede current record.
      await tx
        .update(childEducation)
        .set({ isCurrent: false, updatedAt: new Date() })
        .where(and(eq(childEducation.childId, childId), eq(childEducation.isCurrent, true)));

      await tx.insert(childEducation).values({
        id: crypto.randomUUID(),
        childId,
        schoolId: scrub(v.schoolId),
        educationStatus: v.educationStatus,
        gradeLevel: scrub(v.gradeLevel),
        schoolYear: scrub(v.schoolYear),
        enrollmentStatus: scrub(v.enrollmentStatus),
        isCurrent: true,
      });

      // ECCD: append new observation.
      await tx.insert(childEccd).values({
        id: crypto.randomUUID(),
        childId,
        participationStatus: v.eccdStatus,
        programName: scrub(v.eccdProgramName),
        provider: scrub(v.eccdProvider),
        remarks: scrub(v.eccdRemarks),
      });

      // Disability: append new observation (sensitive; handled server-side only).
      await tx.insert(childDisabilities).values({
        id: crypto.randomUUID(),
        childId,
        hasDisability: v.hasDisability,
        disabilityType: v.hasDisability ? scrub(v.disabilityType) : null,
        description: v.hasDisability ? scrub(v.disabilityDescription) : null,
        supportNeeded: v.hasDisability ? scrub(v.disabilitySupportNeeded) : null,
        assistanceStatus: v.hasDisability ? scrub(v.assistanceStatus) : null,
        verified: false,
      });

      if (isResubmit) {
        await tx.insert(childValidations).values({
          id: crypto.randomUUID(),
          childId,
          submittedBy: user.id,
          status: "pending",
          remarks: "Resubmitted after corrections",
          submittedAt: new Date(),
        });
      }
    });
  } catch (error) {
    console.error("[updateChild] update failed", error);
    return fail("Could not update the record. Please try again.");
  }

  // Edit invalidates previously issued QR tokens (data changed).
  if (isResubmit || child.recordStatus === "verified") {
    await deactivateChildTokens(childId, user.id);
  }

  await refreshDuplicateCandidates(childId, {
    firstName: v.firstName,
    lastName: v.lastName,
    middleName: v.middleName || null,
    birthDate: v.birthDate,
    barangayId: v.barangayId,
  });

  await logAudit({
    userId: user.id,
    action: "UPDATE_CHILD",
    entityType: "child",
    entityId: childId,
    oldValues: { recordStatus: child.recordStatus },
    newValues: { recordStatus: targetStatus },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/children");
  revalidatePath(`/children/${childId}`);
  return ok("Record updated.", isResubmit ? "/validation" : `/children/${childId}`);
}

/** Validator decision on a queued record. Writes validation history. */
export async function reviewValidation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("validation.review");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission to validate records.");

  const parsed = validationReviewSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fail("Invalid review.", zodFieldErrors(parsed.error.issues));
  const { childId, decision, remarks } = parsed.data;

  const rows = await db.select().from(children).where(eq(children.id, childId)).limit(1);
  const child = rows[0];
  if (!child) return fail("Record not found.");
  if (!canAccessChild(user, child)) return fail("This record is outside your scope.");
  if (child.recordStatus !== "pending_validation") {
    return fail("This record is not in the validation queue.");
  }

  const validationRows = await db
    .select()
    .from(childValidations)
    .where(and(eq(childValidations.childId, childId), eq(childValidations.status, "pending")))
    .limit(1);
  const validation = validationRows[0];
  if (!validation) return fail("No pending validation found for this record.");

  const nextRecordStatus: RecordStatus =
    decision === "approved" ? "verified" : decision === "needs_correction" ? "needs_correction" : "rejected";

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(childValidations)
        .set({
          status: decision,
          reviewedBy: user.id,
          remarks: remarks || null,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(childValidations.id, validation.id));

      await tx
        .update(children)
        .set({
          recordStatus: nextRecordStatus,
          updatedBy: user.id,
          updatedAt: new Date(),
        })
        .where(eq(children.id, childId));
    });
  } catch (error) {
    console.error("[reviewValidation] failed", error);
    return fail("Could not record the review. Please try again.");
  }

  await logAudit({
    userId: user.id,
    action: decision === "approved" ? "APPROVE_VALIDATION" : decision === "rejected" ? "REJECT_VALIDATION" : "RETURN_VALIDATION",
    entityType: "child",
    entityId: childId,
    oldValues: { recordStatus: child.recordStatus },
    newValues: { recordStatus: nextRecordStatus },
    ipAddress: ip,
    userAgent,
  });

  // Notify the collector (no sensitive data in the message body).
  await notify({
    userId: child.createdBy,
    type: decision === "approved" ? "approved" : "correction",
    title: decision === "approved" ? "Record approved" : `Record ${decision.replace(/_/g, " ")}`,
    message: `Record ${child.childCode} was ${decision === "approved" ? "approved" : decision.replace(/_/g, " ")}${remarks ? `: ${remarks}` : ""}.`,
    link: `/children/${childId}`,
  });

  revalidatePath("/validation");
  revalidatePath(`/children/${childId}`);
  return ok(decision === "approved" ? "Record approved." : `Record marked ${decision.replace(/_/g, " ")}.`);
}

/** FormData-only wrapper for plain <form action={…}> usage. */
export async function reviewValidationForm(formData: FormData): Promise<void> {
  await reviewValidation({ ok: false, error: "" }, formData);
}

/** Admin only: re-open a verified record back into the validation queue. */
export async function reopenChild(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("validation.review");
  const { ip, userAgent } = await sessionMetadata();
  if (!user || user.role !== "admin") return fail("Only administrators can re-open verified records.");

  const childId = String(formData.get("childId") ?? "");
  const rows = await db.select().from(children).where(eq(children.id, childId)).limit(1);
  const child = rows[0];
  if (!child) return fail("Record not found.");
  if (child.recordStatus !== "verified") return fail("Only verified records can be re-opened.");

  await db.transaction(async (tx) => {
    await tx
      .update(children)
      .set({ recordStatus: "pending_validation", updatedBy: user.id, updatedAt: new Date() })
      .where(eq(children.id, childId));

    await tx.insert(childValidations).values({
      id: crypto.randomUUID(),
      childId,
      submittedBy: user.id,
      status: "pending",
      remarks: "Re-opened for re-validation",
      submittedAt: new Date(),
    });
  });

  await logAudit({
    userId: user.id,
    action: "REOPEN_VALIDATION",
    entityType: "child",
    entityId: childId,
    oldValues: { recordStatus: "verified" },
    newValues: { recordStatus: "pending_validation" },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/children");
  revalidatePath("/validation");
  return ok("Record re-opened for validation.", "/validation");
}

/**
 * Archive (soft delete) a record. Historical records are never physically
 * deleted — `status` flips to archived and QR tokens are revoked.
 */
export async function archiveChild(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("children.delete");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission to archive records.");

  const childId = String(formData.get("childId") ?? "");
  const rows = await db.select().from(children).where(eq(children.id, childId)).limit(1);
  const child = rows[0];
  if (!child) return fail("Record not found.");
  if (!canAccessChild(user, child)) return fail("This record is outside your scope.");

  await db.transaction(async (tx) => {
    await tx
      .update(children)
      .set({ status: "archived", updatedBy: user.id, updatedAt: new Date() })
      .where(eq(children.id, childId));
  });

  await deactivateChildTokens(childId, user.id);

  await logAudit({
    userId: user.id,
    action: "ARCHIVE_CHILD",
    entityType: "child",
    entityId: childId,
    oldValues: { status: child.status },
    newValues: { status: "archived" },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/children");
  revalidatePath(`/children/${childId}`);
  return ok("Record archived. It is retained for history but hidden from active lists.");
}

/** Convenience for UI: current user context check used by client forms. */
export async function canCurrentUserCreateChildren(): Promise<boolean> {
  const user = await getCurrentUser();
  return Boolean(user && user.role);
}

// Re-export for form components needing the duplicate pair count for a child.
export async function pendingDuplicateCount(childId: string): Promise<number> {
  const rows = await db
    .select({ id: childDuplicateCandidates.id })
    .from(childDuplicateCandidates)
    .where(
      and(
        eq(childDuplicateCandidates.childId, childId),
        eq(childDuplicateCandidates.status, "pending"),
      ),
    );
  return rows.length;
}
