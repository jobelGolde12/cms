import { describe, it, expect } from "vitest";
import {
  canAccessStudent,
  canEditStudent,
  enrollableSectionIds,
  hasSchoolWideStudentScope,
  studentScope,
  type StudentScopeRef,
} from "../scope";
import type { SessionUser } from "../auth";

/* ---------------------------------------------------------------------------
 * Row-level row scope for student records. canAccess/canEdit use the database
 * for advisers, so Scope-ref tests only cover what is database-free:
 * studentScope() predicate composition + school-wide admin behavior.
 * ------------------------------------------------------------------------- */

const admin: SessionUser = {
  id: "u-admin",
  email: "a@t.gov",
  firstName: "A",
  lastName: "Dmin",
  roleId: "role-admin",
  role: "admin",
  roles: ["admin"],
};

const schoolAdmin: SessionUser = {
  ...admin,
  id: "u-school-admin",
  roleId: "role-school-admin",
  role: "school_admin",
  roles: ["school_admin"],
};

const recordsUser: SessionUser = {
  ...admin,
  id: "u-records",
  roleId: "role-records",
  role: "records",
  roles: ["records"],
};

const guidanceUser: SessionUser = {
  ...admin,
  id: "u-guidance",
  roleId: "role-guidance",
  role: "guidance",
  roles: ["guidance"],
};

const teacher: SessionUser = {
  ...admin,
  id: "u-teacher",
  roleId: "role-teacher",
  role: "teacher",
  roles: ["teacher"],
};

const subjectTeacher: SessionUser = {
  ...admin,
  id: "u-subject-teacher",
  roleId: "role-subject-teacher",
  role: "subject_teacher",
  roles: ["subject_teacher"],
};

const ref: StudentScopeRef = { studentId: "s1" };

describe("studentScope (SQL predicate builder)", () => {
  it("returns undefined (school-wide) for admin, school_admin, records, guidance", async () => {
    for (const user of [admin, schoolAdmin, recordsUser, guidanceUser]) {
      expect(await Promise.resolve(studentScope(user))).toBeUndefined();
    }
  });

  it("returns a never-true predicate for teachers without sections", () => {
    const scope = studentScope(teacher, []);
    expect(scope).toBeDefined();
  });

  it("returns a scoped predicate referencing the enrollment join for teachers", async () => {
    const scope = studentScope(teacher, ["sec-7-0"]);
    expect(scope).toBeDefined();
    // Render via drizzle dialect to confirm the section filter is embedded.
    const { SQLiteSyncDialect } = await import("drizzle-orm/sqlite-core");
    const dialect = new SQLiteSyncDialect();
    const query = dialect.sqlToQuery(scope!);
    expect(query.params).toContain("sec-7-0");
  });

  it("returns never-true for unknown roles", () => {
    const unknown = { ...admin, role: "unknown" as never };
    expect(studentScope(unknown)).toBeDefined();
  });
});

describe("canAccessStudent (database-free paths)", () => {
  it("grants school-wide roles access without a DB roundtrip", async () => {
    expect(await canAccessStudent(admin, ref)).toBe(true);
    expect(await canAccessStudent(schoolAdmin, ref)).toBe(true);
    expect(await canAccessStudent(recordsUser, ref)).toBe(true);
    expect(await canAccessStudent(guidanceUser, ref)).toBe(true);
  });
});

describe("canEditStudent inherits canAccessStudent", () => {
  it("grants school-wide roles edit access", async () => {
    expect(await canEditStudent(admin, ref)).toBe(true);
    expect(await canEditStudent(recordsUser, ref)).toBe(true);
  });
});

describe("hasSchoolWideStudentScope", () => {
  it("is true for the school-wide records roles", () => {
    for (const user of [admin, schoolAdmin, recordsUser, guidanceUser]) {
      expect(hasSchoolWideStudentScope(user)).toBe(true);
    }
  });

  it("is false for any account carrying a teaching role", () => {
    // Even when combined with a school-wide role, a teaching responsibility
    // always narrows student scope to the teacher's own sections.
    expect(hasSchoolWideStudentScope(teacher)).toBe(false);
    expect(hasSchoolWideStudentScope(subjectTeacher)).toBe(false);
    const dual: SessionUser = { ...teacher, roles: ["teacher", "records"] };
    expect(hasSchoolWideStudentScope(dual)).toBe(false);
  });
});

describe("enrollableSectionIds (database-free paths)", () => {
  it("returns null (any section) for school-wide records roles", async () => {
    expect(await enrollableSectionIds(admin)).toBeNull();
    expect(await enrollableSectionIds(schoolAdmin)).toBeNull();
    expect(await enrollableSectionIds(recordsUser)).toBeNull();
  });

  it("returns [] (no sections) for a non-adviser teaching role", async () => {
    expect(await enrollableSectionIds(subjectTeacher)).toEqual([]);
  });
});
