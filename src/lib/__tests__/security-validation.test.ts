import { describe, expect, it } from "vitest";
import { clinicalRecordSchema, healthRecordSchema } from "@/lib/schemas";
import { confidentialBehaviorFilter } from "@/lib/scope";
import { db } from "@/db";
import { behaviorRecords } from "@/db/schema";
import type { SessionUser } from "@/lib/auth";

const userWith = (role: SessionUser["role"]): SessionUser => ({
  id: "u1",
  email: "u@example.com",
  firstName: "T",
  lastName: "User",
  roleId: "role-x",
  role,
});

describe("healthRecordSchema validation (Nurse domain)", () => {
  const base = { studentId: "s1", measurementDate: "2026-09-30" };

  it("accepts a fully valid record", () => {
    const parsed = healthRecordSchema.safeParse({
      ...base,
      weightKg: "45.5",
      heightCm: "158",
      nutritionalStatus: "normal",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a record with no measurable data", () => {
    const parsed = healthRecordSchema.safeParse({ ...base, weightKg: "", heightCm: "", nutritionalStatus: "" });
    expect(parsed.success).toBe(false);
  });

  it("rejects out-of-range weight (server-side ranges, not just UI)", () => {
    expect(healthRecordSchema.safeParse({ ...base, weightKg: "300" }).success).toBe(false);
    expect(healthRecordSchema.safeParse({ ...base, weightKg: "2" }).success).toBe(false);
    expect(healthRecordSchema.safeParse({ ...base, heightCm: "400" }).success).toBe(false);
  });

  it("rejects invalid date formats", () => {
    expect(healthRecordSchema.safeParse({ ...base, measurementDate: "09/30/2026" }).success).toBe(false);
    expect(healthRecordSchema.safeParse({ ...base, measurementDate: "not-a-date" }).success).toBe(false);
  });

  it("rejects bogus nutritional status values", () => {
    const parsed = healthRecordSchema.safeParse({ ...base, weightKg: "45", nutritionalStatus: "admin" });
    expect(parsed.success).toBe(false);
  });

  it("rejects non-numeric weight inputs (coercion does not accept garbage)", () => {
    expect(healthRecordSchema.safeParse({ ...base, weightKg: "abc" }).success).toBe(false);
  });
});

describe("clinicalRecordSchema validation", () => {
  it("requires the mandatory fields", () => {
    expect(clinicalRecordSchema.safeParse({ studentId: "s1", date: "2026-09-30", category: "", description: "" }).success).toBe(false);
    expect(
      clinicalRecordSchema.safeParse({
        studentId: "s1",
        date: "2026-09-30",
        category: "First Aid",
        description: "Small wound treated",
      }).success,
    ).toBe(true);
  });
});

describe("confidentialBehaviorFilter SQL shape", () => {
  it("returns no filter for guidance/admin/school_admin (they may see all)", () => {
    for (const role of ["admin", "school_admin", "guidance"] as const) {
      expect(confidentialBehaviorFilter(userWith(role))).toBeUndefined();
    }
  });

  it("excludes confidential rows for teacher/nurse/registrar/literacy/records", () => {
    for (const role of ["teacher", "nurse", "registrar", "literacy_coordinator", "records"] as const) {
      const filter = confidentialBehaviorFilter(userWith(role));
      expect(filter).toBeDefined();
      // Render the real generated SQL — the excluded predicate must target
      // the confidential column (behavior, not internal object shape).
      const generated = db
        .select({ id: behaviorRecords.id })
        .from(behaviorRecords)
        .where(filter)
        .toSQL();
      expect(generated.sql.toLowerCase()).toContain("confidential");
    }
  });
});
