/**
 * One-off careful migration for the stale remote Turso DB.
 *
 * Problem (discovered 2026-10):
 *   - `interventions` still has `child_id` + `priority` (baseline expects `student_id` + `outcome`)
 *   - `qr_verifications` still has `child_id`, missing `verified_at`-style timestamps & UNIQUE token index
 *   - A legacy prototype model (`children`, `child_*` tables, `schools`) coexists with the
 *     school model; `students`, `school_years`, `grade_levels`, `sections`,
 *     `behavior_categories`, `student_enrollments` are empty/absent reference data.
 *
 * Strategy (non-destructive):
 *   1. Snapshot every legacy table into `<name>_backup` (CREATE TABLE ... AS SELECT).
 *   2. Rebuild off-schema tables (`interventions`, `qr_verifications`) with the
 *      baseline column set, preserving their rows (mapping child_id → students.id).
 *   3. Migrate legacy `children` → `students` rows (one-time; skipped if students
 *      already has the child ids).
 *   4. Leave every other legacy table untouched in place (data preserved).
 *
 * Run with --apply to commit changes; default is dry-run (read-only checks).
 * Idempotent: safe to re-run; skips steps whose end-state already holds.
 */
import { createClient, type Client } from "@libsql/client";
import { readFileSync } from "node:fs";
import "dotenv/config";

const APPLY = process.argv.includes("--apply");

const url = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || "file:./local.db";
const authToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN || undefined;
if (!url.startsWith("libsql://")) {
  console.error("Refusing to run: TURSO_DATABASE_URL is not a remote libsql:// URL.");
  process.exit(2);
}

const c: Client = createClient({ url, authToken });

const q = async (sql: string) => (await c.execute(sql)).rows;
const one = async (sql: string) => Number((await c.execute(sql)).rows[0]?.n ?? 0);

/** Read column names from pragma. */
async function cols(table: string): Promise<string[]> {
  const rows = await q(`pragma table_info(${table})`);
  return rows.map((r) => String(r.name));
}

async function tableExists(name: string): Promise<boolean> {
  const rows = await q(
    `select name from sqlite_master where type='table' and name = '${name.replace(/'/g, "''")}'`,
  );
  return rows.length > 0;
}

/* ------------------------------------------------------------------ */
/*  Target definitions (from drizzle/0000_school-baseline.sql)         */
/* ------------------------------------------------------------------ */

const INTERVENTIONS_DDL = readFileSync("drizzle/0000_school-baseline.sql", "utf8")
  .split("--> statement-breakpoint")
  .find((s) => s.includes("CREATE TABLE `interventions`"))!;

const QR_DDL = readFileSync("drizzle/0000_school-baseline.sql", "utf8")
  .split("--> statement-breakpoint")
  .find((s) => s.includes("CREATE TABLE `qr_verifications`"))!;

const INTERVENTIONS_IDX = [
  "CREATE INDEX `interventions_student_idx` ON `interventions` (`student_id`)",
  "CREATE INDEX `interventions_status_idx` ON `interventions` (`status`)",
  "CREATE INDEX `interventions_target_idx` ON `interventions` (`target_date`)",
];
const QR_IDX = [
  "CREATE UNIQUE INDEX `qr_verifications_token_uq` ON `qr_verifications` (`verification_token`)",
];

/* ------------------------------------------------------------------ */

async function snapshot(name: string) {
  const backup = `${name}_backup_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
  if (await tableExists(backup)) {
    console.log(`  snapshot ${backup} already exists, skipping`);
    return backup;
  }
  await c.execute(`CREATE TABLE \`${backup}\` AS SELECT * FROM \`${name}\``);
  const n = await one(`select count(*) as n from \`${backup}\``);
  console.log(`  snapshot ${name} → ${backup} (${n} rows)`);
  return backup;
}

/** Rebuild a table to match baseline columns, copying intersecting data. */
async function rebuildTable(
  table: string,
  ddl: string,
  indexes: string[],
  copySql: string,
) {
  const current = await cols(table);
  const want = [...ddl.matchAll(/`(\w+)`/g)].map((m) => m[1]);
  if (current.join(",") === want.slice(1, want.indexOf("FOREIGN", 1)).join(",")) {
    console.log(`  ${table}: schema already matches baseline, skipping rebuild`);
    return;
  }
  await snapshot(table);
  await c.execute(`DROP TABLE IF EXISTS \`${table}__rebuild\``);
  await c.execute(`ALTER TABLE \`${table}\` RENAME TO \`${table}__rebuild\``);
  await c.execute(ddl);
  await c.execute(copySql);
  for (const idx of indexes) {
    try {
      await c.execute(idx);
    } catch (e) {
      console.log(`  (index already exists: ${(e as Error).message})`);
    }
  }
  const n = await one(`select count(*) as n from \`${table}\``);
  const oldN = await one(`select count(*) as n from \`${table}__rebuild\``);
  console.log(`  rebuilt ${table}: ${oldN} old rows → ${n} new rows`);
}

