"use server";

import { alias } from "drizzle-orm/sqlite-core";
import { and, eq, isNull, ne, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  employees,
  schoolYears,
  sectionSubjectTeachers,
  sections,
  subjects,
  userRoles,
  users,
} from "@/db/schema";
import { getAuthorizedUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  ADVISER_ROLE_ID,
  checkAdviserChange,
  checkSubjectTeacherChange,
  SUBJECT_TEACHER_ROLE_ID,
} from "@/lib/assignment-rules";
import { ensureUserRole } from "@/lib/user-roles";
import { fail, ok, sessionMetadata, type ActionState } from "./helpers";

/**
 * Admin teacher-assignment actions (Adviser + Subject Teacher).
 *
 * One account may hold BOTH assignments: the advisory is a whole-section
 * responsibility (`sections.adviser_id`) and grade encoding is per
 * (section, subject) load (`section_subject_teachers`). Assigning a load grants
 * the Subject Teacher role, assigning an advisory grants the Adviser role, so
 * the permission gate and the assignment never disagree.
 *
 * Invariants enforced here (the UI is never trusted):
 *   - the section must exist and be active;
 *   - the teacher account must exist, be active and hold a teaching role;
 *   - one adviser per section, one teacher per (section, subject);
 *   - an existing assignment is never silently overwritten — remove first.
 */

function displayName(u: {
  firstName: string;
  middleName: string | null;
  lastName: string;
}): string {
  return [u.firstName, u.middleName, u.lastName].filter(Boolean).join(" ");
}

type Teacher = {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  isActive: boolean;
  roleId: string;
};

async function loadTeacher(
  teacherId: string,
): Promise<{ teacher: Teacher } | { error: string }> {
  if (!teacherId) return { error: "Select a teacher." };
  const rows = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      middleName: users.middleName,
      lastName: users.lastName,
      isActive: users.isActive,
      roleId: users.roleId,
      extraRoleId: userRoles.roleId,
    })
    .from(users)
    .leftJoin(
      userRoles,
      and(
        eq(userRoles.userId, users.id),
        eq(userRoles.roleId, SUBJECT_TEACHER_ROLE_ID),
      ),
    )
    // Dummy/test accounts are never assignable — treated as "not found".
    .where(and(eq(users.id, teacherId), eq(users.isDummy, false)))
    .limit(1);
  const row = rows[0];
  if (!row) return { error: "That teacher account was not found." };
  if (!row.isActive) return { error: "That account is deactivated — re-activate it first." };
  const isTeaching =
    row.roleId === ADVISER_ROLE_ID ||
    row.roleId === SUBJECT_TEACHER_ROLE_ID ||
    row.extraRoleId === SUBJECT_TEACHER_ROLE_ID;
  if (!isTeaching) {
    return {
      error:
        "That account does not hold a teaching role. Grant Adviser or Subject Teacher on the Users page first.",
    };
  }
  return { teacher: row };
}

async function loadActiveSection(
  sectionId: string,
): Promise<
  | {
      section: {
        id: string;
        name: string;
        adviserId: string | null;
        schoolYearId: string;
        gradeLevelId: string;
        schoolYear: string;
      };
      adviserName: string | null;
    }
  | { error: string }
> {
  if (!sectionId) return { error: "Select a section." };
  const advisor = alias(users, "advisor");
  const rows = await db
    .select({
      id: sections.id,
      name: sections.name,
      adviserId: sections.adviserId,
      schoolYearId: sections.schoolYearId,
      gradeLevelId: sections.gradeLevelId,
      isActive: sections.isActive,
      schoolYear: schoolYears.year,
      adviserFirst: advisor.firstName,
      adviserMiddle: advisor.middleName,
      adviserLast: advisor.lastName,
    })
    .from(sections)
    .innerJoin(schoolYears, eq(schoolYears.id, sections.schoolYearId))
    .leftJoin(advisor, eq(advisor.id, sections.adviserId))
    .where(eq(sections.id, sectionId))
    .limit(1);
  const row = rows[0];
  if (!row) return { error: "That section was not found." };
  if (!row.isActive) return { error: "That section is deactivated — re-activate it first." };

  const adviserName =
    row.adviserFirst || row.adviserLast
      ? displayName({
          firstName: row.adviserFirst ?? "",
          middleName: row.adviserMiddle,
          lastName: row.adviserLast ?? "",
        })
      : null;

  return {
    section: {
      id: row.id,
      name: row.name,
      adviserId: row.adviserId,
      schoolYearId: row.schoolYearId,
      gradeLevelId: row.gradeLevelId,
      schoolYear: row.schoolYear,
    },
    adviserName,
  };
}

function revalidateAssignments(): void {
  revalidatePath("/assignments");
  revalidatePath("/sections");
  revalidatePath("/employees");
  revalidatePath("/grades");
  revalidatePath("/dashboard");
}

