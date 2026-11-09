/**
 * Shared REFERENCE-data seed used by both `scripts/seed.mts` (local) and
 * `scripts/seed-remote-reference.mts` (remote Turso).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  NO DEMO DATA — READ THIS BEFORE ADDING ANYTHING
 * ─────────────────────────────────────────────────────────────────────────────
 * On 2026-11-08 the Turso `cms` database was purged of every seeded and QA
 * row (see `documentation/user-data-cleanup.md`). The old seed scripts created
 * ~48 fictional students with guardians, enrolments, grades, attendance,
 * assessments, health and behaviour records, a fictional plantilla of ten
 * employees, twelve demo sections and the demo teaching assignments. All of
 * that generation has been REMOVED — the scripts below create reference data
 * only:
 *
 *   • roles, permissions and the role↔permission matrix (synced from code)
 *   • the current school year, grade levels and the subject catalog
 *   • the three grading periods (TERM 1, TERM 2, TERM 3)
 *   • behaviour categories and the system settings keys
 *   • optionally, accounts that are EXPLICITLY configured through the
 *     `DEFAULT_*` environment variables — created only, never overwriting an
 *     account that already exists
 *
 * Operational data (students, sections, employees, teacher assignments) is
 * created by the school through the application, never by a seed script.
 *
 * Safety rules enforced here:
 *   1. Nothing is ever deleted — the seed can only add reference rows.
 *   2. An existing account is never modified (no password reset, no role
 *      overwrite, no name overwrite).
 *   3. Retired demo identifiers are refused outright
 *      (see `src/lib/retired-demo.ts`).
 *   4. No credential is ever invented: an account is created only when BOTH
 *      its e-mail and its password hash are configured.
 */

import { eq } from "drizzle-orm";
import { db } from "../../src/db";
import {
  behaviorCategories,
  gradeLevels,
  gradingPeriods,
  permissions,
  rolePermissions,
  roles,
  schoolYears,
  subjects,
  systemSettings,
  userRoles,
  users,
} from "../../src/db/schema";
import { PERMISSIONS, ROLE_PERMISSIONS } from "../../src/lib/permissions";
import {
  BEHAVIOR_SEED_CATEGORIES,
  DEFAULT_ASSESSMENT_LEVELS,
  GRADING_PERIOD_NAMES,
  type Role,
} from "../../src/lib/constants";
import { assertNotRetiredDemoIdentifier, isRetiredDemoEmail } from "../../src/lib/retired-demo";

const now = new Date();
export const CURRENT_YEAR = `${now.getFullYear()}-${now.getFullYear() + 1}`;

/* --------------------------------- summary --------------------------------- */

export type SeedSummary = {
  roles: number;
  permissions: number;
  rolePermissions: number;
  accountsCreated: number;
  accountsSkipped: string[];
  gradeLevels: number;
  subjects: number;
  gradingPeriods: number;
  behaviorCategories: number;
  settingsInserted: number;
  settingsPreserved: number;
};

/* ----------------------------- roles & permissions ------------------------- */

const ROLE_ROWS: { id: string; name: string; description: string }[] = [
  { id: "role-admin", name: "System Administrator", description: "Full system access including users, settings, and audit logs." },
  { id: "role-school-admin", name: "School Administrator", description: "School-wide records, academics, analytics, and reports." },
  { id: "role-teacher", name: "Adviser", description: "Assigned sections: advisory, attendance, assessments and behavior — not grade encoding." },
  { id: "role-subject-teacher", name: "Subject Teacher", description: "Encodes grades for assigned subject, grade level and section(s) only." },
  { id: "role-records", name: "Records Personnel", description: "Student records, enrollment, verification, historical records." },
  { id: "role-guidance", name: "Guidance Counselor", description: "Guidance Office only — confidential incidents, interventions and assessments; no academic or reporting modules." },
  { id: "role-nurse", name: "Nurse", description: "Health and nutrition records only — no academic reports or grade data." },
  { id: "role-registrar", name: "Registrar", description: "Strictly read-only official records plus student card / Form 137 printing." },
  { id: "role-literacy-coordinator", name: "Language & Literacy Coordinator", description: "Reading, literacy and numeracy assessments and statistics." },
  { id: "role-admin-officer", name: "Admin Officer", description: "Employee records, PERA/201 files and service credits — no student data access." },
];

