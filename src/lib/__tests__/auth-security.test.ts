import { describe, expect, it } from "vitest";
import {
  forgotPasswordSchema,
  registrationSchema,
  resetPasswordSchema,
} from "@/lib/schemas";
import {
  isResetTokenUsable,
  issuePasswordResetToken,
  isValidTokenShape,
} from "@/lib/security/tokens";

const validRegistration = {
  firstName: "Maria",
  lastName: "Santos",
  email: "maria.santos@deped.gov.ph",
  requestedPosition: "teacher",
  password: "Str0ngPassw0rd",
  confirmPassword: "Str0ngPassw0rd",
};

describe("self-registration schema", () => {
  it("accepts a valid request", () => {
    expect(registrationSchema.safeParse(validRegistration).success).toBe(true);
  });

  it("rejects mismatched password confirmation", () => {
    const result = registrationSchema.safeParse({
      ...validRegistration,
      confirmPassword: "Str0ngPassw0rd2",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "confirmPassword")).toBe(true);
    }
  });

  it("rejects weak passwords and privileged role attempts", () => {
    expect(
      registrationSchema.safeParse({ ...validRegistration, password: "short", confirmPassword: "short" })
        .success,
    ).toBe(false);
    expect(
      registrationSchema.safeParse({ ...validRegistration, password: "allletters", confirmPassword: "allletters" })
        .success,
    ).toBe(false);

    // Unknown/duplicate fields cannot introduce a role — the parsed value never
    // contains one, so the action can only create a pending account.
    const result = registrationSchema.safeParse({ ...validRegistration, roleId: "role-admin" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("roleId" in result.data).toBe(false);
    }
  });
});

describe("password reset tokens", () => {
  it("stores only a hash and issues high-entropy tokens", () => {
    const a = issuePasswordResetToken();
    const b = issuePasswordResetToken();
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).not.toBe(a.token);
    expect(isValidTokenShape(a.token)).toBe(true);
    expect(isValidTokenShape("short")).toBe(false);
  });

  it("is usable only once and only before expiry", () => {
    const expiresAt = new Date(Date.now() + 60_000);
    expect(isResetTokenUsable({ usedAt: null, expiresAt })).toBe(true);
    expect(isResetTokenUsable({ usedAt: new Date(), expiresAt })).toBe(false);
    expect(
      isResetTokenUsable({ usedAt: null, expiresAt: new Date(Date.now() - 1) }),
    ).toBe(false);
    expect(isResetTokenUsable(null)).toBe(false);
  });
});

describe("recovery form schemas", () => {
  it("validates reset forms with the same password policy", () => {
    expect(
      resetPasswordSchema.safeParse({
        token: "a".repeat(43),
        password: "N3wPassw0rd!",
        confirmPassword: "N3wPassw0rd!",
      }).success,
    ).toBe(true);
    expect(
      resetPasswordSchema.safeParse({
        token: "a".repeat(43),
        password: "N3wPassw0rd!",
        confirmPassword: "different1",
      }).success,
    ).toBe(false);
  });

  it("requires a valid email on the forgot-password form", () => {
    expect(forgotPasswordSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: "person@deped.gov.ph" }).success).toBe(true);
  });
});
