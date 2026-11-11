import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import {
  employees,
  sections,
  sectionSubjectTeachers,
  subjects,
  userRoles,
  users,
} from "@/db/schema";

/**
 * Teaching loads — the row-level scope that lets a Subject Teacher encode
 * grades.
 *
 * Domain rules (enforced here and re-checked in the employee actions):
 *   1. only a login account holding the `subject_teacher` role can carry a
 *      teaching load (`canWriteGradesInSection` re-checks this per request).
 *      The role may be PRIMARY or an ADDITIONAL role on the account: an
 *      Adviser who also teaches keeps one account with both roles;
 *   2. a load is a (section, subject) pair — both must exist and be active;
 *   3. one teacher owns a (section, subject) pair — the unique index
 *      `section_subject_teacher_uq` enforces it, so moving a subject to
 *      another teacher REPLACES the previous owner (that is how a school
 *      reassigns a teaching load);
 *   4. the employee record and the account are separate entities; the
 *      employee → account link (`employees.user_id`) is what ties a personnel
 *      record to the loads of its account.
 */

export type TeachingLoad = { sectionId: string; subjectId: string };

/** Role id of the account that may encode grades (seeded, stable). */
export const SUBJECT_TEACHER_ROLE_ID = "role-subject-teacher";

/** Separator used in the form value of one teaching load. */
const PAIR_SEPARATOR = "|";

/** Stable key for one (section, subject) pair. */
export function teachingLoadKey(sectionId: string, subjectId: string): string {
  return `${sectionId}${PAIR_SEPARATOR}${subjectId}`;
}

/**
 * Parse the submitted teaching-load values into (section, subject) pairs.
 * Malformed entries are dropped, duplicates collapse — the result is the
 * authoritative list of pairs the form asked for.
 */
export function parseTeachingLoads(values: readonly string[]): TeachingLoad[] {
  const out: TeachingLoad[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const value = String(raw ?? "").trim();
    if (!value) continue;
    const [sectionId, subjectId] = value.split(PAIR_SEPARATOR);
    if (!sectionId || !subjectId) continue;
    const key = teachingLoadKey(sectionId, subjectId);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ sectionId, subjectId });
  }
  return out;
}

/**
 * Pure diff between the loads a teacher currently holds and the loads the
 * form submitted: what has to be added and what has to be removed.
 */
export function diffTeachingLoads(
  current: readonly TeachingLoad[],
  next: readonly TeachingLoad[],
): { added: TeachingLoad[]; removed: TeachingLoad[] } {
  const key = (l: TeachingLoad) => teachingLoadKey(l.sectionId, l.subjectId);
  const currentKeys = new Set(current.map(key));
  const nextKeys = new Set(next.map(key));
  return {
    added: next.filter((l) => !currentKeys.has(key(l))),
    removed: current.filter((l) => !nextKeys.has(key(l))),
  };
}

export type AccountOption = {
  id: string;
  label: string;
  email: string;
  /** Employee record already linked to this account (if any). */
  linkedEmployeeId: string | null;
  linkedEmployeeName: string | null;
};

/**
 * Active Subject Teacher accounts that can be linked to an employee record.
 * Accounts already linked to a DIFFERENT employee are excluded — one account
 * backs one personnel record.
 */