export async function seedRolesAndPermissions(): Promise<{
  roles: number;
  permissions: number;
  rolePermissions: number;
}> {
  for (const r of ROLE_ROWS) {
    await db
      .insert(roles)
      .values(r)
      .onConflictDoUpdate({
        target: roles.id,
        set: { name: r.name, description: r.description, updatedAt: new Date() },
      });
  }

  for (const p of PERMISSIONS) {
    await db
      .insert(permissions)
      .values({
        id: `perm-${p.replace(/\./g, "-")}`,
        name: p,
        description: `Permission ${p}`,
        module: p.split(".")[0] ?? "system",
        action: p.split(".")[1] ?? "access",
      })
      .onConflictDoUpdate({
        target: permissions.id,
        set: {
          name: p,
          description: `Permission ${p}`,
          module: p.split(".")[0] ?? "system",
          action: p.split(".")[1] ?? "access",
        },
      });
  }

  // The matrix in src/lib/permissions.ts is the single source of truth. The
  // stored rows are re-synced for the ten school roles only — any other role
  // row (legacy barangay/lgu) keeps whatever it already has.
  let rolePermissionCount = 0;
  for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = `role-${role.replace(/_/g, "-")}`;
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    for (const p of perms) {
      await db
        .insert(rolePermissions)
        .values({ roleId, permissionId: `perm-${p.replace(/\./g, "-")}` })
        .onConflictDoNothing();
      rolePermissionCount++;
    }
  }

  return {
    roles: ROLE_ROWS.length,
    permissions: PERMISSIONS.length,
    rolePermissions: rolePermissionCount,
  };
}

/* -------------------------------- accounts --------------------------------- */

type SeedAccount = {
  role: Role;
  emailEnv: string;
  hashEnv: string;
  firstEnv: string;
  lastEnv: string;
  id: string;
  name: string;
};

