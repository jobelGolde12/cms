import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceRecords,
  gradeLevels,
  gradingPeriods,
  roles,
  schoolYears,
  sections,
  studentEnrollments,
  studentGrades,
  students,
  subjects,
  users,
} from "@/db/schema";
import { ageFromBirthDate } from "./utils";

/**
 * Learner's Performance Report Card data layer.
 *
 * Read-only: every function here only selects existing rows from
 * students/student_enrollments/student_grades/subjects/grading_periods/
 * sections/attendance_records. Rendering or downloading a report card never
 * mutates any record (same guarantee as the student card and Form 137).
 *
 * Field source of truth (mapped from CARD.docx):
 * - Name / age / sex / student no.  → students (+ utils helpers)
 * - Grade & Section / Adviser       → student_enrollments + sections + users
 * - School Year                     → school_years.year
 * - Term grades                     → student_grades (per grading_periods)
 * - Final grade & remarks           → COMPUTED (not stored)
 * - Attendance                      → attendance_records aggregated by month
 *
 * Known gaps (documented in TODO.md): no track/strand storage (rendered blank).
 * LRN now has its own column; the report card falls back to the student number
 * when it has not been filed yet.
 */

/* -------------------------------------------------------------------------- */
/*  Descriptors (CARD.docx grading scale)                                     */
/* -------------------------------------------------------------------------- */

export type GradeDescriptor = {
  descriptor: string;
  remark: "Passed" | "Failed";
};

/** Official DepEd scale encoded from CARD.docx. */
export function mapGradeToDescriptor(grade: number | null | undefined): GradeDescriptor | null {
  if (grade == null || !Number.isFinite(grade)) return null;
  const g = Math.round(grade);
  if (g >= 90 && g <= 100) return { descriptor: "Advancing", remark: "Passed" };
  if (g >= 80 && g <= 89) return { descriptor: "Benchmarking", remark: "Passed" };
  if (g >= 75 && g <= 79) return { descriptor: "Connecting", remark: "Passed" };
  if (g >= 65 && g <= 74) return { descriptor: "Developing", remark: "Failed" };
  if (g >= 0 && g <= 64) return { descriptor: "Emerging", remark: "Failed" };
  return null; // out of range — no remark is invented
}

/* -------------------------------------------------------------------------- */
/*  Final grade computation                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Final grade = average of the *available* term grades, rounded to a whole
 * number. Partial term data still produces a final grade; a subject with no
 * grade at all yields null (never 0).
 */
export function computeFinalGrade(termGrades: Array<number | null>): number | null {
  const available = termGrades.filter(
    (g): g is number => g != null && Number.isFinite(g),
  );
  if (available.length === 0) return null;
  const sum = available.reduce((acc, g) => acc + g, 0);
  return Math.round(sum / available.length);
}

/* -------------------------------------------------------------------------- */
/*  Attendance aggregation                                                    */
/* -------------------------------------------------------------------------- */

export type AttendanceRecordLite = { date: string; status: string };

/** Months column order from CARD.docx (PH school year June → April). */
export const REPORT_CARD_MONTHS = [
  "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr",
] as const;

export type AttendanceMonth = {
  month: string;
  schoolDays: number;
  present: number;
  absent: number;
};

export type AttendanceSummary = {
  months: AttendanceMonth[]; // fixed REPORT_CARD_MONTHS order for the school year
  totalSchoolDays: number;
  totalPresent: number;
  totalAbsent: number;
};

/**
 * Aggregate attendance rows into the CARD.docx month columns.
 * "No. of class days" is approximated as the number of days the learner has a
 * recorded attendance row for (no school-calendar table exists in the schema —
 * documented gap in TODO.md). present+late count as present; both absent
 * kinds count as absent. Rows outside the school-year month span are ignored.
 */
export function aggregateAttendanceByMonth(
  records: AttendanceRecordLite[],
  schoolYear: string, // "YYYY-YYYY"
): AttendanceMonth[] {
  const [startYear, endYear] = schoolYear.split("-").map(Number);
  if (!startYear || !endYear) return [];

  const counts: Record<string, { schoolDays: number; present: number; absent: number }> = {};
  for (const month of REPORT_CARD_MONTHS)
    counts[month] = { schoolDays: 0, present: 0, absent: 0 };

  for (const r of records) {
    const [y, m, d] = r.date.split("-").map(Number);
    if (!y || !m || !d) continue;
    let label: string | null = null;
    // Jun–Dec belong to the first calendar year, Jan–Apr to the second.
    if (m >= 6 && m <= 12 && y === startYear) label = REPORT_CARD_MONTHS[m - 6];
    else if (m >= 1 && m <= 4 && y === endYear) label = REPORT_CARD_MONTHS[7 + (m - 1)];
    if (!label) continue;

    counts[label].schoolDays += 1; // a recorded day is a school day
    if (r.status === "present" || r.status === "late") counts[label].present += 1;
    else if (r.status === "absent_excused" || r.status === "absent_unexcused")
      counts[label].absent += 1;
  }

  return REPORT_CARD_MONTHS.map<AttendanceMonth>((month) => ({
    month,
    schoolDays: counts[month].schoolDays,
    present: counts[month].present,
    absent: counts[month].absent,
  }));
}

