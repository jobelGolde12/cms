/**
 * One-off data repair: rows written by the pre-fix validation bug.
 *
 * Background: `reviewValidation` used to map the "reject" decision to
 * `children.record_status = 'rejected'` — a value outside the canonical
 * RecordStatus vocabulary (draft | pending_validation | needs_correction |
 * verified | marked_duplicate). Such rows silently disappear from every
 * registry filter, dashboard count, and status badge.
 *
 * Repair: `rejected` → `marked_duplicate` (the terminal status allowed by
 * RECORD_STATUS_TRANSITIONS). The corresponding `child_validations` rows keep
 * their `rejected` status — that IS the correct history value.
 *
 * Safety:
 *   - DRY RUN by default: reports affected rows without changing anything.
 *   - Pass `--apply` to perform the update (idempotent; safe to re-run).
 *   - Touches ONLY rows with record_status = 'rejected'. Nothing else.
 *
 * Usage:
 *   npx tsx scripts/repair-rejected-records.mts           # dry run
 *   npx tsx scripts/repair-rejected-records.mts --apply   # apply repair
 */
import { createClient } from "@libsql/client";

const apply = process.argv.includes("--apply");
const url =
  process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || "file:./local.db";

console.log(`Target database: ${url.startsWith("file:") ? url : url.replace(/:[^:@/]+@/, ":***@")}`);
console.log(`Mode: ${apply ? "APPLY (will update rows)" : "DRY RUN (no changes)"}\n`);

if (apply && !url.startsWith("file:")) {
  console.error(
    "Refusing to run --apply against a remote database without explicit operator action.\n" +
      "If you are sure, run the equivalent SQL directly on that database:\n" +
      "  UPDATE children SET record_status='marked_duplicate', updated_at=unixepoch() WHERE record_status='rejected';",
  );
  process.exit(1);
}

async function main() {
  const client = createClient({ url });

  const found = await client.execute(
    "select id, child_code, first_name, last_name, updated_at from children where record_status = 'rejected'",
  );

  if (found.rows.length === 0) {
    console.log("No rows with record_status='rejected' found. Nothing to repair.");
    return;
  }

  console.log(`Found ${found.rows.length} affected record(s):`);
  for (const row of found.rows) {
    console.log(
      `  - ${row.child_code} (${row.first_name} ${row.last_name}) id=${String(row.id).slice(0, 8)}…`,
    );
  }

  if (!apply) {
    console.log(
      `\nDry run complete. Re-run with --apply to set these ${found.rows.length} record(s) to 'marked_duplicate'.`,
    );
    return;
  }

  const result = await client.execute(
    "update children set record_status = 'marked_duplicate', updated_at = unixepoch() where record_status = 'rejected'",
  );
  console.log(`\nUpdated ${result.rowsAffected} row(s).`);

  const verify = await client.execute(
    "select count(*) as n from children where record_status = 'rejected'",
  );
  if (Number(verify.rows[0]?.n ?? 0) !== 0) {
    throw new Error("Verification failed: rows with 'rejected' status remain.");
  }
  console.log("Verification passed: no 'rejected' record_status rows remain.");
}

main().catch((err) => {
  console.error("REPAIR FAILED:", err.message);
  process.exit(1);
});
