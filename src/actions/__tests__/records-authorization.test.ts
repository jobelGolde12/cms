/**
 * Integration tests for the record-mutation authorization fixes.
 *
 * Regression coverage for:
 *  - SEC-001: `saveBehavior` must not edit a behavior record that belongs to a
 *    DIFFERENT student than the one posted (cross-student write / IDOR).
 *  - SEC-002: the Guidance Office module must not edit or delete a classroom
 *    behavior record, nor a record of another student.
 *  - SEC-003: `saveGrade` must require the caller's (section, subject) teaching
 *    assignment — holding `grades.write` is not enough.
 *
 * Runs against a throwaway SQLite file (never the dev/prod database) using the
 * same harness style as `students-actions.test.ts`.
 */
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

process.env.TURSO_DATABASE_URL = `file:${path.resolve(".tmp-integration", "records-authz.db")}`;

const mocks = vi.hoisted(() => ({ cookie: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "sms_session" && mocks.cookie ? { name, value: mocks.cookie } : undefined,
    set: () => {},
    delete: () => {},
  }),
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
  behaviorCategories,
  behaviorRecords,
  gradeLevels,
  gradingPeriods,
  roles,
  schoolYears,
  sectionSubjectTeachers,
  sections,
  sessions,
  studentEnrollments,
  students,
  subjects,
  users,
} = (await import("@/db/schema")) as typeof import("@/db/schema");
const { hashToken } = await import("@/lib/auth");
const { saveBehavior, saveGrade } = await import("@/actions/records");
const { removeGuidanceIncident, saveGuidanceIncident } = await import("@/actions/guidance");

const TOKENS = {
  admin: "token-admin",
  adviser: "token-adviser",
  subjectTeacher: "token-subject-teacher",
  guidance: "token-guidance",
};

const ids = {
  admin: randomUUID(),
  adviser: randomUUID(),
  subjectTeacher: randomUUID(),
  guidance: randomUUID(),
  schoolYear: randomUUID(),
  gradeLevel: "gl-8",
  sectionA: randomUUID(),
  sectionB: randomUUID(),
  studentA: randomUUID(),
  studentB: randomUUID(),
  enrollmentA: randomUUID(),
  enrollmentB: randomUUID(),
  category: randomUUID(),
  behaviorOnB: randomUUID(),
  subjectAssigned: randomUUID(),
  subjectNotAssigned: randomUUID(),
  gradingPeriod: randomUUID(),
};

