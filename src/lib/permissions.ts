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
  /**
   * Access to the Grade Encoding MODULE (the /grades grade-sheet screen).
   *
   * Deliberately separate from `grades.view` (which every academic role may
   * hold to read a student's grades on the profile / performance screens) and
   * from `grades.write` (which only an assigned teacher may hold). The module
   * gate is what lets the Registrar be a legitimate reader of academic records
   * while being completely locked out of grade encoding — enforced server-side
   * on the page and in every grade action.
   */
  "grades.encode",
  /** Read-only grade-submission compliance monitoring (deadlines, lateness). */
  "grades.monitor",
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

/**
 * Grade-encoding rule (2026-11 revision C): grade writing is AUTHORISATION-
 * BASED, not role-based.
 *
 * `grades.write` is held by the Subject Teacher role, and the grade actions
 * re-check the row-level assignment (`section_subject_teachers`: the caller
 * must be the assigned teacher for that exact (section, subject) pair) before
 * anything is written. Because a teacher may hold BOTH the Adviser role and
 * the Subject Teacher role, the permission check is resolved over the UNION of
 * every role the account holds (`hasUserPermission`) — an Adviser who is also
 * an assigned Subject Teacher encodes grades exactly like a Subject Teacher,
 * and an Adviser who is not assigned any subject never can.
 *
 * `grades.encode` is the module gate for the /grades screen. The Registrar
 * deliberately does NOT hold it: the Registrar may read academic records and
 * print official documents, but may never open the grade-encoding module.
 */
const TEACHER_ONLY_WRITE = new Set<Permission>(["grades.write"]);

const ADMIN: Permission[] = PERMISSIONS.filter((p) => !TEACHER_ONLY_WRITE.has(p));

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
  "grades.encode",
  "grades.monitor",
  // grades.write: teachers/advisers ONLY (see TEACHER_ONLY_WRITE above)
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

/**
 * Adviser — assigned sections: attendance, assessments, behavior, viewing of
 * the section's academic records.
 *
 * An Adviser on its own does NOT open the Grade Encoding module and does NOT
 * encode grades. When the same account also holds the Subject Teacher role
 * (and carries a teaching load), the module and the write permission come
 * from the Subject Teacher role — see `hasUserPermission`.
 */
const TEACHER: Permission[] = [
  "dashboard.view",
  "students.view",
  "guardians.view",
  "enrollment.view",
  "grades.view",
  // Grade encoding moved to the subject_teacher role — see TEACHER_ONLY_WRITE.
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

/**
 * Subject Teacher — encodes grades for the departmental teaching loads in
 * `section_subject_teachers` ONLY (row-level enforcement in
 * `canWriteGradesInSection`). No administrative functionality, no user
 * management, no personal-information editing of students.
 */
const SUBJECT_TEACHER: Permission[] = [
  "dashboard.view",
  "students.view",
  "enrollment.view",
  "grades.view",
  "grades.write",
  "grades.encode",
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
  "grades.encode",
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

/**
 * Guidance Counselor — confidential incident-management domain ONLY.
 *
 * 2026-11 revision (least-privilege scope): the role's workspace is the
 * Guidance Office (/guidance) — student lookup plus confidential behavioral
 * incident records. Deliberately holds NO grades.view, attendance.view,
 * assessments.*, interventions.* or reports.view: the Student Development
 * module and academic/performance/report surfaces are outside this role's
 * scope and are additionally redirected server-side (see
 * `canViewStudentDevelopment` in src/lib/scope.ts), so a manually typed URL
 * can never reach them.
 */
const GUIDANCE: Permission[] = [
  "dashboard.view",
  "students.view",
  "guardians.view",
  "enrollment.view",
  "behavior.view",
  "behavior.write",
];

/**
 * Nurse — health & nutrition domain ONLY. Deliberately has NO
 * `students.update` / `guardians.manage`: a Nurse can never edit a student's
 * general personal information (name, birth date, sex, address, guardians,
 * enrollment) — only health records she/he owns.
 *
 * 2026-11 revision (least-privilege scope): reports.view / reports.generate
 * are WITHDRAWN — the Reports module (academic, performance and
 * administrative reports) is outside the nurse's health domain. The /reports
 * route and every report server action re-check permissions server-side, so
 * hiding the sidebar link is not the enforcement mechanism.
 */
const NURSE: Permission[] = [
  "dashboard.view",
  "students.view",
  "guardians.view",
  "enrollment.view",
  "health.view",
  "health.write",
];

/**
 * Registrar — STRICTLY read-only plus official document generation.
 * No create/update/archive/write permissions on any student domain.
 *
 * Grade Encoding is OUT OF SCOPE for the Registrar (2026-11 revision C):
 * the role deliberately does NOT hold `grades.encode`, so the module is
 * absent from the sidebar and the /grades route redirects server-side. The
 * Registrar keeps `grades.view` for read-only academic context (student
 * profile, performance, report cards) and `documents.print` for the Student
 * Card and Form 137.
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
  subject_teacher: SUBJECT_TEACHER,
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

/**
 * Effective permission check for an account that may hold SEVERAL roles.
 *
 * The effective set is the union of the permissions of every role the account
 * holds. This is what makes the Adviser + Subject Teacher combination work:
 * the adviser contributes the advisory permissions, the subject-teacher role
 * contributes `grades.write` + `grades.encode`, and the grade actions then
 * narrow it down to the rows the account is actually assigned to.
 *
 * An account with no known role holds nothing.
 */
export function hasUserPermission(
  roles: readonly Role[] | undefined,
  permission: Permission,
): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission) ?? false);
}

/** Every permission granted to an account (union across its roles). */
export function userPermissions(roles: readonly Role[] | undefined): Permission[] {
  const out = new Set<Permission>();
  for (const role of roles ?? []) {
    for (const p of ROLE_PERMISSIONS[role] ?? []) out.add(p);
  }
  return Array.from(out);
}
