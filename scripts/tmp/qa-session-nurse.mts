import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../../src/db";
import { hashToken } from "../../src/lib/auth";
import { users, sessions } from "../../src/db/schema";

const TOKEN = "qa-nurse-session-token";
const EMAIL = "qa-nurse@rbac-test.local";

const [nurse] = await db.select({ id: users.id }).from(users).where(eq(users.email, EMAIL)).limit(1);
if (!nurse) {
  console.log("Nurse QA user missing — create with scripts/rbac-qa-setup.mts first");
  process.exit(1);
}
await db.delete(sessions).where(eq(sessions.userId, nurse.id));
await db.insert(sessions).values({
  id: crypto.randomUUID(),
  tokenHash: hashToken(TOKEN),
  userId: nurse.id,
  expiresAt: new Date(Date.now() + 1000 * 60 * 60),
});
console.log(`nurse session ready (${nurse.id}) — cookie: sms_session=${TOKEN}`);
process.exit(0);
