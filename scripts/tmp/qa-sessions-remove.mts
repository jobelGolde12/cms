/**
 * Remove the QA HTTP sessions created by scripts/tmp/qa-sessions-batch.mts.
 */
import "dotenv/config";
import { inArray } from "drizzle-orm";
import { db } from "../../src/db";
import { sessions } from "../../src/db/schema";

const TOKEN_USER_IDS = [
  "qa-user-subject",
  "qa-user-teacher",
  "qa-user-guidance",
  "qa-user-nurse",
];
await db.delete(sessions).where(inArray(sessions.userId, TOKEN_USER_IDS));
console.log("QA sessions removed.");
