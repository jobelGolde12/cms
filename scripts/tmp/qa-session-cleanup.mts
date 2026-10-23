import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../../src/db";
import { hashToken } from "../../src/lib/auth";
import { sessions } from "../../src/db/schema";

// One-off cleanup: drop the temporary QA session used for endpoint testing.
await db
  .delete(sessions)
  .where(eq(sessions.tokenHash, hashToken("qa-integration-session-token")));
console.log("QA session deleted");
process.exit(0);