const SEED_ACCOUNTS: SeedAccount[] = [
  { role: "admin", emailEnv: "DEFAULT_ADMIN_EMAIL", hashEnv: "DEFAULT_ADMIN_PASSWORD_HASH", firstEnv: "DEFAULT_ADMIN_FIRST_NAME", lastEnv: "DEFAULT_ADMIN_LAST_NAME", id: "user-admin", name: "Admin" },
  { role: "school_admin", emailEnv: "DEFAULT_SCHOOL_ADMIN_EMAIL", hashEnv: "DEFAULT_SCHOOL_ADMIN_PASSWORD_HASH", firstEnv: "DEFAULT_SCHOOL_ADMIN_FIRST_NAME", lastEnv: "DEFAULT_SCHOOL_ADMIN_LAST_NAME", id: "user-school-admin", name: "SchoolAdmin" },
  { role: "teacher", emailEnv: "DEFAULT_TEACHER_EMAIL", hashEnv: "DEFAULT_TEACHER_PASSWORD_HASH", firstEnv: "DEFAULT_TEACHER_FIRST_NAME", lastEnv: "DEFAULT_TEACHER_LAST_NAME", id: "user-teacher", name: "Adviser" },
  { role: "subject_teacher", emailEnv: "DEFAULT_SUBJECT_TEACHER_EMAIL", hashEnv: "DEFAULT_SUBJECT_TEACHER_PASSWORD_HASH", firstEnv: "DEFAULT_SUBJECT_TEACHER_FIRST_NAME", lastEnv: "DEFAULT_SUBJECT_TEACHER_LAST_NAME", id: "user-subject", name: "SubjectTeacher" },
  { role: "records", emailEnv: "DEFAULT_RECORDS_EMAIL", hashEnv: "DEFAULT_RECORDS_PASSWORD_HASH", firstEnv: "DEFAULT_RECORDS_FIRST_NAME", lastEnv: "DEFAULT_RECORDS_LAST_NAME", id: "user-records", name: "Records" },
  { role: "guidance", emailEnv: "DEFAULT_GUIDANCE_EMAIL", hashEnv: "DEFAULT_GUIDANCE_PASSWORD_HASH", firstEnv: "DEFAULT_GUIDANCE_FIRST_NAME", lastEnv: "DEFAULT_GUIDANCE_LAST_NAME", id: "user-guidance", name: "Counselor" },
  { role: "nurse", emailEnv: "DEFAULT_NURSE_EMAIL", hashEnv: "DEFAULT_NURSE_PASSWORD_HASH", firstEnv: "DEFAULT_NURSE_FIRST_NAME", lastEnv: "DEFAULT_NURSE_LAST_NAME", id: "user-nurse", name: "Nurse" },
  { role: "registrar", emailEnv: "DEFAULT_REGISTRAR_EMAIL", hashEnv: "DEFAULT_REGISTRAR_PASSWORD_HASH", firstEnv: "DEFAULT_REGISTRAR_FIRST_NAME", lastEnv: "DEFAULT_REGISTRAR_LAST_NAME", id: "user-registrar", name: "Registrar" },
  { role: "literacy_coordinator", emailEnv: "DEFAULT_LITERACY_EMAIL", hashEnv: "DEFAULT_LITERACY_PASSWORD_HASH", firstEnv: "DEFAULT_LITERACY_FIRST_NAME", lastEnv: "DEFAULT_LITERACY_LAST_NAME", id: "user-literacy", name: "LiteracyCoord" },
  { role: "admin_officer", emailEnv: "DEFAULT_ADMIN_OFFICER_EMAIL", hashEnv: "DEFAULT_ADMIN_OFFICER_PASSWORD_HASH", firstEnv: "DEFAULT_ADMIN_OFFICER_FIRST_NAME", lastEnv: "DEFAULT_ADMIN_OFFICER_LAST_NAME", id: "user-admin-officer", name: "AdminOfficer" },
];

/**
 * Create the configured accounts — NEVER modify an existing one.
 *
 * An account is created only when its e-mail AND its password hash are
 * explicitly configured. An e-mail that already exists is left completely
 * untouched (no password reset, no role overwrite, no name overwrite): the
 * school administrator owns the real accounts, and a seed must never change
 * who can do what.
 */
export async function seedAccounts(): Promise<{
  created: number;
  skipped: string[];
}> {
  const skipped: string[] = [];
  let created = 0;

  for (const d of SEED_ACCOUNTS) {
    const email = process.env[d.emailEnv]?.trim();
    const hash = process.env[d.hashEnv]?.trim();

    if (!email || !hash) {
      skipped.push(d.role);
      continue;
    }
    if (isRetiredDemoEmail(email)) {
      console.warn(
        `Refusing to provision ${email}: this is a retired demo account and must not be recreated.`,
      );
      skipped.push(d.role);
      continue;
    }

    const existing = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing.length > 0) {
      // The account exists — leave it exactly as it is.
      skipped.push(d.role);
      continue;
    }

    // The deterministic seed id may already belong to a real account (the
    // live administrator, for instance). Never overwrite it — skip instead.
    const idTaken = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, d.id))
      .limit(1);
    if (idTaken.length > 0) {
      console.warn(
        `Skipping ${d.role}: the account id "${d.id}" is already used by an existing account, which is never overwritten by a seed run.`,
      );
      skipped.push(d.role);
      continue;
    }

    assertNotRetiredDemoIdentifier(d.id);

    const roleId = `role-${d.role.replace(/_/g, "-")}`;
    const firstName = process.env[d.firstEnv]?.trim() || d.name;
    const lastName = process.env[d.lastEnv]?.trim() || "Staff";

    await db.insert(users).values({
      id: d.id,
      roleId,
      firstName,
      lastName,
      email,
      passwordHash: hash,
      isActive: true,
    });

    // Keep the multi-role table in sync: the account holds its primary role.
    await db
      .insert(userRoles)
      .values({ userId: d.id, roleId })
      .onConflictDoNothing();

    created++;
  }

  return { created, skipped };
}

