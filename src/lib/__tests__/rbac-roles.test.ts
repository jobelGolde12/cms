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
  "admin_officer",
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

describe("admin officer is employee-domain only, isolated from students", () => {
  it("holds the employee-records permissions", () => {
    expect(hasPermission("admin_officer", "employees.view")).toBe(true);
    expect(hasPermission("admin_officer", "employee_201.manage")).toBe(true);
    expect(hasPermission("admin_officer", "service_credits.view")).toBe(true);
    expect(hasPermission("admin_officer", "users.manage")).toBe(false);
  });

  it("holds NO student-facing permissions at all", () => {
    for (const p of [
      "students.view",
      "students.create",
      "students.update",
      "students.archive",
      "guardians.view",
      "enrollment.view",
      "grades.view",
      "grades.write",
      "attendance.view",
      "behavior.view",
      "assessments.view",
      "health.view",
      "interventions.view",
      "verification.review",
      "duplicates.view",
      "qr.verify",
      "documents.print",
    ] as const) {
      expect(hasPermission("admin_officer", p)).toBe(false);
    }
  });

  it("no other role gains the employee-records permissions", () => {
    for (const role of ["school_admin", "teacher", "records", "guidance", "nurse", "registrar", "literacy_coordinator"] as const) {
      for (const p of [
        "employees.view",
        "employees.create",
        "employees.update",
        "employees.archive",
        "employee_201.view",
        "employee_201.manage",
        "service_credits.view",
        "service_credits.manage",
      ] as const) {
        expect(hasPermission(role, p)).toBe(false);
      }
    }
  });
});

describe("matrix decisions from the 2026-10 audit", () => {
  it("health.view is held only by admin and nurse (school_admin denied per doc note)", () => {
    expect(hasPermission("admin", "health.view")).toBe(true);
    expect(hasPermission("nurse", "health.view")).toBe(true);
    expect(hasPermission("school_admin", "health.view")).toBe(false);
    expect(hasPermission("records", "health.view")).toBe(false);
  });

  it("user list is admin-only (users.view/manage)", () => {
    expect(hasPermission("admin", "users.view")).toBe(true);
    expect(hasPermission("admin", "users.manage")).toBe(true);
    expect(hasPermission("school_admin", "users.view")).toBe(false);
    expect(hasPermission("school_admin", "users.manage")).toBe(false);
  });

  it("teacher interventions write stays withheld (view-only)", () => {
    expect(hasPermission("teacher", "interventions.view")).toBe(true);
    expect(hasPermission("teacher", "interventions.write")).toBe(false);
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
