/**
 * Backfill encryption-at-rest for existing sensitive rows.
 *
 * Safe to re-run: values already carrying the `enc:v1:` prefix are skipped.
 * Plaintext is never printed — the script only reports row counts.
 *
 * Required environment:
 *   TURSO_DATABASE_URL / TURSO_AUTH_TOKEN  (or LIBSQL_*)
 *   ENCRYPTION_KEY                         (same key the app uses)
 *
 * Usage (against the deployed database):
 *   npx tsx scripts/encrypt-existing-records.mts
 */
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { encryptString } from "../src/lib/security/encryption";

const PREFIX = "enc:v1:";

/** Tables/columns that hold sensitive content and must be encrypted at rest. */
const TARGETS: { table: string; columns: string[] }[] = [
  { table: "health_records", columns: ["remarks"] },
  {
    table: "clinical_records",
    columns: ["description", "assessment", "action_taken", "remarks"],
  },
  { table: "behavior_records", columns: ["description", "follow_up"] },
  {
    table: "employee_201_records",
    columns: ["description", "file_reference"],
  },
  {
    table: "employees",
    columns: [
      "address",
      "contact_number",
      "emergency_contact_name",
      "emergency_contact_relation",
      "emergency_contact_number",
      "gsis_number",
      "philhealth_number",
      "pagibig_number",
      "tin_number",
      "prc_license_number",
      "eligibility",
    ],
  },
  { table: "users", columns: ["mfa_secret"] },
];

type Row = { id: string; value: string };

let updatedTotal = 0;

for (const target of TARGETS) {
  for (const column of target.columns) {
    const rows = await db.all<Row>(
      sql`select id, ${sql.raw(`"${column}"`)} as value from ${sql.raw(`"${target.table}"`)}
          where ${sql.raw(`"${column}"`)} is not null
            and ${sql.raw(`"${column}"`)} != ''
            and ${sql.raw(`"${column}"`)} not like ${`${PREFIX}%`}`,
    );

    for (const row of rows) {
      const ciphertext = encryptString(row.value);
      await db.run(
        sql`update ${sql.raw(`"${target.table}"`)}
            set ${sql.raw(`"${column}"`)} = ${ciphertext}
            where id = ${row.id}`,
      );
      updatedTotal += 1;
    }

    if (rows.length > 0) {
      console.log(
        `[encrypt-backfill] ${target.table}.${column}: encrypted ${rows.length} row(s)`,
      );
    }
  }
}

// Verify nothing readable is left behind in the targeted columns.
let plaintextRemaining = 0;
for (const target of TARGETS) {
  for (const column of target.columns) {
    const rows = await db.all<{ n: number }>(
      sql`select count(*) as n from ${sql.raw(`"${target.table}"`)}
          where ${sql.raw(`"${column}"`)} is not null
            and ${sql.raw(`"${column}"`)} != ''
            and ${sql.raw(`"${column}"`)} not like ${`${PREFIX}%`}`,
    );
    plaintextRemaining += Number(rows[0]?.n ?? 0);
  }
}

console.log(`[encrypt-backfill] ${updatedTotal} value(s) encrypted this run.`);
if (plaintextRemaining > 0) {
  console.error(
    `[encrypt-backfill] WARNING: ${plaintextRemaining} value(s) are still plaintext — review the targets above.`,
  );
  process.exit(1);
}
console.log("[encrypt-backfill] verification: every targeted value is encrypted.");