export async function subjectTeacherAccountOptions(
  excludeEmployeeId?: string,
): Promise<AccountOption[]> {
  // Accounts holding the Subject Teacher role EITHER as their primary role or
  // as an additional role (Adviser + Subject Teacher). The assignment — not a
  // single primary role — is what grants grade-encoding scope.
  const extraRoleHolders = db
    .select({ id: userRoles.userId })
    .from(userRoles)
    .where(eq(userRoles.roleId, SUBJECT_TEACHER_ROLE_ID));

  const rows = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      middleName: users.middleName,
      lastName: users.lastName,
      email: users.email,
      employeeId: employees.id,
      employeeFirstName: employees.firstName,
      employeeLastName: employees.lastName,
    })
    .from(users)
    .leftJoin(employees, eq(employees.userId, users.id))
    .where(
      and(
        eq(users.isActive, true),
        // Dummy/test accounts are login-only and can never be linked to a
        // personnel record or carry a teaching load.
        eq(users.isDummy, false),
        or(
          eq(users.roleId, SUBJECT_TEACHER_ROLE_ID),
          inArray(users.id, extraRoleHolders),
        ),
      ),
    )
    .orderBy(users.lastName, users.firstName);

  return rows
    .filter((r) => !r.employeeId || r.employeeId === excludeEmployeeId)
    .map((r) => ({
      id: r.id,
      label: [r.firstName, r.middleName, r.lastName].filter(Boolean).join(" "),
      email: r.email,
      linkedEmployeeId: r.employeeId,
      linkedEmployeeName: r.employeeId
        ? [r.employeeFirstName, r.employeeLastName].filter(Boolean).join(" ")
        : null,
    }));
}

export type SubjectOption = { id: string; label: string };

/** Active subject catalog entries (the subjects a teacher can be loaded for). */
export async function activeSubjectOptions(): Promise<SubjectOption[]> {
  const rows = await db
    .select({ id: subjects.id, name: subjects.name, code: subjects.code })
    .from(subjects)
    .where(eq(subjects.isActive, true))
    .orderBy(subjects.code);
  return rows.map((r) => ({ id: r.id, label: `${r.code} — ${r.name}` }));
}

/** The teaching loads currently held by one account. */
export async function teachingLoadsForTeacher(teacherId: string): Promise<TeachingLoad[]> {
  const rows = await db
    .select({
      sectionId: sectionSubjectTeachers.sectionId,
      subjectId: sectionSubjectTeachers.subjectId,
    })
    .from(sectionSubjectTeachers)
    .where(eq(sectionSubjectTeachers.teacherId, teacherId));
  return rows;
}

/** The teaching loads of the account linked to one employee record. */
export async function teachingLoadsForEmployee(employeeId: string): Promise<TeachingLoad[]> {
  const rows = await db
    .select({
      teacherId: sectionSubjectTeachers.teacherId,
      sectionId: sectionSubjectTeachers.sectionId,
      subjectId: sectionSubjectTeachers.subjectId,
    })
    .from(sectionSubjectTeachers)
    .innerJoin(employees, eq(employees.userId, sectionSubjectTeachers.teacherId))
    .where(eq(employees.id, employeeId));
  return rows.map((r) => ({ sectionId: r.sectionId, subjectId: r.subjectId }));
}

export type LoadValidation =
  | { ok: true; pairs: TeachingLoad[] }
  | { ok: false; error: string };

/**
 * Validate the submitted teaching loads against the live academic structure:
 * every section and every subject must exist and be active. A load that
 * points at a deactivated entity is rejected instead of silently dropped.
 */
export async function validateTeachingLoads(pairs: TeachingLoad[]): Promise<LoadValidation> {
  if (pairs.length === 0) return { ok: true, pairs };

  const sectionIds = [...new Set(pairs.map((p) => p.sectionId))];
  const subjectIds = [...new Set(pairs.map((p) => p.subjectId))];

  const [sectionRows, subjectRows] = await Promise.all([
    db
      .select({ id: sections.id, isActive: sections.isActive })
      .from(sections)
      .where(inArray(sections.id, sectionIds)),
    db
      .select({ id: subjects.id, isActive: subjects.isActive })
      .from(subjects)
      .where(inArray(subjects.id, subjectIds)),
  ]);

  const activeSections = new Set(sectionRows.filter((s) => s.isActive).map((s) => s.id));
  const activeSubjects = new Set(subjectRows.filter((s) => s.isActive).map((s) => s.id));

  for (const pair of pairs) {
    if (!activeSections.has(pair.sectionId)) {
      return {
        ok: false,
        error: "One of the selected sections no longer exists or is deactivated — refresh and try again.",
      };
    }
    if (!activeSubjects.has(pair.subjectId)) {
      return {
        ok: false,
        error: "One of the selected subjects no longer exists or is deactivated — refresh and try again.",
      };
    }
  }
  return { ok: true, pairs };
}

