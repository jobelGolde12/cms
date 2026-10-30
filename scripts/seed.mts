/**
 * Development seed script — Records Management System of Sta. Magdalena
 * National High School.
 *
 * Creates realistic FICTIONAL data (never real student information):
 *   - roles (9 school roles) + permissions + role_permissions
 *   - default users (from DEFAULT_* env vars)
 *   - current school year, grade levels (7–10), sections with advisers
 *   - subjects + grading periods
 *   - behavior categories, intervention types, assessment level settings
 *   - ~48 fictional students with guardians, enrollments, grades,
 *     attendance, assessments (reading/literacy/numeracy), behavior
 *     records, interventions, QR events, notifications, audit entries
 *
 * Idempotency: reference data is upserted by natural keys; demo data is
 * cleared and re-created deterministically (seeded RNG), so re-running
 * produces the same records without duplicating reference rows.
 */

import "dotenv/config";
import { db } from "../src/db";
import {
  assessments,
  attendanceRecords,
  auditLogs,
  behaviorCategories,
  behaviorRecords,
  clinicalRecords,
  duplicateCandidates,
  gradeLevels,
  healthRecords,
  gradingPeriods,
  guardians,
  interventionFollowups,
  employees,
  employee201Records,
  serviceCreditTransactions,
  interventions,
  notifications,
  permissions,
  qrVerifications,
  recordVerifications,
  reportExports,
  reports,
  rolePermissions,
  roles,
  schoolYears,
  sections,
  sectionSubjectTeachers,
  studentEnrollments,
  studentGrades,
  studentGuardians,
  students,
  subjects,
  systemSettings,
  users,
} from "../src/db/schema";
import { PERMISSIONS, ROLE_PERMISSIONS } from "../src/lib/permissions";
import { hashPassword } from "../src/lib/auth";
import {
  BEHAVIOR_SEED_CATEGORIES,
  DEFAULT_ASSESSMENT_LEVELS,
  GRADING_PERIOD_NAMES,
  type Role,
} from "../src/lib/constants";
import { randomToken } from "../src/lib/utils";

