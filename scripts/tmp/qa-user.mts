import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../../src/db";
import { hashPassword } from "../../src/lib/auth";
import { users } from "../../src/db/schema";
const id = "user-qa-integration";
const existing = await db.select().from(users).where(eq(users.id, id)).limit(1);
if (existing.length > 0) {
  await db.delete(users).where(eq(users.id, id));
}
await db.insert(users).values({
  id,
  roleId: "role-admin",
  firstName: "QA",
  lastName: "Integration",
  email: "qa-integration@qa.local.dev",
  passwordHash: await hashPassword("QA-Integration-2026!x"),
  isActive: true,
});
console.log("QA user ready");
process.exit(0);
