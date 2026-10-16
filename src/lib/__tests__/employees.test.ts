import { describe, expect, it } from "vitest";
import {
  computeBalance,
  validateCreditAmount,
} from "@/lib/employees";
import {
  employeeBirthDateIssues,
  employeeFormSchema,
  employee201Schema,
  serviceCreditSchema,
} from "@/lib/schemas";
import {
  EMPLOYEE_201_CATEGORIES,
  EMPLOYEE_201_CATEGORY_LABELS,
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  SERVICE_CREDIT_TYPES,
} from "@/lib/constants";

describe("employee domain constants", () => {
  it("labels every 201 category", () => {
    for (const c of EMPLOYEE_201_CATEGORIES) {
      expect(EMPLOYEE_201_CATEGORY_LABELS[c]).toBeTruthy();
    }
  });

  it("labels every employment type and appointment status", () => {
    for (const t of EMPLOYMENT_TYPES) expect(EMPLOYMENT_TYPE_LABELS[t]).toBeTruthy();
    for (const a of APPOINTMENT_STATUSES) expect(APPOINTMENT_STATUS_LABELS[a]).toBeTruthy();
  });

  it("service credit types are earned/consumed only", () => {
    expect([...SERVICE_CREDIT_TYPES]).toEqual(["earned", "consumed"]);
  });
});

describe("employee birth date validation", () => {
  const near = (years: number, daysOffset = 0): string => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - years);
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString().slice(0, 10);
  };

  it("accepts a realistic working-age date", () => {
    expect(employeeBirthDateIssues(near(35))).toBeNull();
  });

  it("rejects minors (below 18)", () => {
    expect(employeeBirthDateIssues(near(16))).toMatch(/18 years old/);
  });

  it("rejects future dates and calendar-invalid dates", () => {
    expect(employeeBirthDateIssues(near(0, 400))).toMatch(/future/i);
    expect(employeeBirthDateIssues("2026-02-30")).toMatch(/calendar date/i);
    expect(employeeBirthDateIssues(`${new Date().getFullYear() + 5}-01-01`)).toMatch(/future/i);
  });
});

describe("employeeFormSchema", () => {
  const valid = {
    lastName: "Santos",
    firstName: "Maria",
    sex: "female",
    email: "",
    contactNumber: "",
  };

  it("accepts a minimal employee", () => {
    const parsed = employeeFormSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("requires first and last name", () => {
    const parsed = employeeFormSchema.safeParse({ ...valid, firstName: "" });
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid emails and malformed phones", () => {
    expect(employeeFormSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
    expect(employeeFormSchema.safeParse({ ...valid, contactNumber: "abc" }).success).toBe(false);
  });
});

describe("employee201Schema", () => {
  const base = { employeeId: "e1", category: "training", title: "Seminar X", recordDate: "2026-01-15" };

  it("accepts a well-formed entry", () => {
    expect(employee201Schema.safeParse(base).success).toBe(true);
  });

  it("requires a valid category", () => {
    expect(employee201Schema.safeParse({ ...base, category: "whatever" }).success).toBe(false);
  });

  it("requires a record date", () => {
    expect(employee201Schema.safeParse({ ...base, recordDate: "01/15/2026" }).success).toBe(false);
  });
});

describe("serviceCreditSchema", () => {
  const base = {
    employeeId: "e1",
    type: "earned",
    credits: "10",
    transactionDate: "2026-02-01",
    reason: "Summer classes",
  };

  it("accepts earned credits", () => {
    const parsed = serviceCreditSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.credits).toBe(10);
  });

  it("requires a reason", () => {
    expect(serviceCreditSchema.safeParse({ ...base, reason: "" }).success).toBe(false);
  });

  it("rejects zero/negative credits and bad dates", () => {
    expect(serviceCreditSchema.safeParse({ ...base, credits: "0" }).success).toBe(false);
    expect(serviceCreditSchema.safeParse({ ...base, credits: "-5" }).success).toBe(false);
    expect(serviceCreditSchema.safeParse({ ...base, credits: "400" }).success).toBe(false);
    expect(serviceCreditSchema.safeParse({ ...base, transactionDate: "01-2026-01" }).success).toBe(false);
  });
});

describe("service credit balance rules", () => {
  it("computes balances as earned minus consumed", () => {
    expect(computeBalance(15, 5)).toBe(10);
    expect(computeBalance(10, 3)).toBe(7);
    expect(computeBalance(0, 0)).toBe(0);
    // Float drift (6.5 - 1.3) is normalized to 2dp.
    expect(computeBalance(6.5, 1.3)).toBe(5.2);
  });

  it("allows any positive earned amount", () => {
    expect(validateCreditAmount("earned", 50, 0)).toBeNull();
  });

  it("rejects non-positive amounts", () => {
    expect(validateCreditAmount("consumed", 0, 10)).toMatch(/greater than 0/);
  });

  it("rejects consumption above the available balance", () => {
    expect(validateCreditAmount("consumed", 11, 10)).toMatch(/Insufficient/);
    expect(validateCreditAmount("consumed", 10, 10)).toBeNull();
    expect(validateCreditAmount("consumed", 0.01, 10)).toBeNull();
  });
});
