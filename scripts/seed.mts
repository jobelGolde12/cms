/**
 * Development seed script — Municipal Child Mapping System.
 *
 * Creates realistic FICTIONAL data (never real child information):
 *   - 14 barangays of Sta. Magdalena, Sorsogon
 *   - 13 public schools (DepEd Sta. Magdalena District)
 *   - 4 demo user accounts (admin / lgu / school / barangay)
 *   - ~60 fictional children across validation states
 *   - duplicate candidates, validation history, QR tokens, monitoring
 *     follow-ups, notifications and audit entries
 *
 * Usage: pnpm seed
 * The script is idempotent: it clears the application tables first.
 */

import { db } from "../src/db";
import bcrypt from "bcryptjs";
import {
  auditLogs,
  barangays,
  children,
  duplicateCandidates,
  monitoringFollowups,
  notifications,
  qrTokens,
  reports,
  schools,
  sessions,
  users,
  validationHistory,
} from "../src/db/schema";
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

/* school, in insert order, referencing the barangay index used above */
const SCHOOLS: { name: string; barangay: number }[] = [
  { name: "Alig-igan Elementary School", barangay: 9 },
  { name: "Bigo Elementary School", barangay: 13 },
  { name: "Bilaoyon Elementary School", barangay: 10 },
  { name: "Manangkas Elementary School", barangay: 4 },
  { name: "Salvacion Elementary School", barangay: 6 },
  { name: "San Antonio Elementary School", barangay: 7 },
  { name: "San Rafael Elementary School", barangay: 11 },
  { name: "San Sebastian Elementary School", barangay: 13 },
  { name: "Sta. Magdalena Central School", barangay: 2 },
  { name: "Talaonga Elementary School", barangay: 8 },
  { name: "Uson Elementary School", barangay: 5 },
  { name: "Sta. Magdalena National High School", barangay: 3 },
  { name: "Talaonga National High School", barangay: 8 },
];

