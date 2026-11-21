/**
 * Integration tests for the student mutation actions against a throwaway
 * SQLite file database (never the dev/prod database).
 *
 * The database URL is set BEFORE "@/db" is imported (dynamic imports below)
 * so every query in this file runs on its own database file. Schema comes
 * from the drizzle migrations; seed data is minimal per-suite.
 *
 * Auth is exercised the same way the app does it: a session row + cookie,
 * with `next/headers` mocked to serve that cookie to `getAuthorizedUser()`.
 */
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

process.env.TURSO_DATABASE_URL = `file:${path.resolve(".tmp-integration", "actions-test.db")}`;

// Mocks are hoisted to the top of the file so dynamic imports pick them up.
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

// A stale database file must never leak into this run.
rmSync(DB_FILE, { force: true });
rmSync(`${DB_FILE}-wal`, { force: true });
rmSync(`${DB_FILE}-sho`, { force: true });
mkdirSync(".tmp-integration", { recursive: true });

const { migrate } = await import("drizzle-orm/libsql/migrator");
const { db } = await import("@/db");
const {
  roles,
  users,
  sessions,
  students,
  studentGuardians,
  recordVerifications,
  notifications,
  gradeLevels,
  schoolYears,
  sections,
  subjects,
  employees,
  attendanceRecords,
  gradingPeriods,
  sectionSubjectTeachers,
  studentGrades,
  studentEnrollments,
} = (await import("@/db/schema")) as typeof import("@/db/schema");
const { hashToken } = await import("@/lib/auth");
const { createStudent, updateStudent, reviewVerification } = await import("@/actions/students");
const { createSection } = await import("@/actions/sections");
const { saveAttendance, saveEnrollment, saveGrade } = await import("@/actions/records");
const { assignAdviser } = await import("@/actions/assignments");
const { saveSectionGradeDraft } = await import("@/actions/grades");
const { createEmployee } = await import("@/actions/employees");
const { validateTeachingLoads } = await import("@/lib/teaching-loads");

type ActionState = Awaited<ReturnType<typeof createStudent>>;

const TOKENS = {
  admin: "test-token-admin",
  nurse: "test-token-nurse",
  records: "test-token-records",
  subjectTeacher: "test-token-subject-teacher",
};

const LEGACY_GRADE_FIXTURE = {
  gradeLevelId: "gl-12",
  schoolYearId: "school-year-grade-scope",
  sectionId: "section-grade-12",
  subjectId: "subject-grade-scope",
  teacherId: "teacher-grade-scope",
  gradingPeriodId: "grading-period-grade-scope",
  studentId: "student-grade-12",
  enrollmentId: "enrollment-grade-12",
};

