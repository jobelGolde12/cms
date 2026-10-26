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
import { adviserSectionIds } from "./scope";
import { collectGradeIssues, MAX_GRADE, MIN_GRADE, type GradeValidationIssue } from "./grade-validation";

export { collectGradeIssues, MAX_GRADE, MIN_GRADE };
export type { GradeValidationIssue };

/**
 * Grade-encoding domain layer.
 *
 * Rule enforced here (and re-checked in every action): **Teachers/Advisers are
 * the only users allowed to input and modify student grades.** Enforcement is
 * role-based (`teacher` + `grades.write`) plus row-level (the section must be
 * one where the user is the current adviser), so direct calls to the actions
 * cannot bypass the UI hiding of buttons.
 *
 * Lifecycle: Not Started → Draft → (Review) → Submitted.
 * Submitted sheets are locked; only the current section adviser can reopen
 * them for correction (audit-logged via the grade submission ledger).
 */

/* --------------------------------- guards --------------------------------- */

export type GradeWriter = SessionUser & { role: "teacher" };

/**
 * Server-side grade-write guard: must hold `grades.write` AND be a teacher
 * (advisers). Returns null when the caller is not authorized — actions turn
 * this into a user-facing error instead of a redirect.
 */
export async function getGradeWriter(): Promise<GradeWriter | null> {
  const user = await getAuthorizedUser("grades.write");
  if (!user) return null;
  if (user.role !== "teacher") return null;
  return user as GradeWriter;
}

/** Can this user encode grades here? Adviser of the section (any subject) or
 *  departmentally assigned to the (section, subject). Row-level either way. */
export async function canWriteGradesInSection(
  user: SessionUser,
  sectionId: string,
  subjectId?: string,
): Promise<boolean> {
  if (user.role !== "teacher") return false;
  const ids = await adviserSectionIds(user.id);
  if (ids.includes(sectionId)) return true;
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
  /** true → user is the section adviser (may encode every subject) */
  advisory: boolean;
};

/** Sections where the user is the *current* active adviser, newest year first. */
export async function teacherGradeSections(user: SessionUser): Promise<TeacherSection[]> {
  return db
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
    .where(and(eq(sections.adviserId, user.id), eq(sections.isActive, true)))
    .orderBy(desc(schoolYears.year), asc(gradeLevels.orderIndex), asc(sections.name))
    .then((rows) => rows.map((r) => ({ ...r, advisory: true })));
}

/**
 * Every section a teacher can encode in: their advisory sections (any
 * subject) plus departmental sections they teach at least one subject in.
 * Advisory sections come first; a section that is both is advisory-only.
 */
export async function teacherEncodingSections(user: SessionUser): Promise<TeacherSection[]> {
  const advisory = await teacherGradeSections(user);
  const assignments = await teacherSubjectAssignments(user.id);
  const advisoryIds = new Set(advisory.map((s) => s.id));
  const assignedSectionIds = Array.from(
    new Set(assignments.map((a) => a.sectionId).filter((id) => !advisoryIds.has(id))),
  );
  if (assignedSectionIds.length === 0) return advisory;
  const extra = await db
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
  return [...advisory, ...extra.map((r) => ({ ...r, advisory: false }))].sort(
    (a, b) =>
      b.schoolYear.localeCompare(a.schoolYear) ||
      a.gradeLevelOrder - b.gradeLevelOrder ||
      a.name.localeCompare(b.name),
  );
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
  /** false for teachers not advising this section, or non-teacher roles */
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
  // 1) Section — default to the teacher's first advisory section (then first
  // departmental one); everyone else gets the first section of the current year.
  let primarySectionId = params.sectionId || "";
  const teacherSections = user.role === "teacher" ? await teacherEncodingSections(user) : [];
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

  // Editability depends on the resolved subject too: the adviser may encode
  // every subject of the section; a departmental teacher only theirs.
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
 * - teachers advising the section see draft + submitted rows and can edit;
 * - every other viewer sees submitted rows only (drafts stay private to the
 *   encoding adviser).
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
