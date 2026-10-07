import { and, count, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  behaviorCategories,
  behaviorRecords,
  duplicateCandidates,
  gradeLevels,
  interventions,
  studentEnrollments,
  students,
  users,
} from "@/db/schema";
import {
  ENROLLMENT_STATUS_LABELS,
  RECORD_STATUS_LABELS,
  type EnrollmentStatus,
  type RecordStatus,
} from "./constants";
import type { SessionUser } from "./auth";
import { userSectionScope } from "./scope";
import { dashboardStats } from "./queries";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type Kpi = {
  key: string;
  label: string;
  value: number;
  description: string;
  icon: string;
  tone: "navy" | "green" | "amber" | "blue" | "red" | "slate";
  /** 0–100 share of the relevant total, when meaningful. */
  progress: number | null;
};

export type GradeLevelRow = { name: string; value: number };
export type DistributionRow = { label: string; value: number };

export type VerificationCounts = {
  verified: number;
  pending: number;
  needsCorrection: number;
  duplicateFlags: number;
};

export type ActivityItem = {
  id: string;
  action: string;
  entityType: string;
  actor: string | null;
  createdAt: Date;
};

export type SectionCoverageRow = {
  gradeLevel: string;
  registered: number;
  withGrades: number;
  activeEnrollments: number;
};

export type SystemStatus = {
  databaseOnline: boolean;
  activeRecords: number;
  totalRecords: number;
  openInterventions: number;
};

export type DashboardData = {
  kpis: Kpi[];
  byGradeLevel: GradeLevelRow[];
  enrollment: DistributionRow[];
  recordStatus: DistributionRow[];
  verification: VerificationCounts;
  duplicateFlags: number;
  activity: ActivityItem[];
  sectionCoverage: SectionCoverageRow[];
  openConcerns: { label: string; value: number }[];
  system: SystemStatus;
};

/* -------------------------------------------------------------------------- */
/*  Label helpers                                                             */
/* -------------------------------------------------------------------------- */

const ACTIVITY_LABELS: Record<string, string> = {
  LOGIN: "Signed in",
  LOGOUT: "Signed out",
  CREATE_STUDENT: "Student record created",
  UPDATE_STUDENT: "Student record updated",
  ARCHIVE_STUDENT: "Student record archived",
  SUBMIT_VERIFICATION: "Record submitted for verification",
  APPROVE_VERIFICATION: "Record approved",
  REJECT_VERIFICATION: "Record rejected",
  RETURN_VERIFICATION: "Correction requested",
  REOPEN_VERIFICATION: "Verification reopened",
  MARK_DUPLICATE: "Duplicate record flagged",
  CONFIRM_DUPLICATE: "Duplicate confirmed",
  DUPLICATE_NOT_DUPLICATE: "Duplicate candidate cleared",
  DUPLICATE_DISMISSED: "Duplicate candidate dismissed",
  SAVE_ENROLLMENT: "Enrollment saved",
  SAVE_GRADE: "Grade recorded",
  SAVE_ATTENDANCE: "Attendance recorded",
  SAVE_BEHAVIOR: "Behavior record saved",
  SAVE_ASSESSMENT: "Assessment recorded",
  CREATE_INTERVENTION: "Intervention planned",
  UPDATE_INTERVENTION: "Intervention updated",
  CREATE_FOLLOWUP: "Follow-up recorded",
  VERIFY_QR: "QR verification performed",
  CREATE_USER: "User account created",
  UPDATE_USER: "User account updated",
  DISABLE_USER: "User account disabled",
  CHANGE_PASSWORD: "Password changed",
  UPDATE_PROFILE: "Profile updated",
  UPDATE_SETTING: "System setting updated",
};

const ACTIVITY_ICONS: Record<string, string> = {
  CREATE_STUDENT: "userPlus",
  UPDATE_STUDENT: "children",
  ARCHIVE_STUDENT: "archive",
  SUBMIT_VERIFICATION: "validation",
  APPROVE_VERIFICATION: "check",
  REJECT_VERIFICATION: "alert",
  RETURN_VERIFICATION: "alert",
  REOPEN_VERIFICATION: "clock",
  MARK_DUPLICATE: "duplicates",
  CONFIRM_DUPLICATE: "duplicates",
  DUPLICATE_NOT_DUPLICATE: "check",
  DUPLICATE_DISMISSED: "check",
  SAVE_ENROLLMENT: "bookOpen",
  SAVE_GRADE: "reports",
  SAVE_ATTENDANCE: "clock",
  SAVE_BEHAVIOR: "monitoring",
  SAVE_ASSESSMENT: "monitoring",
  CREATE_INTERVENTION: "plus",
  UPDATE_INTERVENTION: "reports",
  CREATE_FOLLOWUP: "clock",
  VERIFY_QR: "qr",
  CREATE_USER: "users",
  UPDATE_USER: "usersCog",
  DISABLE_USER: "usersCog",
  CHANGE_PASSWORD: "settings",
  UPDATE_PROFILE: "users",
  UPDATE_SETTING: "settings",
  LOGIN: "dashboard",
  LOGOUT: "dashboard",
};

