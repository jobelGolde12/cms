/**
 * Guard for the QA/test scripts that write fixture rows.
 *
 * The live Turso `cms` database was purged of every demo and QA row on
 * 2026-11-08 (see `documentation/user-data-cleanup.md`). The QA harnesses
 * (`qa-feature-fixtures.mts`, `rbac-qa-setup.mts`, …) still exist — they are
 * useful test utilities — but they must never repopulate the production
 * database by accident. They therefore require an explicit opt-in when the
 * configured database is remote.
 */

/** True when the configured database is a remote Turso/libsql instance. */
export function isRemoteDatabase(): boolean {
  const target = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || "";
  return target.startsWith("libsql://") || target.startsWith("https://");
}

/**
 * Exit with an error when the script would write fixture rows to a remote
 * database without an explicit opt-in.
 */
export function requireExplicitOptInForRemote(flagEnv: string, what: string): void {
  if (isRemoteDatabase() && process.env[flagEnv] !== "1") {
    console.error(
      `Refusing to run ${what} against a remote database without ${flagEnv}=1.`,
    );
    console.error(
      "The live `cms` database holds real school records — QA fixtures must never be recreated there by accident.",
    );
    process.exit(1);
  }
}
