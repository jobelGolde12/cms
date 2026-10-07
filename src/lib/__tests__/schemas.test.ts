import { describe, it, expect } from "vitest";
import { studentFormSchema, verificationReviewSchema } from "../schemas";

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
