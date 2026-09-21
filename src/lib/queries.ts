import { and, asc, count, desc, eq, inArray, like, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "@/db";
import {
  barangays,
  children,
  duplicateCandidates,
  monitoringFollowups,
  notifications,
  qrTokens,
  schools,
  users,
  validationHistory,
} from "@/db/schema";
import {
  type DisabilityStatus,
  type EccdStatus,
  EDUCATIONAL_STATUSES,
  type EducationalStatus,
  type MonitoringCategory,
  type Sex,
  type ValidationStatus,
} from "./constants";
import type { SessionUser } from "./auth";
import { childScope } from "./scope";
import { ageFromBirthDate } from "./utils";

export const PAGE_SIZE = 10;

const PENDING_SQL: SQL[] = ["pending_validation", "submitted", "resubmitted"].map((s) =>
  eq(children.validationStatus, s),
);

const candidateChild = alias(children, "candidate");
const verifiedUser = alias(users, "verified_user");

/* -------------------------------------------------------------------------- */
/*  Registry                                                                  */
/* -------------------------------------------------------------------------- */

export type ChildQuery = {
  q?: string;
  barangay?: string;
  school?: string;
  status?: string;
  education?: string;
  sex?: string;
  eccd?: string;
  disability?: string;
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

  if (q.q) {
    const needle = `%${q.q}%`;
    conditions.push(
      sql`(${children.firstName} LIKE ${needle} OR ${children.lastName} LIKE ${needle} OR ${children.childCode} LIKE ${needle})`,
    );
  }
  if (q.barangay) conditions.push(eq(children.barangayId, q.barangay));
  if (q.school) conditions.push(eq(children.schoolId, q.school));
  if (q.status) conditions.push(eq(children.validationStatus, q.status as ValidationStatus));
  if (q.education)
    conditions.push(eq(children.educationalStatus, q.education as EducationalStatus));
  if (q.sex) conditions.push(eq(children.sex, q.sex as Sex));
  if (q.eccd) conditions.push(eq(children.eccdStatus, q.eccd as EccdStatus));
  if (q.disability)
    conditions.push(eq(children.disabilityStatus, q.disability as DisabilityStatus));
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
  schoolName: string | null;
  educationalStatus: string;
  validationStatus: string;
  eccdStatus: string;
  disabilityStatus: string;
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
      schoolName: schools.name,
      educationalStatus: children.educationalStatus,
      validationStatus: children.validationStatus,
      eccdStatus: children.eccdStatus,
      disabilityStatus: children.disabilityStatus,
      createdAt: children.createdAt,
    })
    .from(children)
    .leftJoin(barangays, eq(barangays.id, children.barangayId))
    .leftJoin(schools, eq(schools.id, children.schoolId))
    .where(where)
    .orderBy(...orderBy)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    rows: rows.map((r) => ({
      ...r,
      age: ageFromBirthDate(r.birthDate),
      barangayName: r.barangayName ?? "—",
    })),
    total,
    page,
    pageSize,
  };
}

/* -------------------------------------------------------------------------- */
/*  Single child (profile)                                                    */
/* -------------------------------------------------------------------------- */

export type ChildProfileRow = {
  id: string;
  childCode: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  birthDate: string;
  sex: string;
  barangayId: string;
  barangayName: string;
  addressDetails: string | null;
  guardianName: string | null;
  guardianContact: string | null;
  educationalStatus: string;
  schoolId: string | null;
  schoolName: string | null;
  gradeLevel: string | null;
  schoolYear: string | null;
  eccdStatus: string;
  eccdCenter: string | null;
  eccdNonParticipationReason: string | null;
  disabilityStatus: string;
  disabilityType: string | null;
  disabilitySupportRequired: string | null;
  disabilitySupportProvided: string | null;
  disabilityReferral: string | null;
  validationStatus: string;
  duplicateStatus: string;
  notes: string | null;
  createdBy: string;
  createdByName: string;
  createdByLast: string;
  submittedAt: Date | null;
  verifiedBy: string | null;
  verifiedByName: string | null;
  verifiedByLast: string | null;
  verifiedAt: Date | null;
  validationNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  creatorRole: string | null;
};

