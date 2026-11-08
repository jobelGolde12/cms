/**
 * QA-only fixtures for the 2026-11 feature verification pass.
 *
 * Every row this script creates is tagged (`qa-*` ids, `[QA]` / `QA-` names),
 * so `--cleanup` removes exactly the test data and nothing else:
 *
 *   npx tsx scripts/qa-feature-fixtures.mts
 *   npx tsx scripts/qa-feature-fixtures.mts --cleanup
 *
 * The script targets the database configured by TURSO_DATABASE_URL (the live
 * `cms` database). It never prints or reads credentials.
 */
import "dotenv/config";
import { and, eq, inArray, like, or } from "drizzle-orm";
import { db } from "../src/db";
import {
  assessments,
  behaviorRecords,
  clinicalRecords,
  employees,
  gradeSubmissions,
  healthRecords,
  interventions,
  notifications,
  schoolYears,
  sectionSubjectTeachers,
  sections,
  sessions,
  studentEnrollments,
  studentGrades,
  students,
  userRoles,
  users,
} from "../src/db/schema";
import { hashPassword } from "../src/lib/auth";

const PASSWORD = "QaTemp!2026#Verify";
const QA_USERS = [
  { id: "qa-user-admin", roleId: "role-admin", first: "QA", last: "Admin" },
  { id: "qa-user-registrar", roleId: "role-registrar", first: "QA", last: "Registrar" },
  { id: "qa-user-literacy", roleId: "role-literacy-coordinator", first: "QA", last: "Literacy" },
  { id: "qa-user-dual", roleId: "role-teacher", first: "QA", last: "DualTeacher" },
  { id: "qa-user-adviser", roleId: "role-teacher", first: "QA", last: "AdviserOnly" },
  { id: "qa-user-subject", roleId: "role-subject-teacher", first: "QA", last: "SubjectOnly" },
] as const;

const SECTION_A = "qa-sec-a";
const SECTION_B = "qa-sec-b";
const EMPLOYEE = "qa-employee-dual";

async function cleanup() {
  console.log("Cleaning QA fixtures…");
  const qaUsers = QA_USERS.map((u) => u.id);
  const qaSections = [SECTION_A, SECTION_B];
  const qaStudents = ["qa-student-a1", "qa-student-a2", "qa-student-b1"];

  const enrolled = await db
    .select({ id: studentEnrollments.id })
    .from(studentEnrollments)
    .where(or(inArray(studentEnrollments.sectionId, qaSections), inArray(studentEnrollments.studentId, qaStudents)));
  const enrollmentIds = enrolled.map((e) => e.id);

  await db.delete(sessions).where(inArray(sessions.userId, qaUsers));
  await db.delete(notifications).where(inArray(notifications.userId, qaUsers));
  await db.delete(gradeSubmissions).where(
    or(inArray(gradeSubmissions.sectionId, qaSections), inArray(gradeSubmissions.submittedBy, qaUsers)),
  );
  if (enrollmentIds.length) {
    await db.delete(studentGrades).where(inArray(studentGrades.enrollmentId, enrollmentIds));
  }
  await db.delete(assessments).where(inArray(assessments.studentId, qaStudents));
  await db.delete(behaviorRecords).where(inArray(behaviorRecords.studentId, qaStudents));
  await db.delete(healthRecords).where(inArray(healthRecords.studentId, qaStudents));
  await db.delete(clinicalRecords).where(inArray(clinicalRecords.studentId, qaStudents));
  await db.delete(interventions).where(inArray(interventions.studentId, qaStudents));
  await db.delete(studentEnrollments).where(
    or(inArray(studentEnrollments.sectionId, qaSections), inArray(studentEnrollments.studentId, qaStudents)),
  );
  await db.delete(students).where(inArray(students.id, qaStudents));
  await db.delete(employees).where(like(employees.id, "qa-%"));
  await db.delete(sectionSubjectTeachers).where(inArray(sectionSubjectTeachers.sectionId, qaSections));
  await db
    .delete(sections)
    .where(or(inArray(sections.id, qaSections), like(sections.name, "%[QA]%")));
  await db.delete(userRoles).where(inArray(userRoles.userId, qaUsers));
  await db.delete(users).where(inArray(users.id, qaUsers));

  console.log("Cleanup done.");
}

