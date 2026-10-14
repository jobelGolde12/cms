import "dotenv/config";
import { db } from "../src/db";
import { healthRecords, clinicalRecords } from "../src/db/schema";

const health = await db.select().from(healthRecords);
console.log("health rows:", health.length);
for (const r of health) {
  console.log(`  ${r.studentId} w:${r.weightKg} h:${r.heightCm} bmi:${r.bmi} status:${r.nutritionalStatus} by:${r.recordedBy}`);
}
const clinical = await db.select().from(clinicalRecords);
console.log("clinical rows:", clinical.length);
process.exit(0);