export async function getChildRow(childId: string): Promise<ChildProfileRow | null> {
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
      barangayId: children.barangayId,
      barangayName: barangays.name,
      addressDetails: children.addressDetails,
      guardianName: children.guardianName,
      guardianContact: children.guardianContact,
      educationalStatus: children.educationalStatus,
      schoolId: children.schoolId,
      schoolName: schools.name,
      gradeLevel: children.gradeLevel,
      schoolYear: children.schoolYear,
      eccdStatus: children.eccdStatus,
      eccdCenter: children.eccdCenter,
      eccdNonParticipationReason: children.eccdNonParticipationReason,
      disabilityStatus: children.disabilityStatus,
      disabilityType: children.disabilityType,
      disabilitySupportRequired: children.disabilitySupportRequired,
      disabilitySupportProvided: children.disabilitySupportProvided,
      disabilityReferral: children.disabilityReferral,
      validationStatus: children.validationStatus,
      duplicateStatus: children.duplicateStatus,
      notes: children.notes,
      createdBy: children.createdBy,
      createdByName: users.firstName,
      createdByLast: users.lastName,
      submittedAt: children.submittedAt,
      verifiedBy: children.verifiedBy,
      verifiedByName: verifiedUser.firstName,
      verifiedByLast: verifiedUser.lastName,
      verifiedAt: children.verifiedAt,
      validationNotes: children.validationNotes,
      createdAt: children.createdAt,
      updatedAt: children.updatedAt,
      creatorRole: users.role,
    })
    .from(children)
    .leftJoin(barangays, eq(barangays.id, children.barangayId))
    .leftJoin(schools, eq(schools.id, children.schoolId))
    .leftJoin(users, eq(users.id, children.createdBy))
    .leftJoin(verifiedUser, eq(verifiedUser.id, children.verifiedBy))
    .where(eq(children.id, childId))
    .limit(1);

  return (rows[0] ?? null) as ChildProfileRow | null;
}

export type ChildHistoryEvent = {
  id: string;
  action: string;
  notes: string | null;
  performedBy: string;
  performer: string | null;
  performerLast: string | null;
  createdAt: Date;
};

export async function getChildHistory(childId: string): Promise<ChildHistoryEvent[]> {
  return db
    .select({
      id: validationHistory.id,
      action: validationHistory.action,
      notes: validationHistory.notes,
      performedBy: validationHistory.performedBy,
      performer: users.firstName,
      performerLast: users.lastName,
      createdAt: validationHistory.createdAt,
    })
    .from(validationHistory)
    .leftJoin(users, eq(users.id, validationHistory.performedBy))
    .where(eq(validationHistory.childId, childId))
    .orderBy(desc(validationHistory.createdAt));
}

export type ChildDuplicateRow = {
  id: string;
  childId: string;
  candidateId: string;
  matchReasons: string;
  status: string;
  reviewNotes: string | null;
  reviewedAt: Date | null;
  candidateCode: string;
  candidateFirst: string;
  candidateLast: string;
  candidateBirth: string;
  candidateBarangay: string | null;
};

export async function getChildDuplicates(childId: string): Promise<ChildDuplicateRow[]> {
  return db
    .select({
      id: duplicateCandidates.id,
      childId: duplicateCandidates.childId,
      candidateId: duplicateCandidates.candidateId,
      matchReasons: duplicateCandidates.matchReasons,
      status: duplicateCandidates.status,
      reviewNotes: duplicateCandidates.reviewNotes,
      reviewedAt: duplicateCandidates.reviewedAt,
      candidateCode: candidateChild.childCode,
      candidateFirst: candidateChild.firstName,
      candidateLast: candidateChild.lastName,
      candidateBirth: candidateChild.birthDate,
      candidateBarangay: barangays.name,
    })
    .from(duplicateCandidates)
    .innerJoin(candidateChild, eq(candidateChild.id, duplicateCandidates.candidateId))
    .leftJoin(barangays, eq(barangays.id, candidateChild.barangayId))
    .where(eq(duplicateCandidates.childId, childId))
    .orderBy(desc(duplicateCandidates.createdAt));
}

export type QrTokenRow = {
  token: string;
  isActive: boolean;
  scanCount: number;
  lastScannedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
};