function seedUser(id: string, roleId: string, firstName: string, lastName: string) {
  return {
    id,
    roleId,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.example`,
    passwordHash: "test-hash",
  };
}

async function seedUserWithSession(
  id: string,
  roleId: string,
  firstName: string,
  lastName: string,
  token: string,
) {
  await db.insert(users).values(seedUser(id, roleId, firstName, lastName));
  await db.insert(sessions).values({
    id: randomUUID(),
    tokenHash: hashToken(token),
    userId: id,
    expiresAt: new Date(Date.now() + 60 * 60_000),
  });
}

const buildStudentForm = (): FormData => {
  const form = new FormData();
  form.set("intent", "draft");
  form.set("firstName", "Maria");
  form.set("lastName", "Santos");
  form.set("sex", "female");
  form.set("birthDate", "2011-05-04");
  form.set("guardianFirstName", "Lorna");
  form.set("guardianLastName", "Santos");
  form.set("guardianRelationship", "mother");
  return form;
};

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./drizzle" });
  await db.insert(roles).values([
    { id: "role-admin", name: "Admin" },
    { id: "role-nurse", name: "Nurse" },
    { id: "role-records", name: "Records" },
    { id: "role-teacher", name: "Teacher" },
    { id: "role-subject-teacher", name: "Subject Teacher" },
  ]);
  await seedUserWithSession(randomUUID(), "role-admin", "Ada", "Admin", TOKENS.admin);
  await seedUserWithSession(randomUUID(), "role-nurse", "Nur", "Nurse", TOKENS.nurse);
  await seedUserWithSession(randomUUID(), "role-records", "Rita", "Records", TOKENS.records);
  await seedUserWithSession(
    LEGACY_GRADE_FIXTURE.teacherId,
    "role-subject-teacher",
    "Teacher",
    "GradeScope",
    TOKENS.subjectTeacher,
  );

  // A legacy Grade 12 section lets action tests prove that pre-migration data
  // is rejected rather than silently treated as a supported grade.
  await db.insert(schoolYears).values({
    id: LEGACY_GRADE_FIXTURE.schoolYearId,
    year: "2026-2027",
  });
  await db.insert(gradeLevels).values({
    id: LEGACY_GRADE_FIXTURE.gradeLevelId,
    name: "Grade 12",
    orderIndex: 5,
  });
  await db.insert(subjects).values({
    id: LEGACY_GRADE_FIXTURE.subjectId,
    code: "SUBJ-GS",
    name: "Grade Scope Subject",
  });
  await db.insert(gradingPeriods).values({
    id: LEGACY_GRADE_FIXTURE.gradingPeriodId,
    schoolYearId: LEGACY_GRADE_FIXTURE.schoolYearId,
    name: "Term 1",
    orderIndex: 1,
  });
  await db.insert(sections).values({
    id: LEGACY_GRADE_FIXTURE.sectionId,
    schoolYearId: LEGACY_GRADE_FIXTURE.schoolYearId,
    gradeLevelId: LEGACY_GRADE_FIXTURE.gradeLevelId,
    name: "Legacy Grade 12",
  });
  await db.insert(sectionSubjectTeachers).values({
    id: "assignment-grade-12",
    sectionId: LEGACY_GRADE_FIXTURE.sectionId,
    subjectId: LEGACY_GRADE_FIXTURE.subjectId,
    teacherId: LEGACY_GRADE_FIXTURE.teacherId,
  });
  await db.insert(students).values({
    id: LEGACY_GRADE_FIXTURE.studentId,
    studentNumber: "SM-2026-990012",
    firstName: "Legacy",
    lastName: "Student",
    sex: "female",
    createdBy: LEGACY_GRADE_FIXTURE.teacherId,
  });
  await db.insert(studentEnrollments).values({
    id: LEGACY_GRADE_FIXTURE.enrollmentId,
    studentId: LEGACY_GRADE_FIXTURE.studentId,
    schoolYearId: LEGACY_GRADE_FIXTURE.schoolYearId,
    gradeLevelId: LEGACY_GRADE_FIXTURE.gradeLevelId,
    sectionId: LEGACY_GRADE_FIXTURE.sectionId,
    status: "active",
    recordedBy: LEGACY_GRADE_FIXTURE.teacherId,
  });
});

afterAll(async () => {
  // The file database is disposable; keep it out of the repo state.
  rmSync(DB_FILE, { force: true });
});

describe("createStudent", () => {
  it("persists a draft record with a linked guardian for an authorized user", async () => {
    mocks.cookie = TOKENS.admin;

    const result = (await createStudent({ ok: false, error: "" }, buildStudentForm())) as Extract<
      ActionState,
      { ok: true }
    >;

    expect(result.ok).toBe(true);
    const studentId = (result.redirectTo ?? "").split("/students/")[1];
    expect(studentId).toBeTruthy();

    const [student] = await db.select().from(students).where(eq(students.id, studentId!));
    expect(student).toBeDefined();
    expect(student!.firstName).toBe("Maria");
    expect(student!.recordStatus).toBe("draft");
    expect(student!.status).toBe("active");
    expect(student!.studentNumber).toMatch(/^SM-\d{4}-\d{6}$/);

    // Primary guardian is linked through student_guardians.
    const links = await db
      .select()
      .from(studentGuardians)
      .where(eq(studentGuardians.studentId, studentId!));
    expect(links.length).toBe(1);
    expect(links[0].isPrimary).toBe(true);
  });

  it("denies a role without students.create and writes nothing", async () => {
    mocks.cookie = TOKENS.nurse;
    const before = (await db.select().from(students)).length;
    const result = await createStudent({ ok: false, error: "" }, buildStudentForm());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("permission");
    const after = (await db.select().from(students)).length;
    expect(after).toBe(before);
  });

  it("rejects an unsupported Grade 12 enrollment and writes nothing", async () => {
    mocks.cookie = TOKENS.admin;
    const form = buildStudentForm();
    form.set("schoolYearId", "school-year-1");
    form.set("gradeLevelId", "gl-12");
    form.set("sectionId", "section-12");

    const before = (await db.select().from(students)).length;
    const result = await createStudent({ ok: false, error: "" }, form);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Grades 7–10/i);
    expect((await db.select().from(students)).length).toBe(before);
  });

  it("rejects invalid forms with fieldErrors and does not write", async () => {
    mocks.cookie = TOKENS.admin;
    const form = buildStudentForm();
    form.set("firstName", "");

    const before = (await db.select().from(students)).length;
    const result = await createStudent({ ok: false, error: "" }, form);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.firstName).toBeTruthy();
    expect((await db.select().from(students)).length).toBe(before);
  });
});

describe("createSection", () => {
  it("rejects an unsupported Grade 12 section and writes nothing", async () => {
    mocks.cookie = TOKENS.admin;
    const form = new FormData();
    form.set("schoolYearId", "school-year-1");
    form.set("gradeLevelId", "gl-12");
    form.set("name", "Unsupported Grade");

    const before = (await db.select().from(sections)).length;
    const result = await createSection({ ok: false, error: "" }, form);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Grades 7–10/i);
    expect((await db.select().from(sections)).length).toBe(before);
  });
});

describe("saveEnrollment", () => {
  it("rejects an unsupported Grade 12 enrollment and writes nothing", async () => {
    mocks.cookie = TOKENS.admin;
    const form = new FormData();
    form.set("studentId", "student-without-enrollment");
    form.set("schoolYearId", "school-year-1");
    form.set("gradeLevelId", "gl-12");
    form.set("sectionId", "section-12");

    const before = (await db.select().from(studentEnrollments)).length;
    const result = await saveEnrollment({ ok: false, error: "" }, form);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Grades 7–10/i);
    expect((await db.select().from(studentEnrollments)).length).toBe(before);
  });
});

describe("operational grade scope", () => {
  it("rejects adviser assignment to a legacy Grade 12 section", async () => {
    mocks.cookie = TOKENS.admin;
    const form = new FormData();
    form.set("sectionId", LEGACY_GRADE_FIXTURE.sectionId);
    form.set("teacherId", LEGACY_GRADE_FIXTURE.teacherId);

    const result = await assignAdviser({ ok: false, error: "" }, form);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Grades 7–10/i);
    const [section] = await db
      .select({ adviserId: sections.adviserId })
      .from(sections)
      .where(eq(sections.id, LEGACY_GRADE_FIXTURE.sectionId));
    expect(section?.adviserId).toBeNull();
  });

  it("rejects a teaching load in a legacy Grade 12 section", async () => {
    const result = await validateTeachingLoads([
      {
        sectionId: LEGACY_GRADE_FIXTURE.sectionId,
        subjectId: LEGACY_GRADE_FIXTURE.subjectId,
      },
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Grades 7–10/i);
  });

  it("rejects an employee adviser assignment to a legacy Grade 12 section", async () => {
    mocks.cookie = TOKENS.admin;
    const form = new FormData();
    form.set("firstName", "Unsupported");
    form.set("lastName", "Placement");
    form.set("sex", "female");
    form.set("position", "adviser");
    form.set("assignedSectionId", LEGACY_GRADE_FIXTURE.sectionId);

    const before = (await db.select().from(employees)).length;
    const result = await createEmployee({ ok: false, error: "" }, form);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Grades 7–10/i);
    expect((await db.select().from(employees)).length).toBe(before);
  });

  it("rejects attendance for a legacy Grade 12 enrollment", async () => {
    mocks.cookie = TOKENS.admin;
    const form = new FormData();
    form.set("enrollmentId", LEGACY_GRADE_FIXTURE.enrollmentId);
    form.set("date", "2026-11-22");
    form.set("status", "present");

    const before = (await db.select().from(attendanceRecords)).length;
    const result = await saveAttendance({ ok: false, error: "" }, form);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Grades 7–10/i);
    expect((await db.select().from(attendanceRecords)).length).toBe(before);
  });

  it("rejects a grade write for a legacy Grade 12 enrollment", async () => {
    mocks.cookie = TOKENS.subjectTeacher;
    const form = new FormData();
    form.set("enrollmentId", LEGACY_GRADE_FIXTURE.enrollmentId);
    form.set("subjectId", LEGACY_GRADE_FIXTURE.subjectId);
    form.set("gradingPeriodId", LEGACY_GRADE_FIXTURE.gradingPeriodId);
    form.set("grade", "90");

    const before = (await db.select().from(studentGrades)).length;
    const result = await saveGrade({ ok: false, error: "" }, form);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Grades 7–10/i);
    expect((await db.select().from(studentGrades)).length).toBe(before);
  });

  it("rejects a section grade sheet for a legacy Grade 12 section", async () => {
    mocks.cookie = TOKENS.subjectTeacher;
    const before = (await db.select().from(studentGrades)).length;
    const result = await saveSectionGradeDraft({
      sectionId: LEGACY_GRADE_FIXTURE.sectionId,
      subjectId: LEGACY_GRADE_FIXTURE.subjectId,
      gradingPeriodId: LEGACY_GRADE_FIXTURE.gradingPeriodId,
      entries: [{ studentId: LEGACY_GRADE_FIXTURE.studentId, grade: 90 }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Grades 7–10/i);
    expect((await db.select().from(studentGrades)).length).toBe(before);
  });
});

describe("reviewVerification", () => {
  let studentId = "";
  let creatorId = "";

  beforeAll(async () => {
    // Seed a record already queued for verification.
    studentId = randomUUID();
    creatorId = randomUUID();
    await db.insert(users).values(seedUser(creatorId, "role-records", "Enco", "Der"));
    await db.insert(students).values({
      id: studentId,
      studentNumber: "SM-2026-999901",
      firstName: "Pending",
      lastName: "Queued",
      sex: "male",
      status: "active",
      recordStatus: "pending_validation",
      createdBy: creatorId,
      updatedBy: creatorId,
    });
    await db.insert(recordVerifications).values({
      id: randomUUID(),
      studentId,
      submittedBy: creatorId,
      status: "pending",
      submittedAt: new Date(),
    });
  });

  it("approves a pending record and notifies the encoder", async () => {
    mocks.cookie = TOKENS.records;
    const form = new FormData();
    form.set("studentId", studentId);
    form.set("decision", "approved");

    const result = await reviewVerification({ ok: false, error: "" }, form);
    if (!result.ok) throw new Error(`Failed with: ${result.error}`);
    expect(result.ok).toBe(true);

    const [student] = await db.select().from(students).where(eq(students.id, studentId));
    expect(student.recordStatus).toBe("verified");

    const [verification] = await db
      .select()
      .from(recordVerifications)
      .where(eq(recordVerifications.studentId, studentId));
    expect(verification.status).toBe("approved");
    expect(verification.reviewedAt).toBeTruthy();
    expect(verification.reviewedBy).toBeTruthy();

    // The encoder was notified (no PII beyond the student number).
    const notes = await db.select().from(notifications).where(eq(notifications.userId, creatorId));
    expect(notes.length).toBe(1);
    expect(notes[0].type).toBe("approved");
  });

  it("denies an unauthorized reviewer", async () => {
    mocks.cookie = TOKENS.nurse;
    const form = new FormData();
    form.set("studentId", studentId);
    form.set("decision", "approved");

    const result = await reviewVerification({ ok: false, error: "" }, form);
    expect(result.ok).toBe(false);
  });
});

describe("updateStudent", () => {
  it("denies a role without students.update", async () => {
    mocks.cookie = TOKENS.nurse;
    const form = new FormData();
    form.set("studentId", "nonexistent");
    const result = await updateStudent({ ok: false, error: "" }, form);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("permission");
  });
});
