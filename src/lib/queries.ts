import { and, asc, count, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "@/db";
import {
  auditLogs,
  barangays,
  childAddresses,
  childDisabilities,
  childDuplicateCandidates,
  childEducation,
  childEccd,
  childMonitoring,
  childValidations,
  children,
  interventions,
  interventionFollowups,
  notifications,
  qrVerifications,
  schools,
  users,
} from "@/db/schema";
import {
  type EducationStatus,
  type EccdStatus,
  EDUCATION_STATUSES,
  type MonitoringType,
  type Sex,
  type RecordStatus,
  type ChildStatus,
} from "./constants";
import type { SessionUser } from "./auth";
import { childScope } from "./scope";
import { ageFromBirthDate } from "./utils";

export const PAGE_SIZE = 10;

const pendingRecordStatuses: RecordStatus[] = ["pending_validation"];

const possibleChild = alias(children, "possible_child");
const reviewerUser = alias(users, "reviewer_user");

/* -------------------------------------------------------------------------- */
/*  Reference data                                                            */
/* -------------------------------------------------------------------------- */

export async function listBarangays() {
  return db
    .select({ id: barangays.id, name: barangays.name })
    .from(barangays)
    .where(eq(barangays.isActive, true))
    .orderBy(asc(barangays.name));
}

export async function listSchools() {
  return db
    .select({
      id: schools.id,
      name: schools.name,
      schoolType: schools.schoolType,
      barangayId: schools.barangayId,
    })
    .from(schools)
    .where(eq(schools.isActive, true))
    .orderBy(asc(schools.name));
}

/* -------------------------------------------------------------------------- */
/*  Registry                                                                  */
/* -------------------------------------------------------------------------- */

export type ChildQuery = {
  q?: string;
  barangay?: string;
  status?: string; // record_status filter
  active?: string; // child status filter
  sex?: string;
  ageMin?: number;
  ageMax?: number;
  sort?: "name" | "recent" | "oldest";
  page?: number;
};

const year = new Date().getFullYear();

function childFilters(user: SessionUser, q: ChildQuery): SQL | undefined {
  const conditions: SQL[] = [];
  const scope = childScope(user);
  if (scope) conditions.push(scope);

  // Never show records marked as duplicates in the main registry.
  conditions.push(sql`${children.recordStatus} != 'marked_duplicate'`);

  if (q.q) {
    const needle = `%${q.q}%`;
    conditions.push(
      sql`(${children.firstName} LIKE ${needle} OR ${children.lastName} LIKE ${needle} OR ${children.childCode} LIKE ${needle})`,
    );
  }
  if (q.barangay) conditions.push(eq(children.barangayId, q.barangay));
  if (q.status) conditions.push(eq(children.recordStatus, q.status as RecordStatus));
  if (q.active) conditions.push(eq(children.status, q.active as ChildStatus));
  if (q.sex) conditions.push(eq(children.sex, q.sex as Sex));
  if (q.ageMin != null)
    conditions.push(sql`${children.birthDate} <= ${`${year - q.ageMin}-12-31`}`);
  if (q.ageMax != null)
    conditions.push(sql`${children.birthDate} >= ${`${year - q.ageMax}-01-01`}`);

  return conditions.length ? and(...conditions) : undefined;
}

export type ChildRow = {
  id: string;
  childCode: string;
  firstName: string;
  lastName: string;
  sex: string;
  birthDate: string;
  age: number | null;
  barangayName: string;
  recordStatus: string;
  status: string;
  createdAt: Date;
};

export async function listChildren(
  user: SessionUser,
  query: ChildQuery,
): Promise<{ rows: ChildRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = PAGE_SIZE;
  const where = childFilters(user, query) ?? sql`1 = 1`;

  const totalRow = await db.select({ n: count() }).from(children).where(where);
  const total = totalRow[0]?.n ?? 0;

  const orderBy: SQL[] =
    query.sort === "name"
      ? [asc(children.lastName), asc(children.firstName)]
      : query.sort === "oldest"
        ? [asc(children.createdAt)]
        : [desc(children.createdAt)];

  const rows = await db
    .select({
      id: children.id,
      childCode: children.childCode,
      firstName: children.firstName,
      lastName: children.lastName,
      sex: children.sex,
      birthDate: children.birthDate,
      barangayName: barangays.name,
      recordStatus: children.recordStatus,
      status: children.status,
      createdAt: children.createdAt,
    })
    .from(children)
    .innerJoin(barangays, eq(barangays.id, children.barangayId))
    .where(where)
    .orderBy(...orderBy)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    rows: rows.map((r) => ({
      ...r,
      age: ageFromBirthDate(r.birthDate),
    })),
    total,
    page,
    pageSize,
  };
}