/* Deterministic RNG so re-seeds produce identical demo data. */
let seedState = 42;
function rand(): number {
  seedState = (seedState * 1103515245 + 12345) % 2147483648;
  return seedState / 2147483648;
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function randInt(min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const now = new Date();
const CURRENT_YEAR = `${now.getFullYear()}-${now.getFullYear() + 1}`;

/* ------------------------------ names (fictional) ------------------------ */

const FIRST_M = [
  "Jose", "Juan", "Miguel", "Rafael", "Carlo", "Paolo", "Marco", "Enzo",
  "Diego", "Nico", "Gabriel", "Rico", "Emil", "Arnel", "Dante", "Felix",
];
const FIRST_F = [
  "Maria", "Ana", "Jasmine", "Liezl", "Karen", "Grace", "Angel", "Riza",
  "Cielo", "Mira", "Jona", "Liza", "Ella", "Nina", "Tessa", "Marian",
];
const LAST = [
  "Santos", "Reyes", "Cruz", "Bautista", "Ocampo", "Garcia", "Mendoza",
  "Villanueva", "Aquino", "Rivera", "Domingo", "Ramos", "Castillo", "Navarro",
];
const GUARDIAN_FIRST = [
  "Roberto", "Lourdes", "Eduardo", "Teresita", "Ramon", "Cristina",
  "Alfredo", "Marilou", "Danilo", "Rowena",
];

/* ------------------------------- reference data --------------------------- */

async function seedRolesAndPermissions() {
  const roleRows: { id: string; name: string; description: string }[] = [
    { id: "role-admin", name: "System Administrator", description: "Full system access including users, settings, and audit logs." },
    { id: "role-school-admin", name: "School Administrator", description: "School-wide records, academics, analytics, and reports." },
    { id: "role-teacher", name: "Adviser", description: "Assigned sections: advisory, attendance, assessments and behavior — not grade encoding." },
    { id: "role-subject-teacher", name: "Subject Teacher", description: "Encodes grades for assigned subject, grade level and section(s) only." },
    { id: "role-records", name: "Records Personnel", description: "Student records, enrollment, verification, historical records." },
    { id: "role-guidance", name: "Guidance Counselor", description: "Records and manages student incidents, interventions, and student support information." },
    { id: "role-nurse", name: "Nurse", description: "Health and nutrition records only — cannot edit general student information." },
    { id: "role-registrar", name: "Registrar", description: "Strictly read-only official records plus student card / Form 137 printing." },
    { id: "role-literacy-coordinator", name: "Language & Literacy Coordinator", description: "Reading, literacy and numeracy assessments and statistics." },
    { id: "role-admin-officer", name: "Admin Officer", description: "Employee records, PERA/201 files and service credits — no student data access." },
  ];
  for (const r of roleRows) {
    await db
      .insert(roles)
      .values(r)
      .onConflictDoUpdate({ target: roles.id, set: { name: r.name, description: r.description, updatedAt: new Date() } });
  }

  const MODULE_OF: Record<string, string> = {};
  for (const p of PERMISSIONS) {
    MODULE_OF[p] = p.split(".")[0];
  }
  for (const p of PERMISSIONS) {
    await db
      .insert(permissions)
      .values({
        id: `perm-${p.replace(/\./g, "-")}`,
        name: p,
        description: `Permission ${p}`,
        module: MODULE_OF[p] ?? "system",
        action: p.split(".")[1] ?? "access",
      })
      .onConflictDoUpdate({
        target: permissions.id,
        set: { name: p, description: `Permission ${p}`, module: MODULE_OF[p] ?? "system" },
      });
  }

  for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = `role-${role.replace(/_/g, "-")}`;
    await db.delete(rolePermissions).where(eq_(roleId));
    for (const p of perms) {
      await db
        .insert(rolePermissions)
        .values({ roleId, permissionId: `perm-${p.replace(/\./g, "-")}` })
        .onConflictDoNothing();
    }
  }
}

/** eq helper for role_permissions delete (kept local to avoid extra imports). */
import { eq } from "drizzle-orm";
function eq_(roleId: string) {
  return eq(rolePermissions.roleId, roleId);
}

async function seedUsers() {
  const defaults: { role: Role; emailEnv: string; hashEnv: string; firstEnv: string; lastEnv: string; id: string; name: string }[] = [
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

  const fallbackHash = await hashPassword("password123");
  const out: { id: string; role: Role }[] = [];

  for (const d of defaults) {
    const email = process.env[d.emailEnv] ?? `${d.role}@local.dev`;
    const hash = process.env[d.hashEnv] ?? fallbackHash;
    const first = process.env[d.firstEnv] ?? d.name;
    const last = process.env[d.lastEnv] ?? "Demo";
    await db
      .insert(users)
      .values({
        id: d.id,
        roleId: `role-${d.role.replace(/_/g, "-")}`,
        firstName: first,
        lastName: last,
        email,
        passwordHash: hash,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: { email, roleId: `role-${d.role.replace(/_/g, "-")}`, firstName: first, lastName: last, updatedAt: new Date() },
      });
    out.push({ id: d.id, role: d.role });
  }
  return out;
}

async function seedAcademicStructure(teacherId: string) {
  const yearId = `sy-${CURRENT_YEAR}`;
  await db
    .insert(schoolYears)
    .values({ id: yearId, year: CURRENT_YEAR, isCurrent: true })
    .onConflictDoUpdate({ target: schoolYears.id, set: { isCurrent: true, updatedAt: new Date() } });

  const gradeNames = ["Grade 7", "Grade 8", "Grade 9", "Grade 10"];
  for (let i = 0; i < gradeNames.length; i++) {
    await db
      .insert(gradeLevels)
      .values({ id: `gl-${i + 7}`, name: gradeNames[i], orderIndex: i + 1 })
      .onConflictDoUpdate({ target: gradeLevels.id, set: { name: gradeNames[i], orderIndex: i + 1, updatedAt: new Date() } });
  }

  const sectionNames = ["Sampaguita", "Ilang-Ilang", "Molave"];
  let sIdx = 0;
  const sectionIds: string[] = [];
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
        .onConflictDoUpdate({
          target: sections.id,
          set: { adviserId: teacherId, isActive: true, updatedAt: new Date() },
        });
      sectionIds.push(id);
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
      .onConflictDoUpdate({
        target: gradingPeriods.id,
        set: { name: GRADING_PERIOD_NAMES[i], orderIndex: i + 1, isCurrent: i === 0, updatedAt: new Date() },
      });
  }

  return { yearId, sectionIds };
}

/**
 * Demo section/subject teaching assignments for the Subject Teacher user:
 * Filipino and Science in every section (the realistic small-school model —
 * one teacher covering a subject across grade levels).
 */
async function seedSubjectAssignments(subjectTeacherId: string) {
  const teachingPairs: { subjectId: string }[] = [
    { subjectId: "sub-FIL" },
    { subjectId: "sub-SCI" },
  ];
  for (let gradeLevelNum = 7; gradeLevelNum <= 10; gradeLevelNum++) {
    for (let secIdx = 0; secIdx < 3; secIdx++) {
      // Section IDs use a global running index across grades (see
      // seedAcademicStructure): grade 7 -> 0..2, grade 8 -> 3..5, etc.
      const sectionId = `sec-${gradeLevelNum}-${(gradeLevelNum - 7) * 3 + secIdx}`;
      for (const { subjectId } of teachingPairs) {
        await db
          .insert(sectionSubjectTeachers)
          .values({
            id: `${sectionId}__${subjectId}__${subjectTeacherId}`,
            sectionId,
            subjectId,
            teacherId: subjectTeacherId,
          })
          .onConflictDoNothing();
      }
    }
  }
}

async function seedCategoriesAndSettings() {
  for (const c of BEHAVIOR_SEED_CATEGORIES) {
    await db
      .insert(behaviorCategories)
      .values({ id: `bc-${c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, name: c.name, kind: c.kind })
      .onConflictDoUpdate({ target: behaviorCategories.id, set: { name: c.name, kind: c.kind, updatedAt: new Date() } });
  }

  const settings: { key: string; value: string; description: string }[] = [
    { key: "system_name", value: "Records Management System — Sta. Magdalena National High School", description: "Display name of the system." },
    { key: "student_number_prefix", value: "SM", description: "Prefix for generated student numbers." },
    { key: "default_school_year", value: CURRENT_YEAR, description: "Current school year." },
    { key: "assessment_levels", value: JSON.stringify(DEFAULT_ASSESSMENT_LEVELS), description: "Configurable proficiency levels per assessment domain (placeholders — school-adjustable)." },
    { key: "monitoring_rules", value: JSON.stringify({ failingGrade: 75, absenceCount: 5, lateCount: 5, behaviorConcerns: 3 }), description: "Requires-attention indicator thresholds (documented placeholders)." },
    { key: "maintenance_mode", value: "false", description: "Maintenance mode flag." },
  ];
  for (const s of settings) {
    await db
      .insert(systemSettings)
      .values({ id: `set-${s.key}`, key: s.key, value: s.value, description: s.description })
      .onConflictDoUpdate({ target: systemSettings.id, set: { value: s.value, description: s.description, updatedAt: new Date() } });
  }
}

/* --------------------------------- demo data ------------------------------ */

async function seedDemoData(people: { id: string; role: Role }[], structure: { yearId: string; sectionIds: string[] }) {
  // Clear previous demo rows (deterministic re-seed).
  await db.delete(auditLogs);
  await db.delete(notifications);
  await db.delete(qrVerifications);
  await db.delete(reportExports);
  await db.delete(reports);
  await db.delete(interventionFollowups);
  await db.delete(interventions);
  await db.delete(duplicateCandidates);
  await db.delete(recordVerifications);
  await db.delete(clinicalRecords);
  await db.delete(healthRecords);
  await db.delete(assessments);
  await db.delete(behaviorRecords);
  await db.delete(attendanceRecords);
  await db.delete(studentGrades);
  await db.delete(studentGuardians);
  await db.delete(guardians);
  await db.delete(studentEnrollments);
  await db.delete(students);

  const creator = people[0]!.id;
  const teacherId = people.find((p) => p.role === "teacher")!.id;
  // Advisers no longer encode grades — demo grades are recorded by the
  // Subject Teacher, falling back to the teacher row if the role is absent.
  const subjectTeacherId = people.find((p) => p.role === "subject_teacher")?.id ?? teacherId;
  const gradeRecorderId = subjectTeacherId;
  const guidanceId = people.find((p) => p.role === "guidance")!.id;
  const nurseId = people.find((p) => p.role === "nurse")!.id;

  const subjectRows = await db.select({ id: subjects.id }).from(subjects);
  const periodRows = await db
    .select({ id: gradingPeriods.id })
    .from(gradingPeriods)
    .orderBy(gradingPeriods.orderIndex);
  const categoryRows = await db.select({ id: behaviorCategories.id, kind: behaviorCategories.kind }).from(behaviorCategories);
  const concerns = categoryRows.filter((c) => c.kind === "concern");
  const positives = categoryRows.filter((c) => c.kind === "positive");

  const N = 48;
  const usedNumbers = new Set<string>();
  const studentIds: string[] = [];

  for (let i = 0; i < N; i++) {
    const sex = rand() < 0.5 ? "male" : "female";
    const firstName = pick(sex === "male" ? FIRST_M : FIRST_F);
    const lastName = pick(LAST);
    const birthYear = now.getFullYear() - randInt(12, 16);
    const birthDate = `${birthYear}-${String(randInt(1, 12)).padStart(2, "0")}-${String(randInt(1, 28)).padStart(2, "0")}`;

    let seq = i + 1;
    let studentNumber = `SM-${now.getFullYear()}-${String(seq).padStart(6, "0")}`;
    while (usedNumbers.has(studentNumber)) studentNumber = `SM-${now.getFullYear()}-${String(++seq).padStart(6, "0")}`;
    usedNumbers.add(studentNumber);

    const id = crypto.randomUUID();
    studentIds.push(id);

    const recordStatus = rand() < 0.85 ? "verified" : rand() < 0.5 ? "pending_validation" : "draft";

    await db.insert(students).values({
      id,
      studentNumber,
      firstName,
      middleName: pick(FIRST_M),
      lastName,
      birthDate,
      sex,
      contactNumber: rand() < 0.6 ? `09${randInt(100000000, 999999999)}` : null,
      address: `Purok ${randInt(1, 6)}, Sta. Magdalena, Sorsogon`,
      status: "active",
      recordStatus,
      createdBy: creator,
      updatedBy: creator,
    });

    // Guardians (1–2 per student).
    const guardianCount = rand() < 0.7 ? 1 : 2;
    for (let g = 0; g < guardianCount; g++) {
      const gid = crypto.randomUUID();
      await db.insert(guardians).values({
        id: gid,
        firstName: pick(GUARDIAN_FIRST),
        lastName,
        relationship: g === 0 ? pick(["mother", "father"]) : "guardian",
        contactNumber: `09${randInt(100000000, 999999999)}`,
      });
      await db.insert(studentGuardians).values({
        studentId: id,
        guardianId: gid,
        isPrimary: g === 0,
      });
    }

    // Enrollment in the current year, distributed across sections.
    const sectionId = structure.sectionIds[i % structure.sectionIds.length]!;
    const gradeLevelId = `gl-${7 + Math.floor(i % structure.sectionIds.length / 3)}`;
    const enrollmentId = crypto.randomUUID();
    await db.insert(studentEnrollments).values({
      id: enrollmentId,
      studentId: id,
      schoolYearId: structure.yearId,
      gradeLevelId,
      sectionId,
      status: "active",
      enrollmentDate: isoDate(new Date(now.getFullYear(), 5, randInt(1, 28))),
      recordedBy: creator,
    });

    // Grades for Q1 (all subjects) for verified/draft students.
    if (recordStatus !== "pending_validation") {
      for (const sub of subjectRows) {
        await db.insert(studentGrades).values({
          id: crypto.randomUUID(),
          enrollmentId,
          subjectId: sub.id,
          gradingPeriodId: periodRows[0]!.id,
          grade: randInt(70, 98),
          recordedBy: gradeRecorderId,
        });
      }
    }

    // Attendance for the last ~20 school days.
    for (let d = 1; d <= 20; d++) {
      const day = new Date(now.getTime() - d * 86400000);
      if (day.getDay() === 0 || day.getDay() === 6) continue;
      const roll = rand();
      const status = roll < 0.88 ? "present" : roll < 0.93 ? "late" : roll < 0.97 ? "absent_excused" : "absent_unexcused";
      await db.insert(attendanceRecords).values({
        id: crypto.randomUUID(),
        enrollmentId,
        date: isoDate(day),
        status,
        recordedBy: teacherId,
      });
    }

    // Assessments: reading + numeracy for most, literacy for some.
    const domains = ["reading", "numeracy"] as const;
    for (const domain of domains) {
      if (rand() < 0.85) {
        const levels = DEFAULT_ASSESSMENT_LEVELS[domain];
        await db.insert(assessments).values({
          id: crypto.randomUUID(),
          studentId: id,
          domain,
          assessmentType: `${domain === "reading" ? "Phil-IRI-style" : "School numeracy"} screener (demo)`,
          date: isoDate(new Date(now.getTime() - randInt(10, 60) * 86400000)),
          level: pick(levels),
          score: randInt(40, 98),
          assessorId: rand() < 0.5 ? teacherId : guidanceId,
        });
      }
    }
    if (rand() < 0.5) {
      const levels = DEFAULT_ASSESSMENT_LEVELS.literacy;
      await db.insert(assessments).values({
        id: crypto.randomUUID(),
        studentId: id,
        domain: "literacy",
        assessmentType: "School literacy checklist (demo)",
        date: isoDate(new Date(now.getTime() - randInt(10, 60) * 86400000)),
        level: pick(levels),
        assessorId: teacherId,
      });
    }

    // Health (Nurse domain): nutritional assessment for ~70% of students.
    if (rand() < 0.7) {
      const weight = randInt(30, 75) + Math.round(rand() * 10) / 10;
      const height = randInt(130, 175) + Math.round(rand() * 10) / 10;
      const bmi = Math.round((weight / Math.pow(height / 100, 2)) * 10) / 10;
      const status =
        bmi < 15.5 ? "wasted" : bmi < 14 ? "severely_wasted" : bmi >= 30 ? "obese" : bmi >= 25 ? "overweight" : "normal";
      await db.insert(healthRecords).values({
        id: crypto.randomUUID(),
        studentId: id,
        schoolYearId: structure.yearId,
        measurementDate: isoDate(new Date(now.getTime() - randInt(10, 90) * 86400000)),
        weightKg: weight,
        heightCm: height,
        bmi,
        nutritionalStatus: status,
        remarks: null,
        recordedBy: nurseId,
      });
    }
    // Clinical records for a few students.
    if (rand() < 0.15) {
      await db.insert(clinicalRecords).values({
        id: crypto.randomUUID(),
        studentId: id,
        date: isoDate(new Date(now.getTime() - randInt(5, 80) * 86400000)),
        category: pick(["Health Assessment", "First Aid", "Referral", "Health Education"]),
        description: "School-health visit recorded by the nurse (demo note).",
        assessment: "No acute findings",
        actionTaken: "Advised rest and hydration",
        recordedBy: nurseId,
      });
    }

    // Behavior: mostly positive, occasional concern.
    if (rand() < 0.4 && positives.length > 0) {
      await db.insert(behaviorRecords).values({
        id: crypto.randomUUID(),
        studentId: id,
        categoryId: pick(positives).id,
        date: isoDate(new Date(now.getTime() - randInt(1, 40) * 86400000)),
        description: "Demonstrated helpfulness during group activity (demo note).",
        status: pick(["open", "monitored", "resolved"]),
        recordedBy: teacherId,
      });
    }
    if (rand() < 0.2 && concerns.length > 0) {
      await db.insert(behaviorRecords).values({
        id: crypto.randomUUID(),
        studentId: id,
        categoryId: pick(concerns).id,
        date: isoDate(new Date(now.getTime() - randInt(1, 40) * 86400000)),
        description: "Observed difficulty following classroom routines (demo note).",
        severity: pick(["low", "medium"]),
        status: "open",
        recordedBy: teacherId,
      });
    }

    // Interventions for a few students.
    if (rand() < 0.18) {
      const iid = crypto.randomUUID();
      const status = pick(["planned", "active", "completed"]);
      await db.insert(interventions).values({
        id: iid,
        studentId: id,
        interventionType: pick(["Academic Remediation", "Reading Support", "Attendance Follow-Up"]),
        description: "Support plan documented during faculty meeting (demo).",
        status,
        outcome: status === "completed" ? "Attendance improved over the follow-up period." : null,
        startDate: isoDate(new Date(now.getTime() - randInt(20, 50) * 86400000)),
        targetDate: isoDate(new Date(now.getTime() + randInt(10, 40) * 86400000)),
        assignedTo: rand() < 0.5 ? teacherId : guidanceId,
        createdBy: creator,
      });
      if (status !== "planned") {
        await db.insert(interventionFollowups).values({
          id: crypto.randomUUID(),
          interventionId: iid,
          followUpDate: isoDate(new Date(now.getTime() + randInt(1, 15) * 86400000)),
          status: "scheduled",
          recordedBy: guidanceId,
        });
      }
    }

    // Verification history for submitted records.
    if (recordStatus === "verified") {
      await db.insert(recordVerifications).values({
        id: crypto.randomUUID(),
        studentId: id,
        submittedBy: creator,
        reviewedBy: creator,
        status: "approved",
        remarks: "Complete profile verified (demo).",
        submittedAt: new Date(now.getTime() - randInt(5, 30) * 86400000),
        reviewedAt: new Date(now.getTime() - randInt(1, 4) * 86400000),
      });
    }

    // QR tokens for verified students.
    if (recordStatus === "verified" && rand() < 0.6) {
      await db.insert(qrVerifications).values({
        id: crypto.randomUUID(),
        studentId: id,
        verificationToken: randomToken(24),
        verifiedBy: creator,
        verificationType: "generate",
        result: "valid",
        verifiedAt: new Date(now.getTime() - randInt(1, 20) * 86400000),
      });
    }
  }

  // A couple of duplicate candidates for the review queue.
  if (studentIds.length >= 4) {
    await db.insert(duplicateCandidates).values([
      {
        id: crypto.randomUUID(),
        studentId: studentIds[0]!,
        possibleStudentId: studentIds[1]!,
        matchScore: 75,
        matchReason: JSON.stringify(["last_name", "birth_date"]),
        status: "pending",
      },
      {
        id: crypto.randomUUID(),
        studentId: studentIds[2]!,
        possibleStudentId: studentIds[3]!,
        matchScore: 40,
        matchReason: JSON.stringify(["last_name"]),
        status: "not_duplicate",
      },
    ]);
  }

  // Seed the audit trail with a few demo entries.
  for (let i = 0; i < 10; i++) {
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: creator,
      action: "student.create",
      entityType: "student",
      entityId: studentIds[i % studentIds.length]!,
      newValuesJson: JSON.stringify({ demo: true }),
      createdAt: new Date(now.getTime() - i * 3600000),
    });
  }

  await db.insert(notifications).values({
    id: crypto.randomUUID(),
    userId: creator,
    type: "verification",
    title: "Records awaiting verification",
    message: "There are student records pending verification (demo).",
    link: "/verification",
  });

  await db.insert(reports).values({
    id: crypto.randomUUID(),
    name: "Enrollment Report (demo)",
    reportType: "enrollment_report",
    generatedBy: creator,
    scope: "school",
    filtersJson: "{}",
  });

  console.log(
    `Seed complete: ${N} students, ${subjectRows.length} subjects, ${structure.sectionIds.length} sections, school year ${CURRENT_YEAR} (all data fictional).`,
  );
}

/* ----------------------------------- run ---------------------------------- */

/* --------------------------- employee demo data --------------------------- */

const EMPLOYEE_POSITIONS = [
  { position: "Principal I", type: "teaching", dept: "Office of the School Principal", sg: "SG-19", apt: "permanent" },
  { position: "Master Teacher I", type: "teaching", dept: "Mathematics", sg: "SG-18", apt: "permanent" },
  { position: "Teacher III", type: "teaching", dept: "Science", sg: "SG-13", apt: "permanent" },
  { position: "Teacher II", type: "teaching", dept: "English", sg: "SG-12", apt: "permanent" },
  {      position: "Teacher I", type: "teaching", dept: "Filipino", sg: "SG-11", apt: "provisional" },
  { position: "School Nurse", type: "non_teaching", dept: "Health Services", sg: "SG-11", apt: "permanent" },
  { position: "Registrar I", type: "non_teaching", dept: "Registrar's Office", sg: "SG-10", apt: "permanent" },
  { position: "Guidance Counselor", type: "non_teaching", dept: "Guidance Office", sg: "SG-12", apt: "permanent" },
  { position: "Administrative Officer I", type: "non_teaching", dept: "Records Office", sg: "SG-11", apt: "permanent" },
  { position: "Utility Worker", type: "support", dept: "General Services", sg: null, apt: "casual" },
] as const;

const E201_SEED: { category: string; title: string; kind: "personal" | "issued" }[] = [
  { category: "personal_information", title: "Personal Data Sheet (PDS)", kind: "personal" },
  { category: "appointment", title: "Letter of Appointment", kind: "personal" },
  { category: "government", title: "GSIS Membership Record", kind: "personal" },
];

async function seedEmployees(creatorId: string) {
  // Idempotency: employees cascade-clear their 201 records and credit ledger.
  await db.delete(employees);
  await db.delete(auditLogs).where(eq(auditLogs.action, "CREATE_EMPLOYEE"));

  const FIRST = [...FIRST_M, ...FIRST_F];
  const categories = ["eligibility", "training", "performance", "certificate", "leave", "memorandum"];

  for (let i = 0; i < EMPLOYEE_POSITIONS.length; i++) {
    const spec = EMPLOYEE_POSITIONS[i];
    const sex = FIRST[i]!.length % 2 === 0 ? "female" : "male";
    const firstName = pick(FIRST);
    const lastName = pick(LAST);
    const birthYear = now.getFullYear() - randInt(24, 58);
    const id = crypto.randomUUID();
    const employeeNumber = `EMP-${now.getFullYear()}-${String(i + 1).padStart(6, "0")}`;
    const hireDate = isoDate(new Date(now.getFullYear() - randInt(1, 25), randInt(0, 11), randInt(1, 28)));

    await db.insert(employees).values({
      id,
      employeeNumber,
      firstName,
      middleName: pick(FIRST),
      lastName,
      birthDate: `${birthYear}-${String(randInt(1, 12)).padStart(2, "0")}-${String(randInt(1, 28)).padStart(2, "0")}`,
      sex,
      civilStatus: pick(["single", "married", "widowed"]),
      address: `Purok ${randInt(1, 6)}, Sta. Magdalena, Sorsogon`,
      contactNumber: `09${randInt(100000000, 999999999)}`,
      email: null,
      emergencyContactName: pick(GUARDIAN_FIRST) + " " + lastName,
      emergencyContactRelation: pick(["Spouse", "Parent", "Sibling"]),
      emergencyContactNumber: `09${randInt(100000000, 999999999)}`,
      position: spec.position,
      designation: null,
      appointmentStatus: spec.apt as string,
      employmentType: spec.type as string,
      department: spec.dept,
      dateHired: hireDate,
      dateOfAppointment: hireDate,
      salaryGrade: spec.sg as string | null,
      step: `Step ${randInt(1, 8)}`,
      gsisNumber: `GSIS-${randInt(10000000, 99999999)}`,
      philhealthNumber: `PH-${randInt(1000000000, 9999999999)}`,
      pagibigNumber: `HDMF-${randInt(1000000000, 9999999999)}`,
      tinNumber: `TIN-${randInt(100000000, 999999999)}`,
      prcLicenseNumber: spec.type === "teaching" ? `PRC-${randInt(1000000, 9999999)}` : null,
      eligibility: spec.type === "teaching" ? "Professional Teacher (LET)" : pick(["Civil Service Professional", "CS Sub-Professional"]),
      status: i === EMPLOYEE_POSITIONS.length - 1 ? "inactive" : "active",
      createdBy: creatorId,
      updatedBy: creatorId,
    });

    // 201 file entries.
    for (const entry of E201_SEED) {
      await db.insert(employee201Records).values({
        id: crypto.randomUUID(),
        employeeId: id,
        category: entry.category,
        title: entry.title,
        description: null,
        recordDate: hireDate,
        fileReference: null,
        createdBy: creatorId,
        updatedBy: creatorId,
      });
    }
    for (let c = 0; c < randInt(1, 3); c++) {
      const category = pick(categories);
      await db.insert(employee201Records).values({
        id: crypto.randomUUID(),
        employeeId: id,
        category,
        title: pick([
          "Regional Training on Numeracy",
          "SLAC Session Certificate",
          "Office Memorandum No. 12",
          "Performance Review — Very Satisfactory",
          "Seminar on Child Protection Policy",
          "VacationLeave — Approved",
        ]),
        description: "Demo personnel document.",
        recordDate: isoDate(new Date(now.getTime() - randInt(30, 700) * 86400000)),
        fileReference: null,
        createdBy: creatorId,
        updatedBy: creatorId,
      });
    }

    // Service credit ledger — never consumes more than earned.
    const earned = randInt(3, 30);
    for (let e = 0; e < randInt(2, 4); e++) {
      await db.insert(serviceCreditTransactions).values({
        id: crypto.randomUUID(),
        employeeId: id,
        type: "earned",
        credits: Math.max(1, Math.round((earned / 3) * 2) / 2),
        transactionDate: isoDate(new Date(now.getTime() - randInt(30, 500) * 86400000)),
        reason: pick(["Teacher-in-charge during summer classes", "Weekend school activity", "Off-campus event supervision"]),
        referenceDocument: `OO-${now.getFullYear()}-${randInt(1, 99)}`,
        remarks: null,
        createdBy: creatorId,
        updatedBy: creatorId,
      });
    }
    let remaining = earned;
    for (let cc = 0; cc < randInt(0, 2) && remaining > 1; cc++) {
      const consume = Math.min(remaining - 1, randInt(1, 3));
      if (consume <= 0) break;
      remaining -= consume;
      await db.insert(serviceCreditTransactions).values({
        id: crypto.randomUUID(),
        employeeId: id,
        type: "consumed",
        credits: consume,
        transactionDate: isoDate(new Date(now.getTime() - randInt(1, 90) * 86400000)),
        reason: pick(["Service-credit leave", "Make-up for class absences"]),
        referenceDocument: `SC-${now.getFullYear()}-${randInt(1, 99)}`,
        remarks: null,
        createdBy: creatorId,
        updatedBy: creatorId,
      });
    }
  }

  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    userId: creatorId,
    action: "CREATE_EMPLOYEE",
    entityType: "employee",
    newValuesJson: JSON.stringify({ demo: true, count: EMPLOYEE_POSITIONS.length }),
  });
}

async function main() {
  await seedRolesAndPermissions();
  const people = await seedUsers();
  const teacher = people.find((p) => p.role === "teacher")!;
  const structure = await seedAcademicStructure(teacher.id);
  await seedCategoriesAndSettings();
  const subjectTeacher = people.find((p) => p.role === "subject_teacher");
  if (subjectTeacher) {
    await seedSubjectAssignments(subjectTeacher.id);
  }
  await seedDemoData(people, structure);
  await seedEmployees(people.find((p) => p.role === "admin_officer")?.id ?? people[0]!.id);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
