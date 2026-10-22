import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  gradeLevels,
  gradingPeriods,
  schoolYears,
  sections,
  studentEnrollments,
  studentGrades,
  subjects,
  students,
} from "@/db/schema";
import {
  computeFinalGrade,
  getPrincipalName,
  getSectionAdviser,
  mapGradeToDescriptor,
} from "@/lib/report-card";
import { ageFromBirthDate, fullName } from "@/lib/utils";

/**
 * SF9 — Learner's Permanent Academic Record (formerly Form 137) data layer.
 *
 * Read-only: every function here only selects existing rows. Rendering,
 * printing or downloading the SF9 never mutates any record (same guarantee
 * as the report card).
 *
 * The SF9 is a PERMANENT record: it spans the learner's full enrollment
 * history in this school. Data comes from:
 * - students                        → name / LRN / sex / birth date
 * - student_enrollments (+SY/grade/section) → one block per school year
 * - student_grades (+grading_periods)       → quarter grades per learning area
 * - final grade & remarks           → the application's existing COMPUTED
 *   logic (`computeFinalGrade` + `mapGradeToDescriptor` from report-card.ts —
 *   the same calculation shown everywhere else in the system)
 * - general average                 → same rule as the report card (average
 *   of the subjects' final grades)
 *
 * Field truth: the SF2-style attendance layout must NOT appear here; the
 * SF9 is strictly an academic record. Track/strand is not stored anywhere
 * in the schema (documented gap) — rendered blank. All values are derived
 * from the database; nothing about the learner is hardcoded.
 */

/* -------------------------------------------------------------------------- */
/*  Data contract                                                             */
/* -------------------------------------------------------------------------- */

export const SF9_QUARTERS = ["1st Quarter", "2nd Quarter", "3rd Quarter", "4th Quarter"] as const;

export type Form137Subject = {
  subjectCode: string;
  subjectName: string;
  /** Grades keyed by quarter index (0 = 1st Quarter). */
  quarters: Array<number | null>;
  finalGrade: number | null;
  remark: string | null;
};

export type Form137YearBlock = {
  enrollmentId: string;
  schoolYear: string;
  gradeLevel: string;
  section: string | null;
  adviser: string | null;
  subjects: Form137Subject[];
  generalAverage: number | null;
};

export type Form137Data = {
  student: {
    id: string;
    studentNumber: string;
    lrn: string | null;
    name: string;
    sex: string;
    birthDate: string | null;
    age: number | null;
  };
  /** Permanent-record blocks, oldest school year first (chronological). */
  blocks: Form137YearBlock[];
  principal: string | null;
};

/* -------------------------------------------------------------------------- */
/*  Shared data fetch (browser preview + PDF endpoint)                        */
/* -------------------------------------------------------------------------- */

/**
 * Build the full SF9 data contract for one student across their ENTIRE
 * enrollment history (permanent record). Consumers MUST run authorization
 * (documents.print + canAccessStudent) before calling this — it performs
 * no permission checks itself.
 */
