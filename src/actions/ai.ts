"use server";

import { eq } from "drizzle-orm";
import { getAttendanceForStudent, getClinicalForStudent, getCurrentEnrollment, getGuidanceIncident, getHealthForStudent, getAssessmentsForStudent, getBehaviorForStudent, getInterventionsForStudent, getStudentGrades, getStudentProfile } from "@/lib/queries";
import { db } from "@/db";
import { duplicateCandidates, students } from "@/db/schema";
import { getAuthorizedUser, type SessionUser } from "@/lib/auth";
import { hasUserPermission, type Permission } from "@/lib/permissions";
import { canAccessStudent, canViewConfidentialBehavior, canViewStudentDevelopment } from "@/lib/scope";
import { logAudit } from "@/lib/audit";
import { dashboardData } from "@/lib/dashboard-data";
import { ROLE_LABELS } from "@/lib/constants";
import {
  buildFactLines,
  renderContext,
  studentIdentityHeader,
  summarizeAssessments,
  summarizeAttendance,
  summarizeBehavior,
  summarizeGrades,
  summarizeInterventions,
  type AttendanceRow,
  type AssessmentRow,
  type BehaviorRow,
  type GradeRow,
  type InterventionRow,
} from "@/lib/ai/context-student";
import { buildSystemPrompt, frameData, type FeaturePromptKey } from "@/lib/ai/prompts";
import { aiRateLimited, generateStructuredJson } from "@/lib/ai/provider";
import {
  dashboardReportSummarySchema,
  duplicateEvidenceSchema,
  guidanceCaseSummarySchema,
  guidanceDraftNoteSchema,
  interventionSuggestionsSchema,
  performanceAnalysisSchema,
  studentSummarySchema,
  type DashboardReportSummaryResult,
  type DuplicateEvidenceResult,
  type GuidanceCaseSummaryResult,
  type GuidanceDraftNoteResult,
  type InterventionSuggestionsResult,
  type PerformanceAnalysisResult,
  type StudentSummaryResult,
} from "@/lib/ai/schemas";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type Feature =
  | "studentSummary"
  | "performance"
  | "guidanceCase"
  | "guidanceNote"
  | "suggestions"
  | "duplicateEvidence"
  | "dashboardReport";

export type AiPayload =
  | StudentSummaryResult
  | PerformanceAnalysisResult
  | GuidanceCaseSummaryResult
  | GuidanceDraftNoteResult
  | InterventionSuggestionsResult
  | DuplicateEvidenceResult
  | DashboardReportSummaryResult;

/**
 * Result state consumed by the shared client panel. `facts` is computed
 * server-side from authorized rows and rendered verbatim as the "Database
 * facts" block; `result` is the Zod-validated AI output. Nothing here is ever
 * persisted to a domain table.
 */
export type AiActionState =
  | { ok: true; feature: Feature; facts: string[]; result: AiPayload; scopeNote: string; generatedAt: string }
  | { ok: false; error: string; retryable: boolean };

const fail = (error: string, retryable = false): AiActionState => ({ ok: false, error, retryable });

/* ------------------------------ Shared plumbing -------------------------- */

function rateLimited(user: SessionUser): AiActionState | null {
  if (aiRateLimited(user.id)) {
    return fail("You have reached the temporary limit for AI requests. Please try again in a few minutes.");
  }
  return null;
}

async function authorizeStudentFeature(
  permission: Permission,
  studentId: string,
): Promise<{ user: SessionUser } | { error: AiActionState }> {
  const user = await getAuthorizedUser(permission);
  if (!user) {
    return { error: fail("You do not have permission to use this AI feature.") };
  }
  if (!studentId) return { error: fail("Invalid request.") };
  if (!(await canAccessStudent(user, { studentId }))) {
    return { error: fail("You do not have access to this student's records.") };
  }
  return { user };
}

type LatestHealth = { bmi: number | null; nutritionalStatus: string | null; heightCm: number | null; weightKg: number | null };

type StudentDataset = {
  profile: NonNullable<Awaited<ReturnType<typeof getStudentProfile>>>;
  enrollment: Awaited<ReturnType<typeof getCurrentEnrollment>>;
  grades: GradeRow[];
  attendance: AttendanceRow[];
  assessments: AssessmentRow[];
  behavior: BehaviorRow[];
  interventions: InterventionRow[];
  healthCount: number;
  latestHealth: LatestHealth | null;
  /** Domains visible to the role (for the informational scopeNote). */
  included: string[];
  excluded: string[];
  hasAnyData: boolean;
};

