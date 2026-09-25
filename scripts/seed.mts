/**
 * Development seed script — Municipal Child Mapping System.
 *
 * Creates realistic FICTIONAL data (never real child information):
 *   - 1 municipality (Sta. Magdalena, Sorsogon) + 14 barangays
 *   - 13 schools (reference entities — NOT accounts)
 *   - roles (Barangay User / LGU User / System Administrator — NO school role)
 *   - permissions + role_permissions
 *   - default users (from DEFAULT_* env vars)
 *   - ~60 fictional children across record statuses with addresses,
 *     education, ECCD, disability records
 *   - validation history, duplicate candidates (pending + not_duplicate),
 *     monitoring records, interventions, follow-ups, QR events,
 *     notifications, audit entries, system settings
 *
 * Idempotency: reference data is upserted by natural keys; transactional
 * demo data is cleared and re-created deterministically (seeded RNG), so
 * re-running produces the same records without duplicating reference rows.
 *
 * Reset: `npm run db:reset` drops all data (see package.json / docs).
 */

import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import bcrypt from "bcryptjs";
import {
  auditLogs,
  barangays,
  childAddresses,
  childDisabilities,
  childDuplicateCandidates,
  childEducation,
  childEccd,
  childMonitoring,
  childValidations,
  children,
  interventions,
  interventionFollowups,
  municipalities,
  notifications,
  permissions,
  qrVerifications,
  reportExports,
  reports,
  rolePermissions,
  roles,
  schools,
  sessions,
  systemSettings,
  users,
} from "../src/db/schema";
import { PERMISSIONS, ROLE_PERMISSIONS } from "../src/lib/permissions";
import type { Role } from "../src/lib/constants";
import { randomToken } from "../src/lib/utils";

const now = new Date();

/* -------------------------------------------------------------------------- */
/*  Fictional name pools (FILIPINO-SOUNDING, COMPLETELY FICTIONAL)            */
/* -------------------------------------------------------------------------- */

const FIRST_NAMES = [
  "Maria", "Juan", "Ana", "Miguel", "Kyla", "Joshua", "Andrea", "Paolo",
  "Angelica", "Rafael", "Bea", "Carlo", "Diana", "Emmanuel", "Fiona", "Gabriel",
  "Hannah", "Ian", "Julia", "Kevin", "Liza", "Marco", "Nina", "Oscar",
  "Pia", "Quinn", "Rhea", "Samuel", "Trisha", "Vince", "Wendy", "Xavier",
  "Yna", "Zach", "Alyssa", "Brylle", "Camille", "Denise", "Elijah", "Faith",
];

const LAST_NAMES = [
  "Santos", "Dela Cruz", "Reyes", "Bautista", "Garcia", "Mendoza", "Torres",
  "Flores", "Ramos", "Aquino", "Villar", "Navarro", "Domingo", "Cruz",
  "Lopez", "Aguilar", "Salazar", "Romero", "Castillo", "Padilla", "Bermudez",
  "Alonzo", "Miranda", "Sison", "Lacson",
];

const MIDDLE_NAMES = [
  "Alonzo", "Bautista", "Cruz", "Domingo", "Enriquez", "Flores", "Garcia",
  "Hernandez", "Ignacio", "Jimenez", "Lumibao", "Mendoza", "Navarro", "Ortega",
];

/** The 14 barangays of Sta. Magdalena, Sorsogon. */
const BARANGAY_NAMES = [
  "Barangay I Poblacion (San Francisco)",
  "Barangay II Poblacion (Mother of Perpetual Help)",
  "Barangay III Poblacion (Del Rosario)",
  "Barangay IV Poblacion (Santo Niño)",
  "La Esperanza (Manangkas)",
  "Peñafrancia (Uson)",
  "Salvacion (Taberna)",
  "San Antonio (Kaburihan)",
  "San Bartolome (Talaongan)",
  "San Eugenio (Alig-igan)",
  "San Isidro (Bilaoyon)",
  "San Rafael (Bil-og)",
  "San Roque (Alamre)",
  "San Sebastian (Bigo)",
];