/** Assign one teacher as the adviser of one section. */
export async function assignAdviser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getAuthorizedUser("academics.config");
  if (!user) return fail("You do not have permission to manage teacher assignments.");
  const { ip, userAgent } = await sessionMetadata();

  const sectionId = String(formData.get("sectionId") ?? "");
  const teacherId = String(formData.get("teacherId") ?? "");

  const sectionResult = await loadActiveSection(sectionId);
  if ("error" in sectionResult) return fail(sectionResult.error, { sectionId: sectionResult.error });
  const { section, adviserName } = sectionResult;

  const teacherResult = await loadTeacher(teacherId);
  if ("error" in teacherResult) return fail(teacherResult.error, { teacherId: teacherResult.error });
  const { teacher } = teacherResult;

  const check = checkAdviserChange(section.adviserId, teacher.id, adviserName);
  if (!check.ok) return fail(check.error, { teacherId: check.error });

  // Personnel records also claim sections. Refuse to create a second claim
  // from a different account; the Admin must resolve that record explicitly.
  const conflictingEmployee = await db
    .select({ id: employees.id, employeeNumber: employees.employeeNumber })
    .from(employees)
    .where(
      and(
        eq(employees.assignedSectionId, sectionId),
        eq(employees.status, "active"),
        // An unlinked employee record still claims the section.
        or(isNull(employees.userId), ne(employees.userId, teacher.id)),
      ),
    )
    .limit(1);
  if (conflictingEmployee.length > 0) {
    return fail(
      `Section ${section.name} is already claimed by employee ${conflictingEmployee[0].employeeNumber} on the Employees page. Update that personnel record first.`,
    );
  }

  try {
    await db
      .update(sections)
      .set({ adviserId: teacher.id, updatedAt: new Date() })
      .where(eq(sections.id, sectionId));
    // Keep the linked personnel record in step with the assignment.
    await db
      .update(employees)
      .set({ assignedSectionId: sectionId, updatedAt: new Date(), updatedBy: user.id })
      .where(and(eq(employees.userId, teacher.id), eq(employees.status, "active")));
  } catch (error) {
    console.error("[assignAdviser] failed", error);
    return fail("Could not save the adviser assignment. Please try again.");
  }

  const roleGranted = await ensureUserRole(teacher.id, ADVISER_ROLE_ID);

  await logAudit({
    userId: user.id,
    action: "ASSIGN_ADVISER",
    entityType: "section",
    entityId: sectionId,
    oldValues: { adviserId: section.adviserId },
    newValues: {
      adviserId: teacher.id,
      adviserName: displayName(teacher),
      schoolYear: section.schoolYear,
      roleGranted,
    },
    ipAddress: ip,
    userAgent,
  });

  revalidateAssignments();
  return ok(
    `${displayName(teacher)} is now the adviser of ${section.name} (SY ${section.schoolYear}).`,
  );
}

/** Remove the adviser assignment (the account and its other roles stay). */
export async function clearAdviser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getAuthorizedUser("academics.config");
  if (!user) return fail("You do not have permission to manage teacher assignments.");
  const { ip, userAgent } = await sessionMetadata();

  const sectionId = String(formData.get("sectionId") ?? "");
  const sectionResult = await loadActiveSection(sectionId);
  if ("error" in sectionResult) return fail(sectionResult.error);
  const { section, adviserName } = sectionResult;
  if (!section.adviserId) return fail("That section has no adviser assignment.");

  try {
    await db
      .update(sections)
      .set({ adviserId: null, updatedAt: new Date() })
      .where(eq(sections.id, sectionId));
    await db
      .update(employees)
      .set({ assignedSectionId: null, updatedAt: new Date(), updatedBy: user.id })
      .where(
        and(
          eq(employees.userId, section.adviserId),
          eq(employees.assignedSectionId, sectionId),
        ),
      );
  } catch (error) {
    console.error("[clearAdviser] failed", error);
    return fail("Could not remove the adviser assignment. Please try again.");
  }

  await logAudit({
    userId: user.id,
    action: "CLEAR_ADVISER",
    entityType: "section",
    entityId: sectionId,
    oldValues: { adviserId: section.adviserId, adviserName },
    newValues: { adviserId: null },
    ipAddress: ip,
    userAgent,
  });

  revalidateAssignments();
  return ok(`Adviser assignment removed from ${section.name}.`);
}

