import { and, asc, count, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  assessments,
  attendanceRecords,
  behaviorRecords,
  behaviorCategories,
  gradeLevels,
  gradingPeriods,
  interventions,
  recordVerifications,
  schoolYears,
  sections,
  studentEnrollments,
  studentGrades,
  students,
  subjects,
} from "@/db/schema";
import type { SessionUser } from "../auth";
import { userSectionScope } from "../scope";
import { ageFromBirthDate, fullName } from "../utils";
import type { AssessmentDomain, ReportType } from "@/lib/constants";
import { REPORT_TYPE_LABELS } from "@/lib/constants";

export type ReportParams = {
  gradeLevelId?: string;
  sectionId?: string;
  domain?: AssessmentDomain;
};

export type ReportRow = Record<string, string | number | null>;

export type BuiltReport = {
  type: ReportType;
  title: string;
  filters: string;
  generatedAt: Date;
  generatedBy: string;
  scope: string;
  columns: string[];
  rows: ReportRow[];
  summary: { label: string; value: number }[];
};

const studentName = (r: { firstName: string; lastName: string; sex: string }) =>
  `${fullName({ firstName: r.firstName, lastName: r.lastName })} (${r.sex === "male" ? "M" : "F"})`;

function recordStatusLabel(s: string | null): string {
  const map: Record<string, string> = {
    draft: "Draft",
    pending_validation: "Pending Verification",
    needs_correction: "Needs Correction",
    verified: "Verified",
    marked_duplicate: "Marked Duplicate",
  };
  return map[s ?? ""] ?? s ?? "";
}