/* school, referencing the barangay index (0-based) used above */
const SCHOOLS: { name: string; barangay: number; code: string; type: string }[] = [
  { name: "Alig-igan Elementary School", barangay: 9, code: "SM-ES-001", type: "elementary" },
  { name: "Bigo Elementary School", barangay: 13, code: "SM-ES-002", type: "elementary" },
  { name: "Bilaoyon Elementary School", barangay: 10, code: "SM-ES-003", type: "elementary" },
  { name: "Manangkas Elementary School", barangay: 4, code: "SM-ES-004", type: "elementary" },
  { name: "Salvacion Elementary School", barangay: 6, code: "SM-ES-005", type: "elementary" },
  { name: "San Antonio Elementary School", barangay: 7, code: "SM-ES-006", type: "elementary" },
  { name: "San Rafael Elementary School", barangay: 11, code: "SM-ES-007", type: "elementary" },
  { name: "San Sebastian Elementary School", barangay: 13, code: "SM-ES-008", type: "elementary" },
  { name: "Sta. Magdalena Central School", barangay: 1, code: "SM-ES-009", type: "elementary" },
  { name: "Talaonga Elementary School", barangay: 8, code: "SM-ES-010", type: "elementary" },
  { name: "Uson Elementary School", barangay: 5, code: "SM-ES-011", type: "elementary" },
  { name: "Sta. Magdalena National High School", barangay: 2, code: "SM-NHS-001", type: "high_school" },
  { name: "Talaonga National High School", barangay: 8, code: "SM-NHS-002", type: "high_school" },
];

