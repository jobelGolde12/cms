"use server";

import { and, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  children,
  duplicateCandidates,
  validationHistory,
  type NewChild,
} from "@/db/schema";
import {
  getAuthorizedUser,
  getCurrentUser,
} from "@/lib/auth";
import { logAudit, notify } from "@/lib/audit";
import { nextChildCode } from "@/lib/child-code";
import { canAccessChild, canEditChild } from "@/lib/scope";
import { childFormSchema, type ChildFormValues } from "@/lib/schemas";
import { detectDuplicates } from "@/lib/duplicates";
import { canTransition, isEditable } from "@/lib/workflow";
import type { ValidationStatus } from "@/lib/constants";
import { fullName } from "@/lib/utils";
import { deactivateChildTokens } from "@/lib/qr";
import { notifyValidators, fail, ok, sessionMetadata, zodFieldErrors, type ActionState } from "./helpers";

const scrub = (value: string | undefined): string | null => (value && value.trim() ? value.trim() : null);

type FormValues = ChildFormValues;

function parseChildForm(formData: FormData) {
  const entries = Object.fromEntries(formData.entries());
  return {
    intent: entries.intent === "submit" ? ("submit" as const) : ("draft" as const),
    parsed: childFormSchema.safeParse(entries),
  };
}

function toInsert(v: FormValues): Omit<NewChild, "id" | "childCode" | "createdBy"> {
  return {
    firstName: v.firstName,
    middleName: scrub(v.middleName),
    lastName: v.lastName,
    suffix: scrub(v.suffix),
    birthDate: v.birthDate,
    sex: v.sex,
    barangayId: v.barangayId,
    addressDetails: scrub(v.addressDetails),
    guardianName: scrub(v.guardianName),
    guardianContact: scrub(v.guardianContact),
    educationalStatus: v.educationalStatus,
    schoolId: v.schoolId || null,
    gradeLevel: scrub(v.gradeLevel),
    schoolYear: scrub(v.schoolYear),
    eccdStatus: v.eccdStatus,
    eccdCenter: scrub(v.eccdCenter),
    eccdNonParticipationReason: scrub(v.eccdNonParticipationReason),
    disabilityStatus: v.disabilityStatus,
    disabilityType: scrub(v.disabilityType),
    disabilitySupportRequired: scrub(v.disabilitySupportRequired),
    disabilitySupportProvided: scrub(v.disabilitySupportProvided),
    disabilityReferral: scrub(v.disabilityReferral),
    notes: scrub(v.notes),
  };
}

async function registerDuplicates(
  childId: string,
  input: { firstName: string; lastName: string; middleName?: string; birthDate: string; barangayId: string },
) {
  const matches = await detectDuplicates({ ...input, excludeChildId: childId });
  await db
    .delete(duplicateCandidates)
    .where(
      and(
        or(eq(duplicateCandidates.childId, childId), eq(duplicateCandidates.candidateId, childId)),
        or(eq(duplicateCandidates.status, "potential"), eq(duplicateCandidates.status, "dismissed")),
      ),
    );
  if (matches.length > 0) {
    for (const m of matches) {
      await db
        .insert(duplicateCandidates)
        .values({
          id: crypto.randomUUID(),
          childId,
          candidateId: m.candidateId,
          matchReasons: JSON.stringify(m.reasons),
          status: "potential",
        })
        .onConflictDoNothing();
    }
    await db.update(children).set({ duplicateStatus: "potential" }).where(eq(children.id, childId));
  } else {
    const row = await db.select({ duplicateStatus: children.duplicateStatus }).from(children).where(eq(children.id, childId)).limit(1);
    if (row[0]?.duplicateStatus !== "confirmed") {
      await db.update(children).set({ duplicateStatus: "none" }).where(eq(children.id, childId));
    }
  }
}

