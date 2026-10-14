import { describe, expect, it } from "vitest";
import { hasPermission, ROLE_PERMISSIONS } from "@/lib/permissions";
import { canViewConfidentialBehavior } from "@/lib/scope";
import type { Role } from "@/lib/constants";
import type { SessionUser } from "@/lib/auth";

// Re-exports from permissions/constants are compile-checked by adding this
// (Role union must include every role seeded by scripts/seed.mts).
const ALL_ROLES: readonly Role[] = [
  "admin",
  "school_admin",
  "teacher",
  "records",
  "guidance",
  "nurse",
  "registrar",
  "literacy_coordinator",
];

describe("role catalog", () => {
  it("covers every role with a permission map", () => {
    for (const role of ALL_ROLES) {
      expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
      expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
    }
  });
});

describe("registrar is strictly read-only", () => {
  const writePermissions = [
    "students.create",
    "students.update",
    "students.archive",
    "enrollment.manage",
    "grades.write",
    "attendance.write",
    "behavior.write",
    "assessments.write",
    "health.write",
    "interventions.write",
    "verification.review",
    "duplicates.review",
    "users.manage",
    "settings.manage",
  ] as const;

  it("grants NO write permissions", () => {
    for (const p of writePermissions) {
      expect(hasPermission("registrar", p)).toBe(false);
    }
  });

  it("can still view records and print documents", () => {
    expect(hasPermission("registrar", "students.view")).toBe(true);
    expect(hasPermission("registrar", "grades.view")).toBe(true);
    expect(hasPermission("registrar", "documents.print")).toBe(true);
    expect(hasPermission("registrar", "reports.export")).toBe(true);
  });
});

describe("nurse is health-domain only", () => {
  it("cannot edit general student information", () => {
    expect(hasPermission("nurse", "students.create")).toBe(false);
    expect(hasPermission("nurse", "students.update")).toBe(false);
    expect(hasPermission("nurse", "students.archive")).toBe(false);
    expect(hasPermission("nurse", "guardians.manage")).toBe(false);
    expect(hasPermission("nurse", "enrollment.manage")).toBe(false);
  });

  it("can only manage health records", () => {
    expect(hasPermission("nurse", "health.view")).toBe(true);
    expect(hasPermission("nurse", "health.write")).toBe(true);
    expect(hasPermission("nurse", "grades.write")).toBe(false);
    expect(hasPermission("nurse", "behavior.write")).toBe(false);
    expect(hasPermission("nurse", "assessments.write")).toBe(false);
  });
});

describe("literacy coordinator is assessment-domain only", () => {
  it("has literacy assessment access and nothing sensitive", () => {
    expect(hasPermission("literacy_coordinator", "assessments.view")).toBe(true);
    expect(hasPermission("literacy_coordinator", "assessments.write")).toBe(true);
    expect(hasPermission("literacy_coordinator", "behavior.view")).toBe(false);
    expect(hasPermission("literacy_coordinator", "health.view")).toBe(false);
    expect(hasPermission("literacy_coordinator", "grades.write")).toBe(false);
    expect(hasPermission("literacy_coordinator", "documents.print")).toBe(false);
  });
});

describe("guidance data confidentiality", () => {
  const userWith = (role: Role): SessionUser => ({
    id: "u1",
    email: "u@example.com",
    firstName: "T",
    lastName: "User",
    roleId: "role-x",
    role,
  });

  it("confidential behavior records are visible only to admin/school_admin/guidance", () => {
    for (const role of ["admin", "school_admin", "guidance"] as const) {
      expect(canViewConfidentialBehavior(userWith(role))).toBe(true);
    }
    for (const role of ["teacher", "nurse", "registrar", "literacy_coordinator"] as const) {
      expect(canViewConfidentialBehavior(userWith(role))).toBe(false);
    }
  });

  it("teacher keeps classroom behavior access but guidance-only write is withheld from others", () => {
    expect(hasPermission("teacher", "behavior.view")).toBe(true);
    expect(hasPermission("nurse", "behavior.view")).toBe(false);
    expect(hasPermission("registrar", "behavior.view")).toBe(false);
    expect(hasPermission("literacy_coordinator", "behavior.write")).toBe(false);
  });
});