async function setup() {
  console.log("Creating QA fixtures…");
  const hash = await hashPassword(PASSWORD);

  const [year] = await db
    .select({ id: schoolYears.id, year: schoolYears.year })
    .from(schoolYears)
    .where(eq(schoolYears.isCurrent, true))
    .limit(1);
  if (!year) throw new Error("No current school year.");

  for (const u of QA_USERS) {
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.id, u.id)).limit(1);
    if (existing.length === 0) {
      await db.insert(users).values({
        id: u.id,
        roleId: u.roleId,
        firstName: u.first,
        lastName: u.last,
        email: `${u.id}@qa.local`,
        passwordHash: hash,
        isActive: true,
      });
      console.log(`  + user ${u.id} (${u.roleId})`);
    }
    const hasRole = await db
      .select({ roleId: userRoles.roleId })
      .from(userRoles)
      .where(and(eq(userRoles.userId, u.id), eq(userRoles.roleId, u.roleId)))
      .limit(1);
    if (hasRole.length === 0) await db.insert(userRoles).values({ userId: u.id, roleId: u.roleId });
  }

  // The dual-role account: Adviser primary + Subject Teacher as an additional
  // role. One account, one personnel record, two responsibilities.
  const dualRole = await db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(and(eq(userRoles.userId, "qa-user-dual"), eq(userRoles.roleId, "role-subject-teacher")))
    .limit(1);
  if (dualRole.length === 0) {
    await db.insert(userRoles).values({ userId: "qa-user-dual", roleId: "role-subject-teacher" });
  }

  // One personnel record linked to the dual-role account — never a second
  // employee record for the same person.
  const employee = await db.select({ id: employees.id }).from(employees).where(eq(employees.id, EMPLOYEE)).limit(1);
  if (employee.length === 0) {
    await db.insert(employees).values({
      id: EMPLOYEE,
      employeeNumber: "QA-EMP-2026-000001",
      firstName: "QA",
      lastName: "DualTeacher",
      sex: "female",
      position: "adviser_subject_teacher",
      userId: "qa-user-dual",
      status: "active",
      createdBy: "qa-user-admin",
    });
    console.log("  + QA employee record (adviser_subject_teacher)");
  }

  const sectionRows = [
    { id: SECTION_A, name: "[QA] Section A", gradeLevelId: "gl-7" },
    { id: SECTION_B, name: "[QA] Section B", gradeLevelId: "gl-7" },
  ];
  for (const s of sectionRows) {
    const existing = await db.select({ id: sections.id }).from(sections).where(eq(sections.id, s.id)).limit(1);
    if (existing.length === 0) {
      await db.insert(sections).values({
        id: s.id,
        schoolYearId: year.id,
        gradeLevelId: s.gradeLevelId,
        name: s.name,
        isActive: true,
      });
      console.log(`  + section ${s.name}`);
    }
  }

  const studentRows = [
    { id: "qa-student-a1", number: "QA-2026-000001", first: "QAAlex", last: "Student", section: SECTION_A },
    { id: "qa-student-a2", number: "QA-2026-000002", first: "QABea", last: "Student", section: SECTION_A },
    { id: "qa-student-b1", number: "QA-2026-000003", first: "QACarla", last: "Student", section: SECTION_B },
  ];
  for (const s of studentRows) {
    const existing = await db.select({ id: students.id }).from(students).where(eq(students.id, s.id)).limit(1);
    if (existing.length === 0) {
      await db.insert(students).values({
        id: s.id,
        studentNumber: s.number,
        firstName: s.first,
        lastName: s.last,
        birthDate: "2013-01-15",
        sex: "female",
        status: "active",
        recordStatus: "verified",
        createdBy: "qa-user-admin",
        updatedBy: "qa-user-admin",
      });
      await db.insert(studentEnrollments).values({
        id: `qa-enroll-${s.id}`,
        studentId: s.id,
        schoolYearId: year.id,
        gradeLevelId: "gl-7",
        sectionId: s.section,
        status: "active",
        recordedBy: "qa-user-admin",
      });
      console.log(`  + student ${s.first} ${s.last} → ${s.section}`);
    }
  }

  console.log("\nQA accounts (password shared by all):");
  for (const u of QA_USERS) console.log(`  ${u.id}@qa.local — ${u.roleId}`);
  console.log(`\nCurrent school year: ${year.year}`);
}

if (process.argv.includes("--cleanup")) {
  cleanup()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    });
} else {
  setup()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    });
}