export async function getChildQrTokens(childId: string): Promise<QrTokenRow[]> {
  return db
    .select({
      token: qrTokens.token,
      isActive: qrTokens.isActive,
      scanCount: qrTokens.scanCount,
      lastScannedAt: qrTokens.lastScannedAt,
      expiresAt: qrTokens.expiresAt,
      createdAt: qrTokens.createdAt,
    })
    .from(qrTokens)
    .where(eq(qrTokens.childId, childId))
    .orderBy(desc(qrTokens.createdAt))
    .limit(5);
}

/* -------------------------------------------------------------------------- */
/*  Dashboard                                                                 */
/* -------------------------------------------------------------------------- */

export type DashboardStats = {
  total: number;
  enrolled: number;
  osy: number;
  pendingValidation: number;
  eccdNonParticipation: number;
  interventions: number;
};

export async function dashboardStats(user: SessionUser): Promise<DashboardStats> {
  const scope = childScope(user);
  const countAll = async (extra?: SQL) => {
    const w = (extra ? (scope ? (and(scope, extra) as SQL) : extra) : scope) ?? sql`1 = 1`;
    const row = await db.select({ n: count() }).from(children).where(w);
    return row[0]?.n ?? 0;
  };

  const [total, enrolled, osy, pendingValidation, eccdNonParticipation, interventions] =
    await Promise.all([
      countAll(),
      countAll(eq(children.educationalStatus, "enrolled")),
      countAll(eq(children.educationalStatus, "out_of_school")),
      countAll(or(...PENDING_SQL)),
      countAll(eq(children.eccdStatus, "not_participating")),
      countAll(
        or(
          eq(children.disabilityStatus, "with_disability"),
          eq(children.disabilityStatus, "suspected"),
        ),
      ),
    ]);

  return { total, enrolled, osy, pendingValidation, eccdNonParticipation, interventions };
}

export type DashboardCharts = {
  byBarangay: { name: string; value: number }[];
  byEducation: { name: string; value: number }[];
  byValidation: { name: string; value: number }[];
  activity: { month: string; created: number; verified: number }[];
};

const EDU_LABELS: Record<string, string> = {
  not_yet_enrolled: "Not Yet Enrolled",
  enrolled: "Enrolled",
  out_of_school: "Out-of-School",
  als_learner: "ALS Learner",
};

const VAL_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  pending_validation: "Pending Validation",
  needs_correction: "Needs Correction",
  resubmitted: "Resubmitted",
  verified: "Verified",
};

