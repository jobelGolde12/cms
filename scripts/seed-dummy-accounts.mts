/**
 * Hidden dummy/test LOGIN accounts — one per application role.
 *
 *   npm run seed:dummy            create the accounts (idempotent)
 *   npm run seed:dummy -- --remove   remove ONLY the dummy accounts
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  WHAT THIS DOES / DOES NOT DO
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates exactly ten accounts — one for each current role — so every role's
 * authentication, role/permission resolution and module visibility can be
 * exercised on the live database. Nothing else is created:
 *   • NO student, guardian, enrolment, grade, attendance, behavior, health,
 *     assessment, intervention, report, document or QR row;
 *   • NO employee/personnel record (201 file, service credits);
 *   • NO section and NO teaching assignment.
 *
 * Each account is marked `users.is_dummy = true`. The application excludes
 * that marker from every account listing/search/dropdown and from audit
 * surfaces (see `src/lib/dummy-accounts.ts`); authentication is the single
 * intentional exception, so the accounts can still sign in.
 *
 * SAFETY
 *   • Idempotent: re-running skips accounts that already exist.
 *   • Never overwrites a real account: an e-mail collision fails SAFELY with
 *     a CONFLICT report and no changes.
 *   • Never silently converts a real account: only rows that already carry
 *     the dummy marker AND the expected role are treated as ours.
 *   • `--remove` deletes ONLY rows marked dummy whose id+e-mail are the known
 *     dummy pair. Real accounts, students, employees and real audit history
 *     are never touched. Dummy-account audit noise is removed with them.
 *
 * Credentials (password hashes use the app's bcrypt mechanism — plaintext is
 * never stored) are documented in `documentation/dummy-test-accounts.md`.
 */

import "dotenv/config";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../src/db";
import { auditLogs, notifications, userRoles, users } from "../src/db/schema";
import { hashPassword } from "../src/lib/auth";
import {
  DUMMY_ACCOUNTS,
  DUMMY_EMAILS,
  isDummyUserId,
} from "../src/lib/dummy-accounts";
import {
  assertNotRetiredDemoIdentifier,
  isRetiredDemoEmail,
} from "../src/lib/retired-demo";

const REMOVE = process.argv.includes("--remove");
const DRY_RUN = process.argv.includes("--dry-run");

function describeTarget(): string {
  const url = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || "file:./local.db";
  if (url.startsWith("libsql://") || url.startsWith("https://")) return "remote Turso (configured database)";
  return "local database";
}

/* -------------------------------------------------------------------------- */
/*  Create                                                                     */
/* -------------------------------------------------------------------------- */