const ACTIVITY_TONES: Record<string, "green" | "red" | "amber" | "blue" | "gray"> = {
  CREATE_STUDENT: "green",
  APPROVE_VERIFICATION: "green",
  DUPLICATE_NOT_DUPLICATE: "green",
  DUPLICATE_DISMISSED: "green",
  VERIFY_QR: "green",
  REJECT_VERIFICATION: "red",
  RETURN_VERIFICATION: "red",
  MARK_DUPLICATE: "red",
  CONFIRM_DUPLICATE: "red",
  ARCHIVE_STUDENT: "red",
  DISABLE_USER: "red",
  SUBMIT_VERIFICATION: "amber",
  REOPEN_VERIFICATION: "amber",
  CREATE_INTERVENTION: "amber",
  UPDATE_INTERVENTION: "amber",
  CREATE_FOLLOWUP: "amber",
  SAVE_BEHAVIOR: "amber",
};

/** Human description of an audit row, e.g. "Student record created — Juan D.". */
export function activityTitle(item: ActivityItem): string {
  const action = ACTIVITY_LABELS[item.action] ?? item.action;
  const who = item.actor ?? "System";
  return `${action} — ${who}`;
}

export function activityIcon(item: ActivityItem): string {
  return ACTIVITY_ICONS[item.action] ?? "activity";
}

export function activityTone(item: ActivityItem): "green" | "red" | "amber" | "blue" | "gray" {
  return ACTIVITY_TONES[item.action] ?? "gray";
}

