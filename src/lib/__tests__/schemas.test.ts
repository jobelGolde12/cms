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
