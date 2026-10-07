import { eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { sections, studentEnrollments } from "@/db/schema";
import type { SessionUser } from "./auth";

/**
 * Row-level scoping for student records.
 *
 * - admin / school_admin / records → all students
 * - teacher → students with an active enrollment in a section where the user
 *   is the adviser (parameter-driven, never string-interpolated from user input)
 * - guidance → all students (domain gating — which tables the role may read —
 *   is handled by permission checks, not row scope)
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

/** SQL `inArray` predicate over the enrollment join for the given sections. */
function enrollmentInSection(studentIdColumn: SQL, sectionIds: string[]): SQL {
  return sql`exists (
    select 1 from ${studentEnrollments}
    where ${studentEnrollments.studentId} = ${studentIdColumn}
      and ${inArray(studentEnrollments.sectionId, sectionIds)}
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
      return undefined; // school-wide
    case "teacher": {
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
  if (user.role !== "teacher") return studentScope(user);
  const ids = await adviserSectionIds(user.id);
  return studentScope(user, ids);
}

export type StudentScopeRef = {
  studentId: string;
};

/** Can this user read this student's record? Used before detail views/writes. */
export async function canAccessStudent(
  user: SessionUser,
  ref: StudentScopeRef,
): Promise<boolean> {
  if (user.role !== "teacher") {
    return studentScope(user) === undefined;
  }
  const ids = await adviserSectionIds(user.id);
  if (ids.length === 0) return false;
  const rows = await db
    .select({ id: studentEnrollments.id })
    .from(studentEnrollments)
    .where(
      sql`${studentEnrollments.studentId} = ${ref.studentId} and ${inArray(
        studentEnrollments.sectionId,
        ids,
      )}`,
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