async function seedUserWithSession(
  id: string,
  roleId: string,
  firstName: string,
  lastName: string,
  token: string,
) {
  await db.insert(users).values({
    id,
    roleId,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.example`,
    passwordHash: "test-hash",
  });
  await db.insert(sessions).values({
    id: randomUUID(),
    tokenHash: hashToken(token),
    userId: id,
    expiresAt: new Date(Date.now() + 60 * 60_000),
  });
}

function behaviorForm(fields: { studentId: string; recordId?: string }) {
  const form = new FormData();
  form.set("studentId", fields.studentId);
  form.set("categoryId", ids.category);
  form.set("date", "2026-11-10");
  form.set("description", "Cross-student write attempt");
  form.set("status", "open");
  if (fields.recordId) form.set("id", fields.recordId);
  return form;
}

function gradeForm(subjectId: string) {
  const form = new FormData();
  form.set("enrollmentId", ids.enrollmentA);
  form.set("subjectId", subjectId);
  form.set("gradingPeriodId", ids.gradingPeriod);
  form.set("grade", "91");
  return form;
}

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./drizzle" });

  await db.insert(roles).values([
    { id: "role-admin", name: "Admin" },
    { id: "role-teacher", name: "Adviser" },
    { id: "role-subject-teacher", name: "Subject Teacher" },
    { id: "role-guidance", name: "Guidance" },
  ]);
  await seedUserWithSession(ids.admin, "role-admin", "Ada", "Admin", TOKENS.admin);
  await seedUserWithSession(ids.adviser, "role-teacher", "Ana", "Adviser", TOKENS.adviser);
  await seedUserWithSession(
    ids.subjectTeacher,
    "role-subject-teacher",
    "Sam",
    "Subject",
    TOKENS.subjectTeacher,
  );
  await seedUserWithSession(ids.guidance, "role-guidance", "Gina", "Guidance", TOKENS.guidance);

  await db.insert(schoolYears).values({ id: ids.schoolYear, year: "2026-2027", isCurrent: true });
  await db.insert(gradeLevels).values({ id: ids.gradeLevel, name: "Grade 8", orderIndex: 2 });
  await db.insert(sections).values([
    { id: ids.sectionA, schoolYearId: ids.schoolYear, gradeLevelId: ids.gradeLevel, name: "A", adviserId: ids.adviser },
    { id: ids.sectionB, schoolYearId: ids.schoolYear, gradeLevelId: ids.gradeLevel, name: "B", adviserId: ids.admin },
  ]);

  await db.insert(students).values([
    {
      id: ids.studentA,
      studentNumber: "SM-2026-900001",
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
      studentNumber: "SM-2026-900002",
      firstName: "Ben",
      lastName: "Beta",
      sex: "male",
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
      sectionId: ids.sectionA,
      status: "active",
      recordedBy: ids.admin,
    },
    {
      id: ids.enrollmentB,
      studentId: ids.studentB,
      schoolYearId: ids.schoolYear,
      gradeLevelId: ids.gradeLevel,
      sectionId: ids.sectionB,
      status: "active",
      recordedBy: ids.admin,
    },
  ]);

  await db.insert(behaviorCategories).values({ id: ids.category, name: "Tardiness", kind: "concern" });
  // A classroom (non-confidential) behavior record belonging to student B.
  await db.insert(behaviorRecords).values({
    id: ids.behaviorOnB,
    studentId: ids.studentB,
    categoryId: ids.category,
    date: "2026-11-01",
    description: "Original observation for student B",
    status: "open",
    confidential: false,
    recordedBy: ids.admin,
  });

  await db.insert(subjects).values([
    { id: ids.subjectAssigned, code: "MATH8", name: "Mathematics 8" },
    { id: ids.subjectNotAssigned, code: "SCI8", name: "Science 8" },
  ]);
  await db.insert(gradingPeriods).values({
    id: ids.gradingPeriod,
    schoolYearId: ids.schoolYear,
    name: "First Quarter",
    orderIndex: 1,
    isCurrent: true,
  });
  // The subject teacher is assigned to Mathematics in section A only.
  await db.insert(sectionSubjectTeachers).values({
    id: randomUUID(),
    sectionId: ids.sectionA,
    subjectId: ids.subjectAssigned,
    teacherId: ids.subjectTeacher,
  });
});

afterAll(() => {
  rmSync(DB_FILE, { force: true });
});

describe("saveBehavior — record ownership (SEC-001)", () => {
  it("rejects updating a behavior record that belongs to another student", async () => {
    mocks.cookie = TOKENS.adviser;
    const result = await saveBehavior({ ok: false, error: "" }, behaviorForm({
      studentId: ids.studentA, // in the adviser's scope
      recordId: ids.behaviorOnB, // but the record belongs to student B
    }));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("different student");

    // The record was not modified.
    const [record] = await db
      .select({ studentId: behaviorRecords.studentId })
      .from(behaviorRecords)
      .where(eq(behaviorRecords.id, ids.behaviorOnB));
    expect(record.studentId).toBe(ids.studentB);
  });

  it("allows creating a behavior record for a student in the adviser's section", async () => {
    mocks.cookie = TOKENS.adviser;
    const result = await saveBehavior({ ok: false, error: "" }, behaviorForm({ studentId: ids.studentA }));
    expect(result.ok).toBe(true);

    const rows = await db
      .select({ id: behaviorRecords.id })
      .from(behaviorRecords)
      .where(eq(behaviorRecords.studentId, ids.studentA));
    expect(rows.length).toBe(1);
  });
});

describe("saveGrade — (section, subject) assignment (SEC-003)", () => {
  it("rejects a subject the caller does not teach in that section", async () => {
    mocks.cookie = TOKENS.subjectTeacher;
    const result = await saveGrade({ ok: false, error: "" }, gradeForm(ids.subjectNotAssigned));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("not assigned");
  });

  it("accepts a grade for the assigned (section, subject) pair", async () => {
    mocks.cookie = TOKENS.subjectTeacher;
    const result = await saveGrade({ ok: false, error: "" }, gradeForm(ids.subjectAssigned));
    expect(result.ok).toBe(true);
  });
});

describe("Guidance incident module domain isolation (SEC-002)", () => {
  it("rejects editing a classroom behavior record through the guidance module", async () => {
    mocks.cookie = TOKENS.guidance;
    const form = behaviorForm({ studentId: ids.studentB, recordId: ids.behaviorOnB });

    const result = await saveGuidanceIncident({ ok: false, error: "" }, form);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Guidence|Guidance|classroom behavior record|different student/);
    }
  });

  it("rejects deleting a classroom behavior record through the guidance module", async () => {
    mocks.cookie = TOKENS.guidance;
    const form = new FormData();
    form.set("id", ids.behaviorOnB);

    const result = await removeGuidanceIncident(form);
    expect(result.ok).toBe(false);

    // Still present.
    const rows = await db
      .select({ id: behaviorRecords.id })
      .from(behaviorRecords)
      .where(eq(behaviorRecords.id, ids.behaviorOnB));
    expect(rows.length).toBe(1);
  });

  it("allows the administrator tier to record a confidential incident", async () => {
    mocks.cookie = TOKENS.admin;
    const result = await saveGuidanceIncident(
      { ok: false, error: "" },
      behaviorForm({ studentId: ids.studentB }),
    );
    expect(result.ok).toBe(true);

    const rows = await db
      .select({ confidential: behaviorRecords.confidential })
      .from(behaviorRecords)
      .where(eq(behaviorRecords.studentId, ids.studentB));
    expect(rows.some((r) => r.confidential === true)).toBe(true);
  });
});