/* --------------------------- academic reference data ----------------------- */

const GRADE_LEVEL_ROWS = [
  { id: "gl-7", name: "Grade 7", orderIndex: 1 },
  { id: "gl-8", name: "Grade 8", orderIndex: 2 },
  { id: "gl-9", name: "Grade 9", orderIndex: 3 },
  { id: "gl-10", name: "Grade 10", orderIndex: 4 },
];

const SUBJECT_ROWS = [
  { code: "FIL", name: "Filipino" },
  { code: "ENG", name: "English" },
  { code: "MATH", name: "Mathematics" },
  { code: "SCI", name: "Science" },
  { code: "AP", name: "Araling Panlipunan" },
  { code: "ESP", name: "Edukasyon sa Pagpapakatao" },
  { code: "TLE", name: "Technology and Livelihood Education" },
  { code: "MAPEH", name: "MAPEH" },
];

/**
 * School year, grade levels, subjects and the THREE grading periods.
 *
 * Sections are intentionally NOT created: they are operational data owned by
 * the school (Sections → New Section). The old seed created twelve demo
 * sections (`sec-7-*` … `sec-10-*`) which were purged on 2026-11-08 and must
 * never come back.
 */
export async function seedAcademicReference(): Promise<{
  gradeLevels: number;
  subjects: number;
  gradingPeriods: number;
}> {
  const yearId = `sy-${CURRENT_YEAR}`;
  await db
    .insert(schoolYears)
    .values({ id: yearId, year: CURRENT_YEAR, isCurrent: true })
    .onConflictDoUpdate({
      target: schoolYears.id,
      set: { isCurrent: true, updatedAt: new Date() },
    });

  for (const gl of GRADE_LEVEL_ROWS) {
    await db
      .insert(gradeLevels)
      .values(gl)
      .onConflictDoUpdate({
        target: gradeLevels.id,
        set: { name: gl.name, orderIndex: gl.orderIndex, updatedAt: new Date() },
      });
  }

  for (const s of SUBJECT_ROWS) {
    await db
      .insert(subjects)
      .values({ id: `sub-${s.code}`, code: s.code, name: s.name, isActive: true })
      .onConflictDoUpdate({
        target: subjects.id,
        set: { name: s.name, isActive: true, updatedAt: new Date() },
      });
  }

  // Exactly three grading periods: TERM 1, TERM 2, TERM 3 (no Quarter 4).
  for (let i = 0; i < GRADING_PERIOD_NAMES.length; i++) {
    const id = `gp-${yearId}-${i + 1}`;
    await db
      .insert(gradingPeriods)
      .values({
        id,
        schoolYearId: yearId,
        name: GRADING_PERIOD_NAMES[i],
        orderIndex: i + 1,
        isCurrent: i === 0,
      })
      .onConflictDoUpdate({
        target: gradingPeriods.id,
        set: {
          name: GRADING_PERIOD_NAMES[i],
          orderIndex: i + 1,
          isCurrent: i === 0,
          updatedAt: new Date(),
        },
      });
  }

  return {
    gradeLevels: GRADE_LEVEL_ROWS.length,
    subjects: SUBJECT_ROWS.length,
    gradingPeriods: GRADING_PERIOD_NAMES.length,
  };
}

/* ------------------------- categories & system settings -------------------- */

