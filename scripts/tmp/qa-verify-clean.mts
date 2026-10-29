import "dotenv/config";
import { count, like, inArray } from "drizzle-orm";
import { db } from "../../src/db";
import {
  auditLogs, behaviorRecords, healthRecords, clinicalRecords,
  reportExports, reports, sectionSubjectTeachers, sessions,
  studentEnrollments, studentGrades, students, users,
} from "../../src/db/schema";

const QA_IDS = ["qa-user-admin","qa-user-subject","qa-user-teacher","qa-user-nurse","qa-user-registrar","qa-user-guidance","qa-user-literacy","qa-user-records"];
const c = async (n: string, p: Promise<number>) => console.log(n, await p);

await c("users(QA)", db.select({ n: count() }).from(users).where(inArray(users.id, QA_IDS)).then(r => r[0]?.n ?? 0));
await c("students(RBAC-TEST)", db.select({ n: count() }).from(students).where(like(students.firstName, "RBAC-TEST%")).then(r => r[0]?.n ?? 0));
await c("enrollments(qa)", db.select({ n: count() }).from(studentEnrollments).where(like(studentEnrollments.id, "qa-enroll%")).then(r => r[0]?.n ?? 0));
await c("grades(by qa users)", db.select({ n: count() }).from(studentGrades).where(inArray(studentGrades.recordedBy, QA_IDS)).then(r => r[0]?.n ?? 0));
await c("behavior(RBAC-TEST)", db.select({ n: count() }).from(behaviorRecords).where(like(behaviorRecords.description, "RBAC-TEST%")).then(r => r[0]?.n ?? 0));
await c("health(by qa users)", db.select({ n: count() }).from(healthRecords).where(inArray(healthRecords.recordedBy, QA_IDS)).then(r => r[0]?.n ?? 0));
await c("clinical(by qa users)", db.select({ n: count() }).from(clinicalRecords).where(inArray(clinicalRecords.recordedBy, QA_IDS)).then(r => r[0]?.n ?? 0));
await c("assignments(qa sec)", db.select({ n: count() }).from(sectionSubjectTeachers).where(like(sectionSubjectTeachers.sectionId, "qa-%")).then(r => r[0]?.n ?? 0));
await c("sessions(qa)", db.select({ n: count() }).from(sessions).where(inArray(sessions.userId, QA_IDS)).then(r => r[0]?.n ?? 0));
await c("audit(qa)", db.select({ n: count() }).from(auditLogs).where(inArray(auditLogs.userId, QA_IDS)).then(r => r[0]?.n ?? 0));
await c("reports(qa)", db.select({ n: count() }).from(reports).where(inArray(reports.generatedBy, QA_IDS)).then(r => r[0]?.n ?? 0));
await c("report_exports(qa)", db.select({ n: count() }).from(reportExports).where(inArray(reportExports.generatedBy, QA_IDS)).then(r => r[0]?.n ?? 0));
process.exit(0);
