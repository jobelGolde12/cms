/**
 * RBAC QA harness — creates clearly-marked test accounts and minimal test
 * records for live role-verification (UI + backend). All rows are tagged so
 * `--cleanup` removes exactly what this script created, leaving real data
 * untouched. This script is a TEST UTILITY ONLY — nothing here is referenced
 * by application code.
 *
 *   npx tsx scripts/rbac-qa-setup.mts            # create QA fixtures
 *   npx tsx scripts/rbac-qa-setup.mts --cleanup  # remove QA fixtures
 */

import "dotenv/config";
import { and, eq, or, like } from "drizzle-orm";
import { db } from "../src/db";
import {
  behaviorCategories,
  behaviorRecords,
  clinicalRecords,
  healthRecords,
  schoolYears,
  sections,
  students,
  users,
} from "../src/db/schema";
import { hashPassword } from "../src/lib/auth";

const TAG = "RBAC-TEST";
const QA_PASSWORD = "rbac-verify-2026";
const QA_USERS: { id: string; role: string; email: string; first: string; last: string; roleRowId: string }[] = [
  { id: "qa-user-admin", role: "admin", email: "qa-admin@rbac-test.local", first: "QA", last: "Admin", roleRowId: "role-admin" },
  { id: "qa-user-teacher", role: "teacher", email: "qa-adviser@rbac-test.local", first: "QA", last: "Adviser", roleRowId: "role-teacher" },
  { id: "qa-user-subject", role: "subject_teacher", email: "qa-subject@rbac-test.local", first: "QA", last: "SubjectTeacher", roleRowId: "role-subject-teacher" },
  { id: "qa-user-nurse", role: "nurse", email: "qa-nurse@rbac-test.local", first: "QA", last: "Nurse", roleRowId: "role-nurse" },
  { id: "qa-user-registrar", role: "registrar", email: "qa-registrar@rbac-test.local", first: "QA", last: "Registrar", roleRowId: "role-registrar" },
  { id: "qa-user-guidance", role: "guidance", email: "qa-guidance@rbac-test.local", first: "QA", last: "Guidance", roleRowId: "role-guidance" },
  { id: "qa-user-literacy", role: "literacy_coordinator", email: "qa-literacy@rbac-test.local", first: "QA", last: "Literacy", roleRowId: "role-literacy-coordinator" },
];

async function cleanup() {
  console.log("Cleaning QA fixtures…");

  // Behavior records created during testing (recorded by QA users).
  const qaIds = QA_USERS.map((u) => u.id);
  for (const uid of qaIds) {
    await db.delete(behaviorRecords).where(eq(behaviorRecords.recordedBy, uid));
    await db.delete(healthRecords).where(eq(healthRecords.recordedBy, uid));
    await db.delete(clinicalRecords).where(eq(clinicalRecords.recordedBy, uid));
  }

  // Test student + section.
  await db.delete(students).where(like(students.firstName, `${TAG}%`));
  await db.delete(sections).where(like(sections.name, `[${TAG}]%`));

  // QA accounts.
  for (const u of QA_USERS) {
    await db.delete(users).where(eq(users.id, u.id));
  }
  console.log("Cleanup done.");
}

async function setup() {
  console.log("Creating QA fixtures (tagged RBAC-TEST)…");
  const hash = await hashPassword(QA_PASSWORD);
  for (const u of QA_USERS) {
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.id, u.id)).limit(1);
    if (existing.length > 0) continue;
    await db.insert(users).values({
      id: u.id,
      roleId: u.roleRowId,
      firstName: u.first,
      lastName: u.last,
      email: u.email,
      passwordHash: hash,
      isActive: true,
    });
    console.log(`  + user ${u.email} (${u.role})`);
  }

  // Current school year + one test section advised ONLY by the QA adviser.
  const [year] = await db.select({ id: schoolYears.id }).from(schoolYears).where(eq(schoolYears.isCurrent, true)).limit(1);
  if (!year) throw new Error("No current school year — cannot create a section.");
  const secId = "qa-sec-rbac-test";
  const existingSec = await db.select({ id: sections.id }).from(sections).where(eq(sections.id, secId)).limit(1);
  if (existingSec.length === 0) {
    await db.insert(sections).values({
      id: secId,
      schoolYearId: year.id,
      gradeLevelId: "gl-7",
      name: `[${TAG}] Adviser Scope A`,
      adviserId: "qa-user-teacher",
      isActive: true,
    });
    console.log("  + test section (advised by QA Adviser)");
  }

  // One test student enrolled in the test section, one NOT (out of scope).
  const testStudents = [
    { suffix: "InScope", sectionId: secId },
    { suffix: "OutScope", sectionId: null },
  ];
  for (const t of testStudents) {
    const existing = await db.select({ id: students.id }).from(students).where(and(eq(students.firstName, TAG), eq(students.lastName, t.suffix))).limit(1);
    if (existing.length > 0) continue;
    const sid = `qa-student-${t.suffix.toLowerCase()}`;
    await db.insert(students).values({
      id: sid,
      studentNumber: `QA-${t.suffix.toUpperCase()}-000001`,
      firstName: TAG,
      lastName: t.suffix,
      birthDate: "2012-05-10",
      sex: "female",
      status: "active",
      recordStatus: "draft",
      createdBy: "qa-user-admin",
      updatedBy: "qa-user-admin",
    });
    if (t.sectionId) {
      const { studentEnrollments } = await import("../src/db/schema");
      await db.insert(studentEnrollments).values({
        id: `qa-enroll-${t.suffix.toLowerCase()}`,
        studentId: sid,
        schoolYearId: year.id,
        gradeLevelId: "gl-7",
        sectionId: t.sectionId,
        status: "active",
        recordedBy: "qa-user-admin",
      });
      console.log(`  + student ${TAG} ${t.suffix} (${t.sectionId ? "IN Adviser's section" : "NOT in Adviser's section"})`);
    } else {
      console.log(`  + student ${TAG} ${t.suffix} (not enrolled → out of scope)`);
    }
  }

  console.log("\nQA accounts (password: rbac-verify-2026):");
  for (const u of QA_USERS) console.log(`  ${u.email} — ${u.role}`);
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

void behaviorCategories;
void or;