const ATTENDANCE_WINDOW = 30;

/**
 * Fetch the role-authorized dataset for one student. Only domains the actor's
 * permissions permit are fetched AT ALL — unauthorized data never crosses the
 * server boundary (plan §7). Confidential behavior rows are filtered per role
 * inside the same query gateway the profile page uses.
 */
async function fetchAuthorizedStudentDataset(user: SessionUser, studentId: string): Promise<StudentDataset | null> {
  const profile = await getStudentProfile(studentId);
  if (!profile) return null;
  const enrollment = await getCurrentEnrollment(studentId);

  const can = {
    grades: hasUserPermission(user.roles, "grades.view"),
    attendance: hasUserPermission(user.roles, "attendance.view"),
    assessments: hasUserPermission(user.roles, "assessments.view"),
    behavior: hasUserPermission(user.roles, "behavior.view"),
    interventions: hasUserPermission(user.roles, "interventions.view"),
    health: hasUserPermission(user.roles, "health.view"),
  };

  const [grades, attendance, assessments, behavior, interventions, health] = await Promise.all([
    can.grades ? getStudentGrades(studentId) : Promise.resolve<GradeRow[]>([]),
    can.attendance ? getAttendanceForStudent(studentId, ATTENDANCE_WINDOW) : Promise.resolve<AttendanceRow[]>([]),
    can.assessments ? getAssessmentsForStudent(studentId) : Promise.resolve<AssessmentRow[]>([]),
    can.behavior ? getBehaviorForStudent(studentId, user) : Promise.resolve<BehaviorRow[]>([]),
    can.interventions ? getInterventionsForStudent(studentId) : Promise.resolve<InterventionRow[]>([]),
    can.health ? getHealthForStudent(studentId) : Promise.resolve<never[]>([]),
  ]);
  if (can.health) {
    await getClinicalForStudent(studentId); // clinical context is summarized as a count only
  }

  const included: string[] = [];
  const excluded: string[] = [];
  if (can.grades) included.push("academic performance");
  else excluded.push("academic performance");
  if (can.attendance) included.push("attendance");
  else excluded.push("attendance");
  if (can.behavior) {
    included.push(
      canViewConfidentialBehavior(user)
        ? "behavior incl. confidential guidance records"
        : "behavior (non-confidential only)",
    );
  } else excluded.push("behavior");
  if (can.assessments) included.push("literacy/numeracy assessments");
  else excluded.push("literacy/numeracy assessments");
  if (can.interventions) included.push("interventions");
  else excluded.push("interventions");
  if (can.health) included.push("health/nutrition records");
  else excluded.push("health/nutrition records");

  const latest = health[0];
  const hasAnyData =
    grades.length + attendance.length + assessments.length + behavior.length + interventions.length + health.length > 0;

  return {
    profile,
    enrollment,
    grades,
    attendance,
    assessments,
    behavior,
    interventions,
    healthCount: health.length,
    latestHealth: (latest ?? null) as LatestHealth | null,
    included,
    excluded,
    hasAnyData,
  };
}

function identityOf(data: StudentDataset) {
  return studentIdentityHeader(
    {
      studentNumber: data.profile.studentNumber,
      lrn: data.profile.lrn,
      birthDate: data.profile.birthDate,
      sex: data.profile.sex,
      recordStatus: data.profile.recordStatus,
    },
    data.enrollment
      ? {
          gradeLevelName: data.enrollment.gradeLevelName,
          sectionName: data.enrollment.sectionName,
          schoolYear: data.enrollment.schoolYear,
        }
      : null,
  );
}

async function runAi(args: {
  user: SessionUser;
  feature: FeaturePromptKey;
  context: Record<string, unknown>;
  // The concrete Zod schema for the feature; validated inside generateStructuredJson.
  schema: Parameters<typeof generateStructuredJson>[0] extends never ? never : Parameters<typeof generateStructuredJson>[0]["schema"];
  maxTokens?: number;
}): Promise<{ result: AiPayload } | { error: AiActionState }> {
  const outcome = await generateStructuredJson({
    system: buildSystemPrompt(args.feature, ROLE_LABELS[args.user.role]),
    prompt: frameData(renderContext(args.context)),
    maxTokens: args.maxTokens,
    schema: args.schema,
  });
  if (!outcome.ok) return { error: fail(outcome.error, outcome.retryable) };
  return { result: outcome.data as AiPayload };
}

