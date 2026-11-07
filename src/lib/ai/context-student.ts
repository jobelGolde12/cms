import {
  ASSESSMENT_DOMAIN_LABELS,
  INTERVENTION_STATUS_LABELS,
  type AssessmentDomain,
  type InterventionStatus,
} from "@/lib/constants";

/**
 * Pure context/fact builders for the AI features.
 *
 * CRITICAL DESIGN RULE: these functions receive ALREADY-FETCHED, ALREADY-
 * AUTHORIZED rows — they never touch the database and are never exported to
 * the client. Authorization (role + row-level scope) happens entirely in the
 * server actions that fetch the rows, so a context builder physically cannot
 * leak data the requesting role cannot already read.
 *
 * Minimization rules (plan §12):
 *  - the student appears as "Student <studentNumber>" in the payload (the real
 *    name stays in the UI; the model doesn't need it);
 *  - birth date is sent as an age in years, not an exact date;
 *  - no addresses, no guardian contact details, no account contacts;
 *  - counts/tallies instead of row dumps wherever possible;
 *  - long feeds are deterministically truncated with an explicit disclosure.
 */

/** Below-75 threshold on the DepEd 100-point basic-education scale. */
const PASSING_GRADE = 75;

/** Round helper that never yields NaN. */
const num = (v: number | null | undefined): number | null =>
  (typeof v === "number" && Number.isFinite(v) ? Math.round(v * 10) / 10 : null);

const truncate = <T,>(rows: T[], max: number): { items: T[]; truncated: boolean } => ({
  items: rows.slice(0, max),
  truncated: rows.length > max,
});

export type StudentIdentity = {
  studentNumber: string;
  lrn: string | null;
  sex: string;
  /** Age in whole years — never the raw birth date (minimization). */
  ageYears: number | null;
  gradeLevelName?: string;
  sectionName?: string;
  schoolYear?: string;
  recordStatus?: string | null;
};

export function studentIdentityHeader(
  profile: { studentNumber: string; lrn: string | null; birthDate: string | null; sex: string; recordStatus?: string | null },
  enrollment: { gradeLevelName: string; sectionName: string; schoolYear: string } | null,
): StudentIdentity {
  return {
    studentNumber: profile.studentNumber,
    lrn: profile.lrn,
    sex: profile.sex,
    ageYears: ageFrom(profile.birthDate),
    recordStatus: profile.recordStatus ?? null,
    ...(enrollment
      ? { gradeLevelName: enrollment.gradeLevelName, sectionName: enrollment.sectionName, schoolYear: enrollment.schoolYear }
      : {}),
  };
}