/** Assign one teacher to one subject in one section (a grade-encoding load). */
export async function assignSubjectTeacher(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getAuthorizedUser("academics.config");
  if (!user) return fail("You do not have permission to manage teacher assignments.");
  const { ip, userAgent } = await sessionMetadata();

  const sectionId = String(formData.get("sectionId") ?? "");
  const subjectId = String(formData.get("subjectId") ?? "");
  const teacherId = String(formData.get("teacherId") ?? "");

  const sectionResult = await loadActiveSection(sectionId);
  if ("error" in sectionResult) return fail(sectionResult.error, { sectionId: sectionResult.error });
  const { section } = sectionResult;

  if (!subjectId) return fail("Select a subject.", { subjectId: "Select a subject" });
  const subjectRows = await db
    .select({ id: subjects.id, name: subjects.name, code: subjects.code, isActive: subjects.isActive })
    .from(subjects)
    .where(eq(subjects.id, subjectId))
    .limit(1);
  const subject = subjectRows[0];
  if (!subject) return fail("That subject was not found.", { subjectId: "Subject not found" });
  if (!subject.isActive) {
    return fail("That subject is deactivated — re-activate it first.", {
      subjectId: "Subject is deactivated",
    });
  }

  const teacherResult = await loadTeacher(teacherId);
  if ("error" in teacherResult) return fail(teacherResult.error, { teacherId: teacherResult.error });
  const { teacher } = teacherResult;

  const existingRows = await db
    .select({
      id: sectionSubjectTeachers.id,
      teacherId: sectionSubjectTeachers.teacherId,
      firstName: users.firstName,
      middleName: users.middleName,
      lastName: users.lastName,
    })
    .from(sectionSubjectTeachers)
    .innerJoin(users, eq(users.id, sectionSubjectTeachers.teacherId))
    .where(
      and(
        eq(sectionSubjectTeachers.sectionId, sectionId),
        eq(sectionSubjectTeachers.subjectId, subjectId),
      ),
    )
    .limit(1);
  const existing = existingRows[0]
    ? {
        teacherId: existingRows[0].teacherId,
        teacherName: displayName(existingRows[0]),
      }
    : null;

  const check = checkSubjectTeacherChange(existing, teacher.id);
  if (!check.ok) return fail(check.error, { teacherId: check.error });

  try {
    await db.insert(sectionSubjectTeachers).values({
      id: crypto.randomUUID(),
      sectionId,
      subjectId,
      teacherId: teacher.id,
    });
  } catch (error) {
    console.error("[assignSubjectTeacher] failed", error);
    return fail("Could not save the teaching load. Please try again.");
  }

  // A teaching load is what grants `grades.write` / `grades.encode`; grant the
  // role immediately so the newly assigned teacher can encode.
  const roleGranted = await ensureUserRole(teacher.id, SUBJECT_TEACHER_ROLE_ID);

  await logAudit({
    userId: user.id,
    action: "ASSIGN_SUBJECT_TEACHER",
    entityType: "section_subject_teacher",
    entityId: `${sectionId}:${subjectId}`,
    oldValues: existing ? { teacherId: existing.teacherId } : null,
    newValues: {
      sectionId,
      sectionName: section.name,
      subjectId,
      subjectCode: subject.code,
      teacherId: teacher.id,
      teacherName: displayName(teacher),
      schoolYear: section.schoolYear,
      roleGranted,
    },
    ipAddress: ip,
    userAgent,
  });

  revalidateAssignments();
  return ok(
    `${displayName(teacher)} can now encode ${subject.code} in ${section.name}.`,
  );
}

/** Remove a (section, subject) teaching load. */
export async function removeSubjectTeacher(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getAuthorizedUser("academics.config");
  if (!user) return fail("You do not have permission to manage teacher assignments.");
  const { ip, userAgent } = await sessionMetadata();

  const assignmentId = String(formData.get("assignmentId") ?? "");
  if (!assignmentId) return fail("Missing assignment identifier.");

  const rows = await db
    .select({
      id: sectionSubjectTeachers.id,
      sectionId: sectionSubjectTeachers.sectionId,
      subjectId: sectionSubjectTeachers.subjectId,
      teacherId: sectionSubjectTeachers.teacherId,
      sectionName: sections.name,
      subjectCode: subjects.code,
      teacherFirst: users.firstName,
      teacherMiddle: users.middleName,
      teacherLast: users.lastName,
    })
    .from(sectionSubjectTeachers)
    .innerJoin(sections, eq(sections.id, sectionSubjectTeachers.sectionId))
    .innerJoin(subjects, eq(subjects.id, sectionSubjectTeachers.subjectId))
    .innerJoin(users, eq(users.id, sectionSubjectTeachers.teacherId))
    .where(eq(sectionSubjectTeachers.id, assignmentId))
    .limit(1);
  const assignment = rows[0];
  if (!assignment) return fail("That teaching assignment no longer exists.");

  try {
    await db
      .delete(sectionSubjectTeachers)
      .where(eq(sectionSubjectTeachers.id, assignmentId));
  } catch (error) {
    console.error("[removeSubjectTeacher] failed", error);
    return fail("Could not remove the teaching load. Please try again.");
  }

  await logAudit({
    userId: user.id,
    action: "REMOVE_SUBJECT_TEACHER",
    entityType: "section_subject_teacher",
    entityId: assignmentId,
    oldValues: {
      sectionId: assignment.sectionId,
      subjectId: assignment.subjectId,
      teacherId: assignment.teacherId,
      teacherName: displayName({
        firstName: assignment.teacherFirst,
        middleName: assignment.teacherMiddle,
        lastName: assignment.teacherLast,
      }),
    },
    newValues: null,
    ipAddress: ip,
    userAgent,
  });

  revalidateAssignments();
  return ok(
    `Teaching load removed: ${assignment.subjectCode} in ${assignment.sectionName}. Grades already encoded are kept.`,
  );
}
