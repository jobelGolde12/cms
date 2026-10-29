/**
 * Clear rows referencing QA user accounts (audit_logs, report_exports,
 * reports, sessions) so `scripts/rbac-qa-setup.mts --cleanup` can finish.
 */
import "dotenv/config";
import { inArray } from "drizzle-orm";
import { db } from "../../src/db";
import { auditLogs, reportExports, reports, sessions } from "../../src/db/schema";

const QA_IDS = [
  "qa-user-admin",
  "qa-user-subject",
  "qa-user-teacher",
  "qa-user-nurse",
  "qa-user-registrar",
  "qa-user-guidance",
  "qa-user-literacy",
  "qa-user-records",
];

await db.delete(auditLogs).where(inArray(auditLogs.userId, QA_IDS));
await db.delete(reportExports).where(inArray(reportExports.generatedBy, QA_IDS));
await db.delete(reports).where(inArray(reports.generatedBy, QA_IDS));
await db.delete(sessions).where(inArray(sessions.userId, QA_IDS));
console.log("QA-referenced rows cleared.");
process.exit(0);
