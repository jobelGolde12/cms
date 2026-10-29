import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  gradeSubmissions,
  gradeLevels,
  gradingPeriods,
  schoolYears,
  sectionSubjectTeachers,
  sections,
  studentEnrollments,
  studentGrades,
  students,
  subjects,
  type GradeStatus,
} from "@/db/schema";
import { getAuthorizedUser, type SessionUser } from "./auth";
import { collectGradeIssues, MAX_GRADE, MIN_GRADE, type GradeValidationIssue } from "./grade-validation";

export { collectGradeIssues, MAX_GRADE, MIN_GRADE };
export type { GradeValidationIssue };

/**
 * Grade-encoding domain layer.
 *
 * Rule enforced here (and re-checked in every action): **only the SUBJECT
 * TEACHER role may input and modify student grades**, and only for the
 * (section, subject) pairs listed in `section_subject_teachers` (row-level).
 * Advisers keep read-only grade access. Direct calls to the actions cannot
 * bypass UI hiding of buttons.
 *
 * Lifecycle: Not Started → Draft → (Review) → Submitted.
 * Submitted sheets are locked; only the current assigned subject teacher can
 * reopen them for correction (audit-logged via the grade submission ledger).
 */

/* --------------------------------- guards --------------------------------- */

export type GradeWriter = SessionUser & { role: "subject_teacher" };

/**
 * Server-side grade-write guard: must hold `grades.write` AND be a subject
 * teacher (row-level assignment is re-checked separately in
 * `canWriteGradesInSection`). Returns null when the caller is not authorized
 * — actions turn this into a user-facing error instead of a redirect.
 */
export async function getGradeWriter(): Promise<GradeWriter | null> {
  const user = await getAuthorizedUser("grades.write");
  if (!user) return null;
  if (user.role !== "subject_teacher") return null;
  return user as GradeWriter;
}

/**
 * Can this user encode grades here? Only departmentally: the caller must be
 * an assigned subject teacher for this exact (section, subject) pair. This
 * replaces the previous advisory path — an Adviser can never encode grades.
 * Row-level either way.
 */
export async function canWriteGradesInSection(
  user: SessionUser,
  sectionId: string,
  subjectId?: string,
): Promise<boolean> {
  if (user.role !== "subject_teacher") return false;
  const assignments = await teacherSubjectAssignments(user.id);
  if (subjectId) return assignments.some((a) => a.sectionId === sectionId && a.subjectId === subjectId);
  return assignments.some((a) => a.sectionId === sectionId);
}

/** Departmental assignments for one teacher: {sectionId, subjectId} pairs. */
export async function teacherSubjectAssignments(userId: string): Promise<
  { sectionId: string; subjectId: string }[]
> {
  const rows = await db
    .select({ sectionId: sectionSubjectTeachers.sectionId, subjectId: sectionSubjectTeachers.subjectId })
    .from(sectionSubjectTeachers)
    .where(eq(sectionSubjectTeachers.teacherId, userId));
  return rows;
}

/** Pure grouping helper (unit-testable): assignments → section → subject ids. */
export function groupAssignmentsBySection(
  assignments: { sectionId: string; subjectId: string }[],
  advisorySectionIds: string[] = [],
): Record<string, string[]> {
  const advisory = new Set(advisorySectionIds);
  const grouped: Record<string, string[]> = {};
  for (const a of assignments) {
    if (advisory.has(a.sectionId)) continue; // advisory sections allow every subject
    const list = grouped[a.sectionId] ?? [];
    if (!list.includes(a.subjectId)) list.push(a.subjectId);
    grouped[a.sectionId] = list;
  }
  return grouped;
}

/* ----------------------------- pure validation ---------------------------- */

// Pure helpers live in ./grade-validation (shared with client components).
// Re-exported above for server-side consumers.

/* --------------------------- context resolution --------------------------- */

