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
 * - Adviser + Subject Teacher → the UNION of both sets (one teacher may be
 *   both without a second account)
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

/** True when the account holds the Adviser role. */
export function isAdviser(user: SessionUser): boolean {
  return user.roles.includes("teacher");
}

/** True when the account holds the Subject Teacher role. */
export function isSubjectTeacher(user: SessionUser): boolean {
  return user.roles.includes("subject_teacher");
}

/**
 * Every section the account may reach through a teaching responsibility:
 * the sections it advises PLUS the sections it holds a subject load in.
 */
export async function teachingSectionIds(user: SessionUser): Promise<string[]> {
  const ids = new Set<string>();
  if (isAdviser(user)) {
    for (const id of await adviserSectionIds(user.id)) ids.add(id);
  }
  if (isSubjectTeacher(user)) {
    for (const id of await subjectTeacherSectionIds(user.id)) ids.add(id);
  }
  return Array.from(ids);
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
  // A teaching responsibility ALWAYS narrows the scope to the account's own
  // sections, whatever its primary role is.
  if (isAdviser(user) || isSubjectTeacher(user)) {
    const ids = sectionIds ?? [];
    if (ids.length === 0) return sql`1 = 0`;
    return enrollmentInSection(sql`students.id`, ids);
  }
  switch (user.role) {
    case "admin":
    case "school_admin":
    case "records":
    case "guidance":
    case "nurse":
    case "registrar":
    case "literacy_coordinator":
      return undefined; // school-wide
    default:
      return sql`1 = 0`;
  }
}

/** Convenience: resolve the user's section ids then build the scope. */
export async function userSectionScope(user: SessionUser): Promise<SQL | undefined> {
  if (isAdviser(user) || isSubjectTeacher(user)) {
    return studentScope(user, await teachingSectionIds(user));
  }
  return studentScope(user);
}

/* -------------------------------------------------------------------------- */
/*  Section-level authorization for enrollment & student creation             */
/* -------------------------------------------------------------------------- */

/**
 * True when the account's student access is NOT restricted to specific sections
 * (admin / school_admin / records — the school-wide records roles). Advisers and
 * subject teachers are always section-scoped, whatever other roles they hold.
 */
export function hasSchoolWideStudentScope(user: SessionUser): boolean {
  if (isAdviser(user) || isSubjectTeacher(user)) return false;
  return studentScope(user) === undefined;
}

/**
 * The sections the account may ENROLL a student into:
 *  - school-wide records roles → `null`, meaning "any active section";
 *  - an Adviser → only the sections they advise;
 *  - everyone else → `[]` (none).
 *
 * This is the single source of truth for section-level enrollment scope and is
 * applied in `saveEnrollment`, `createStudent` and by the section dropdown, so
 * a crafted request with another adviser's section id is rejected server-side.
 */
export async function enrollableSectionIds(user: SessionUser): Promise<string[] | null> {
  if (hasSchoolWideStudentScope(user)) return null;
  if (isAdviser(user)) return adviserSectionIds(user.id);
  return [];
}

/**
 * Server-side check: may this account place/move a student into `sectionId`?
 * School-wide records roles may use any (active, validated) section; an adviser
 * only the sections they advise; everyone else nothing.
 */
export async function canManageEnrollmentInSection(
  user: SessionUser,
  sectionId: string,
): Promise<boolean> {
  if (!sectionId) return false;
  const allowed = await enrollableSectionIds(user);
  if (allowed === null) return true;
  return allowed.includes(sectionId);
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

/**
 * Student Development (/development) — the aggregated classroom development
 * module (assessments, behavior overview, interventions).
 *
 * Policy (2026-11 least-privilege revision): the Guidance Counselor's data
 * domain is EXCLUSIVELY the confidential Guidance Office module (/guidance);
 * the Student Development module is out of that scope. Guidance Counselors
 * keep `behavior.view`/`behavior.write` because the incident engine runs on
 * behavior rows, but the broad development module behind the same permission
 * redirects them server-side to their own workspace. Mirrors the role rule
 * already used by the incident actions (`incidentAuthor`).
 */
export function canViewStudentDevelopment(user: SessionUser): boolean {
  if (user.role === "guidance") return false;
  return (
    user.role === "admin" ||
    user.role === "school_admin" ||
    user.role === "teacher" ||
    user.role === "literacy_coordinator"
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

/** Can this user read this student's record? Used before detail views/writes. */
export async function canAccessStudent(
  user: SessionUser,
  ref: StudentScopeRef,
): Promise<boolean> {
  if (!isAdviser(user) && !isSubjectTeacher(user)) {
    return studentScope(user) === undefined;
  }
  const ids = await teachingSectionIds(user);
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
