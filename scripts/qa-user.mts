/**
 * One-off QA helper: creates a throwaway admin account in the CURRENTLY
 * CONFIGURED database (pass TURSO_DATABASE_URL to point at a QA copy, e.g.
 * `TURSO_DATABASE_URL=file:./.tmp-qa.db npx tsx scripts/qa-user.mts`).
 * Never run against a production database — the script refuses to run against
 * a remote database unless `ALLOW_QA_USER=1` is set explicitly.
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userRoles, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { requireExplicitOptInForRemote } from "./lib/remote-guard";

requireExplicitOptInForRemote("ALLOW_QA_USER", "the throwaway QA account");

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
  await db
    .insert(userRoles)
    .values({ userId: "qa-audit-user", roleId: "role-admin" })
    .onConflictDoNothing();
  console.log("created qa user qa-audit@qa.example");
}