export type TeacherSection = {
  id: string;
  name: string;
  gradeLevelId: string;
  gradeLevelName: string;
  gradeLevelOrder: number;
  schoolYearId: string;
  schoolYear: string;
  /** true → user is the section adviser (view-only; never encodes grades) */
  advisory: boolean;
};

/**
 * Every section the subject teacher can encode in: the active sections that
 * hold at least one of their `section_subject_teachers` teaching loads.
 * (Adviser-only sections appear only in the read-only grade views.)
 */
export async function teacherEncodingSections(user: SessionUser): Promise<TeacherSection[]> {
  const assignments = await teacherSubjectAssignments(user.id);
  const assignedSectionIds = Array.from(
    new Set(assignments.map((a) => a.sectionId)),
  );
  if (assignedSectionIds.length === 0) return [];
  const relative = await db
    .select({
      id: sections.id,
      name: sections.name,
      gradeLevelId: sections.gradeLevelId,
      gradeLevelName: gradeLevels.name,
      gradeLevelOrder: gradeLevels.orderIndex,
      schoolYearId: sections.schoolYearId,
      schoolYear: schoolYears.year,
    })
    .from(sections)
    .innerJoin(gradeLevels, eq(gradeLevels.id, sections.gradeLevelId))
    .innerJoin(schoolYears, eq(schoolYears.id, sections.schoolYearId))
    .where(and(inArray(sections.id, assignedSectionIds), eq(sections.isActive, true)))
    .orderBy(desc(schoolYears.year), asc(gradeLevels.orderIndex), asc(sections.name));
  return relative.map((r) => ({ ...r, advisory: false }));
}

/** All active sections for a school year (read-only report/consumer view). */
export async function sectionsForYear(schoolYearId?: string) {
  const yearId =
    schoolYearId ??
    (
      await db
        .select({ id: schoolYears.id })
        .from(schoolYears)
        .where(eq(schoolYears.isCurrent, true))
        .limit(1)
    )[0]?.id ??
    "";
  const rows = await db
    .select({
      id: sections.id,
      name: sections.name,
      gradeLevelId: gradeLevels.id,
      gradeLevelName: gradeLevels.name,
      gradeLevelOrder: gradeLevels.orderIndex,
      schoolYearId: sections.schoolYearId,
      schoolYear: schoolYears.year,
    })
    .from(sections)
    .innerJoin(gradeLevels, eq(gradeLevels.id, sections.gradeLevelId))
    .innerJoin(schoolYears, eq(schoolYears.id, sections.schoolYearId))
    .where(and(eq(sections.schoolYearId, yearId), eq(sections.isActive, true)))
    .orderBy(desc(schoolYears.year), asc(gradeLevels.orderIndex), asc(sections.name));
  return rows;
}

/** School years that have at least one active section (for the SY filter). */
export async function yearsWithSections(): Promise<{ id: string; year: string; isCurrent: boolean }[]> {
  return db
    .select({
      id: schoolYears.id,
      year: schoolYears.year,
      isCurrent: schoolYears.isCurrent,
    })
    .from(schoolYears)
    .orderBy(sql`${schoolYears.isCurrent} desc`, sql`${schoolYears.year} desc`);
}

export type GradeSheetContext = {
  sectionId: string;
  sectionName: string;
  schoolYearId: string;
  schoolYear: string;
  gradeLevelName: string;
  subjectId: string;
  subjectName: string;
  gradingPeriodId: string;
  periodName: string;
  /** false for viewers who may not encode this (section, subject) */
  editable: boolean;
  /** latest ledger row state for this sheet context */
  submission: {
    id: string;
    status: "submitted" | "reopened";
    submittedAt: Date;
    submitterName: string | null;
  } | null;
};

/**
 * Resolve + validate the sheet context (section, subject, grading period),
 * including the cross-checks that make wrong-context grades impossible:
 * the grading period must belong to the section's school year and the
 * subject must be an active catalog entry.
 */
