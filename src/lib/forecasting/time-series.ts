import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  gradingPeriods,
  schoolYears,
  studentEnrollments,
  studentGrades,
  students,
  subjects,
} from "@/db/schema";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

/** One aggregated observation (one grading period of one scope). */
export type TimeSeriesPoint = {
  /** Stable ordering key: `${schoolYear} P${orderIndex}` */
  key: string;
  /** School year label, e.g. "2025-2026" */
  schoolYear: string;
  /** Quarter ordering within the school year (1..4) */
  quarter: number;
  /** Mean grade for the scope in this quarter */
  value: number;
  /** Number of individual grades aggregated */
  count: number;
  /** Population standard deviation of the aggregated grades */
  stdDev: number;
};

export type ScopeLevel = "school" | "grade_level" | "subject";

/* -------------------------------------------------------------------------- */
/*  Sufficiency thresholds (plan §8)                                          */
/* -------------------------------------------------------------------------- */

export const FORECAST_SUFFICIENCY = {
  MIN_QUARTERS_SCHOOL: 4,
  MIN_QUARTERS_GRADE: 3,
  MIN_QUARTERS_SUBJECT: 3,
  MIN_OBSERVATIONS: 4,
  /** Tolerated fraction of mid-series gaps (plan §9) */
  MAX_MISSING_RATE: 0.4,
} as const;

export function minQuartersFor(scope: ScopeLevel): number {
  switch (scope) {
    case "school":
      return FORECAST_SUFFICIENCY.MIN_QUARTERS_SCHOOL;
    case "grade_level":
      return FORECAST_SUFFICIENCY.MIN_QUARTERS_GRADE;
    case "subject":
      return FORECAST_SUFFICIENCY.MIN_QUARTERS_SUBJECT;
  }
}

/* -------------------------------------------------------------------------- */
/*  Base filter (shared by all scopes)                                        */
/* -------------------------------------------------------------------------- */

/**
 * Only finalized records feed the model (plan §2.1) and school-year scoping
 * is applied server-side. This is the SQL predicate over student_grades that
 * every scope query extends.
 */
function verifiedGradeConditions(currentSchoolYearId: string | null) {
  const conditions = [
    // Only verified student records feed forecasting (plan §5.1).
    sql`exists (
      select 1 from ${students}
      where ${students.id} = ${studentEnrollments.studentId}
        and ${students.recordStatus} = 'verified'
    )`,
  ];
  if (currentSchoolYearId) {
    conditions.push(eq(studentEnrollments.schoolYearId, currentSchoolYearId));
  }
  return and(...conditions);
}

/* -------------------------------------------------------------------------- */
/*  Aggregations                                                              */
/* -------------------------------------------------------------------------- */

type AggRow = {
  schoolYear: string;
  quarter: number;
  periodName: string;
  average: number | null;
  count: number;
  variance: number | null;
};

function toPoint(row: AggRow): TimeSeriesPoint {
  const avg = row.average == null ? NaN : Number(row.average);
  const varr = row.variance == null ? 0 : Number(row.variance);
  return {
    key: `${row.schoolYear}·Q${row.quarter}`,
    schoolYear: row.schoolYear,
    quarter: row.quarter,
    value: avg,
    count: row.count,
    stdDev: Math.sqrt(Math.max(0, varr)),
  };
}

const aggregationSelection = {
  schoolYear: schoolYears.year,
  quarter: gradingPeriods.orderIndex,
  periodName: gradingPeriods.name,
  average: sql<number>`avg(${studentGrades.grade})`,
  count: sql<number>`count(*)`,
  // SQLite variance function may not exist in all builds; compute via
  // the mathematically equivalent expression avg(x²) − avg(x)².
  variance: sql<number>`avg(${studentGrades.grade} * ${studentGrades.grade}) - avg(${studentGrades.grade}) * avg(${studentGrades.grade})`,
};

/** School-wide mean grade per quarter (plan §4.1). */
export async function schoolWideSeries(currentSchoolYearId: string | null): Promise<TimeSeriesPoint[]> {
  const rows = await db
    .select(aggregationSelection)
    .from(studentGrades)
    .innerJoin(
      studentEnrollments,
      eq(studentEnrollments.id, studentGrades.enrollmentId),
    )
    .innerJoin(schoolYears, eq(schoolYears.id, studentEnrollments.schoolYearId))
    .innerJoin(gradingPeriods, eq(gradingPeriods.id, studentGrades.gradingPeriodId))
    .where(verifiedGradeConditions(currentSchoolYearId))
    .groupBy(schoolYears.year, gradingPeriods.orderIndex)
    .orderBy(asc(schoolYears.year), asc(gradingPeriods.orderIndex));
  return rows.map(toPoint);
}

