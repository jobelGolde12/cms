import { describe, expect, it } from "vitest";
import { ROLES, type Role } from "@/lib/constants";
import { hasUserPermission } from "@/lib/permissions";
import {
  DASHBOARD_PATH,
  canAccessPath,
  requiredPermissionForPath,
  resolveDashboard,
  resolveDashboardForRoles,
  resolveDashboardRole,
} from "@/lib/dashboard";

/** Minimal session user for the pure resolver tests. */
function userOf(role: Role, roles: Role[] = [role]) {
  return { role, roles };
}

describe("dashboard resolution", () => {
  it("resolves every role to its own dashboard view at the canonical route", () => {
    for (const role of ROLES) {
      const resolved = resolveDashboard(userOf(role));
      expect(resolved.kind).toBe(role);
      expect(resolved.path).toBe(DASHBOARD_PATH);
      expect(resolved.title.length).toBeGreaterThan(0);
      expect(resolved.eyebrow.length).toBeGreaterThan(0);
    }
  });

  it("every role may open the dashboard (dashboard.view)", () => {
    for (const role of ROLES) {
      expect(hasUserPermission([role], "dashboard.view")).toBe(true);
      expect(canAccessPath(userOf(role), "/dashboard")).toBe(true);
    }
  });

  it("the primary role wins over additional roles", () => {
    expect(
      resolveDashboardRole("teacher", ["teacher", "subject_teacher"]),
    ).toBe("teacher");
    expect(
      resolveDashboardRole("subject_teacher", [
        "subject_teacher",
        "teacher",
      ]),
    ).toBe("subject_teacher");
    expect(
      resolveDashboardRole("guidance", ["guidance", "teacher"]),
    ).toBe("guidance");
  });

  it("falls back deterministically when the primary role is missing from roles", () => {
    // Canonical ROLES order decides; never the order of the extra roles.
    expect(resolveDashboardRole("records", ["teacher", "nurse"])).toBe("teacher");
    expect(resolveDashboardForRoles("records", ["nurse"]).kind).toBe("nurse");
    expect(resolveDashboardForRoles("records", []).kind).toBe("records");
  });

  it("keeps the admin officer dashboard for an admin officer account", () => {
    expect(resolveDashboard(userOf("admin_officer")).kind).toBe("admin_officer");
  });

  it("keeps the guidance and nurse dashboards distinct from the generic overview", () => {
    expect(resolveDashboard(userOf("guidance")).kind).toBe("guidance");
    expect(resolveDashboard(userOf("nurse")).kind).toBe("nurse");
    expect(resolveDashboard(userOf("school_admin")).kind).toBe("school_admin");
  });
});

describe("route authorization", () => {
  it("maps nested routes to the most specific permission", () => {
    expect(requiredPermissionForPath("/grades/monitoring")).toBe("grades.monitor");
    expect(requiredPermissionForPath("/grades")).toBe("grades.encode");
    expect(requiredPermissionForPath("/students/abc/edit")).toBe("students.view");
    expect(requiredPermissionForPath("/")).toBeNull();
  });

  it("blocks modules the role does not hold", () => {
    expect(canAccessPath(userOf("nurse"), "/reports")).toBe(false);
    expect(canAccessPath(userOf("nurse"), "/health")).toBe(true);

    expect(canAccessPath(userOf("registrar"), "/grades")).toBe(false);
    expect(canAccessPath(userOf("registrar"), "/students")).toBe(true);

    expect(canAccessPath(userOf("guidance"), "/reports")).toBe(false);
    expect(canAccessPath(userOf("guidance"), "/guidance")).toBe(true);

    expect(canAccessPath(userOf("teacher"), "/users")).toBe(false);
    expect(canAccessPath(userOf("admin_officer"), "/students")).toBe(false);
    expect(canAccessPath(userOf("admin_officer"), "/employees")).toBe(true);
  });

  it("allows a permission contributed by ANY role the account holds", () => {
    const dual = userOf("teacher", ["teacher", "subject_teacher"]);
    expect(canAccessPath(dual, "/grades")).toBe(true);
    expect(canAccessPath(dual, "/performance")).toBe(true);
    // Still no administrative access.
    expect(canAccessPath(dual, "/users")).toBe(false);
    expect(canAccessPath(dual, "/employees")).toBe(false);
  });
});
