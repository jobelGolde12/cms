import type { Role } from "./constants";

/**
 * Role-based permission map for the school system.
 *
 * Names mirror the `permissions` table seeded from this list, so DB-stored
 * role_permissions and this map stay in sync. Enforcement happens server-side
 * in `requirePermission()` / `getAuthorizedUser()`; UI checks are cosmetic.
 * Matrix documentation: documentation/security/role-permission-matrix.md
 */
export const PERMISSIONS = [
  // Dashboard
  "dashboard.view",
  // Students
  "students.view",
  "students.create",
  "students.update",
  "students.archive",
  // Guardians
  "guardians.view",
  "guardians.manage",
  // Enrollment
  "enrollment.view",
  "enrollment.manage",
  // Academics
  "academics.config",
  "grades.view",
  "grades.write",
  // Attendance
  "attendance.view",
  "attendance.write",
  // Behavior
  "behavior.view",
  "behavior.write",
  // Assessments (reading / literacy / numeracy)
  "assessments.view",
  "assessments.write",
  // Health / nutrition (Nurse)
  "health.view",
  "health.write",
  // Interventions
  "interventions.view",
  "interventions.write",
  // Verification & duplicates
  "verification.review",
  "duplicates.view",
  "duplicates.review",
  // Reports
  "reports.view",
  "reports.generate",
  "reports.export",
  // QR
  "qr.verify",
  // Official document generation (Registrar) — never mutates records
  "documents.print",
  // Users, audit, settings
  "users.view",
  "users.manage",
  "audit_logs.view",
  "settings.manage",
  // Employee records (Admin Officer only — strict isolation from students)
  "employees.view",
  "employees.create",
  "employees.update",
  "employees.archive",
  "employee_201.view",
  "employee_201.manage",
  "service_credits.view",
  "service_credits.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ADMIN: Permission[] = [...PERMISSIONS];

const SCHOOL_ADMIN: Permission[] = [
  "dashboard.view",
  "students.view",
  "students.create",
  "students.update",
  "students.archive",
  "guardians.view",
  "guardians.manage",
  "enrollment.view",
  "enrollment.manage",
  "academics.config",
  "grades.view",
  "grades.write",
  "attendance.view",
  "attendance.write",
  "behavior.view",
  "behavior.write",
  "assessments.view",
  "assessments.write",
  "interventions.view",
  "interventions.write",
  "verification.review",
  "duplicates.view",
  "duplicates.review",
  "reports.view",
  "reports.generate",
  "reports.export",
  "qr.verify",
  "audit_logs.view",
  "settings.manage",
];

const TEACHER: Permission[] = [
  "dashboard.view",
  "students.view",
  "guardians.view",
  "enrollment.view",
  "grades.view",
  "grades.write",
  "attendance.view",
  "attendance.write",
  "behavior.view",
  "behavior.write",
  "assessments.view",
  "assessments.write",
  "interventions.view",
  "reports.view",
  "reports.generate",
];

const RECORDS: Permission[] = [
  "dashboard.view",
  "students.view",
  "students.create",
  "students.update",
  "students.archive",
  "guardians.view",
  "guardians.manage",
  "enrollment.view",
  "enrollment.manage",
  "grades.view",
  "attendance.view",
  "assessments.view",
  "verification.review",
  "duplicates.view",
  "duplicates.review",
  "reports.view",
  "reports.generate",
  "reports.export",
  "qr.verify",
];

const GUIDANCE: Permission[] = [
  "dashboard.view",
  "students.view",
  "guardians.view",
  "enrollment.view",
  "grades.view",
  "attendance.view",
  "behavior.view",
  "behavior.write",
  "assessments.view",
  "assessments.write",
  "interventions.view",
  "interventions.write",
  "reports.view",
];

/**
 * Nurse — health & nutrition domain ONLY. Deliberately has NO
 * `students.update` / `guardians.manage`: a Nurse can never edit a student's
 * general personal information (name, birth date, sex, address, guardians,
 * enrollment) — only health records she/he owns.
 */
const NURSE: Permission[] = [
  "dashboard.view",
  "students.view",
  "guardians.view",
  "enrollment.view",
  "health.view",
  "health.write",
  "reports.view",
  "reports.generate",
];

/**
 * Registrar — STRICTLY read-only plus official document generation.
 * No create/update/archive/write permissions on any student domain.
 */
const REGISTRAR: Permission[] = [
  "dashboard.view",
  "students.view",
  "guardians.view",
  "enrollment.view",
  "grades.view",
  "attendance.view",
  "assessments.view",
  "reports.view",
  "reports.generate",
  "reports.export",
  "documents.print",
];

/**
 * Language & Literacy Coordinator — literacy/reading/numeracy assessment
 * domain only. No behavior, no health, no grades, never user management.
 */
const LITERACY_COORDINATOR: Permission[] = [
  "dashboard.view",
  "students.view",
  "guardians.view",
  "enrollment.view",
  "assessments.view",
  "assessments.write",
  "interventions.view",
  "reports.view",
  "reports.generate",
];

/**
 * Admin Officer — employee-records domain ONLY. Deliberately holds no
 * student-facing permissions: rows outside their own dashboard/reports are
 * unreachable (row-level scope denies every student row).
 */
const ADMIN_OFFICER: Permission[] = [
  "dashboard.view",
  "employees.view",
  "employees.create",
  "employees.update",
  "employees.archive",
  "employee_201.view",
  "employee_201.manage",
  "service_credits.view",
  "service_credits.manage",
  "reports.view",
  "reports.generate",
  "audit_logs.view",
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: ADMIN,
  school_admin: SCHOOL_ADMIN,
  teacher: TEACHER,
  records: RECORDS,
  guidance: GUIDANCE,
  nurse: NURSE,
  registrar: REGISTRAR,
  literacy_coordinator: LITERACY_COORDINATOR,
  admin_officer: ADMIN_OFFICER,
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Permissions granted to a role, for display and seeding. */
export function permissionsForRole(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}