async function main() {
  console.log(`Target: ${url.slice(0, 40)}…  mode=${APPLY ? "APPLY" : "DRY-RUN"}`);

  /* ---------------- step 0: inventory ---------------- */
  const studentsN = await one("select count(*) as n from students");
  const childrenN = (await tableExists("children")) ? await one("select count(*) as n from children") : 0;
  const interN = await one("select count(*) as n from interventions");
  const qrN = await one("select count(*) as n from qr_verifications");
  console.log(`students=${studentsN} children=${childrenN} interventions=${interN} qr_verifications=${qrN}`);

  if (studentsN === 0 && childrenN === 0) {
    console.log("Nothing to migrate: no children and no students.");
    return;
  }

  if (!APPLY) {
    console.log("DRY-RUN: would snapshot children/interventions/qr_verifications, then rebuild");
    console.log("  - `interventions` → student_id schema (preserving rows)");
    console.log("  - `qr_verifications` → student_id schema (preserving rows)");
    console.log(`  - children (${childrenN} rows) → students`);
    return;
  }

  /* ---------------- step 1: backup everything we touch ---------------- */
  console.log("[1/4] snapshotting legacy tables");
  for (const t of ["children", "interventions", "qr_verifications"]) {
    if (await tableExists(t)) await snapshot(t);
  }

  /* ---------------- step 2: migrate children → students ---------------- */
  console.log("[2/4] migrating legacy children → students");
  if (await tableExists("children")) {
    // Map column differences:
    //   child_code → student_number
    //   civil_status, birth_place dropped; barangay_id → address text
    await c.execute(`
      INSERT INTO students (id, student_number, first_name, middle_name, last_name, suffix,
                            birth_date, sex, contact_number, address, status, record_status,
                            created_by, updated_by, created_at, updated_at)
      SELECT ch.id,
             replace(ch.child_code, 'CM-', 'SM-'),
             ch.first_name, ch.middle_name, ch.last_name, ch.suffix,
             ch.birth_date, lower(ch.sex), NULL,
             (SELECT ca.household_address FROM child_addresses ca WHERE ca.child_id = ch.id AND ca.is_current = 1 LIMIT 1),
             ch.status, ch.record_status,
             ch.created_by, ch.updated_by, ch.created_at, ch.updated_at
      FROM children ch
      WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.id = ch.id)
    `);
    const after = await one("select count(*) as n from students");
    console.log(`  students now ${after} rows`);
  }

  /* ---------------- step 3: rebuild interventions ---------------- */
  console.log("[3/4] rebuilding interventions + qr_verifications to baseline");
  await rebuildTable(
    "interventions",
    INTERVENTIONS_DDL,
    INTERVENTIONS_IDX,
    `INSERT INTO interventions (id, student_id, intervention_type, description, status, outcome,
                                start_date, target_date, completed_date, assigned_to, created_by,
                                created_at, updated_at)
     SELECT old.id, old.child_id, old.intervention_type, old.description,
            CASE lower(old.status)
              WHEN 'ongoing' THEN 'active'
              WHEN 'done'    THEN 'completed'
              ELSE lower(old.status)
            END,
            old.priority, old.start_date, old.target_date, old.completed_date, old.assigned_to,
            old.created_by, old.created_at, old.updated_at
     FROM interventions__rebuild old
     WHERE EXISTS (SELECT 1 FROM students s WHERE s.id = old.child_id)`,
  );

  await rebuildTable(
    "qr_verifications",
    QR_DDL,
    QR_IDX,
    `INSERT INTO qr_verifications (id, student_id, verification_token, verified_by,
                                   verification_type, result, verified_at, ip_address, user_agent)
     SELECT old.id, old.child_id, old.verification_token, old.verified_by,
            old.verification_type, lower(old.result), old.verified_at, old.ip_address, old.user_agent
     FROM qr_verifications__rebuild old
     WHERE EXISTS (SELECT 1 FROM students s WHERE s.id = old.child_id)`,
  );

  /* ---------------- step 4: report ---------------- */
  console.log("[4/4] verification");
  const s2 = await one("select count(*) as n from students");
  const i2 = await one("select count(*) as n from interventions");
  const q2 = await one("select count(*) as n from qr_verifications");
  console.log(`  students=${s2} interventions=${i2} qr_verifications=${q2}`);
  console.log("Done ✅  (legacy tables remain, untouched, in *_backup_* snapshots)");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Migration failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
