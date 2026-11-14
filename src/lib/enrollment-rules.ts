/**
 * Enrollment invariants (pure — no database imports so they are unit-testable
 * without a connection).
 *
 * The authoritative placement of a student is the `student_enrollments` row:
 *
 *   Student → Enrollment → School Year → Grade Level → Section
 *
 * A section belongs to exactly one (school_year, grade_level) pair, so an
 * enrollment is only coherent when the submitted section's school year AND
 * grade level match the submitted values, and the section is active. These
 * checks run server-side in `saveEnrollment` and `createStudent` regardless of
 * what the browser sent.
 */

export type PlacementCheck = { ok: true } | { ok: false; error: string };

/** The subset of a section row needed to validate an enrollment placement. */
export type PlacementSection = {
  id: string;
  schoolYearId: string;
  gradeLevelId: string;
  isActive: boolean;
};

/**
 * Validate that `section` is a legal target for an enrollment in
 * (`schoolYearId`, `gradeLevelId`). Returns a user-facing reason on failure.
 */
export function checkSectionPlacement(
  section: PlacementSection | null | undefined,
  schoolYearId: string,
  gradeLevelId: string,
): PlacementCheck {
  if (!section) {
    return { ok: false, error: "Select a valid section." };
  }
  if (!section.isActive) {
    return {
      ok: false,
      error: "That section is inactive and cannot be used for enrollment.",
    };
  }
  if (section.schoolYearId !== schoolYearId) {
    return {
      ok: false,
      error: "The selected section does not belong to the chosen school year.",
    };
  }
  if (section.gradeLevelId !== gradeLevelId) {
    return {
      ok: false,
      error: "The selected section does not belong to the chosen grade level.",
    };
  }
  return { ok: true };
}

/** An existing enrollment row, used to describe a conflict before it is updated. */
export type ExistingEnrollment = {
  gradeLevelId: string;
  sectionId: string;
};

/** True when re-saving this school year would UPDATE an existing enrollment. */
export function isReassignment(existing: ExistingEnrollment | null | undefined): boolean {
  return Boolean(existing);
}

/**
 * User-facing description of an existing enrollment that a save would update,
 * so the conflict is explained rather than silently overwritten.
 */
export function reassignmentNotice(
  schoolYear: string,
  gradeLevelName: string,
  sectionName: string,
): string {
  return `An enrollment already exists for ${schoolYear} (${gradeLevelName} — ${sectionName}). Saving will update that enrollment.`;
}
