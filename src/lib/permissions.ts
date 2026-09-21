import type { Role } from "./constants";

/**
 * Role-based permission map. Enforcement happens server-side in
 * `requirePermission()`; UI checks are cosmetic only.
 */
export const PERMISSIONS = [
  // Children
  "children.view",
  "children.create",
  "children.update",
  "children.validate",
  "children.export",
  // Duplicates
  "duplicates.review",
  // QR
  "qr.manage",
  // Monitoring
  "monitoring.view",
  "monitoring.manage",
  // Reports
  "reports.view",
  "reports.generate",
  "reports.export",
  // Users
  "users.view",
  "users.manage",
  // Audit
  "audit.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: ALL,
  lgu: [
    "children.view",
    "children.create",
    "children.update",
    "children.validate",
    "children.export",
    "duplicates.review",
    "qr.manage",
    "monitoring.view",
    "monitoring.manage",
    "reports.view",
    "reports.generate",
    "reports.export",
    "users.view",
    "audit.view",
  ],
  school: [
    "children.view",
    "children.create",
    "children.update",
    "children.export",
    "qr.manage",
    "monitoring.view",
    "reports.view",
    "reports.generate",
  ],
  barangay: [
    "children.view",
    "children.create",
    "children.update",
    "children.export",
    "monitoring.view",
    "monitoring.manage",
    "reports.view",
    "reports.generate",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
