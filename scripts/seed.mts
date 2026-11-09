/**
 * Development seed script — Records Management System of Sta. Magdalena
 * National High School.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  REFERENCE DATA ONLY — the demo data generator has been removed.
 * ─────────────────────────────────────────────────────────────────────────────
 * The old version of this script created ~48 FICTIONAL students (with
 * guardians, enrolments, grades, attendance, assessments, health, behaviour and
 * intervention records), a fictional plantilla of ten employees, twelve demo
 * sections and the demo teaching assignments — and it wiped the previous run
 * before doing so. All of that generation was removed on 2026-11-08 when the
 * live Turso database was purged of demo data (see
 * `documentation/user-data-cleanup.md`).
 *
 * What this script creates NOW:
 *   • roles, permissions and the role↔permission matrix (synced from code)
 *   • the current school year, grade levels and the subject catalog
 *   • the three grading periods (TERM 1, TERM 2, TERM 3)
 *   • behaviour categories and the system settings keys
 *   • accounts that are EXPLICITLY configured through the `DEFAULT_*`
 *     environment variables — created only, never overwriting an account that
 *     already exists
 *
 * What it NEVER creates: students, sections, employees, teacher assignments,
 * grades, attendance, assessments, notifications or audit rows. Operational
 * data belongs to the school and is created through the application.
 *
 * Idempotency: reference data is upserted by natural keys; existing accounts
 * and school-adjusted settings are preserved untouched.
 */

import "dotenv/config";
import {
  formatSeedSummary,
  seedReferenceData,
} from "./lib/reference-seed";

async function main() {
  // The seed targets whatever TURSO_DATABASE_URL points at. Because it is
  // additive, it is safe on a remote database — but the remote reference seed
  // (`npm run seed:reference`) is the documented tool there, so the dev script
  // still asks for an explicit opt-in before touching a remote database.
  const target = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || "";
  const isRemote = target.startsWith("libsql://") || target.startsWith("https://");
  if (isRemote && process.env.ALLOW_REMOTE_SEED !== "1") {
    console.error("Refusing to run the development seed against a remote database.");
    console.error(
      "Use `npm run seed:reference` for remote databases, or set ALLOW_REMOTE_SEED=1 to override.",
    );
    process.exit(1);
  }

  const summary = await seedReferenceData({ provisionAccounts: true });
  for (const line of formatSeedSummary(summary)) {
    console.log(line);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