const SYSTEM_SETTINGS_ROWS: { key: string; value: string; description: string }[] = [
  { key: "system_name", value: "Records Management System — Sta. Magdalena National High School", description: "Display name of the system." },
  { key: "student_number_prefix", value: "SM", description: "Prefix for generated student numbers." },
  { key: "default_school_year", value: CURRENT_YEAR, description: "Current school year." },
  { key: "assessment_levels", value: JSON.stringify(DEFAULT_ASSESSMENT_LEVELS), description: "Configurable proficiency levels per assessment domain (placeholders — school-adjustable)." },
  { key: "monitoring_rules", value: JSON.stringify({ failingGrade: 75, absenceCount: 5, lateCount: 5, behaviorConcerns: 3 }), description: "Requires-attention indicator thresholds (documented placeholders)." },
  { key: "maintenance_mode", value: "false", description: "Maintenance mode flag." },
];

/**
 * Behaviour categories (reference vocabulary) and the system settings keys.
 *
 * Settings are INSERT-ONLY: a value that the school has adjusted in the app
 * (for example `assessment_levels`, which the Literacy Coordinator screen
 * reads) is preserved, never overwritten by a seed run.
 */
export async function seedCategoriesAndSettings(): Promise<{
  behaviorCategories: number;
  settingsInserted: number;
  settingsPreserved: number;
}> {
  for (const c of BEHAVIOR_SEED_CATEGORIES) {
    await db
      .insert(behaviorCategories)
      .values({
        id: `bc-${c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name: c.name,
        kind: c.kind,
      })
      .onConflictDoUpdate({
        target: behaviorCategories.id,
        set: { name: c.name, kind: c.kind, updatedAt: new Date() },
      });
  }

  let inserted = 0;
  let preserved = 0;
  for (const s of SYSTEM_SETTINGS_ROWS) {
    const existing = await db
      .select({ id: systemSettings.id })
      .from(systemSettings)
      .where(eq(systemSettings.key, s.key))
      .limit(1);
    if (existing.length > 0) {
      preserved++;
      continue;
    }
    await db.insert(systemSettings).values({
      id: `set-${s.key}`,
      key: s.key,
      value: s.value,
      description: s.description,
    });
    inserted++;
  }

  return {
    behaviorCategories: BEHAVIOR_SEED_CATEGORIES.length,
    settingsInserted: inserted,
    settingsPreserved: preserved,
  };
}

/* --------------------------------- runner ---------------------------------- */

/**
 * Run the whole reference seed. Never deletes, never overwrites an account,
 * never creates operational data.
 */
export async function seedReferenceData(options?: {
  provisionAccounts?: boolean;
}): Promise<SeedSummary> {
  const provisionAccounts = options?.provisionAccounts ?? true;

  const roleResult = await seedRolesAndPermissions();
  const academic = await seedAcademicReference();
  const categories = await seedCategoriesAndSettings();
  const accounts = provisionAccounts
    ? await seedAccounts()
    : { created: 0, skipped: [] as string[] };

  return {
    ...roleResult,
    accountsCreated: accounts.created,
    accountsSkipped: accounts.skipped,
    ...academic,
    ...categories,
  };
}

/** Human-readable summary — never prints credentials or settings values. */
export function formatSeedSummary(summary: SeedSummary): string[] {
  return [
    `roles + permissions: ${summary.roles} roles, ${summary.permissions} permissions, ${summary.rolePermissions} role grants`,
    `accounts created: ${summary.accountsCreated}${
      summary.accountsSkipped.length
        ? ` (skipped: ${summary.accountsSkipped.join(", ")})`
        : ""
    }`,
    `academic reference: ${summary.gradeLevels} grade levels, ${summary.subjects} subjects, ${summary.gradingPeriods} grading periods (${GRADING_PERIOD_NAMES.join(", ")})`,
    `settings: ${summary.settingsInserted} inserted, ${summary.settingsPreserved} preserved`,
    "no demo data created — students, sections, employees and teaching assignments are created through the application",
  ];
}