export function summarizeAttendance(
  records: AttendanceRecordLite[],
  schoolYear: string,
): AttendanceSummary {
  const months = aggregateAttendanceByMonth(records, schoolYear);
  const total = (key: "schoolDays" | "present" | "absent") =>
    months.reduce((acc, m) => acc + m[key], 0);
  return {
    months,
    totalSchoolDays: total("schoolDays"),
    totalPresent: total("present"),
    totalAbsent: total("absent"),
  };
}

/* -------------------------------------------------------------------------- */
/*  Data contract                                                             */
/* -------------------------------------------------------------------------- */

export const REPORT_CARD_TERMS = ["Term 1", "Term 2", "Term 3"] as const;

export type ReportCardSubject = {
  subjectCode: string;
  subjectName: string;
  /** Grades keyed by term index (0 = Term 1). */
  termGrades: Array<number | null>;
  finalGrade: number | null;
  remark: string | null;
  descriptor: string | null;
};

export type ReportCardData = {
  hasEnrollment: boolean;
  student: {
    id: string;
    studentNumber: string;
    lrn: string | null;
    fullName: string;
    age: number | null;
    sex: string;
  };
  schoolYear: string;
  gradeLevel: string | null;
  section: string | null;
  adviser: string | null;
  principal: string | null;
  subjects: ReportCardSubject[];
  terms: string[];
  generalAverage: number | null;
  attendance: AttendanceSummary;
};

/* -------------------------------------------------------------------------- */
/*  Shared data fetch (browser preview + PDF endpoint)                        */
/* -------------------------------------------------------------------------- */

/** Full display name of the section adviser, or null when none assigned. */
export async function getSectionAdviser(sectionId: string | null): Promise<string | null> {
  if (!sectionId) return null;
  const rows = await db
    .select({ first: users.firstName, middle: users.middleName, last: users.lastName })
    .from(sections)
    .innerJoin(users, eq(users.id, sections.adviserId))
    .where(eq(sections.id, sectionId))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  return [r.first, r.middle, r.last].filter(Boolean).join(" ");
}

/** First active admin-tier user shown as principal on official documents. */
export async function getPrincipalName(): Promise<string | null> {
  const rows = await db
    .select({
      first: users.firstName,
      middle: users.middleName,
      last: users.lastName,
    })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(and(inArray(roles.name, ["admin", "school_admin"]), eq(users.isActive, true)))
    .orderBy(asc(users.createdAt))
    .limit(1);
  const r = rows[0];
  return r ? [r.first, r.middle, r.last].filter(Boolean).join(" ") : null;
}

type EnrollmentRow = {
  enrollmentId: string;
  schoolYear: string;
  gradeLevelName: string;
  sectionId: string;
  sectionName: string;
};

/**
 * Resolve the enrollment row for the report card. Prefers the active
 * enrollment for the school year; falls back to the most recent enrollment of
 * any status when only completed/transferred rows exist.
 */
async function getReportCardEnrollment(
  studentId: string,
  schoolYearId: string,
): Promise<EnrollmentRow | null> {
  const enrollmentSelection = {
    enrollmentId: studentEnrollments.id,
    schoolYear: schoolYears.year,
    gradeLevelName: gradeLevels.name,
    sectionId: studentEnrollments.sectionId,
    sectionName: sections.name,
  };

  const baseQuery = db
    .select(enrollmentSelection)
    .from(studentEnrollments)
    .innerJoin(schoolYears, eq(schoolYears.id, studentEnrollments.schoolYearId))
    .innerJoin(gradeLevels, eq(gradeLevels.id, studentEnrollments.gradeLevelId))
    .innerJoin(sections, eq(sections.id, studentEnrollments.sectionId));

  const active = await baseQuery
    .where(
      and(
        eq(studentEnrollments.studentId, studentId),
        eq(studentEnrollments.schoolYearId, schoolYearId),
        eq(studentEnrollments.status, "active"),
      ),
    )
    .limit(1);
  if (active[0]) return active[0];

  /** Most recent enrollment (per enrollment date) wins on ambiguity. */
  const any = await baseQuery
    .where(
      and(
        eq(studentEnrollments.studentId, studentId),
        eq(studentEnrollments.schoolYearId, schoolYearId),
      ),
    )
    .orderBy(
      sql`case when ${studentEnrollments.status} = 'active' then 0 else 1 end`,
      desc(studentEnrollments.createdAt),
    )
    .limit(1);
  return any[0] ?? null;
}

/**
 * Build the full report-card data contract for one student.
 * Consumers MUST run authorization (documents.print + canAccessStudent)
 * before calling this — it performs no permission checks itself.
 */
