/**
 * Reference-data-only seed for the remote Turso DB.
 *
 * Unlike the old versions of these scripts, this NEVER deletes rows and never
 * creates demo data — it only upserts the reference rows the application needs:
 *
 *   • roles, permissions and the role↔permission matrix (synced from code)
 *   • the current school year, grade levels and the subject catalog
 *   • the three grading periods (TERM 1, TERM 2, TERM 3)
 *   • behaviour categories and the system settings keys
 *
 * Sections, students, employees and teacher assignments are NOT created — they
 * are operational data owned by the school. The demo rows this script used to
 * generate (twelve `sec-7-*` … `sec-10-*` sections and the demo teaching
 * assignments) were purged on 2026-11-08 and must never come back; see
 * `documentation/user-data-cleanup.md`.
 *
 * Accounts: created ONLY when the `DEFAULT_*` environment variables configure
 * both an e-mail and a password hash, and ONLY when the e-mail does not exist
 * yet. An existing account is never modified — no password reset, no role
 * overwrite, no name overwrite.
 */
import "dotenv/config";
import {
  formatSeedSummary,
  seedReferenceData,
} from "./lib/reference-seed";

async function main() {
  const summary = await seedReferenceData({ provisionAccounts: true });
  for (const line of formatSeedSummary(summary)) {
    console.log(line);
  }
  console.log("reference data synced ✓");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Reference seed failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
