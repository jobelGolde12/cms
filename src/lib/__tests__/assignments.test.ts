import { describe, expect, it } from "vitest";
import {
  checkAdviserChange,
  checkSubjectTeacherChange,
} from "@/lib/assignment-rules";
import { hasUserPermission } from "@/lib/permissions";

describe("checkAdviserChange", () => {
  it("accepts a section with no adviser", () => {
    expect(checkAdviserChange(null, "teacher-1")).toEqual({ ok: true });
  });

  it("rejects assigning the same teacher twice", () => {
    const result = checkAdviserChange("teacher-1", "teacher-1", "Hannafae Forte");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/already the adviser/i);
  });

  it("never silently replaces an existing adviser", () => {
    const result = checkAdviserChange("teacher-1", "teacher-2", "Hannafae Forte");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/already has an adviser/i);
      expect(result.error).toMatch(/Hannafae Forte/);
      expect(result.error).toMatch(/remove that assignment first/i);
    }
  });
});

describe("checkSubjectTeacherChange", () => {
  it("accepts a free (section, subject) slot", () => {
    expect(checkSubjectTeacherChange(null, "teacher-2")).toEqual({ ok: true });
  });

  it("rejects a duplicate load for the same teacher", () => {
    const result = checkSubjectTeacherChange(
      { teacherId: "teacher-2", teacherName: "Meisher Alcaraz" },
      "teacher-2",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/already assigned/i);
  });

  it("refuses to overwrite another teacher's load", () => {
    const result = checkSubjectTeacherChange(
      { teacherId: "teacher-2", teacherName: "Meisher Alcaraz" },
      "teacher-3",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/already assigned to Meisher Alcaraz/i);
      expect(result.error).toMatch(/remove that assignment first/i);
    }
  });

  it("falls back to a generic name when the holder is unknown", () => {
    const result = checkSubjectTeacherChange({ teacherId: "teacher-2" }, "teacher-3");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/another teacher/i);
  });
});

describe("dual-role grade permission union", () => {
  it("an adviser alone cannot write or encode grades", () => {
    expect(hasUserPermission(["teacher"], "grades.write")).toBe(false);
    expect(hasUserPermission(["teacher"], "grades.encode")).toBe(false);
  });

  it("a subject teacher can write and encode", () => {
    expect(hasUserPermission(["subject_teacher"], "grades.write")).toBe(true);
    expect(hasUserPermission(["subject_teacher"], "grades.encode")).toBe(true);
  });

  it("adviser + subject teacher on one account keeps both permission sets", () => {
    const roles = ["teacher", "subject_teacher"] as const;
    // Subject Teacher contributes the grade permissions…
    expect(hasUserPermission(roles, "grades.write")).toBe(true);
    expect(hasUserPermission(roles, "grades.encode")).toBe(true);
    // …while the Adviser role keeps its own scope. Since the 2026-11 revision D
    // an Adviser may create/update students and manage enrollment, but ONLY
    // inside the sections they advise (enforced by scope.ts, not by the role).
    expect(hasUserPermission(roles, "attendance.write")).toBe(true);
    expect(hasUserPermission(roles, "students.create")).toBe(true);
    expect(hasUserPermission(roles, "students.update")).toBe(true);
    expect(hasUserPermission(roles, "enrollment.manage")).toBe(true);
    // …and neither role grants administrative powers.
    expect(hasUserPermission(roles, "users.manage")).toBe(false);
    expect(hasUserPermission(roles, "settings.manage")).toBe(false);
    expect(hasUserPermission(roles, "employees.view")).toBe(false);
  });

  it("an account with no roles holds nothing", () => {
    expect(hasUserPermission([], "grades.write")).toBe(false);
    expect(hasUserPermission(undefined, "grades.write")).toBe(false);
  });
});