export function ageFrom(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < b.getUTCMonth() ||
    (now.getUTCMonth() === b.getUTCMonth() && now.getUTCDate() < b.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age >= 3 && age <= 60 ? age : null;
}

/* ------------------------------ Grades facts ----------------------------- */

export type GradeRow = {
  id: string;
  grade: number;
  remarks: string | null;
  subjectName: string;
  subjectCode: string;
  periodName: string;
  schoolYear: string;
  status: string;
};

export type GradesSummary = {
  totalGrades: number;
  draftCount: number;
  overallAverage: number | null;
  byPeriod: { period: string; schoolYear: string; average: number | null; count: number }[];
  bySubject: { subject: string; code: string; average: number | null; below75: number; count: number }[];
  /** Per subject×period list (bounded) so the model can see period-to-period movement. */
  series: { subject: string; code: string; period: string; schoolYear: string; grade: number }[];
};

export function summarizeGrades(rows: GradeRow[]): GradesSummary {
  const bySubject = new Map<string, { subject: string; code: string; total: number; below75: number; count: number }>();
  const byPeriod = new Map<string, { period: string; schoolYear: string; total: number; count: number }>();
  let draftCount = 0;

  for (const row of rows) {
    if (row.status === "draft") draftCount++;
    const subjectKey = `${row.subjectCode}|${row.subjectName}`;
    const s = bySubject.get(subjectKey) ?? { subject: row.subjectName, code: row.subjectCode, total: 0, below75: 0, count: 0 };
    s.total += row.grade;
    s.count += 1;
    if (row.grade < PASSING_GRADE) s.below75++;
    bySubject.set(subjectKey, s);

    const periodKey = `${row.schoolYear}|${row.periodName}`;
    const p = byPeriod.get(periodKey) ?? { period: row.periodName, schoolYear: row.schoolYear, total: 0, count: 0 };
    p.total += row.grade;
    p.count += 1;
    byPeriod.set(periodKey, p);
  }

  const totalGrades = rows.length;
  const overallAverage = totalGrades > 0 ? rows.reduce((sum, r) => sum + r.grade, 0) / totalGrades : null;

  // Order series by period appearance so trends read chronologically.
  const periodOrder: string[] = [];
  for (const row of rows) {
    const key = `${row.schoolYear}|${row.periodName}`;
    if (!periodOrder.includes(key)) periodOrder.push(key);
  }
  const series = rows
    .slice()
    .sort((a, b) => periodOrder.indexOf(`${a.schoolYear}|${a.periodName}`) - periodOrder.indexOf(`${b.schoolYear}|${b.periodName}`))
    .map((r) => ({ subject: r.subjectName, code: r.subjectCode, period: r.periodName, schoolYear: r.schoolYear, grade: num(r.grade) as number }));

  return {
    totalGrades,
    draftCount,
    overallAverage: num(overallAverage),
    byPeriod: Array.from(byPeriod.values()).map((p) => ({
      period: p.period,
      schoolYear: p.schoolYear,
      average: p.count > 0 ? num(p.total / p.count) : null,
      count: p.count,
    })),
    bySubject: Array.from(bySubject.values()).map((s) => ({
      subject: s.subject,
      code: s.code,
      average: s.count > 0 ? num(s.total / s.count) : null,
      below75: s.below75,
      count: s.count,
    })),
    series,
  };
}

/* ---------------------------- Attendance facts --------------------------- */

export type AttendanceRow = { id: string; date: string; status: string; schoolYear: string };

export type AttendanceSummary = {
  countedDays: number;
  present: number;
  absentExcused: number;
  absentUnexcused: number;
  late: number;
  truncationNote: string | null;
};

export function summarizeAttendance(rows: AttendanceRow[], queryLimitUsed: number): AttendanceSummary {
  const counts = { present: 0, absent_excused: 0, absent_unexcused: 0, late: 0 };
  for (const row of rows) {
    if (row.status in counts) counts[row.status as keyof typeof counts]++;
  }
  return {
    countedDays: rows.length,
    present: counts.present,
    absentExcused: counts.absent_excused,
    absentUnexcused: counts.absent_unexcused,
    late: counts.late,
    truncationNote: rows.length >= queryLimitUsed ? `Attendance shown covers the most recent ${queryLimitUsed} recorded days only, so counts reflect that window.` : null,
  };
}

/* ----------------------------- Behavior facts ---------------------------- */

export type BehaviorRow = {
  id: string;
  date: string;
  description: string;
  severity: string | null;
  status: string;
  categoryName: string;
  categoryKind: string;
};

export type BehaviorSummary = {
  total: number;
  byCategory: { category: string; kind: string; count: number }[];
  byStatus: Record<string, number>;
  highSeverity: number;
  recent: { date: string; category: string; kind: string; severity: string | null; status: string; description: string }[];
  truncationNote: string | null;
};

export function summarizeBehavior(rows: BehaviorRow[]): BehaviorSummary {
  const byCategory = new Map<string, { category: string; kind: string; count: number }>();
  const byStatus: Record<string, number> = {};
  let highSeverity = 0;
  for (const row of rows) {
    const key = row.categoryName;
    const c = byCategory.get(key) ?? { category: key, kind: row.categoryKind, count: 0 };
    c.count++;
    byCategory.set(key, c);
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    if (row.severity === "high") highSeverity++;
  }
  const cut = truncate(rows, 20);
  return {
    total: rows.length,
    byCategory: Array.from(byCategory.values()),
    byStatus,
    highSeverity,
    recent: cut.items.slice(0, 20).map((r) => ({
      date: r.date,
      category: r.categoryName,
      kind: r.categoryKind,
      severity: r.severity,
      status: r.status,
      description: r.description,
    })),
    truncationNote: cut.truncated ? `Only the most recent 20 behavior entries are included of ${rows.length} total.` : null,
  };
}

/* --------------------------- Assessment facts ---------------------------- */

export type AssessmentRow = {
  id: string;
  domain: string;
  assessmentType: string | null;
  skillArea: string | null;
  date: string;
  level: string | null;
  score: number | null;
};

export function summarizeAssessments(rows: AssessmentRow[]) {
  const byDomainLevel = new Map<string, number>();
  for (const row of rows) {
    const key = `${ASSESSMENT_DOMAIN_LABELS[row.domain as AssessmentDomain] ?? row.domain}|${row.level ?? "unassessed"}`;
    byDomainLevel.set(key, (byDomainLevel.get(key) ?? 0) + 1);
  }
  const cut = truncate(rows, 15);
  return {
    total: rows.length,
    byDomainLevel: Array.from(byDomainLevel.entries()).map(([key, count]) => {
      const [domain, level] = key.split("|");
      return { domain, level, count };
    }),
    recent: cut.items.slice(0, 15).map((r) => ({
      date: r.date,
      domain: ASSESSMENT_DOMAIN_LABELS[r.domain as AssessmentDomain] ?? r.domain,
      assessmentType: r.assessmentType,
      skillArea: r.skillArea,
      level: r.level,
      score: num(r.score),
    })),
    truncationNote: cut.truncated ? `Only the most recent 15 assessments are included of ${rows.length} total.` : null,
  };
}

/* -------------------------- Intervention facts --------------------------- */

export type InterventionRow = {
  id: string;
  interventionType: string;
  description: string;
  status: string;
  outcome: string | null;
  startDate: string | null;
  targetDate: string | null;
};

export function summarizeInterventions(rows: InterventionRow[]) {
  const byStatus: Record<string, number> = {};
  for (const row of rows) {
    const label = INTERVENTION_STATUS_LABELS[row.status as InterventionStatus] ?? row.status;
    byStatus[label] = (byStatus[label] ?? 0) + 1;
  }
  const cut = truncate(rows, 15);
  return {
    total: rows.length,
    byStatus,
    items: cut.items.slice(0, 15).map((r) => ({
      type: r.interventionType,
      status: INTERVENTION_STATUS_LABELS[r.status as InterventionStatus] ?? r.status,
      description: r.description,
      outcome: r.outcome,
      startDate: r.startDate,
      targetDate: r.targetDate,
    })),
    truncationNote: cut.truncated ? `Only the most recent 15 interventions are included of ${rows.length} total.` : null,
  };
}

/* ------------------------------ Fact lines ------------------------------- */

/**
 * Human-readable fact lines computed from the authoritative summaries. These
 * are rendered verbatim in the UI as the "Database facts" block and passed to
 * the model as authoritative context — the model never originates numbers.
 */
export function buildFactLines(input: {
  grades: GradesSummary | null;
  attendance: AttendanceSummary | null;
  behavior: BehaviorSummary | null;
  assessments: ReturnType<typeof summarizeAssessments> | null;
  interventions: ReturnType<typeof summarizeInterventions> | null;
  health: { measurements: number; latest: { bmi: number | null; nutritionalStatus: string | null; heightCm: number | null; weightKg: number | null } | null } | null;
}): string[] {
  const facts: string[] = [];
  const { grades, attendance, behavior, assessments, interventions, health } = input;

  if (grades) {
    facts.push(
      grades.totalGrades === 0
        ? "Academic: no grade records on file."
        : `Academic: ${grades.totalGrades} grade entries (average ${grades.overallAverage ?? "—"} on the 100-point scale${grades.draftCount ? `; ${grades.draftCount} still in draft` : ""}).`,
    );
    for (const p of grades.byPeriod) {
      facts.push(`Academic: ${p.schoolYear} ${p.period} average ${p.average ?? "—"} across ${p.count} subjects.`);
    }
    // Subject-level evidence line only where it is decision-relevant (below
    // the DepEd 75 passing mark). Full per-subject detail travels in the
    // structured `grades` payload for the model and in the UI facts block.
    for (const s of grades.bySubject) {
      if (s.below75 > 0 && s.count > 0) {
        facts.push(
          `Academic: ${s.subject} average ${s.average ?? "—"} across ${s.count} entries; ${s.below75} below the 75 passing mark.`,
        );
      }
    }
  }
  if (attendance) {
    facts.push(
      attendance.countedDays === 0
        ? "Attendance: no attendance records in the covered window."
        : `Attendance (most recent ${attendance.countedDays} recorded days): ${attendance.present} present, ${attendance.late} late, ${attendance.absentExcused} excused absences, ${attendance.absentUnexcused} unexcused absences.`,
    );
  }
  if (behavior) {
    facts.push(
      behavior.total === 0
        ? "Behavior: no behavior records on file."
        : `Behavior: ${behavior.total} record(s); ${behavior.highSeverity} flagged high-severity; by category ${behavior.byCategory.map((c) => `${c.category} ×${c.count}`).join(", ")}.`,
    );
  }
  if (assessments) {
    facts.push(
      assessments.total === 0
        ? "Literacy/numeracy: no assessment records on file."
        : `Literacy/numeracy: ${assessments.total} assessment(s); levels: ${assessments.byDomainLevel.map((d) => `${d.domain} → ${d.level} ×${d.count}`).join(", ")}.`,
    );
  }
  if (interventions) {
    facts.push(
      interventions.total === 0
        ? "Interventions: none on file."
        : `Interventions: ${interventions.total} on file; by status ${Object.entries(interventions.byStatus).map(([s, c]) => `${s} ×${c}`).join(", ")}.`,
    );
  }
  if (health && health.latest) {
    facts.push(
      `Health: latest measurement ${health.latest.bmi !== null ? `BMI ${health.latest.bmi}` : "BMI —"}${health.latest.nutritionalStatus ? `, nutritional status "${health.latest.nutritionalStatus}"` : ""} across ${health.measurements} measurement(s).`,
    );
  }
  return facts;
}

/** Renders a context object for the <data> block. */
export function renderContext(payload: unknown): string {
  return JSON.stringify(payload, null, 0);
};
