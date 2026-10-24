import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../../src/db";
import { hashPassword } from "../../src/lib/auth";
import { users } from "../../src/db/schema";
const id = "user-qa-integration";
const existing = await db.select().from(users).where(eq(users.id, id)).limit(1);
if (existing.length > 0) {
  // Child rows (employees, transactions) may reference this user without
  // cascades — never delete it, just refresh the mutable fields.
  await db
    .update(users)
    .set({
      roleId: "role-admin",
      firstName: "QA",
      lastName: "Integration",
      email: "qa-integration@qa.local.dev",
      passwordHash: await hashPassword("QA-Integration-2026!x"),
      isActive: true,
    })
    .where(eq(users.id, id));
  console.log("QA user refreshed (kept — child rows reference it)");
} else {
  await db.insert(users).values({
    id,
    roleId: "role-admin",
    firstName: "QA",
    lastName: "Integration",
    email: "qa-integration@qa.local.dev",
    passwordHash: await hashPassword("QA-Integration-2026!x"),
    isActive: true,
  });
  console.log("QA user created");
}
process.exit(0);
