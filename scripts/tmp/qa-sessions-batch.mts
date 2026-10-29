/**
 * QA sessions for subject-teacher/guidance/adviser HTTP route checks.
 * QA accounts only (RBAC-TEST fixtures). Prints the cookies to use with
 * curl. Delete afterwards with: npx tsx scripts/tmp/qa-sessions-remove.mts
 */
import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../src/db";
import { hashToken } from "../../src/lib/auth";
import { sessions } from "../../src/db/schema";

const TOKENS: Record<string, string> = {
  "qa-user-subject": "qa-http-subject-teacher-token",
  "qa-user-teacher": "qa-http-adviser-token",
  "qa-user-guidance": "qa-http-guidance-token",
  "qa-user-nurse": "qa-http-nurse-token",
};

const userIds = Object.keys(TOKENS);
for (const userId of userIds) {
  const token = TOKENS[userId]!;
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await db.insert(sessions).values({
    id: crypto.randomUUID(),
    tokenHash: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 6),
  });
  console.log(`sms_session=${token}  # ${userId}`);
}
console.log("QA sessions ready.");