export async function buildReport(
  user: SessionUser,
  type: ReportType,
  params: ReportParams,
): Promise<BuiltReport> {
  const scope = await userSectionScope(user);
  const withScope = (extra?: SQL) => (scope ? (extra ? and(scope, extra) : scope) : extra);

  const generatedAt = new Date();
  const filters = [
    params.gradeLevelId ? `Grade level: ${await gradeLevelName(params.gradeLevelId)}` : null,
    params.sectionId ? `Section: ${await sectionName(params.sectionId)}` : null,
    params.domain ? `Domain: ${params.domain}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const SY = await currentYear();

  const base = {
    type,
    title: REPORT_TYPE_LABELS[type],
    filters: filters || `School-wide (${SY ?? "current year"})`,
    generatedAt,
    generatedBy: `${user.firstName} ${user.lastName} (${user.role})`,
    scope: params.sectionId ? "section" : params.gradeLevelId ? "grade_level" : "school",
  };

  switch (type) {
    case "student_master_list":
    case "enrollment_report": {
      const where = withScope(
        and(
          sql`${students.status} = 'active'`,
          sql`${students.recordStatus} != 'marked_duplicate'`,
          params.gradeLevelId ? eq(studentEnrollments.gradeLevelId, params.gradeLevelId) : sql`1 = 1`,
          params.sectionId ? eq(studentEnrollments.sectionId, params.sectionId) : sql`1 = 1`,
        ),
      );

      const rows = await db
        .select({
          number: students.studentNumber,
          firstName: students.firstName,
          lastName: students.lastName,
          middleName: students.middleName,
          suffix: students.suffix,
          sex: students.sex,
          birthDate: students.birthDate,
          grade: gradeLevels.name,
          section: sections.name,
          year: schoolYears.year,
          enrollmentStatus: studentEnrollments.status,
          recordStatus: students.recordStatus,
        })
        .from(students)
        .leftJoin(
          studentEnrollments,
          and(
            eq(studentEnrollments.studentId, students.id),
            eq(studentEnrollments.status, "active"),
          ),
        )
        .leftJoin(gradeLevels, eq(gradeLevels.id, studentEnrollments.gradeLevelId))
        .leftJoin(sections, eq(sections.id, studentEnrollments.sectionId))
        .leftJoin(schoolYears, eq(schoolYears.id, studentEnrollments.schoolYearId))
        .where(where)
        .orderBy(asc(students.lastName), asc(students.firstName));

      const data = rows.map((r) => ({
        "Student No.": r.number,
        "Full Name": [r.lastName, r.firstName, r.middleName, r.suffix].filter(Boolean).join(", "),
        Sex: r.sex === "male" ? "Male" : "Female",
        Age: ageFromBirthDate(r.birthDate) ?? "",
        "Birth Date": r.birthDate,
        "Grade Level": r.grade ?? "—",
        Section: r.section ?? "—",
        "School Year": r.year ?? "—",
        "Enrollment Status": r.enrollmentStatus ?? "Not enrolled",
        "Record Status": recordStatusLabel(r.recordStatus),
      }));

      return {
        ...base,
        columns: [
          "Student No.",
          "Full Name",
          "Sex",
          "Age",
          "Birth Date",
          "Grade Level",
          "Section",
          "School Year",
          "Enrollment Status",
          "Record Status",
        ],
        rows: data,
        summary: summarize(data),
      };
    }

    case "grade_report":
    case "subject_performance":
    case "grade_level_performance":
    case "section_performance": {
      const where = withScope(
        and(
          eq(schoolYears.isCurrent, true),
          params.gradeLevelId
            ? eq(studentEnrollments.gradeLevelId, params.gradeLevelId)
            : sql`1 = 1`,
          params.sectionId ? eq(studentEnrollments.sectionId, params.sectionId) : sql`1 = 1`,
        ),
      );

      const rows = await db
        .select({
          number: students.studentNumber,
          firstName: students.firstName,
          lastName: students.lastName,
          sex: students.sex,
          birthDate: students.birthDate,
          grade: gradeLevels.name,
          section: sections.name,
          period: gradingPeriods.name,
          subject: subjects.name,
          gradeValue: studentGrades.grade,
        })
        .from(studentGrades)
        .innerJoin(studentEnrollments, eq(studentEnrollments.id, studentGrades.enrollmentId))
        .innerJoin(students, eq(students.id, studentEnrollments.studentId))
        .innerJoin(schoolYears, eq(schoolYears.id, studentEnrollments.schoolYearId))
        .leftJoin(gradeLevels, eq(gradeLevels.id, studentEnrollments.gradeLevelId))
        .leftJoin(sections, eq(sections.id, studentEnrollments.sectionId))
        .innerJoin(subjects, eq(subjects.id, studentGrades.subjectId))
        .innerJoin(gradingPeriods, eq(gradingPeriods.id, studentGrades.gradingPeriodId))
        .where(where)
        .orderBy(asc(students.lastName), asc(students.firstName), asc(subjects.code))

      const data = rows.map((r) => ({
        "Student No.": r.number,
        "Full Name": studentName(r),
        "Grade Level": r.grade ?? "—",
        Section: r.section ?? "—",
        Subject: r.subject,
        Period: r.period,
        Grade: r.gradeValue,
      }));

      const avg =
        data.length > 0
          ? Math.round(
              (data.reduce((s, r) => s + Number(r.Grade ?? 0), 0) / data.length) * 10,
            ) / 10
          : 0;

      return {
        ...base,
        columns: ["Student No.", "Full Name", "Grade Level", "Section", "Subject", "Period", "Grade"],
        rows: data,
        summary: [
          { label: "Grade entries", value: data.length },
          { label: "Average grade", value: avg },
          { label: "Below 75", value: data.filter((r) => Number(r.Grade ?? 0) < 75).length },
        ],
      };
    }

    case "attendance_report": {
      const where = withScope(
        and(
          eq(schoolYears.isCurrent, true),
          params.gradeLevelId
            ? eq(studentEnrollments.gradeLevelId, params.gradeLevelId)
            : sql`1 = 1`,
          params.sectionId ? eq(studentEnrollments.sectionId, params.sectionId) : sql`1 = 1`,
        ),
      );

      const rows = await db
        .select({
          number: students.studentNumber,
          firstName: students.firstName,
          lastName: students.lastName,
          sex: students.sex,
          grade: gradeLevels.name,
          section: sections.name,
          date: attendanceRecords.date,
          status: attendanceRecords.status,
        })
        .from(attendanceRecords)
        .innerJoin(studentEnrollments, eq(studentEnrollments.id, attendanceRecords.enrollmentId))
        .innerJoin(students, eq(students.id, studentEnrollments.studentId))
        .innerJoin(schoolYears, eq(schoolYears.id, studentEnrollments.schoolYearId))
        .leftJoin(gradeLevels, eq(gradeLevels.id, studentEnrollments.gradeLevelId))
        .leftJoin(sections, eq(sections.id, studentEnrollments.sectionId))
        .where(where)
        .orderBy(desc(attendanceRecords.date))
        .limit(2000);

      const data = rows.map((r) => ({
        "Student No.": r.number,
        "Full Name": studentName(r),
        "Grade Level": r.grade ?? "—",
        Section: r.section ?? "—",
        Date: r.date,
        Status: r.status,
      }));

      const totals = data.reduce<Record<string, number>>((acc, r) => {
        acc[String(r.Status)] = (acc[String(r.Status)] ?? 0) + 1;
        return acc;
      }, {});

      return {
        ...base,
        columns: ["Student No.", "Full Name", "Grade Level", "Section", "Date", "Status"],
        rows: data,
        summary: Object.entries(totals).map(([label, value]) => ({ label, value })),
      };
    }

    case "reading_report":
    case "literacy_report":
    case "numeracy_report": {
      const domain: AssessmentDomain =
        type === "reading_report" ? "reading" : type === "literacy_report" ? "literacy" : "numeracy";

      const rows = await db
        .select({
          number: students.studentNumber,
          firstName: students.firstName,
          lastName: students.lastName,
          sex: students.sex,
          birthDate: students.birthDate,
          grade: gradeLevels.name,
          date: assessments.date,
          level: assessments.level,
          score: assessments.score,
          assessmentType: assessments.assessmentType,
        })
        .from(assessments)
        .innerJoin(students, eq(students.id, assessments.studentId))
        .leftJoin(
          studentEnrollments,
          and(
            eq(studentEnrollments.studentId, students.id),
            eq(studentEnrollments.status, "active"),
          ),
        )
        .leftJoin(gradeLevels, eq(gradeLevels.id, studentEnrollments.gradeLevelId))
        .where(withScope(eq(assessments.domain, domain)))
        .orderBy(desc(assessments.date))
        .limit(1000);

      const data = rows.map((r) => ({
        "Student No.": r.number,
        "Full Name": studentName(r),
        "Grade Level": r.grade ?? "—",
        Date: r.date,
        Type: r.assessmentType ?? "—",
        Level: r.level ?? "—",
        Score: r.score ?? "",
      }));

      const levelCounts = data.reduce<Record<string, number>>((acc, r) => {
        const k = String(r.Level);
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {});

      return {
        ...base,
        columns: ["Student No.", "Full Name", "Grade Level", "Date", "Type", "Level", "Score"],
        rows: data,
        summary: Object.entries(levelCounts).map(([label, value]) => ({ label, value })),
      };
    }

    case "behavior_report": {
      const rows = await db
        .select({
          number: students.studentNumber,
          firstName: students.firstName,
          lastName: students.lastName,
          sex: students.sex,
          grade: gradeLevels.name,
          category: behaviorCategories.name,
          kind: behaviorCategories.kind,
          date: behaviorRecords.date,
          severity: behaviorRecords.severity,
          status: behaviorRecords.status,
        })
        .from(behaviorRecords)
        .innerJoin(behaviorCategories, eq(behaviorCategories.id, behaviorRecords.categoryId))
        .innerJoin(students, eq(students.id, behaviorRecords.studentId))
        .leftJoin(
          studentEnrollments,
          and(
            eq(studentEnrollments.studentId, students.id),
            eq(studentEnrollments.status, "active"),
          ),
        )
        .leftJoin(gradeLevels, eq(gradeLevels.id, studentEnrollments.gradeLevelId))
        .where(withScope(sql`1 = 1`))
        .orderBy(desc(behaviorRecords.date))
        .limit(1000);

      const data = rows.map((r) => ({
        "Student No.": r.number,
        "Full Name": studentName(r),
        "Grade Level": r.grade ?? "—",
        Category: r.category,
        Kind: r.kind,
        Date: r.date,
        Severity: r.severity ?? "—",
        Status: r.status,
      }));

      const counts = data.reduce<Record<string, number>>((acc, r) => {
        acc[String(r.Category)] = (acc[String(r.Category)] ?? 0) + 1;
        return acc;
      }, {});

      return {
        ...base,
        columns: ["Student No.", "Full Name", "Grade Level", "Category", "Kind", "Date", "Severity", "Status"],
        rows: data,
        summary: Object.entries(counts).map(([label, value]) => ({ label, value })),
      };
    }

    case "intervention_report": {
      const rows = await db
        .select({
          number: students.studentNumber,
          firstName: students.firstName,
          lastName: students.lastName,
          sex: students.sex,
          grade: gradeLevels.name,
          type: interventions.interventionType,
          status: interventions.status,
          startDate: interventions.startDate,
          targetDate: interventions.targetDate,
          outcome: interventions.outcome,
        })
        .from(interventions)
        .innerJoin(students, eq(students.id, interventions.studentId))
        .leftJoin(
          studentEnrollments,
          and(
            eq(studentEnrollments.studentId, students.id),
            eq(studentEnrollments.status, "active"),
          ),
        )
        .leftJoin(gradeLevels, eq(gradeLevels.id, studentEnrollments.gradeLevelId))
        .where(withScope(sql`1 = 1`))
        .orderBy(desc(interventions.createdAt))
        .limit(1000);

      const data = rows.map((r) => ({
        "Student No.": r.number,
        "Full Name": studentName(r),
        "Grade Level": r.grade ?? "—",
        Type: r.type,
        Status: r.status,
        Start: r.startDate ?? "—",
        Target: r.targetDate ?? "—",
        Outcome: r.outcome ?? "—",
      }));

      const statusCounts = data.reduce<Record<string, number>>((acc, r) => {
        acc[String(r.Status)] = (acc[String(r.Status)] ?? 0) + 1;
        return acc;
      }, {});

      return {
        ...base,
        columns: ["Student No.", "Full Name", "Grade Level", "Type", "Status", "Start", "Target", "Outcome"],
        rows: data,
        summary: Object.entries(statusCounts).map(([label, value]) => ({ label, value })),
      };
    }

    case "student_profile_report": {
      // One row per pending verification, with verification history counts.
      const rows = await db
        .select({
          number: students.studentNumber,
          firstName: students.firstName,
          lastName: students.lastName,
          sex: students.sex,
          birthDate: students.birthDate,
          recordStatus: students.recordStatus,
          submittedAt: recordVerifications.submittedAt,
        })
        .from(students)
        .leftJoin(recordVerifications, eq(recordVerifications.studentId, students.id))
        .where(withScope(sql`${students.status} = 'active'`))
        .groupBy(students.id)
        .orderBy(asc(students.lastName))
        .limit(1000);

      const data = rows.map((r) => ({
        "Student No.": r.number,
        "Full Name": studentName(r),
        Sex: r.sex === "male" ? "Male" : "Female",
        Age: ageFromBirthDate(r.birthDate) ?? "",
        "Birth Date": r.birthDate,
        "Record Status": recordStatusLabel(r.recordStatus),
        "Last Submitted": r.submittedAt ? r.submittedAt.toISOString().slice(0, 10) : "—",
      }));

      return {
        ...base,
        columns: [
          "Student No.",
          "Full Name",
          "Sex",
          "Age",
          "Birth Date",
          "Record Status",
          "Last Submitted",
        ],
        rows: data,
        summary: summarize(data),
      };
    }

    case "needs_monitoring_report": {
      // Students with open behavior concerns or active interventions.
      const rows = await db
        .select({
          number: students.studentNumber,
          firstName: students.firstName,
          lastName: students.lastName,
          sex: students.sex,
          grade: gradeLevels.name,
          concerns:
            sql<number>`(select count(*) from behavior_records br where br.student_id = ${students.id} and br.status != 'resolved') + (select count(*) from interventions iv where iv.student_id = ${students.id} and iv.status in ('planned','active'))`,
        })
        .from(students)
        .leftJoin(
          studentEnrollments,
          and(
            eq(studentEnrollments.studentId, students.id),
            eq(studentEnrollments.status, "active"),
          ),
        )
        .leftJoin(gradeLevels, eq(gradeLevels.id, studentEnrollments.gradeLevelId))
        .where(
          withScope(
            sql`(exists (select 1 from behavior_records br where br.student_id = ${students.id} and br.status != 'resolved')
              or exists (select 1 from interventions iv where iv.student_id = ${students.id} and iv.status in ('planned','active')))`,
          ),
        )
        .orderBy(desc(sql`(select count(*) from behavior_records br where br.student_id = ${students.id} and br.status != 'resolved')`))
        .limit(500);

      const data = rows.map((r) => ({
        "Student No.": r.number,
        "Full Name": studentName(r),
        "Grade Level": r.grade ?? "—",
        "Open Items": Number(r.concerns ?? 0),
      }));

      return {
        ...base,
        columns: ["Student No.", "Full Name", "Grade Level", "Open Items"],
        rows: data,
        summary: [{ label: "Students requiring attention", value: data.length }],
      };
    }

    case "school_year_comparison":
    default: {
      // Grade averages per school year.
      const rows = await db
        .select({
          year: schoolYears.year,
          subject: subjects.name,
          average: sql<number>`round(avg(${studentGrades.grade}), 1)`,
          entries: count(),
        })
        .from(studentGrades)
        .innerJoin(studentEnrollments, eq(studentEnrollments.id, studentGrades.enrollmentId))
        .innerJoin(schoolYears, eq(schoolYears.id, studentEnrollments.schoolYearId))
        .innerJoin(subjects, eq(subjects.id, studentGrades.subjectId))
        .groupBy(schoolYears.id, subjects.id)
        .orderBy(desc(schoolYears.year), asc(subjects.code));

      const data = rows.map((r) => ({
        "School Year": r.year,
        Subject: r.subject,
        Average: r.average,
        Entries: r.entries,
      }));

      return {
        ...base,
        columns: ["School Year", "Subject", "Average", "Entries"],
        rows: data,
        summary: [{ label: "Grade entries", value: data.reduce((s, r) => s + Number(r.Entries ?? 0), 0) }],
      };
    }
  }
}

async function gradeLevelName(id: string): Promise<string> {
  const rows = await db
    .select({ name: gradeLevels.name })
    .from(gradeLevels)
    .where(eq(gradeLevels.id, id))
    .limit(1);
  return rows[0]?.name ?? id;
}

async function sectionName(id: string): Promise<string> {
  const rows = await db
    .select({ name: sections.name })
    .from(sections)
    .where(eq(sections.id, id))
    .limit(1);
  return rows[0]?.name ?? id;
}

async function currentYear(): Promise<string | null> {
  const rows = await db
    .select({ year: schoolYears.year })
    .from(schoolYears)
    .where(eq(schoolYears.isCurrent, true))
    .limit(1);
  return rows[0]?.year ?? null;
}

function summarize(data: ReportRow[]): { label: string; value: number }[] {
  const total = data.length;
  const sex = data.reduce<Record<string, number>>((a, r) => {
    a[String(r.Sex)] = (a[String(r.Sex)] ?? 0) + 1;
    return a;
  }, {});
  const verified = data.filter((r) => String(r["Record Status"]) === "Verified").length;
  return [
    { label: "Total students", value: total },
    ...Object.entries(sex).map(([label, value]) => ({ label, value })),
    { label: "Verified", value: verified },
  ];
}

/** School header used by exports. */
export const SCHOOL_HEADER = {
  name: "Sta. Magdalena National High School",
  address: "Sta. Magdalena, Sorsogon",
  region: "Region V — Bicol",
};