export async function resolveGradeSliceContext(
  user: SessionUser,
  params: {
    sectionId?: string;
    subjectId?: string;
    gradingPeriodId?: string;
  },
): Promise<{ ok: true; context: GradeSheetContext } | { ok: false; error: string }> {
  // 1) Section — default to the subject teacher's first assignment; everyone
  // else gets the first section of the current year (read-only context).
  let primarySectionId = params.sectionId || "";
  const teacherSections = user.role === "subject_teacher" ? await teacherEncodingSections(user) : [];
  if (!primarySectionId) {
    if (teacherSections[0]) {
      primarySectionId = teacherSections[0].id;
    } else {
      const current = await sectionsForYear();
      if (!current[0]) return { ok: false, error: "No sections are available for the current school year." };
      primarySectionId = current[0].id;
    }
  }
  const sectionRows = await db
    .select({
      id: sections.id,
      name: sections.name,
      schoolYearId: sections.schoolYearId,
      schoolYear: schoolYears.year,
      gradeLevelName: gradeLevels.name,
      isActive: sections.isActive,
    })
    .from(sections)
    .innerJoin(schoolYears, eq(schoolYears.id, sections.schoolYearId))
    .innerJoin(gradeLevels, eq(gradeLevels.id, sections.gradeLevelId))
    .where(eq(sections.id, primarySectionId))
    .limit(1);
  const section = sectionRows[0];
  if (!section) return { ok: false, error: "Section not found." };

  // 2) Subject (active catalog entry only)
  const subjectList = await db
    .select({ id: subjects.id, name: subjects.name })
    .from(subjects)
    .where(eq(subjects.isActive, true))
    .orderBy(asc(subjects.code));
  if (subjectList.length === 0) return { ok: false, error: "No subjects configured." };
  const subjectId = subjectList.some((s) => s.id === params.subjectId)
    ? (params.subjectId as string)
    : subjectList[0].id;

  // 3) Grading period — must belong to the section's school year
  const periods = await db
    .select({ id: gradingPeriods.id, name: gradingPeriods.name, isCurrent: gradingPeriods.isCurrent })
    .from(gradingPeriods)
    .where(and(eq(gradingPeriods.schoolYearId, section.schoolYearId)))
    .orderBy(asc(gradingPeriods.orderIndex));
  if (periods.length === 0)
    return { ok: false, error: "No grading periods configured for this school year." };
  const requestedPeriod = periods.find((p) => p.id === params.gradingPeriodId);
  const gradingPeriodId =
    requestedPeriod?.id ??
    (periods.find((p) => p.isCurrent)?.id ?? periods[0].id);

  // Explicit wrong-period request → report the integrity error.
  if (params.gradingPeriodId && !requestedPeriod) {
    return { ok: false, error: "That grading period does not belong to this section's school year." };
  }

  // 4) Latest submission ledger row for this context.
  const submissions = await db
    .select({
      id: gradeSubmissions.id,
      status: gradeSubmissions.status,
      submittedAt: gradeSubmissions.submittedAt,
      submitterFirst: sql<string | null>`(select first_name from users u where u.id = ${gradeSubmissions.submittedBy})`,
      submitterLast: sql<string | null>`(select last_name from users u where u.id = ${gradeSubmissions.submittedBy})`,
    })
    .from(gradeSubmissions)
    .where(
      and(
        eq(gradeSubmissions.sectionId, section.id),
        eq(gradeSubmissions.subjectId, subjectId),
        eq(gradeSubmissions.gradingPeriodId, gradingPeriodId),
      ),
    )
    .orderBy(desc(gradeSubmissions.submittedAt))
    .limit(1);
  const submission = submissions[0] ?? null;

  const subject = subjectList.find((s) => s.id === subjectId)!;
  const period = periods.find((p) => p.id === gradingPeriodId)!;

  // Editability depends on the resolved subject too: an assigned subject
  // teacher may encode only their (section, subject) pairs.
  const editable = section.isActive && (await canWriteGradesInSection(user, section.id, subjectId));

  return {
    ok: true,
    context: {
      sectionId: section.id,
      sectionName: section.name,
      schoolYearId: section.schoolYearId,
      schoolYear: section.schoolYear,
      gradeLevelName: section.gradeLevelName,
      subjectId,
      subjectName: subject.name,
      gradingPeriodId,
      periodName: period.name,
      editable,
      submission: submission
        ? {
            id: submission.id,
            status: submission.status as "submitted" | "reopened",
            submittedAt: submission.submittedAt,
            submitterName:
              submission.submitterFirst || submission.submitterLast
                ? `${submission.submitterFirst ?? ""} ${submission.submitterLast ?? ""}`.trim()
                : null,
          }
        : null,
    },
  };
}