const GRADE_LEVELS = ["Kinder", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6"];
const SCHOOL_YEAR = "2026-2027";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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

/** ISO date for a child of the given age in years (birth ~SY start, 2026). */
function birthForAge(age: number): string {
  const year = 2026 - age;
  const month = String(rand(1, 12)).padStart(2, "0");
  const day = String(rand(1, 28)).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isoDaysAgo(days: number): Date {
  return new Date(Date.now() - days * 86400_000);
}

/* -------------------------------------------------------------------------- */
/*  Wipe tables (order matters — child-referencing first)                      */
/* -------------------------------------------------------------------------- */

await db.delete(notifications);
await db.delete(auditLogs);
await db.delete(monitoringFollowups);
await db.delete(qrTokens);
await db.delete(duplicateCandidates);
await db.delete(validationHistory);
await db.delete(children);
await db.delete(reports);
await db.delete(sessions);
await db.delete(users);
await db.delete(schools);
await db.delete(barangays);

/* -------------------------------------------------------------------------- */
/*  Organization                                                               */
/* -------------------------------------------------------------------------- */

const barangayRows = await db
  .insert(barangays)
  .values(BARANGAY_NAMES.map((name, i) => ({ id: `brg-${i + 1}`, name })))
  .returning();

const schoolRows = await db
  .insert(schools)
  .values(
    SCHOOLS.map((s, i) => ({
      id: `sch-${i + 1}`,
      name: s.name,
      barangayId: `brg-${s.barangay + 1}`,
    })),
  )
  .returning();

/* -------------------------------------------------------------------------- */
/*  Users                                                                      */
/* -------------------------------------------------------------------------- */

const demoPassword = await bcrypt.hash("Admin123!", 10);

const userRows = await db
  .insert(users)
  .values([
    {
      id: "user-admin",
      email: "admin@stamagdalena.gov.ph",
      passwordHash: demoPassword,
      firstName: "Karing",
      lastName: "Magdalena",
      role: "admin",
      isActive: true,
    },
    {
      id: "user-lgu",
      email: "lgu@stamagdalena.gov.ph",
      passwordHash: demoPassword,
      firstName: "Lorna",
      lastName: "Buenaventura",
      role: "lgu",
      isActive: true,
    },
    {
      id: "user-school",
      email: "school@stamagdalena.gov.ph",
      passwordHash: demoPassword,
      firstName: "Teresita",
      lastName: "Dela Cruz",
      role: "school",
      schoolId: "sch-9",
      isActive: true,
    },
    {
      id: "user-brgy",
      email: "barangay@stamagdalena.gov.ph",
      passwordHash: demoPassword,
      firstName: "Arnel",
      lastName: "Ramirez",
      role: "barangay",
      barangayId: "brg-9",
      isActive: true,
    },
  ])
  .returning();

/* -------------------------------------------------------------------------- */
/*  Children                                                                   */
/* -------------------------------------------------------------------------- */

type SeedChild = {
  code: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  birthDate: string;
  sex: "male" | "female";
  barangayId: string;
  schoolId: string | null;
  educationalStatus: string;
  gradeLevel: string | null;
  eccdStatus: string;
  disabilityStatus: string;
  validationStatus: string;
  createdBy: string;
  createdDaysAgo: number;
  verified: boolean;
  note?: string;
};

const rng = mulberry32(20260920);
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

// A single helper adds one fictional child with sensible defaults.
function addChild(overrides: Partial<SeedChild> & { index: number }): void {
  const { first, last } = makeName();
  const age = rand(3, 17);
  const sex = rng() < 0.5 ? "male" : "female";
  const barangayId = `brg-${rand(1, 14)}`;
  const schoolMatch = schoolRows.find((s) => s.barangayId === barangayId);
  const validationRoll = rng();
  const validationStatus =
    validationRoll < 0.12
      ? "draft"
      : validationRoll < 0.3
        ? "submitted"
        : validationRoll < 0.45
          ? "pending_validation"
          : validationRoll < 0.52
            ? "needs_correction"
            : "verified";

  const educationalStatus = age >= 6 && age <= 12
    ? (rng() < 0.12 ? "out_of_school" : "enrolled")
    : age >= 13
      ? (rng() < 0.18 ? "out_of_school" : rng() < 0.1 ? "als_learner" : "enrolled")
      : rng() < 0.3 ? "enrolled" : "not_yet_enrolled";

  const schoolId =
    educationalStatus === "enrolled" ? (schoolMatch ? schoolMatch.id : "sch-9") : null;

  seedChildren.push({
    code: `CM-2026-${String(overrides.index).padStart(6, "0")}`,
    firstName: first,
    middleName: rng() < 0.9 ? pick(LAST_NAMES) : null,
    lastName: last,
    suffix: rng() < 0.04 ? "Jr." : null,
    birthDate: birthForAge(age),
    sex,
    barangayId,
    schoolId,
    educationalStatus,
    gradeLevel: educationalStatus === "enrolled" ? pick(GRADE_LEVELS) : null,
    eccdStatus: age <= 5 ? (rng() < 0.55 ? "participating" : "not_participating") : "unknown",
    disabilityStatus: rng() < 0.08 ? "with_disability" : rng() < 0.05 ? "suspected" : "none",
    validationStatus,
    createdBy: pick(["user-lgu", "user-school", "user-brgy"]),
    createdDaysAgo: rand(1, 120),
    verified: validationStatus === "verified",
    ...overrides,
  });
}

for (let i = 1; i <= 60; i += 1) addChild({ index: i });

// Two clearly paired potential duplicates inside the same barangay.
seedChildren.push({
  code: "CM-2026-000061",
  firstName: "Maria",
  middleName: null,
  lastName: "Santos",
  suffix: null,
  birthDate: "2018-03-14",
  sex: "female",
  barangayId: "brg-8",
  schoolId: "sch-6",
  educationalStatus: "enrolled",
  gradeLevel: "Grade 2",
  eccdStatus: "unknown",
  disabilityStatus: "none",
  validationStatus: "pending_validation",
  createdBy: "user-brgy",
  createdDaysAgo: 30,
  verified: false,
});
seedChildren.push({
  code: "CM-2026-000062",
  firstName: "Maria",
  middleName: null,
  lastName: "Santos",
  suffix: null,
  birthDate: "2018-03-14",
  sex: "female",
  barangayId: "brg-8",
  schoolId: "sch-6",
  educationalStatus: "enrolled",
  gradeLevel: "Grade 2",
  eccdStatus: "unknown",
  disabilityStatus: "none",
  validationStatus: "verified",
  createdBy: "user-brgy",
  createdDaysAgo: 20,
  verified: true,
});

await db.insert(children).values(
  seedChildren.map((c) => ({
    id: `ch-${c.code.slice(-6)}`,
    childCode: c.code,
    firstName: c.firstName,
    middleName: c.middleName,
    lastName: c.lastName,
    suffix: c.suffix,
    birthDate: c.birthDate,
    sex: c.sex,
    barangayId: c.barangayId,
    addressDetails: `Purok ${rand(1, 7)}, ${c.firstName}'s household`,
    guardianName: `${pick(LAST_NAMES)} Family`,
    guardianContact: `09${String(rand(100000000, 999999999))}`,
    educationalStatus: c.educationalStatus,
    schoolId: c.schoolId,
    gradeLevel: c.gradeLevel,
    schoolYear: c.educationalStatus === "enrolled" ? SCHOOL_YEAR : null,
    eccdStatus: c.eccdStatus,
    eccdCenter: c.eccdStatus === "participating" ? pick(["Barangay Child Dev. Center", "Child Dev. Center (Brgy.)"]) : null,
    eccdNonParticipationReason:
      c.eccdStatus === "not_participating" ? pick(["No center nearby", "Scheduling conflict", "Family opted to defer"]) : null,
    disabilityStatus: c.disabilityStatus,
    disabilityType: c.disabilityStatus === "with_disability" ? "learning" : c.disabilityStatus === "suspected" ? "other" : null,
    disabilitySupportRequired:
      c.disabilityStatus === "with_disability" ? pick(["Needs SPED assessment", "Needs learning materials support"]) : null,
    disabilitySupportProvided: null,
    disabilityReferral: c.disabilityStatus === "with_disability" ? pick(["School-based SPED", "Barangay social worker"]) : null,
    validationStatus: c.validationStatus,
    duplicateStatus: c.code === "CM-2026-000061" || c.code === "CM-2026-000062" ? "potential" : "none",
    notes: c.note ?? null,
    createdBy: c.createdBy,
    submittedAt: c.validationStatus === "draft" ? null : isoDaysAgo(c.createdDaysAgo - 2),
    verifiedBy: c.verified ? pick(["user-lgu", "user-admin"]) : null,
    verifiedAt: c.verified ? isoDaysAgo(c.createdDaysAgo - 5) : null,
    validationNotes: c.verified ? "All details verified with household survey." : null,
    createdAt: isoDaysAgo(c.createdDaysAgo),
    updatedAt: isoDaysAgo(c.createdDaysAgo),
  })),
);

/* -------------------------------------------------------------------------- */
/*  Validation history                                                         */
/* -------------------------------------------------------------------------- */

const allChildren = await db.select().from(children);

for (const child of allChildren) {
  const events: { action: string; at: Date; notes: string | null }[] = [
    {
      action: "created",
      at: new Date(child.createdAt),
      notes: null,
    },
  ];
  if (child.submittedAt) {
    events.push({ action: "submitted", at: new Date(child.submittedAt), notes: "Record submitted for validation." });
  }
  if (child.validationStatus === "needs_correction") {
    events.push({ action: "returned", at: isoDaysAgo(6), notes: "Birth date and school year need confirmation." });
    events.push({ action: "resubmitted", at: isoDaysAgo(3), notes: "Corrections applied." });
  }
  if (child.verifiedAt) {
    events.push({ action: "verified", at: new Date(child.verifiedAt), notes: child.validationNotes ?? "Record verified." });
  }
  await db.insert(validationHistory).values(
    events.map((e, i) => ({
      id: crypto.randomUUID(),
      childId: child.id,
      action: e.action,
      notes: e.notes,
      performedBy: e.action === "created" ? child.createdBy : child.verifiedBy ?? "user-lgu",
      createdAt: new Date(e.at.getTime() - i * 3600_000),
    })),
  );
}

/* -------------------------------------------------------------------------- */
/*  Duplicate candidate pair                                                   */
/* -------------------------------------------------------------------------- */

const dupA = allChildren.find((c) => c.childCode === "CM-2026-000061")!;
const dupB = allChildren.find((c) => c.childCode === "CM-2026-000062")!;

await db.insert(duplicateCandidates).values({
  id: crypto.randomUUID(),
  childId: dupA.id,
  candidateId: dupB.id,
  matchReasons: JSON.stringify(["name", "birth_date", "barangay"]),
  status: "potential",
  createdAt: isoDaysAgo(18),
});

/* -------------------------------------------------------------------------- */
/*  QR tokens (verified records)                                               */
/* -------------------------------------------------------------------------- */

const verifiedChildren = allChildren.filter((c) => c.validationStatus === "verified");
for (let i = 0; i < Math.min(verifiedChildren.length, 14); i += 1) {
  const child = verifiedChildren[i];
  await db.insert(qrTokens).values({
    id: crypto.randomUUID(),
    childId: child.id,
    token: randomToken(),
    isActive: true,
    createdBy: "user-lgu",
    createdAt: isoDaysAgo(4),
  });
}

/* -------------------------------------------------------------------------- */
/*  Monitoring follow-ups                                                      */
/* -------------------------------------------------------------------------- */

const osyChildren = allChildren.filter((c) => c.educationalStatus === "out_of_school");
for (const child of osyChildren.slice(0, 5)) {
  await db.insert(monitoringFollowups).values({
    id: crypto.randomUUID(),
    childId: child.id,
    category: "osy",
    status: rng() < 0.5 ? "open" : "in_progress",
    notes: "Household visit scheduled to discuss re-enrollment options.",
    followupDate: "2026-10-15",
    assignedTo: "user-school",
    createdBy: child.createdBy,
    createdAt: isoDaysAgo(7),
    updatedAt: isoDaysAgo(7),
  });
}

const eccdNonP = allChildren.filter((c) => c.eccdStatus === "not_participating");
for (const child of eccdNonP.slice(0, 4)) {
  await db.insert(monitoringFollowups).values({
    id: crypto.randomUUID(),
    childId: child.id,
    category: "eccd",
    status: "open",
    notes: "Encourage enrolment at the nearest child development center.",
    followupDate: "2026-11-01",
    assignedTo: "user-brgy",
    createdBy: child.createdBy,
    createdAt: isoDaysAgo(6),
    updatedAt: isoDaysAgo(6),
  });
}

const disabilityChildren = allChildren.filter(
  (c) => c.disabilityStatus === "with_disability" || c.disabilityStatus === "suspected",
);
for (const child of disabilityChildren.slice(0, 3)) {
  await db.insert(monitoringFollowups).values({
    id: crypto.randomUUID(),
    childId: child.id,
    category: "disability",
    status: "follow_up",
    notes: "Awaiting SPED assessment results.",
    followupDate: "2026-12-05",
    assignedTo: "user-lgu",
    createdBy: child.createdBy,
    createdAt: isoDaysAgo(5),
    updatedAt: isoDaysAgo(5),
  });
}

/* -------------------------------------------------------------------------- */
/*  Notifications                                                              */
/* -------------------------------------------------------------------------- */

await db.insert(notifications).values([
  {
    id: crypto.randomUUID(),
    userId: "user-admin",
    type: "validation",
    title: "Records awaiting validation",
    body: "5 child records are pending validation from the latest survey batch.",
    link: "/validation",
    createdAt: isoDaysAgo(1),
  },
  {
    id: crypto.randomUUID(),
    userId: "user-admin",
    type: "duplicate",
    title: "Potential duplicate detected",
    body: "Two records for 'Maria Santos' in the same barangay were flagged.",
    link: "/validation/duplicates",
    createdAt: isoDaysAgo(2),
  },
  {
    id: crypto.randomUUID(),
    userId: "user-lgu",
    type: "report",
    title: "Municipal consolidated report ready",
    body: "The July consolidated report has been generated.",
    link: "/reports",
    createdAt: isoDaysAgo(1),
  },
  {
    id: crypto.randomUUID(),
    userId: "user-school",
    type: "validation",
    title: "Record returned for correction",
    body: "One of your submitted records needs a corrected birth date.",
    link: "/children",
    createdAt: isoDaysAgo(3),
  },
  {
    id: crypto.randomUUID(),
    userId: "user-brgy",
    type: "monitoring",
    title: "ECCD follow-up due",
    body: "You have 3 open ECCD non-participation follow-ups this month.",
    link: "/monitoring/eccd",
    createdAt: isoDaysAgo(1),
  },
]);

/* -------------------------------------------------------------------------- */
/*  Audit entries                                                              */
/* -------------------------------------------------------------------------- */

await db.insert(auditLogs).values([
  {
    id: crypto.randomUUID(),
    userId: "user-admin",
    userRole: "admin",
    action: "seed.run",
    entity: "system",
    result: "success",
    metadata: JSON.stringify({ records: allChildren.length }),
    ip: "127.0.0.1",
    createdAt: now,
  },
  {
    id: crypto.randomUUID(),
    userId: "user-lgu",
    userRole: "lgu",
    action: "child.verify",
    entity: "child",
    entityId: "ch-000001",
    result: "success",
    ip: "127.0.0.1",
    createdAt: isoDaysAgo(2),
  },
]);

console.log("Seed complete.");
console.log(`  barangays: ${barangayRows.length}`);
console.log(`  schools:   ${schoolRows.length}`);
console.log(`  users:     ${userRows.length}`);
console.log(`  children:  ${allChildren.length}`);
console.log("");
console.log("Demo accounts (all share password 'Admin123!'):");
console.log("  admin     -> admin@stamagdalena.gov.ph");
console.log("  LGU       -> lgu@stamagdalena.gov.ph");
console.log("  school    -> school@stamagdalena.gov.ph");
console.log("  barangay  -> barangay@stamagdalena.gov.ph");