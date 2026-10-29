import "dotenv/config";
import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../../src/db";
import { sessions } from "../../src/db/schema";

const token = "qa-http-admin-token";
const tokenHash = createHash("sha256").update(token).digest("hex");
await db.delete(sessions).where(eq(sessions.userId, "qa-user-admin"));
await db.insert(sessions).values({
  id: crypto.randomUUID(),
  tokenHash,
  userId: "qa-user-admin",
  expiresAt: new Date(Date.now() + 3600e3),
});
console.log("admin session ready");
process.exit(0);