function summarizeAll(data: StudentDataset) {
  const grades = data.grades.length > 0 ? summarizeGrades(data.grades) : null;
  const attendance = data.attendance.length > 0 ? summarizeAttendance(data.attendance, ATTENDANCE_WINDOW) : null;
  const behavior = data.behavior.length > 0 ? summarizeBehavior(data.behavior) : null;
  const assessments = data.assessments.length > 0 ? summarizeAssessments(data.assessments) : null;
  const interventions = data.interventions.length > 0 ? summarizeInterventions(data.interventions) : null;
  const facts = buildFactLines({
    grades,
    attendance,
    behavior,
    assessments,
    interventions,
    health: data.latestHealth || data.healthCount > 0
      ? { measurements: data.healthCount, latest: data.latestHealth }
      : null,
  });
  return { grades, attendance, behavior, assessments, interventions, facts };
}

async function auditAi(user: SessionUser, action: string, entityId: string, feature: Feature): Promise<void> {
  await logAudit({
    userId: user.id,
    action,
    entityType: "ai_generation",
    entityId,
    newValues: { feature, role: user.role },
  });
}

/* -------------------------------------------------------------------------- */
/*  Phase 1 — Summarize This Student                                          */
/* -------------------------------------------------------------------------- */

export async function summarizeStudent(_prev: AiActionState, formData: FormData): Promise<AiActionState> {
  const studentId = String(formData.get("studentId") ?? "");
  const auth = await authorizeStudentFeature("students.view", studentId);
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const limited = rateLimited(user);
  if (limited) return limited;

  const data = await fetchAuthorizedStudentDataset(user, studentId);
  if (!data) return fail("Student not found.");
  if (!data.hasAnyData) {
    return fail("There is not enough record data yet to summarize this student.");
  }

  const s = summarizeAll(data);
  const outcome = await runAi({
    user,
    feature: "studentSummary",
    schema: studentSummarySchema,
    context: {
      student: identityOf(data),
      facts: s.facts,
      grades: s.grades,
      attendance: s.attendance,
      behavior: s.behavior,
      assessments: s.assessments,
      interventions: s.interventions,
      output_schema: "student summary",
    },
  });
  if ("error" in outcome) return outcome.error;

  await auditAi(user, "AI_SUMMARY_GENERATED", studentId, "studentSummary");
  return {
    ok: true,
    feature: "studentSummary",
    facts: s.facts,
    result: outcome.result,
    scopeNote: `Built from your authorized records: ${data.included.join(", ")}.${data.excluded.length ? ` Excluded (no permission): ${data.excluded.join(", ")}.` : ""}`,
    generatedAt: new Date().toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/*  Phase 2 — Performance Analysis                                            */
/* -------------------------------------------------------------------------- */

export async function analyzeStudentPerformance(_prev: AiActionState, formData: FormData): Promise<AiActionState> {
  const studentId = String(formData.get("studentId") ?? "");
  const auth = await authorizeStudentFeature("grades.view", studentId);
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const limited = rateLimited(user);
  if (limited) return limited;

  const data = await fetchAuthorizedStudentDataset(user, studentId);
  if (!data) return fail("Student not found.");
  if (data.grades.length === 0) return fail("There are no grade records yet for this student.");

  const grades = summarizeGrades(data.grades);
  const facts = buildFactLines({ grades, attendance: null, behavior: null, assessments: null, interventions: null, health: null });

  const outcome = await runAi({
    user,
    feature: "performance",
    schema: performanceAnalysisSchema,
    maxTokens: 1000,
    context: {
      student: identityOf(data),
      facts,
      grades,
      output_schema: "performance analysis",
    },
  });
  if ("error" in outcome) return outcome.error;

  await auditAi(user, "AI_PERFORMANCE_ANALYZED", studentId, "performance");
  return {
    ok: true,
    feature: "performance",
    facts,
    result: outcome.result,
    scopeNote: "Grade analysis uses every grade row your role can view for this student (draft rows marked).",
    generatedAt: new Date().toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/*  Phase 3 — Guidance Office assistance                                      */
/* -------------------------------------------------------------------------- */

/**
 * Case-history summary for a student from the behavior incident rows the
 * requesting user may read (confidential rows included only for the
 * guidance-confidential role set — enforced inside the query gateway).
 */
export async function summarizeGuidanceCase(_prev: AiActionState, formData: FormData): Promise<AiActionState> {
  const studentId = String(formData.get("studentId") ?? "");
  const auth = await authorizeStudentFeature("behavior.view", studentId);
  if ("error" in auth) return auth.error;
  const { user } = auth;
  if (!canViewConfidentialBehavior(user)) {
    return fail("This feature is restricted to the Guidance Office role set.");
  }
  const limited = rateLimited(user);
  if (limited) return limited;

  const data = await fetchAuthorizedStudentDataset(user, studentId);
  if (!data) return fail("Student not found.");
  if (data.behavior.length === 0) return fail("There are no behavior/incident records on file for this student yet.");

  const behavior = summarizeBehavior(data.behavior);
  const facts = buildFactLines({ grades: null, attendance: null, behavior, assessments: null, interventions: null, health: null });

  const outcome = await runAi({
    user,
    feature: "guidanceCase",
    schema: guidanceCaseSummarySchema,
    maxTokens: 900,
    context: {
      student: identityOf(data),
      facts,
      incidents: behavior,
      output_schema: "guidance case summary",
    },
  });
  if ("error" in outcome) return outcome.error;

  await auditAi(user, "AI_GUIDANCE_CASE_SUMMARIZED", studentId, "guidanceCase");
  return {
    ok: true,
    feature: "guidanceCase",
    facts,
    result: outcome.result,
    scopeNote: "Case summary uses the incident records your role can view (confidential entries included where authorized).",
    generatedAt: new Date().toISOString(),
  };
}

/** Draft a follow-up note for one incident — DRAFT ONLY, confirmed by a human. */
export async function draftGuidanceFollowUp(_prev: AiActionState, formData: FormData): Promise<AiActionState> {
  const incidentId = String(formData.get("incidentId") ?? "");
  const user = await getAuthorizedUser("behavior.view");
  if (!user) return fail("You do not have permission to use this AI feature.");
  if (!canViewConfidentialBehavior(user)) {
    return fail("This feature is restricted to the Guidance Office role set.");
  }
  const limited = rateLimited(user);
  if (limited) return limited;
  if (!incidentId) return fail("Invalid request.");

  const incident = await getGuidanceIncident(user, incidentId);
  if (!incident) return fail("Incident not found or outside your access.");
  if (!(await canAccessStudent(user, { studentId: incident.studentId }))) {
    return fail("You do not have access to this student's records.");
  }

  const data = await fetchAuthorizedStudentDataset(user, incident.studentId);
  if (!data) return fail("Student not found.");
  const behavior = summarizeBehavior(data.behavior);
  const facts = buildFactLines({ grades: null, attendance: null, behavior, assessments: null, interventions: null, health: null });

  const outcome = await runAi({
    user,
    feature: "guidanceDraftNote",
    schema: guidanceDraftNoteSchema,
    maxTokens: 900,
    context: {
      student: identityOf(data),
      facts,
      current_incident: {
        date: incident.date,
        category: incident.categoryName,
        severity: incident.severity,
        status: incident.status,
        narrative: incident.incident,
        documented_intervention: incident.intervention,
      },
      prior_incidents: behavior.recent.filter((r) => r.date !== incident.date).slice(0, 10),
      output_schema: "guidance draft follow-up note",
    },
  });
  if ("error" in outcome) return outcome.error;

  await auditAi(user, "AI_GUIDANCE_NOTE_DRAFTED", incidentId, "guidanceNote");
  return {
    ok: true,
    feature: "guidanceNote",
    facts,
    result: outcome.result,
    scopeNote: "Draft is generated only from incident records your role can read. Nothing is saved until you edit and confirm it in the form.",
    generatedAt: new Date().toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/*  Phase 4 — Student development / intervention suggestions                   */
/* -------------------------------------------------------------------------- */

export async function suggestInterventions(_prev: AiActionState, formData: FormData): Promise<AiActionState> {
  const studentId = String(formData.get("studentId") ?? "");
  const auth = await authorizeStudentFeature("interventions.view", studentId);
  if ("error" in auth) return auth.error;
  const { user } = auth;
  if (!canViewStudentDevelopment(user)) {
    return fail("This feature is restricted to the Student Development module's roles.");
  }
  const limited = rateLimited(user);
  if (limited) return limited;

  const data = await fetchAuthorizedStudentDataset(user, studentId);
  if (!data) return fail("Student not found.");
  if (data.assessments.length === 0 && data.behavior.length === 0 && data.attendance.length === 0 && data.grades.length === 0) {
    return fail("There is not enough assessment/behavior/academic data yet to base suggestions on.");
  }

  const s = summarizeAll(data);
  const outcome = await runAi({
    user,
    feature: "suggestions",
    schema: interventionSuggestionsSchema,
    maxTokens: 1000,
    context: {
      student: identityOf(data),
      facts: s.facts,
      grades: s.grades,
      attendance: s.attendance,
      behavior: s.behavior,
      assessments: s.assessments,
      prior_interventions: s.interventions,
      output_schema: "intervention suggestions",
    },
  });
  if ("error" in outcome) return outcome.error;

  await auditAi(user, "AI_SUGGESTIONS_GENERATED", studentId, "suggestions");
  return {
    ok: true,
    feature: "suggestions",
    facts: s.facts,
    result: outcome.result,
    scopeNote: `Suggestions are generated only from records your role can view: ${data.included.join(", ") || "profile only"}. Creating interventions remains a manual action.`,
    generatedAt: new Date().toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/*  Phase 5 — Duplicate review evidence (explanation ONLY; never a decision)   */
/* -------------------------------------------------------------------------- */

export async function explainDuplicateEvidence(_prev: AiActionState, formData: FormData): Promise<AiActionState> {
  const candidateId = String(formData.get("candidateId") ?? "");
  const user = await getAuthorizedUser("duplicates.view");
  if (!user) return fail("You do not have permission to use this AI feature.");
  const limited = rateLimited(user);
  if (limited) return limited;
  if (!candidateId) return fail("Invalid request.");

  const candidateRows = await db.select().from(duplicateCandidates).where(eq(duplicateCandidates.id, candidateId)).limit(1);
  const candidate = candidateRows[0];
  if (!candidate) return fail("Duplicate candidate not found.");

  const recordColumns = {
    id: students.id,
    studentNumber: students.studentNumber,
    lrn: students.lrn,
    firstName: students.firstName,
    lastName: students.lastName,
    birthDate: students.birthDate,
    sex: students.sex,
    recordStatus: students.recordStatus,
  };
  const [a] = await db.select(recordColumns).from(students).where(eq(students.id, candidate.studentId)).limit(1);
  const [b] = await db.select(recordColumns).from(students).where(eq(students.id, candidate.possibleStudentId)).limit(1);
  if (!a || !b) return fail("One of the candidate records no longer exists.");

  let matchReasons: string[] = [];
  try {
    matchReasons = JSON.parse(candidate.matchReason ?? "[]") as string[];
  } catch {
    matchReasons = [];
  }

  // Server-computed agreement facts — the model only narrates these.
  const facts = [
    `Deterministic detector score: ${candidate.matchScore ?? "—"}% (weight-based; ≥2 independent identifiers required).`,
    `Detector matched fields: ${matchReasons.join(", ") || "none recorded"}.`,
    `Record A (${a.studentNumber}): name "${a.firstName} ${a.lastName}", birth date ${a.birthDate ?? "missing"}, sex ${a.sex}, LRN ${a.lrn ?? "not filed"}.`,
    `Record B (${b.studentNumber}): name "${b.firstName} ${b.lastName}", birth date ${b.birthDate ?? "missing"}, sex ${b.sex}, LRN ${b.lrn ?? "not filed"}.`,
    `Name agreement: ${a.lastName === b.lastName && a.firstName === b.firstName ? "exact" : a.lastName === b.lastName ? "same last name, different first name" : "different"}.`,
    `Birth date agreement: ${a.birthDate && b.birthDate ? (a.birthDate === b.birthDate ? "exact" : "differs") : "at least one record is missing a birth date"}.`,
    `LRN agreement: ${a.lrn && b.lrn ? (a.lrn === b.lrn ? "exact" : "differs") : "at most one record has an LRN filed"}.`,
  ];

  const outcome = await runAi({
    user,
    feature: "duplicate",
    schema: duplicateEvidenceSchema,
    maxTokens: 700,
    context: {
      candidate_status: candidate.status,
      detector_score: candidate.matchScore,
      matching_fields: matchReasons,
      facts,
      record_a: {
        studentNumber: a.studentNumber,
        lrn: a.lrn,
        nameInitial: `${a.firstName[0] ?? ""}. ${a.lastName}`,
        birthDate: a.birthDate,
        sex: a.sex,
        recordStatus: a.recordStatus,
      },
      record_b: {
        studentNumber: b.studentNumber,
        lrn: b.lrn,
        nameInitial: `${b.firstName[0] ?? ""}. ${b.lastName}`,
        birthDate: b.birthDate,
        sex: b.sex,
        recordStatus: b.recordStatus,
      },
      output_schema: "duplicate evidence explanation",
    },
  });
  if ("error" in outcome) return outcome.error;

  await auditAi(user, "AI_DUPLICATE_EVIDENCE_GENERATED", candidateId, "duplicateEvidence");
  return {
    ok: true,
    feature: "duplicateEvidence",
    facts,
    result: outcome.result,
    scopeNote:
      "The AI explains the indicator agreement only. It can never merge or mark records — the review decision stays yours through the standard workflow.",
    generatedAt: new Date().toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/*  Phase 6 — Dashboard / report narrative summary                            */
/* -------------------------------------------------------------------------- */

export async function summarizeDashboard(_prev: AiActionState, formData: FormData): Promise<AiActionState> {
  void formData;
  const user = await getAuthorizedUser("dashboard.view");
  if (!user) return fail("You do not have permission to use this AI feature.");
  if (!hasUserPermission(user.roles, "reports.view")) return fail("You do not have permission to use this AI feature.");
  if (user.role === "admin_officer") return fail("This feature is not available in the employee-records workspace.");
  const limited = rateLimited(user);
  if (limited) return limited;

  // dashboardData(user) already applies userSectionScope and the confidential
  // behavior filter — the summary can only reflect the user's scoped data.
  const data = await dashboardData(user);

  const facts: string[] = [
    ...data.kpis.map((k) => `KPI ${k.label}: ${k.value}${k.progress !== null ? ` (${k.progress}% share)` : ""}.`),
    `Students per grade level: ${data.byGradeLevel.map((g) => `${g.name} ×${g.value}`).join(", ") || "none"}.`,
    `Enrollment status distribution: ${data.enrollment.map((d) => `${d.label} (${d.value})`).join(", ") || "none"}.`,
    `Record status distribution: ${data.recordStatus.map((d) => `${d.label} (${d.value})`).join(", ") || "none"}.`,
    `Verification: ${data.verification.verified} verified, ${data.verification.pending} pending, ${data.verification.needsCorrection} need correction, ${data.verification.duplicateFlags} duplicate flags.`,
    `Open concerns by category: ${data.openConcerns.map((d) => `${d.label} (${d.value})`).join(", ") || "none"}.`,
    ...data.sectionCoverage.slice(0, 12).map((s) => `Section coverage ${s.gradeLevel}: registered ${s.registered}, withGrade(s) ${s.withGrades}, activeEnrollment(s) ${s.activeEnrollments}.`),
    `System: ${data.system.activeRecords} active of ${data.system.totalRecords} registered; ${data.system.openInterventions} open interventions; database ${data.system.databaseOnline ? "online" : "offline"}.`,
  ];

  const outcome = await runAi({
    user,
    feature: "dashboard",
    schema: dashboardReportSummarySchema,
    maxTokens: 800,
    context: {
      facts,
      output_schema: "school overview summary",
    },
  });
  if ("error" in outcome) return outcome.error;

  await auditAi(user, "AI_REPORT_SUMMARIZED", user.id, "dashboardReport");
  return {
    ok: true,
    feature: "dashboardReport",
    facts,
    result: outcome.result,
    scopeNote: "Summary reflects exactly the KPI/distribution counts the dashboard already shows you — aggregated from your role's scope.",
    generatedAt: new Date().toISOString(),
  };
}
