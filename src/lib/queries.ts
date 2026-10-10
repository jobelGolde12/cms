import { and, asc, count, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "@/db";
import {
  assessments,
  attendanceRecords,
  auditLogs,
  behaviorCategories,
  behaviorRecords,
  duplicateCandidates,
  gradeLevels,
  gradingPeriods,
  guardians,
  interventions,
  interventionFollowups,
  notifications,
  qrVerifications,
  recordVerifications,
  schoolYears,
  sections,
  studentEnrollments,
  studentGrades,
  studentGuardians,
  students,
  subjects,
  users,
  roles,
} from "@/db/schema";
import {
  type RecordStatus,
  type Sex,
  type StudentStatus,
  type AssessmentDomain,
} from "./constants";
import type { SessionUser } from "./auth";
import { userSectionScope } from "./scope";
import { ageFromBirthDate } from "./utils";

export const PAGE_SIZE = 10;

const pendingRecordStatuses: RecordStatus[] = ["pending_validation"];

const possibleStudent = alias(students, "possible_student");

/* -------------------------------------------------------------------------- */
/*  Reference data                                                            */
/* -------------------------------------------------------------------------- */

export async function listGradeLevels() {
  return db
    .select({ id: gradeLevels.id, name: gradeLevels.name })
    .from(gradeLevels)
    .orderBy(asc(gradeLevels.orderIndex));
}

/** Sections (current school year by default) with grade level + adviser. */
export async function listSections(schoolYearId?: string) {
  const yearId =
    schoolYearId ?? (await getCurrentSchoolYear())?.id ?? "";
  return db
    .select({
      id: sections.id,
      name: sections.name,
      gradeLevelId: sections.gradeLevelId,
      gradeLevelName: gradeLevels.name,
      adviserFirst: users.firstName,
      adviserLast: users.lastName,
    })
    .from(sections)
    .innerJoin(gradeLevels, eq(gradeLevels.id, sections.gradeLevelId))
    .leftJoin(users, eq(users.id, sections.adviserId))
    .where(and(eq(sections.schoolYearId, yearId), eq(sections.isActive, true)))
    .orderBy(asc(gradeLevels.orderIndex), asc(sections.name));
}

export async function listSubjects() {
  return db
    .select({ id: subjects.id, code: subjects.code, name: subjects.name })
    .from(subjects)
    .where(eq(subjects.isActive, true))
    .orderBy(asc(subjects.code));
}

export async function listGradingPeriods(schoolYearId?: string) {
  const yearId =
    schoolYearId ?? (await getCurrentSchoolYear())?.id ?? "";
  return db
    .select({
      id: gradingPeriods.id,
      name: gradingPeriods.name,
      isCurrent: gradingPeriods.isCurrent,
    })
    .from(gradingPeriods)
    .where(eq(gradingPeriods.schoolYearId, yearId))
    .orderBy(asc(gradingPeriods.orderIndex));
}

export async function listSchoolYears() {
  return db
    .select({
      id: schoolYears.id,
      year: schoolYears.year,
      isCurrent: schoolYears.isCurrent,
    })
    .from(schoolYears)
    .orderBy(desc(schoolYears.year));
}

export async function getCurrentSchoolYear() {
  const rows = await db
    .select({
      id: schoolYears.id,
      year: schoolYears.year,
    })
    .from(schoolYears)
    .where(eq(schoolYears.isCurrent, true))
    .limit(1);
  return rows[0] ?? null;
}

/* -------------------------------------------------------------------------- */
/*  Registry                                                                  */
/* -------------------------------------------------------------------------- */

export type StudentQuery = {
  q?: string;
  status?: string; // record_status filter
  lifecycle?: string; // student status filter (active/inactive/archived)
  sex?: string;
  gradeLevel?: string; // current enrollment grade level id
  sectionId?: string; // current enrollment section id
  sort?: "name" | "recent" | "oldest";
  page?: number;
  pageSize?: number;
};

/**
 * Build the WHERE clause for the registry listing. Exported for unit testing —
 * pure SQL composition, no database access. Applied to every list *and* write
 * path so scope cannot be bypassed by calling an action directly.
 */
export async function studentFilters(user: SessionUser, q: StudentQuery): Promise<SQL | undefined> {
  const conditions: SQL[] = [];
  const scope = await userSectionScope(user);
  if (scope) conditions.push(scope);

  // Never show records marked as duplicates in the main registry.
  conditions.push(sql`${students.recordStatus} != 'marked_duplicate'`);

  if (q.q) {
    const needle = `%${q.q}%`;
    conditions.push(
      sql`(${students.firstName} LIKE ${needle} OR ${students.lastName} LIKE ${needle} OR ${students.studentNumber} LIKE ${needle})`,
    );
  }
  if (q.status) conditions.push(eq(students.recordStatus, q.status as RecordStatus));
  // "all" is a UI escape hatch meaning "no lifecycle filter".
  if (q.lifecycle && q.lifecycle !== "all")
    conditions.push(eq(students.status, q.lifecycle as StudentStatus));
  if (q.sex) conditions.push(eq(students.sex, q.sex as Sex));
  if (q.gradeLevel)
    conditions.push(sql`exists (
      select 1 from ${studentEnrollments}
      where ${studentEnrollments.studentId} = ${students.id}
        and ${studentEnrollments.gradeLevelId} = ${q.gradeLevel}
        and ${studentEnrollments.status} = 'active'
    )`);
  if (q.sectionId)
    conditions.push(sql`exists (
      select 1 from ${studentEnrollments}
      where ${studentEnrollments.studentId} = ${students.id}
        and ${studentEnrollments.sectionId} = ${q.sectionId}
        and ${studentEnrollments.status} = 'active'
    )`);

  return conditions.length ? and(...conditions) : undefined;
}

export type StudentRow = {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  suffix: string | null;
  sex: string;
  birthDate: string;
  age: number | null;
  gradeLevelName: string | null;
  sectionName: string | null;
  recordStatus: string;
  status: string;
  createdAt: Date;
};

const ALLOWED_PAGE_SIZES = [10, 25, 50, 100] as const;

export async function listStudents(
  user: SessionUser,
  query: StudentQuery,
): Promise<{ rows: StudentRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = ALLOWED_PAGE_SIZES.includes(query.pageSize as (typeof ALLOWED_PAGE_SIZES)[number])
    ? (query.pageSize as number)
    : PAGE_SIZE;
  const where = (await studentFilters(user, query)) ?? sql`1 = 1`;

  const totalRow = await db.select({ n: count() }).from(students).where(where);
  const total = totalRow[0]?.n ?? 0;

  const orderBy: SQL[] =
    query.sort === "name"
      ? [asc(students.lastName), asc(students.firstName)]
      : query.sort === "oldest"
        ? [asc(students.createdAt)]
        : [desc(students.createdAt)];

  const rows = await db
    .select({
      id: students.id,
      studentNumber: students.studentNumber,
      firstName: students.firstName,
      lastName: students.lastName,
      suffix: students.suffix,
      sex: students.sex,
      birthDate: students.birthDate,
      gradeLevelName: gradeLevels.name,
      sectionName: sections.name,
      recordStatus: students.recordStatus,
      status: students.status,
      createdAt: students.createdAt,
    })
    .from(students)
    .leftJoin(
      studentEnrollments,
      and(eq(studentEnrollments.studentId, students.id), eq(studentEnrollments.status, "active")),
    )
    .leftJoin(gradeLevels, eq(gradeLevels.id, studentEnrollments.gradeLevelId))
    .leftJoin(sections, eq(sections.id, studentEnrollments.sectionId))
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

/**
 * Per-grade-level totals for the registry chip row (active, non-duplicate,
 * in-scope students with an active enrollment). Replaces N listStudents calls.
 */
export async function gradeLevelCounts(): Promise<Record<string, number>> {
  const rows = await db
    .select({
      key: gradeLevels.name,
      n: count(),
    })
    .from(students)
    .innerJoin(
      studentEnrollments,
      and(eq(studentEnrollments.studentId, students.id), eq(studentEnrollments.status, "active")),
    )
    .innerJoin(gradeLevels, eq(gradeLevels.id, studentEnrollments.gradeLevelId))
    .where(and(sql`${students.status} = 'active'`, sql`${students.recordStatus} != 'marked_duplicate'`))
    .groupBy(gradeLevels.name)
    .orderBy(asc(gradeLevels.orderIndex));

  const out: Record<string, number> = {};
  for (const r of rows) out[r.key] = r.n;
  return out;
}

/* -------------------------------------------------------------------------- */
/*  Single student (profile)                                                  */
/* -------------------------------------------------------------------------- */

export type StudentProfile = {
  id: string;
  studentNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  birthDate: string;
  sex: string;
  contactNumber: string | null;
  address: string | null;
  status: string;
  recordStatus: string;
  createdBy: string;
  createdByName: string | null;
  updatedByName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function getStudentProfile(studentId: string): Promise<StudentProfile | null> {
  const updater = alias(users, "updater");
  const rows = await db
    .select({
      id: students.id,
      studentNumber: students.studentNumber,
      firstName: students.firstName,
      middleName: students.middleName,
      lastName: students.lastName,
      suffix: students.suffix,
      birthDate: students.birthDate,
      sex: students.sex,
      contactNumber: students.contactNumber,
      address: students.address,
      status: students.status,
      recordStatus: students.recordStatus,
      createdBy: students.createdBy,
      createdByName: users.firstName,
      creatorLast: users.lastName,
      updatedByName: updater.firstName,
      updaterLast: updater.lastName,
      createdAt: students.createdAt,
      updatedAt: students.updatedAt,
    })
    .from(students)
    .leftJoin(users, eq(users.id, students.createdBy))
    .leftJoin(updater, eq(updater.id, students.updatedBy))
    .where(eq(students.id, studentId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    createdByName: row.createdByName ? `${row.createdByName} ${row.creatorLast}` : null,
    updatedByName: row.updatedByName ? `${row.updatedByName} ${row.updaterLast}` : null,
  } as StudentProfile;
}

export async function getGuardiansForStudent(studentId: string) {
  return db
    .select({
      id: guardians.id,
      firstName: guardians.firstName,
      middleName: guardians.middleName,
      lastName: guardians.lastName,
      relationship: guardians.relationship,
      contactNumber: guardians.contactNumber,
      email: guardians.email,
      isPrimary: studentGuardians.isPrimary,
    })
    .from(studentGuardians)
    .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
    .where(eq(studentGuardians.studentId, studentId))
    .orderBy(desc(studentGuardians.isPrimary), asc(guardians.lastName));
}

export async function getEnrollmentHistory(studentId: string) {
  return db
    .select({
      id: studentEnrollments.id,
      status: studentEnrollments.status,
      enrollmentDate: studentEnrollments.enrollmentDate,
      schoolYear: schoolYears.year,
      gradeLevelName: gradeLevels.name,
      sectionName: sections.name,
    })
    .from(studentEnrollments)
    .innerJoin(schoolYears, eq(schoolYears.id, studentEnrollments.schoolYearId))
    .innerJoin(gradeLevels, eq(gradeLevels.id, studentEnrollments.gradeLevelId))
    .innerJoin(sections, eq(sections.id, studentEnrollments.sectionId))
    .where(eq(studentEnrollments.studentId, studentId))
    .orderBy(desc(schoolYears.year));
}

/** The active enrollment row for the student, if any (joined for display). */
export async function getCurrentEnrollment(studentId: string) {
  const rows = await db
    .select({
      id: studentEnrollments.id,
      status: studentEnrollments.status,
      schoolYearId: studentEnrollments.schoolYearId,
      schoolYear: schoolYears.year,
      gradeLevelId: studentEnrollments.gradeLevelId,
      gradeLevelName: gradeLevels.name,
      sectionId: studentEnrollments.sectionId,
      sectionName: sections.name,
    })
    .from(studentEnrollments)
    .innerJoin(schoolYears, eq(schoolYears.id, studentEnrollments.schoolYearId))
    .innerJoin(gradeLevels, eq(gradeLevels.id, studentEnrollments.gradeLevelId))
    .innerJoin(sections, eq(sections.id, studentEnrollments.sectionId))
    .where(
      and(
        eq(studentEnrollments.studentId, studentId),
        eq(studentEnrollments.status, "active"),
      ),
    )
    .orderBy(desc(schoolYears.year))
    .limit(1);
  return rows[0] ?? null;
}

/** All recorded grades for a student, most recent school year first. */
export async function getStudentGrades(studentId: string) {
  return db
    .select({
      id: studentGrades.id,
      grade: studentGrades.grade,
      remarks: studentGrades.remarks,
      subjectName: subjects.name,
      subjectCode: subjects.code,
      periodName: gradingPeriods.name,
      schoolYear: schoolYears.year,
      enrollmentId: studentGrades.enrollmentId,
    })
    .from(studentGrades)
    .innerJoin(studentEnrollments, eq(studentEnrollments.id, studentGrades.enrollmentId))
    .innerJoin(subjects, eq(subjects.id, studentGrades.subjectId))
    .innerJoin(gradingPeriods, eq(gradingPeriods.id, studentGrades.gradingPeriodId))
    .innerJoin(schoolYears, eq(schoolYears.id, studentEnrollments.schoolYearId))
    .where(eq(studentEnrollments.studentId, studentId))
    .orderBy(desc(schoolYears.year), asc(gradingPeriods.orderIndex), asc(subjects.code));
}

/** Recent attendance rows for a student (across enrollments). */
export async function getAttendanceForStudent(studentId: string, limit = 30) {
  return db
    .select({
      id: attendanceRecords.id,
      date: attendanceRecords.date,
      status: attendanceRecords.status,
      remarks: attendanceRecords.remarks,
      schoolYear: schoolYears.year,
    })
    .from(attendanceRecords)
    .innerJoin(studentEnrollments, eq(studentEnrollments.id, attendanceRecords.enrollmentId))
    .innerJoin(schoolYears, eq(schoolYears.id, studentEnrollments.schoolYearId))
    .where(eq(studentEnrollments.studentId, studentId))
    .orderBy(desc(attendanceRecords.date))
    .limit(limit);
}

export async function getAssessmentsForStudent(studentId: string) {
  const assessor = alias(users, "assessor");
  return db
    .select({
      id: assessments.id,
      domain: assessments.domain,
      assessmentType: assessments.assessmentType,
      skillArea: assessments.skillArea,
      date: assessments.date,
      level: assessments.level,
      score: assessments.score,
      notes: assessments.notes,
      assessorFirst: assessor.firstName,
      assessorLast: assessor.lastName,
    })
    .from(assessments)
    .leftJoin(assessor, eq(assessor.id, assessments.assessorId))
    .where(eq(assessments.studentId, studentId))
    .orderBy(desc(assessments.date));
}

export async function getBehaviorForStudent(studentId: string) {
  const recorder = alias(users, "recorder");
  return db
    .select({
      id: behaviorRecords.id,
      date: behaviorRecords.date,
      description: behaviorRecords.description,
      severity: behaviorRecords.severity,
      followUp: behaviorRecords.followUp,
      status: behaviorRecords.status,
      categoryName: behaviorCategories.name,
      categoryKind: behaviorCategories.kind,
      recorderFirst: recorder.firstName,
      recorderLast: recorder.lastName,
    })
    .from(behaviorRecords)
    .innerJoin(behaviorCategories, eq(behaviorCategories.id, behaviorRecords.categoryId))
    .leftJoin(recorder, eq(recorder.id, behaviorRecords.recordedBy))
    .where(eq(behaviorRecords.studentId, studentId))
    .orderBy(desc(behaviorRecords.date));
}

export async function getInterventionsForStudent(studentId: string) {
  const assignee = alias(users, "assignee");
  return db
    .select({
      id: interventions.id,
      interventionType: interventions.interventionType,
      description: interventions.description,
      status: interventions.status,
      outcome: interventions.outcome,
      startDate: interventions.startDate,
      targetDate: interventions.targetDate,
      completedDate: interventions.completedDate,
      assigneeFirst: assignee.firstName,
      assigneeLast: assignee.lastName,
    })
    .from(interventions)
    .leftJoin(assignee, eq(assignee.id, interventions.assignedTo))
    .where(eq(interventions.studentId, studentId))
    .orderBy(desc(interventions.createdAt));
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

export async function getVerificationHistory(studentId: string) {
  const submitter = alias(users, "submitter");
  return db
    .select({
      id: recordVerifications.id,
      status: recordVerifications.status,
      remarks: recordVerifications.remarks,
      submittedAt: recordVerifications.submittedAt,
      reviewedAt: recordVerifications.reviewedAt,
      submitterFirst: submitter.firstName,
      submitterLast: submitter.lastName,
      reviewerFirst: users.firstName,
      reviewerLast: users.lastName,
    })
    .from(recordVerifications)
    .innerJoin(submitter, eq(submitter.id, recordVerifications.submittedBy))
    .leftJoin(users, eq(users.id, recordVerifications.reviewedBy))
    .where(eq(recordVerifications.studentId, studentId))
    .orderBy(desc(recordVerifications.submittedAt));
}

export async function getStudentDuplicates(studentId: string) {
  return db
    .select({
      id: duplicateCandidates.id,
      possibleStudentId: duplicateCandidates.possibleStudentId,
      status: duplicateCandidates.status,
      matchScore: duplicateCandidates.matchScore,
      matchReason: duplicateCandidates.matchReason,
      reviewNotes: duplicateCandidates.reviewNotes,
      possibleNumber: possibleStudent.studentNumber,
      possibleFirst: possibleStudent.firstName,
      possibleLast: possibleStudent.lastName,
      possibleBirth: possibleStudent.birthDate,
    })
    .from(duplicateCandidates)
    .innerJoin(possibleStudent, eq(possibleStudent.id, duplicateCandidates.possibleStudentId))
    .where(eq(duplicateCandidates.studentId, studentId))
    .orderBy(desc(duplicateCandidates.createdAt));
}

export async function getQrEvents(studentId: string) {
  return db
    .select({
      id: qrVerifications.id,
      verificationToken: qrVerifications.verificationToken,
      verificationType: qrVerifications.verificationType,
      result: qrVerifications.result,
      verifiedAt: qrVerifications.verifiedAt,
    })
    .from(qrVerifications)
    .where(eq(qrVerifications.studentId, studentId))
    .orderBy(desc(qrVerifications.verifiedAt))
    .limit(10);
}

/* -------------------------------------------------------------------------- */
/*  Dashboard & registry stats                                                */
/* -------------------------------------------------------------------------- */

export type DashboardStats = {
  total: number;
  verified: number;
  pendingVerification: number;
  enrolled: number;
  openInterventions: number;
  openBehaviorConcerns: number;
};

export async function dashboardStats(user: SessionUser): Promise<DashboardStats> {
  const scope = (await userSectionScope(user)) ?? sql`1 = 1`;

  const countWith = async (extra: SQL): Promise<number> => {
    const rows = await db
      .select({ n: count() })
      .from(students)
      .where(and(scope, extra));
    return rows[0]?.n ?? 0;
  };

  const [total, verified, pendingVerification, enrolled, openInterventions, openBehavior] =
    await Promise.all([
      countWith(sql`${students.recordStatus} != 'marked_duplicate' AND ${students.status} = 'active'`),
      countWith(eq(students.recordStatus, "verified")),
      countWith(eq(students.recordStatus, "pending_validation")),
      countWith(sql`
        exists (
          select 1 from ${studentEnrollments}
          where ${studentEnrollments.studentId} = ${students.id}
            and ${studentEnrollments.status} = 'active'
        )`),
      countWith(sql`
        exists (
          select 1 from ${interventions}
          where ${interventions.studentId} = ${students.id}
            and ${interventions.status} in ('planned', 'active')
        )`),
      countWith(sql`
        exists (
          select 1 from ${behaviorRecords}
          inner join ${behaviorCategories} on ${behaviorCategories.id} = ${behaviorRecords.categoryId}
          where ${behaviorRecords.studentId} = ${students.id}
            and ${behaviorRecords.status} != 'resolved'
            and ${behaviorCategories.kind} = 'concern'
        )`),
    ]);

  return {
    total,
    verified,
    pendingVerification,
    enrolled,
    openInterventions,
    openBehaviorConcerns: openBehavior,
  };
}

export type RegistryStats = {
  total: number;
  verified: number;
  verificationRate: number; // verified / total, percent
  pendingVerification: number;
  enrolled: number;
  openInterventions: number;
};

export async function registryStats(user: SessionUser): Promise<RegistryStats> {
  const scope = (await userSectionScope(user)) ?? sql`1 = 1`;
  // Same basis as listStudents: active lifecycle AND never marked_duplicate —
  // keeps the KPI cards reconciled with the table totals.
  const basis = and(
    scope,
    sql`${students.status} = 'active'`,
    sql`${students.recordStatus} != 'marked_duplicate'`,
  ) as SQL;

  const countWith = (extra: SQL): Promise<number> =>
    db
      .select({ n: count() })
      .from(students)
      .where(and(basis, extra))
      .then((rows) => rows[0]?.n ?? 0);

  const [total, verified, pendingVerification, enrolled, openInterventions] = await Promise.all([
    countWith(sql`1 = 1`),
    countWith(sql`${students.recordStatus} = 'verified'`),
    countWith(sql`${students.recordStatus} = 'pending_validation'`),
    countWith(sql`
      exists (
        select 1 from ${studentEnrollments}
        where ${studentEnrollments.studentId} = ${students.id}
          and ${studentEnrollments.status} = 'active'
      )`),
    countWith(sql`
      exists (
        select 1 from ${interventions}
        where ${interventions.studentId} = ${students.id}
          and ${interventions.status} in ('planned', 'active')
      )`),
  ]);

  return {
    total,
    verified,
    verificationRate: total > 0 ? Math.round((verified / total) * 1000) / 10 : 0,
    pendingVerification,
    enrolled,
    openInterventions,
  };
}

export type VerificationStats = {
  pendingReview: number;
  returnedForCorrection: number;
  verified: number;
  duplicateFlags: number;
  highConfidence: number;
  moderate: number;
  reviewBand: number;
  totalActive: number;
};

/**
 * Control-center counts for the Verification module. Duplicate bands use the
 * detector's actual scoring (name 40 + middle 10 + birth_date 35 + sex 15),
 * so bands derive from real match scores.
 */
export async function verificationStats(user: SessionUser): Promise<VerificationStats> {
  const scope = (await userSectionScope(user)) ?? sql`1 = 1`;

  const countWith = (extra: SQL): Promise<number> =>
    db
      .select({ n: count() })
      .from(students)
      .where(and(scope, extra))
      .then((rows) => rows[0]?.n ?? 0);

  const [pendingReview, returnedForCorrection, verified, duplicateFlags, totalActive] =
    await Promise.all([
      countWith(sql`${students.status} = 'active' AND ${students.recordStatus} = 'pending_validation'`),
      countWith(sql`${students.status} = 'active' AND ${students.recordStatus} = 'needs_correction'`),
      countWith(sql`${students.status} = 'active' AND ${students.recordStatus} = 'verified'`),
      db
        .select({ n: count() })
        .from(duplicateCandidates)
        .where(eq(duplicateCandidates.status, "pending"))
        .then((rows) => rows[0]?.n ?? 0),
      countWith(sql`${students.status} = 'active'`),
    ]);

  // Score bands across pending candidates (pair rows are not student-scoped).
  const bandRows = await db
    .select({
      band:
        sql`case
          when ${duplicateCandidates.matchScore} >= 90 then 'high'
          when ${duplicateCandidates.matchScore} >= 65 then 'moderate'
          else 'review'
        end`,
      n: count(),
    })
    .from(duplicateCandidates)
    .where(eq(duplicateCandidates.status, "pending"))
    .groupBy(sql`1`);

  const getBand = (k: string) => Number(bandRows.find((r) => String(r.band) === k)?.n ?? 0);

  return {
    pendingReview,
    returnedForCorrection,
    verified,
    duplicateFlags,
    highConfidence: getBand("high"),
    moderate: getBand("moderate"),
    reviewBand: getBand("review"),
    totalActive,
  };
}

/* -------------------------------------------------------------------------- */
/*  Verification queue                                                        */
/* -------------------------------------------------------------------------- */

export type QueueItem = {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  submittedAt: Date | null;
  submitterFirst: string | null;
  submitterLast: string | null;
};

export async function verificationQueue(user: SessionUser): Promise<QueueItem[]> {
  const scope = await userSectionScope(user);
  const where = scope
    ? and(scope, inArray(students.recordStatus, pendingRecordStatuses))
    : inArray(students.recordStatus, pendingRecordStatuses);

  return db
    .select({
      id: students.id,
      studentNumber: students.studentNumber,
      firstName: students.firstName,
      lastName: students.lastName,
      birthDate: students.birthDate,
      submittedAt: recordVerifications.submittedAt,
      submitterFirst: users.firstName,
      submitterLast: users.lastName,
    })
    .from(students)
    .leftJoin(
      recordVerifications,
      and(
        eq(recordVerifications.studentId, students.id),
        eq(recordVerifications.status, "pending"),
      ),
    )
    .leftJoin(users, eq(users.id, recordVerifications.submittedBy))
    .where(where)
    .orderBy(asc(recordVerifications.submittedAt))
    .limit(100);
}

/* -------------------------------------------------------------------------- */
/*  Duplicate review                                                          */
/* -------------------------------------------------------------------------- */

export type DuplicateItem = {
  id: string;
  studentId: string;
  possibleStudentId: string;
  matchScore: number | null;
  matchReasons: string[];
  status: string;
  reviewNotes: string | null;
  studentNumber: string;
  studentFirst: string;
  studentLast: string;
  studentBirth: string;
  studentSex: string;
  studentCreatedAt: Date | null;
  possibleNumber: string;
  possibleFirst: string;
  possibleLast: string;
  possibleBirth: string;
  possibleSex: string;
  possibleCreatedAt: Date | null;
};

export async function listDuplicates(
  status?: string,
  opts: { q?: string; band?: "high" | "moderate" | "review" } = {},
): Promise<DuplicateItem[]> {
  const conditions: SQL[] = [];
  if (status && status !== "all") conditions.push(eq(duplicateCandidates.status, status));

  // The Duplicates page search matches either side of the candidate pair.
  if (opts.q) {
    const needle = `%${opts.q}%`;
    conditions.push(
      sql`(${students.firstName} LIKE ${needle}
        OR ${students.lastName} LIKE ${needle}
        OR ${students.studentNumber} LIKE ${needle}
        OR ${possibleStudent.firstName} LIKE ${needle}
        OR ${possibleStudent.lastName} LIKE ${needle}
        OR ${possibleStudent.studentNumber} LIKE ${needle})`,
    );
  }
  // Confidence bands mirror the detector's scoring shown in the UI.
  if (opts.band === "high") conditions.push(sql`${duplicateCandidates.matchScore} >= 90`);
  if (opts.band === "moderate")
    conditions.push(
      sql`${duplicateCandidates.matchScore} >= 65 AND ${duplicateCandidates.matchScore} < 90`,
    );
  if (opts.band === "review")
    conditions.push(sql`${duplicateCandidates.matchScore} < 65`);

  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: duplicateCandidates.id,
      studentId: duplicateCandidates.studentId,
      possibleStudentId: duplicateCandidates.possibleStudentId,
      matchScore: duplicateCandidates.matchScore,
      matchReason: duplicateCandidates.matchReason,
      status: duplicateCandidates.status,
      reviewNotes: duplicateCandidates.reviewNotes,
      studentNumber: students.studentNumber,
      studentFirst: students.firstName,
      studentLast: students.lastName,
      studentBirth: students.birthDate,
      studentSex: students.sex,
      studentCreatedAt: students.createdAt,
      possibleNumber: possibleStudent.studentNumber,
      possibleFirst: possibleStudent.firstName,
      possibleLast: possibleStudent.lastName,
      possibleBirth: possibleStudent.birthDate,
      possibleSex: possibleStudent.sex,
      possibleCreatedAt: possibleStudent.createdAt,
    })
    .from(duplicateCandidates)
    .innerJoin(students, eq(students.id, duplicateCandidates.studentId))
    .innerJoin(possibleStudent, eq(possibleStudent.id, duplicateCandidates.possibleStudentId))
    .where(where)
    .orderBy(desc(duplicateCandidates.createdAt))
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
/*  Student development lists (assessments, behavior, interventions)          */
/* -------------------------------------------------------------------------- */

export type InterventionRow = {
  id: string;
  interventionType: string;
  description: string;
  status: string;
  startDate: string | null;
  targetDate: string | null;
  completedDate: string | null;
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  followupCount: number;
};

export async function listInterventions(
  user: SessionUser,
  status?: string,
  page = 1,
  pageSize = 50,
): Promise<InterventionRow[]> {
  const scope = (await userSectionScope(user)) ?? sql`1 = 1`;
  const conditions: SQL[] = [scope];
  if (status && status !== "all") conditions.push(eq(interventions.status, status));

  const offset = (page - 1) * pageSize;

  const rows = await db
    .select({
      id: interventions.id,
      interventionType: interventions.interventionType,
      description: interventions.description,
      status: interventions.status,
      startDate: interventions.startDate,
      targetDate: interventions.targetDate,
      completedDate: interventions.completedDate,
      studentId: students.id,
      studentNumber: students.studentNumber,
      firstName: students.firstName,
      lastName: students.lastName,
    })
    .from(interventions)
    .innerJoin(students, eq(students.id, interventions.studentId))
    .where(and(...conditions))
    .orderBy(desc(interventions.createdAt))
    .limit(pageSize)
    .offset(offset);

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

export type AssessmentRow = {
  id: string;
  domain: string;
  assessmentType: string | null;
  date: string;
  level: string | null;
  score: number | null;
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  gradeLevelName: string | null;
};

export async function listAssessments(
  user: SessionUser,
  domain?: AssessmentDomain,
  page = 1,
  pageSize = 50,
): Promise<AssessmentRow[]> {
  const scope = (await userSectionScope(user)) ?? sql`1 = 1`;
  const conditions: SQL[] = [scope];
  if (domain) conditions.push(eq(assessments.domain, domain));

  const offset = (page - 1) * pageSize;

  return db
    .select({
      id: assessments.id,
      domain: assessments.domain,
      assessmentType: assessments.assessmentType,
      date: assessments.date,
      level: assessments.level,
      score: assessments.score,
      studentId: students.id,
      studentNumber: students.studentNumber,
      firstName: students.firstName,
      lastName: students.lastName,
      gradeLevelName: gradeLevels.name,
    })
    .from(assessments)
    .innerJoin(students, eq(students.id, assessments.studentId))
    .leftJoin(
      studentEnrollments,
      and(eq(studentEnrollments.studentId, students.id), eq(studentEnrollments.status, "active")),
    )
    .leftJoin(gradeLevels, eq(gradeLevels.id, studentEnrollments.gradeLevelId))
    .where(and(...conditions))
    .orderBy(desc(assessments.date))
    .limit(pageSize)
    .offset(offset);
}

export type BehaviorRow = {
  id: string;
  date: string;
  description: string;
  severity: string | null;
  status: string;
  categoryName: string;
  categoryKind: string;
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
};

export async function listBehaviorRecords(
  user: SessionUser,
  kind?: string,
  page = 1,
  pageSize = 50,
): Promise<BehaviorRow[]> {
  const scope = (await userSectionScope(user)) ?? sql`1 = 1`;
  const conditions: SQL[] = [scope];
  if (kind && kind !== "all") conditions.push(eq(behaviorCategories.kind, kind));

  const offset = (page - 1) * pageSize;

  return db
    .select({
      id: behaviorRecords.id,
      date: behaviorRecords.date,
      description: behaviorRecords.description,
      severity: behaviorRecords.severity,
      status: behaviorRecords.status,
      categoryName: behaviorCategories.name,
      categoryKind: behaviorCategories.kind,
      studentId: students.id,
      studentNumber: students.studentNumber,
      firstName: students.firstName,
      lastName: students.lastName,
    })
    .from(behaviorRecords)
    .innerJoin(behaviorCategories, eq(behaviorCategories.id, behaviorRecords.categoryId))
    .innerJoin(students, eq(students.id, behaviorRecords.studentId))
    .where(and(...conditions))
    .orderBy(desc(behaviorRecords.date))
    .limit(pageSize)
    .offset(offset);
}

export async function listBehaviorCategories() {
  return db
    .select({
      id: behaviorCategories.id,
      name: behaviorCategories.name,
      kind: behaviorCategories.kind,
    })
    .from(behaviorCategories)
    .orderBy(asc(behaviorCategories.kind), asc(behaviorCategories.name));
}

/* -------------------------------------------------------------------------- */
/*  Performance analytics (grade & attendance aggregates)                     */
/* -------------------------------------------------------------------------- */

export type SubjectAverage = { subject: string; code: string; average: number; count: number };
export type GradeLevelAverage = { gradeLevel: string; average: number; count: number };
export type PeriodAverage = { period: string; average: number; count: number };
export type AttendanceRate = { label: string; present: number; total: number; rate: number };

export type PerformanceOverview = {
  schoolYear: string | null;
  subjectAverages: SubjectAverage[];
  gradeAverages: GradeLevelAverage[];
  periodAverages: PeriodAverage[];
  attendanceByGrade: AttendanceRate[];
  assessmentLevels: { domain: string; level: string; count: number }[];
  failingCounts: { subject: string; below75: number; total: number }[];
};

/**
 * School-wide performance aggregates for the current (or given) school year.
 * Averages use SQLite `avg` over recorded grades; attendance rate counts
 * present/late rows over all rows of the year.
 */
export async function performanceOverview(schoolYearId?: string): Promise<PerformanceOverview> {
  const current = await getCurrentSchoolYear();
  const yearId = schoolYearId ?? current?.id ?? "";
  const yearLabel = current?.year ?? null;

  const enrollmentScope = db
    .select({ id: studentEnrollments.id })
    .from(studentEnrollments)
    .where(eq(studentEnrollments.schoolYearId, yearId))
    .as("sy_enrollments");

  const [subjectRows, gradeRows, periodRows, attendanceRows, levelRows, failingRows] =
    await Promise.all([
      db
        .select({
          subject: subjects.name,
          code: subjects.code,
          average: sql<number>`round(avg(${studentGrades.grade}), 1)`,
          count: count(),
        })
        .from(studentGrades)
        .innerJoin(
          enrollmentScope,
          sql`${enrollmentScope.id} = ${studentGrades.enrollmentId}`,
        )
        .innerJoin(subjects, eq(subjects.id, studentGrades.subjectId))
        .groupBy(subjects.id)
        .orderBy(asc(subjects.code)),

      db
        .select({
          gradeLevel: gradeLevels.name,
          average: sql<number>`round(avg(${studentGrades.grade}), 1)`,
          count: count(),
        })
        .from(studentGrades)
        .innerJoin(
          enrollmentScope,
          sql`${enrollmentScope.id} = ${studentGrades.enrollmentId}`,
        )
        .innerJoin(studentEnrollments, eq(studentEnrollments.id, studentGrades.enrollmentId))
        .innerJoin(gradeLevels, eq(gradeLevels.id, studentEnrollments.gradeLevelId))
        .groupBy(gradeLevels.id)
        .orderBy(asc(gradeLevels.orderIndex)),

      db
        .select({
          period: gradingPeriods.name,
          average: sql<number>`round(avg(${studentGrades.grade}), 1)`,
          count: count(),
        })
        .from(studentGrades)
        .innerJoin(
          enrollmentScope,
          sql`${enrollmentScope.id} = ${studentGrades.enrollmentId}`,
        )
        .innerJoin(gradingPeriods, eq(gradingPeriods.id, studentGrades.gradingPeriodId))
        .groupBy(gradingPeriods.id)
        .orderBy(asc(gradingPeriods.orderIndex)),

      db
        .select({
          gradeLevel: gradeLevels.name,
          present:
            sql<number>`sum(case when ${attendanceRecords.status} in ('present', 'late') then 1 else 0 end)`,
          total: count(),
        })
        .from(attendanceRecords)
        .innerJoin(
          enrollmentScope,
          sql`${enrollmentScope.id} = ${attendanceRecords.enrollmentId}`,
        )
        .innerJoin(studentEnrollments, eq(studentEnrollments.id, attendanceRecords.enrollmentId))
        .innerJoin(gradeLevels, eq(gradeLevels.id, studentEnrollments.gradeLevelId))
        .groupBy(gradeLevels.id)
        .orderBy(asc(gradeLevels.orderIndex)),

      db
        .select({
          domain: assessments.domain,
          level: assessments.level,
          count: count(),
        })
        .from(assessments)
        .groupBy(assessments.domain, assessments.level)
        .orderBy(asc(assessments.domain)),

      db
        .select({
          subject: subjects.name,
          below75:
            sql<number>`sum(case when ${studentGrades.grade} < 75 then 1 else 0 end)`,
          total: count(),
        })
        .from(studentGrades)
        .innerJoin(
          enrollmentScope,
          sql`${enrollmentScope.id} = ${studentGrades.enrollmentId}`,
        )
        .innerJoin(subjects, eq(subjects.id, studentGrades.subjectId))
        .groupBy(subjects.id)
        .orderBy(asc(subjects.code)),
    ]);

  const num = (v: unknown): number => (v == null ? 0 : Number(v));

  return {
    schoolYear: yearLabel,
    subjectAverages: subjectRows.map((r) => ({
      subject: r.subject,
      code: r.code,
      average: num(r.average),
      count: r.count,
    })),
    gradeAverages: gradeRows.map((r) => ({
      gradeLevel: r.gradeLevel,
      average: num(r.average),
      count: r.count,
    })),
    periodAverages: periodRows.map((r) => ({
      period: r.period,
      average: num(r.average),
      count: r.count,
    })),
    attendanceByGrade: attendanceRows.map((r) => {
      const present = num(r.present);
      const total = num(r.total);
      return {
        label: r.gradeLevel,
        present,
        total,
        rate: total > 0 ? Math.round((present / total) * 1000) / 10 : 0,
      };
    }),
    assessmentLevels: levelRows.map((r) => ({
      domain: r.domain,
      level: r.level ?? "Unspecified",
      count: r.count,
    })),
    failingCounts: failingRows.map((r) => ({
      subject: r.subject,
      below75: num(r.below75),
      total: r.total,
    })),
  };
}

/* -------------------------------------------------------------------------- */
/*  Users / audit / notifications                                             */
/* -------------------------------------------------------------------------- */

export async function listUsersWithRoles(page = 1, pageSize = 25) {
  const offset = (page - 1) * pageSize;
  return db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      roleLabel: roles.name,
      roleId: users.roleId,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .orderBy(asc(users.createdAt))
    .limit(pageSize)
    .offset(offset);
}

export async function listAuditLogs(page = 1, limit = 50) {
  const offset = (page - 1) * limit;
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
    .limit(limit)
    .offset(offset);
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

