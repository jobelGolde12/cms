/**
 * One-off QA helper: creates a throwaway admin account in the CURRENTLY
 * CONFIGURED database (pass TURSO_DATABASE_URL to point at a QA copy, e.g.
 * `TURSO_DATABASE_URL=file:./.tmp-qa.db npx tsx scripts/qa-user.mts`).
 * Never run against a production database.
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { roles, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";

const EMAIL = "qa-audit@qa.example";
const PASSWORD = process.env.QA_PASSWORD ?? "qa-temp-pass-123";

const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, EMAIL)).limit(1);
if (existing.length > 0) {
  console.log("qa user already exists:", existing[0].id);
} else {
  await db.insert(users).values({
    id: "qa-audit-user",
    roleId: "role-admin",
    firstName: "QA",
    lastName: "Auditor",
    email: EMAIL,
    passwordHash: await hashPassword(PASSWORD),
    isActive: true,
  });
  console.log("created qa user qa-audit@qa.example");
}
