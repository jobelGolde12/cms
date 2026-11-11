import { eq, type SQL } from "drizzle-orm";
import { users } from "@/db/schema";
import type { Role } from "./constants";

/**
 * Hidden dummy/test login accounts — one per application role.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  LOGINABLE BUT INVISIBLE
 * ─────────────────────────────────────────────────────────────────────────────
 * These accounts exist ONLY so every role's authentication, role resolution,
 * permission resolution and module visibility can be exercised end-to-end on
 * the live database. They are NOT personnel and carry NO school data:
 *   • no employee/personnel record is created for them;
 *   • no student, section, enrolment, grade, attendance, health or behavior
 *     row is ever created;
 *   • no teaching assignment is created (the Subject Teacher and Adviser dummy
 *     accounts stay deliberately unassigned — see the documentation).
 *
 * The `users.is_dummy` column is the AUTHORITATIVE marker. Every application
 * query that lists, counts or searches accounts filters it out (via
 * `realUsersOnly()` below or the explicit `is_dummy = 0` predicate); the only
 * lookup that intentionally ignores the marker is authentication
 * (`performLogin`), so a dummy account can still sign in and load its roles.
 *
 * Creation/removal lives in `scripts/seed-dummy-accounts.mts`
 * (`npm run seed:dummy` / `npm run seed:dummy -- --remove`). Documentation:
 * `documentation/dummy-test-accounts.md`.
 */

/**
 * Reserved e-mail domain for the dummy accounts.
 *
 * Deliberately NOT `@local.dev` (retired-demo deny-list) and NOT a real school
 * domain. The `account-provisioning` guard keeps this domain out of the normal
 * Create-User form so a real account can never collide with a dummy one.
 */
export const DUMMY_EMAIL_DOMAIN = "smnhs.test";

export type DummyAccountSpec = {
  /** Application role key (one per account — never a multi-role account). */
  role: Role;
  /** Seeded role id (deterministic — see scripts/lib/reference-seed.ts). */
  roleId: string;
  /** Deterministic account id, prefixed so it can never collide with real ids. */
  id: string;
  email: string;
  /** Simple, documented test password. NEVER stored in plaintext (bcrypt only). */
  password: string;
  firstName: string;
  lastName: string;
  /** Plain-language note about the account's expected access/restrictions. */
  expectedScope: string;
};

/** Deterministic id for a role's dummy account. */
export function dummyUserId(role: Role): string {
  return `dummy-user-${role.replace(/_/g, "-")}`;
}

/** Seeded role id for a role key. */
export function dummyRoleId(role: Role): string {
  return `role-${role.replace(/_/g, "-")}`;
}

/**
 * Exactly one dummy account per CURRENT role. Order mirrors the canonical
 * `ROLES` order in src/lib/constants.ts.
 */
