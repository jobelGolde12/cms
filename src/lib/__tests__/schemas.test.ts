import { describe, it, expect } from "vitest";
import {
  enrollmentFormSchema,
  studentFormSchema,
  studentQuerySchema,
  userFormSchema,
  verificationReviewSchema,
} from "../schemas";

describe("studentFormSchema", () => {
  const validBase = {
    firstName: "Juan",
    lastName: "Dela Cruz",
    birthDate: "2012-03-05",
    sex: "male",
  };

  it("accepts a minimal valid submission (guardian optional)", () => {
    const parsed = studentFormSchema.safeParse(validBase);
    expect(parsed.success).toBe(true);
  });

  it("requires first name, last name, birth date, and sex", () => {
    const { success } = studentFormSchema.safeParse({});
    expect(success).toBe(false);
  });

  describe("lrn", () => {
    it("accepts submissions without an LRN (not yet filed)", () => {
      expect(studentFormSchema.safeParse(validBase).success).toBe(true);
      const parsed = studentFormSchema.safeParse({ ...validBase, lrn: "" });
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.lrn).toBeNull();
    });

    it("accepts an exactly 12-digit LRN", () => {
      const parsed = studentFormSchema.safeParse({ ...validBase, lrn: " 136018051744 " });
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.lrn).toBe("136018051744");
    });

    it("rejects LRNs that are not exactly 12 digits", () => {
      for (const bad of ["13601805174", "1360180517440", "1360-1805-17", "13a60b18051c744"]) {
        const parsed = studentFormSchema.safeParse({ ...validBase, lrn: bad });
        expect(parsed.success).toBe(false);
      }
    });
  });

  it("rejects malformed birth dates", () => {
    const parsed = studentFormSchema.safeParse({ ...validBase, birthDate: "03/05/2012" });
    expect(parsed.success).toBe(false);
  });

  it("rejects unrealistic birth years", () => {
    const parsed = studentFormSchema.safeParse({ ...validBase, birthDate: "1800-01-01" });
    expect(parsed.success).toBe(false);
  });

  it("rejects contact numbers with unexpected characters", () => {
    const parsed = studentFormSchema.safeParse({ ...validBase, contactNumber: "not-a-number!" });
    expect(parsed.success).toBe(false);
  });

  it("accepts guardian blocks when provided", () => {
    const parsed = studentFormSchema.safeParse({
      ...validBase,
      guardianFirstName: "Maria",
      guardianLastName: "Santos",
      guardianRelationship: "mother",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("grade-level schemas", () => {
  const enrollmentBase = {
    studentId: "student-1",
    schoolYearId: "school-year-1",
    gradeLevelId: "gl-7",
    sectionId: "section-1",
  };

  it("accepts every supported Grade 7–10 enrollment", () => {
    for (const gradeLevelId of ["gl-7", "gl-8", "gl-9", "gl-10"]) {
      expect(
        enrollmentFormSchema.safeParse({ ...enrollmentBase, gradeLevelId }).success,
      ).toBe(true);
    }
  });

  it("rejects Grade 11 and Grade 12 enrollment requests", () => {
    for (const gradeLevelId of ["gl-11", "gl-12"]) {
      expect(
        enrollmentFormSchema.safeParse({ ...enrollmentBase, gradeLevelId }).success,
      ).toBe(false);
    }
  });

  it("rejects unsupported registry grade filters", () => {
    expect(studentQuerySchema.safeParse({ gradeLevel: "gl-7" }).success).toBe(true);
    expect(studentQuerySchema.safeParse({ gradeLevel: "gl-10" }).success).toBe(true);
    expect(studentQuerySchema.safeParse({ gradeLevel: "gl-11" }).success).toBe(false);
    expect(studentQuerySchema.safeParse({ gradeLevel: "gl-12" }).success).toBe(false);
  });
});

describe("verificationReviewSchema", () => {
  it("accepts the three legal decisions", () => {
    for (const decision of ["approved", "needs_correction", "rejected"]) {
      const parsed = verificationReviewSchema.safeParse({
        studentId: "s1",
        decision,
        remarks: "ok",
      });
      expect(parsed.success).toBe(true);
    }
  });

  it("rejects unknown decisions", () => {
    const parsed = verificationReviewSchema.safeParse({ studentId: "s1", decision: "maybe" });
    expect(parsed.success).toBe(false);
  });

  it("requires a studentId", () => {
    const parsed = verificationReviewSchema.safeParse({ decision: "approved" });
    expect(parsed.success).toBe(false);
  });

  it("caps remarks length", () => {
    const parsed = verificationReviewSchema.safeParse({
      studentId: "s1",
      decision: "approved",
      remarks: "x".repeat(501),
    });
    expect(parsed.success).toBe(false);
  });
});

describe("userFormSchema", () => {
  const validBase = {
    firstName: "Maria",
    lastName: "Santos",
    email: "maria.santos@example.edu",
    roleId: "role-records",
  };

  it("accepts a minimal valid submission", () => {
    expect(userFormSchema.safeParse(validBase).success).toBe(true);
  });

  it("rejects an unknown role", () => {
    expect(userFormSchema.safeParse({ ...validBase, roleId: "role-superuser" }).success).toBe(false);
  });

  describe("isActive", () => {
    it("reads the FormData strings a checkbox produces", () => {
      const off = userFormSchema.safeParse({ ...validBase, isActive: "false" });
      expect(off.success).toBe(true);
      if (off.success) expect(off.data.isActive).toBe(false);

      const on = userFormSchema.safeParse({ ...validBase, isActive: "true" });
      expect(on.success).toBe(true);
      if (on.success) expect(on.data.isActive).toBe(true);
    });

    it("defaults to active when the flag is absent", () => {
      const parsed = userFormSchema.safeParse(validBase);
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.isActive).toBe(true);
    });

    it("still accepts a real boolean", () => {
      const parsed = userFormSchema.safeParse({ ...validBase, isActive: false });
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.isActive).toBe(false);
    });
  });

  describe("password", () => {
    it("accepts an empty password (edit keeps the current one)", () => {
      const parsed = userFormSchema.safeParse({ ...validBase, password: "" });
      expect(parsed.success).toBe(true);
    });

    it("rejects a password shorter than 8 characters", () => {
      expect(userFormSchema.safeParse({ ...validBase, password: "short" }).success).toBe(false);
    });
  });
});