export async function getForm137Data(studentId: string): Promise<Form137Data | null> {
  const studentRows = await db
    .select({
      id: students.id,
      studentNumber: students.studentNumber,
      lrn: students.lrn,
      firstName: students.firstName,
      middleName: students.middleName,
      lastName: students.lastName,
      suffix: students.suffix,
      sex: students.sex,
      birthDate: students.birthDate,
    })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);

  const studentRow = studentRows[0];
  if (!studentRow) return null;

  // ONE joined query: every recorded grade is tied to its enrollment and
  // school-year context (never mixes another student or school year).
  const gradeRows = await db
    .select({
      enrollmentId: studentEnrollments.id,
      schoolYear: schoolYears.year,
      gradeLevelName: gradeLevels.name,
      sectionId: studentEnrollments.sectionId,
      sectionName: sections.name,
      subjectCode: subjects.code,
      subjectName: subjects.name,
      grade: studentGrades.grade,
      periodOrder: gradingPeriods.orderIndex,
    })
    .from(studentGrades)
    .innerJoin(studentEnrollments, eq(studentEnrollments.id, studentGrades.enrollmentId))
    .innerJoin(schoolYears, eq(schoolYears.id, studentEnrollments.schoolYearId))
    .innerJoin(gradeLevels, eq(gradeLevels.id, studentEnrollments.gradeLevelId))
    .innerJoin(sections, eq(sections.id, studentEnrollments.sectionId))
    .innerJoin(subjects, eq(subjects.id, studentGrades.subjectId))
    .innerJoin(gradingPeriods, eq(gradingPeriods.id, studentGrades.gradingPeriodId))
    .where(eq(studentEnrollments.studentId, studentId))
    .orderBy(
      asc(schoolYears.year),
      asc(gradingPeriods.orderIndex),
      asc(subjects.code),
    );

  // Group per enrollment (one per school year), then per subject.
  type BlockAcc = {
    schoolYear: string;
    gradeLevelName: string;
    sectionId: string; // for adviser lookup
    sectionName: string | null;
    perSubject: Map<string, { name: string; perQuarter: Map<number, number> }>;
  };
  const blocks = new Map<string, BlockAcc>();

  for (const r of gradeRows) {
    let block = blocks.get(r.enrollmentId);
    if (!block) {
      block = {
        schoolYear: r.schoolYear,
        gradeLevelName: r.gradeLevelName,
        sectionId: r.sectionId,
        sectionName: r.sectionName,
        perSubject: new Map(),
      };
      blocks.set(r.enrollmentId, block);
    }
    let subj = block.perSubject.get(r.subjectCode);
    if (!subj) {
      subj = { name: r.subjectName, perQuarter: new Map() };
      block.perSubject.set(r.subjectCode, subj);
    }
    subj.perQuarter.set(r.periodOrder, r.grade);
  }

  const blockList = [...blocks.entries()].sort(
    ([, a], [, b]) => a.schoolYear.localeCompare(b.schoolYear),
  );

  // Adviser per distinct section — resolved through the existing helper.
  const adviserBySection = new Map<string, string | null>();
  const distinctSections = [...new Set(blockList.map(([, b]) => b.sectionId))];
  for (const sectionId of distinctSections) {
    adviserBySection.set(sectionId, await getSectionAdviser(sectionId));
  }
  const principal = await getPrincipalName();

  const out = blockList.map(([enrollmentId, block]) => {
    const subjects: Form137Subject[] = [...block.perSubject.entries()].map(
      ([code, { name, perQuarter }]) => {
        const quarters: Array<number | null> = [
          perQuarter.get(1) ?? null,
          perQuarter.get(2) ?? null,
          perQuarter.get(3) ?? null,
          perQuarter.get(4) ?? null,
        ];
        const finalGrade = computeFinalGrade(quarters);
        const descriptor = mapGradeToDescriptor(finalGrade);
        return {
          subjectCode: code,
          subjectName: name,
          quarters,
          finalGrade,
          remark: descriptor ? descriptor.remark : null,
        };
      },
    );

    const finals = subjects
      .map((s) => s.finalGrade)
      .filter((g): g is number => g != null);
    const generalAverage =
      finals.length > 0
        ? Math.round(finals.reduce((a, g) => a + g, 0) / finals.length)
        : null;

    return {
      enrollmentId,
      schoolYear: block.schoolYear,
      gradeLevel: block.gradeLevelName,
      section: block.sectionName,
      adviser: adviserBySection.get(block.sectionId) ?? null,
      subjects,
      generalAverage,
    };
  });

  return {
    student: {
      id: studentRow.id,
      studentNumber: studentRow.studentNumber,
      lrn: studentRow.lrn,
      name: fullName(studentRow),
      sex: studentRow.sex,
      birthDate: studentRow.birthDate,
      age: ageFromBirthDate(studentRow.birthDate),
    },
    blocks: out,
    principal,
  };
}