export async function dashboardCharts(user: SessionUser): Promise<DashboardCharts> {
  const scope = childScope(user);
  const scoped = (extra: SQL): SQL => (scope ? (and(scope, extra) as SQL) : extra);

  const byBarangayRows = await db
    .select({ name: barangays.name, value: count() })
    .from(children)
    .leftJoin(barangays, eq(barangays.id, children.barangayId))
    .where(scope ?? sql`1 = 1`)
    .groupBy(children.barangayId)
    .orderBy(desc(count()));

  const byEducationRows = await db
    .select({ key: children.educationalStatus, value: count() })
    .from(children)
    .where(scoped(sql`1 = 1`))
    .groupBy(children.educationalStatus)
    .orderBy(desc(count()));

  const byValidationRows = await db
    .select({ key: children.validationStatus, value: count() })
    .from(children)
    .where(scoped(sql`1 = 1`))
    .groupBy(children.validationStatus)
    .orderBy(desc(count()));

  const activity: DashboardCharts["activity"] = [];
  const now = new Date();
  for (let m = 5; m >= 0; m -= 1) {
    const start = new Date(Date.UTC(now.getFullYear(), now.getUTCMonth() - m, 1));
    const end = new Date(Date.UTC(now.getFullYear(), now.getUTCMonth() - m + 1, 1));
    const [created, verified] = await Promise.all([
      db
        .select({ n: count() })
        .from(children)
        .where(
          scoped(
            and(sql`${children.createdAt} >= ${start}`, sql`${children.createdAt} < ${end}`) as SQL,
          ),
        ),
      db
        .select({ n: count() })
        .from(children)
        .where(
          scoped(
            and(sql`${children.verifiedAt} >= ${start}`, sql`${children.verifiedAt} < ${end}`) as SQL,
          ),
        ),
    ]);
    activity.push({
      month: start.toLocaleDateString("en-PH", { month: "short", timeZone: "UTC" }),
      created: created[0]?.n ?? 0,
      verified: verified[0]?.n ?? 0,
    });
  }

  return {
    byBarangay: byBarangayRows.map((r) => ({ name: r.name ?? "—", value: r.value })),
    byEducation: byEducationRows.map((r) => ({ name: EDU_LABELS[r.key] ?? r.key, value: r.value })),
    byValidation: byValidationRows.map((r) => ({ name: VAL_LABELS[r.key] ?? r.key, value: r.value })),
    activity,
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
  schoolName: string | null;
  createdByName: string;
  createdAt: Date | null;
};

export async function validationQueue(user: SessionUser): Promise<QueueItem[]> {
  const scope = childScope(user);
  const where = scope ? and(scope, or(...PENDING_SQL)) : or(...PENDING_SQL);

  return db
    .select({
      id: children.id,
      childCode: children.childCode,
      firstName: children.firstName,
      lastName: children.lastName,
      birthDate: children.birthDate,
      barangayName: barangays.name,
      schoolName: schools.name,
      createdByName: users.firstName,
      createdAt: children.submittedAt,
    })
    .from(children)
    .leftJoin(barangays, eq(barangays.id, children.barangayId))
    .leftJoin(schools, eq(schools.id, children.schoolId))
    .leftJoin(users, eq(users.id, children.createdBy))
    .where(where)
    .orderBy(asc(children.submittedAt))
    .limit(100)
    .then((rows) =>
      rows.map((r) => ({
        ...r,
        barangayName: r.barangayName ?? "—",
        createdByName: r.createdByName ?? "—",
      })),
    );
}

/* -------------------------------------------------------------------------- */
/*  Duplicate review                                                          */
/* -------------------------------------------------------------------------- */

export type DuplicateItem = {
  id: string;
  childId: string;
  candidateId: string;
  matchReasons: string[];
  status: string;
  reviewNotes: string | null;
  childCode: string;
  childFirst: string;
  childLast: string;
  childBirth: string;
  candidateCode: string;
  candidateFirst: string;
  candidateLast: string;
  candidateBirth: string;
  candidateBarangay: string | null;
};

export async function listDuplicates(status?: string): Promise<DuplicateItem[]> {
  const where = status && status !== "all" ? eq(duplicateCandidates.status, status) : undefined;

  const rows = await db
    .select({
      id: duplicateCandidates.id,
      childId: duplicateCandidates.childId,
      candidateId: duplicateCandidates.candidateId,
      matchReasons: duplicateCandidates.matchReasons,
      status: duplicateCandidates.status,
      reviewNotes: duplicateCandidates.reviewNotes,
      childCode: children.childCode,
      childFirst: children.firstName,
      childLast: children.lastName,
      childBirth: children.birthDate,
      candidateCode: candidateChild.childCode,
      candidateFirst: candidateChild.firstName,
      candidateLast: candidateChild.lastName,
      candidateBirth: candidateChild.birthDate,
      candidateBarangay: barangays.name,
    })
    .from(duplicateCandidates)
    .innerJoin(children, eq(children.id, duplicateCandidates.childId))
    .innerJoin(candidateChild, eq(candidateChild.id, duplicateCandidates.candidateId))
    .leftJoin(barangays, eq(barangays.id, candidateChild.barangayId))
    .where(where)
    .orderBy(desc(duplicateCandidates.createdAt))
    .limit(100);

  return rows.map((r) => {
    let reasons: string[] = [];
    try {
      reasons = JSON.parse(r.matchReasons) as string[];
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
  educational: number;
  intervention: number;
  followupsOpen: number;
};

export async function monitoringOverview(user: SessionUser): Promise<MonitoringOverview> {
  const scope = childScope(user);
  const countAll = async (extra?: SQL) => {
    const w = (scope ? (and(scope, extra) as SQL) : extra) ?? sql`1 = 1`;
    const row = await db.select({ n: count() }).from(children).where(w);
    return row[0]?.n ?? 0;
  };

  const [osy, eccd, disability, educational, intervention, followupsOpen] = await Promise.all([
    countAll(eq(children.educationalStatus, "out_of_school")),
    countAll(eq(children.eccdStatus, "not_participating")),
    countAll(
      or(
        eq(children.disabilityStatus, "with_disability"),
        eq(children.disabilityStatus, "suspected"),
      ),
    ),
    countAll(sql`1 = 1`),
    countAll(sql`${children.disabilityStatus} != 'none'`),
    (async () => {
      const rows = await db
        .select({ n: count() })
        .from(monitoringFollowups)
        .where(and(scope ?? sql`1 = 1`, eq(monitoringFollowups.status, "open")));
      return rows[0]?.n ?? 0;
    })(),
  ]);

  return { osy, eccd, disability, educational, intervention, followupsOpen };
}

export type MonitorRow = {
  id: string;
  childCode: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  sex: string;
  barangayName: string;
  schoolName: string | null;
  educationalStatus: string;
  eccdStatus: string;
  disabilityStatus: string;
  followupId: string | null;
  followupStatus: string | null;
  followupDate: string | null;
  followupNotes: string | null;
};

/** Children in a monitoring category, joined with their *latest* follow-up. */
export async function monitoringList(
  user: SessionUser,
  category: MonitoringCategory,
): Promise<MonitorRow[]> {
  const scope = childScope(user);
  const where = scope ? and(scope, categoryCriteria(category)) : categoryCriteria(category);

  const childrenRows = await db
    .select({
      id: children.id,
      childCode: children.childCode,
      firstName: children.firstName,
      lastName: children.lastName,
      birthDate: children.birthDate,
      sex: children.sex,
      barangayName: barangays.name,
      schoolName: schools.name,
      educationalStatus: children.educationalStatus,
      eccdStatus: children.eccdStatus,
      disabilityStatus: children.disabilityStatus,
    })
    .from(children)
    .leftJoin(barangays, eq(barangays.id, children.barangayId))
    .leftJoin(schools, eq(schools.id, children.schoolId))
    .where(where)
    .orderBy(asc(children.lastName))
    .limit(300);

  if (childrenRows.length === 0) return [];

  const ids = childrenRows.map((c) => c.id);
  const followups = await db
    .select({
      id: monitoringFollowups.id,
      childId: monitoringFollowups.childId,
      status: monitoringFollowups.status,
      followupDate: monitoringFollowups.followupDate,
      notes: monitoringFollowups.notes,
      createdAt: monitoringFollowups.createdAt,
    })
    .from(monitoringFollowups)
    .where(and(inArray(monitoringFollowups.childId, ids), eq(monitoringFollowups.category, category)))
    .orderBy(desc(monitoringFollowups.createdAt));

  const latest = new Map<string, (typeof followups)[number]>();
  for (const f of followups) {
    if (!latest.has(f.childId)) latest.set(f.childId, f);
  }

  return childrenRows.map((c) => {
    const f = latest.get(c.id);
    return {
      ...c,
      barangayName: c.barangayName ?? "—",
      followupId: f?.id ?? null,
      followupStatus: f?.status ?? null,
      followupDate: f?.followupDate ?? null,
      followupNotes: f?.notes ?? null,
    };
  });
}

function categoryCriteria(category: MonitoringCategory): SQL {
  switch (category) {
    case "osy":
      return eq(children.educationalStatus, "out_of_school") as SQL;
    case "eccd":
      return eq(children.eccdStatus, "not_participating") as SQL;
    case "disability":
      return or(
        eq(children.disabilityStatus, "with_disability"),
        eq(children.disabilityStatus, "suspected"),
      ) as SQL;
    case "educational":
      return or(
        ...EDUCATIONAL_STATUSES.map((s) => eq(children.educationalStatus, s)),
      ) as SQL;
    case "intervention":
      return sql`${children.disabilityStatus} != 'none' OR ${children.disabilitySupportRequired} IS NOT NULL`;
    default:
      return sql`1 = 0`;
  }
}

/* -------------------------------------------------------------------------- */
/*  Notifications / misc                                                      */
/* -------------------------------------------------------------------------- */

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
      body: notifications.body,
      link: notifications.link,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}