export async function getReportCardData(
  studentId: string,
  options: { schoolYearId?: string } = {},
): Promise<ReportCardData | null> {
  const studentRows = await db
    .select({
      id: students.id,
      studentNumber: students.studentNumber,
      lrn: students.lrn,
      firstName: students.firstName,
      middleName: students.middleName,
      lastName: students.lastName,
      suffix: students.suffix,
      birthDate: students.birthDate,
      sex: students.sex,
    })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);

  const studentRow = studentRows[0];
  if (!studentRow) return null;

  const fullName = [
    studentRow.firstName,
    studentRow.middleName,
    studentRow.lastName,
    studentRow.suffix,
  ]
    .filter(Boolean)
    .join(" ");

  const empty: ReportCardData = {
    hasEnrollment: false,
    student: {
      id: studentRow.id,
      studentNumber: studentRow.studentNumber,
      lrn: studentRow.lrn,
      fullName,
      age: ageFromBirthDate(studentRow.birthDate),
      sex: studentRow.sex,
    },
    schoolYear: "",
    gradeLevel: null,
    section: null,
    adviser: null,
    principal: null,
    subjects: [],
    terms: [...REPORT_CARD_TERMS],
    generalAverage: null,
    attendance: { months: [], totalSchoolDays: 0, totalPresent: 0, totalAbsent: 0 },
  };

  // Target school year: explicit id, else the current school year.
  const schoolYearId =
    options.schoolYearId ??
    (
      await db
        .select({ id: schoolYears.id, year: schoolYears.year })
        .from(schoolYears)
        .where(eq(schoolYears.isCurrent, true))
        .limit(1)
    )[0]?.id ??
    "";

  if (!schoolYearId) return empty;

  const enrollment = await getReportCardEnrollment(studentId, schoolYearId);

  const [adviser, principal] = await Promise.all([
    getSectionAdviser(enrollment?.sectionId ?? null),
    getPrincipalName(),
  ]);

  if (!enrollment) {
    return { ...empty, adviser, principal };
  }

  // Term grades for the resolved enrollment only (never other school years).
  const gradeRows = await db
    .select({
      grade: studentGrades.grade,
      subjectCode: subjects.code,
      subjectName: subjects.name,
      periodOrder: gradingPeriods.orderIndex,
    })
    .from(studentGrades)
    .innerJoin(subjects, eq(subjects.id, studentGrades.subjectId))
    .innerJoin(gradingPeriods, eq(gradingPeriods.id, studentGrades.gradingPeriodId))
    .where(eq(studentGrades.enrollmentId, enrollment.enrollmentId))
    .orderBy(asc(subjects.code), asc(gradingPeriods.orderIndex));

  const perSubject = new Map<string, { name: string; perTerm: Map<number, number> }>();
  for (const r of gradeRows) {
    let entry = perSubject.get(r.subjectCode);
    if (!entry) {
      entry = { name: r.subjectName, perTerm: new Map() };
      perSubject.set(r.subjectCode, entry);
    }
    entry.perTerm.set(r.periodOrder, r.grade);
  }

  const subjectsData: ReportCardSubject[] = [...perSubject.entries()].map(
    ([code, { name, perTerm }]) => {
      const termGrades: Array<number | null> = [
        perTerm.get(1) ?? null,
        perTerm.get(2) ?? null,
        perTerm.get(3) ?? null,
      ];
      const finalGrade = computeFinalGrade(termGrades);
      const descriptor = mapGradeToDescriptor(finalGrade);
      return {
        subjectCode: code,
        subjectName: name,
        termGrades,
        finalGrade,
        remark: descriptor ? descriptor.remark : null,
        descriptor: descriptor ? descriptor.descriptor : null,
      };
    },
  );

  const finalGrades = subjectsData
    .map((s) => s.finalGrade)
    .filter((g): g is number => g != null);
  const generalAverage =
    finalGrades.length > 0
      ? Math.round(finalGrades.reduce((a, g) => a + g, 0) / finalGrades.length)
      : null;

  const attendanceRows: AttendanceRecordLite[] = await db
    .select({ date: attendanceRecords.date, status: attendanceRecords.status })
    .from(attendanceRecords)
    .where(eq(attendanceRecords.enrollmentId, enrollment.enrollmentId));

  return {
    hasEnrollment: true,
    student: {
      id: studentRow.id,
      studentNumber: studentRow.studentNumber,
      lrn: studentRow.lrn,
      fullName,
      age: ageFromBirthDate(studentRow.birthDate),
      sex: studentRow.sex,
    },
    schoolYear: enrollment.schoolYear,
    gradeLevel: enrollment.gradeLevelName,
    section: enrollment.sectionName,
    adviser,
    principal,
    subjects: subjectsData,
    terms: [...REPORT_CARD_TERMS],
    generalAverage,
    attendance: summarizeAttendance(attendanceRows, enrollment.schoolYear),
  };
}
