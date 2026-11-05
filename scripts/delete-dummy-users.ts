#!/usr/bin/env tsx
/**
 * Safe removal of demo/test accounts from the configured database.
 *
 * The script is deliberately conservative:
 *   - the target set is supplied on the command line (never a stale,
 *     hard-coded id list baked into the repository);
 *   - it refuses to touch an account that holds the last active admin role;
 *   - it refuses to run unless the caller passes `--execute` (dry-run is the
 *     default) and, when `--backup` is given, that backup file must exist;
 *   - rows that reference the account through a RESTRICT foreign key are
 *     re-pointed at a surviving administrator (`--reassign-to`) instead of
 *     being silently orphaned or deleted.
 *
 * Usage:
 *   npx tsx scripts/delete-dummy-users.ts --emails a@x.dev,b@x.dev --dry-run
 *   npx tsx scripts/delete-dummy-users.ts --emails a@x.dev \
 *       --reassign-to user-admin --backup ./database-backups/cms.db --execute
 */

import { createInterface } from "node:readline/promises";
import { existsSync, statSync } from "node:fs";
import { and, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

const ADMIN_ROLE_ID = "role-admin";

/**
 * Columns that point at `users.id` with ON DELETE RESTRICT. Rows in these
 * tables must be re-pointed before an account can be removed.
 */
const RESTRICT_REFERENCES: { table: string; column: string }[] = [
  { table: "attendance_records", column: "recorded_by" },
  { table: "assessments", column: "assessor_id" },
  { table: "behavior_records", column: "recorded_by" },
  { table: "clinical_records", column: "recorded_by" },
  { table: "health_records", column: "recorded_by" },
  { table: "intervention_followups", column: "recorded_by" },
  { table: "interventions", column: "created_by" },
  { table: "employees", column: "created_by" },
  { table: "employees", column: "updated_by" },
  { table: "employee_201_records", column: "created_by" },
  { table: "employee_201_records", column: "updated_by" },
  { table: "service_credit_transactions", column: "created_by" },
  { table: "service_credit_transactions", column: "updated_by" },
];

type Args = {
  emails: string[];
  execute: boolean;
  backup: string | null;
  reassignTo: string | null;
};

function parseArgs(argv: string[]): Args {
  const emails: string[] = [];
  let execute = false;
  let backup: string | null = null;
  let reassignTo: string | null = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--emails") {
      const value = argv[++i];
      if (!value) throw new Error("--emails needs a comma-separated list of email addresses");
      emails.push(
        ...value
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean),
      );
    } else if (arg === "--backup") {
      backup = argv[++i] ?? null;
    } else if (arg === "--reassign-to") {
      reassignTo = argv[++i] ?? null;
    } else if (arg === "--execute") {
      execute = true;
    } else if (arg === "--dry-run") {
      execute = false;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (emails.length === 0) {
    throw new Error("--emails is required (comma-separated list of account e-mails)");
  }
  return { emails, execute, backup, reassignTo };
}

/** Count rows in a RESTRICT-referencing table that still point at the account. */
async function countReferences(table: string, column: string, userId: string): Promise<number> {
  const rows = await db.all<{ n: number }>(
    sql`SELECT count(*) AS n FROM ${sql.identifier(table)} WHERE ${sql.identifier(column)} = ${userId}`,
  );
  return Number(rows[0]?.n ?? 0);
}

