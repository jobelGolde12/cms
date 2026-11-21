import { ROLE_LABELS, ROLES, type Role } from "./constants";
import { hasUserPermission, type Permission } from "./permissions";
import type { SessionUser } from "./auth";

/**
 * Single source of truth for "where does this account belong?".
 *
 * The application renders ONE authenticated dashboard route (`/dashboard`) and
 * resolves a role-specific dashboard *view* inside it. Keeping the route fixed
 * means middleware, the login redirect, the sidebar and the dashboard page can
 * never disagree about the destination — the historical bug was three
 * independent hardcoded decisions (`/dashboard` after login, `/dashboard` from
 * every denied page, and a `user.role === "admin_officer"` branch in the page).
 *
 * Resolution rules:
 *  - the PRIMARY role (`users.role_id`) always wins;
 *  - additional roles (`user_roles`) never override it, so an Adviser who is
 *    also a Subject Teacher still lands on the Adviser dashboard;
 *  - if the primary role is missing/unknown, the first role in the canonical
 *    `ROLES` order is used, then the generic dashboard.
 *
 * Everything below is pure: the login action, the proxy and the page all call
 * the same function with the same role data (`getCurrentUser()`/the session
 * resolver), so no part of the app can silently choose a different dashboard.
 */

export type DashboardKind = Role;

export type DashboardResolution = {
  /** Role whose dashboard view must be rendered. */
  kind: DashboardKind;
  /** Canonical authenticated home. Shared by every role by design. */
  path: typeof DASHBOARD_PATH;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
};

export const DASHBOARD_PATH = "/dashboard" as const;

type DashboardCopy = { eyebrow: string; title: string; description: string };

const COPY: Record<Role, DashboardCopy> = {
  admin: {
    eyebrow: "System Overview",
    title: "School Enrollment & Performance",
    description:
      "School-wide enrollment, record verification, academic performance and system health.",
  },
  school_admin: {
    eyebrow: "School Administration",
    title: "School Enrollment & Performance",
    description:
      "School-wide enrollment, record verification, academic performance and system health.",
  },
  records: {
    eyebrow: "Records Workspace",
    title: "Records & Verification Overview",
    description:
      "Student records, enrollment, verification and duplicate review for the current school year.",
  },
  registrar: {
    eyebrow: "Registrar Dashboard",
    title: "Official Records Overview",
    description:
      "Read-only enrollment and academic records. Official student documents are available from each student profile.",
  },
  teacher: {
    eyebrow: "Adviser Dashboard",
    title: "My Sections & Students",
    description:
      "Enrollment, attendance, assessment and development records for the sections you advise.",
  },
  subject_teacher: {
    eyebrow: "Subject Teacher Dashboard",
    title: "My Teaching Loads",
    description:
      "The sections and students covered by your assigned teaching loads.",
  },
  guidance: {
    eyebrow: "Guidance Office",
    title: "Guidance Dashboard",
    description:
      "Confidential behavioral incidents, interventions and follow-ups handled by the Guidance Office.",
  },
  nurse: {
    eyebrow: "Health Services",
    title: "Nurse Dashboard",
    description:
      "Nutritional assessments and school-health records for the students in your care.",
  },
  literacy_coordinator: {
    eyebrow: "Language & Literacy",
    title: "Literacy & Numeracy Dashboard",
    description:
      "Reading, literacy and numeracy assessment coverage for the current school year.",
  },
  admin_officer: {
    eyebrow: "Employee Records Overview",
    title: "Employees, 201 Files & Service Credits",
    description:
      "Personnel records, 201 files and the service-credit ledger. Student data is outside this workspace.",
  },
};

/** Runtime guard for values read from the database. */
export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

/**
 * Deterministic dashboard role for an account.
 *
 * `roles` is expected to contain the primary role (the session resolver
 * guarantees it), but the fallback keeps a malformed session from producing an
 * undefined dashboard.
 */
export function resolveDashboardRole(
  primaryRole: Role,
  roles: readonly Role[] = [],
): DashboardKind {
  if (roles.includes(primaryRole)) return primaryRole;
  const fallback = ROLES.find((role) => roles.includes(role));
  return fallback ?? primaryRole;
}

export function resolveDashboardForRoles(
  primaryRole: Role,
  roles: readonly Role[] = [],
): DashboardResolution {
  const kind = resolveDashboardRole(primaryRole, roles);
  return {
    kind,
    path: DASHBOARD_PATH,
    label: ROLE_LABELS[kind],
    ...COPY[kind],
  };
}

/** Resolve the dashboard for an authenticated session user. */
export function resolveDashboard(
  user: Pick<SessionUser, "role" | "roles">,
): DashboardResolution {
  return resolveDashboardForRoles(user.role, user.roles);
}

/* -------------------------------------------------------------------------- */
/*  Route-level authorization                                                 */
/* -------------------------------------------------------------------------- */

export type RouteRule = { prefix: string; permission: Permission };

/**
 * URL prefix → permission required to open that module.
 *
 * Longest matching prefix wins (so `/grades/monitoring` is not satisfied by
 * `/grades`). Used by the proxy for the optimistic server-side gate; every
 * page and server action still performs its own `requirePermission` check, so
 * this map is defence in depth, never the only enforcement.
 */
export const ROUTE_PERMISSIONS: readonly RouteRule[] = [
  { prefix: "/grades/monitoring", permission: "grades.monitor" },
  { prefix: "/grades", permission: "grades.encode" },
  { prefix: "/service-credits", permission: "service_credits.view" },
  { prefix: "/employees", permission: "employees.view" },
  { prefix: "/activity-logs", permission: "audit_logs.view" },
  { prefix: "/assignments", permission: "academics.config" },
  { prefix: "/sections", permission: "academics.config" },
  { prefix: "/verification", permission: "verification.review" },
  { prefix: "/duplicates", permission: "duplicates.view" },
  { prefix: "/performance", permission: "grades.view" },
  { prefix: "/development", permission: "behavior.view" },
  { prefix: "/guidance", permission: "behavior.view" },
  { prefix: "/health", permission: "health.view" },
  { prefix: "/students", permission: "students.view" },
  { prefix: "/reports", permission: "reports.view" },
  { prefix: "/qr", permission: "qr.verify" },
  { prefix: "/users", permission: "users.view" },
  { prefix: "/notifications", permission: "dashboard.view" },
  { prefix: "/settings", permission: "dashboard.view" },
  { prefix: "/dashboard", permission: "dashboard.view" },
  { prefix: "/api/reports", permission: "reports.export" },
  { prefix: "/api/forecasts", permission: "reports.view" },
];

/** Permission required for a pathname, or null when the route is public. */
export function requiredPermissionForPath(pathname: string): Permission | null {
  let match: RouteRule | null = null;
  for (const rule of ROUTE_PERMISSIONS) {
    if (pathname === rule.prefix || pathname.startsWith(rule.prefix + "/")) {
      if (!match || rule.prefix.length > match.prefix.length) match = rule;
    }
  }
  return match?.permission ?? null;
}

/**
 * True when the account may open `pathname`. Public/unmapped paths return
 * true; authorization for those is enforced by the page/API handler itself.
 */
export function canAccessPath(
  user: Pick<SessionUser, "roles">,
  pathname: string,
): boolean {
  const permission = requiredPermissionForPath(pathname);
  if (!permission) return true;
  return hasUserPermission(user.roles, permission);
}