const GRADE_LEVELS = ["Kinder", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6"];
const SCHOOL_YEAR = "2026-2027";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20260925);

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function rand(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** ISO date for a child of the given age in years. */
function birthForAge(age: number): string {
  const year = now.getFullYear() - age;
  const month = String(rand(1, 12)).padStart(2, "0");
  const day = String(rand(1, 28)).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isoDaysAgo(days: number): Date {
  return new Date(Date.now() - days * 86400_000);
}

/* -------------------------------------------------------------------------- */
/*  1. Reference data (upserts — safe to re-run)                               */
/* -------------------------------------------------------------------------- */

const [muni] = await db
  .insert(municipalities)
  .values({
    id: "muni-sta-magdalena",
    name: "Municipality of Sta. Magdalena",
    province: "Province of Sorsogon",
    region: "Region V — Bicol",
    shortName: "Sta. Magdalena",
  })
  .onConflictDoUpdate({
    target: municipalities.id,
    set: { name: "Municipality of Sta. Magdalena", updatedAt: now },
  })
  .returning();

// Barangays upserted by unique name.
const barangayRows = await db
  .insert(barangays)
  .values(
    BARANGAY_NAMES.map((name, i) => ({
      id: `brg-${i + 1}`,
      municipalityId: muni.id,
      name,
      code: `SM-BRGY-${String(i + 1).padStart(2, "0")}`,
      isActive: true,
    })),
  )
  .onConflictDoUpdate({
    target: barangays.id,
    set: { municipalityId: muni.id, isActive: true, updatedAt: now },
  })
  .returning();

const schoolRows = await db
  .insert(schools)
  .values(
    SCHOOLS.map((s, i) => ({
      id: `sch-${i + 1}`,
      barangayId: barangayRows[s.barangay]?.id ?? null,
      name: s.name,
      schoolCode: s.code,
      schoolType: s.type,
      isActive: true,
    })),
  )
  .onConflictDoUpdate({
    target: schools.id,
    set: { isActive: true, updatedAt: now },
  })
  .returning();

/* -------------------------------------------------------------------------- */
/*  2. Roles, permissions, role_permissions                                    */
/* -------------------------------------------------------------------------- */

const ROLE_DEFS: { id: string; name: string; description: string }[] = [
  { id: "role-barangay", name: "Barangay User", description: "Encodes and submits child records for their barangay." },
  { id: "role-lgu", name: "LGU User", description: "Municipality-wide validation, duplicate review and reporting." },
  { id: "role-admin", name: "System Administrator", description: "Full system administration, users and settings." },
];

await db
  .insert(roles)
  .values(ROLE_DEFS)
  .onConflictDoUpdate({
    target: roles.id,
    set: { updatedAt: now },
  });

const permissionRows = await db
  .insert(permissions)
  .values(
    PERMISSIONS.map((name) => {
      const [module, action] = name.split(".");
      return {
        id: `perm-${name.replace(/\./g, "-")}`,
        name,
        description: `${module} · ${action}`,
        module,
        action,
      };
    }),
  )
  .onConflictDoNothing()
  .returning();

// role_permissions composite-PK upsert
await db
  .insert(rolePermissions)
  .values(
    (Object.keys(ROLE_PERMISSIONS) as Role[]).flatMap((role) =>
      ROLE_PERMISSIONS[role].map((perm) => ({
        roleId: `role-${role}`,
        permissionId: `perm-${perm.replace(/\./g, "-")}`,
      })),
    ),
  )
  .onConflictDoNothing();

/* -------------------------------------------------------------------------- */
/*  3. Default users (from DEFAULT_* env vars)                                 */
/* -------------------------------------------------------------------------- */

const { DEFAULT_CREDENTIALS } = await import("../src/lib/default-credentials");

const barangayOf = (id: string | null): string | null =>
  id && id.startsWith("brg-") ? id : null;

const userRows = await db
  .insert(users)
  .values(
    DEFAULT_CREDENTIALS.map((c, i) => ({
      id: `user-${c.role}`,
      email: c.email,
      passwordHash: c.passwordHash,
      firstName: c.firstName,
      lastName: c.lastName,
      roleId: `role-${c.role}`,
      barangayId: c.role === "barangay" ? barangayOf(c.barangayId) ?? "brg-9" : null,
      isActive: true,
    })),
  )
  .onConflictDoUpdate({
    target: users.id,
    set: { isActive: true, updatedAt: now },
  })
  .returning();

const userByRole = (role: Role): string => `user-${role}`;

/* -------------------------------------------------------------------------- */
/*  4. System settings (non-secret)                                            */
/* -------------------------------------------------------------------------- */

await db
  .insert(systemSettings)
  .values([
    { id: "set-system-name", key: "system_name", value: "Child Mapping Information System", description: "Display name of the system" },
    { id: "set-child-code-prefix", key: "child_code_prefix", value: "CM", description: "Prefix for generated child codes" },
    { id: "set-default-school-year", key: "default_school_year", value: SCHOOL_YEAR, description: "Default school year for education records" },
    { id: "set-maintenance-mode", key: "maintenance_mode", value: "false", description: "When true, non-admin sign-ins are blocked" },
  ])
  .onConflictDoNothing();

/* -------------------------------------------------------------------------- */
/*  5. Transactional demo data (cleared + regenerated deterministically)       */
/* -------------------------------------------------------------------------- */

// Children first clear dependents (order matters for FKs).
await db.delete(auditLogs);
await db.delete(notifications);
await db.delete(reportExports);
await db.delete(reports);
await db.delete(interventionFollowups);
await db.delete(interventions);
await db.delete(childMonitoring);
await db.delete(qrVerifications);
await db.delete(childDuplicateCandidates);
await db.delete(childValidations);
await db.delete(childDisabilities);
await db.delete(childEccd);
await db.delete(childEducation);
await db.delete(childAddresses);
await db.delete(sessions);
await db.delete(children);

type SeedChild = {
  code: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  birthDate: string;
  sex: "male" | "female";
  barangayIdx: number;
  recordStatus: string;
  educationStatus: string;
  gradeLevel: string | null;
  eccdStatus: string;
  hasDisability: boolean;
  createdBy: Role;
  createdDaysAgo: number;
};

const usedNames = new Set<string>();
function makeName(): { first: string; last: string } {
  while (true) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const key = `${first} ${last}`;
    if (!usedNames.has(key)) {
      usedNames.add(key);
      return { first, last };
    }
  }
}

const seedChildren: SeedChild[] = [];

for (let i = 1; i <= 60; i += 1) {
  const { first, last } = makeName();
  const age = rand(3, 17);
  const brgyIdx = rand(1, 14) - 1;
  const roll = rng();
  const recordStatus =
    roll < 0.12 ? "draft" : roll < 0.3 ? "pending_validation" : roll < 0.38 ? "needs_correction" : "verified";

  const educationStatus =
    age >= 6 && age <= 12
      ? rng() < 0.12 ? "out_of_school" : "enrolled"
      : age >= 13
        ? rng() < 0.18 ? "out_of_school" : rng() < 0.1 ? "graduated" : "enrolled"
        : rng() < 0.3 ? "enrolled" : "not_yet_in_school";

  seedChildren.push({
    code: `CM-${now.getFullYear()}-${String(i).padStart(6, "0")}`,
    firstName: first,
    middleName: rng() < 0.9 ? pick(MIDDLE_NAMES) : null,
    lastName: last,
    suffix: rng() < 0.04 ? "Jr." : null,
    birthDate: birthForAge(age),
    sex: rng() < 0.5 ? "male" : "female",
    barangayIdx: brgyIdx,
    recordStatus,
    educationStatus,
    gradeLevel: educationStatus === "enrolled" ? pick(GRADE_LEVELS) : null,
    eccdStatus: age <= 5 ? (rng() < 0.55 ? "participating" : "not_participating") : rng() < 0.1 ? "participating" : "unknown",
    hasDisability: rng() < 0.08,
    createdBy: pick(["barangay", "lgu"] as const),
    createdDaysAgo: rand(1, 120),
  });
}

// One pending duplicate pair (human review required — NOT auto-marked).
const dupPairIdx = 14; // San Antonio (Kaburihan)
seedChildren.push({
  code: `CM-${now.getFullYear()}-000061`,
  firstName: "Maria", middleName: null, lastName: "Santos", suffix: null,
  birthDate: "2018-03-14", sex: "female", barangayIdx: dupPairIdx,
  recordStatus: "pending_validation", educationStatus: "enrolled",
  gradeLevel: "Grade 2", eccdStatus: "unknown", hasDisability: false,
  createdBy: "barangay", createdDaysAgo: 30,
});
seedChildren.push({
  code: `CM-${now.getFullYear()}-000062`,
  firstName: "Maria", middleName: null, lastName: "Santos", suffix: null,
  birthDate: "2018-03-14", sex: "female", barangayIdx: dupPairIdx,
  recordStatus: "verified", educationStatus: "enrolled",
  gradeLevel: "Grade 2", eccdStatus: "unknown", hasDisability: false,
  createdBy: "barangay", createdDaysAgo: 20,
});

let dupAId = "";
let dupBId = "";

for (const c of seedChildren) {
  const id = crypto.randomUUID();
  if (c.code.endsWith("000061")) dupAId = id;
  if (c.code.endsWith("000062")) dupBId = id;

  const creatorId = userByRole(c.createdBy);
  const brgyId = barangayRows[c.barangayIdx]?.id ?? barangayRows[0].id;
  const schoolForBrgy = schoolRows.find((s) => s.barangayId === brgyId) ?? schoolRows[0];

  const submitted = c.recordStatus !== "draft";
  const verified = c.recordStatus === "verified";

  await db.insert(children).values({
    id,
    childCode: c.code,
    firstName: c.firstName,
    middleName: c.middleName,
    lastName: c.lastName,
    suffix: c.suffix,
    birthDate: c.birthDate,
    sex: c.sex,
    civilStatus: "single",
    birthPlace: `Barangay ${c.barangayIdx + 1}, Sta. Magdalena, Sorsogon`,
    barangayId: brgyId,
    status: "active",
    recordStatus: c.recordStatus,
    createdBy: creatorId,
    updatedBy: creatorId,
    createdAt: isoDaysAgo(c.createdDaysAgo),
    updatedAt: isoDaysAgo(c.createdDaysAgo - 2 > 0 ? c.createdDaysAgo - 2 : 0),
  });

  await db.insert(childAddresses).values({
    id: crypto.randomUUID(),
    childId: id,
    barangayId: brgyId,
    householdAddress: `Purok ${rand(1, 7)}, ${pick(LAST_NAMES)} Street`,
    sitio: rng() < 0.5 ? `Sitio ${pick(["Maligaya", "Bagong Silang", "Masagana", "Kalayaan"])}` : null,
    isCurrent: true,
  });

  await db.insert(childEducation).values({
    id: crypto.randomUUID(),
    childId: id,
    schoolId: c.educationStatus === "enrolled" ? schoolForBrgy.id : null,
    educationStatus: c.educationStatus,
    gradeLevel: c.gradeLevel,
    schoolYear: c.educationStatus === "enrolled" ? SCHOOL_YEAR : null,
    enrollmentStatus: c.educationStatus === "enrolled" ? "regular" : null,
    isCurrent: true,
  });

  await db.insert(childEccd).values({
    id: crypto.randomUUID(),
    childId: id,
    participationStatus: c.eccdStatus,
    programName: c.eccdStatus === "participating" ? "Barangay Child Development Center" : null,
    provider: c.eccdStatus === "participating" ? "Barangay LGU" : null,
    remarks: c.eccdStatus === "not_participating" ? pick(["No center nearby", "Family opted to defer", "Scheduling conflict"]) : null,
  });

  if (c.hasDisability) {
    await db.insert(childDisabilities).values({
      id: crypto.randomUUID(),
      childId: id,
      hasDisability: true,
      disabilityType: pick(["learning", "speech", "physical", "visual"]),
      description: "Identified during household survey (seed data — fictional).",
      supportNeeded: pick(["SPED assessment", "Learning materials", "Therapy sessions"]),
      assistanceStatus: pick(["assessment", "referred", "ongoing"]),
      verified: rng() < 0.4,
    });
  }

  if (submitted) {
    await db.insert(childValidations).values({
      id: crypto.randomUUID(),
      childId: id,
      submittedBy: creatorId,
      status: verified ? "approved" : c.recordStatus === "needs_correction" ? "needs_correction" : "pending",
      remarks: verified ? "All details verified with household survey." : null,
      submittedAt: isoDaysAgo(Math.max(c.createdDaysAgo - 2, 1)),
      reviewedBy: verified ? userByRole("lgu") : null,
      reviewedAt: verified ? isoDaysAgo(Math.max(c.createdDaysAgo - 5, 1)) : null,
    });
  }
}

/* -------------------------------------------------------------------------- */
/*  6. Duplicate candidates — pending AND reviewed states                      */
/* -------------------------------------------------------------------------- */

await db.insert(childDuplicateCandidates).values({
  id: crypto.randomUUID(),
  childId: dupAId,
  possibleChildId: dupBId,
  matchScore: 90,
  matchReason: JSON.stringify(["name", "birth_date", "barangay"]),
  status: "pending",
}).onConflictDoNothing();

// A reviewed "not duplicate" pair between two other seeded children.
const childIds = await db.select({ id: children.id, code: children.childCode }).from(children);
const idOf = (code: string) => childIds.find((c) => c.code === code)?.id;
const codeA = `CM-${now.getFullYear()}-000004`;
const codeB = `CM-${now.getFullYear()}-000010`;
if (idOf(codeA) && idOf(codeB)) {
  await db.insert(childDuplicateCandidates).values({
    id: crypto.randomUUID(),
    childId: idOf(codeA)!,
    possibleChildId: idOf(codeB)!,
    matchScore: 60,
    matchReason: JSON.stringify(["name", "barangay"]),
    status: "not_duplicate",
    reviewedBy: userByRole("lgu"),
    reviewNotes: "Confirmed different children after household verification.",
    reviewedAt: isoDaysAgo(35),
  }).onConflictDoNothing();
}

/* -------------------------------------------------------------------------- */
/*  7. Monitoring, interventions, follow-ups                                   */
/* -------------------------------------------------------------------------- */

// Out-of-school children via the education side table.
const osyIds = await db
  .select({ id: childEducation.childId })
  .from(childEducation)
  .where(eq(childEducation.educationStatus, "out_of_school"))
  .limit(5);

for (const { id } of osyIds) {
  await db.insert(childMonitoring).values({
    id: crypto.randomUUID(),
    childId: id,
    monitoringType: "out_of_school_youth",
    status: pick(["open", "in_progress"] as const),
    observedAt: isoDaysAgo(rand(3, 30)),
    recordedBy: userByRole("barangay"),
    remarks: "Household visit scheduled to discuss re-enrollment options.",
  });
}

const eccdNonIds = await db
  .select({ id: childEccd.childId })
  .from(childEccd)
  .where(eq(childEccd.participationStatus, "not_participating"))
  .limit(4);

for (const { id } of eccdNonIds) {
  await db.insert(childMonitoring).values({
    id: crypto.randomUUID(),
    childId: id,
    monitoringType: "eccd",
    status: "open",
    observedAt: isoDaysAgo(rand(3, 20)),
    recordedBy: userByRole("barangay"),
    remarks: "Encourage enrolment at the nearest child development center.",
  });
}

const disabilityIds = await db
  .select({ id: childDisabilities.childId })
  .from(childDisabilities)
  .limit(3);

for (const { id } of disabilityIds) {
  await db.insert(childMonitoring).values({
    id: crypto.randomUUID(),
    childId: id,
    monitoringType: "disability",
    status: "in_progress",
    observedAt: isoDaysAgo(rand(2, 15)),
    recordedBy: userByRole("lgu"),
    remarks: "Awaiting SPED assessment results.",
  });
}

// Interventions for OSY/disability children + follow-ups.
const interventionTargets = await db
  .select({ id: children.id })
  .from(children)
  .where(eq(children.recordStatus, "verified"))
  .limit(6);

for (let i = 0; i < interventionTargets.length; i += 1) {
  const child = interventionTargets[i];
  const interventionId = crypto.randomUUID();
  const status = i % 3 === 0 ? "completed" : i % 3 === 1 ? "ongoing" : "planned";

  await db.insert(interventions).values({
    id: interventionId,
    childId: child.id,
    interventionType: pick(["Educational assistance", "Re-enrollment counseling", "SPED referral", "ECCD enrollment drive"]),
    description: "Coordinated with barangay officials and school (seed data — fictional).",
    status,
    priority: pick(["low", "medium", "high"] as const),
    startDate: isoDaysAgo(rand(20, 60)).toISOString().slice(0, 10),
    targetDate: new Date(Date.now() + rand(10, 60) * 86400_000).toISOString().slice(0, 10),
    completedDate: status === "completed" ? isoDaysAgo(rand(1, 10)).toISOString().slice(0, 10) : null,
    assignedTo: userByRole(i % 2 === 0 ? "barangay" : "lgu"),
    createdBy: userByRole("lgu"),
    createdAt: isoDaysAgo(rand(20, 60)),
  });

  // Follow-ups for the ongoing/planned interventions.
  if (status !== "completed") {
    await db.insert(interventionFollowups).values({
      id: crypto.randomUUID(),
      interventionId,
      followUpDate: new Date(Date.now() + rand(3, 30) * 86400_000).toISOString().slice(0, 10),
      status: "scheduled",
      notes: "Coordinate with household and school for progress check.",
      recordedBy: userByRole("barangay"),
    });
  } else {
    await db.insert(interventionFollowups).values({
      id: crypto.randomUUID(),
      interventionId,
      followUpDate: isoDaysAgo(rand(5, 20)).toISOString().slice(0, 10),
      status: "done",
      notes: "Completed — learner confirmed enrolled.",
      recordedBy: userByRole("lgu"),
    });
  }
}

/* -------------------------------------------------------------------------- */
/*  8. QR verification events (safe opaque tokens — no personal data)          */
/* -------------------------------------------------------------------------- */

const verifiedChildren = await db
  .select({ id: children.id })
  .from(children)
  .where(eq(children.recordStatus, "verified"))
  .limit(14);

for (const child of verifiedChildren) {
  await db.insert(qrVerifications).values({
    id: crypto.randomUUID(),
    childId: child.id,
    verificationToken: randomToken(24),
    verifiedBy: userByRole("lgu"),
    verificationType: "generate",
    result: "valid",
    verifiedAt: isoDaysAgo(rand(1, 10)),
  });
}

/* -------------------------------------------------------------------------- */
/*  9. Reports + export metadata                                               */
/* -------------------------------------------------------------------------- */

const [report1] = await db
  .insert(reports)
  .values({
    id: crypto.randomUUID(),
    name: "Municipal summary (seed)",
    reportType: "municipal_summary",
    generatedBy: userByRole("lgu"),
    scope: "municipality",
    filtersJson: "{}",
    createdAt: isoDaysAgo(2),
  })
  .returning();

await db.insert(reportExports).values({
  id: crypto.randomUUID(),
  reportId: report1.id,
  format: "XLSX",
  fileReference: `exports/municipal-summary-${now.toISOString().slice(0, 10)}.xlsx`,
  generatedBy: userByRole("lgu"),
  createdAt: isoDaysAgo(2),
});

/* -------------------------------------------------------------------------- */
/*  10. Notifications + audit entries                                          */
/* -------------------------------------------------------------------------- */

await db.insert(notifications).values([
  {
    id: crypto.randomUUID(),
    userId: userByRole("admin"),
    type: "validation",
    title: "Records awaiting validation",
    message: "Several child records are pending validation from the latest survey batch.",
    link: "/validation",
    createdAt: isoDaysAgo(1),
  },
  {
    id: crypto.randomUUID(),
    userId: userByRole("admin"),
    type: "duplicate",
    title: "Duplicate review required",
    message: "A potential duplicate pair is awaiting human review.",
    link: "/validation/duplicates",
    createdAt: isoDaysAgo(2),
  },
  {
    id: crypto.randomUUID(),
    userId: userByRole("lgu"),
    type: "report",
    title: "Municipal summary ready",
    message: "The municipal summary report has been generated.",
    link: "/reports",
    createdAt: isoDaysAgo(1),
  },
  {
    id: crypto.randomUUID(),
    userId: userByRole("barangay"),
    type: "followup",
    title: "Follow-up due",
    message: "You have open monitoring follow-ups this month.",
    link: "/monitoring",
    createdAt: isoDaysAgo(1),
  },
]);

await db.insert(auditLogs).values([
  {
    id: crypto.randomUUID(),
    userId: userByRole("admin"),
    action: "SEED_RUN",
    entityType: "system",
    newValuesJson: JSON.stringify({ note: "seed executed" }),
    ipAddress: "127.0.0.1",
    userAgent: "seed-script",
    createdAt: now,
  },
  {
    id: crypto.randomUUID(),
    userId: userByRole("lgu"),
    action: "APPROVE_VALIDATION",
    entityType: "child",
    entityId: childIds[0]?.id ?? null,
    ipAddress: "127.0.0.1",
    userAgent: "seed-script",
    createdAt: isoDaysAgo(2),
  },
]);

console.log("Seed complete (idempotent upsert + deterministic demo data).");
console.log(`  municipality: ${muni.name}`);
console.log(`  barangays:    ${barangayRows.length}`);
console.log(`  schools:      ${schoolRows.length}`);
console.log(`  roles:        3 (Barangay User, LGU User, System Administrator — NO school role)`);
console.log(`  permissions:  ${permissionRows.length}`);
console.log(`  users:        ${userRows.length} (from DEFAULT_* env vars)`);
console.log(`  children:     ${seedChildren.length}`);