/** Create a new child record. `intent=draft` saves; `intent=submit` queues for validation. */
export async function createChild(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("children.create");
  const { ip } = await sessionMetadata();
  if (!user) return fail("You do not have permission to create records.");

  const form = parseChildForm(formData);
  if (!form.parsed.success) {
    return fail("Please fix the highlighted fields.", zodFieldErrors(form.parsed.error.issues));
  }
  const values = toInsert(form.parsed.data);

  const targetStatus = form.intent === "submit" ? "pending_validation" : "draft";
  const childId = crypto.randomUUID();

  // Sequential code generation with a single retry on (rare) collision.
  let code = await nextChildCode();
  let inserted = false;
  for (let attempt = 0; attempt < 2 && !inserted; attempt++) {
    if (attempt > 0) code = await nextChildCode();
    try {
      await db.insert(children).values({
        id: childId,
        childCode: code,
        ...values,
        validationStatus: targetStatus,
        duplicateStatus: "none",
        createdBy: user.id,
        submittedAt: form.intent === "submit" ? new Date() : null,
      });
      inserted = true;
    } catch {
      inserted = false;
    }
  }
  if (!inserted) return fail("Could not create the record. Please try again.");

  await db.insert(validationHistory).values({
    id: crypto.randomUUID(),
    childId,
    action: "created",
    notes: form.intent === "submit" ? "Created and submitted for validation" : "Created as draft",
    performedBy: user.id,
  });

  await registerDuplicates(childId, {
    firstName: values.firstName,
    lastName: values.lastName,
    middleName: values.middleName ?? undefined,
    birthDate: values.birthDate,
    barangayId: values.barangayId,
  });

  await logAudit({
    userId: user.id, userRole: user.role,
    action: "child.create", entity: "child", entityId: childId, result: "success",
    metadata: { code, submitted: form.intent === "submit" }, ip,
  });

  if (form.intent === "submit") {
    const name = fullName(values);
    await notifyValidators(`${name} (${code}) was submitted for validation.`, `/children/${childId}`);
  }

  revalidatePath("/children");
  return ok(form.intent === "submit" ? "Record submitted for validation." : "Draft saved.", `/children/${childId}`);
}

/** Update an existing child record (draft/needs_correction are editable). */
export async function updateChild(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("children.update");
  const { ip } = await sessionMetadata();
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
  const values = toInsert(form.parsed.data);

  const isResubmit = child.validationStatus === "needs_correction" && form.intent === "submit";
  const targetStatus = isResubmit ? "pending_validation"
    : child.validationStatus === "draft" && form.intent === "submit" ? "pending_validation"
    : child.validationStatus;

  await db
    .update(children)
    .set({
      ...values,
      validationStatus: targetStatus,
      submittedAt: targetStatus === "pending_validation" ? (child.submittedAt ?? new Date()) : child.submittedAt,
      updatedAt: new Date(),
    })
    .where(eq(children.id, childId));

  await db.insert(validationHistory).values({
    id: crypto.randomUUID(),
    childId,
    action: isResubmit ? "resubmitted" : "updated",
    notes: isResubmit ? "Updated and resubmitted for validation" : "Record updated",
    performedBy: user.id,
  });

  await registerDuplicates(childId, {
    firstName: values.firstName,
    lastName: values.lastName,
    middleName: values.middleName ?? undefined,
    birthDate: values.birthDate,
    barangayId: values.barangayId,
  });

  await logAudit({
    userId: user.id, userRole: user.role,
    action: "child.update", entity: "child", entityId: childId, result: "success",
    metadata: { resubmitted: isResubmit }, ip,
  });

  if (isResubmit) {
    const name = fullName(values);
    await notifyValidators(`${name} (${child.childCode}) was resubmitted for validation.`, `/children/${childId}`);
  }

  const toPath = isResubmit ? "/validation" : `/children/${childId}`;
  revalidatePath("/children");
  revalidatePath(`/children/${childId}`);
  return ok("Record updated.", toPath);
}

/** Submit a draft / needs-correction record for validation. */
export async function submitChild(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("children.update");
  const { ip } = await sessionMetadata();
  if (!user) return fail("You do not have permission.");

  const childId = String(formData.get("childId") ?? "");
  const rows = await db.select().from(children).where(eq(children.id, childId)).limit(1);
  const child = rows[0];
  if (!child) return fail("Record not found.");
  if (!canEditChild(user, child)) return fail("You cannot modify this record.");
  if (!isEditable(child.validationStatus as ValidationStatus)) return fail("This record cannot be submitted in its current state.");

  await db
    .update(children)
    .set({ validationStatus: "pending_validation", submittedAt: child.submittedAt ?? new Date(), updatedAt: new Date() })
    .where(eq(children.id, child.id));

  await db.insert(validationHistory).values({
    id: crypto.randomUUID(),
    childId: child.id,
    action: "submitted",
    notes: "Submitted for validation",
    performedBy: user.id,
  });

  const name = fullName(child);
  await notifyValidators(`${name} (${child.childCode}) was submitted for validation.`, `/children/${child.id}`);

  await logAudit({
    userId: user.id, userRole: user.role,
    action: "child.submit", entity: "child", entityId: child.id, result: "success", ip,
  });

  revalidatePath("/children");
  return ok("Submitted for validation.", "/validation");
}