export const DUMMY_ACCOUNTS: readonly DummyAccountSpec[] = [
  {
    role: "admin",
    roleId: dummyRoleId("admin"),
    id: dummyUserId("admin"),
    email: `dummy.admin@${DUMMY_EMAIL_DOMAIN}`,
    password: "admin123",
    firstName: "Dummy",
    lastName: "Administrator",
    expectedScope:
      "Full system access (all modules). Cannot see any dummy account anywhere in the UI — this account is itself hidden.",
  },
  {
    role: "school_admin",
    roleId: dummyRoleId("school_admin"),
    id: dummyUserId("school_admin"),
    email: `dummy.schooladmin@${DUMMY_EMAIL_DOMAIN}`,
    password: "schooladmin123",
    firstName: "Dummy",
    lastName: "School Administrator",
    expectedScope:
      "School-wide records, academics, analytics and reports. No health domain, no user management.",
  },
  {
    role: "subject_teacher",
    roleId: dummyRoleId("subject_teacher"),
    id: dummyUserId("subject_teacher"),
    email: `dummy.subjectteacher@${DUMMY_EMAIL_DOMAIN}`,
    password: "subject123",
    firstName: "Dummy",
    lastName: "Subject Teacher",
    expectedScope:
      "Grade-encoding module is visible, but with NO teaching load the account owns no (section, subject) pair — every grade-writing action is denied until a real load is assigned. No fake load is created.",
  },
  {
    role: "teacher",
    roleId: dummyRoleId("teacher"),
    id: dummyUserId("teacher"),
    email: `dummy.teacher@${DUMMY_EMAIL_DOMAIN}`,
    password: "teacher123",
    firstName: "Dummy",
    lastName: "Adviser",
    expectedScope:
      "Adviser role only, assigned to NO section. Attendance/behavior/assessment screens open but the row-level scope returns no students until a real advisory is assigned. No grade-writing permission.",
  },
  {
    role: "records",
    roleId: dummyRoleId("records"),
    id: dummyUserId("records"),
    email: `dummy.records@${DUMMY_EMAIL_DOMAIN}`,
    password: "records123",
    firstName: "Dummy",
    lastName: "Records",
    expectedScope:
      "Student records, enrolment, verification and duplicate review (read/write per the existing matrix).",
  },
  {
    role: "guidance",
    roleId: dummyRoleId("guidance"),
    id: dummyUserId("guidance"),
    email: `dummy.guidance@${DUMMY_EMAIL_DOMAIN}`,
    password: "guidance123",
    firstName: "Dummy",
    lastName: "Guidance",
    expectedScope:
      "Guidance Office domain only. No grades, attendance, assessments, interventions, reports, Student Development or official document printing.",
  },
  {
    role: "nurse",
    roleId: dummyRoleId("nurse"),
    id: dummyUserId("nurse"),
    email: `dummy.nurse@${DUMMY_EMAIL_DOMAIN}`,
    password: "nurse123",
    firstName: "Dummy",
    lastName: "Nurse",
    expectedScope:
      "Health & nutrition domain only. No reports access, no student personal-information editing.",
  },
  {
    role: "registrar",
    roleId: dummyRoleId("registrar"),
    id: dummyUserId("registrar"),
    email: `dummy.registrar@${DUMMY_EMAIL_DOMAIN}`,
    password: "registrar123",
    firstName: "Dummy",
    lastName: "Registrar",
    expectedScope:
      "Read-only official records plus student card / Form 137 printing. Grade encoding module is NOT accessible (no grades.encode).",
  },
  {
    role: "literacy_coordinator",
    roleId: dummyRoleId("literacy_coordinator"),
    id: dummyUserId("literacy_coordinator"),
    email: `dummy.literacy@${DUMMY_EMAIL_DOMAIN}`,
    password: "literacy123",
    firstName: "Dummy",
    lastName: "Literacy Coordinator",
    expectedScope:
      "Reading / literacy / numeracy assessment domain only, per the existing permission model.",
  },
  {
    role: "admin_officer",
    roleId: dummyRoleId("admin_officer"),
    id: dummyUserId("admin_officer"),
    email: `dummy.adminofficer@${DUMMY_EMAIL_DOMAIN}`,
    password: "officer123",
    firstName: "Dummy",
    lastName: "Admin Officer",
    expectedScope:
      "Employee-records domain only (employees, 201 files, service credits). Completely unable to access student data.",
  },
] as const;

/** The reserved dummy e-mail addresses (lower-cased) as a Set. */
export const DUMMY_EMAILS: ReadonlySet<string> = new Set(
  DUMMY_ACCOUNTS.map((a) => a.email.toLowerCase()),
);

/** The deterministic dummy account ids as a Set. */
export const DUMMY_USER_IDS: ReadonlySet<string> = new Set(
  DUMMY_ACCOUNTS.map((a) => a.id),
);

/** True when the address is on the reserved dummy-account domain. */
export function isDummyAccountEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${DUMMY_EMAIL_DOMAIN}`);
}

/** True when the account id is one of the deterministic dummy ids. */
export function isDummyUserId(id: string): boolean {
  return DUMMY_USER_IDS.has(id.trim().toLowerCase());
}

/**
 * SQL predicate restricting a query to REAL application accounts.
 *
 * Use it wherever accounts are listed, counted, searched, offered in a
 * dropdown or resolved for a display value. The authentication lookup is the
 * ONE place this predicate must NOT be applied.
 */
export function realUsersOnly(): SQL {
  return eq(users.isDummy, false);
}
