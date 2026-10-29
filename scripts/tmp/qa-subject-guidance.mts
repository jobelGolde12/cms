/**
 * QA: Subject Teacher + Guidance Counselor backend authorization.
 *
 * Uses the RBAC-TEST QA fixtures (run `npx tsx scripts/rbac-qa-setup.mts`
 * first) so no real data is touched, then verifies the server-side rules:
 *
 *   Subject Teacher
 *     - grade-write allowed for the assigned (section, subject) pair only
 *     - grade-write denied for unassigned subjects / other sections
 *     - Adviser (role teacher) is denied grade-write everywhere
 *     - row-level student scope: in-section student visible, out-of-scope not
 *
 *   Guidance Counselor
 *     - confidential incident readable by guidance, hidden from others
 *     - incident form vocabulary (data-driven incident types) loads
 *
 *   Schema integrity
 *     - duplicate (enrollment, subject, period) grades are rejected by the
 *       unique index
 *
 * Cleans up everything it created (tagged rows only) at the end.
 */
import "dotenv/config";
import { and, asc, eq, like } from "drizzle-orm";
import { db } from "../../src/db";
import {
  behaviorCategories,
  behaviorRecords,
  gradingPeriods,
  schoolYears,
  sectionSubjectTeachers,
  studentEnrollments,
  studentGrades,
  students,
} from "../../src/db/schema";
import type { SessionUser } from "../../src/lib/auth";
import { hasPermission } from "../../src/lib/permissions";
import { canWriteGradesInSection, teacherSubjectAssignments } from "../../src/lib/grades";
import { canAccessStudent, canViewConfidentialBehavior } from "../../src/lib/scope";
import {
  getGuidanceIncident,
  listBehaviorCategories,
  listGuidanceIncidents,
  listStudentIncidents,
} from "../../src/lib/queries";

const TAG = "RBAC-TEST";
const SEC = "qa-sec-rbac-test";
const SUBJECT_TEACHER_ID = "qa-user-subject";
const ADVISER_ID = "qa-user-teacher";
const GUIDANCE_ID = "qa-user-guidance";
const NURSE_ID = "qa-user-nurse";

const user = (id: string, role: SessionUser["role"]): SessionUser => ({
  id,
  email: `${id}@rbac-test.local`,
  firstName: "QA",
  lastName: "Fixture",
  roleId: `qa-${role}-${id}`,
  role,
});

const subjectTeacher = user(SUBJECT_TEACHER_ID, "subject_teacher");
const adviser = user(ADVISER_ID, "teacher");
const guidance = user(GUIDANCE_ID, "guidance");
const nurse = user(NURSE_ID, "nurse");

let passed = 0;
let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(
      `  ✗ ${name}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`,
    );
  }
}

let createdGradeEnrollmentIds: string[] = [];

async function cleanup() {
  await db.delete(behaviorRecords).where(like(behaviorRecords.description, `${TAG}%`));
  for (const enrollmentId of createdGradeEnrollmentIds) {
    await db.delete(studentGrades).where(eq(studentGrades.enrollmentId, enrollmentId));
  }
  await db
    .delete(sectionSubjectTeachers)
    .where(
      and(
        eq(sectionSubjectTeachers.sectionId, SEC),
        eq(sectionSubjectTeachers.teacherId, SUBJECT_TEACHER_ID),
      ),
    );
}

