/**
 * Teacher-assignment invariants (pure — no database imports so they are
 * unit-testable without a connection).
 *
 * Two independent assignments can point at the SAME account:
 *   - Adviser          → `sections.adviser_id`   (whole-section responsibility)
 *   - Subject Teacher  → `section_subject_teachers` (one (section, subject) load)
 *
 * Grade encoding is decided by the subject-teacher assignment, never by the
 * primary role alone — see `canWriteGradesInSection` in src/lib/grades.ts.
 */

export const ADVISER_ROLE_ID = "role-teacher";
export const SUBJECT_TEACHER_ROLE_ID = "role-subject-teacher";
export const TEACHING_ROLE_IDS: string[] = [ADVISER_ROLE_ID, SUBJECT_TEACHER_ROLE_ID];

export type AssignmentCheck = { ok: true } | { ok: false; error: string };

/**
 * One adviser per section. An existing adviser is never silently replaced:
 * the admin must remove the current assignment first (explicit, auditable).
 */
export function checkAdviserChange(
  currentAdviserId: string | null,
  nextAdviserId: string,
  currentAdviserName?: string | null,
): AssignmentCheck {
  if (!currentAdviserId) return { ok: true };
  if (currentAdviserId === nextAdviserId) {
    return { ok: false, error: "This teacher is already the adviser of this section." };
  }
  return {
    ok: false,
    error: `This section already has an adviser${currentAdviserName ? ` (${currentAdviserName})` : ""}. Remove that assignment first if you want to replace it.`,
  };
}

/**
 * One teacher per (section, subject). A different teacher may only take over
 * after the existing load is removed — preventing silent overwrites.
 */
export function checkSubjectTeacherChange(
  existing: { teacherId: string; teacherName?: string | null } | null,
  nextTeacherId: string,
): AssignmentCheck {
  if (!existing) return { ok: true };
  if (existing.teacherId === nextTeacherId) {
    return {
      ok: false,
      error: "This teacher is already assigned to this subject and section.",
    };
  }
  return {
    ok: false,
    error: `This subject is already assigned to ${existing.teacherName || "another teacher"} in this section. Remove that assignment first if you want to reassign it.`,
  };
}
