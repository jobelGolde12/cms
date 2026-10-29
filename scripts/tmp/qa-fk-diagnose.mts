/**
 * Diagnose FK rows referencing the QA user accounts (read-only counts).
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../../src/db";

const QA_IDS = [
  "qa-user-admin",
  "qa-user-subject",
  "qa-user-teacher",
  "qa-user-nurse",
  "qa-user-registrar",
  "qa-user-guidance",
  "qa-user-literacy",
  "qa-user-records",
  "qa-user-records2",
];

const idList = QA_IDS.map((id) => `'${id}'`).join(",");

interface FkRow { name: string; from: string }
const fkRows = await db.all<FkRow>(sql`
  SELECT s.name, f."from"
  FROM sqlite_master s,
       pragma_foreign_key_list(s.name) f
  WHERE s.type = 'table' AND f."table" = 'users'
`);

console.log(`FK columns referencing users: ${fkRows.length}`);
for (const fk of fkRows) {
  try {
    const n = await db.all<{ n: number }>(
      sql.raw(`SELECT count(*) AS n FROM "${fk.name}" WHERE "${fk.from}" IN (${idList})`),
    );
    const count = n[0]?.n ?? 0;
    if (count > 0) console.log(`  ${fk.name}.${fk.from}: ${count}`);
  } catch (e) {
    console.log(`  ${fk.name}.${fk.from}: (query failed)`);
  }
}
console.log("done");
process.exit(0);
