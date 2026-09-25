import type { Role } from "./constants";

/**
 * Role-based permission map.
 *
 * Names mirror the `permissions` table seeded from this list, so DB-stored
 * role_permissions and this map stay in sync. Enforcement happens server-side
 * in `requirePermission()` / `getAuthorizedUser()`; UI checks are cosmetic.
 */
export const PERMISSIONS = [
  // Children
  "children.view",
  "children.create",
  "children.update",
  "children.delete",
  // Validation
  "validation.view",
  "validation.review",
  // Duplicates
  "duplicates.view",
  "duplicates.review",
  // Monitoring
  "monitoring.view",
  "monitoring.update",
  // Interventions
  "interventions.view",
  "interventions.create",
  "interventions.update",
  // Reports
  "reports.view",
  "reports.generate",
  "reports.export",
  // QR
  "qr.verify",
  // Users
  "users.view",
  "users.create",
  "users.update",
  "users.disable",
  // Audit & settings
  "audit_logs.view",
  "settings.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const BARANGAY_USER: Permission[] = [
  "children.view",
  "children.create",
  "children.update",
  "validation.view",
  "monitoring.view",
  "monitoring.update",
  "interventions.view",
  "interventions.create",
  "reports.view",
  "reports.generate",
];

const LGU_USER: Permission[] = [
  "children.view",
  "children.create",
  "children.update",
  "children.delete",
  "validation.view",
  "validation.review",
  "duplicates.view",
  "duplicates.review",
  "monitoring.view",
  "monitoring.update",
  "interventions.view",
  "interventions.create",
  "interventions.update",
  "reports.view",
  "reports.generate",
  "reports.export",
  "qr.verify",
  "users.view",
  "audit_logs.view",
];

const SYSTEM_ADMINISTRATOR: Permission[] = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  barangay: BARANGAY_USER,
  lgu: LGU_USER,
  admin: SYSTEM_ADMINISTRATOR,
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Permissions granted to a role, for display and seeding. */
export function permissionsForRole(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}
