"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { gradeLevels, schoolYears, sections, users } from "@/db/schema";
import { getAuthorizedUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { fail, ok, sessionMetadata, zodFieldErrors, type ActionState } from "./helpers";

/**
 * Section management — Administrator domain (`academics.config`).
 *
 * Every value that maps to an existing entity (school year, grade level,
 * adviser) arrives as an id selected from a dropdown and is re-validated
 * server-side here; free-text entry is never accepted for those fields.
 */

const sectionFormSchema = z.object({
  id: z.string().optional(),
  schoolYearId: z.string().min(1, "Select a school year"),
  gradeLevelId: z.string().min(1, "Select a grade level"),
  name: z
    .string()
    .trim()
    .min(2, "Section name must be at least 2 characters")
    .max(60, "Section name is too long"),
  adviserId: z.optional(z.string()),
});

function parseSectionForm(formData: FormData) {
  return sectionFormSchema.safeParse({
    id: (formData.get("id") as string) || undefined,
    schoolYearId: (formData.get("schoolYearId") as string) || "",
    gradeLevelId: (formData.get("gradeLevelId") as string) || "",
    name: (formData.get("name") as string) || "",
    adviserId: ((formData.get("adviserId") as string) || "").trim() || undefined,
  });
}

/** A friendly message for the (school_year, grade_level, name) unique index. */
function uniqueViolationMessage(name: string): string {
  return `A section named "${name}" already exists for that grade level and school year.`;
}

/**
 * Shared validations for create & update:
 *   - school year exists
 *   - grade level exists (id must come from the grade_levels entity)
 *   - adviser, when provided, is an active user
 */
async function validateSectionRefs(
  schoolYearId: string,
  gradeLevelId: string,
  adviserId?: string,
): Promise<string | null> {
  const syRows = await db
    .select({ id: schoolYears.id })
    .from(schoolYears)
    .where(eq(schoolYears.id, schoolYearId))
    .limit(1);
  if (!syRows[0]) return "Select a valid school year.";

  const glRows = await db
    .select({ id: gradeLevels.id })
    .from(gradeLevels)
    .where(eq(gradeLevels.id, gradeLevelId))
    .limit(1);
  if (!glRows[0]) return "Select a valid grade level.";

  if (adviserId) {
    const adviserRows = await db
      .select({ isActive: users.isActive, isDummy: users.isDummy })
      .from(users)
      .where(eq(users.id, adviserId))
      .limit(1);
    if (!adviserRows[0]) return "Selected adviser not found.";
    // Dummy/test accounts can never advise a real section.
    if (adviserRows[0].isDummy) return "Selected adviser not found.";
    if (!adviserRows[0].isActive) return "The selected adviser account is inactive.";
  }
  return null;
}

/** Create a section for a school year / grade level, optionally advised. */
export async function createSection(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("academics.config");
  if (!user) return fail("You do not have permission to manage sections.");

  const parsed = parseSectionForm(formData);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  }
  const v = parsed.data;

  const refError = await validateSectionRefs(v.schoolYearId, v.gradeLevelId, v.adviserId);
  if (refError) return fail(refError);

  const sectionId = crypto.randomUUID();
  const { ip, userAgent } = await sessionMetadata();
  try {
    await db.insert(sections).values({
      id: sectionId,
      schoolYearId: v.schoolYearId,
      gradeLevelId: v.gradeLevelId,
      name: v.name,
      adviserId: v.adviserId ?? null,
      isActive: true,
    });
  } catch (error) {
    console.error("[createSection] insert failed", error);
    // Unique (school_year, grade_level, name) → friendly duplicate message.
    return fail(uniqueViolationMessage(v.name), { name: "Section name already used" });
  }

  await logAudit({
    userId: user.id,
    action: "CREATE_SECTION",
    entityType: "section",
    entityId: sectionId,
    newValues: { name: v.name, schoolYearId: v.schoolYearId, gradeLevelId: v.gradeLevelId, adviserId: v.adviserId ?? null },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/sections");
  revalidatePath("/dashboard");
  return ok("Section created.");
}

/** Edit a section's name / school year / grade level / adviser. */
export async function updateSection(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("academics.config");
  if (!user) return fail("You do not have permission to manage sections.");

  const parsed = parseSectionForm(formData);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  }
  const v = parsed.data;
  if (!v.id) return fail("Missing section identifier.");

  const existingRows = await db
    .select({ id: sections.id, name: sections.name })
    .from(sections)
    .where(eq(sections.id, v.id))
    .limit(1);
  if (!existingRows[0]) return fail("Section not found.");

  const refError = await validateSectionRefs(v.schoolYearId, v.gradeLevelId, v.adviserId);
  if (refError) return fail(refError);

  const { ip, userAgent } = await sessionMetadata();
  try {
    await db
      .update(sections)
      .set({
        schoolYearId: v.schoolYearId,
        gradeLevelId: v.gradeLevelId,
        name: v.name,
        adviserId: v.adviserId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(sections.id, v.id));
  } catch (error) {
    console.error("[updateSection] update failed", error);
    return fail(uniqueViolationMessage(v.name), { name: "Section name already used" });
  }

  await logAudit({
    userId: user.id,
    action: "UPDATE_SECTION",
    entityType: "section",
    entityId: v.id,
    oldValues: { name: existingRows[0].name },
    newValues: { name: v.name, schoolYearId: v.schoolYearId, gradeLevelId: v.gradeLevelId, adviserId: v.adviserId ?? null },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/sections");
  revalidatePath("/dashboard");
  return ok("Section updated.");
}

/** Activate / deactivate a section (soft toggle; enrollment data is kept). */
export async function setSectionActive(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("academics.config");
  if (!user) return fail("You do not have permission to manage sections.");

  const sectionId = String(formData.get("sectionId") ?? "");
  const nextActive = String(formData.get("isActive") ?? "") === "true";
  if (!sectionId) return fail("Missing section identifier.");

  const rows = await db
    .select({ id: sections.id, isActive: sections.isActive, name: sections.name })
    .from(sections)
    .where(eq(sections.id, sectionId))
    .limit(1);
  const section = rows[0];
  if (!section) return fail("Section not found.");
  if (section.isActive === nextActive) return ok(nextActive ? "Section already active." : "Section already deactivated.");

  const { ip, userAgent } = await sessionMetadata();
  try {
    await db
      .update(sections)
      .set({ isActive: nextActive, updatedAt: new Date() })
      .where(eq(sections.id, sectionId));
  } catch (error) {
    console.error("[setSectionActive] update failed", error);
    return fail("Could not update the section. Please try again.");
  }

  await logAudit({
    userId: user.id,
    action: nextActive ? "ACTIVATE_SECTION" : "DEACTIVATE_SECTION",
    entityType: "section",
    entityId: sectionId,
    oldValues: { isActive: section.isActive },
    newValues: { isActive: nextActive },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/sections");
  return ok(nextActive ? "Section activated." : "Section deactivated.");
}

/** FormData-only wrapper so plain <form action={…}> usage works. */
export async function setSectionActiveForm(formData: FormData): Promise<void> {
  await setSectionActive({ ok: false, error: "" }, formData);
}


