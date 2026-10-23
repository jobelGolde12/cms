import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../../src/db";
import { hashToken } from "../../src/lib/auth";
import { sessions } from "../../src/db/schema";

// Fixed token for integration testing only — QA user, not a real person.
const TOKEN = "qa-integration-session-token";
const userId = "user-qa-integration";

await db.delete(sessions).where(eq(sessions.userId, userId));
await db.insert(sessions).values({
  id: crypto.randomUUID(),
  tokenHash: hashToken(TOKEN),
  userId,
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
});
console.log("QA session ready — cookie:", `qa-session=${TOKEN}`);
process.exit(0);
