import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import {
  gradeLevels,
  schoolYears,
  sectionSubjectTeachers,
  sections,
  subjects,
  userRoles,
  users,
} from "@/db/schema";

/**
 * Teacher assignment queries (Adviser + Subject Teacher). The assignment
 * invariants live in `assignment-rules.ts` (pure, unit-tested); this module
 * only reads the data the Admin screen renders.
 */
import {
  SUBJECT_TEACHER_ROLE_ID,
  TEACHING_ROLE_IDS,
} from "./assignment-rules";

/* -------------------------------- queries --------------------------------- */

export type AssignmentSectionOption = {
  id: string;
  name: string;
  gradeLevelId: string;
  gradeLevelName: string;
  gradeLevelOrder: number;
  schoolYearId: string;
  schoolYear: string;
  isActive: boolean;
  adviserId: string | null;
  adviserName: string | null;
};

export type AssignmentTeacherOption = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  /** true when the account already holds the Subject Teacher role (extra or primary). */
  canTeachSubject: boolean;
};

export type SubjectTeacherAssignment = {
  id: string;
  sectionId: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherId: string;
  teacherName: string;
};

const displayName = (r: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
}) => [r.firstName, r.middleName, r.lastName].filter(Boolean).join(" ");

/**
 * Active sections for one school year (or every year when omitted), with their
 * adviser resolved from the live account row.
 */
export async function assignmentSections(
  schoolYearId?: string,
): Promise<AssignmentSectionOption[]> {
  const adviser = users;
  const rows = await db
    .select({
      id: sections.id,
      name: sections.name,
      gradeLevelId: sections.gradeLevelId,
      gradeLevelName: gradeLevels.name,
      gradeLevelOrder: gradeLevels.orderIndex,
      schoolYearId: sections.schoolYearId,
      schoolYear: schoolYears.year,
      isActive: sections.isActive,
      adviserId: sections.adviserId,
      adviserFirst: adviser.firstName,
      adviserMiddle: adviser.middleName,
      adviserLast: adviser.lastName,
    })
    .from(sections)
    .innerJoin(gradeLevels, eq(gradeLevels.id, sections.gradeLevelId))
    .innerJoin(schoolYears, eq(schoolYears.id, sections.schoolYearId))
    .leftJoin(adviser, eq(adviser.id, sections.adviserId))
    .where(
      and(
        eq(sections.isActive, true),
        schoolYearId ? eq(sections.schoolYearId, schoolYearId) : undefined,
      ),
    )
    .orderBy(desc(schoolYears.year), asc(gradeLevels.orderIndex), asc(sections.name));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    gradeLevelId: r.gradeLevelId,
    gradeLevelName: r.gradeLevelName,
    gradeLevelOrder: r.gradeLevelOrder,
    schoolYearId: r.schoolYearId,
    schoolYear: r.schoolYear,
    isActive: r.isActive,
    adviserId: r.adviserId,
    adviserName:
      r.adviserFirst || r.adviserLast
        ? displayName({
            firstName: r.adviserFirst ?? "",
            middleName: r.adviserMiddle,
            lastName: r.adviserLast ?? "",
          })
        : null,
  }));
}

/**
 * Active accounts eligible for assignment: they hold at least one teaching
 * role, either as their primary role or as an additional role.
 */
export async function assignmentTeacherOptions(): Promise<AssignmentTeacherOption[]> {
  const extraRoleHolders = db
    .select({ id: userRoles.userId })
    .from(userRoles)
    .where(inArray(userRoles.roleId, TEACHING_ROLE_IDS));

  const rows = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      middleName: users.middleName,
      lastName: users.lastName,
      email: users.email,
      roleId: users.roleId,
      subjectTeacherRoleId: userRoles.roleId,
    })
    .from(users)
    .leftJoin(
      userRoles,
      and(
        eq(userRoles.userId, users.id),
        eq(userRoles.roleId, SUBJECT_TEACHER_ROLE_ID),
      ),
    )
    .where(
      and(
        eq(users.isActive, true),
        // Dummy/test accounts are login-only and are never assignable.
        eq(users.isDummy, false),
        or(
          inArray(users.roleId, TEACHING_ROLE_IDS),
          inArray(users.id, extraRoleHolders),
        ),
      ),
    )
    .orderBy(asc(users.lastName), asc(users.firstName));

  return rows.map((r) => ({
    id: r.id,
    name: displayName(r),
    email: r.email,
    roleId: r.roleId,
    canTeachSubject:
      r.roleId === SUBJECT_TEACHER_ROLE_ID ||
      r.subjectTeacherRoleId === SUBJECT_TEACHER_ROLE_ID,
  }));
}

/** Subject-teacher loads for the given sections, with subject + teacher names. */
export async function subjectAssignmentsForSections(
  sectionIds: string[],
): Promise<SubjectTeacherAssignment[]> {
  if (sectionIds.length === 0) return [];
  const rows = await db
    .select({
      id: sectionSubjectTeachers.id,
      sectionId: sectionSubjectTeachers.sectionId,
      subjectId: sectionSubjectTeachers.subjectId,
      subjectName: subjects.name,
      subjectCode: subjects.code,
      teacherId: sectionSubjectTeachers.teacherId,
      teacherFirst: users.firstName,
      teacherMiddle: users.middleName,
      teacherLast: users.lastName,
    })
    .from(sectionSubjectTeachers)
    .innerJoin(subjects, eq(subjects.id, sectionSubjectTeachers.subjectId))
    .innerJoin(users, eq(users.id, sectionSubjectTeachers.teacherId))
    .where(inArray(sectionSubjectTeachers.sectionId, sectionIds))
    .orderBy(asc(subjects.code));

  return rows.map((r) => ({
    id: r.id,
    sectionId: r.sectionId,
    subjectId: r.subjectId,
    subjectName: r.subjectName,
    subjectCode: r.subjectCode,
    teacherId: r.teacherId,
    teacherName: displayName({
      firstName: r.teacherFirst,
      middleName: r.teacherMiddle,
      lastName: r.teacherLast,
    }),
  }));
}

/** Active subjects (the catalog a teaching load may point at). */
export async function assignmentSubjectOptions(): Promise<
  { id: string; name: string; code: string }[]
> {
  return db
    .select({ id: subjects.id, name: subjects.name, code: subjects.code })
    .from(subjects)
    .where(eq(subjects.isActive, true))
    .orderBy(asc(subjects.code));
}
