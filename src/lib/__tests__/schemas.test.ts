import { describe, it, expect } from "vitest";
import { childFormSchema, validationReviewSchema } from "../schemas";

describe("childFormSchema", () => {
  const validBase = {
    firstName: "Juan",
    lastName: "Dela Cruz",
    birthDate: "2019-03-05",
    sex: "male",
    barangayId: "brgy-1",
    householdAddress: "Purok 2",
    educationStatus: "enrolled",
    eccdStatus: "participating",
  };

  it("accepts a minimal valid submission", () => {
    const parsed = childFormSchema.safeParse(validBase);
    expect(parsed.success).toBe(true);
  });

  it("requires first name, last name, barangay, and address", () => {
    const { success } = childFormSchema.safeParse({});
    expect(success).toBe(false);
  });

  it("rejects malformed birth dates", () => {
    const parsed = childFormSchema.safeParse({ ...validBase, birthDate: "03/05/2019" });
    expect(parsed.success).toBe(false);
  });

  it("rejects unrealistic birth years", () => {
    const parsed = childFormSchema.safeParse({ ...validBase, birthDate: "1800-01-01" });
    expect(parsed.success).toBe(false);
  });

  it("coerces the hasDisability checkbox", () => {
    const on = childFormSchema.safeParse({ ...validBase, hasDisability: "on" });
    const off = childFormSchema.safeParse({ ...validBase });
    expect(on.success && on.data.hasDisability).toBe(true);
    expect(off.success && off.data.hasDisability).toBe(false);
  });

  it("validates the school year format when provided", () => {
    const bad = childFormSchema.safeParse({ ...validBase, schoolYear: "2026" });
    const good = childFormSchema.safeParse({ ...validBase, schoolYear: "2026-2027" });
    expect(bad.success).toBe(false);
    expect(good.success).toBe(true);
  });
});

describe("validationReviewSchema", () => {
  it("accepts the three legal decisions", () => {
    for (const decision of ["approved", "needs_correction", "rejected"]) {
      const parsed = validationReviewSchema.safeParse({
        childId: "c1",
        decision,
        remarks: "ok",
      });
      expect(parsed.success).toBe(true);
    }
  });

  it("rejects unknown decisions", () => {
    const parsed = validationReviewSchema.safeParse({ childId: "c1", decision: "maybe" });
    expect(parsed.success).toBe(false);
  });

  it("requires a childId", () => {
    const parsed = validationReviewSchema.safeParse({ decision: "approved" });
    expect(parsed.success).toBe(false);
  });

  it("caps remarks length", () => {
    const parsed = validationReviewSchema.safeParse({
      childId: "c1",
      decision: "approved",
      remarks: "x".repeat(501),
    });
    expect(parsed.success).toBe(false);
  });
});
