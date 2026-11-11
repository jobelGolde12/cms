import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  gradeLevels,
  gradeSubmissions,
  gradingPeriods,
  schoolYears,
  sectionSubjectTeachers,
  sections,
  subjects,
  users,
} from "@/db/schema";
import type { GradeSubmissionStatus } from "./constants";

/**
 * Grade-submission compliance monitoring.
 *
 * Expected submission = one teaching load (`section_subject_teachers`) × each
 * grading period of that section's school year. The "current" state of a
 * context is the LATEST ledger row (the ledger is append-only, so a reopen row
 * correctly makes the sheet outstanding again).
 *
 * Deadline semantics (server-authoritative, Asia/Manila):
 *   now < deadline                         → Not Yet Due
 *   submitted at/before deadline            → Submitted On Time
 *   submitted after deadline                → Submitted Late
 *   past deadline, nothing submitted        → Overdue
 *   past period end, nothing submitted      → Missing
 *   no deadline configured, submitted       → Submitted
 *   no deadline configured, not submitted   → Not Yet Due
 */

const MANILA_OFFSET = "+08:00";

/**
 * End of the deadline day in school time (23:59:59.999 Asia/Manila). The
 * Philippines has no DST, so a fixed offset is exact.
 */
export function endOfSchoolDay(isoDate: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const date = new Date(`${isoDate}T23:59:59.999${MANILA_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function computeSubmissionStatus(input: {
  deadline: string | null;
  periodEndDate: string | null;
  submittedAt: Date | null;
  now?: Date;
}): GradeSubmissionStatus {
  const now = input.now ?? new Date();
  const deadlineEnd = input.deadline ? endOfSchoolDay(input.deadline) : null;

  if (input.submittedAt) {
    if (!deadlineEnd) return "submitted";
    return input.submittedAt.getTime() <= deadlineEnd.getTime()
      ? "submitted_on_time"
      : "submitted_late";
  }

  if (!deadlineEnd) return "not_yet_due";
  if (now.getTime() <= deadlineEnd.getTime()) return "not_yet_due";

  const periodEnd = input.periodEndDate ? endOfSchoolDay(input.periodEndDate) : null;
  if (periodEnd && now.getTime() > periodEnd.getTime()) return "missing";
  return "overdue";
}

export type SubmissionFilter = {
  schoolYearId?: string;
  gradeLevelId?: string;
  sectionId?: string;
  subjectId?: string;
  teacherId?: string;
  gradingPeriodId?: string;
  status?: GradeSubmissionStatus | "all";
};

export type SubmissionRow = {
  key: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  sectionId: string;
  sectionName: string;
  gradeLevelId: string;
  gradeLevelName: string;
  schoolYearId: string;
  schoolYear: string;
  gradingPeriodId: string;
  gradingPeriodName: string;
  deadline: string | null;
  submittedAt: Date | null;
  submittedByName: string | null;
  status: GradeSubmissionStatus;
};

export type SubmissionSummary = {
  total: number;
  onTime: number;
  late: number;
  overdue: number;
  missing: number;
  notYetDue: number;
  submitted: number;
  completionRate: number;
};

export type PeriodBreakdown = {
  gradingPeriodId: string;
  name: string;
  deadline: string | null;
  total: number;
  onTime: number;
  late: number;
  outstanding: number;
  completionRate: number;
};

export type SubmissionMonitoring = {
  rows: SubmissionRow[];
  filtered: SubmissionRow[];
  summary: SubmissionSummary;
  periods: PeriodBreakdown[];
  options: {
    schoolYears: { id: string; year: string }[];
    gradeLevels: { id: string; name: string }[];
    sections: { id: string; name: string; gradeLevelName: string; schoolYearId: string }[];
    subjects: { id: string; name: string; code: string }[];
    teachers: { id: string; name: string }[];
    gradingPeriods: {
      id: string;
      name: string;
      schoolYearId: string;
      deadline: string | null;
    }[];
  };
};

function summarize(rows: SubmissionRow[]): SubmissionSummary {
  const count = (status: GradeSubmissionStatus) =>
    rows.filter((r) => r.status === status).length;
  const onTime = count("submitted_on_time");
  const late = count("submitted_late");
  const submittedOnly = count("submitted");
  const overdue = count("overdue");
  const missing = count("missing");
  const notYetDue = count("not_yet_due");
  const total = rows.length;
  const completed = onTime + late + submittedOnly;
  return {
    total,
    onTime,
    late,
    overdue,
    missing,
    notYetDue,
    submitted: submittedOnly,
    completionRate: total > 0 ? Math.round((completed / total) * 1000) / 10 : 0,
  };
}

/**
 * Load every expected submission, resolve the latest ledger state and apply
 * filters. All timestamps are server values; the client cannot influence the
 * late/on-time decision.
 */
export async function gradeSubmissionMonitoring(
  filter: SubmissionFilter = {},
  now: Date = new Date(),
): Promise<SubmissionMonitoring> {
  const [expected, submissions, yearRows, levelRows, sectionRows, subjectRows, periodRows] =
    await Promise.all([
      db
        .select({
          teacherId: users.id,
          teacherFirst: users.firstName,
          teacherLast: users.lastName,
          subjectId: subjects.id,
          subjectName: subjects.name,
          subjectCode: subjects.code,
          sectionId: sections.id,
          sectionName: sections.name,
          gradeLevelId: gradeLevels.id,
          gradeLevelName: gradeLevels.name,
          schoolYearId: schoolYears.id,
          schoolYear: schoolYears.year,
          periodId: gradingPeriods.id,
          periodName: gradingPeriods.name,
          periodOrder: gradingPeriods.orderIndex,
          deadline: gradingPeriods.submissionDeadline,
          periodEndDate: gradingPeriods.endDate,
        })
        .from(sectionSubjectTeachers)
        .innerJoin(sections, eq(sections.id, sectionSubjectTeachers.sectionId))
        .innerJoin(gradeLevels, eq(gradeLevels.id, sections.gradeLevelId))
        .innerJoin(schoolYears, eq(schoolYears.id, sections.schoolYearId))
        .innerJoin(subjects, eq(subjects.id, sectionSubjectTeachers.subjectId))
        .innerJoin(users, eq(users.id, sectionSubjectTeachers.teacherId))
        .innerJoin(gradingPeriods, eq(gradingPeriods.schoolYearId, sections.schoolYearId))
        .where(eq(sections.isActive, true))
        .orderBy(
          desc(schoolYears.year),
          asc(gradeLevels.orderIndex),
          asc(sections.name),
          asc(subjects.code),
          asc(gradingPeriods.orderIndex),
        ),
      db
        .select({
          sectionId: gradeSubmissions.sectionId,
          subjectId: gradeSubmissions.subjectId,
          gradingPeriodId: gradeSubmissions.gradingPeriodId,
          status: gradeSubmissions.status,
          submittedAt: gradeSubmissions.submittedAt,
          createdAt: gradeSubmissions.createdAt,
          submittedBy: gradeSubmissions.submittedBy,
          submitterFirst: users.firstName,
          submitterLast: users.lastName,
        })
        .from(gradeSubmissions)
        .leftJoin(users, eq(users.id, gradeSubmissions.submittedBy))
        .orderBy(desc(gradeSubmissions.submittedAt), desc(gradeSubmissions.createdAt)),
      db
        .select({ id: schoolYears.id, year: schoolYears.year })
        .from(schoolYears)
        .orderBy(desc(schoolYears.year)),
      db
        .select({ id: gradeLevels.id, name: gradeLevels.name })
        .from(gradeLevels)
        .orderBy(asc(gradeLevels.orderIndex)),
      db
        .select({
          id: sections.id,
          name: sections.name,
          gradeLevelName: gradeLevels.name,
          schoolYearId: sections.schoolYearId,
        })
        .from(sections)
        .innerJoin(gradeLevels, eq(gradeLevels.id, sections.gradeLevelId))
        .where(eq(sections.isActive, true))
        .orderBy(asc(gradeLevels.orderIndex), asc(sections.name)),
      db
        .select({ id: subjects.id, name: subjects.name, code: subjects.code })
        .from(subjects)
        .where(eq(subjects.isActive, true))
        .orderBy(asc(subjects.code)),
      db
        .select({
          id: gradingPeriods.id,
          name: gradingPeriods.name,
          schoolYearId: gradingPeriods.schoolYearId,
          deadline: gradingPeriods.submissionDeadline,
          orderIndex: gradingPeriods.orderIndex,
        })
        .from(gradingPeriods)
        .orderBy(desc(gradingPeriods.schoolYearId), asc(gradingPeriods.orderIndex)),
    ]);

  // Latest ledger row per context defines the current state.
  const latest = new Map<
    string,
    { status: string; submittedAt: Date; submitterName: string | null }
  >();
  for (const sub of submissions) {
    const key = `${sub.sectionId}:${sub.subjectId}:${sub.gradingPeriodId}`;
    if (latest.has(key)) continue; // already ordered newest first
    latest.set(key, {
      status: sub.status,
      submittedAt: sub.submittedAt,
      submitterName:
        sub.submitterFirst || sub.submitterLast
          ? `${sub.submitterFirst ?? ""} ${sub.submitterLast ?? ""}`.trim()
          : null,
    });
  }

  const allRows: SubmissionRow[] = expected.map((row) => {
    const key = `${row.sectionId}:${row.subjectId}:${row.periodId}`;
    const entry = latest.get(key);
    const isSubmitted = entry?.status === "submitted";
    const submittedAt = isSubmitted ? entry.submittedAt : null;
    return {
      key,
      teacherId: row.teacherId,
      teacherName: `${row.teacherFirst} ${row.teacherLast}`.trim(),
      subjectId: row.subjectId,
      subjectName: row.subjectName,
      subjectCode: row.subjectCode,
      sectionId: row.sectionId,
      sectionName: row.sectionName,
      gradeLevelId: row.gradeLevelId,
      gradeLevelName: row.gradeLevelName,
      schoolYearId: row.schoolYearId,
      schoolYear: row.schoolYear,
      gradingPeriodId: row.periodId,
      gradingPeriodName: row.periodName,
      deadline: row.deadline,
      submittedAt,
      submittedByName: submittedAt ? entry?.submitterName ?? null : null,
      status: computeSubmissionStatus({
        deadline: row.deadline,
        periodEndDate: row.periodEndDate,
        submittedAt,
        now,
      }),
    };
  });

  // Status is computed, so apply the attribute filters first; the status
  // filter applies only to the table, keeping the summary stable for the same
  // scope when the user narrows by status.
  const rows = allRows.filter(
    (r) =>
      (!filter.schoolYearId || r.schoolYearId === filter.schoolYearId) &&
      (!filter.gradeLevelId || r.gradeLevelId === filter.gradeLevelId) &&
      (!filter.sectionId || r.sectionId === filter.sectionId) &&
      (!filter.subjectId || r.subjectId === filter.subjectId) &&
      (!filter.teacherId || r.teacherId === filter.teacherId) &&
      (!filter.gradingPeriodId || r.gradingPeriodId === filter.gradingPeriodId),
  );

  const filtered =
    filter.status && filter.status !== "all"
      ? rows.filter((r) => r.status === filter.status)
      : rows;

  const periodIdsInScope = new Set(rows.map((r) => r.gradingPeriodId));
  const periods: PeriodBreakdown[] = periodRows
    .filter((p) => periodIdsInScope.has(p.id))
    .map((p) => {
      const periodRowsInScope = rows.filter((r) => r.gradingPeriodId === p.id);
      const summary = summarize(periodRowsInScope);
      return {
        gradingPeriodId: p.id,
        name: p.name,
        deadline: p.deadline,
        total: summary.total,
        onTime: summary.onTime,
        late: summary.late,
        outstanding: summary.overdue + summary.missing,
        completionRate: summary.completionRate,
      };
    });

  const teacherMap = new Map<string, string>();
  for (const row of allRows) teacherMap.set(row.teacherId, row.teacherName);

  return {
    rows,
    filtered,
    summary: summarize(rows),
    periods,
    options: {
      schoolYears: yearRows,
      gradeLevels: levelRows,
      sections: sectionRows,
      subjects: subjectRows,
      teachers: [...teacherMap.entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      gradingPeriods: periodRows.map((p) => ({
        id: p.id,
        name: p.name,
        schoolYearId: p.schoolYearId,
        deadline: p.deadline,
      })),
    },
  };
}

/** Deadline configuration list for the monitoring page (admin-editable). */
export async function listDeadlinePeriods(schoolYearId?: string) {
  const rows = await db
    .select({
      id: gradingPeriods.id,
      name: gradingPeriods.name,
      schoolYearId: gradingPeriods.schoolYearId,
      schoolYear: schoolYears.year,
      deadline: gradingPeriods.submissionDeadline,
      startDate: gradingPeriods.startDate,
      endDate: gradingPeriods.endDate,
    })
    .from(gradingPeriods)
    .innerJoin(schoolYears, eq(schoolYears.id, gradingPeriods.schoolYearId))
    .orderBy(desc(schoolYears.year), asc(gradingPeriods.orderIndex));

  return schoolYearId ? rows.filter((r) => r.schoolYearId === schoolYearId) : rows;
}

/** Used by the monitoring page to avoid loading every period twice. */
export async function periodIdsForYears(yearIds: string[]): Promise<string[]> {
  if (yearIds.length === 0) return [];
  const rows = await db
    .select({ id: gradingPeriods.id })
    .from(gradingPeriods)
    .where(inArray(gradingPeriods.schoolYearId, yearIds));
  return rows.map((r) => r.id);
}