/* -------------------------------------------------------------------------- */
/*  Single child (profile)                                                    */
/* -------------------------------------------------------------------------- */

export type ChildProfile = {
  id: string;
  childCode: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  birthDate: string;
  sex: string;
  civilStatus: string | null;
  birthPlace: string | null;
  barangayId: string;
  barangayName: string;
  status: string;
  recordStatus: string;
  createdBy: string;
  createdByName: string | null;
  updatedByName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function getChildProfile(childId: string): Promise<ChildProfile | null> {
  const updater = alias(users, "updater");
  const rows = await db
    .select({
      id: children.id,
      childCode: children.childCode,
      firstName: children.firstName,
      middleName: children.middleName,
      lastName: children.lastName,
      suffix: children.suffix,
      birthDate: children.birthDate,
      sex: children.sex,
      civilStatus: children.civilStatus,
      birthPlace: children.birthPlace,
      barangayId: children.barangayId,
      barangayName: barangays.name,
      status: children.status,
      recordStatus: children.recordStatus,
      createdBy: children.createdBy,
      createdByName: users.firstName,
      creatorLast: users.lastName,
      updatedByName: updater.firstName,
      updaterLast: updater.lastName,
      createdAt: children.createdAt,
      updatedAt: children.updatedAt,
    })
    .from(children)
    .innerJoin(barangays, eq(barangays.id, children.barangayId))
    .leftJoin(users, eq(users.id, children.createdBy))
    .leftJoin(updater, eq(updater.id, children.updatedBy))
    .where(eq(children.id, childId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    createdByName: row.createdByName ? `${row.createdByName} ${row.creatorLast}` : null,
    updatedByName: row.updatedByName ? `${row.updatedByName} ${row.updaterLast}` : null,
  } as ChildProfile;
}

export async function getCurrentAddress(childId: string) {
  const rows = await db
    .select({
      id: childAddresses.id,
      householdAddress: childAddresses.householdAddress,
      sitio: childAddresses.sitio,
      isCurrent: childAddresses.isCurrent,
      barangayName: barangays.name,
    })
    .from(childAddresses)
    .innerJoin(barangays, eq(barangays.id, childAddresses.barangayId))
    .where(eq(childAddresses.childId, childId))
    .orderBy(desc(childAddresses.isCurrent), desc(childAddresses.createdAt));
  return rows;
}

export async function getEducationHistory(childId: string) {
  return db
    .select({
      id: childEducation.id,
      educationStatus: childEducation.educationStatus,
      gradeLevel: childEducation.gradeLevel,
      schoolYear: childEducation.schoolYear,
      enrollmentStatus: childEducation.enrollmentStatus,
      isCurrent: childEducation.isCurrent,
      schoolId: childEducation.schoolId,
      schoolName: schools.name,
    })
    .from(childEducation)
    .leftJoin(schools, eq(schools.id, childEducation.schoolId))
    .where(eq(childEducation.childId, childId))
    .orderBy(desc(childEducation.isCurrent), desc(childEducation.createdAt));
}

export async function getEccdHistory(childId: string) {
  return db
    .select()
    .from(childEccd)
    .where(eq(childEccd.childId, childId))
    .orderBy(desc(childEccd.createdAt));
}

/** Sensitive — callers must check `children.view`/scope before use. */
export async function getDisabilityRecords(childId: string) {
  return db
    .select()
    .from(childDisabilities)
    .where(eq(childDisabilities.childId, childId))
    .orderBy(desc(childDisabilities.createdAt));
}

export async function getValidationHistory(childId: string) {
  const submitter = alias(users, "submitter");
  return db
    .select({
      id: childValidations.id,
      status: childValidations.status,
      remarks: childValidations.remarks,
      submittedAt: childValidations.submittedAt,
      reviewedAt: childValidations.reviewedAt,
      submitterFirst: submitter.firstName,
      submitterLast: submitter.lastName,
      reviewerFirst: users.firstName,
      reviewerLast: users.lastName,
    })
    .from(childValidations)
    .innerJoin(submitter, eq(submitter.id, childValidations.submittedBy))
    .leftJoin(users, eq(users.id, childValidations.reviewedBy))
    .where(eq(childValidations.childId, childId))
    .orderBy(desc(childValidations.submittedAt));
}

export async function getChildDuplicates(childId: string) {
  return db
    .select({
      id: childDuplicateCandidates.id,
      possibleChildId: childDuplicateCandidates.possibleChildId,
      status: childDuplicateCandidates.status,
      matchScore: childDuplicateCandidates.matchScore,
      matchReason: childDuplicateCandidates.matchReason,
      reviewNotes: childDuplicateCandidates.reviewNotes,
      possibleCode: possibleChild.childCode,
      possibleFirst: possibleChild.firstName,
      possibleLast: possibleChild.lastName,
      possibleBirth: possibleChild.birthDate,
    })
    .from(childDuplicateCandidates)
    .innerJoin(possibleChild, eq(possibleChild.id, childDuplicateCandidates.possibleChildId))
    .where(eq(childDuplicateCandidates.childId, childId))
    .orderBy(desc(childDuplicateCandidates.createdAt));
}

export async function getMonitoringRecords(childId: string) {
  return db
    .select({
      id: childMonitoring.id,
      monitoringType: childMonitoring.monitoringType,
      status: childMonitoring.status,
      observedAt: childMonitoring.observedAt,
      remarks: childMonitoring.remarks,
      recorderFirst: users.firstName,
      recorderLast: users.lastName,
    })
    .from(childMonitoring)
    .leftJoin(users, eq(users.id, childMonitoring.recordedBy))
    .where(eq(childMonitoring.childId, childId))
    .orderBy(desc(childMonitoring.observedAt));
}

export async function getInterventionsForChild(childId: string) {
  return db
    .select({
      id: interventions.id,
      interventionType: interventions.interventionType,
      description: interventions.description,
      status: interventions.status,
      priority: interventions.priority,
      startDate: interventions.startDate,
      targetDate: interventions.targetDate,
      completedDate: interventions.completedDate,
      assigneeFirst: users.firstName,
      assigneeLast: users.lastName,
    })
    .from(interventions)
    .leftJoin(users, eq(users.id, interventions.assignedTo))
    .where(eq(interventions.childId, childId))
    .orderBy(desc(interventions.createdAt));
}

export async function getQrEvents(childId: string) {
  return db
    .select({
      id: qrVerifications.id,
      verificationToken: qrVerifications.verificationToken,
      verificationType: qrVerifications.verificationType,
      result: qrVerifications.result,
      verifiedAt: qrVerifications.verifiedAt,
    })
    .from(qrVerifications)
    .where(eq(qrVerifications.childId, childId))
    .orderBy(desc(qrVerifications.verifiedAt))
    .limit(10);
}

/* -------------------------------------------------------------------------- */
/*  Dashboard                                                                 */
/* -------------------------------------------------------------------------- */

export type DashboardStats = {
  total: number;
  verified: number;
  pendingValidation: number;
  enrolled: number;
  osy: number;
  eccdNonParticipation: number;
  withDisability: number;
  openInterventions: number;
};

export async function dashboardStats(user: SessionUser): Promise<DashboardStats> {
  const scope = childScope(user);
  const scopeSql = scope ?? sql`1 = 1`;

  const countWith = async (extra: SQL): Promise<number> => {
    const rows = await db
      .select({ n: count() })
      .from(children)
      .where(and(scopeSql, extra));
    return rows[0]?.n ?? 0;
  };

  const [total, verified, pendingValidation, enrolled, osy, eccdNon, disability, openInterventions] =
    await Promise.all([
      countWith(sql`${children.recordStatus} != 'marked_duplicate' AND ${children.status} = 'active'`),
      countWith(eq(children.recordStatus, "verified")),
      countWith(eq(children.recordStatus, "pending_validation")),
      countWith(sql`
        exists (
          select 1 from ${childEducation}
          where ${childEducation.childId} = ${children.id}
            and ${childEducation.isCurrent} = 1
            and ${childEducation.educationStatus} = 'enrolled'
        )`),
      countWith(sql`
        exists (
          select 1 from ${childEducation}
          where ${childEducation.childId} = ${children.id}
            and ${childEducation.isCurrent} = 1
            and ${childEducation.educationStatus} = 'out_of_school'
        )`),
      countWith(sql`
        exists (
          select 1 from ${childEccd}
          where ${childEccd.childId} = ${children.id}
            and ${childEccd.participationStatus} = 'not_participating'
        )`),
      countWith(sql`
        exists (
          select 1 from ${childDisabilities}
          where ${childDisabilities.childId} = ${children.id}
            and ${childDisabilities.hasDisability} = 1
        )`),
      countWith(sql`
        exists (
          select 1 from ${interventions}
          where ${interventions.childId} = ${children.id}
            and ${interventions.status} in ('planned', 'ongoing')
        )`),
    ]);

  return {
    total,
    verified,
    pendingValidation,
    enrolled,
    osy,
    eccdNonParticipation: eccdNon,
    withDisability: disability,
    openInterventions,
  };
}

export type DashboardCharts = {
  byBarangay: { name: string; value: number }[];
  byEducation: { name: string; value: number }[];
  byRecordStatus: { name: string; value: number }[];
};

const EDU_LABELS: Record<string, string> = {
  enrolled: "Enrolled",
  out_of_school: "Out-of-School",
  not_yet_in_school: "Not Yet in School",
  graduated: "Graduated",
  unknown: "Unknown",
};

const RECORD_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_validation: "Pending Validation",
  needs_correction: "Needs Correction",
  verified: "Verified",
  marked_duplicate: "Marked Duplicate",
};

export async function dashboardCharts(user: SessionUser): Promise<DashboardCharts> {
  const scope = childScope(user);
  const scopeSql = scope ?? sql`1 = 1`;

  const byBarangayRows = await db
    .select({ name: barangays.name, value: count() })
    .from(children)
    .innerJoin(barangays, eq(barangays.id, children.barangayId))
    .where(scopeSql)
    .groupBy(children.barangayId)
    .orderBy(desc(count()));

  const eduRows = await db
    .select({ key: childEducation.educationStatus, value: count() })
    .from(childEducation)
    .innerJoin(children, eq(children.id, childEducation.childId))
    .where(and(scopeSql, eq(childEducation.isCurrent, true)))
    .groupBy(childEducation.educationStatus)
    .orderBy(desc(count()));

  const recordRows = await db
    .select({ key: children.recordStatus, value: count() })
    .from(children)
    .where(scopeSql)
    .groupBy(children.recordStatus)
    .orderBy(desc(count()));

  return {
    byBarangay: byBarangayRows.map((r) => ({ name: r.name, value: r.value })),
    byEducation: eduRows.map((r) => ({ name: EDU_LABELS[r.key] ?? r.key, value: r.value })),
    byRecordStatus: recordRows.map((r) => ({
      name: RECORD_LABELS[r.key] ?? r.key,
      value: r.value,
    })),
  };
}

/* -------------------------------------------------------------------------- */
/*  Validation queue                                                          */
/* -------------------------------------------------------------------------- */

export type QueueItem = {
  id: string;
  childCode: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  barangayName: string;
  submittedAt: Date | null;
  submitterFirst: string | null;
  submitterLast: string | null;
};

export async function validationQueue(user: SessionUser): Promise<QueueItem[]> {
  const scope = childScope(user);
  const where = scope
    ? and(scope, inArray(children.recordStatus, pendingRecordStatuses))
    : inArray(children.recordStatus, pendingRecordStatuses);

  return db
    .select({
      id: children.id,
      childCode: children.childCode,
      firstName: children.firstName,
      lastName: children.lastName,
      birthDate: children.birthDate,
      barangayName: barangays.name,
      submittedAt: childValidations.submittedAt,
      submitterFirst: users.firstName,
      submitterLast: users.lastName,
    })
    .from(children)
    .innerJoin(barangays, eq(barangays.id, children.barangayId))
    .leftJoin(
      childValidations,
      and(
        eq(childValidations.childId, children.id),
        eq(childValidations.status, "pending"),
      ),
    )
    .leftJoin(users, eq(users.id, childValidations.submittedBy))
    .where(where)
    .orderBy(asc(childValidations.submittedAt))
    .limit(100)
    .then((rows) =>
      rows.map((r) => ({
        ...r,
        barangayName: r.barangayName ?? "—",
      })),
    );
}

/* -------------------------------------------------------------------------- */
/*  Duplicate review                                                          */
/* -------------------------------------------------------------------------- */

export type DuplicateItem = {
  id: string;
  childId: string;
  possibleChildId: string;
  matchScore: number | null;
  matchReasons: string[];
  status: string;
  reviewNotes: string | null;
  childCode: string;
  childFirst: string;
  childLast: string;
  childBirth: string;
  possibleCode: string;
  possibleFirst: string;
  possibleLast: string;
  possibleBirth: string;
};

export async function listDuplicates(status?: string): Promise<DuplicateItem[]> {
  const where = status && status !== "all" ? eq(childDuplicateCandidates.status, status) : undefined;

  const rows = await db
    .select({
      id: childDuplicateCandidates.id,
      childId: childDuplicateCandidates.childId,
      possibleChildId: childDuplicateCandidates.possibleChildId,
      matchScore: childDuplicateCandidates.matchScore,
      matchReason: childDuplicateCandidates.matchReason,
      status: childDuplicateCandidates.status,
      reviewNotes: childDuplicateCandidates.reviewNotes,
      childCode: children.childCode,
      childFirst: children.firstName,
      childLast: children.lastName,
      childBirth: children.birthDate,
      possibleCode: possibleChild.childCode,
      possibleFirst: possibleChild.firstName,
      possibleLast: possibleChild.lastName,
      possibleBirth: possibleChild.birthDate,
    })
    .from(childDuplicateCandidates)
    .innerJoin(children, eq(children.id, childDuplicateCandidates.childId))
    .innerJoin(possibleChild, eq(possibleChild.id, childDuplicateCandidates.possibleChildId))
    .where(where)
    .orderBy(desc(childDuplicateCandidates.createdAt))
    .limit(100);

  return rows.map((r) => {
    let reasons: string[] = [];
    try {
      reasons = r.matchReason ? (JSON.parse(r.matchReason) as string[]) : [];
    } catch {
      reasons = [];
    }
    return { ...r, matchReasons: reasons };
  });
}

/* -------------------------------------------------------------------------- */
/*  Monitoring                                                                */
/* -------------------------------------------------------------------------- */

export type MonitoringOverview = {
  osy: number;
  eccd: number;
  disability: number;
  education: number;
  general: number;
  openRecords: number;
};

export async function monitoringOverview(user: SessionUser): Promise<MonitoringOverview> {
  const scope = childScope(user);
  const scopeSql = scope ?? sql`1 = 1`;

  const typeCounts = await db
    .select({ type: childMonitoring.monitoringType, value: count() })
    .from(childMonitoring)
    .innerJoin(children, eq(children.id, childMonitoring.childId))
    .where(scopeSql)
    .groupBy(childMonitoring.monitoringType);

  const openRows = await db
    .select({ value: count() })
    .from(childMonitoring)
    .innerJoin(children, eq(children.id, childMonitoring.childId))
    .where(and(scopeSql, inArray(childMonitoring.status, ["open", "in_progress"])));

  const get = (t: string) => typeCounts.find((r) => r.type === t)?.value ?? 0;

  return {
    osy: get("out_of_school_youth"),
    eccd: get("eccd"),
    disability: get("disability"),
    education: get("education"),
    general: get("general"),
    openRecords: openRows[0]?.value ?? 0,
  };
}

export type MonitorRow = {
  id: string;
  monitoringType: string;
  status: string;
  observedAt: Date;
  remarks: string | null;
  childId: string;
  childCode: string;
  firstName: string;
  lastName: string;
  barangayName: string;
};

export async function monitoringList(
  user: SessionUser,
  type?: MonitoringType,
): Promise<MonitorRow[]> {
  const scope = childScope(user);
  const conditions: SQL[] = [scopeSql];
  if (type) conditions.push(eq(childMonitoring.monitoringType, type));

  return db
    .select({
      id: childMonitoring.id,
      monitoringType: childMonitoring.monitoringType,
      status: childMonitoring.status,
      observedAt: childMonitoring.observedAt,
      remarks: childMonitoring.remarks,
      childId: children.id,
      childCode: children.childCode,
      firstName: children.firstName,
      lastName: children.lastName,
      barangayName: barangays.name,
    })
    .from(childMonitoring)
    .innerJoin(children, eq(children.id, childMonitoring.childId))
    .innerJoin(barangays, eq(barangays.id, children.barangayId))
    .where(and(...conditions))
    .orderBy(desc(childMonitoring.observedAt))
    .limit(200);
}

/* -------------------------------------------------------------------------- */
/*  Interventions                                                             */
/* -------------------------------------------------------------------------- */

export type InterventionRow = {
  id: string;
  interventionType: string;
  description: string;
  status: string;
  priority: string | null;
  startDate: string | null;
  targetDate: string | null;
  completedDate: string | null;
  childId: string;
  childCode: string;
  firstName: string;
  lastName: string;
  barangayName: string;
  followupCount: number;
};

export async function listInterventions(
  user: SessionUser,
  status?: string,
): Promise<InterventionRow[]> {
  const scope = childScope(user);
  const conditions: SQL[] = [scopeSql];
  if (status && status !== "all") conditions.push(eq(interventions.status, status));

  const rows = await db
    .select({
      id: interventions.id,
      interventionType: interventions.interventionType,
      description: interventions.description,
      status: interventions.status,
      priority: interventions.priority,
      startDate: interventions.startDate,
      targetDate: interventions.targetDate,
      completedDate: interventions.completedDate,
      childId: children.id,
      childCode: children.childCode,
      firstName: children.firstName,
      lastName: children.lastName,
      barangayName: barangays.name,
    })
    .from(interventions)
    .innerJoin(children, eq(children.id, interventions.childId))
    .innerJoin(barangays, eq(barangays.id, children.barangayId))
    .where(and(...conditions))
    .orderBy(desc(interventions.createdAt))
    .limit(200);

  if (rows.length === 0) return [];

  const followupCounts = await db
    .select({ interventionId: interventionFollowups.interventionId, n: count() })
    .from(interventionFollowups)
    .where(
      inArray(
        interventionFollowups.interventionId,
        rows.map((r) => r.id),
      ),
    )
    .groupBy(interventionFollowups.interventionId);

  const countMap = new Map(followupCounts.map((f) => [f.interventionId, f.n]));
  return rows.map((r) => ({ ...r, followupCount: countMap.get(r.id) ?? 0 }));
}

export async function getFollowupsForIntervention(interventionId: string) {
  return db
    .select({
      id: interventionFollowups.id,
      followUpDate: interventionFollowups.followUpDate,
      status: interventionFollowups.status,
      notes: interventionFollowups.notes,
      recorderFirst: users.firstName,
      recorderLast: users.lastName,
      createdAt: interventionFollowups.createdAt,
    })
    .from(interventionFollowups)
    .leftJoin(users, eq(users.id, interventionFollowups.recordedBy))
    .where(eq(interventionFollowups.interventionId, interventionId))
    .orderBy(desc(interventionFollowups.followUpDate));
}

/* -------------------------------------------------------------------------- */
/*  Users / audit / notifications                                             */
/* -------------------------------------------------------------------------- */

export async function listUsersWithRoles() {
  return db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      roleLabel: roles.name,
      roleId: users.roleId,
      barangayName: barangays.name,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .leftJoin(barangays, eq(barangays.id, users.barangayId))
    .orderBy(asc(users.createdAt));
}

export async function listAuditLogs(limit = 100) {
  return db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      userFirst: users.firstName,
      userLast: users.lastName,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return rows[0]?.n ?? 0;
}

export async function recentNotifications(userId: string, limit = 12) {
  return db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      message: notifications.message,
      link: notifications.link,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}
