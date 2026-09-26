import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  barangays,
  childDuplicateCandidates,
  childEducation,
  childEccd,
  childDisabilities,
  childMonitoring,
  children,
  interventions,
  users,
} from "@/db/schema";
import {
  EDUCATION_STATUS_LABELS,
  MONITORING_TYPE_LABELS,
  RECORD_STATUS_LABELS,
  type EducationStatus,
  type RecordStatus,
} from "./constants";
import type { SessionUser } from "./auth";
import { childScope } from "./scope";
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

export type BarangayRow = { name: string; value: number };
export type DistributionRow = { label: string; value: number };

export type ValidationCounts = {
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

export type MonitoringBarangayRow = {
  barangay: string;
  registered: number;
  enrolled: number;
  outOfSchool: number;
};

export type SystemStatus = {
  databaseOnline: boolean;
  activeRecords: number;
  totalRecords: number;
  openMonitoring: number;
};

export type DashboardData = {
  kpis: Kpi[];
  byBarangay: BarangayRow[];
  education: DistributionRow[];
  recordStatus: DistributionRow[];
  validation: ValidationCounts;
  duplicateFlags: number;
  activity: ActivityItem[];
  monitoringByBarangay: MonitoringBarangayRow[];
  monitoringTypeCounts: { label: string; value: number }[];
  system: SystemStatus;
};

/* -------------------------------------------------------------------------- */
/*  Label helpers                                                             */
/* -------------------------------------------------------------------------- */

const ACTIVITY_LABELS: Record<string, string> = {
  LOGIN: "Signed in",
  LOGOUT: "Signed out",
  CREATE_CHILD: "Child record created",
  UPDATE_CHILD: "Child record updated",
  ARCHIVE_CHILD: "Child record archived",
  SUBMIT_VALIDATION: "Record submitted for validation",
  APPROVE_VALIDATION: "Record approved",
  NEEDS_CORRECTION: "Correction requested",
  REOPEN_VALIDATION: "Validation reopened",
  MARK_DUPLICATE: "Duplicate record flagged",
  CONFIRM_DUPLICATE: "Duplicate confirmed",
  DISMISS_DUPLICATE: "Duplicate candidate dismissed",
  CREATE_MONITORING: "Monitoring record opened",
  UPDATE_MONITORING: "Monitoring record updated",
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
  CREATE_CHILD: "userPlus",
  UPDATE_CHILD: "children",
  ARCHIVE_CHILD: "archive",
  SUBMIT_VALIDATION: "validation",
  APPROVE_VALIDATION: "check",
  NEEDS_CORRECTION: "alert",
  REOPEN_VALIDATION: "clock",
  MARK_DUPLICATE: "duplicates",
  CONFIRM_DUPLICATE: "duplicates",
  DISMISS_DUPLICATE: "check",
  CREATE_MONITORING: "monitoring",
  UPDATE_MONITORING: "monitoring",
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
  CREATE_CHILD: "green",
  APPROVE_VALIDATION: "green",
  DISMISS_DUPLICATE: "green",
  VERIFY_QR: "green",
  NEEDS_CORRECTION: "red",
  MARK_DUPLICATE: "red",
  CONFIRM_DUPLICATE: "red",
  ARCHIVE_CHILD: "red",
  DISABLE_USER: "red",
  SUBMIT_VALIDATION: "amber",
  REOPEN_VALIDATION: "amber",
  CREATE_MONITORING: "amber",
  UPDATE_MONITORING: "amber",
  CREATE_INTERVENTION: "amber",
  UPDATE_INTERVENTION: "amber",
  CREATE_FOLLOWUP: "amber",
};

/** Human description of an audit row, e.g. "Child record created — Child Registry". */
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

const scopedCount = (scope: ReturnType<typeof childScope>, extra?: ReturnType<typeof eq>) =>
  db
    .select({ n: count() })
    .from(children)
    .where(extra ? and(scope ?? sql`1 = 1`, extra) : (scope ?? sql`1 = 1`))
    .then((rows) => rows[0]?.n ?? 0);

export async function dashboardData(user: SessionUser): Promise<DashboardData> {
  const scope = childScope(user);
  const scopeSql = scope ?? sql`1 = 1`;

  const [
    stats,
    byBarangayRows,
    eduRows,
    recordRows,
    duplicateRows,
    needsCorrectionRow,
    activityRows,
    monitoringByBarangayRows,
    monitoringTypeRows,
    activeRow,
    openMonitoringRow,
  ] = await Promise.all([
    dashboardStats(user),

    // Children per barangay (barangay-scope users only see their own rows).
    db
      .select({ name: barangays.name, value: count() })
      .from(children)
      .innerJoin(barangays, eq(barangays.id, children.barangayId))
      .where(scopeSql)
      .groupBy(children.barangayId)
      .orderBy(desc(count())),

    // Current education status distribution.
    db
      .select({ key: childEducation.educationStatus, value: count() })
      .from(childEducation)
      .innerJoin(children, eq(children.id, childEducation.childId))
      .where(and(scopeSql, eq(childEducation.isCurrent, true)))
      .groupBy(childEducation.educationStatus)
      .orderBy(desc(count())),

    // Record status distribution (all non-duplicate records).
    db
      .select({ key: children.recordStatus, value: count() })
      .from(children)
      .where(and(scopeSql, sql`${children.recordStatus} != 'marked_duplicate'`))
      .groupBy(children.recordStatus)
      .orderBy(desc(count())),

    // Open duplicate flags.
    db
      .select({ n: count() })
      .from(childDuplicateCandidates)
      .where(eq(childDuplicateCandidates.status, "pending"))
      .then((rows) => rows[0]?.n ?? 0),

    // Needs-correction count for the validation panel.
    scopedCount(scope, eq(children.recordStatus, "needs_correction")),

    // Recent audit trail (scope: all — it is an operational log, not child data).
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

    // Per-barangay enrollment coverage for the monitoring table.
    db
      .select({
        barangay: barangays.name,
        registered: count(),
        enrolled: sql<number>`sum(case when exists (
          select 1 from ${childEducation}
          where ${childEducation.childId} = ${children.id}
            and ${childEducation.isCurrent} = 1
            and ${childEducation.educationStatus} = 'enrolled'
        ) then 1 else 0 end)`,
        outOfSchool: sql<number>`sum(case when exists (
          select 1 from ${childEducation}
          where ${childEducation.childId} = ${children.id}
            and ${childEducation.isCurrent} = 1
            and ${childEducation.educationStatus} = 'out_of_school'
        ) then 1 else 0 end)`,
      })
      .from(children)
      .innerJoin(barangays, eq(barangays.id, children.barangayId))
      .where(scopeSql)
      .groupBy(children.barangayId)
      .orderBy(desc(count())),

    // Open monitoring casework by type.
    db
      .select({ type: childMonitoring.monitoringType, value: count() })
      .from(childMonitoring)
      .innerJoin(children, eq(children.id, childMonitoring.childId))
      .where(and(scopeSql, inArray(childMonitoring.status, ["open", "in_progress"])))
      .groupBy(childMonitoring.monitoringType)
      .orderBy(desc(count())),

    // Active (non-archived) records for system status.
    db
      .select({ n: count() })
      .from(children)
      .where(and(scopeSql, eq(children.status, "active")))
      .then((rows) => rows[0]?.n ?? 0),

    // Open monitoring cases for system status.
    db
      .select({ n: count() })
      .from(childMonitoring)
      .innerJoin(children, eq(children.id, childMonitoring.childId))
      .where(and(scopeSql, inArray(childMonitoring.status, ["open", "in_progress"])))
      .then((rows) => rows[0]?.n ?? 0),
  ]);

  const total = stats.total || 1;
  const recordStatusTotal = recordRows.reduce((sum, r) => sum + r.value, 0) || 1;

  const kpis: Kpi[] = [
    {
      key: "total",
      label: "Total Children",
      value: stats.total,
      description: "Registered records",
      icon: "users",
      tone: "navy",
      progress: Math.round((stats.verified / total) * 100),
    },
    {
      key: "verified",
      label: "Verified Records",
      value: stats.verified,
      description: "Passed validation",
      icon: "validation",
      tone: "green",
      progress: Math.round((stats.verified / total) * 100),
    },
    {
      key: "pending",
      label: "Pending Validation",
      value: stats.pendingValidation,
      description: "Awaiting review",
      icon: "clock",
      tone: "amber",
      progress: Math.round((stats.pendingValidation / total) * 100),
    },
    {
      key: "enrolled",
      label: "Enrolled",
      value: stats.enrolled,
      description: `${stats.osy} out-of-school`,
      icon: "bookOpen",
      tone: "blue",
      progress: Math.round((stats.enrolled / total) * 100),
    },
    {
      key: "osy",
      label: "Out-of-School",
      value: stats.osy,
      description: "Priority for intervention",
      icon: "alert",
      tone: "red",
      progress: Math.round((stats.osy / total) * 100),
    },
    {
      key: "eccd",
      label: "ECCD Non-Participation",
      value: stats.eccdNonParticipation,
      description: "Not in ECCD programs",
      icon: "monitoring",
      tone: "slate",
      progress: Math.round((stats.eccdNonParticipation / total) * 100),
    },
    {
      key: "disability",
      label: "With Disability",
      value: stats.withDisability,
      description: "Requires targeted support",
      icon: "help",
      tone: "slate",
      progress: Math.round((stats.withDisability / total) * 100),
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

  const duplicateFlags = duplicateRows;

  const validation: ValidationCounts = {
    verified: stats.verified,
    pending: stats.pendingValidation,
    needsCorrection: needsCorrectionRow,
    duplicateFlags,
  };

  const byBarangay = byBarangayRows.map((r) => ({ name: r.name, value: r.value }));

  // Full label set in canonical order so empty categories still render.
  const educationTotals = new Map(eduRows.map((r) => [r.key, r.value]));
  const educationOrder: EducationStatus[] = [
    "enrolled",
    "out_of_school",
    "not_yet_in_school",
    "graduated",
    "unknown",
  ];
  const education: DistributionRow[] = educationOrder.map((key) => ({
    label: EDUCATION_STATUS_LABELS[key],
    value: educationTotals.get(key) ?? 0,
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

  const monitoringByBarangay = monitoringByBarangayRows.map((r) => ({
    barangay: r.barangay,
    registered: r.registered,
    enrolled: Number(r.enrolled ?? 0),
    outOfSchool: Number(r.outOfSchool ?? 0),
  }));

  const monitoringTypeCounts = monitoringTypeRows.map((r) => ({
    label: MONITORING_TYPE_LABELS[r.type as keyof typeof MONITORING_TYPE_LABELS] ?? r.type,
    value: r.value,
  }));

  return {
    kpis,
    byBarangay,
    education,
    recordStatus,
    validation,
    duplicateFlags,
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
    monitoringByBarangay,
    monitoringTypeCounts,
    system: {
      databaseOnline: true, // the page could not render otherwise
      activeRecords: activeRow,
      totalRecords: stats.total,
      openMonitoring: openMonitoringRow,
    },
  };
}