async function main() {
  await cleanup();
  createdGradeEnrollmentIds = [];

  console.log("\n[fixture] tagging QA subject-teaching assignment (MATH in QA section only) …");
  await db
    .insert(sectionSubjectTeachers)
    .values({
      id: `${SEC}__sub-MATH__${SUBJECT_TEACHER_ID}`,
      sectionId: SEC,
      subjectId: "sub-MATH",
      teacherId: SUBJECT_TEACHER_ID,
    })
    .onConflictDoNothing();

  console.log("\n— Subject Teacher: permission matrix —");
  check("subject_teacher has grades.write", hasPermission(subjectTeacher.role, "grades.write"), true);
  check("adviser lost grades.write", hasPermission(adviser.role, "grades.write"), false);
  check("guidance has no grades.write", hasPermission(guidance.role, "grades.write"), false);
  check(
    "subject_teacher cannot write behavior/incidents",
    hasPermission(subjectTeacher.role, "behavior.write"),
    false,
  );
  check("subject_teacher cannot manage users", hasPermission(subjectTeacher.role, "users.manage"), false);

  console.log("\n— Subject Teacher: row-level grade encoding —");
  check(
    "CAN encode assigned (QA section, MATH)",
    await canWriteGradesInSection(subjectTeacher, SEC, "sub-MATH"),
    true,
  );
  check(
    "DENIED unassigned subject (SCI) in same section",
    await canWriteGradesInSection(subjectTeacher, SEC, "sub-SCI"),
    false,
  );
  check(
    "DENIED other section (sec-7-0, no assignment there)",
    await canWriteGradesInSection(subjectTeacher, "sec-7-0", "sub-MATH"),
    false,
  );
  check("adviser denied encoding even in own section", await canWriteGradesInSection(adviser, SEC), false);
  const assignmentRows = await teacherSubjectAssignments(SUBJECT_TEACHER_ID);
  check(
    "teacherSubjectAssignments returns exactly the QA (section, subject) pair",
    assignmentRows,
    [{ sectionId: SEC, subjectId: "sub-MATH" }],
  );

  console.log("\n— Subject Teacher / Adviser: student row scope —");
  const qaInScope = (
    await db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.firstName, TAG), eq(students.lastName, "InScope")))
      .limit(1)
  )[0];
  const qaOutScope = (
    await db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.firstName, TAG), eq(students.lastName, "OutScope")))
      .limit(1)
  )[0];
  check("QA InScope student exists", Boolean(qaInScope), true);
  check("QA OutScope student exists", Boolean(qaOutScope), true);
  check(
    "subject teacher CAN access student in an assigned section",
    await canAccessStudent(subjectTeacher, { studentId: qaInScope!.id }),
    true,
  );
  check(
    "subject teacher CANNOT access student outside assigned sections",
    await canAccessStudent(subjectTeacher, { studentId: qaOutScope!.id }),
    false,
  );
  check(
    "adviser CAN access student in advised section",
    await canAccessStudent(adviser, { studentId: qaInScope!.id }),
    true,
  );

  console.log("\n— Guidance Counselor: confidential incidents —");
  const [incidentType] = await db
    .select({ id: behaviorCategories.id })
    .from(behaviorCategories)
    .where(eq(behaviorCategories.name, "Bullying"))
    .limit(1);
  check("'Bullying' incident type exists (data-driven vocabulary)", Boolean(incidentType), true);

  const incidentId = crypto.randomUUID();
  await db.insert(behaviorRecords).values({
    id: incidentId,
    studentId: qaInScope!.id,
    categoryId: incidentType!.id,
    date: new Date().toISOString().slice(0, 10),
    description: `${TAG} confidential incident`,
    status: "open",
    confidential: true,
    recordedBy: GUIDANCE_ID,
  });

  const guidanceList = await listGuidanceIncidents(guidance, { q: TAG });
  check(
    "guidance sees the confidential incident in its list",
    guidanceList.rows.some((r) => r.id === incidentId),
    true,
  );
  const guidanceRoster = await listStudentIncidents(guidance);
  check(
    "guidance roster includes the confidential incident",
    guidanceRoster.some((r) => r.behaviorId === incidentId),
    true,
  );
  const nurseRoster = await listStudentIncidents(nurse);
  check(
    "nurse roster excludes confidential incidents",
    nurseRoster.some((r) => r.behaviorId === incidentId),
    false,
  );
  const adviserRoster = await listStudentIncidents(adviser);
  check(
    "adviser roster excludes confidential incidents (even own section)",
    adviserRoster.some((r) => r.behaviorId === incidentId),
    false,
  );
  check("getGuidanceIncident works for guidance", (await getGuidanceIncident(guidance, incidentId))?.id, incidentId);
  check("getGuidanceIncident is null for nurse", await getGuidanceIncident(nurse, incidentId), null);
  check(
    "subject teacher cannot view confidential records",
    canViewConfidentialBehavior(subjectTeacher),
    false,
  );
  check("guidance can view confidential records", canViewConfidentialBehavior(guidance), true);

  console.log("\n— Guidance Counselor: incident-type vocabulary —");
  const categories = await listBehaviorCategories();
  check(
    "concern-type categories available for the incident form",
    categories.some((c) => c.kind === "concern"),
    true,
  );

  console.log("\n— Schema: duplicate grade prevention —");
  const [year] = await db
    .select({ id: schoolYears.id })
    .from(schoolYears)
    .where(eq(schoolYears.isCurrent, true))
    .limit(1);
  check("current school year exists", Boolean(year), true);
  const [period] = await db
    .select({ id: gradingPeriods.id })
    .from(gradingPeriods)
    .where(eq(gradingPeriods.schoolYearId, year!.id))
    .orderBy(asc(gradingPeriods.orderIndex))
    .limit(1);
  check("first grading period exists", Boolean(period), true);

  // Fresh tagged enrollment for the OutScope student (kept inside this QA run)
  // so the duplicate-grade attempt never touches existing data.
  const enrollmentId = procEnrollmentId();
  await db.insert(studentEnrollments).values({
    id: enrollmentId,
    studentId: qaOutScope!.id,
    schoolYearId: year!.id,
    gradeLevelId: "gl-7",
    sectionId: SEC,
    status: "active",
    recordedBy: "user-admin",
  });
  createdGradeEnrollmentIds.push(enrollmentId);

  let duplicateRejected = false;
  try {
    await db.insert(studentGrades).values({
      id: crypto.randomUUID(),
      enrollmentId,
      subjectId: "sub-MATH",
      gradingPeriodId: period!.id,
      grade: 88,
      recordedBy: SUBJECT_TEACHER_ID,
    });
    await db.insert(studentGrades).values({
      id: crypto.randomUUID(),
      enrollmentId,
      subjectId: "sub-MATH",
      gradingPeriodId: period!.id,
      grade: 90,
      recordedBy: SUBJECT_TEACHER_ID,
    });
  } catch {
    duplicateRejected = true;
  }
  check("duplicate (enrollment, subject, period) grade rejected by unique index", duplicateRejected, true);

  await cleanup();
  console.log(`\nQA done: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

function procEnrollmentId(): string {
  return "qa-enroll-grade-dup";
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("QA failed:", e);
    process.exit(1);
  });