/* ------------------------------ sheet data -------------------------------- */

export type GradeSheetRow = {
  studentId: string;
  studentNumber: string;
  studentName: string;
  sex: string;
  /** null → Not started */
  draftGrade: number | null;
  submittedGrade: number | null;
  remarks: string | null;
};

/**
 * The roster + grades for one sheet context.
 * - assigned subject teachers see the draft + submitted rows of the sheets
 *   they may encode and can edit them;
 * - every other viewer sees submitted rows only (drafts stay private to the
 *   encoding subject teacher).
 */
export async function getGradeSheet(
  user: SessionUser,
  context: GradeSheetContext,
): Promise<{ editable: boolean; rows: GradeSheetRow[] }> {
  const rosters = await db
    .select({
      studentId: students.id,
      studentNumber: students.studentNumber,
      firstName: students.firstName,
      middleName: students.middleName,
      lastName: students.lastName,
      suffix: students.suffix,
      sex: students.sex,
      enrollmentId: studentEnrollments.id,
    })
    .from(studentEnrollments)
    .innerJoin(students, eq(students.id, studentEnrollments.studentId))
    .where(
      and(
        eq(studentEnrollments.sectionId, context.sectionId),
        eq(studentEnrollments.status, "active"),
        eq(students.status, "active"),
      ),
    )
    .orderBy(asc(students.lastName), asc(students.firstName));

  const enrollmentIds = rosters.map((r) => r.enrollmentId);
  const grades = enrollmentIds.length
    ? await db
        .select({
          enrollmentId: studentGrades.enrollmentId,
          grade: studentGrades.grade,
          status: studentGrades.status,
          remarks: studentGrades.remarks,
        })
        .from(studentGrades)
        .where(
          and(
            inArray(studentGrades.enrollmentId, enrollmentIds),
            eq(studentGrades.subjectId, context.subjectId),
            eq(studentGrades.gradingPeriodId, context.gradingPeriodId),
          ),
        )
    : [];

  const byEnrollment = new Map(grades.map((g) => [g.enrollmentId, g]));
  const name = (r: (typeof rosters)[number]) =>
    [r.lastName, r.firstName, r.middleName, r.suffix].filter(Boolean).join(", ");

  // Drafts are private to the sheets a viewer may encode in — read-only views
  // (other sections, other roles) see submitted grades only.
  const rows: GradeSheetRow[] = rosters.map((r) => {
    const g = byEnrollment.get(r.enrollmentId);
    const isDraft = context.editable && g?.status === "draft";
    return {
      studentId: r.studentId,
      studentNumber: r.studentNumber,
      studentName: name(r),
      sex: r.sex,
      draftGrade: isDraft ? (g as { grade: number }).grade : null,
      submittedGrade: g && !isDraft ? (g as { grade: number }).grade : null,
      remarks: g?.remarks ?? null,
    };
  });

  return { editable: context.editable, rows };
}

/** Determine the effective status shown for a row. */
export function rowStatus(row: GradeSheetRow): GradeStatus | "not_started" {
  if (row.draftGrade !== null) return "draft";
  if (row.submittedGrade !== null) return "submitted";
  return "not_started";
}