/** Mean grade per quarter for one grade level (plan §4.2). */
export async function gradeLevelSeries(
  gradeLevelId: string,
  currentSchoolYearId: string | null,
): Promise<TimeSeriesPoint[]> {
  const rows = await db
    .select(aggregationSelection)
    .from(studentGrades)
    .innerJoin(
      studentEnrollments,
      eq(studentEnrollments.id, studentGrades.enrollmentId),
    )
    .innerJoin(schoolYears, eq(schoolYears.id, studentEnrollments.schoolYearId))
    .innerJoin(gradingPeriods, eq(gradingPeriods.id, studentGrades.gradingPeriodId))
    .where(
      and(
        eq(studentEnrollments.gradeLevelId, gradeLevelId),
        verifiedGradeConditions(currentSchoolYearId),
      ),
    )
    .groupBy(schoolYears.year, gradingPeriods.orderIndex)
    .orderBy(asc(schoolYears.year), asc(gradingPeriods.orderIndex));
  return rows.map(toPoint);
}

/** Mean grade per quarter for one subject (plan §4.4). */
export async function subjectSeries(
  subjectId: string,
  currentSchoolYearId: string | null,
): Promise<TimeSeriesPoint[]> {
  const rows = await db
    .select(aggregationSelection)
    .from(studentGrades)
    .innerJoin(
      studentEnrollments,
      eq(studentEnrollments.id, studentGrades.enrollmentId),
    )
    .innerJoin(schoolYears, eq(schoolYears.id, studentEnrollments.schoolYearId))
    .innerJoin(gradingPeriods, eq(gradingPeriods.id, studentGrades.gradingPeriodId))
    .innerJoin(subjects, eq(subjects.id, studentGrades.subjectId))
    .where(
      and(
        eq(studentGrades.subjectId, subjectId),
        verifiedGradeConditions(currentSchoolYearId),
      ),
    )
    .groupBy(schoolYears.year, gradingPeriods.orderIndex)
    .orderBy(asc(schoolYears.year), asc(gradingPeriods.orderIndex));
  return rows.map(toPoint);
}

/* -------------------------------------------------------------------------- */
/*  Missing-data handling (plan §9)                                           */
/* -------------------------------------------------------------------------- */

/**
 * Fills mid-series gaps by averaging neighbouring observations (plan §9.2),
 * leaves leading/trailing gaps as nulls. Never fabricates zeros (policy §9.1).
 * Returns null for out-of-policy gaps (missing rate above MAX_MISSING_RATE).
 */
export function fillGaps(
  series: TimeSeriesPoint[],
  maxMissingRate = FORECAST_SUFFICIENCY.MAX_MISSING_RATE,
): (number | null)[] {
  const values = series.map((p) => p.value);
  const n = values.length;
  if (n === 0) return [];

  const missingIdx: number[] = [];
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(values[i])) missingIdx.push(i);
  }
  if (missingIdx.length === 0) return values;
  const leading = missingIdx.every((v) => v === values.length && false) ? 0 : missingIdx.filter((v) => v === 0).length;
  void leading;
  // Leading and trailing gaps become nulls (nothing to interpolate against);
  // interior gaps are averaged from neighbours.
  const firstKnown = values.findIndex((v) => Number.isFinite(v));
  const lastKnown = n - 1 - [...values].reverse().findIndex((v) => Number.isFinite(v));
  if (firstKnown < 0) return values.map(() => null);

  const out: (number | null)[] = new Array(n).fill(null);
  let interiorMissing = 0;
  for (let i = 0; i < n; i++) {
    if (Number.isFinite(values[i])) {
      out[i] = values[i];
    } else if (i > firstKnown && i < lastKnown) {
      interiorMissing += 1;
      // Simple linear interpolation between nearest finite neighbours.
      let prev = i - 1;
      while (prev >= 0 && !Number.isFinite(values[prev])) prev -= 1;
      let next = i + 1;
      while (next < n && !Number.isFinite(values[next])) next += 1;
      if (prev >= 0 && next < n) {
        const ratio = (i - prev) / (next - prev);
        out[i] = values[prev] + (values[next] - values[prev]) * ratio;
      } else {
        out[i] = null;
      }
    }
    // Leading/trailing stay null.
  }
  const interiorSlots = Math.max(0, lastKnown - firstKnown + 1);
  const missingRate = interiorSlots > 0 ? interiorMissing / interiorSlots : 1;
  if (missingRate > maxMissingRate) return new Array(n).fill(null);
  void missingIdx;
  return out;
}

/* -------------------------------------------------------------------------- */
/*  Outlier metadata (plan §10 — flagged, never removed)                      */
/* -------------------------------------------------------------------------- */

/** Flags observations beyond 3σ from the series mean. Informational only. */
export function outlierFlags(series: TimeSeriesPoint[]): number[] {
  const values = series.map((p) => p.value).filter((v) => Number.isFinite(v));
  if (values.length < 2) return [];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance);
  if (std === 0) return [];
  return series
    .map((p, i) => (Number.isFinite(p.value) && Math.abs(p.value - mean) > 3 * std ? i : -1))
    .filter((i) => i >= 0);
}

/* -------------------------------------------------------------------------- */
/*  Intelligence helpers for the dashboard                                    */
/* -------------------------------------------------------------------------- */

/** How many consecutive recent quarters (any year) are usable data points. */
export function completedQuarters(series: TimeSeriesPoint[]): number {
  return series.filter((p) => Number.isFinite(p.value)).length;
}
