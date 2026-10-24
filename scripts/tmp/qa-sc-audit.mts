import "dotenv/config";
import { db } from "../../src/db";
import { serviceCreditTransactions, auditLogs } from "../../src/db/schema";
import { eq, desc, like, or } from "drizzle-orm";

const tx = await db
  .select()
  .from(serviceCreditTransactions)
  .where(eq(serviceCreditTransactions.id, "qa-sc-tx-3"))
  .limit(1);
console.log("tx-3 rows now:", tx[0] ? { credits: tx[0].credits, updatedBy: tx[0].updatedBy, type: tx[0].type } : "missing");

const audits = await db
  .select()
  .from(auditLogs)
  .where(or(like(auditLogs.action, "SERVICE_CREDIT%"), like(auditLogs.entityId, "qa-sc-tx-%")))
  .orderBy(desc(auditLogs.createdAt))
  .limit(6);
console.log("audit entries:");
for (const a of audits) {
  console.log(`  ${a.action} | tx=${a.entityId} | old=${a.oldValuesJson} | new=${a.newValuesJson} | ${new Date(Number(a.createdAt) * 1000).toISOString()}`);
}
process.exit(0);