/**
 * Apply a teaching-load plan to one account:
 *   - loads the account no longer holds are removed;
 *   - new loads are inserted;
 *   - a (section, subject) pair owned by ANOTHER teacher is moved to this
 *     teacher (the school reassigned the subject).
 */
export async function applyTeachingLoads(
  teacherId: string,
  current: TeachingLoad[],
  next: TeachingLoad[],
): Promise<{ added: TeachingLoad[]; removed: TeachingLoad[]; moved: TeachingLoad[] }> {
  const { added, removed } = diffTeachingLoads(current, next);

  for (const load of removed) {
    await db
      .delete(sectionSubjectTeachers)
      .where(
        and(
          eq(sectionSubjectTeachers.teacherId, teacherId),
          eq(sectionSubjectTeachers.sectionId, load.sectionId),
          eq(sectionSubjectTeachers.subjectId, load.subjectId),
        ),
      );
  }

  const moved: TeachingLoad[] = [];
  for (const load of added) {
    const existing = await db
      .select({ id: sectionSubjectTeachers.id, teacherId: sectionSubjectTeachers.teacherId })
      .from(sectionSubjectTeachers)
      .where(
        and(
          eq(sectionSubjectTeachers.sectionId, load.sectionId),
          eq(sectionSubjectTeachers.subjectId, load.subjectId),
        ),
      )
      .limit(1);

    if (existing[0]) {
      // The pair belongs to another teacher — move it instead of failing on
      // the unique index.
      await db
        .update(sectionSubjectTeachers)
        .set({ teacherId, updatedAt: new Date() })
        .where(eq(sectionSubjectTeachers.id, existing[0].id));
      moved.push(load);
      continue;
    }

    await db.insert(sectionSubjectTeachers).values({
      id: crypto.randomUUID(),
      sectionId: load.sectionId,
      subjectId: load.subjectId,
      teacherId,
    });
  }

  return { added, removed, moved };
}

/** Drop every teaching load of an account (used when a record is archived). */
export async function clearTeachingLoads(teacherId: string): Promise<number> {
  const rows = await db
    .select({ id: sectionSubjectTeachers.id })
    .from(sectionSubjectTeachers)
    .where(eq(sectionSubjectTeachers.teacherId, teacherId));
  for (const row of rows) {
    await db.delete(sectionSubjectTeachers).where(eq(sectionSubjectTeachers.id, row.id));
  }
  return rows.length;
}

/** Human-readable label for one load (section + subject). */
export async function describeTeachingLoads(
  loads: TeachingLoad[],
): Promise<{ section: string; subject: string; key: string }[]> {
  if (loads.length === 0) return [];
  const sectionIds = [...new Set(loads.map((l) => l.sectionId))];
  const subjectIds = [...new Set(loads.map((l) => l.subjectId))];
  const [sectionRows, subjectRows] = await Promise.all([
    db.select({ id: sections.id, name: sections.name }).from(sections).where(inArray(sections.id, sectionIds)),
    db.select({ id: subjects.id, name: subjects.name }).from(subjects).where(inArray(subjects.id, subjectIds)),
  ]);
  const sectionName = new Map(sectionRows.map((s) => [s.id, s.name]));
  const subjectName = new Map(subjectRows.map((s) => [s.id, s.name]));
  return loads.map((l) => ({
    section: sectionName.get(l.sectionId) ?? "—",
    subject: subjectName.get(l.subjectId) ?? "—",
    key: teachingLoadKey(l.sectionId, l.subjectId),
  }));
}
