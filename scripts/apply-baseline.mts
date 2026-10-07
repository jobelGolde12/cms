import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";

const c = createClient({ url: "file:./local.db" });
const sqlText = readFileSync("./drizzle/0000_school-baseline.sql", "utf8");
try {
  await c.executeMultiple(sqlText);
  const t = await c.execute(
    "select count(*) as n from sqlite_master where type='table'",
  );
  console.log("tables created:", t.rows[0].n);
} catch (e) {
  console.error("apply failed:", e instanceof Error ? e.message : String(e));
  process.exit(1);
}
