import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../src/db";
import { sessions } from "../../src/db/schema";

const removed = await db
  .delete(sessions)
  .where(inArray(sessions.userId, ["user-qa-integration", "qa-user-nurse"]))
  .returning({ id: sessions.id });
console.log(`deleted ${removed.length} QA session(s)`);
process.exit(0);
