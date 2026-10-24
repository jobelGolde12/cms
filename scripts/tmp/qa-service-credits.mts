/**
 * Service Credits QA harness — creates clearly-tagged test employees and
 * transactions for live feature-verification against the real Turso database.
 *
 *   npx tsx scripts/tmp/qa-service-credits.mts            # create fixtures
 *   npx tsx scripts/tmp/qa-service-credits.mts --cleanup  # remove exactly these rows
 *
 * Nothing here is referenced by application code (TEST UTILITY ONLY).
 */
import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../src/db";
import { employees, serviceCreditTransactions } from "../../src/db/schema";

const TAG = "QA-SC";
const ACTIVE_ID = "qa-emp-sc-active";
const ARCHIVED_ID = "qa-emp-sc-archived";
const createdBy = "user-qa-integration"; // QA user from scripts/tmp/qa-user.mts

async function cleanup() {
  console.log("Cleaning service-credits QA fixtures…");
  await db
    .delete(serviceCreditTransactions)
    .where(inArray(serviceCreditTransactions.employeeId, [ACTIVE_ID, ARCHIVED_ID]));
  await db.delete(employees).where(inArray(employees.id, [ACTIVE_ID, ARCHIVED_ID]));
  console.log("Cleanup done.");
}

async function setup() {
  console.log("Creating service-credits QA fixtures…");
  const existingTxs = await db
    .select({ id: serviceCreditTransactions.id })
    .from(serviceCreditTransactions)
    .where(inArray(serviceCreditTransactions.employeeId, [ACTIVE_ID, ARCHIVED_ID]))
    .limit(1);
  if (existingTxs.length > 0) {
    console.log("Fixtures already present — running cleanup first…");
    await cleanup();
  }

  await db.insert(employees).values([
    {
      id: ACTIVE_ID,
      employeeNumber: `${TAG}-EMP-000001`,
      firstName: TAG,
      lastName: "Active",
      sex: "female",
      position: "Teacher I",
      appointmentStatus: "permanent",
      employmentType: "teaching",
      department: "DepEd",
      status: "active",
      createdBy,
      updatedBy: createdBy,
    },
    {
      id: ARCHIVED_ID,
      employeeNumber: `${TAG}-EMP-000002`,
      firstName: TAG,
      lastName: "Archived",
      sex: "male",
      position: "Clerk I",
      appointmentStatus: "casual",
      employmentType: "support",
      department: "DepEd",
      status: "archived",
      createdBy,
      updatedBy: createdBy,
    },
  ]);

  await db.insert(serviceCreditTransactions).values([
    // Active employee: earned 10.5, consumed 5.25 → balance 5.25
    {
      id: "qa-sc-tx-1",
      employeeId: ACTIVE_ID,
      type: "earned",
      credits: 10.5,
      transactionDate: "2026-09-15",
      reason: "QA fixture — earned credit (vacation accumulation)",
      referenceDocument: "QA-OO-001",
      remarks: null,
      createdBy,
      updatedBy: createdBy,
    },
    {
      id: "qa-sc-tx-2",
      employeeId: ACTIVE_ID,
      type: "consumed",
      credits: 3.25,
      transactionDate: "2026-10-05",
      reason: "QA fixture — consumed credit (sick leave)",
      referenceDocument: "QA-OO-002",
      remarks: null,
      createdBy,
      updatedBy: createdBy,
    },
    {
      id: "qa-sc-tx-3",
      employeeId: ACTIVE_ID,
      type: "consumed",
      credits: 2,
      transactionDate: "2026-10-20",
      reason: "QA fixture — recent consumption (this week window)",
      referenceDocument: "QA-OO-003",
      remarks: null,
      createdBy,
      updatedBy: createdBy,
    },
    // Archived employee: one historical transaction
    {
      id: "qa-sc-tx-4",
      employeeId: ARCHIVED_ID,
      type: "earned",
      credits: 6,
      transactionDate: "2025-12-01",
      reason: "QA fixture — archived employee historical entry",
      referenceDocument: "QA-OO-004",
      remarks: null,
      createdBy,
      updatedBy: createdBy,
    },
  ]);

  console.log("Fixtures ready:");
  console.log(`  active employee   ${ACTIVE_ID} (${TAG}-EMP-000001, balance 5.25)`);
  console.log(`  archived employee ${ARCHIVED_ID} (${TAG}-EMP-000002)`);
}

if (process.argv.includes("--cleanup")) {
  cleanup()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    });
} else {
  setup()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    });
}
