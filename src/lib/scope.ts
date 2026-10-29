import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  behaviorRecords,
  sectionSubjectTeachers,
  sections,
  studentEnrollments,
} from "@/db/schema";
import type { SessionUser } from "./auth";

/**
 * Row-level scoping for student records.
 *
 * - admin / school_admin / records / guidance / nurse / registrar /
 *   literacy_coordinator → all students (domain gating — which tables a role
 *   may read or write — is handled by permission checks, not row scope)
 * - admin_officer → no student rows at all (employee-records domain)
 * - teacher (Adviser) → students with an active enrollment in a section where
 *   the user is the adviser (parameter-driven, never string-interpolated from
 *   user input)
 * - subject_teacher → students with an active enrollment in a section holding
 *   one of the user's `section_subject_teachers` teaching loads
 * - unknown roles → nothing
 *
 * Used by every read *and* write path so that authorization cannot be
 * bypassed by calling the API directly.
 */

/** Sections where the user is the adviser (any school year). */
export async function adviserSectionIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ id: sections.id })
    .from(sections)
    .where(eq(sections.adviserId, userId));
  return rows.map((r) => r.id);
}

/** Sections the user holds a subject-teaching load in (any school year). */
export async function subjectTeacherSectionIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ id: sectionSubjectTeachers.sectionId })
    .from(sectionSubjectTeachers)
    .where(eq(sectionSubjectTeachers.teacherId, userId));
  return Array.from(new Set(rows.map((r) => r.id)));
}

/**
 * SQL `inArray` predicate over the enrollment join for the given sections.
 * Per the permission matrix the teacher/adviser scope covers students with an
 * *active* enrollment in one of their sections — completed/transferred/
 * withdrawn enrollments fall outside the adviser's row scope.
 */
function enrollmentInSection(studentIdColumn: SQL, sectionIds: string[]): SQL {
  return sql`exists (
    select 1 from ${studentEnrollments}
    where ${studentEnrollments.studentId} = ${studentIdColumn}
      and ${inArray(studentEnrollments.sectionId, sectionIds)}
      and ${eq(studentEnrollments.status, "active")}
  )`;
}

/**
 * SQL predicate limiting `students` rows to the user's scope.
 * Returns `undefined` for school-wide roles (no filter) and a never-true
 * predicate for teachers with no sections / unknown roles.
 */
export function studentScope(user: SessionUser, sectionIds?: string[]): SQL | undefined {
  switch (user.role) {
    case "admin":
    case "school_admin":
    case "records":
    case "guidance":
    case "nurse":
    case "registrar":
    case "literacy_coordinator":
      return undefined; // school-wide
    case "teacher":
    case "subject_teacher": {
      const ids = sectionIds ?? [];
      if (ids.length === 0) return sql`1 = 0`;
      return enrollmentInSection(sql`students.id`, ids);
    }
    default:
      return sql`1 = 0`;
  }
}

/** Convenience: resolve the user's section ids then build the scope. */
export async function userSectionScope(user: SessionUser): Promise<SQL | undefined> {
  if (user.role === "teacher") {
    return studentScope(user, await adviserSectionIds(user.id));
  }
  if (user.role === "subject_teacher") {
    return studentScope(user, await subjectTeacherSectionIds(user.id));
  }
  return studentScope(user);
}

export type StudentScopeRef = {
  studentId: string;
};

/**
 * Confidential (Guidance Office) behavior records are readable only by
 * admin, school_admin and guidance roles. Every role that holds
 * `behavior.view` still sees non-confidential classroom records.
 */
export function canViewConfidentialBehavior(user: SessionUser): boolean {
  return (
    user.role === "admin" || user.role === "school_admin" || user.role === "guidance"
  );
}

/** SQL predicate excluding confidential behavior rows for the given user. */
export function confidentialBehaviorFilter(
  user: SessionUser,
  column = behaviorRecords.confidential,
): SQL | undefined {
  if (canViewConfidentialBehavior(user)) return undefined;
  return eq(column, false);
}

/** Resolve which sections gate this scoped teaching role's row access. */
async function scopedTeachingSectionIds(user: SessionUser): Promise<string[]> {
  return user.role === "subject_teacher"
    ? subjectTeacherSectionIds(user.id)
    : adviserSectionIds(user.id);
}

/** Can this user read this student's record? Used before detail views/writes. */
export async function canAccessStudent(
  user: SessionUser,
  ref: StudentScopeRef,
): Promise<boolean> {
  if (user.role !== "teacher" && user.role !== "subject_teacher") {
    return studentScope(user) === undefined;
  }
  const ids = await scopedTeachingSectionIds(user);
  if (ids.length === 0) return false;
  const rows = await db
    .select({ id: studentEnrollments.id })
    .from(studentEnrollments)
    .where(
      and(
        eq(studentEnrollments.studentId, ref.studentId),
        inArray(studentEnrollments.sectionId, ids),
        eq(studentEnrollments.status, "active"),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** Can this user edit this student's core record? */
export async function canEditStudent(
  user: SessionUser,
  ref: StudentScopeRef,
): Promise<boolean> {
  return canAccessStudent(user, ref);
}
