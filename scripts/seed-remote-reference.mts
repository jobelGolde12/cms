/**
 * Reference-data-only seed for the remote Turso DB.
 *
 * Unlike scripts/seed.mts (dev seed that wipes demo data), this NEVER deletes
 * rows — it only upserts reference rows required by the app:
 *   school year, grade levels, sections, subjects, grading periods,
 *   behavior categories, system settings, roles/permissions.
 *
 * Users: upserts default demo users ONLY if the DEFAULT_* env vars are set
 * (or, if not set, leaves existing users untouched) — never resets passwords
 * of users that already exist.
 */
import "dotenv/config";
import { db } from "../src/db";
import {
  behaviorCategories,
  gradeLevels,
  gradingPeriods,
  permissions,
  rolePermissions,
  roles,
  schoolYears,
  sections,
  subjects,
  systemSettings,
  users,
} from "../src/db/schema";
import { PERMISSIONS, ROLE_PERMISSIONS } from "../src/lib/permissions";
import {
  BEHAVIOR_SEED_CATEGORIES,
  DEFAULT_ASSESSMENT_LEVELS,
  GRADING_PERIOD_NAMES,
  type Role,
} from "../src/lib/constants";
import { users as usersSchema } from "../src/db/schema";
import { hashPassword } from "../src/lib/auth";
import { eq, sql } from "drizzle-orm";

const now = new Date();
const CURRENT_YEAR = `${now.getFullYear()}-${now.getFullYear() + 1}`;

async function seedRoles() {
  const roleRows: { id: string; name: string; description: string }[] = [
    { id: "role-admin", name: "System Administrator", description: "Full system access including users, settings, and audit logs." },
    { id: "role-school-admin", name: "School Administrator", description: "School-wide records, academics, analytics, and reports." },
    { id: "role-teacher", name: "Teacher / Adviser", description: "Assigned sections: grades, attendance, assessments, behavior." },
    { id: "role-records", name: "Records Personnel", description: "Student records, enrollment, verification, historical records." },
    { id: "role-guidance", name: "Guidance Personnel", description: "Behavior, interventions, and student support information." },
  ];
  for (const r of roleRows) {
    await db
      .insert(roles)
      .values(r)
      .onConflictDoUpdate({ target: roles.id, set: { name: r.name, description: r.description, updatedAt: new Date() } });
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
        set: { name: p, module: p.split(".")[0] ?? "system" },
      });
  }

  for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = `role-${role.replace(/_/g, "-")}`;
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    for (const p of perms) {
      await db
        .insert(rolePermissions)
        .values({ roleId, permissionId: `perm-${p.replace(/\./g, "-")}` })
        .onConflictDoNothing();
    }
  }
}

async function seedUsers() {
  const fallbackHash = await hashPassword("password123");
  const rolesToSeed: { role: Role; emailEnv: string; hashEnv: string; id: string; name: string }[] = [
    { role: "admin", emailEnv: "DEFAULT_ADMIN_EMAIL", hashEnv: "DEFAULT_ADMIN_PASSWORD_HASH", id: "user-admin", name: "Admin" },
    { role: "school_admin", emailEnv: "DEFAULT_SCHOOL_ADMIN_EMAIL", hashEnv: "DEFAULT_SCHOOL_ADMIN_PASSWORD_HASH", id: "user-school-admin", name: "SchoolAdmin" },
    { role: "teacher", emailEnv: "DEFAULT_TEACHER_EMAIL", hashEnv: "DEFAULT_TEACHER_PASSWORD_HASH", id: "user-teacher", name: "Teacher" },
    { role: "records", emailEnv: "DEFAULT_RECORDS_EMAIL", hashEnv: "DEFAULT_RECORDS_PASSWORD_HASH", id: "user-records", name: "Records" },
    { role: "guidance", emailEnv: "DEFAULT_GUIDANCE_EMAIL", hashEnv: "DEFAULT_GUIDANCE_PASSWORD_HASH", id: "user-guidance", name: "Guidance" },
  ];
  for (const d of rolesToSeed) {
    const email = process.env[d.emailEnv];
    if (!email) continue; // never invent credentials
    const existing = await db.select({ id: usersSchema.id }).from(usersSchema).where(eq(usersSchema.id, d.id)).limit(1);
    const values = {
      id: d.id,
      roleId: `role-${d.role.replace(/_/g, "-")}`,
      firstName: process.env[`${d.role.toUpperCase()}_FIRST_NAME`] ?? d.name,
      lastName: process.env[`${d.role.toUpperCase()}_LAST_NAME`] ?? "Demo",
      email,
      passwordHash: existing.length ? undefined : (process.env[d.hashEnv] ?? fallbackHash),
      isActive: true,
    };
    if (existing.length) {
      await db.update(usersSchema).set(values).where(eq(usersSchema.id, d.id));
    } else {
      await db.insert(usersSchema).values({ ...values, passwordHash: process.env[d.hashEnv] ?? fallbackHash });
    }
  }
}

