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
 * SF10-JHS — Learner's Permanent Academic Record for Junior High School
 * (formerly Form 137) data layer.
 *
 * Read-only: every function here only selects existing rows. Rendering,
 * printing or downloading the SF10 never mutates any record (same guarantee
 * as the report card).
 *
 * The SF10-JHS is a PERMANENT record: it spans the learner's full enrollment
 * history in this school, one scholastic-record table per school year /
 * grade level (DepEd Order No. 58, s. 2017 structure). Data comes from:
 * - students                        → name components / LRN / sex / birth date
 * - student_enrollments (+SY/grade/section) → one scholastic block per school year
 * - student_grades (+grading_periods)   → quarter ratings per learning area
 * - final rating & remarks          → the application's existing COMPUTED
 *   logic (`computeFinalGrade` + `mapGradeToDescriptor` from report-card.ts —
 *   the same calculation shown everywhere else in the system)
 * - general average                 → same rule as the report card (average
 *   of the subjects' final ratings)
 * - year-end action                 → the enrollment's recorded promotion status
 *
 * Field truth (documented gaps, rendered as blank ruled fields — never invented):
 * - School ID, District, Section teacher-in-charge beyond the adviser name,
 *   Learner照片/declarations and the remedial-class mark/recomputed grades
 *   are not stored anywhere in the schema yet.
 * - All values are derived from the database; nothing about the learner is
 *   hardcoded.
 */

/* -------------------------------------------------------------------------- */
/*  Data contract                                                             */
/* -------------------------------------------------------------------------- */

export const SF9_QUARTERS = [
  "1st Quarter",
  "2nd Quarter",
  "3rd Quarter",
  "4th Quarter",
] as const;

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
  /** Recorded year-end action (e.g. PROMOTED / RETAINED), if stored. */
  promotionStatus: string | null;
  subjects: Form137Subject[];
  generalAverage: number | null;
};

export type Form137Data = {
  student: {
    id: string;
    studentNumber: string;
    lrn: string | null;
    // SF10 name layout: last, first, name extension, middle (PSA order).
    firstName: string;
    lastName: string;
    middleName: string | null;
    suffix: string | null;
    name: string;
    sex: string;
    birthDate: string | null;
    birthPlace: string | null;
    age: number | null;
  };
  /** Permanent-record blocks, oldest school year first (chronological). */
  blocks: Form137YearBlock[];
  principal: string | null;
  /** SF10-JHS eligibility & previous-enrollment info (from earliest enrollment). */
  eligibility: {
    certificate: string | null;
    previousSchoolName: string | null;
    previousSchoolAddress: string | null;
    previousGeneralAverage: number | null;
    previousGradeLevel: string | null;
    promotionStatus: string | null;
    academicDistinction: string | null;
  };
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
export async function getForm137Data(
  studentId: string,
): Promise<Form137Data | null> {
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
      birthPlace: students.birthPlace,
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
      promotionStatus: studentEnrollments.promotionStatus,
      subjectCode: subjects.code,
      subjectName: subjects.name,
      grade: studentGrades.grade,
      periodOrder: gradingPeriods.orderIndex,
    })
    .from(studentGrades)
    .innerJoin(
      studentEnrollments,
      eq(studentEnrollments.id, studentGrades.enrollmentId),
    )
    .innerJoin(schoolYears, eq(schoolYears.id, studentEnrollments.schoolYearId))
    .innerJoin(gradeLevels, eq(gradeLevels.id, studentEnrollments.gradeLevelId))
    .innerJoin(sections, eq(sections.id, studentEnrollments.sectionId))
    .innerJoin(subjects, eq(subjects.id, studentGrades.subjectId))
    .innerJoin(
      gradingPeriods,
      eq(gradingPeriods.id, studentGrades.gradingPeriodId),
    )
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
    promotionStatus: string | null;
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
        promotionStatus: r.promotionStatus,
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

  const blockList = [...blocks.entries()].sort(([, a], [, b]) =>
    a.schoolYear.localeCompare(b.schoolYear),
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
      promotionStatus: block.promotionStatus,
      subjects,
      generalAverage,
    };
  });

  // Eligibility / previous-enrollment info (earliest enrollment record for SF10 section).
  const eligibilityRow = await db
    .select({
      eligibilityCertificate: studentEnrollments.eligibilityCertificate,
      previousSchoolName: studentEnrollments.previousSchoolName,
      previousSchoolAddress: studentEnrollments.previousSchoolAddress,
      previousGeneralAverage: studentEnrollments.previousGeneralAverage,
      previousGradeLevel: studentEnrollments.previousGradeLevel,
      promotionStatus: studentEnrollments.promotionStatus,
      academicDistinction: studentEnrollments.academicDistinction,
    })
    .from(studentEnrollments)
    .where(eq(studentEnrollments.studentId, studentId))
    .orderBy(asc(studentEnrollments.enrollmentDate))
    .limit(1);

  const eligibility = eligibilityRow[0]
    ? {
        certificate: eligibilityRow[0].eligibilityCertificate,
        previousSchoolName: eligibilityRow[0].previousSchoolName,
        previousSchoolAddress: eligibilityRow[0].previousSchoolAddress,
        previousGeneralAverage: eligibilityRow[0].previousGeneralAverage,
        previousGradeLevel: eligibilityRow[0].previousGradeLevel,
        promotionStatus: eligibilityRow[0].promotionStatus,
        academicDistinction: eligibilityRow[0].academicDistinction,
      }
    : {
        certificate: null,
        previousSchoolName: null,
        previousSchoolAddress: null,
        previousGeneralAverage: null,
        previousGradeLevel: null,
        promotionStatus: null,
        academicDistinction: null,
      };

  return {
    student: {
      id: studentRow.id,
      studentNumber: studentRow.studentNumber,
      lrn: studentRow.lrn,
      firstName: studentRow.firstName,
      lastName: studentRow.lastName,
      middleName: studentRow.middleName,
      suffix: studentRow.suffix,
      name: fullName(studentRow),
      sex: studentRow.sex,
      birthDate: studentRow.birthDate,
      birthPlace: studentRow.birthPlace,
      age: ageFromBirthDate(studentRow.birthDate),
    },
    blocks: out,
    principal,
    eligibility,
  };
}
