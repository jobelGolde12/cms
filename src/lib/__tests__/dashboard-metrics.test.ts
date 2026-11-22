/**
 * Integration tests for dashboard metric calculations.
 *
 * Runs against a throwaway SQLite file (never the dev/prod database):
 *  - behavior-concern percentage counts only concern-type records and active,
 *    non-duplicate students, and ignores resolved records;
 *  - the attendance rate counts present + late over recorded rows, and the
 *    attendance KPI/breakdown only surface for roles holding attendance.view.
 */
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth";

process.env.TURSO_DATABASE_URL = `file:${path.resolve(".tmp-integration", "dashboard-metrics.db")}`;

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  unstable_cache: (fn: unknown) => fn,
  unstable_noStore: () => {},
}));

const DB_FILE = process.env.TURSO_DATABASE_URL.replace(/^file:/, "");
rmSync(DB_FILE, { force: true });
rmSync(`${DB_FILE}-wal`, { force: true });
rmSync(`${DB_FILE}-shm`, { force: true });
mkdirSync(".tmp-integration", { recursive: true });

const { migrate } = await import("drizzle-orm/libsql/migrator");
const { db } = await import("@/db");
const {
  attendanceRecords,
  behaviorCategories,
  behaviorRecords,
  gradeLevels,
  roles,
  schoolYears,
  sections,
  studentEnrollments,
  students,
  users,
} = (await import("@/db/schema")) as typeof import("@/db/schema");
const { dashboardData } = await import("@/lib/dashboard-data");
const { behaviorConcernSummary } = await import("@/lib/queries");

const ids = {
  admin: randomUUID(),
  teacher: randomUUID(),
  subjectTeacher: randomUUID(),
  schoolYear: randomUUID(),
  gradeLevel: randomUUID(),
  section: randomUUID(),
  studentA: randomUUID(),
  studentB: randomUUID(),
  studentC: randomUUID(),
  enrollmentA: randomUUID(),
  enrollmentB: randomUUID(),
  enrollmentC: randomUUID(),
  concernCategory: randomUUID(),
  positiveCategory: randomUUID(),
};