/** Re-point RESTRICT references from the removed account to a surviving one. */
async function reassignReferences(
  table: string,
  column: string,
  fromUserId: string,
  toUserId: string,
): Promise<number> {
  const rows = await db.all<{ n: number }>(
    sql`SELECT count(*) AS n FROM ${sql.identifier(table)} WHERE ${sql.identifier(column)} = ${fromUserId}`,
  );
  const affected = Number(rows[0]?.n ?? 0);
  if (affected === 0) return 0;
  await db.run(
    sql`UPDATE ${sql.identifier(table)} SET ${sql.identifier(column)} = ${toUserId} WHERE ${sql.identifier(column)} = ${fromUserId}`,
  );
  return affected;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log("=".repeat(64));
  console.log("DEMO / TEST ACCOUNT REMOVAL");
  console.log("=".repeat(64));

  if (args.backup) {
    if (!existsSync(args.backup)) {
      console.error(`Backup not found: ${args.backup}`);
      console.error("Aborting. Create the backup first (turso db export cms --output-file <file>).");
      process.exit(1);
    }
    const mb = (statSync(args.backup).size / (1024 * 1024)).toFixed(2);
    console.log(`Backup verified: ${args.backup} (${mb} MB)`);
  } else {
    console.warn("No --backup supplied — a backup is strongly recommended before deleting rows.");
  }

  const targets = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      roleId: users.roleId,
      isActive: users.isActive,
    })
    .from(users)
    .where(or(...args.emails.map((email) => eq(users.email, email))));

  if (targets.length === 0) {
    console.log("No matching accounts — nothing to do.");
    return;
  }

  console.log(`\nMatched ${targets.length} account(s):`);
  for (const t of targets) {
    console.log(`  • ${t.id} | ${t.firstName} ${t.lastName} | ${t.email} | ${t.roleId}`);
  }

  const activeAdmins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.roleId, ADMIN_ROLE_ID), eq(users.isActive, true)));

  const targetIds = new Set(targets.map((t) => t.id));
  const remainingAdmins = activeAdmins.filter((a) => !targetIds.has(a.id));
  if (remainingAdmins.length === 0) {
    console.error("\nRefusing to run: every active administrator is in the target set.");
    process.exit(1);
  }

  // Reassignment target must be a surviving, active administrator.
  let reassignTo = args.reassignTo;
  if (reassignTo && !remainingAdmins.some((a) => a.id === reassignTo)) {
    console.error(
      `\n--reassign-to ${reassignTo} is not a surviving active administrator. ` +
        `Choose one of: ${remainingAdmins.map((a) => a.id).join(", ")}`,
    );
    process.exit(1);
  }
  if (!reassignTo) reassignTo = remainingAdmins[0]!.id;

  console.log(`\nRestrict references will be re-pointed at: ${reassignTo}`);
  for (const ref of RESTRICT_REFERENCES) {
    let total = 0;
    for (const t of targets) total += await countReferences(ref.table, ref.column, t.id);
    if (total > 0) console.log(`  • ${ref.table}.${ref.column}: ${total} row(s)`);
  }

  if (!args.execute) {
    console.log("\nDRY RUN — no rows were changed. Re-run with --execute to apply.");
    return;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question("Type 'DELETE' to confirm: ");
  rl.close();
  if (answer.trim() !== "DELETE") {
    console.log("Aborted — nothing was deleted.");
    return;
  }

  for (const t of targets) {
    for (const ref of RESTRICT_REFERENCES) {
      await reassignReferences(ref.table, ref.column, t.id, reassignTo!);
    }
    await db.delete(users).where(eq(users.id, t.id));
    console.log(`✓ Removed ${t.email} (${t.id})`);
  }

  const remaining = await db.select({ id: users.id }).from(users);
  console.log(`\nAccounts remaining: ${remaining.length}`);

  const orphaned = await db.all<{ table: string; column: string; n: number }>(
    sql`
      SELECT ${sql.join(
        RESTRICT_REFERENCES.map(
          (ref) => sql`SELECT ${ref.table} AS table, ${ref.column} AS column, count(*) AS n FROM ${sql.identifier(ref.table)} WHERE ${sql.identifier(ref.column)} IS NULL`,
        ),
        sql`, `,
      )}
    `,
  );
  const nullRefs = orphaned.filter((r) => Number(r.n) > 0);
  console.log(
    nullRefs.length === 0
      ? "✓ No NULL references in RESTRICT columns."
      : `⚠ NULL references remain: ${nullRefs.map((r) => `${r.table}.${r.column}=${r.n}`).join(", ")}`,
  );

  const stillThere = await db
    .select({ email: users.email })
    .from(users)
    .where(or(...args.emails.map((email) => eq(users.email, email))));
  console.log(
    stillThere.length === 0
      ? "✓ Verification PASSED — every targeted account is gone."
      : `⚠ Verification: ${stillThere.length} targeted account(s) still present.`,
  );
}

main().catch((error: unknown) => {
  console.error("Removal failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
