/**
 * QA-only read-only SQL runner (the Turso CLI session may expire during a
 * long test pass; the application uses the same configured libSQL database).
 *
 *   npx tsx scripts/qa-query.mts "select count(*) as n from students"
 */
import "dotenv/config";
import { createClient } from "@libsql/client";

const sql = process.argv.slice(2).join(" ").trim();
if (!sql) {
  console.error("Usage: npx tsx scripts/qa-query.mts \"<select …>\"");
  process.exit(1);
}
if (!/^\s*(select|pragma|with)\b/i.test(sql)) {
  console.error("Refusing non-read-only statement. This helper is for SELECT/PRAGMA only.");
  process.exit(1);
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url) {
  console.error("TURSO_DATABASE_URL is not configured.");
  process.exit(1);
}

const client = createClient({ url, authToken });
const result = await client.execute(sql);
if (result.rows.length === 0) {
  console.log("(no rows)");
} else {
  console.table(result.rows);
}
process.exit(0);