/** "just now", "5m ago", "3h ago", "2d ago", else "Sep 12". */
export function formatRelativeTime(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - value.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return value.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/* -------------------------------------------------------------------------- */
/*  Aggregate loader — every number below comes from the database             */
/* -------------------------------------------------------------------------- */

export async function dashboardData(user: SessionUser): Promise<DashboardData> {
  const scope = (await userSectionScope(user)) ?? sql`1 = 1`;
  // Scope + active/non-duplicate basis, used by every student-derived chart.
  const scopedActive = and(
    scope,
    sql`${students.status} = 'active' AND ${students.recordStatus} != 'marked_duplicate'`,
  ) as SQL;

  const [
    stats,
    byGradeRows,
    enrollmentRows,
    recordRows,
    duplicateRows,
    needsCorrectionRow,
    activityRows,
    coverageRows,
    concernRows,
    activeRow,
    openInterventionsRow,
  ] = await Promise.all([
    dashboardStats(user),

    // Students per grade level (active enrollments).
    db
      .select({ name: gradeLevels.name, value: count() })
      .from(students)
      .innerJoin(
        studentEnrollments,
        and(
          eq(studentEnrollments.studentId, students.id),
          eq(studentEnrollments.status, "active"),
        ),
      )
      .innerJoin(gradeLevels, eq(gradeLevels.id, studentEnrollments.gradeLevelId))
      .where(scopedActive)
      .groupBy(gradeLevels.id)
      .orderBy(gradeLevels.orderIndex),

    // Enrollment status distribution.
    db
      .select({ key: studentEnrollments.status, value: count() })
      .from(studentEnrollments)
      .innerJoin(students, eq(students.id, studentEnrollments.studentId))
      .where(scopedActive)
      .groupBy(studentEnrollments.status)
      .orderBy(desc(count())),

    // Record status distribution (active, non-duplicate records).
    db
      .select({ key: students.recordStatus, value: count() })
      .from(students)
      .where(scopedActive)
      .groupBy(students.recordStatus)
      .orderBy(desc(count())),

    // Open duplicate flags.
    db
      .select({ n: count() })
      .from(duplicateCandidates)
      .where(eq(duplicateCandidates.status, "pending"))
      .then((rows) => rows[0]?.n ?? 0),

    // Needs-correction count for the verification panel.
    db
      .select({ n: count() })
      .from(students)
      .where(and(scope, eq(students.recordStatus, "needs_correction")))
      .then((rows) => rows[0]?.n ?? 0),

    // Recent audit trail (scope: all — it is an operational log, not student data).
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        actorFirst: users.firstName,
        actorLast: users.lastName,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(8),

    // Per-grade-level coverage: students with grades recorded this year.
    db
      .select({
        gradeLevel: gradeLevels.name,
        registered: count(),
        withGrades:
          sql<number>`sum(case when exists (
            select 1 from student_grades sg
            join student_enrollments se on se.id = sg.enrollment_id
            where se.student_id = ${students.id}
          ) then 1 else 0 end)`,
        activeEnrollments:
          sql<number>`sum(case when exists (
            select 1 from student_enrollments se2
            where se2.student_id = ${students.id} and se2.status = 'active'
          ) then 1 else 0 end)`,
      })
      .from(students)
      .innerJoin(
        studentEnrollments,
        and(
          eq(studentEnrollments.studentId, students.id),
          eq(studentEnrollments.status, "active"),
        ),
      )
      .innerJoin(gradeLevels, eq(gradeLevels.id, studentEnrollments.gradeLevelId))
      .where(scopedActive)
      .groupBy(gradeLevels.id)
      .orderBy(gradeLevels.orderIndex),

    // Open behavior concerns by category.
    db
      .select({ label: behaviorCategories.name, value: count() })
      .from(behaviorRecords)
      .innerJoin(behaviorCategories, eq(behaviorCategories.id, behaviorRecords.categoryId))
      .innerJoin(students, eq(students.id, behaviorRecords.studentId))
      .where(and(scope, inArray(behaviorRecords.status, ["open", "monitored"])))
      .groupBy(behaviorCategories.id)
      .orderBy(desc(count())),

    // Active (non-archived) records for system status.
    db
      .select({ n: count() })
      .from(students)
      .where(and(scope, eq(students.status, "active")))
      .then((rows) => rows[0]?.n ?? 0),

    // Open interventions for system status.
    db
      .select({ n: count() })
      .from(interventions)
      .innerJoin(students, eq(students.id, interventions.studentId))
      .where(and(scope, inArray(interventions.status, ["planned", "active"])))
      .then((rows) => rows[0]?.n ?? 0),
  ]);

  const total = stats.total || 1;

  const kpis: Kpi[] = [
    {
      key: "total",
      label: "Total Students",
      value: stats.total,
      description: "Active student records",
      icon: "users",
      tone: "navy",
      progress: Math.round((stats.verified / total) * 100),
    },
    {
      key: "verified",
      label: "Verified Records",
      value: stats.verified,
      description: "Passed verification",
      icon: "validation",
      tone: "green",
      progress: Math.round((stats.verified / total) * 100),
    },
    {
      key: "pending",
      label: "Pending Verification",
      value: stats.pendingVerification,
      description: "Awaiting review",
      icon: "clock",
      tone: "amber",
      progress: Math.round((stats.pendingVerification / total) * 100),
    },
    {
      key: "enrolled",
      label: "Enrolled",
      value: stats.enrolled,
      description: "Active enrollment this year",
      icon: "bookOpen",
      tone: "blue",
      progress: Math.round((stats.enrolled / total) * 100),
    },
    {
      key: "behavior",
      label: "Behavior Concerns",
      value: stats.openBehaviorConcerns,
      description: "Open concern records",
      icon: "monitoring",
      tone: "red",
      progress: null,
    },
    {
      key: "interventions",
      label: "Open Interventions",
      value: stats.openInterventions,
      description: "Active case management",
      icon: "activity",
      tone: "amber",
      progress: null,
    },
  ];

  const verification: VerificationCounts = {
    verified: stats.verified,
    pending: stats.pendingVerification,
    needsCorrection: needsCorrectionRow,
    duplicateFlags: duplicateRows,
  };

  const byGradeLevel = byGradeRows.map((r) => ({ name: r.name, value: r.value }));

  // Full label set in canonical order so empty categories still render.
  const enrollmentTotals = new Map(
    enrollmentRows.map((r) => [r.key as EnrollmentStatus, r.value]),
  );
  const enrollmentOrder: EnrollmentStatus[] = ["active", "completed", "transferred", "withdrawn"];
  const enrollment: DistributionRow[] = enrollmentOrder.map((key) => ({
    label: ENROLLMENT_STATUS_LABELS[key],
    value: enrollmentTotals.get(key) ?? 0,
  }));

  const recordTotals = new Map(recordRows.map((r) => [r.key as RecordStatus, r.value]));
  const recordOrder: RecordStatus[] = [
    "verified",
    "pending_validation",
    "needs_correction",
    "draft",
  ];
  const recordStatus: DistributionRow[] = recordOrder.map((key) => ({
    label: RECORD_STATUS_LABELS[key],
    value: recordTotals.get(key) ?? 0,
  }));

  return {
    kpis,
    byGradeLevel,
    enrollment,
    recordStatus,
    verification,
    duplicateFlags: duplicateRows,
    activity: activityRows.map((r) => ({
      id: r.id,
      action: r.action,
      entityType: r.entityType,
      actor:
        r.actorFirst || r.actorLast
          ? [r.actorFirst, r.actorLast].filter(Boolean).join(" ")
          : null,
      createdAt: r.createdAt,
    })),
    sectionCoverage: coverageRows.map((r) => ({
      gradeLevel: r.gradeLevel,
      registered: r.registered,
      withGrades: Number(r.withGrades ?? 0),
      activeEnrollments: Number(r.activeEnrollments ?? 0),
    })),
    openConcerns: concernRows,
    system: {
      databaseOnline: true, // the page could not render otherwise
      activeRecords: activeRow,
      totalRecords: stats.total,
      openInterventions: openInterventionsRow,
    },
  };
}