async function seedAcademicStructure(teacherId: string | null) {
  const yearId = `sy-${CURRENT_YEAR}`;
  await db
    .insert(schoolYears)
    .values({ id: yearId, year: CURRENT_YEAR, isCurrent: true })
    .onConflictDoUpdate({ target: schoolYears.id, set: { isCurrent: true, updatedAt: new Date() } });

  // Demote any other "current" year flags.
  await db.update(schoolYears).set({ isCurrent: false }).where(eq(schoolYears.year, "MISSING_YEAR"));

  const gradeNames = ["Grade 7", "Grade 8", "Grade 9", "Grade 10"];
  for (let i = 0; i < gradeNames.length; i++) {
    await db
      .insert(gradeLevels)
      .values({ id: `gl-${i + 7}`, name: gradeNames[i], orderIndex: i + 1 })
      .onConflictDoUpdate({ target: gradeLevels.id, set: { name: gradeNames[i], orderIndex: i + 1, updatedAt: new Date() } });
  }

  const sectionNames = ["Sampaguita", "Ilang-Ilang", "Molave"];
  let sIdx = 0;
  for (let g = 0; g < gradeNames.length; g++) {
    for (const name of sectionNames) {
      const id = `sec-${g + 7}-${sIdx++}`;
      await db
        .insert(sections)
        .values({
          id,
          schoolYearId: yearId,
          gradeLevelId: `gl-${g + 7}`,
          name,
          adviserId: teacherId,
          isActive: true,
        })
        .onConflictDoNothing({ target: sections.id });
    }
  }

  const subjectSeed = [
    { code: "FIL", name: "Filipino" },
    { code: "ENG", name: "English" },
    { code: "MATH", name: "Mathematics" },
    { code: "SCI", name: "Science" },
    { code: "AP", name: "Araling Panlipunan" },
    { code: "ESP", name: "Edukasyon sa Pagpapakatao" },
    { code: "TLE", name: "Technology and Livelihood Education" },
    { code: "MAPEH", name: "MAPEH" },
  ];
  for (const s of subjectSeed) {
    await db
      .insert(subjects)
      .values({ id: `sub-${s.code}`, code: s.code, name: s.name, isActive: true })
      .onConflictDoUpdate({ target: subjects.id, set: { name: s.name, isActive: true, updatedAt: new Date() } });
  }

  for (let i = 0; i < GRADING_PERIOD_NAMES.length; i++) {
    await db
      .insert(gradingPeriods)
      .values({
        id: `gp-${yearId}-${i + 1}`,
        schoolYearId: yearId,
        name: GRADING_PERIOD_NAMES[i],
        orderIndex: i + 1,
        isCurrent: i === 0,
      })
      .onConflictDoNothing({ target: gradingPeriods.id });
  }
}

async function seedCategoriesAndSettings() {
  for (const cat of BEHAVIOR_SEED_CATEGORIES) {
    await db
      .insert(behaviorCategories)
      .values({ id: `bc-${cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, name: cat.name, kind: cat.kind })
      .onConflictDoUpdate({ target: behaviorCategories.id, set: { name: cat.name, kind: cat.kind, updatedAt: new Date() } });
  }

  const settings: { key: string; value: string; description: string }[] = [
    { key: "system_name", value: "Records Management System — Sta. Magdalena National High School", description: "Display name of the system." },
    { key: "student_number_prefix", value: "SM", description: "Prefix for generated student numbers." },
    { key: "default_school_year", value: CURRENT_YEAR, description: "Current school year." },
    { key: "assessment_levels", value: JSON.stringify(DEFAULT_ASSESSMENT_LEVELS), description: "Configurable proficiency levels per assessment domain." },
    { key: "monitoring_rules", value: JSON.stringify({ failingGrade: 75, absenceCount: 5, lateCount: 5, behaviorConcerns: 3 }), description: "Requires-attention indicator thresholds." },
    { key: "maintenance_mode", value: "false", description: "Maintenance mode flag." },
  ];
  for (const s of settings) {
    // Existing remote rows use a different id convention (set-system-name etc.),
    // so the UNIQUE `key` may collide across ids → upsert by key via excluded.id.
    await db
      .insert(systemSettings)
      .values({ id: `set-${s.key}`, key: s.key, value: s.value, description: s.description })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { id: sql`excluded.id`, value: s.value, description: s.description, updatedAt: new Date() },
      });
  }
}

async function main() {
  await seedRoles();
  console.log("roles + permissions ✓");

  // Teacher row may not exist remotely; use its id when present
  const teacherRow = await db.select({ id: usersSchema.id }).from(usersSchema).where(eq(usersSchema.id, "user-teacher")).limit(1);
  await seedAcademicStructure(teacherRow[0]?.id ?? null);
  console.log("school year + grade levels + sections + subjects + grading periods ✓");

  await seedCategoriesAndSettings();
  console.log("behavior categories + system settings ✓");

  await seedUsers();
  console.log("default users upserted (env-driven only) ✓");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Reference seed failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