function userOf(id: string, role: SessionUser["role"]): SessionUser {
  return {
    id,
    email: `${role}@test.example`,
    firstName: "Test",
    lastName: role,
    roleId: `role-${role}`,
    role,
    roles: [role],
  };
}

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./drizzle" });

  await db.insert(roles).values([
    { id: "role-admin", name: "Admin" },
    { id: "role-teacher", name: "Adviser" },
    { id: "role-subject-teacher", name: "Subject Teacher" },
  ]);

  await db.insert(users).values([
    {
      id: ids.admin,
      roleId: "role-admin",
      firstName: "Ada",
      lastName: "Admin",
      email: "ada.admin@test.example",
      passwordHash: "test-hash",
    },
    {
      id: ids.teacher,
      roleId: "role-teacher",
      firstName: "Tess",
      lastName: "Teacher",
      email: "tess.teacher@test.example",
      passwordHash: "test-hash",
    },
    {
      id: ids.subjectTeacher,
      roleId: "role-subject-teacher",
      firstName: "Sam",
      lastName: "Subject",
      email: "sam.subject@test.example",
      passwordHash: "test-hash",
    },
  ]);

  await db.insert(schoolYears).values({ id: ids.schoolYear, year: "2026-2027", isCurrent: true });
  await db.insert(gradeLevels).values({ id: ids.gradeLevel, name: "Grade 7", orderIndex: 1 });
  await db.insert(sections).values({
    id: ids.section,
    schoolYearId: ids.schoolYear,
    gradeLevelId: ids.gradeLevel,
    name: "A",
    adviserId: ids.teacher,
  });

  await db.insert(students).values([
    {
      id: ids.studentA,
      studentNumber: "SM-2026-910001",
      firstName: "Pia",
      lastName: "Alpha",
      sex: "female",
      status: "active",
      recordStatus: "verified",
      createdBy: ids.admin,
      updatedBy: ids.admin,
    },
    {
      id: ids.studentB,
      studentNumber: "SM-2026-910002",
      firstName: "Ben",
      lastName: "Beta",
      sex: "male",
      status: "active",
      recordStatus: "verified",
      createdBy: ids.admin,
      updatedBy: ids.admin,
    },
    {
      id: ids.studentC,
      studentNumber: "SM-2026-910003",
      firstName: "Cleo",
      lastName: "Gamma",
      sex: "female",
      status: "active",
      recordStatus: "verified",
      createdBy: ids.admin,
      updatedBy: ids.admin,
    },
  ]);

  await db.insert(studentEnrollments).values([
    {
      id: ids.enrollmentA,
      studentId: ids.studentA,
      schoolYearId: ids.schoolYear,
      gradeLevelId: ids.gradeLevel,
      sectionId: ids.section,
      status: "active",
      recordedBy: ids.admin,
    },
    {
      id: ids.enrollmentB,
      studentId: ids.studentB,
      schoolYearId: ids.schoolYear,
      gradeLevelId: ids.gradeLevel,
      sectionId: ids.section,
      status: "active",
      recordedBy: ids.admin,
    },
    {
      id: ids.enrollmentC,
      studentId: ids.studentC,
      schoolYearId: ids.schoolYear,
      gradeLevelId: ids.gradeLevel,
      sectionId: ids.section,
      status: "active",
      recordedBy: ids.admin,
    },
  ]);

  await db.insert(behaviorCategories).values([
    { id: ids.concernCategory, name: "Tardiness", kind: "concern" },
    { id: ids.positiveCategory, name: "Helping Others", kind: "positive" },
  ]);

  // Two of three active students carry an unresolved concern (A open, B
  // monitored). C has only a positive record and a resolved concern — neither
  // may count toward the open-concern rate.
  await db.insert(behaviorRecords).values([
    {
      id: randomUUID(),
      studentId: ids.studentA,
      categoryId: ids.concernCategory,
      date: "2026-11-01",
      description: "Open concern for A",
      status: "open",
      confidential: false,
      recordedBy: ids.teacher,
    },
    {
      id: randomUUID(),
      studentId: ids.studentB,
      categoryId: ids.concernCategory,
      date: "2026-11-02",
      description: "Monitored concern for B",
      status: "monitored",
      confidential: false,
      recordedBy: ids.teacher,
    },
    {
      id: randomUUID(),
      studentId: ids.studentC,
      categoryId: ids.positiveCategory,
      date: "2026-11-03",
      description: "Positive recognition for C",
      status: "open",
      confidential: false,
      recordedBy: ids.teacher,
    },
    {
      id: randomUUID(),
      studentId: ids.studentC,
      categoryId: ids.concernCategory,
      date: "2026-11-04",
      description: "Resolved concern for C",
      status: "resolved",
      confidential: false,
      recordedBy: ids.teacher,
    },
  ]);

  // Three recorded rows: present + late count as attended (2/3 = 67%).
  await db.insert(attendanceRecords).values([
    {
      id: randomUUID(),
      enrollmentId: ids.enrollmentA,
      date: "2026-11-10",
      status: "present",
      recordedBy: ids.teacher,
    },
    {
      id: randomUUID(),
      enrollmentId: ids.enrollmentB,
      date: "2026-11-10",
      status: "late",
      recordedBy: ids.teacher,
    },
    {
      id: randomUUID(),
      enrollmentId: ids.enrollmentC,
      date: "2026-11-10",
      status: "absent_unexcused",
      recordedBy: ids.teacher,
    },
  ]);
});

afterAll(() => {
  rmSync(DB_FILE, { force: true });
});

describe("dashboard behavior-concern metrics", () => {
  it("counts only unresolved concern records for active students", async () => {
    const data = await dashboardData(userOf(ids.admin, "admin"));

    expect(data.behaviorConcernRate).toBe(67);
    expect(data.openConcerns.reduce((sum, row) => sum + row.value, 0)).toBe(2);
    expect(data.openConcerns).toEqual([{ label: "Tardiness", value: 2 }]);

    const kpi = data.kpis.find((k) => k.key === "behavior");
    expect(kpi?.value).toBe(2);
    expect(kpi?.progress).toBe(67);
    expect(kpi?.description).toContain("67%");
  });

  it("summarizes the same percentages for the development page", async () => {
    const summary = await behaviorConcernSummary(userOf(ids.admin, "admin"));

    expect(summary).toMatchObject({
      total: 3,
      open: 1,
      monitored: 1,
      resolved: 1,
      unresolvedRate: 67,
      studentsWithOpenConcern: 2,
      totalStudents: 3,
      studentConcernRate: 67,
    });
  });

  it("hides behavior and attendance metrics from roles without those permissions", async () => {
    const data = await dashboardData(userOf(ids.subjectTeacher, "subject_teacher"));

    expect(data.kpis.some((k) => k.key === "behavior")).toBe(false);
    expect(data.kpis.some((k) => k.key === "attendance")).toBe(false);
  });
});

describe("dashboard attendance metrics", () => {
  it("computes the rate from present + late over recorded rows", async () => {
    const data = await dashboardData(userOf(ids.teacher, "teacher"));

    expect(data.attendance).toMatchObject({
      present: 2,
      late: 1,
      absent: 1,
      total: 3,
      rate: 67,
    });
    expect(data.attendanceByGrade).toEqual([
      { label: "Grade 7", present: 2, total: 3, rate: 67 },
    ]);

    const kpi = data.kpis.find((k) => k.key === "attendance");
    expect(kpi?.value).toBe(67);
    expect(kpi?.progress).toBe(67);
  });
});