/** Validator decision: `decision=verified` or `decision=returned`, with notes. */
export async function validateChild(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("children.validate");
  const { ip } = await sessionMetadata();
  if (!user) return fail("You do not have permission to validate records.");

  const childId = String(formData.get("childId") ?? "");
  const decision = String(formData.get("decision") ?? "") as "verified" | "returned";
  const notes = scrub(String(formData.get("notes") ?? ""));

  const rows = await db.select().from(children).where(eq(children.id, childId)).limit(1);
  const child = rows[0];
  if (!child) return fail("Record not found.");
  if (!canAccessChild(user, child)) return fail("This record is outside your scope.");

  const target = decision === "verified" ? "verified" : "needs_correction";
  if (target === "verified" && !canTransition(child.validationStatus as ValidationStatus, "verified")) {
    return fail("This record cannot be verified in its current state.");
  }
  if (target === "needs_correction" && child.validationStatus === "verified") {
    return fail("Re-opening a verified record requires an administrator.");
  }

  await db
    .update(children)
    .set({
      validationStatus: target,
      ...(target === "verified"
        ? { verifiedBy: user.id, verifiedAt: new Date(), validationNotes: notes }
        : { validationNotes: notes }),
      updatedAt: new Date(),
    })
    .where(eq(children.id, child.id));

  await db.insert(validationHistory).values({
    id: crypto.randomUUID(),
    childId: child.id,
    action: target === "verified" ? "verified" : "returned",
    notes: notes || (target === "verified" ? "Record verified" : "Returned for correction"),
    performedBy: user.id,
  });

  await notify({
    userId: child.createdBy,
    type: target === "verified" ? "verified" : "correction",
    title: target === "verified" ? "Record verified" : "Record needs correction",
    body: `${fullName(child)} (${child.childCode}) was ${target === "verified" ? "verified" : "returned for correction"}${notes ? `: ${notes}` : ""}.`,
    link: `/children/${child.id}`,
  });

  await logAudit({
    userId: user.id, userRole: user.role,
    action: `child.${target === "verified" ? "verify" : "return"}`, entity: "child", entityId: child.id, result: "success",
    metadata: { notes }, ip,
  });

  revalidatePath("/validation");
  revalidatePath(`/children/${child.id}`);
  return ok(target === "verified" ? "Record verified." : "Returned for correction.");
}

/** Admin only: re-open a verified record back into the validation queue. */
export async function reopenChild(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("children.validate");
  const { ip } = await sessionMetadata();
  if (!user || user.role !== "admin") return fail("Only administrators can re-open verified records.");

  const childId = String(formData.get("childId") ?? "");
  const rows = await db.select().from(children).where(eq(children.id, childId)).limit(1);
  const child = rows[0];
  if (!child) return fail("Record not found.");
  if (child.validationStatus !== "verified") return fail("Only verified records can be re-opened.");

  await db
    .update(children)
    .set({ validationStatus: "pending_validation", updatedAt: new Date() })
    .where(eq(children.id, child.id));

  await db.insert(validationHistory).values({
    id: crypto.randomUUID(), childId: child.id, action: "updated",
    notes: "Re-opened for re-validation", performedBy: user.id,
  });

  await logAudit({
    userId: user.id, userRole: user.role,
    action: "child.reopen", entity: "child", entityId: child.id, result: "success", ip,
  });

  revalidatePath("/children");
  return ok("Record re-opened for validation.", "/validation");
}

/** Delete a draft/needs-correction record (admin/LGU only). */
export async function deleteChildRecord(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("children.update");
  const { ip } = await sessionMetadata();
  if (!user || (user.role !== "admin" && user.role !== "lgu")) return fail("You cannot delete records.");

  const childId = String(formData.get("childId") ?? "");
  const rows = await db.select().from(children).where(eq(children.id, childId)).limit(1);
  const child = rows[0];
  if (!child) return fail("Record not found.");
  if (!canAccessChild(user, child)) return fail("This record is outside your scope.");
  if (isEditable(child.validationStatus as ValidationStatus) === false && child.validationStatus !== "draft") {
    return fail("Only draft records can be deleted.");
  }

  await deactivateChildTokens(child.id);
  await db.delete(children).where(eq(children.id, child.id));

  await logAudit({
    userId: user.id, userRole: user.role,
    action: "child.delete", entity: "child", entityId: child.id, result: "success",
    metadata: { code: child.childCode }, ip,
  });

  revalidatePath("/children");
  return ok("Record deleted.");
}