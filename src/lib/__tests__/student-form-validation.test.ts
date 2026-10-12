import { describe, it, expect } from "vitest";
import { studentFormSchema } from "../schemas";
import {
  birthDateError,
  birthDateMax,
  birthDateMin,
  emailError,
  isValidPHPhone,
  liveFieldErrors,
  nameError,
  phoneError,
  sanitizePhoneInput,
} from "@/components/student-form-validation";

const validBase = {
  firstName: "Juan",
  lastName: "Dela Cruz",
  birthDate: "2012-03-05",
  sex: "male",
};

describe("phone validation (PH formats)", () => {
  it("accepts a standard 09 mobile", () => {
    expect(isValidPHPhone("09171234567")).toBe(true);
    expect(isValidPHPhone("0917 123 4567")).toBe(true);
    expect(phoneError("0917 123 4567")).toBeNull();
  });

  it("accepts the +63 international form", () => {
    expect(isValidPHPhone("+639171234567")).toBe(true);
    expect(phoneError("+63917 123 4567")).toBeNull();
  });

  it("accepts landlines", () => {
    expect(isValidPHPhone("0281234567")).toBe(true);
    expect(isValidPHPhone("(02) 8123-4567")).toBe(true);
  });

  it("rejects letters even if digits length looks right", () => {
    expect(phoneError("0917abr4567")).toMatchInlineSnapshot(
      '"Phone numbers cannot contain letters"',
    );
  });

  it("rejects wrong length mobiles", () => {
    expect(isValidPHPhone("0917123456")).toBe(false); // 9 digits
    expect(isValidPHPhone("091712345678")).toBe(false); // 11 digits
    expect(phoneError("09171234")).not.toBeNull();
  });

  it("rejects non-digit symbols not in the whitelist", () => {
    expect(phoneError("09#1234567")).not.toBeNull();
  });

  it("interactive sanitizer strips letters and unexpected symbols", () => {
    expect(sanitizePhoneInput("abc091 7x!123 45@67")).toBe("091 7123 4567");
    expect(sanitizePhoneInput("0917-123-4567")).toBe("0917-123-4567");
  });

  it("server schema allows digits after letters are stripped only when the digits themselves are valid", () => {
    // "abc09171234567" contains letters; zod's trim() doesn't strip them, so
    // the raw string fails the phone rule (length 14, not 11/12).
    const parsed = studentFormSchema.safeParse({ ...validBase, contactNumber: "abc09171234567" });
    expect(parsed.success).toBe(false);
  });

  it("server schema accepts a valid PH mobile", () => {
    const parsed = studentFormSchema.safeParse({ ...validBase, contactNumber: "0917 123 4567" });
    expect(parsed.success).toBe(true);
  });
});

describe("birth date validation", () => {
  const yearsAgo = (n: number, month = 0, day = 1): string => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - n);
    d.setMonth(month, day);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  it("accepts an in-range high school age", () => {
    expect(birthDateError(yearsAgo(14))).toBeNull();
    expect(birthDateError(yearsAgo(12))).toBeNull();
  });

  it("rejects future dates (day after today or later)", () => {
    expect(birthDateError(yearsAgo(-1))).toMatchInlineSnapshot(
      '"Birth date cannot be after today"',
    );
  });

  it("rejects today-dated births only via future-date rule (today is allowed at 0 age)", () => {
    // A birth today → age 0 → below minimum anyway.
    const msg = birthDateError(today());
    expect(msg).toMatch(/Too young for high school/);
  });

  it("rejects ages below 9 (child, not high school)", () => {
    const msg = birthDateError(yearsAgo(5));
    expect(msg).toMatch(/Too young for high school/);
  });

  it("rejects implausible ages above 24", () => {
    expect(birthDateError(yearsAgo(30))).toMatch(/above the reliable record range/);
  });

  it("rejects impossible calendar days (Feb 30)", () => {
    expect(birthDateError("2010-02-30")).toMatchInlineSnapshot(
      '"That date does not exist in the calendar"',
    );
  });

  it("server schema enforces the same window", () => {
    const tooYoung = studentFormSchema.safeParse({ ...validBase, birthDate: yearsAgo(5) });
    expect(tooYoung.success).toBe(false);
    const wrongSide = studentFormSchema.safeParse({ ...validBase, birthDate: yearsAgo(-1) });
    expect(wrongSide.success).toBe(false);
    const ok = studentFormSchema.safeParse({ ...validBase, birthDate: yearsAgo(13) });
    expect(ok.success).toBe(true);
  });

  it("date input bounds honor the age window", () => {
    const min = birthDateMin();
    const max = birthDateMax();
    expect(Number(min.slice(0, 4))).toBe(new Date().getFullYear() - 24);
    expect(max).toBe(today());
  });
});

describe("guardian contingent rules", () => {
  it("requires name + relationship when any guardian field is filled", () => {
    const half = studentFormSchema.safeParse({
      ...validBase,
      guardianFirstName: "Maria",
      // election to omit relationship + last name
    });
    expect(half.success).toBe(false);
  });

  it("accepts a complete guardian block", () => {
    const full = studentFormSchema.safeParse({
      ...validBase,
      guardianFirstName: "Maria",
      guardianLastName: "Santos",
      guardianRelationship: "mother",
    });
    expect(full.success).toBe(true);
  });

  it("accepts no guardian at all", () => {
    expect(studentFormSchema.safeParse(validBase).success).toBe(true);
  });
});

describe("live helper parity", () => {
  it("nameError flags digits", () => {
    expect(nameError("Ju4n", "First name")).toMatchInlineSnapshot(
      '"First name cannot contain numbers"',
    );
    expect(nameError("Juan", "First name")).toBeNull();
  });

  it("emailError flags bad addresses", () => {
    expect(emailError("not-an-email")).not.toBeNull();
    expect(emailError("a@b.ph")).toBeNull();
  });

  it("liveFieldErrors aggregates per field", () => {
    const errors = liveFieldErrors({
      firstName: "Ju4n",
      lastName: "",
      birthDate: "2099-01-01",
      contactNumber: "abcdefghijk",
      guardianFirstName: "",
      guardianLastName: "",
      guardianContactNumber: "+639171234567",
      guardianEmail: "x",
    });
    expect(errors.firstName).not.toBeNull();
    expect(errors.birthDate).toMatch(/after today/);
    expect(errors.contactNumber).toMatch(/letters/);
    expect(errors.guardianContactNumber).toBeNull(); // valid
    expect(errors.guardianEmail).not.toBeNull();
    expect(errors.guardianRequired).toMatch(/Guardian last name/);
  });
});