async function seed(): Promise<void> {
  console.log("Dummy/test account provisioning");
  console.log(`  target: ${describeTarget()}`);
  console.log(`  accounts to ensure: ${DUMMY_ACCOUNTS.length}`);
  console.log("");

  const conflicts: string[] = [];
  let created = 0;
  let existing = 0;

  for (const spec of DUMMY_ACCOUNTS) {
    // Guard-rail: these must never collide with the retired demo deny-list.
    if (isRetiredDemoEmail(spec.email)) {
      conflicts.push(`${spec.email}: address is on the retired-demo deny-list — refusing.`);
      continue;
    }
    try {
      assertNotRetiredDemoIdentifier(spec.id);
    } catch (error) {
      conflicts.push(
        `${spec.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }

    const byEmail = await db
      .select({
        id: users.id,
        email: users.email,
        roleId: users.roleId,
        isDummy: users.isDummy,
      })
      .from(users)
      .where(eq(users.email, spec.email))
      .limit(1);

    if (byEmail.length > 0) {
      const row = byEmail[0]!;
      if (!row.isDummy) {
        conflicts.push(
          `CONFLICT: ${spec.email} already belongs to an existing REAL account (id ${row.id}). No changes were made.`,
        );
        continue;
      }
      if (row.id !== spec.id) {
        conflicts.push(
          `CONFLICT: ${spec.email} is a dummy account with an unexpected id (${row.id} ≠ ${spec.id}). No changes were made.`,
        );
        continue;
      }
      if (row.roleId !== spec.roleId) {
        conflicts.push(
          `CONFLICT: dummy ${spec.email} carries role ${row.roleId}, expected ${spec.roleId}. No changes were made.`,
        );
        continue;
      }
      // Ours and correct — make sure the primary role row exists (idempotent).
      await db
        .insert(userRoles)
        .values({ userId: spec.id, roleId: spec.roleId })
        .onConflictDoNothing();
      console.log(`Dummy account already exists: ${spec.email} — Skipping.`);
      existing++;
      continue;
    }

    // The deterministic id must not be taken by anything else.
    const byId = await db
      .select({ id: users.id, email: users.email, isDummy: users.isDummy })
      .from(users)
      .where(eq(users.id, spec.id))
      .limit(1);
    if (byId.length > 0) {
      const row = byId[0]!;
      conflicts.push(
        `CONFLICT: id ${spec.id} is already used by ${row.isDummy ? "a dummy" : "a REAL"} account (${row.email}). No changes were made.`,
      );
      continue;
    }

    if (DRY_RUN) {
      console.log(`[dry-run] would create ${spec.email} (${spec.role})`);
      continue;
    }

    const passwordHash = await hashPassword(spec.password);
    await db.insert(users).values({
      id: spec.id,
      roleId: spec.roleId,
      firstName: spec.firstName,
      lastName: spec.lastName,
      email: spec.email,
      passwordHash,
      isActive: true,
      isDummy: true,
    });
    await db
      .insert(userRoles)
      .values({ userId: spec.id, roleId: spec.roleId })
      .onConflictDoNothing();

    console.log(`+ created ${spec.email} (${spec.role})`);
    created++;
  }

  console.log("");
  console.log(`created: ${created}   already present: ${existing}`);

  if (conflicts.length > 0) {
    console.error("");
    for (const c of conflicts) console.error(c);
    console.error("");
    console.error("Aborting with conflicts — no account was overwritten.");
    process.exit(1);
  }

  if (!DRY_RUN) {
    const verify = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.isDummy, true)));
    console.log(`dummy accounts now in database: ${verify.length}`);
    console.log("Done. Passwords are documented in documentation/dummy-test-accounts.md");
  } else {
    console.log("Dry run — nothing was written.");
  }
}

/* -------------------------------------------------------------------------- */
/*  Remove                                                                     */
/* -------------------------------------------------------------------------- */

async function remove(): Promise<void> {
  console.log("Dummy/test account removal");
  console.log(`  target: ${describeTarget()}`);

  // Only rows that are BOTH marked dummy AND match a known (id, e-mail) pair.
  const rows = await db
    .select({ id: users.id, email: users.email, isDummy: users.isDummy })
    .from(users)
    .where(eq(users.isDummy, true));

  const targets = rows.filter(
    (r) => isDummyUserId(r.id) && DUMMY_EMAILS.has(r.email.trim().toLowerCase()),
  );
  const skipped = rows.filter(
    (r) => !(isDummyUserId(r.id) && DUMMY_EMAILS.has(r.email.trim().toLowerCase())),
  );

  for (const s of skipped) {
    console.warn(
      `Leaving dummy-marked row ${s.id} (${s.email}): not a known dummy account — refusing to delete unknown rows.`,
    );
  }

  if (targets.length === 0) {
    console.log("No dummy accounts to remove.");
    return;
  }

  if (DRY_RUN) {
    console.log(`[dry-run] would remove ${targets.length} dummy account(s):`);
    for (const t of targets) console.log(`  - ${t.email}`);
    console.log("Dry run — nothing was deleted.");
    return;
  }

  const ids = targets.map((t) => t.id);
  // Remove the accounts' own audit noise first, so no actor-less "system"
  // entries leak into the audit UI as a side effect of the FK set-null.
  await db.delete(auditLogs).where(inArray(auditLogs.userId, ids));
  await db.delete(notifications).where(inArray(notifications.userId, ids));
  // Marker is re-checked in the WHERE clause as a second guard.
  const deleted = await db
    .delete(users)
    .where(and(inArray(users.id, ids), eq(users.isDummy, true)))
    .returning({ id: users.id });

  for (const t of targets) console.log(`- removed ${t.email}`);
  console.log(`removed ${deleted.length} dummy account(s).`);

  const remaining = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.isDummy, true));
  console.log(
    remaining.length === 0
      ? "Verification: 0 dummy accounts remain."
      : `Verification: ${remaining.length} dummy account(s) still present.`,
  );
}

const run = REMOVE ? remove : seed;
run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Dummy-account seed failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
